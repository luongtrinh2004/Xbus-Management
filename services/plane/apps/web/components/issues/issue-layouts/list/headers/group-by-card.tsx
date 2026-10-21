/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { useTranslation } from "@plane/i18n";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useListTable } from "../table-context";
import { ChevronDown, CircleDashed } from "lucide-react";
import { AddOutline } from "@makeplane/propel/icons";
// types
import { setToast } from "@plane/blocks/toast";
import type { TIssue, ISearchIssueResponse, TIssueGroupByOptions } from "@plane/types";
// ui
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makeplane/propel/components/menu";
import { Tooltip } from "@makeplane/propel/components/tooltip";
// components
import { cn } from "@plane/utils";
import { ExistingIssuesListModal } from "@/components/core/modals/existing-issues-list-modal";
import { MultipleSelectGroupAction } from "@/components/core/multiple-select";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import { CreateUpdateEpicModal } from "@/components/epic-modal";
// constants
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";

interface IHeaderGroupByCard {
  groupID: string;
  groupBy: TIssueGroupByOptions;
  icon?: React.ReactNode;
  title: string;
  count: number;
  issuePayload: Partial<TIssue>;
  canEditProperties: (projectId: string | undefined) => boolean;
  disableIssueCreation?: boolean;
  addIssuesToView?: (issueIds: string[]) => Promise<TIssue>;
  selectionHelpers: TSelectionHelper;
  handleCollapsedGroups: (value: string) => void;
  isEpic?: boolean;
  isExpanded?: boolean;
}

export const HeaderGroupByCard = observer(function HeaderGroupByCard(props: IHeaderGroupByCard) {
  const { t } = useTranslation();
  const columns = useListTable();
  const { getStateById } = useProjectState();
  const state = columns && props.groupBy === "state" ? getStateById(props.groupID) : undefined;
  const stateColor =
    state?.group === "backlog"
      ? "#6b7280"
      : state?.group === "unstarted"
        ? "#111827"
        : state?.color;
  const {
    groupID,
    icon,
    title,
    count,
    issuePayload,
    canEditProperties,
    disableIssueCreation,
    addIssuesToView,
    selectionHelpers,
    handleCollapsedGroups,
    isEpic = false,
  } = props;
  // plane hooks
  // states
  const [isOpen, setIsOpen] = useState(false);
  const [openExistingIssueListModal, setOpenExistingIssueListModal] = useState(false);
  // router
  const { workspaceSlug, projectId, moduleId, cycleId } = useParams();
  const storeType = useIssueStoreType();
  // derived values
  const addIssueLabel = t("work_item_list.add_to_group");
  const addButtonClassName =
    "flex size-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-xs opacity-0 transition-opacity hover:bg-layer-1 focus-visible:opacity-100 group-hover/list-header:opacity-100 group-focus-within/list-header:opacity-100 [@media(hover:none)]:opacity-100";
  const renderExistingIssueModal = moduleId || cycleId;
  const existingIssuesListModalPayload = moduleId
    ? { module: moduleId.toString() }
    : { cycle: true };
  const isGroupSelectionEmpty = selectionHelpers.isGroupSelected(groupID) === "empty";
  // auth
  const canSelectIssues =
    canEditProperties(projectId?.toString()) && !selectionHelpers.isSelectionDisabled;

  const handleAddIssuesToView = async (data: ISearchIssueResponse[]) => {
    if (!workspaceSlug || !projectId) return;

    const issues = data.map((i) => i.id);

    try {
      await addIssuesToView?.(issues);

      setToast({
        type: "success",
        title: "Thành công!",
        message: "Đã thêm công việc vào chu kỳ.",
      });
    } catch (_error) {
      setToast({
        type: "error",
        title: "Lỗi!",
        message: "Không thể thêm công việc đã chọn vào chu kỳ. Vui lòng thử lại.",
      });
    }
  };

  return (
    <>
      <div className="group/list-header flex w-full flex-shrink-0 items-center gap-2 py-1.5">
        {canSelectIssues && (
          <div className="absolute left-1 flex w-3.5 flex-shrink-0 items-center">
            <MultipleSelectGroupAction
              className={cn(
                "pointer-events-none size-3.5 opacity-0 !outline-none group-hover/list-header:pointer-events-auto group-hover/list-header:opacity-100",
                {
                  "pointer-events-auto opacity-100": !isGroupSelectionEmpty,
                },
              )}
              groupID={groupID}
              selectionHelpers={selectionHelpers}
              disabled={count === 0}
            />
          </div>
        )}
        <div className="grid flex-shrink-0 place-items-center overflow-hidden">
          {columns ? (
            <button
              type="button"
              aria-label={title}
              aria-expanded={props.isExpanded}
              onClick={() => handleCollapsedGroups(groupID)}
            >
              <ChevronDown className={cn("size-3.5", { "-rotate-90": !props.isExpanded })} />
            </button>
          ) : (
            (icon ?? <CircleDashed className="size-3.5" strokeWidth={2} />)
          )}
        </div>

        {/* eslint-disable-next-line jsx_a11y/click-events-have-key-events eslint-disable-next-line jsx_a11y/no-static-element-interactions */}
        <div
          className="relative flex min-w-0 cursor-pointer flex-row items-center gap-1 overflow-hidden"
          onClick={() => handleCollapsedGroups(groupID)}
        >
          <div
            className="line-clamp-1 inline-block truncate font-medium leading-5 text-primary"
            style={stateColor ? { color: stateColor } : undefined}
          >
            {title}
          </div>
          <div className="flex shrink-0 items-center pl-2 text-13 font-medium leading-5 text-tertiary">
            {count || 0}
          </div>
        </div>

        {!disableIssueCreation &&
          (renderExistingIssueModal ? (
            <Menu>
              <MenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={addIssueLabel}
                    title={addIssueLabel}
                    className={addButtonClassName}
                  >
                    <AddOutline className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <MenuContent side="bottom" align="start">
                <MenuItem
                  label={"Tạo công việc"}
                  onClick={() => {
                    setIsOpen(true);
                  }}
                />
                <MenuItem
                  label={"Thêm công việc hiện có"}
                  onClick={() => {
                    setOpenExistingIssueListModal(true);
                  }}
                />
              </MenuContent>
            </Menu>
          ) : (
            <Tooltip label={addIssueLabel}>
              <button
                type="button"
                aria-label={addIssueLabel}
                className={addButtonClassName}
                onClick={() => setIsOpen(true)}
              >
                <AddOutline width={14} />
              </button>
            </Tooltip>
          ))}

        {isEpic ? (
          <CreateUpdateEpicModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            data={issuePayload}
          />
        ) : (
          <CreateUpdateIssueModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            data={issuePayload}
            storeType={storeType}
          />
        )}

        {renderExistingIssueModal && (
          <ExistingIssuesListModal
            workspaceSlug={workspaceSlug?.toString()}
            projectId={projectId?.toString()}
            isOpen={openExistingIssueListModal}
            handleClose={() => setOpenExistingIssueListModal(false)}
            searchParams={existingIssuesListModalPayload}
            handleOnSubmit={handleAddIssuesToView}
          />
        )}
      </div>
    </>
  );
});
