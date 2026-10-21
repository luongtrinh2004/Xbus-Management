import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
import { CustomFieldValueEditor } from "@/components/issues/custom-fields/value";
import { useCustomFields } from "@/hooks/store/use-custom-fields";

/** The same six editors as List/details, buffered in the task form until Save. */
export const IssueFormCustomFields = observer(function IssueFormCustomFields({
  workspaceSlug,
  projectId,
  disabled,
  onChange,
}: {
  workspaceSlug: string;
  projectId: string;
  disabled: boolean;
  onChange: () => void;
}) {
  const store = useCustomFields();
  const { watch, setValue } = useFormContext<TIssue>();
  const { t } = useTranslation();
  const values = watch("custom_field_values") ?? {};
  const [error, setError] = useState(false);
  const load = () => {
    setError(false);
    void store.loadFields(workspaceSlug, projectId).catch(() => setError(true));
  };
  useEffect(load, [store, workspaceSlug, projectId]);
  const fields = store.fields(projectId).filter((field) => field.is_active);
  if (!fields.length && !error) return null;
  return (
    <section className="mt-4 space-y-2 border-t border-subtle pt-3">
      <h3 className="text-13 font-medium">{t("custom_fields.heading")}</h3>
      {error && (
        <p role="alert" className="text-12 text-danger-primary">
          {t("custom_fields.load_failed")}{" "}
          <button type="button" className="text-accent-primary" onClick={load}>
            {t("issue_form_draft.retry_fields")}
          </button>
        </p>
      )}
      {fields.map((field) => (
        <div key={field.id} className="grid grid-cols-2 items-center gap-2">
          <span className="truncate text-13 text-secondary" title={field.name}>
            {field.name}
          </span>
          <CustomFieldValueEditor
            field={field}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            value={values[field.id] ?? null}
            disabled={disabled || error}
            onChange={(value) => {
              setValue("custom_field_values", { ...values, [field.id]: value }, { shouldDirty: true });
              onChange();
            }}
          />
        </div>
      ))}
    </section>
  );
});
