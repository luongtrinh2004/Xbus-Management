/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ListTree } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useListTable } from "./table-context";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ChevronRightOutline, AddOutline } from "@makeplane/propel/icons";
// types
import { setToast } from "@plane/blocks/toast";
import { Tooltip } from "@makeplane/propel/components/tooltip";
import type { TIssue, IIssueDisplayProperties, TIssueMap } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
// ui
import { ControlLink, Row } from "@plane/blocks/layout";
import { Spinner } from "@plane/blocks/spinner";
import { cn, generateWorkItemLink } from "@plane/utils";
// components
import { MultipleSelectEntityAction } from "@/components/core/multiple-select";
import { IssueProperties } from "@/components/issues/issue-layouts/properties";
import { IssueIdentifier } from "@/components/issues/issue-detail/issue-identifier";
import { IssueCompletionButton } from "@/components/issues/completion/button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { useSubIssueReorder } from "@/hooks/use-sub-issue-reorder";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { calculateIdentifierWidth } from "../utils";
import type { TRenderQuickActions } from "./list-view-types";

interface IssueBlockProps {
  issueId: string;
  issuesMap: TIssueMap;
  groupId: string;
  updateIssue:
    | ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>)
    | undefined;
  quickActions: TRenderQuickActions;
  displayProperties: IIssueDisplayProperties | undefined;
  canEditProperties: (projectId: string | undefined) => boolean;
  nestingLevel: number;
  spacingLeft?: number;
  isExpanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  selectionHelpers: TSelectionHelper;
  isCurrentBlockDragging: boolean;
  setIsCurrentBlockDragging: React.Dispatch<React.SetStateAction<boolean>>;
  canDrag: boolean;
  isEpic?: boolean;
}

export const IssueBlock = observer(function IssueBlock(props: IssueBlockProps) {
  const {
    issuesMap,
    issueId,
    groupId,
    updateIssue,
    quickActions,
    displayProperties,
    canEditProperties,
    nestingLevel,
    spacingLeft = 14,
    isExpanded,
    setExpanded,
    selectionHelpers,
    isCurrentBlockDragging,
    setIsCurrentBlockDragging,
    canDrag,
    isEpic = false,
  } = props;
  const { t } = useTranslation();
  const columns = useListTable();
  const { getStateById } = useProjectState();
  // ref
  const issueRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingChildren, setLoadingChildren] = useState(false);
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  const projectId = routerProjectId?.toString();
  // hooks
  const { sidebarCollapsed: isSidebarCollapsed } = useAppTheme();
  const { getProjectIdentifierById, currentProjectNextSequenceId } = useProject();
  const {
    getIsIssuePeeked,
    peekIssue,
    setPeekIssue,
    subIssues: subIssuesStore,
  } = useIssueDetail(isEpic ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES);
  const storeType = useIssueStoreType();
  const [isCreateSiblingOpen, setIsCreateSiblingOpen] = useState(false);

  const handleIssuePeekOverview = (issue: TIssue) =>
    workspaceSlug &&
    issue &&
    issue.project_id &&
    issue.id &&
    !getIsIssuePeeked(issue.id) &&
    setPeekIssue({
      workspaceSlug,
      projectId: issue.project_id,
      issueId: issue.id,
      nestingLevel: nestingLevel,
      isArchived: !!issue.archived_at,
    });

  // derived values
  const issue = issuesMap[issueId];
  const subIssuesCount = issue?.sub_issues_count ?? 0;
  const canEditIssueProperties = canEditProperties(issue?.project_id ?? undefined);
  const isDraggingAllowed = canDrag && canEditIssueProperties;

  const dropSide = useSubIssueReorder({
    elementRef: issueRef,
    workspaceSlug,
    projectId: issue?.project_id,
    parentId: issue?.parent_id,
    issueId,
    enabled:
      nestingLevel > 0 &&
      canEditIssueProperties &&
      !isEpic &&
      !issue?.archived_at &&
      !issue?.tempId,
  });
  const { isMobile } = usePlatformOS();

  useEffect(() => {
    const element = issueRef.current;

    if (!element || nestingLevel > 0) return;

    return combine(
      draggable({
        element,
        canDrag: () => isDraggingAllowed,
        getInitialData: () => ({ id: issueId, type: "ISSUE", groupId }),
        onDragStart: () => {
          setIsCurrentBlockDragging(true);
        },
        onDrop: () => {
          setIsCurrentBlockDragging(false);
        },
      }),
    );
  }, [isDraggingAllowed, issueId, groupId, setIsCurrentBlockDragging, nestingLevel]);

  if (!issue) return null;

  const projectIdentifier = getProjectIdentifierById(issue.project_id);
  const isIssueSelected = selectionHelpers.getIsEntitySelected(issue.id);
  const isIssueActive = selectionHelpers.getIsEntityActive(issue.id);
  const isSubIssue = nestingLevel !== 0;
  const canSelectIssues = canEditIssueProperties && !selectionHelpers.isSelectionDisabled;

  const marginLeft = `${spacingLeft}px`;

  const handleToggleExpand = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoadingChildren) return;
    if (isExpanded) {
      setExpanded(false);
      return;
    }
    if (!workspaceSlug || !issue.project_id) return;
    setLoadingChildren(true);
    try {
      await subIssuesStore.fetchSubIssues(workspaceSlug, issue.project_id, issue.id);
      setExpanded(true);
    } catch {
      setToast({
        type: "error",
        title: t("work_item_list.load_failed"),
        message: t("work_item_list.retry"),
      });
    } finally {
      setLoadingChildren(false);
    }
  };

  // Calculate width for: projectIdentifier + "-" + dynamic sequence number digits
  // Use next_work_item_sequence from backend (static value from project endpoint)
  const maxSequenceId = currentProjectNextSequenceId ?? 1;
  const keyMinWidth = displayProperties?.key
    ? calculateIdentifierWidth(projectIdentifier?.length ?? 0, maxSequenceId)
    : 0;

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issue?.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issue?.sequence_id,
    isEpic,
    isArchived: !!issue?.archived_at,
  });
  return (
    <>
      <ControlLink
        id={`issue-${issue.id}`}
        href={workItemLink}
        onClick={() => handleIssuePeekOverview(issue)}
        className="w-full cursor-pointer"
        disabled={!!issue?.tempId || issue?.is_draft}
      >
        <Row
          ref={issueRef}
          data-top-level={nestingLevel === 0 ? "true" : undefined}
          className={cn(
            "group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover",
            {
              "asana-list-row": !!columns,
              "shadow-[inset_0_2px_0_var(--background-color-accent-primary)]":
                dropSide === "before",
              "shadow-[inset_0_-2px_0_var(--background-color-accent-primary)]":
                dropSide === "after",
              "asana-list-row-completed":
                !!columns && getStateById(issue.state_id)?.group === "completed",
              "border-accent-strong":
                getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel,
              "border-strong-1": isIssueActive,
              "last:border-b-transparent": !getIsIssuePeeked(issue.id) && !isIssueActive,
              "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected,
              "bg-layer-1": isCurrentBlockDragging,
              "md:flex-row md:items-center": isSidebarCollapsed,
              "lg:flex-row lg:items-center": !isSidebarCollapsed,
            },
          )}
          onDragStart={() => {
            if (!isDraggingAllowed && nestingLevel === 0) {
              setToast({
                type: "warning",
                title: "Không thể chuyển công việc",
                message: !canEditIssueProperties
                  ? "Bạn không có quyền chuyển công việc này"
                  : "Cách nhóm hiện tại không hỗ trợ kéo và thả",
              });
            }
          }}
        >
          <div className={cn("flex w-full gap-2 truncate", { "asana-list-name-cell": !!columns })}>
            <div className="flex flex-grow items-center gap-0.5 truncate">
              <div className="flex items-center gap-1" style={isSubIssue ? { marginLeft } : {}}>
                {/* select checkbox */}
                {projectId && canSelectIssues && !isEpic && (
                  <Tooltip
                    label={"Chỉ có thể chọn công việc thuộc dự án hiện tại."}
                    layout="stacked"
                    disabled={issue.project_id === projectId}
                  >
                    <div className="absolute left-1 grid w-3.5 flex-shrink-0 place-items-center">
                      <MultipleSelectEntityAction
                        className={cn(
                          "pointer-events-none opacity-0 transition-opacity group-hover/list-block:pointer-events-auto group-hover/list-block:opacity-100",
                          {
                            "pointer-events-auto opacity-100": isIssueSelected,
                          },
                        )}
                        groupId={groupId}
                        id={issue.id}
                        selectionHelpers={selectionHelpers}
                        disabled={issue.project_id !== projectId}
                      />
                    </div>
                  </Tooltip>
                )}
                {/* sub-issues chevron */}
                <div className="grid size-4 flex-shrink-0 place-items-center">
                  {(subIssuesCount > 0 ||
                    (canEditIssueProperties &&
                      !issue.archived_at &&
                      !issue.is_draft &&
                      !issue.tempId)) &&
                    !isEpic && (
                      <button
                        type="button"
                        aria-label={t(
                          isExpanded
                            ? "work_item_list.collapse_subtasks"
                            : "work_item_list.expand_subtasks",
                        )}
                        aria-expanded={isExpanded}
                        disabled={isLoadingChildren}
                        className={cn(
                          "grid size-4 place-items-center rounded-xs text-placeholder hover:text-tertiary",
                          {
                            "opacity-0 group-hover/list-block:opacity-100 focus-visible:opacity-100":
                              subIssuesCount === 0 && !isExpanded,
                          },
                        )}
                        onClick={handleToggleExpand}
                      >
                        <ChevronRightOutline
                          className={cn("size-4", {
                            "rotate-90": isExpanded,
                          })}
                        />
                      </button>
                    )}
                </div>

                {columns && !isEpic && (
                  <IssueCompletionButton
                    issue={issue}
                    workspaceSlug={workspaceSlug}
                    disabled={!canEditIssueProperties || !updateIssue}
                    onChange={(stateId) =>
                      updateIssue?.(issue.project_id, issue.id, { state_id: stateId })
                    }
                  />
                )}

                {issue?.tempId !== undefined && (
                  <div className="absolute top-0 left-0 z-[99999] h-full w-full animate-pulse bg-surface-1/20" />
                )}
              </div>

              <div className="flex min-w-0 flex-grow flex-col justify-center py-0.5 ml-2.5">
                <div className="flex items-center min-w-0 gap-1.5">
                  <Tooltip
                    label={issue.name}
                    layout="stacked"
                    align="start"
                    disabled={isCurrentBlockDragging || isMobile}
                  >
                    <p
                      className={cn("cursor-pointer truncate text-primary transition-colors hover:text-accent-primary", {
                        "text-[15px] font-semibold leading-snug": nestingLevel === 0,
                        "text-[14px] font-medium leading-snug": nestingLevel !== 0,
                      })}
                    >
                      {issue.name}
                    </p>
                  </Tooltip>
                  {subIssuesCount > 0 && !isEpic && (
                    <Tooltip label={t("work_item_list.subtask_count", { count: subIssuesCount })}>
                      <button
                        type="button"
                        aria-label={t("work_item_list.subtask_count", { count: subIssuesCount })}
                        aria-expanded={isExpanded}
                        onClick={handleToggleExpand}
                        className="flex shrink-0 items-center gap-0.5 text-[11px] text-tertiary hover:text-primary"
                      >
                        <span>{subIssuesCount}</span>
                        <ListTree className="size-3" />
                      </button>
                    </Tooltip>
                  )}
                  {canEditIssueProperties && !isEpic && (
                    <Tooltip label={nestingLevel === 0 ? "Thêm công việc cùng cấp" : "Thêm công việc phụ cùng cấp"}>
                      <button
                        type="button"
                        aria-label="Thêm công việc cùng cấp"
                        className="flex size-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-xs text-tertiary opacity-0 transition-opacity hover:bg-layer-2 hover:text-primary focus-visible:opacity-100 group-hover/list-block:opacity-100 group-focus-within/list-block:opacity-100 [@media(hover:none)]:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCreateSiblingOpen(true);
                        }}
                      >
                        <AddOutline className="size-3" />
                      </button>
                    </Tooltip>
                  )}
                </div>

                {displayProperties && (displayProperties.key || displayProperties.issue_type) && (
                  <div className="asana-list-identifier flex items-center text-[10px] leading-none text-tertiary mt-0.5">
                    {issue.project_id && (
                      <IssueIdentifier
                        issueId={issueId}
                        projectId={issue.project_id}
                        size="xs"
                        variant="tertiary"
                        displayProperties={displayProperties}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            {!issue?.tempId && (
              <div
                className={cn("block rounded-sm border border-strong", {
                  "md:hidden": isSidebarCollapsed,
                  "lg:hidden": !isSidebarCollapsed,
                })}
              >
                {quickActions({
                  issue,
                  parentRef: issueRef,
                })}
              </div>
            )}
          </div>
          <div
            className={cn("flex flex-shrink-0 items-center gap-2", {
              "asana-list-property-area": !!columns,
            })}
          >
            {!issue?.tempId ? (
              <>
                <IssueProperties
                  className={`relative flex flex-wrap ${isSidebarCollapsed ? "md:flex-shrink-0 md:flex-grow" : "lg:flex-shrink-0 lg:flex-grow"} items-center gap-2 whitespace-nowrap`}
                  issue={issue}
                  isReadOnly={!canEditIssueProperties}
                  updateIssue={updateIssue}
                  displayProperties={displayProperties}
                  activeLayout="List"
                  isEpic={isEpic}
                />
                {/* oxlint-disable-next-line jsx_a11y/click-events-have-key-events oxlint-disable-next-line jsx_a11y/no-static-element-interactions */}
                <div
                  className={cn("hidden", {
                    "md:flex": isSidebarCollapsed,
                    "lg:flex": !isSidebarCollapsed,
                  })}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {quickActions({
                    issue,
                    parentRef: issueRef,
                  })}
                </div>
              </>
            ) : (
              <div className="h-4 w-4">
                <Spinner className="h-4 w-4" />
              </div>
            )}
          </div>
        </Row>
      </ControlLink>
      {isCreateSiblingOpen && (
        <CreateUpdateIssueModal
          isOpen={isCreateSiblingOpen}
          onClose={() => setIsCreateSiblingOpen(false)}
          data={{
            project_id: issue.project_id,
            parent_id: issue.parent_id ?? undefined,
          }}
          storeType={storeType}
          isProjectSelectionDisabled
          onSubmit={async () => {
            const pId = issue.project_id;
            if (!workspaceSlug || !pId) return;
            if (issue.parent_id) {
              await subIssuesStore.fetchSubIssues(workspaceSlug, pId, issue.parent_id);
            }
          }}
        />
      )}
    </>
  );
});
