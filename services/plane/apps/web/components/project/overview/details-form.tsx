import { useRef, useState } from "react";
import { Button } from "@makeplane/propel/components/button";
import { useTranslation } from "@plane/i18n";
import type { ProjectOverviewDetails } from "@/services/project-overview.service";
import { overviewErrorKey } from "./helpers";

export function OverviewDetailsForm({
  initial,
  save,
  close,
}: {
  initial: ProjectOverviewDetails;
  save: (data: ProjectOverviewDetails) => Promise<void>;
  close: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState(() => ({
    ...initial,
    links: initial.links.map((link) => ({ ...link, clientKey: crypto.randomUUID() })),
  }));
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const inputClass = "w-full rounded border border-strong bg-surface-1 p-2 text-13";
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setSaving(true);
        setError("");
        try {
          await save({ ...data, links: data.links.map(({ title, url }) => ({ title, url })) });
          close();
        } catch (reason) {
          setError(overviewErrorKey(reason));
        } finally {
          inFlight.current = false;
          setSaving(false);
        }
      }}
    >
      <fieldset disabled={saving} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["start_date", "target_date"] as const).map((field) => (
            <label key={field} className="space-y-1 text-13">
              <span>{t(`project_overview.${field}`)}</span>
              <input
                className={inputClass}
                type="date"
                value={data[field] ?? ""}
                min={field === "target_date" ? (data.start_date ?? undefined) : undefined}
                max={field === "start_date" ? (data.target_date ?? undefined) : undefined}
                onChange={(event) => setData({ ...data, [field]: event.target.value || null })}
              />
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-13 font-medium">{t("project_overview.links")}</p>
          {data.links.map((link, index) => (
            <div key={link.clientKey} className="flex flex-wrap items-center gap-2">
              <input
                aria-label={t("project_overview.link_title")}
                className={`${inputClass} min-w-0 flex-1`}
                required
                maxLength={255}
                value={link.title}
                onChange={(event) =>
                  setData({
                    ...data,
                    links: data.links.map((current, i) =>
                      i === index ? { ...current, title: event.target.value } : current
                    ),
                  })
                }
              />
              <input
                aria-label={t("project_overview.link_url")}
                type="url"
                pattern="https?://.*"
                required
                maxLength={2048}
                className={`${inputClass} min-w-0 flex-1`}
                value={link.url}
                onChange={(event) =>
                  setData({
                    ...data,
                    links: data.links.map((current, i) =>
                      i === index ? { ...current, url: event.target.value } : current
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                stretch="auto"
                label={t("project_overview.remove_link")}
                onClick={() => setData({ ...data, links: data.links.filter((_, i) => i !== index) })}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            stretch="auto"
            label={t("project_overview.add_link")}
            disabled={data.links.length >= 20}
            onClick={() =>
              setData({ ...data, links: [...data.links, { title: "", url: "", clientKey: crypto.randomUUID() }] })
            }
          />
        </div>
      </fieldset>
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
          disabled={saving}
          loading={saving}
          label={t("save")}
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
