import { useState } from "react";
import useSWR from "swr";
import { Button } from "@makeplane/propel/components/button";
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
import { PageHead } from "@/components/core/page-title";
import {
  ProjectOverviewService,
  type ProjectStatusUpdate,
  type ProjectHealthStatus,
} from "@/services/project-overview.service";
import { OverviewDetailsForm } from "./details-form";
import { ProjectReportForm } from "./report-form";
import { overviewErrorKey, safeProjectLink } from "./helpers";

const service = new ProjectOverviewService();
const healthColors: Record<ProjectHealthStatus, string> = {
  on_track: "text-success-primary",
  at_risk: "text-warning-primary",
  off_track: "text-danger-primary",
  on_hold: "text-tertiary",
  complete: "text-accent-primary",
};

function HealthLabel({ status }: { status?: ProjectHealthStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border border-subtle px-2 py-1 text-13",
        status ? healthColors[status] : "text-tertiary"
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {t(status ? `project_overview.status.${status}` : "project_overview.no_status")}
    </span>
  );
}

function Report({ report }: { report: ProjectStatusUpdate }) {
  const { t, currentLocale } = useTranslation();
  return (
    <article className="space-y-3 rounded-lg border border-subtle p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 font-medium break-words">{report.title}</h3>
        <HealthLabel status={report.status} />
      </div>
      <p className="text-13 text-tertiary">
        {report.author_name || t("project_overview.deleted_member")} ·{" "}
        <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString(currentLocale)}</time>
      </p>
      <p className="text-13 break-words whitespace-pre-wrap">{report.summary}</p>
    </article>
  );
}

export function ProjectOverviewRoot({ workspaceSlug, projectId }: { workspaceSlug: string; projectId: string }) {
  const { t, currentLocale } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useSWR(
    ["project-overview", workspaceSlug, projectId],
    () => service.load(workspaceSlug, projectId),
    { refreshInterval: 30000, revalidateOnFocus: true }
  );
  const history = useSWR(
    data ? ["project-status-updates", workspaceSlug, projectId, page] : null,
    () => service.history(workspaceSlug, projectId, page),
    { refreshInterval: 30000, revalidateOnFocus: true }
  );
  const displayDate = (value: string | null) =>
    value ? new Date(`${value}T12:00:00`).toLocaleDateString(currentLocale) : t("project_overview.not_set");
  return (
    <div className="h-full w-full overflow-y-auto">
      <PageHead title={data ? `${data.project.name} - ${t("project_overview.title")}` : t("project_overview.title")} />
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-13 text-tertiary">{t("project_overview.title")}</p>
            <h1 className="text-h5-medium break-words">{data?.project.name}</h1>
          </div>
          {data && <HealthLabel status={data.latest_update?.status} />}
        </div>
        {isLoading && <p className="text-13 text-tertiary">{t("common.loading")}</p>}
        {error && (
          <div role="alert" className="space-y-2 text-13">
            <p>{t(overviewErrorKey(error))}</p>
            <Button
              stretch="auto"
              size="sm"
              variant="secondary"
              label={t("project_overview.retry")}
              onClick={() => void mutate()}
            />
          </div>
        )}
        {data && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["total", "completed", "overdue"] as const).map((key) => (
                <div key={key} className="rounded-lg border border-subtle p-4">
                  <p className="text-13 text-tertiary">{t(`project_overview.counts.${key}`)}</p>
                  <p className="mt-1 text-h5-medium">{data.task_counts[key]}</p>
                </div>
              ))}
            </div>
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-6">
                <section className="space-y-3 rounded-lg border border-subtle p-4">
                  <h2 className="font-medium">{t("project_overview.description")}</h2>
                  <p className="text-13 break-words whitespace-pre-wrap text-secondary">
                    {data.project.description || t("project_overview.no_description")}
                  </p>
                </section>
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{t("project_overview.reports")}</h2>
                    {data.can_edit && !reporting && (
                      <Button
                        size="sm"
                        stretch="auto"
                        variant="primary"
                        label={t("project_overview.new_report")}
                        onClick={() => setReporting(true)}
                      />
                    )}
                  </div>
                  {reporting && data.can_edit && (
                    <ProjectReportForm
                      status={data.latest_update?.status}
                      close={() => setReporting(false)}
                      publish={async (input) => {
                        await service.publish(workspaceSlug, projectId, input);
                        setPage(1);
                        // A failed refresh must not make a successful publication look like a failed POST.
                        void mutate().catch(() => undefined);
                        void history.mutate().catch(() => undefined);
                      }}
                    />
                  )}
                  {history.isLoading && <p className="text-13 text-tertiary">{t("common.loading")}</p>}
                  {history.error && (
                    <div role="alert" className="space-y-2 text-13">
                      <p>{t("project_overview.history_failed")}</p>
                      <Button
                        stretch="auto"
                        size="sm"
                        variant="secondary"
                        label={t("project_overview.retry")}
                        onClick={() => void history.mutate()}
                      />
                    </div>
                  )}
                  {history.data?.results.map((report) => (
                    <Report key={report.id} report={report} />
                  ))}
                  {history.data?.count === 0 && (
                    <p className="rounded-lg border border-dashed border-subtle p-6 text-13 text-tertiary">
                      {t("project_overview.no_reports")}
                    </p>
                  )}
                  {history.data && (page > 1 || history.data.next_page) && (
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        stretch="auto"
                        size="sm"
                        variant="secondary"
                        disabled={page === 1}
                        label={t("project_overview.previous")}
                        onClick={() => setPage(page - 1)}
                      />
                      <span className="text-13 text-tertiary">{t("project_overview.page", { page })}</span>
                      <Button
                        stretch="auto"
                        size="sm"
                        variant="secondary"
                        disabled={!history.data.next_page}
                        label={t("project_overview.next")}
                        onClick={() => setPage(history.data!.next_page!)}
                      />
                    </div>
                  )}
                </section>
              </div>
              <aside className="min-w-0 space-y-6">
                <section className="space-y-4 rounded-lg border border-subtle p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{t("project_overview.details")}</h2>
                    {data.can_edit && !editing && (
                      <Button
                        size="sm"
                        stretch="auto"
                        variant="secondary"
                        label={t("project_overview.edit")}
                        onClick={() => setEditing(true)}
                      />
                    )}
                  </div>
                  {editing && data.can_edit ? (
                    <OverviewDetailsForm
                      initial={data.details}
                      close={() => setEditing(false)}
                      save={async (details) => {
                        await service.saveDetails(workspaceSlug, projectId, details);
                        void mutate().catch(() => undefined);
                      }}
                    />
                  ) : (
                    <>
                      <dl className="space-y-3 text-13">
                        {(["start_date", "target_date"] as const).map((key) => (
                          <div key={key}>
                            <dt className="text-tertiary">{t(`project_overview.${key}`)}</dt>
                            <dd>{displayDate(data.details[key])}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="space-y-2 text-13">
                        <h3 className="text-tertiary">{t("project_overview.links")}</h3>
                        {data.details.links.length === 0 && (
                          <p className="text-tertiary">{t("project_overview.no_links")}</p>
                        )}
                        {data.details.links
                          .filter((link) => safeProjectLink(link.url))
                          .map((link, index) => (
                            <a
                              // Resource rows are read-only and the array is replaced as a whole after saving.
                              // oxlint-disable-next-line react/no-array-index-key
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block break-words text-accent-primary hover:underline"
                            >
                              {link.title}
                            </a>
                          ))}
                      </div>
                    </>
                  )}
                </section>
                <section className="space-y-3 rounded-lg border border-subtle p-4">
                  <h2 className="font-medium">{t("project_overview.members")}</h2>
                  <ul className="space-y-3">
                    {data.members.map((member) => (
                      <li key={member.user_id} className="flex items-start justify-between gap-3 text-13">
                        <span className="min-w-0 break-words">{member.name}</span>
                        <span className="shrink-0 text-tertiary">{t(`project_overview.roles.${member.role}`)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
