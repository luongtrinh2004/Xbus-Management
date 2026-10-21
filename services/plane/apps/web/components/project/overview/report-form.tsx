import { useRef, useState } from "react";
import { Button } from "@makeplane/propel/components/button";
import { Select } from "@plane/blocks/select";
import { useTranslation } from "@plane/i18n";
import {
  PROJECT_HEALTH_STATUSES,
  type ProjectHealthStatus,
  type ProjectStatusInput,
} from "@/services/project-overview.service";
import { overviewErrorKey } from "./helpers";

type StatusOption = { id: ProjectHealthStatus; name: string };

export function ProjectReportForm({
  status,
  publish,
  close,
}: {
  status?: ProjectHealthStatus;
  publish: (data: ProjectStatusInput) => Promise<void>;
  close: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProjectStatusInput>(() => ({
    status: status ?? "on_track",
    title: "",
    summary: "",
    client_request_id: crypto.randomUUID(),
  }));
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const options = PROJECT_HEALTH_STATUSES.map((id) => ({ id, name: t(`project_overview.status.${id}`) }));
  return (
    <form
      className="space-y-3 rounded-lg border border-subtle bg-surface-1 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setSaving(true);
        setError("");
        try {
          await publish(data);
          close();
        } catch (reason) {
          setError(overviewErrorKey(reason));
        } finally {
          inFlight.current = false;
          setSaving(false);
        }
      }}
    >
      <h3 className="font-medium">{t("project_overview.new_report")}</h3>
      <label className="block space-y-1 text-13">
        <span>{t("project_overview.health")}</span>
        <Select<StatusOption>
          value={options.find((option) => option.id === data.status) ?? null}
          getValues={() => options}
          getOptionValue={(option) => option.id}
          getOptionLabel={(option) => option.name}
          disabled={saving}
          onChange={(value) => {
            if (value) setData({ ...data, status: value as ProjectHealthStatus });
          }}
        >
          <Select.Trigger variant="select-md" aria-label={t("project_overview.health")} />
        </Select>
      </label>
      <label className="block space-y-1 text-13">
        <span>{t("project_overview.report_title")}</span>
        <input
          required
          maxLength={255}
          disabled={saving}
          className="w-full rounded border border-strong bg-surface-1 p-2"
          value={data.title}
          onChange={(event) => setData({ ...data, title: event.target.value })}
        />
      </label>
      <label className="block space-y-1 text-13">
        <span>{t("project_overview.report_summary")}</span>
        <textarea
          required
          maxLength={10000}
          rows={5}
          disabled={saving}
          className="w-full resize-y rounded border border-strong bg-surface-1 p-2"
          value={data.summary}
          onChange={(event) => setData({ ...data, summary: event.target.value })}
        />
      </label>
      <p className="text-13 text-tertiary">{t("project_overview.report_hint")}</p>
      {error && (
        <p role="alert" className="text-13 text-danger-primary">
          {t(error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          stretch="auto"
          loading={saving}
          disabled={saving || !data.title.trim() || !data.summary.trim()}
          label={t("project_overview.publish")}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          stretch="auto"
          disabled={saving}
          label={t("common.cancel")}
          onClick={close}
        />
      </div>
    </form>
  );
}
