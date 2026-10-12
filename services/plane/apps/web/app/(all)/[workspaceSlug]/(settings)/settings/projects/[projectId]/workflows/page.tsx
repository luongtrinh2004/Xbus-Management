/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */
import { i18nInstance, useTranslation } from "@plane/i18n";
import { getStateDisplayName } from "@plane/utils";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Switch } from "@makeplane/propel/components/switch";
import { ArrowNarrowLeftOutline, ChevronRightOutline, StateOutline } from "@makeplane/propel/icons";
import { Button } from "@makeplane/propel/components/button";
import { Badge } from "@makeplane/propel/components/badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makeplane/propel/components/menu";
import {
  Circle,
  CircleDashed,
  CircleDot,
  CircleCheck,
  CircleX,
  MoreHorizontal,
} from "lucide-react";
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
export default function WorkflowSettingsPage({ params }: Route.ComponentProps) {
  const { t } = useTranslation();
  const roles = {
    admin: "Admin",
    member: t("xbus_workflow.member"),
    assignee: t("xbus_workflow.assignee"),
    reviewer: t("xbus_workflow.reviewer"),
  };
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
        if (!response.ok) throw new Error(i18nInstance.t("xbus_workflow.load_denied"));
        return response.json() as Promise<WorkflowData>;
      })
      .then((result) => {
        setData(result);
        setSavedConfig(JSON.stringify(result.config));
        return result;
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : i18nInstance.t("xbus_workflow.load_failed"),
          );
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
      if (!tokenResponse.ok) throw new Error(t("xbus_workflow.reconnect"));
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
          result.detail ??
            result.error ??
            (Array.isArray(result) ? result.join(" ") : t("xbus_workflow.save_failed")),
        );
      setData(result as WorkflowData);
      setSavedConfig(JSON.stringify((result as WorkflowData).config));
      setMessage(t("xbus_workflow.saved"));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("xbus_workflow.save_failed"));
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
      if (!tokenResponse.ok) throw new Error(t("xbus_workflow.reconnect"));
      const token = await tokenResponse.json();
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": token.csrf_token },
        body: JSON.stringify({ action: "initialize_states" }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail ?? result.error ?? t("xbus_workflow.initialize_failed"));
      setData(result as WorkflowData);
      setSavedConfig(JSON.stringify((result as WorkflowData).config));
      setMessage(t("xbus_workflow.initialized"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("xbus_workflow.initialize_failed"));
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
      label={t("xbus_workflow.save_changes")}
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
                  <span>{t("xbus_workflow.default")}</span>
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
                {t("xbus_workflow.list")}
              </Link>
              <h1 className="text-h3-medium">{t("xbus_workflow.default")}</h1>
              <p className="mt-2 text-body-sm-regular text-secondary">
                {t("xbus_workflow.detail_description")}
              </p>
            </div>
            {saveButton}
          </div>
        ) : (
          <div>
            <h1 className="text-h3-medium">Workflow</h1>
            <p className="mt-2 text-body-sm-regular text-secondary">
              {t("xbus_workflow.description")}
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
        {!data && !error && (
          <p className="text-body-sm-regular text-secondary">{t("xbus_workflow.loading")}</p>
        )}
        {data && (
          <>
            {!data.can_edit && (
              <p className="text-body-sm-regular text-secondary">{t("xbus_workflow.read_only")}</p>
            )}
            {!isDetail ? (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-subtle px-4 py-4">
                  <div>
                    <h2 className="text-body-sm-regular font-medium">
                      {t("xbus_workflow.enable")}
                    </h2>
                    <p className="mt-1 text-body-sm-regular text-secondary">
                      {t("xbus_workflow.enable_description")}
                    </p>
                  </div>
                  <Switch
                    size="sm"
                    aria-label={t("xbus_workflow.enable")}
                    checked={data.config.enabled}
                    disabled={disabled}
                    onCheckedChange={(enabled) => {
                      void save({ ...data.config, enabled });
                    }}
                  />
                </div>
                <section className="space-y-4 pt-6" aria-label={t("xbus_workflow.list")}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium">{t("xbus_workflow.project_workflows")}</h2>
                    {saveButton}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-subtle">
                    <table className="w-full min-w-[620px] text-left text-body-sm-regular">
                      <thead className="border-b border-subtle bg-layer-1 text-secondary">
                        <tr>
                          <th className="px-4 py-3 font-medium">Workflow</th>
                          <th className="px-4 py-3 font-medium">{t("xbus_workflow.status")}</th>
                          <th className="px-4 py-3 font-medium">{t("xbus_workflow.states")}</th>
                          <th className="px-4 py-3 font-medium">{t("xbus_workflow.scope")}</th>
                          <th className="w-12">
                            <span className="sr-only">{t("xbus_workflow.open_settings")}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-layer-1">
                          <td className="px-4 py-4">
                            <Link to="?workflow=default" className="font-medium hover:underline">
                              {t("xbus_workflow.default")}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant={data.config.enabled ? "success" : "neutral"}
                              size="xs"
                              label={
                                data.config.enabled
                                  ? t("xbus_workflow.active")
                                  : t("xbus_workflow.inactive")
                              }
                            />
                          </td>
                          <td className="px-4 py-4">
                            {t("xbus_workflow.all_states", { count: data.states.length })}
                          </td>
                          <td className="px-4 py-4">{t("xbus_workflow.all_work_items")}</td>
                          <td className="px-4 py-4">
                            <Link
                              to="?workflow=default"
                              aria-label={t("xbus_workflow.configure_default")}
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
                    <h2 className="text-body-sm-regular font-medium">
                      {t("xbus_workflow.require_review")}
                    </h2>
                    <p className="mt-1 text-body-sm-regular text-secondary">
                      {t("xbus_workflow.require_review_description")}
                    </p>
                  </div>
                  <Switch
                    size="sm"
                    aria-label={t("xbus_workflow.require_review")}
                    disabled={disabled}
                    checked={data.config.require_review}
                    onCheckedChange={(checked) =>
                      change({
                        ...data.config,
                        require_review: checked,
                        allowed_new: checked
                          ? data.config.allowed_new.filter(
                              (id) =>
                                !data.states.some(
                                  (state) => state.id === id && state.group === "completed",
                                ),
                            )
                          : data.config.allowed_new,
                      })
                    }
                  />
                </div>
                <section className="space-y-4 pt-3">
                  <h2 className="font-medium">{t("xbus_workflow.definition")}</h2>
                  {data.can_edit && new Set(data.states.map((state) => state.group)).size < 5 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      stretch="auto"
                      label={t("xbus_workflow.add_missing")}
                      disabled={busy || !!dirty}
                      onClick={() => {
                        void initializeStates();
                      }}
                    />
                  )}
                  <p className="text-body-sm-regular text-secondary">
                    {t("xbus_workflow.rules_hint")}
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
                                return (
                                  <StateIcon className="size-3.5" style={{ color: source.color }} />
                                );
                              })()}
                              {getStateDisplayName(source)}
                            </span>
                            <span className="flex items-center gap-2 text-body-sm-regular text-secondary">
                              {t("xbus_workflow.allow_create")}
                              <Switch
                                size="sm"
                                aria-label={t("xbus_workflow.create_in_state", {
                                  state: getStateDisplayName(source),
                                })}
                                disabled={
                                  disabled ||
                                  (data.config.require_review && source.group === "completed")
                                }
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
                                        aria-label={t("xbus_workflow.state_actions", {
                                          state: getStateDisplayName(source),
                                        })}
                                        className="rounded p-1 hover:bg-layer-1"
                                        disabled={busy}
                                      >
                                        <MoreHorizontal className="size-4" />
                                      </button>
                                    }
                                  />
                                  <MenuContent side="bottom" align="end">
                                    <MenuItem
                                      label={t("xbus_workflow.add_transition")}
                                      onClick={() =>
                                        setFlowDraft({
                                          source: source.id,
                                          target: "",
                                          roles: ["admin", "member"],
                                        })
                                      }
                                    />
                                    <MenuItem
                                      label={t("xbus_workflow.block_all")}
                                      onClick={() => {
                                        const rules = { ...data.config.rules };
                                        data.states.forEach((target) => {
                                          if (target.id !== source.id)
                                            rules[`${source.id}:${target.id}`] = [];
                                        });
                                        void save({ ...data.config, rules });
                                      }}
                                    />
                                    <MenuItem
                                      label={t("xbus_workflow.manage_states")}
                                      onClick={() => {
                                        window.location.assign(
                                          `/${workspaceSlug}/settings/projects/${projectId}/states/`,
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
                                (data.config.rules[`${source.id}:${target.id}`]?.length ?? 0) > 0,
                            )
                            .map((target) => {
                              const edge = `${source.id}:${target.id}`;
                              const selected = data.config.rules[edge] ?? [];
                              const who = selected.includes("member")
                                ? t("xbus_workflow.all_members")
                                : selected
                                    .map((role) =>
                                      role.startsWith("user:")
                                        ? (data.members?.find(
                                            (member) => `user:${member.id}` === role,
                                          )?.name ?? t("xbus_workflow.former_member"))
                                        : (roles[role as keyof typeof roles] ?? role),
                                    )
                                    .join(", ");
                              return (
                                <div
                                  key={target.id}
                                  className="flex items-start justify-between gap-3 rounded border border-subtle p-3 text-body-sm-regular"
                                >
                                  <div>
                                    <p>
                                      {t("xbus_workflow.move_to")}{" "}
                                      <span className="font-medium">
                                        {getStateDisplayName(target)}
                                      </span>
                                    </p>
                                    <p className="mt-1 text-secondary">
                                      {t("xbus_workflow.by", { who })}
                                    </p>
                                  </div>
                                  {data.can_edit && (
                                    <Menu>
                                      <MenuTrigger
                                        render={
                                          <button
                                            type="button"
                                            aria-label={t("xbus_workflow.transition_actions", {
                                              state: getStateDisplayName(target),
                                            })}
                                            disabled={busy}
                                            className="rounded p-1 hover:bg-layer-1"
                                          >
                                            <MoreHorizontal className="size-4" />
                                          </button>
                                        }
                                      />
                                      <MenuContent side="bottom" align="end">
                                        <MenuItem
                                          label={t("xbus_workflow.edit_transition")}
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
                                          label={t("xbus_workflow.delete_transition")}
                                          onClick={() => {
                                            void save({
                                              ...data.config,
                                              rules: { ...data.config.rules, [edge]: [] },
                                            });
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
                              label={t("xbus_workflow.add_transition_button")}
                              disabled={disabled}
                              onClick={() =>
                                setFlowDraft({
                                  source: source.id,
                                  target: "",
                                  roles: ["admin", "member"],
                                })
                              }
                            />
                          )}
                          {!data.states.some(
                            (target) =>
                              target.id !== source.id &&
                              (data.config.rules[`${source.id}:${target.id}`]?.length ?? 0) > 0,
                          ) && (
                            <p className="text-body-sm-regular text-secondary">
                              {t("xbus_workflow.no_transitions")}
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
                <div className="flex items-center gap-3">
                  {saveButton}
                  {dirty && (
                    <span className="text-body-sm-regular text-secondary">
                      {t("xbus_workflow.unsaved")}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {data && flowDraft && (
          <FlowEditor
            key={`${flowDraft.source}:${flowDraft.originalTarget ?? "new"}`}
            draft={flowDraft}
            states={data.states.map((state) => ({
              id: state.id,
              name: getStateDisplayName(state),
            }))}
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
