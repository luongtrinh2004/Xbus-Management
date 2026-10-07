/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Switch } from "@makeplane/propel/components/switch";
import { ArrowNarrowLeftOutline, ChevronRightOutline, StateOutline } from "@makeplane/propel/icons";
import { Button } from "@makeplane/propel/components/button";
import { Badge } from "@makeplane/propel/components/badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makeplane/propel/components/menu";
import { Circle, CircleDashed, CircleDot, CircleCheck, CircleX, MoreHorizontal } from "lucide-react";
import { FlowEditor } from "./flow-editor";
import type { FlowDraft } from "./flow-editor";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsPageHeader } from "@/components/settings/page-header";
import type { Route } from "./+types/page";

type WorkflowConfig = {
  enabled: boolean;
  require_review: boolean;
  allowed_new: string[];
  rules: Record<string, string[]>;
};
type WorkflowData = {
  can_edit: boolean;
  config: WorkflowConfig;
  members?: { id: string; name: string }[];
  states: { id: string; name: string; color: string; group: string }[];
};
const roles = { admin: "Admin", member: "Thành viên", assignee: "Người được giao", reviewer: "Người nghiệm thu" };
const names: Record<string, string> = {
  Backlog: "Chờ lên kế hoạch",
  Todo: "Cần làm",
  "In Progress": "Đang thực hiện",
  Done: "Hoàn thành",
  Cancelled: "Đã hủy",
};

export default function WorkflowSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  const [searchParams] = useSearchParams();
  const isDetail = searchParams.get("workflow") === "default";
  const [savedConfig, setSavedConfig] = useState("");
  const [flowDraft, setFlowDraft] = useState<FlowDraft | null>(null);
  const [data, setData] = useState<WorkflowData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${projectId}/xbus-workflow/`;
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setMessage("");
    void fetch(url, { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được workflow hoặc bạn chưa có quyền truy cập.");
        return response.json() as Promise<WorkflowData>;
      })
      .then((result) => {
        setData(result);
        setSavedConfig(JSON.stringify(result.config));
        return result;
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được workflow.");
      });
    return () => controller.abort();
  }, [url]);

  const change = (config: WorkflowConfig) => {
    if (data) setData({ ...data, config });
    setMessage("");
  };
  const save = async (config = data?.config) => {
    if (!data || !config) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const tokenResponse = await fetch("/auth/get-csrf-token/", { credentials: "same-origin" });
      if (!tokenResponse.ok) throw new Error("Hãy kết nối lại module.");
      const token = await tokenResponse.json();
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token.csrf_token },
        body: JSON.stringify({ config }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.detail ?? result.error ?? (Array.isArray(result) ? result.join(" ") : "Không lưu được workflow.")
        );
      setData(result as WorkflowData);
      setSavedConfig(JSON.stringify((result as WorkflowData).config));
      setMessage("Đã lưu workflow. Quy tắc áp dụng khi tạo mới hoặc chuyển trạng thái công việc.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được workflow.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const initializeStates = async () => {
    setBusy(true);
    setError("");
    try {
      const tokenResponse = await fetch("/auth/get-csrf-token/", { credentials: "same-origin" });
      if (!tokenResponse.ok) throw new Error("Hãy kết nối lại module.");
      const token = await tokenResponse.json();
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token.csrf_token },
        body: JSON.stringify({ action: "initialize_states" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? "Không bổ sung được trạng thái.");
      setData(result as WorkflowData);
      setSavedConfig(JSON.stringify((result as WorkflowData).config));
      setMessage("Đã bổ sung các nhóm trạng thái còn thiếu và giữ cấu hình hiện có.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không bổ sung được trạng thái.");
    } finally {
      setBusy(false);
    }
  };
  const disabled = !data?.can_edit || busy;

  const dirty = data && JSON.stringify(data.config) !== savedConfig;
  const saveButton = data?.can_edit && dirty && (
    <Button
      variant="primary"
      size="md"
      stretch="auto"
      label="Lưu thay đổi"
      loading={busy}
      disabled={busy}
      onClick={() => {
        void save();
      }}
    />
  );

  return (
    <SettingsContentWrapper
      hugging={!isDetail}
      header={
        <SettingsPageHeader
          leftItem={
            <div className="flex items-center gap-2 text-body-sm-regular">
              <StateOutline className="size-4 text-tertiary" />
              {isDetail ? (
                <>
                  <Link to="?" className="hover:underline">
                    Workflow
                  </Link>
                  <ChevronRightOutline className="size-4 text-tertiary" />
                  <span>Workflow mặc định</span>
                </>
              ) : (
                <span>Workflow</span>
              )}
            </div>
          }
        />
      }
    >
      <div className="w-full space-y-6">
        {isDetail ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                to="?"
                className="mb-3 inline-flex items-center gap-1 text-body-sm-regular text-secondary hover:text-primary"
              >
                <ArrowNarrowLeftOutline className="size-4" />
                Danh sách workflow
              </Link>
              <h1 className="text-h3-medium">Workflow mặc định</h1>
              <p className="mt-2 text-body-sm-regular text-secondary">
                Quy trình chuyển trạng thái áp dụng cho toàn bộ công việc trong dự án.
              </p>
            </div>
            {saveButton}
          </div>
        ) : (
          <div>
            <h1 className="text-h3-medium">Workflow</h1>
            <p className="mt-2 text-body-sm-regular text-secondary">
              Kiểm soát cách công việc chuyển giữa các trạng thái — ai được chuyển và chuyển đến đâu.
            </p>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-danger-subtle p-3 text-body-sm-regular text-danger-primary"
          >
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-body-sm-regular text-secondary">
            {message}
          </p>
        )}
        {!data && !error && <p className="text-body-sm-regular text-secondary">Đang tải workflow…</p>}
        {data && (
          <>
            {!data.can_edit && (
              <p className="text-body-sm-regular text-secondary">Bạn có thể xem; chỉ Admin được chỉnh sửa workflow.</p>
            )}
            {!isDetail ? (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-subtle px-4 py-4">
                  <div>
                    <h2 className="text-body-sm-regular font-medium">Bật workflow</h2>
                    <p className="mt-1 text-body-sm-regular text-secondary">Áp dụng quy tắc workflow cho dự án này.</p>
                  </div>
                  <Switch
                    size="sm"
                    aria-label="Bật workflow"
                    checked={data.config.enabled}
                    disabled={disabled}
                    onCheckedChange={(enabled) => {
                      void save({ ...data.config, enabled });
                    }}
                  />
                </div>
                <section className="space-y-4 pt-6" aria-label="Danh sách workflow">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">Workflow của dự án</h2>
                    {saveButton}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-subtle">
                    <table className="w-full min-w-[620px] text-left text-body-sm-regular">
                      <thead className="border-b border-subtle bg-layer-1 text-secondary">
                        <tr>
                          <th className="px-4 py-3 font-medium">Workflow</th>
                          <th className="px-4 py-3 font-medium">Trạng thái</th>
                          <th className="px-4 py-3 font-medium">Các trạng thái</th>
                          <th className="px-4 py-3 font-medium">Phạm vi áp dụng</th>
                          <th className="w-12">
                            <span className="sr-only">Mở cấu hình</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-layer-1">
                          <td className="px-4 py-4">
                            <Link to="?workflow=default" className="font-medium hover:underline">
                              Workflow mặc định
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant={data.config.enabled ? "success" : "neutral"}
                              size="xs"
                              label={data.config.enabled ? "Đang áp dụng" : "Đã tắt"}
                            />
                          </td>
                          <td className="px-4 py-4">Tất cả trạng thái ({data.states.length})</td>
                          <td className="px-4 py-4">Toàn bộ công việc</td>
                          <td className="px-4 py-4">
                            <Link
                              to="?workflow=default"
                              aria-label="Cấu hình Workflow mặc định"
                              className="inline-flex rounded p-1 hover:bg-layer-2"
                            >
                              <ChevronRightOutline className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-subtle px-4 py-4">
                  <div>
                    <h2 className="text-body-sm-regular font-medium">Bắt buộc nghiệm thu</h2>
                    <p className="mt-1 text-body-sm-regular text-secondary">
                      Công việc phải được duyệt trước khi chuyển sang Hoàn thành.
                    </p>
                  </div>
                  <Switch
                    size="sm"
                    aria-label="Bắt buộc nghiệm thu"
                    disabled={disabled}
                    checked={data.config.require_review}
                    onCheckedChange={(checked) =>
                      change({
                        ...data.config,
                        require_review: checked,
                        allowed_new: checked
                          ? data.config.allowed_new.filter(
                              (id) => !data.states.some((state) => state.id === id && state.group === "completed")
                            )
                          : data.config.allowed_new,
                      })
                    }
                  />
                </div>
                <section className="space-y-4 pt-3">
                  <h2 className="font-medium">Định nghĩa workflow</h2>
                  {data.can_edit && new Set(data.states.map((state) => state.group)).size < 5 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      stretch="auto"
                      label="Bổ sung các trạng thái mặc định còn thiếu"
                      disabled={busy || !!dirty}
                      onClick={() => {
                        void initializeStates();
                      }}
                    />
                  )}
                  <p className="text-body-sm-regular text-secondary">
                    Mở trạng thái để chọn bước tiếp theo và quyền chuyển. Bước không có quyền được chọn sẽ bị chặn khi
                    workflow bật.
                  </p>
                  <div className="space-y-3">
                    {data.states.map((source) => (
                      <details key={source.id} className="rounded-lg border border-subtle">
                        <summary className="cursor-pointer px-4 py-2.5">
                          <div className="inline-flex w-[calc(100%-1.5rem)] flex-wrap items-center justify-between gap-3 align-middle">
                            <span className="inline-flex items-center gap-2">
                              {(() => {
                                const StateIcon =
                                  {
                                    backlog: CircleDashed,
                                    unstarted: Circle,
                                    started: CircleDot,
                                    completed: CircleCheck,
                                    cancelled: CircleX,
                                  }[source.group] ?? Circle;
                                return <StateIcon className="size-3.5" style={{ color: source.color }} />;
                              })()}
                              {names[source.name] ?? source.name}
                            </span>
                            <span className="flex items-center gap-2 text-body-sm-regular text-secondary">
                              Cho phép tạo việc mới
                              <Switch
                                size="sm"
                                aria-label={`Cho phép tạo việc mới: ${names[source.name] ?? source.name}`}
                                disabled={disabled || (data.config.require_review && source.group === "completed")}
                                checked={data.config.allowed_new.includes(source.id)}
                                onCheckedChange={(checked) =>
                                  change({
                                    ...data.config,
                                    allowed_new: checked
                                      ? [...data.config.allowed_new, source.id]
                                      : data.config.allowed_new.filter((id) => id !== source.id),
                                  })
                                }
                              />
                              {data.can_edit && (
                                <Menu>
                                  <MenuTrigger
                                    render={
                                      <button
                                        type="button"
                                        aria-label={`Thao tác trạng thái ${names[source.name] ?? source.name}`}
                                        className="rounded p-1 hover:bg-layer-1"
                                        disabled={busy}
                                      >
                                        <MoreHorizontal className="size-4" />
                                      </button>
                                    }
                                  />
                                  <MenuContent side="bottom" align="end">
                                    <MenuItem
                                      label="Thêm luồng chuyển bước"
                                      onClick={() =>
                                        setFlowDraft({ source: source.id, target: "", roles: ["admin", "member"] })
                                      }
                                    />
                                    <MenuItem
                                      label="Chặn mọi bước chuyển từ trạng thái này"
                                      onClick={() => {
                                        const rules = { ...data.config.rules };
                                        data.states.forEach((target) => {
                                          if (target.id !== source.id) rules[`${source.id}:${target.id}`] = [];
                                        });
                                        void save({ ...data.config, rules });
                                      }}
                                    />
                                    <MenuItem
                                      label="Quản lý trạng thái dự án"
                                      onClick={() => {
                                        window.location.assign(
                                          `/${workspaceSlug}/settings/projects/${projectId}/states/`
                                        );
                                      }}
                                    />
                                  </MenuContent>
                                </Menu>
                              )}
                            </span>
                          </div>
                        </summary>
                        <div className="space-y-4 border-t border-subtle p-4">
                          {data.states
                            .filter(
                              (target) =>
                                target.id !== source.id &&
                                (data.config.rules[`${source.id}:${target.id}`]?.length ?? 0) > 0
                            )
                            .map((target) => {
                              const edge = `${source.id}:${target.id}`;
                              const selected = data.config.rules[edge] ?? [];
                              const who = selected.includes("member")
                                ? "Tất cả thành viên"
                                : selected
                                    .map((role) =>
                                      role.startsWith("user:")
                                        ? (data.members?.find((member) => `user:${member.id}` === role)?.name ??
                                          "Thành viên đã rời dự án")
                                        : (roles[role as keyof typeof roles] ?? role)
                                    )
                                    .join(", ");
                              return (
                                <div
                                  key={target.id}
                                  className="flex items-start justify-between gap-3 rounded border border-subtle p-3 text-body-sm-regular"
                                >
                                  <div>
                                    <p>
                                      Chuyển đến{" "}
                                      <span className="font-medium">{names[target.name] ?? target.name}</span>
                                    </p>
                                    <p className="mt-1 text-secondary">Bởi: {who}</p>
                                  </div>
                                  {data.can_edit && (
                                    <Menu>
                                      <MenuTrigger
                                        render={
                                          <button
                                            type="button"
                                            aria-label={`Thao tác luồng đến ${names[target.name] ?? target.name}`}
                                            disabled={busy}
                                            className="rounded p-1 hover:bg-layer-1"
                                          >
                                            <MoreHorizontal className="size-4" />
                                          </button>
                                        }
                                      />
                                      <MenuContent side="bottom" align="end">
                                        <MenuItem
                                          label="Chỉnh sửa luồng"
                                          onClick={() =>
                                            setFlowDraft({
                                              source: source.id,
                                              target: target.id,
                                              originalTarget: target.id,
                                              roles: selected,
                                            })
                                          }
                                        />
                                        <MenuItem
                                          label="Xóa luồng"
                                          onClick={() => {
                                            void save({ ...data.config, rules: { ...data.config.rules, [edge]: [] } });
                                          }}
                                        />
                                      </MenuContent>
                                    </Menu>
                                  )}
                                </div>
                              );
                            })}
                          {data.can_edit && (
                            <Button
                              variant="secondary"
                              size="sm"
                              stretch="auto"
                              label="+ Thêm luồng chuyển bước"
                              disabled={disabled}
                              onClick={() =>
                                setFlowDraft({ source: source.id, target: "", roles: ["admin", "member"] })
                              }
                            />
                          )}
                          {!data.states.some(
                            (target) =>
                              target.id !== source.id &&
                              (data.config.rules[`${source.id}:${target.id}`]?.length ?? 0) > 0
                          ) && (
                            <p className="text-body-sm-regular text-secondary">
                              Chưa có luồng chuyển bước. Công việc không được chuyển từ trạng thái này khi workflow bật.
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
                <div className="flex items-center gap-3">
                  {saveButton}
                  {dirty && <span className="text-body-sm-regular text-secondary">Có thay đổi chưa lưu</span>}
                </div>
              </>
            )}
          </>
        )}
        {data && flowDraft && (
          <FlowEditor
            key={`${flowDraft.source}:${flowDraft.originalTarget ?? "new"}`}
            draft={flowDraft}
            states={data.states.map((state) => ({ id: state.id, name: names[state.name] ?? state.name }))}
            members={data.members ?? []}
            onClose={() => setFlowDraft(null)}
            onSave={async (draft) => {
              const rules = { ...data.config.rules };
              if (draft.originalTarget && draft.originalTarget !== draft.target)
                rules[`${draft.source}:${draft.originalTarget}`] = [];
              rules[`${draft.source}:${draft.target}`] = draft.roles;
              return save({ ...data.config, rules });
            }}
          />
        )}
      </div>
    </SettingsContentWrapper>
  );
}
