import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useTranslation } from "@plane/i18n";
import { Button } from "@makeplane/propel/components/button";
import { setToast } from "@plane/blocks/toast";
import { cn } from "@plane/utils";
import { WorkloadService, type WorkloadMember } from "@/services/workload.service";
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { moveWorkloadWeek, workloadLevel } from "./helpers";

const service = new WorkloadService();

function Capacity({
  member,
  save,
}: {
  member: WorkloadMember;
  save: (limit: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(member.weekly_limit));
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await save(Number(value));
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        aria-label={t("workspace_workload.capacity_for", { name: member.name })}
        type="number"
        min={1}
        max={1000}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={saving}
        className="h-7 w-16 rounded-sm border border-strong bg-surface-1 px-2 text-13"
      />
      {Number(value) !== member.weekly_limit && (
        <Button
          stretch="auto"
          type="submit"
          size="sm"
          variant="secondary"
          disabled={saving}
          label={t("common.save")}
        />
      )}
    </form>
  );
}

export function WorkspaceWorkload() {
  const { workspaceSlug } = useParams();
  const slug = workspaceSlug?.toString();
  const { t } = useTranslation();
  const [start, setStart] = useState<string>();
  const { data, error, isLoading, mutate } = useSWR(
    slug ? ["workspace-workload", slug, start] : null,
    () => service.load(slug!, start),
    { refreshInterval: 30000, revalidateOnFocus: true },
  );
  if (error?.response?.status === 403 || error?.response?.status === 404) return null;
  return (
    <AnalyticsSectionWrapper
      title={t("workspace_workload.title")}
      headerClassName="flex-wrap"
      actions={
        data && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              stretch="auto"
              variant="secondary"
              size="sm"
              label={t("workspace_workload.previous")}
              onClick={() => setStart(moveWorkloadWeek(data.weeks[0], -4))}
            />
            <Button
              stretch="auto"
              variant="secondary"
              size="sm"
              label={t("workspace_workload.current")}
              onClick={() => setStart(undefined)}
            />
            <Button
              stretch="auto"
              variant="secondary"
              size="sm"
              label={t("workspace_workload.next")}
              onClick={() => setStart(moveWorkloadWeek(data.weeks[0], 4))}
            />
          </div>
        )
      }
    >
      <p className="mb-3 text-13 text-tertiary">{t("workspace_workload.description")}</p>
      {isLoading && <p className="text-13 text-tertiary">{t("common.loading")}</p>}
      {error && (
        <Button
          stretch="auto"
          variant="secondary"
          size="sm"
          label={t("workspace_workload.retry")}
          onClick={() => void mutate()}
        />
      )}
      {data && (
        <div className="overflow-x-auto rounded-md border border-subtle">
          <table className="w-full min-w-[760px] text-left text-13">
            <thead className="bg-layer-1 text-tertiary">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  {t("workspace_workload.person")}
                </th>
                <th scope="col" className="p-3 font-medium">
                  {t("workspace_workload.capacity")}
                </th>
                {data.weeks.map((week) => (
                  <th scope="col" key={week} className="p-3 font-medium">
                    {week}
                  </th>
                ))}
                <th scope="col" className="p-3 font-medium">
                  {t("workspace_workload.unscheduled")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.user_id} className="border-t border-subtle">
                  <th scope="row" className="p-3 font-medium text-primary">
                    {member.name}
                  </th>
                  <td className="p-3">
                    {data.can_edit_capacity ? (
                      <Capacity
                        key={`${member.user_id}-${member.weekly_limit}`}
                        member={member}
                        save={async (limit) => {
                          try {
                            await service.setCapacity(slug!, member.user_id, limit);
                            await mutate();
                          } catch {
                            setToast({
                              type: "error",
                              title: t("toast.error"),
                              message: t("workspace_workload.save_failed"),
                            });
                          }
                        }}
                      />
                    ) : (
                      member.weekly_limit
                    )}
                  </td>
                  {data.weeks.map((week, i) => {
                    const count = member.counts[i] ?? 0;
                    const level = workloadLevel(count, member.weekly_limit);
                    return (
                      <td key={week} className="p-3">
                        <div
                          className={cn(
                            "mb-1 font-medium",
                            level.overloaded ? "text-danger-primary" : "text-primary",
                          )}
                        >
                          {count}
                          {level.overloaded && (
                            <span className="ml-1 text-11">
                              {t("workspace_workload.overloaded")}
                            </span>
                          )}
                        </div>
                        <div className="h-1 rounded-full bg-layer-1">
                          <div
                            className={cn(
                              "h-1 rounded-full",
                              level.overloaded ? "bg-danger-primary" : "bg-accent-primary",
                            )}
                            style={{ width: `${level.percent}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3 text-tertiary">{member.unscheduled}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.members.length === 0 && (
            <p className="p-3 text-13 text-tertiary">{t("workspace_workload.empty")}</p>
          )}
        </div>
      )}
    </AnalyticsSectionWrapper>
  );
}
