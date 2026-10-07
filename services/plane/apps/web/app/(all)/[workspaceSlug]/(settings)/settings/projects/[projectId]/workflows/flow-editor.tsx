import { useState } from "react";
import { Button } from "@makeplane/propel/components/button";
import { Select } from "@plane/blocks/select";

type Option = { id: string; name: string };
export type FlowDraft = { source: string; target: string; roles: string[]; originalTarget?: string };

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
            {draft.originalTarget ? "Chỉnh sửa luồng" : "Thêm luồng chuyển bước"}
          </h2>
          <Button variant="secondary" size="sm" stretch="auto" label="Đóng" disabled={busy} onClick={onClose} />
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-body-sm-regular">
          <div>
            <p className="mb-2 text-secondary">Từ trạng thái</p>
            <p className="font-medium">{source?.name}</p>
          </div>
          <div>
            <p className="mb-2 text-secondary">Chuyển đến</p>
            <Select<Option>
              getValues={() => destinations}
              getOptionValue={(option) => option.id}
              getOptionLabel={(option) => option.name}
              value={destinations.find((option) => option.id === value.target) ?? null}
              onChange={(id) => setValue({ ...value, target: id ?? "" })}
              placeholder="Chọn trạng thái đích"
              disabled={busy}
            >
              <Select.Trigger<Option> variant="select-ghost-md" aria-label="Trạng thái đích">
                <span>{destinations.find((option) => option.id === value.target)?.name ?? "Chọn trạng thái đích"}</span>
              </Select.Trigger>
            </Select>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-secondary">Ai được chuyển bước?</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={busy}
                checked={all}
                onChange={(event) =>
                  setValue({ ...value, roles: event.target.checked ? ["admin", "member"] : ["admin"] })
                }
              />
              Tất cả thành viên dự án
            </label>
            {!all && (
              <>
                <div className="space-y-2 rounded-lg border border-subtle p-3">
                  {Object.entries({
                    admin: "Admin",
                    assignee: "Người được giao việc",
                    reviewer: "Người nghiệm thu (qua Duyệt/Trả lại)",
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
                <p className="text-secondary">Hoặc chọn thành viên cụ thể</p>
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
            Nếu công việc yêu cầu nghiệm thu, quyền chuyển bước không thay thế việc duyệt kết quả.
          </p>
          {error && (
            <p role="alert" className="text-danger-primary">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle p-5">
          <Button variant="secondary" size="md" stretch="auto" label="Hủy" disabled={busy} onClick={onClose} />
          <Button
            variant="primary"
            size="md"
            stretch="auto"
            label="Lưu luồng"
            loading={busy}
            disabled={busy || !value.target || value.roles.length === 0}
            onClick={() => {
              setBusy(true);
              setError("");
              void onSave(value)
                .then((saved) => {
                  if (saved) onClose();
                  else setError("Không lưu được luồng. Kiểm tra thông báo trên trang Workflow.");
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
