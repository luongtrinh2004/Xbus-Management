import { useRef, useState } from "react";
import { ConfirmDialog } from "@plane/blocks/dialog";
import { setToast } from "@plane/blocks/toast";
import { useTranslation } from "@plane/i18n";
import type { TIssueServiceType } from "@plane/types";
import { useProjectState } from "@/hooks/store/use-project-state";
import { IssueService } from "@/services/issue";
import { getStateChangeError } from "@/components/dropdowns/state/change-error";
import { countUnfinishedDescendants } from "./helpers";

type Props = {
  workspaceSlug: string | undefined;
  projectId: string | undefined;
  issueId?: string;
  value: string | null | undefined;
  onChange: (stateId: string) => void;
  disabled?: boolean;
  issueServiceType?: TIssueServiceType;
};

/** All controls use the existing store update, so server workflow/review checks remain authoritative. */
export function useIssueStateChange(props: Props) {
  const { workspaceSlug, projectId, issueId, value, onChange, disabled, issueServiceType } = props;
  const { t } = useTranslation();
  const { getStateById, getProjectStateIds, fetchProjectStates } = useProjectState();
  const [isUpdating, setUpdating] = useState(false);
  const [pending, setPending] = useState<{ stateId: string; unfinished: number }>();
  const updatingRef = useRef(false);

  const reportError = (error: unknown) =>
    setToast({
      type: "error",
      title: t("issue_completion.update_failed_title"),
      message: getStateChangeError(error, t("issue_completion.update_failed")),
    });

  const requestChange = async (stateId: string) => {
    if (disabled || updatingRef.current || pending || stateId === value || !projectId || !workspaceSlug) return;
    updatingRef.current = true;
    setUpdating(true);
    try {
      if (!getProjectStateIds(projectId)) await fetchProjectStates(workspaceSlug, projectId);
      const state = getStateById(stateId);
      if (!state || state.project_id !== projectId) throw new Error(t("issue_completion.state_missing"));
      if (issueId && state.group === "completed" && getStateById(value)?.group !== "completed") {
        const service = new IssueService(issueServiceType);
        const unfinished = await countUnfinishedDescendants(
          projectId,
          issueId,
          (childProjectId, parentId) => service.subIssues(workspaceSlug, childProjectId, parentId),
          (id) => getStateById(id)?.group
        );
        if (unfinished > 0) {
          setPending({ stateId, unfinished });
          return;
        }
      }
      await onChange(stateId);
    } catch (error) {
      reportError(error);
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const confirmChange = async () => {
    if (!pending || disabled || updatingRef.current) return;
    updatingRef.current = true;
    setUpdating(true);
    try {
      await onChange(pending.stateId);
      setPending(undefined);
    } catch (error) {
      reportError(error);
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const confirmation = pending ? (
    <span role="presentation" onClick={(event) => event.stopPropagation()}>
      <ConfirmDialog
        isOpen
        variant="warning"
        title={t("issue_completion.unfinished_title")}
        content={t("issue_completion.unfinished_message", { count: pending.unfinished })}
        isSubmitting={isUpdating}
        handleClose={() => setPending(undefined)}
        handleSubmit={confirmChange}
        primaryButtonText={{ default: t("issue_completion.confirm"), loading: t("issue_completion.updating") }}
        secondaryButtonText={t("issue_completion.cancel")}
      />
    </span>
  ) : null;

  return { requestChange, isUpdating, isPending: !!pending, confirmation };
}
