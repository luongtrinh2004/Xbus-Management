import { plainTextHTML } from "./helpers";
import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@makeplane/propel/components/button";
import { useTranslation } from "@plane/i18n";
import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

class AssistanceService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  async generate(slug: string, project: string, data: object) {
    return (await this.post(`/api/workspaces/${encodeURIComponent(slug)}/projects/${project}/ai-assistance/`, data))
      .data;
  }
  async apply(slug: string, project: string, data: object) {
    return (
      await this.post(
        `/api/workspaces/${encodeURIComponent(slug)}/projects/${project}/ai-assistance/apply-subtasks/`,
        data
      )
    ).data;
  }
}
const service = new AssistanceService();
type Action = "summary" | "description" | "subtasks";
type Suggestion = { name: string; description: string; selected: boolean; id: string };

export function IssueAIAssistant({
  workspaceSlug,
  projectId,
  issueId,
  name,
  description,
  disabled,
  onDescription,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId?: string;
  name: string;
  description?: string;
  disabled?: boolean;
  onDescription: (html: string) => void | Promise<void>;
}) {
  const { t, currentLocale } = useTranslation();
  const { fetchIssue, subIssues } = useIssueDetail();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action>();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const reportError = (reason: unknown) => {
    const response = (reason as { response?: { data?: { code?: string }; status?: number } })?.response;
    const code = response?.data?.code;
    const known = [
      "ai_not_configured",
      "ai_timeout",
      "ai_unavailable",
      "ai_rate_limited",
      "ai_configuration_error",
      "ai_invalid_response",
      "ai_busy",
      "ai_apply_conflict",
    ];
    setError(code && known.includes(code) ? code : response?.status === 403 ? "ai_access_denied" : "ai_unavailable");
  };
  const generate = async (next: Action) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await service.generate(workspaceSlug, projectId, {
        action: next,
        language: currentLocale === "en" ? "en" : "vi-VN",
        ...(issueId ? { issue_id: issueId } : { name, description: description ?? "" }),
      });
      setAction(next);
      setText(data.result.text ?? "");
      setSuggestions(
        (data.result.subtasks ?? []).map((item: { name: string; description: string }) => ({
          name: item.name,
          description: item.description,
          selected: true,
          id: crypto.randomUUID(),
        }))
      );
      setApplied(false);
      requestId.current = crypto.randomUUID();
    } catch (reason) {
      reportError(reason);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const apply = async () => {
    if (lock.current || applied) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "subtasks" && issueId) {
        await service.apply(workspaceSlug, projectId, {
          request_id: requestId.current,
          issue_id: issueId,
          subtasks: suggestions
            .filter((item) => item.selected)
            .map((item) => ({ name: item.name, description: item.description })),
        });
        setApplied(true);
        void Promise.allSettled([
          fetchIssue(workspaceSlug, projectId, issueId),
          subIssues.fetchSubIssues(workspaceSlug, projectId, issueId),
        ]);
      } else if (action === "description") {
        await onDescription(plainTextHTML(text));
        setApplied(true);
      }
    } catch (reason) {
      reportError(reason);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="my-3 space-y-3" aria-label={t("issue_ai.title")}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        stretch="auto"
        icon={<Sparkles className="size-4" />}
        label={t("issue_ai.title")}
        onClick={() => setOpen(!open)}
        disabled={disabled || busy}
      />
      {open && (
        <div className="space-y-3 rounded-lg border border-subtle bg-surface-1 p-4">
          <p className="text-13 text-tertiary">{t("issue_ai.context_hint")}</p>
          <div className="flex flex-wrap gap-2">
            {(["summary", "description", ...(issueId ? ["subtasks"] : [])] as Action[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant="secondary"
                size="sm"
                stretch="auto"
                label={t(`issue_ai.${item}`)}
                disabled={disabled || busy || !name.trim()}
                onClick={() => void generate(item)}
              />
            ))}
          </div>
          {busy && (
            <p role="status" className="text-13">
              {t("issue_ai.working")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-13 text-danger-primary">
              {t(`issue_ai.${error}`)}
            </p>
          )}
          {action && (
            <>
              <p className="text-13 font-medium">{t("issue_ai.preview")}</p>
              {action !== "subtasks" && (
                <textarea
                  aria-label={t("issue_ai.preview")}
                  className="w-full rounded border border-strong bg-surface-1 p-2 text-13"
                  rows={7}
                  value={text}
                  maxLength={16000}
                  disabled={busy || applied}
                  onChange={(event) => setText(event.target.value)}
                />
              )}
              {action === "subtasks" &&
                suggestions.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      aria-label={t("issue_ai.select_subtask", { name: item.name })}
                      checked={item.selected}
                      disabled={busy || applied}
                      onChange={(event) =>
                        setSuggestions(
                          suggestions.map((row, i) => (i === index ? { ...row, selected: event.target.checked } : row))
                        )
                      }
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        aria-label={t("issue_ai.subtask_name")}
                        className="w-full rounded border border-strong bg-surface-1 p-2 text-13"
                        maxLength={255}
                        value={item.name}
                        disabled={busy || applied}
                        onChange={(event) =>
                          setSuggestions(
                            suggestions.map((row, i) => (i === index ? { ...row, name: event.target.value } : row))
                          )
                        }
                      />
                      <textarea
                        aria-label={t("issue_ai.subtask_description")}
                        className="w-full rounded border border-subtle bg-surface-1 p-2 text-13"
                        maxLength={2000}
                        value={item.description}
                        disabled={busy || applied}
                        onChange={(event) =>
                          setSuggestions(
                            suggestions.map((row, i) =>
                              i === index ? { ...row, description: event.target.value } : row
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              {action !== "summary" && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  stretch="auto"
                  label={t(
                    applied
                      ? "issue_ai.applied"
                      : action === "subtasks"
                        ? "issue_ai.create_selected"
                        : "issue_ai.apply_description"
                  )}
                  disabled={
                    busy ||
                    applied ||
                    disabled ||
                    (action === "subtasks"
                      ? !suggestions.some((item) => item.selected) ||
                        suggestions.some((item) => item.selected && !item.name.trim())
                      : !text.trim())
                  }
                  onClick={() => void apply()}
                />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
