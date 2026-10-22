/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MutableRefObject } from "react";
import React, { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachInstruction,
  extractInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { useTranslation } from "@plane/i18n";
import { ListAddRow } from "./add-row";
import { useListTable } from "./table-context";
import { useParams } from "next/navigation";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { observer } from "mobx-react";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
// types
import type { IIssueDisplayProperties, TIssue, TIssueMap } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// components
import { DropIndicator } from "@plane/blocks/common";
import RenderIfVisible from "@/components/core/render-if-visible-HOC";
import { ListLoaderItemRow } from "@/components/ui/loader/layouts/list-layout-loader";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { usePlatformOS } from "@/hooks/use-platform-os";
// types
import { HIGHLIGHT_CLASS, getIssueBlockId, isIssueNew } from "../utils";
import { IssueBlock } from "./block";
import type { TRenderQuickActions } from "./list-view-types";

type Props = {
  issueId: string;
  issuesMap: TIssueMap;
  updateIssue:
    | ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>)
    | undefined;
  quickActions: TRenderQuickActions;
  canEditProperties: (projectId: string | undefined) => boolean;
  displayProperties: IIssueDisplayProperties | undefined;
  nestingLevel: number;
  spacingLeft?: number;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  selectionHelpers: TSelectionHelper;
  groupId: string;
  isDragAllowed: boolean;
  canDropOverIssue: boolean;
  isParentIssueBeingDragged?: boolean;
  isLastChild?: boolean;
  shouldRenderByDefault?: boolean;
  isEpic?: boolean;
  activeAddParentId?: string;
  onActivateAddParent?: (id: string) => void;
};

export const IssueBlockRoot = observer(function IssueBlockRoot(props: Props) {
  const {
    issueId,
    issuesMap,
    groupId,
    updateIssue,
    quickActions,
    canEditProperties,
    displayProperties,
    nestingLevel,
    spacingLeft = 14,
    containerRef,
    isDragAllowed,
    canDropOverIssue,
    isParentIssueBeingDragged = false,
    isLastChild = false,
    selectionHelpers,
    shouldRenderByDefault,
    isEpic = false,
    activeAddParentId,
    onActivateAddParent,
  } = props;
  const { t } = useTranslation();
  const columns = useListTable();
  const { workspaceSlug } = useParams();
  const storeType = useIssueStoreType();
  const [isCreateSubIssueOpen, setCreateSubIssueOpen] = useState(false);
  // states
  const [isExpanded, setExpanded] = useState<boolean>(false);
  const [localAddParentId, setLocalAddParentId] = useState(issueId);
  const activeParentId = activeAddParentId ?? localAddParentId;
  const activateAddParent = onActivateAddParent ?? setLocalAddParentId;
  const [instruction, setInstruction] = useState<"DRAG_OVER" | "DRAG_BELOW" | undefined>(undefined);
  const [isCurrentBlockDragging, setIsCurrentBlockDragging] = useState(false);
  // ref
  const issueBlockRef = useRef<HTMLDivElement | null>(null);
  // hooks
  const { isMobile } = usePlatformOS();
  // store hooks
  const { subIssues: subIssuesStore } = useIssueDetail(
    isEpic ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES,
  );

  const isSubIssue = nestingLevel !== 0;

  useEffect(() => {
    const blockElement = issueBlockRef.current;

    if (!blockElement) return;

    return combine(
      dropTargetForElements({
        element: blockElement,
        canDrop: ({ source }) =>
          source.data.type === "ISSUE" &&
          source.data.id !== issueId &&
          !isSubIssue &&
          canDropOverIssue,
        getData: ({ input, element }) => {
          const data = { id: issueId, type: "ISSUE" };

          // attach instruction for last in list
          return attachInstruction(data, {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            mode: isLastChild ? "last-in-group" : "standard",
          });
        },
        onDrag: ({ self }) => {
          const extractedInstruction = extractInstruction(self?.data)?.type;
          // check if the highlight is to be shown above or below
          setInstruction(
            extractedInstruction
              ? extractedInstruction === "reorder-below" && isLastChild
                ? "DRAG_BELOW"
                : "DRAG_OVER"
              : undefined,
          );
        },
        onDragLeave: () => {
          setInstruction(undefined);
        },
        onDrop: () => {
          setInstruction(undefined);
        },
      }),
    );
  }, [issueId, isLastChild, issueBlockRef, isSubIssue, canDropOverIssue, setInstruction]);

  useOutsideClickDetector(issueBlockRef, () => {
    issueBlockRef?.current?.classList?.remove(HIGHLIGHT_CLASS);
  });

  if (!issueId || !issuesMap[issueId]?.created_at) return null;

  const subIssues = subIssuesStore.subIssuesByIssueId(issueId);
  return (
    <div className="relative" ref={issueBlockRef} id={getIssueBlockId(issueId, groupId)}>
      <DropIndicator classNames={"absolute top-0 z-[2]"} isVisible={instruction === "DRAG_OVER"} />
      <RenderIfVisible
        key={`${issueId}`}
        root={containerRef}
        classNames={`relative ${isLastChild && !isExpanded ? "" : "border-b border-b-subtle"}`}
        verticalOffset={100}
        defaultValue={
          shouldRenderByDefault || (issuesMap[issueId] ? isIssueNew(issuesMap[issueId]) : false)
        }
        placeholderChildren={
          <ListLoaderItemRow shouldAnimate={false} renderForPlaceHolder defaultPropertyCount={4} />
        }
        shouldRecordHeights={isMobile}
      >
        <IssueBlock
          issueId={issueId}
          issuesMap={issuesMap}
          groupId={groupId}
          updateIssue={updateIssue}
          quickActions={quickActions}
          canEditProperties={canEditProperties}
          displayProperties={displayProperties}
          isExpanded={isExpanded}
          setExpanded={(value) => {
            const expanded = typeof value === "function" ? value(isExpanded) : value;
            setExpanded(expanded);
            activateAddParent(expanded ? issueId : (issuesMap[issueId].parent_id ?? issueId));
          }}
          nestingLevel={nestingLevel}
          spacingLeft={spacingLeft}
          selectionHelpers={selectionHelpers}
          canDrag={!isSubIssue && isDragAllowed}
          isCurrentBlockDragging={isParentIssueBeingDragged || isCurrentBlockDragging}
          setIsCurrentBlockDragging={setIsCurrentBlockDragging}
          isEpic={isEpic}
        />
      </RenderIfVisible>

      {isExpanded &&
        !isEpic &&
        subIssues?.map((subIssueId) => (
          <IssueBlockRoot
            key={`${subIssueId}`}
            issueId={subIssueId}
            issuesMap={issuesMap}
            updateIssue={updateIssue}
            quickActions={quickActions}
            canEditProperties={canEditProperties}
            displayProperties={displayProperties}
            nestingLevel={nestingLevel + 1}
            spacingLeft={spacingLeft + 28}
            containerRef={containerRef}
            selectionHelpers={selectionHelpers}
            groupId={groupId}
            isDragAllowed={isDragAllowed}
            canDropOverIssue={canDropOverIssue}
            isParentIssueBeingDragged={isParentIssueBeingDragged || isCurrentBlockDragging}
            shouldRenderByDefault={isExpanded}
            activeAddParentId={activeParentId}
            onActivateAddParent={activateAddParent}
            isLastChild={subIssues?.at(-1) === subIssueId}
          />
        ))}
      {!isEpic &&
        !columns &&
        !issuesMap[issueId].archived_at &&
        !issuesMap[issueId].is_draft &&
        !issuesMap[issueId].tempId &&
        canEditProperties(issuesMap[issueId].project_id ?? undefined) &&
        isExpanded &&
        activeParentId === issueId && (
          <ListAddRow indent={80 + spacingLeft} onClick={() => setCreateSubIssueOpen(true)}>
            {t("issue.add.sub_issue")}
          </ListAddRow>
        )}
      {isCreateSubIssueOpen && (
        <CreateUpdateIssueModal
          isOpen={isCreateSubIssueOpen}
          onClose={() => setCreateSubIssueOpen(false)}
          data={{ project_id: issuesMap[issueId].project_id, parent_id: issueId }}
          storeType={storeType}
          isProjectSelectionDisabled
          onSubmit={async () => {
            const projectId = issuesMap[issueId].project_id;
            if (!workspaceSlug || !projectId) return;
            await subIssuesStore.fetchSubIssues(workspaceSlug.toString(), projectId, issueId);
            setExpanded(true);
            activateAddParent(issueId);
          }}
        />
      )}
      {isLastChild && (
        <DropIndicator classNames={"absolute z-[2]"} isVisible={instruction === "DRAG_BELOW"} />
      )}
    </div>
  );
});
