import { Check, CircleCheck, LoaderCircle } from "lucide-react";
import { observer } from "mobx-react";
import { useRef, useState } from "react";
import { Tooltip } from "@makeplane/propel/components/tooltip";
import { setToast } from "@plane/blocks/toast";
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
import { cn } from "@plane/utils";
import { useProjectState } from "@/hooks/store/use-project-state";
import { getCompletionTarget } from "./helpers";
import { useIssueStateChange } from "./use-state-change";

type Props = {
  issue: TIssue;
  workspaceSlug: string | undefined;
  onChange: (stateId: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
};

export const IssueCompletionButton = observer(function IssueCompletionButton(props: Props) {
  const { issue, workspaceSlug, onChange, disabled, showLabel = false } = props;
  const { t } = useTranslation();
  const { getProjectStates, getStateById, fetchProjectStates } = useProjectState();
  const isCompleted = getStateById(issue.state_id)?.group === "completed";
  const [isLoadingStates, setLoadingStates] = useState(false);
  const loadingStatesRef = useRef(false);
  const { requestChange, isUpdating, isPending, confirmation } = useIssueStateChange({
    workspaceSlug,
    projectId: issue.project_id ?? undefined,
    issueId: issue.id,
    value: issue.state_id,
    onChange,
    disabled,
  });
  const label = t(isCompleted ? "issue_completion.reopen" : "issue_completion.complete");

  return (
    <>
      <Tooltip label={label}>
        <button
          type="button"
          aria-label={label}
          aria-pressed={isCompleted}
          aria-busy={isUpdating || isLoadingStates}
          disabled={
            disabled ||
            isUpdating ||
            isLoadingStates ||
            isPending ||
            !workspaceSlug ||
            !issue.project_id ||
            !!issue.tempId ||
            !!issue.is_draft ||
            !!issue.archived_at
          }
          className={cn(
            "transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent-strong disabled:cursor-not-allowed disabled:opacity-50",
            showLabel
              ? cn(
                  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer shadow-xs transition-transform active:scale-[0.98]",
                  isCompleted
                    ? "border border-success-primary/30 bg-success-primary/10 text-success-primary hover:bg-success-primary/20"
                    : "bg-accent-primary text-white hover:opacity-90"
                )
              : cn(
                  "group/completion flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-150",
                  isCompleted
                    ? "border-success-primary bg-success-primary text-white shadow-xs"
                    : "border-neutral-300 dark:border-neutral-600 bg-transparent text-transparent hover:border-accent-primary hover:text-accent-primary hover:bg-accent-primary/10"
                )
          )}
          onClick={async (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (!issue.project_id || !workspaceSlug || loadingStatesRef.current) return;
            loadingStatesRef.current = true;
            setLoadingStates(true);
            try {
              const states =
                getProjectStates(issue.project_id) ?? (await fetchProjectStates(workspaceSlug, issue.project_id));
              const target = getCompletionTarget(states, issue.state_id);
              if (target) await requestChange(target.id);
              else {
                setToast({
                  type: "warning",
                  title: t("issue_completion.no_target"),
                  message: isCompleted
                    ? t("issue_completion.need_open_state")
                    : t("issue_completion.need_completed_state"),
                });
              }
            } catch (error) {
              setToast({
                type: "error",
                title: t("issue_completion.load_failed"),
                message: error instanceof Error ? error.message : t("issue_completion.retry"),
              });
            } finally {
              loadingStatesRef.current = false;
              setLoadingStates(false);
            }
          }}
        >
          {isUpdating || isLoadingStates ? (
            <LoaderCircle className={cn(showLabel ? "size-3.5" : "size-2.5", "animate-spin")} />
          ) : isCompleted ? (
            showLabel ? (
              <CircleCheck className="size-3.5 text-success-primary" />
            ) : (
              <Check className="size-2.5 stroke-[3]" />
            )
          ) : showLabel ? (
            <Check className="size-3.5 stroke-[2.5]" />
          ) : (
            <Check className="size-2.5 stroke-[2.5] opacity-0 transition-opacity group-hover/completion:opacity-100" />
          )}
          {showLabel && (
            <span>{t(isCompleted ? "issue_completion.completed" : "issue_completion.complete_short")}</span>
          )}
        </button>
      </Tooltip>
      {confirmation}
    </>
  );
});
