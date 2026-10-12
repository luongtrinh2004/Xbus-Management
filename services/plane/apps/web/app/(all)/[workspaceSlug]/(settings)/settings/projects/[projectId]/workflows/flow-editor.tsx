import { useTranslation } from "@plane/i18n";
import { useState } from "react";
import { Button } from "@makeplane/propel/components/button";
import { Select } from "@plane/blocks/select";

type Option = { id: string; name: string };
export type FlowDraft = {
  source: string;
  target: string;
  roles: string[];
  originalTarget?: string;
};

export function FlowEditor({
  draft,
  states,
  members,
  onClose,
  onSave,
}: {
  draft: FlowDraft;
  states: Option[];
  members: Option[];
  onClose: () => void;
  onSave: (value: FlowDraft) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const source = states.find((state) => state.id === value.source);
  const destinations = states.filter((state) => state.id !== value.source);
  const all = value.roles.includes("member");
  const updateRole = (role: string, enabled: boolean) =>
    setValue({
      ...value,
      roles: enabled
        ? [...value.roles.filter((current) => current !== role), role]
        : value.roles.filter((current) => current !== role),
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-editor-title"
        className="shadow-lg flex h-full w-full max-w-lg flex-col border-l border-subtle bg-surface-1"
      >
        <div className="flex items-center justify-between border-b border-subtle p-5">
          <h2 id="flow-editor-title" className="text-h5-medium">
            {draft.originalTarget
              ? t("xbus_workflow.edit_transition")
              : t("xbus_workflow.add_transition")}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            stretch="auto"
            label={t("xbus_workflow.close")}
            disabled={busy}
            onClick={onClose}
          />
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-body-sm-regular">
          <div>
            <p className="mb-2 text-secondary">{t("xbus_workflow.source")}</p>
            <p className="font-medium">{source?.name}</p>
          </div>
          <div>
            <p className="mb-2 text-secondary">{t("xbus_workflow.move_to")}</p>
            <Select<Option>
              getValues={() => destinations}
              getOptionValue={(option) => option.id}
              getOptionLabel={(option) => option.name}
              value={destinations.find((option) => option.id === value.target) ?? null}
              onChange={(id) => setValue({ ...value, target: id ?? "" })}
              placeholder={t("xbus_workflow.choose_target")}
              disabled={busy}
            >
              <Select.Trigger<Option>
                variant="select-ghost-md"
                aria-label={t("xbus_workflow.target")}
              >
                <span>
                  {destinations.find((option) => option.id === value.target)?.name ??
                    t("xbus_workflow.choose_target")}
                </span>
              </Select.Trigger>
            </Select>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-secondary">{t("xbus_workflow.who_can_move")}</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={busy}
                checked={all}
                onChange={(event) =>
                  setValue({
                    ...value,
                    roles: event.target.checked ? ["admin", "member"] : ["admin"],
                  })
                }
              />
              {t("xbus_workflow.all_project_members")}
            </label>
            {!all && (
              <>
                <div className="space-y-2 rounded-lg border border-subtle p-3">
                  {Object.entries({
                    admin: "Admin",
                    assignee: t("xbus_workflow.assigned_user"),
                    reviewer: t("xbus_workflow.reviewer_action"),
                  }).map(([role, label]) => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={value.roles.includes(role)}
                        onChange={(event) => updateRole(role, event.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-secondary">{t("xbus_workflow.specific_member")}</p>
                <div className="space-y-2 rounded-lg border border-subtle p-3">
                  {members.map((member) => (
                    <label key={member.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={value.roles.includes(`user:${member.id}`)}
                        onChange={(event) => updateRole(`user:${member.id}`, event.target.checked)}
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </>
            )}
          </fieldset>
          <p className="text-caption-sm-regular text-secondary">
            {t("xbus_workflow.approval_hint")}
          </p>
          {error && (
            <p role="alert" className="text-danger-primary">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle p-5">
          <Button
            variant="secondary"
            size="md"
            stretch="auto"
            label={t("xbus_workflow.cancel")}
            disabled={busy}
            onClick={onClose}
          />
          <Button
            variant="primary"
            size="md"
            stretch="auto"
            label={t("xbus_workflow.save_transition")}
            loading={busy}
            disabled={busy || !value.target || value.roles.length === 0}
            onClick={() => {
              setBusy(true);
              setError("");
              void onSave(value)
                .then((saved) => {
                  if (saved) onClose();
                  else setError(t("xbus_workflow.transition_save_failed"));
                  return saved;
                })
                .finally(() => setBusy(false));
            }}
          />
        </div>
      </aside>
    </div>
  );
}
