/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { useState } from "react";
import { observer } from "mobx-react";
import { Dialog, DialogContent, DialogTitle } from "@makeplane/propel/components/dialog";
import { Button } from "@makeplane/propel/components/button";
import { useTranslation } from "@plane/i18n";
import { useCustomFields } from "@/hooks/store/use-custom-fields";
import type { CustomField, CustomFieldOption, CustomFieldType } from "@/types/custom-fields";

export const CustomFieldManager = observer(function CustomFieldManager({
  workspaceSlug,
  projectId,
  disabled = false,
  compact = false,
}: {
  workspaceSlug: string;
  projectId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const store = useCustomFields();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState<CustomFieldOption[]>([]);
  const [numberFormat, setNumberFormat] = useState<CustomField["number_format"]>("number");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fields = store.fields(projectId);
  const edit = (field?: CustomField) => {
    setEditing(field?.id);
    setName(field?.name ?? "");
    setKind(field?.field_type ?? "text");
    setOptions(field ? field.options.map((option) => ({ ...option })) : []);
    setNumberFormat(field?.number_format ?? "number");
    setActive(field?.is_active ?? true);
    setError(false);
  };
  const moveOption = (index: number, offset: number) => {
    const next = [...options];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setOptions(next);
  };
  const changeOption = (index: number, change: Partial<CustomFieldOption>) =>
    setOptions(options.map((option, i) => (i === index ? { ...option, ...change } : option)));
  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      const field = await store.saveField(
        workspaceSlug,
        projectId,
        {
          name: name.trim(),
          field_type: kind,
          options,
          number_format: numberFormat,
          is_active: active,
          sort_order: fields.find((item) => item.id === editing)?.sort_order ?? fields.length,
        },
        editing
      );
      edit(field);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const inputClass = "min-w-0 w-full rounded border border-strong bg-surface-1 px-2 py-1.5 text-13";
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="rounded px-2 py-1 text-13 text-accent-primary hover:bg-layer-1 disabled:opacity-50"
        title={t("custom_fields.manage")}
        aria-label={t("custom_fields.manage")}
        onClick={() => {
          edit();
          setOpen(true);
        }}
      >
        + {!compact && t("custom_fields.column")}
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent size="lg">
          <div className="max-h-[80vh] overflow-y-auto p-5">
            <div className="mb-4">
              <DialogTitle>{t("custom_fields.manage")}</DialogTitle>
            </div>
            <div className="flex flex-col gap-5 md:flex-row">
              <div className="w-full space-y-1 md:w-44 md:shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  stretch="auto"
                  label={t("custom_fields.new")}
                  onClick={() => edit()}
                  disabled={busy}
                />
                {fields.map((field) => (
                  <button
                    type="button"
                    key={field.id}
                    disabled={busy}
                    onClick={() => edit(field)}
                    className={`block w-full truncate rounded p-2 text-left text-13 hover:bg-layer-1 ${editing === field.id ? "bg-layer-1" : ""} ${field.is_active ? "" : "opacity-50"}`}
                    title={field.name}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
              <form
                className="min-w-0 flex-1 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <label className="block space-y-1 text-13">
                  {t("custom_fields.name")}
                  <input
                    autoComplete="off"
                    className={inputClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={100}
                    disabled={busy}
                  />
                </label>
                <label className="block space-y-1 text-13">
                  {t("custom_fields.type")}
                  <select
                    className={inputClass}
                    value={kind}
                    onChange={(event) => setKind(event.target.value as CustomFieldType)}
                    disabled={busy || !!editing}
                  >
                    {(["text", "number", "date", "single_select", "multi_select", "people"] as const).map((type) => (
                      <option key={type} value={type}>
                        {t(`custom_fields.types.${type}`)}
                      </option>
                    ))}
                  </select>
                </label>
                {kind === "number" && (
                  <label className="block space-y-1 text-13">
                    {t("custom_fields.format")}
                    <select
                      className={inputClass}
                      value={numberFormat}
                      onChange={(event) => setNumberFormat(event.target.value as CustomField["number_format"])}
                      disabled={busy}
                    >
                      {(["number", "percent", "currency"] as const).map((format) => (
                        <option key={format} value={format}>
                          {t(`custom_fields.formats.${format}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(kind === "single_select" || kind === "multi_select") && (
                  <div className="space-y-2">
                    <div className="text-13 font-medium">{t("custom_fields.options")}</div>
                    {options.map((option, index) => (
                      <div className="flex items-center gap-2" key={option.id}>
                        <input
                          type="color"
                          aria-label={t("custom_fields.color")}
                          value={option.color}
                          onChange={(event) => changeOption(index, { color: event.target.value })}
                          disabled={busy}
                          className="h-8 w-8 shrink-0"
                        />
                        <input
                          aria-label={t("custom_fields.option_name")}
                          className={inputClass}
                          value={option.name}
                          onChange={(event) => changeOption(index, { name: event.target.value })}
                          required
                          maxLength={100}
                          disabled={busy}
                        />
                        <button
                          type="button"
                          aria-label={t("custom_fields.move_up")}
                          disabled={busy || index === 0}
                          onClick={() => moveOption(index, -1)}
                          className="disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={t("custom_fields.move_down")}
                          disabled={busy || index === options.length - 1}
                          onClick={() => moveOption(index, 1)}
                          className="disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <label className="flex shrink-0 items-center gap-1 text-12">
                          <input
                            type="checkbox"
                            checked={option.is_active}
                            onChange={(event) => changeOption(index, { is_active: event.target.checked })}
                            disabled={busy}
                          />
                          {t("custom_fields.visible")}
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={busy || options.length >= 100}
                      className="text-13 text-accent-primary"
                      onClick={() =>
                        setOptions([
                          ...options,
                          { id: crypto.randomUUID(), name: "", color: "#6b7280", is_active: true },
                        ])
                      }
                    >
                      + {t("custom_fields.add_option")}
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 text-13">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    disabled={busy}
                  />
                  {t("custom_fields.show_in_project")}
                </label>
                <p className="text-12 text-tertiary">{t("custom_fields.preserve_hint")}</p>
                {error && (
                  <p role="alert" className="text-13 text-danger-primary">
                    {t("custom_fields.config_failed")}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    stretch="auto"
                    label={t("custom_fields.close")}
                    onClick={() => setOpen(false)}
                    disabled={busy}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    stretch="auto"
                    label={t("custom_fields.save")}
                    type="submit"
                    loading={busy}
                    disabled={!name.trim() || disabled}
                  />
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
