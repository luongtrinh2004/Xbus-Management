import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@plane/blocks/dialog";
import { useTranslation } from "@plane/i18n";
import { renderFormattedDate } from "@plane/utils";
import { registerDependencyDateConfirmation } from "@/helpers/dependency-date-confirmation";
import type { TDependencyDateConflict } from "@/helpers/dependency-date-confirmation";

type Pending = { conflicts: TDependencyDateConflict[]; resolve: (confirmed: boolean) => void };

/** One shared prompt for List, detail, Calendar and Timeline date edits. */
export function DependencyDateConfirmation() {
  const { t } = useTranslation();
  const queue = useRef<Pending[]>([]);
  const [current, setCurrent] = useState<Pending>();

  useEffect(() => {
    const unregister = registerDependencyDateConfirmation(
      (conflicts) =>
        new Promise((resolve) => {
          const pending = { conflicts, resolve };
          queue.current.push(pending);
          if (queue.current.length === 1) setCurrent(pending);
        }),
    );
    return () => {
      unregister();
      for (const pending of queue.current) pending.resolve(false);
      queue.current = [];
    };
  }, []);

  if (!current) return null;
  const finish = (confirmed: boolean) => {
    if (queue.current[0] !== current) return;
    queue.current.shift()?.resolve(confirmed);
    setCurrent(queue.current[0]);
  };

  return (
    <ConfirmDialog
      isOpen
      variant="warning"
      title={t("issue_dependencies.date_title")}
      content={
        <span className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          <span>{t("issue_dependencies.date_message")}</span>
          {current.conflicts.map((conflict) => (
            <span
              key={`${conflict.blocker_id}-${conflict.dependent_id}`}
              className="flex flex-col gap-1 rounded-sm border border-subtle bg-layer-1 p-2 text-body-xs-regular"
            >
              <span>
                {t("issue_dependencies.date_conflict", {
                  blocker: conflict.blocker_name,
                  dependent: conflict.dependent_name,
                  date:
                    renderFormattedDate(conflict.blocker_target_date) ??
                    conflict.blocker_target_date,
                })}
              </span>
              <span className="text-secondary">
                {t("issue_dependencies.date_suggestion", {
                  name: conflict.dependent_name,
                  date:
                    renderFormattedDate(conflict.suggested_start_date) ??
                    conflict.suggested_start_date,
                })}
                {conflict.suggested_target_date
                  ? ` – ${renderFormattedDate(conflict.suggested_target_date) ?? conflict.suggested_target_date}`
                  : ""}
              </span>
            </span>
          ))}
          <span className="text-secondary">{t("issue_dependencies.date_manual_shift")}</span>
        </span>
      }
      isSubmitting={false}
      handleClose={() => finish(false)}
      handleSubmit={() => finish(true)}
      primaryButtonText={{ default: t("issue_dependencies.keep_dates") }}
      secondaryButtonText={t("cancel")}
    />
  );
}
