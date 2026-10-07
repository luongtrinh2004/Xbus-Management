/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */
import { useEffect, useState } from "react";
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

const labels: Record<string, string> = {
  disabled: "Chưa bật",
  draft: "Chưa gửi kiểm tra",
  pending: "Chờ nghiệm thu",
  approved: "Đã duyệt",
  rejected: "Cần bổ sung",
  configure: "Chọn người nghiệm thu",
  submit: "Gửi kiểm tra",
  approve: "Duyệt hoàn thành",
  reject: "Trả lại",
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
          if (!response.ok) throw new Error("Không tải được thông tin nghiệm thu.");
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
          if (!controller.signal.aborted)
            setError(reason instanceof Error ? reason.message : "Không tải được thông tin nghiệm thu.");
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
      if (!tokenResponse.ok) throw new Error("Không xác thực được phiên đăng nhập. Hãy kết nối lại module.");
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
            : (result.detail ??
              result.error ??
              (Array.isArray(result) ? result.join(" ") : "Không thực hiện được thao tác."));
        throw new Error(message);
      }
      setData(result as ReviewData);
      setReviewer((result as ReviewData).reviewer_id);
      setNote("");
      await fetchIssue(workspaceSlug, projectId, issueId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thực hiện được thao tác.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="my-4 space-y-3 rounded-lg border border-subtle p-4" aria-label="Nghiệm thu công việc">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Nghiệm thu</h3>
        <span className="text-sm">{data ? (labels[data.status] ?? data.status) : "Đang tải…"}</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-primary">
          {error}
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
            placeholder="Chọn người nghiệm thu"
            showSearch
          >
            <Select.Trigger<ReviewPerson> variant="select-ghost-md" aria-label="Người nghiệm thu">
              <span>{data.candidates.find((person) => person.id === reviewer)?.name ?? "Chọn người nghiệm thu"}</span>
            </Select.Trigger>
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="md"
            stretch="auto"
            label="Lưu người nghiệm thu"
            disabled={busy || !reviewer || reviewer === data.reviewer_id}
            onClick={() => {
              void act("configure");
            }}
          />
        </div>
      ) : (
        data?.reviewer_id && (
          <p className="text-sm">
            Người nghiệm thu:{" "}
            {data.candidates.find((person) => person.id === data.reviewer_id)?.name ?? "Thành viên không còn hoạt động"}
          </p>
        )
      )}
      {data?.status === "disabled" && (
        <p className="text-sm text-secondary">
          Admin chọn người nghiệm thu để bật quy trình kiểm tra cho công việc này.
        </p>
      )}
      {data && (data.can_submit || data.can_decide) && (
        <>
          <textarea
            aria-label="Kết quả hoặc nhận xét nghiệm thu"
            placeholder="Ghi kết quả, liên kết bàn giao và cách kiểm tra; hoặc lý do duyệt/trả lại."
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
                label={labels[action]}
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
          <summary className="text-sm cursor-pointer">Lịch sử nghiệm thu</summary>
          <ul className="mt-2 space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium">
                  {event.actor} · {labels[event.action]} · {new Date(event.created_at).toLocaleString("vi-VN")}
                </p>
                <p className="break-words whitespace-pre-wrap">{event.note}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
