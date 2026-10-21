import { useEffect, useState, type RefObject } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
import { EIssueServiceType } from "@plane/types";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

export function useSubIssueReorder({
  elementRef,
  workspaceSlug,
  projectId,
  parentId,
  issueId,
  enabled,
}: {
  elementRef: RefObject<HTMLElement | null>;
  workspaceSlug?: string;
  projectId?: string | null;
  parentId?: string | null;
  issueId: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const { subIssues } = useIssueDetail(EIssueServiceType.ISSUES);
  const [dropSide, setDropSide] = useState<"before" | "after" | null>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled || !workspaceSlug || !projectId || !parentId) return;
    const sideOf = (y: number) =>
      y < element.getBoundingClientRect().top + element.clientHeight / 2
        ? ("before" as const)
        : ("after" as const);
    return combine(
      draggable({
        element,
        getInitialData: () => ({ type: "SUB_ISSUE", id: issueId, parentId, projectId }),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data.type === "SUB_ISSUE" &&
          source.data.parentId === parentId &&
          source.data.projectId === projectId &&
          source.data.id !== issueId,
        getData: () => ({ type: "SUB_ISSUE", id: issueId }),
        onDrag: ({ location }) => setDropSide(sideOf(location.current.input.clientY)),
        onDragLeave: () => setDropSide(null),
        onDrop: ({ source, location }) => {
          setDropSide(null);
          void subIssues
            .reorderSubIssue(
              workspaceSlug,
              projectId,
              parentId,
              String(source.data.id),
              issueId,
              sideOf(location.current.input.clientY),
            )
            .catch(() => {
              setToast({
                type: "error",
                title: t("toast.error"),
                message: t("sub_work_item.update.error"),
              });
            });
        },
      }),
    );
  }, [elementRef, enabled, workspaceSlug, projectId, parentId, issueId, subIssues, t]);
  return dropSide;
}
