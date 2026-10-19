/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { useCustomFields } from "@/hooks/store/use-custom-fields";
import { CustomFieldValueEditor } from "./value";
import { CustomFieldManager } from "./manager";

export const IssueCustomFields = observer(function IssueCustomFields({
  workspaceSlug,
  projectId,
  issueId,
  disabled,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
}) {
  const store = useCustomFields();
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = () =>
      Promise.all([
        store.loadFields(workspaceSlug, projectId),
        store.loadValues(workspaceSlug, projectId, [issueId], true),
      ])
        .then(() => {
          if (mounted) setError(false);
          return undefined;
        })
        .catch(() => {
          if (mounted) setError(true);
        });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [store, workspaceSlug, projectId, issueId]);
  return (
    <section className="space-y-2 border-t border-subtle pt-3">
      <div className="flex items-center justify-between text-13 font-medium">
        <span>{t("custom_fields.heading")}</span>
        {!disabled && <CustomFieldManager workspaceSlug={workspaceSlug} projectId={projectId} />}
      </div>
      {error && (
        <p role="alert" className="text-12 text-danger-primary">
          {t("custom_fields.load_failed")}
        </p>
      )}
      {store
        .fields(projectId)
        .filter((field) => field.is_active)
        .map((field) => (
          <div className="grid grid-cols-2 items-center gap-2" key={field.id}>
            <span className="truncate text-13 text-secondary" title={field.name}>
              {field.name}
            </span>
            <CustomFieldValueEditor
              field={field}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              disabled={disabled || error}
            />
          </div>
        ))}
    </section>
  );
});
