/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@makeplane/propel/components/popover";
import { useTranslation } from "@plane/i18n";
import { MemberSelect } from "@/components/dropdowns/member/member-select";
import { useCustomFields } from "@/hooks/store/use-custom-fields";
import { useMember } from "@/hooks/store/use-member";
import type { CustomField, CustomFieldValue } from "@/types/custom-fields";
import { formatCustomFieldValue, parseCustomFieldInput } from "./helpers";

type Props = { field: CustomField; workspaceSlug: string; projectId: string; disabled: boolean } & (
  | { issueId: string; value?: never; onChange?: never }
  | { issueId?: undefined; value: CustomFieldValue; onChange: (value: CustomFieldValue) => void }
);
export const CustomFieldValueEditor = observer(function CustomFieldValueEditor({
  field,
  workspaceSlug,
  projectId,
  issueId,
  disabled,
  value: controlledValue,
  onChange,
}: Props) {
  const store = useCustomFields();
  const { getUserDetails } = useMember();
  const { t, currentLocale } = useTranslation();
  const value = onChange ? (controlledValue ?? null) : (store.valuesByIssue[issueId!]?.[field.id] ?? null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const saving = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    if (!open) setDraft(typeof value === "string" || typeof value === "number" ? String(value) : "");
  }, [value, open]);
  const readOnly = disabled || (!onChange && !store.loadedIssues[issueId!]);
  const formatted = formatCustomFieldValue(field, value, currentLocale, (id) => getUserDetails(id)?.display_name ?? id);
  const save = async (next: CustomFieldValue): Promise<boolean> => {
    if (saving.current) return saving.current;
    if (readOnly) return false;
    if (JSON.stringify(next) === JSON.stringify(value)) return true;
    const operation = (async () => {
      setBusy(true);
      setError(false);
      try {
        if (onChange) await onChange(next);
        else await store.saveValue(workspaceSlug, projectId, issueId!, field.id, next);
        return true;
      } catch {
        setError(true);
        return false;
      } finally {
        setBusy(false);
        saving.current = null;
      }
    })();
    saving.current = operation;
    return operation;
  };
  const saveDraft = async (): Promise<boolean> => {
    try {
      return await save(parseCustomFieldInput(field.field_type, draft));
    } catch {
      setError(true);
      return false;
    }
  };
  const changeOpen = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    // Closing a popover can unmount its focused input before blur fires.
    // Commit explicitly, and keep the editor open if validation/save fails.
    if (["text", "number", "date"].includes(field.field_type)) {
      void saveDraft().then((saved) => {
        if (saved) setOpen(false);
        return undefined;
      });
    } else if (saving.current) {
      void saving.current.then((saved) => {
        if (saved) setOpen(false);
        return undefined;
      });
    } else setOpen(false);
  };
  if (readOnly)
    return (
      <span className="truncate text-13 text-secondary" title={formatted}>
        {formatted || t("custom_fields.empty")}
      </span>
    );
  const selected = Array.isArray(value) ? value : [];
  return (
    <div
      role="presentation"
      className="w-full min-w-0"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={field.name}
              className="h-7 w-full truncate rounded px-1 text-left text-13 hover:bg-layer-1"
              title={formatted}
            />
          }
        >
          {field.field_type === "single_select" &&
          typeof value === "string" &&
          field.options.some((option) => option.id === value) ? (
            <span
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: `${field.options.find((option) => option.id === value)?.color}25` }}
            >
              {formatted}
            </span>
          ) : (
            formatted || t("custom_fields.empty")
          )}
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <div className="w-64 space-y-2 p-2">
            <div className="text-13 font-medium">
              <PopoverTitle>{field.name}</PopoverTitle>
            </div>
            {field.field_type === "people" ? (
              <MemberSelect
                projectId={projectId}
                variant="select-ghost-md"
                multiple
                value={selected}
                onChange={(ids) => void save(ids.length ? ids : null)}
                disabled={busy}
                showLabel
              />
            ) : field.field_type === "single_select" ? (
              <select
                aria-label={field.name}
                className="w-full rounded border border-strong bg-surface-1 p-2 text-13"
                value={typeof value === "string" ? value : ""}
                disabled={busy}
                onChange={(event) => void save(event.target.value || null)}
              >
                <option value="">{t("custom_fields.empty")}</option>
                {field.options
                  .filter((option) => option.is_active || option.id === value)
                  .map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.is_active}>
                      {option.name}
                    </option>
                  ))}
              </select>
            ) : field.field_type === "multi_select" ? (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {field.options
                  .filter((option) => option.is_active || selected.includes(option.id))
                  .map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-13">
                      <input
                        type="checkbox"
                        checked={selected.includes(option.id)}
                        disabled={busy || (!option.is_active && !selected.includes(option.id))}
                        onChange={(event) =>
                          void save(
                            event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id)
                          )
                        }
                      />
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                      {option.name}
                    </label>
                  ))}
              </div>
            ) : (
              <input
                aria-label={field.name}
                type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                step="any"
                className="w-full rounded border border-strong bg-surface-1 p-2 text-13"
                value={draft}
                disabled={busy}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                  void saveDraft();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
            )}
            <div className="flex justify-between text-12 text-tertiary">
              <span aria-live="polite">
                {busy
                  ? t("custom_fields.saving")
                  : onChange
                    ? t("issue_form_draft.fields_saved_with_task")
                    : t("custom_fields.autosave")}
              </span>
              <button
                type="button"
                disabled={busy}
                className="text-accent-primary"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  setDraft("");
                  void save(null);
                }}
              >
                {t("custom_fields.clear")}
              </button>
            </div>
            {error && (
              <div role="alert" className="space-y-1 text-12 text-danger-primary">
                <p>{t("custom_fields.save_failed")}</p>
                <button
                  type="button"
                  disabled={busy}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setError(false);
                    setOpen(false);
                  }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
