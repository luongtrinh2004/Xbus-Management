/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@makeplane/propel/components/button";
import { Select } from "@plane/blocks/select";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

type ReviewPerson = { id: string; name: string };
type ReviewData = {
  status: string;
  reviewer_id: string;
  can_configure: boolean;
  can_submit: boolean;
  can_decide: boolean;
  candidates: ReviewPerson[];
  events: { id: number; actor: string; action: string; note: string; created_at: string }[];
};

const reviewErrorKeys: Record<string, string> = {
  "Bạn không có quyền truy cập dự án.": "server_error_0",
  "Không tìm thấy công việc.": "server_error_1",
  "Hãy khôi phục công việc trước khi nghiệm thu.": "server_error_2",
  "Nội dung tối đa 10.000 ký tự.": "server_error_3",
  "Chỉ Admin được chọn người nghiệm thu.": "server_error_4",
  "Hãy mở lại công việc trước khi cấu hình nghiệm thu.": "server_error_5",
  "Người nghiệm thu phải là thành viên đang hoạt động của dự án.": "server_error_6",
  "Chỉ người thực hiện hoặc Admin được gửi kiểm tra; cần người nghiệm thu đang hoạt động.": "server_error_7",
  "Ghi kết quả và cách kiểm tra trước khi gửi.": "server_error_8",
  "Hãy mở lại công việc trước khi gửi kiểm tra.": "server_error_9",
  "Chỉ người nghiệm thu hoặc Admin được duyệt/trả lại công việc đang chờ kiểm tra.": "server_error_10",
  "Ghi lý do duyệt hoặc nội dung cần bổ sung.": "server_error_11",
  "Dự án cần có trạng thái Hoàn thành và Đang thực hiện.": "server_error_12",
  "Hành động không hợp lệ.": "server_error_13",
};

export function XBusReview({
  workspaceSlug,
  projectId,
  issueId,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
}) {
  const { t, currentLocale } = useTranslation();
  const label = (key: string) => t(`xbus_review.${key}`);
  const { fetchIssue } = useIssueDetail();
  const [data, setData] = useState<ReviewData | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${projectId}/issues/${issueId}/xbus-review/`;

  useEffect(() => {
    const controller = new AbortController();
    let initialLoad = true;
    setData(null);
    setError("");
    setNote("");
    const load = () =>
      fetch(url, { credentials: "same-origin", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("load_error");
          return response.json() as Promise<ReviewData>;
        })
        .then((result) => {
          setData(result);
          if (initialLoad) {
            setReviewer(result.reviewer_id);
            initialLoad = false;
          }
          return result;
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "load_error");
        });
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [url]);

  const act = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      const tokenResponse = await fetch("/auth/get-csrf-token/", { credentials: "same-origin" });
      if (!tokenResponse.ok) throw new Error("session_error");
      const { csrf_token: csrf } = await tokenResponse.json();
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRFToken": decodeURIComponent(csrf) } : {}) },
        body: JSON.stringify({ action, reviewer_id: reviewer, note }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "string"
            ? result
            : (result.detail ?? result.error ?? (Array.isArray(result) ? result.join(" ") : label("action_error")));
        throw new Error(reviewErrorKeys[String(message)] ?? "action_error");
      }
      setData(result as ReviewData);
      setReviewer((result as ReviewData).reviewer_id);
      setNote("");
      await fetchIssue(workspaceSlug, projectId, issueId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "action_error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="my-4 space-y-3 rounded-lg border border-subtle p-4" aria-label={label("aria_label")}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label("title")}</h3>
        <span className="text-sm">{data ? label(data.status) : label("loading")}</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-primary">
          {label(error in reviewErrorKeys ? reviewErrorKeys[error] : error)}
        </p>
      )}
      {data?.can_configure ? (
        <div className="flex flex-wrap gap-2">
          <Select<ReviewPerson>
            getValues={() => data.candidates}
            getOptionValue={(person) => person.id}
            getOptionLabel={(person) => person.name}
            value={data.candidates.find((person) => person.id === reviewer) ?? null}
            disabled={busy}
            onChange={(value) => setReviewer(value ?? "")}
            placeholder={label("configure")}
            showSearch
          >
            <Select.Trigger<ReviewPerson> variant="select-ghost-md" aria-label={label("reviewer")}>
              <span>{data.candidates.find((person) => person.id === reviewer)?.name ?? label("configure")}</span>
            </Select.Trigger>
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="md"
            stretch="auto"
            label={label("save_reviewer")}
            disabled={busy || !reviewer || reviewer === data.reviewer_id}
            onClick={() => {
              void act("configure");
            }}
          />
        </div>
      ) : (
        data?.reviewer_id && (
          <p className="text-sm">
            {label("reviewer")}:{" "}
            {data.candidates.find((person) => person.id === data.reviewer_id)?.name ?? label("inactive_member")}
          </p>
        )
      )}
      {data?.status === "disabled" && <p className="text-sm text-secondary">{label("enable_hint")}</p>}
      {data && (data.can_submit || data.can_decide) && (
        <>
          <textarea
            aria-label={label("note_label")}
            placeholder={label("note_placeholder")}
            className="text-sm w-full rounded border border-subtle bg-surface-1 p-2"
            rows={3}
            value={note}
            maxLength={10000}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex gap-2">
            {(data.can_decide ? ["approve", "reject"] : ["submit"]).map((action) => (
              <Button
                key={action}
                type="button"
                variant={action === "reject" ? "secondary" : "primary"}
                size="md"
                stretch="auto"
                label={label(action)}
                disabled={busy || !note.trim()}
                onClick={() => {
                  void act(action);
                }}
              />
            ))}
          </div>
        </>
      )}
      {data && data.events.length > 0 && (
        <details>
          <summary className="text-sm cursor-pointer">{label("history")}</summary>
          <ul className="mt-2 space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium">
                  {event.actor} · {label(event.action)} · {new Date(event.created_at).toLocaleString(currentLocale)}
                </p>
                <p className="break-words whitespace-pre-wrap">
                  {event.action === "configure" && event.note.startsWith("Người nghiệm thu: ")
                    ? `${label("reviewer")}: ${event.note.slice("Người nghiệm thu: ".length)}`
                    : event.note}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
