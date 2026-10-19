/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { useCustomFields } from "@/hooks/store/use-custom-fields";
import { IssueActivityBlockComponent } from "../issue-detail/issue-activity/activity/actions/helpers/activity-block";
import type { CustomFieldValue } from "@/types/custom-fields";
import { formatCustomFieldValue } from "./helpers";

function payload(raw?: string): { name: string; value: CustomFieldValue } {
  try {
    const parsed = JSON.parse(raw ?? "null");
    if (parsed && typeof parsed.name === "string") return parsed;
  } catch {
    /* Old activities may have a different representation. */
  }
  return { name: "", value: null };
}
export const IssueCustomFieldActivity = observer(function IssueCustomFieldActivity({
  activityId,
  ends,
}: {
  activityId: string;
  ends: "top" | "bottom" | undefined;
}) {
  const {
    activity: { getActivityById },
  } = useIssueDetail();
  const store = useCustomFields();
  const { getUserDetails } = useMember();
  const { t, currentLocale } = useTranslation();
  const activity = getActivityById(activityId);
  if (!activity) return null;
  const before = payload(activity.old_value),
    after = payload(activity.new_value);
  const field = store.fields(activity.project).find((item) => item.id === activity.new_identifier);
  const format = (value: CustomFieldValue) =>
    value == null
      ? t("custom_fields.empty")
      : field
        ? formatCustomFieldValue(field, value, currentLocale, (id) => getUserDetails(id)?.display_name ?? id)
        : Array.isArray(value)
          ? value.join(", ")
          : String(value);
  return (
    <IssueActivityBlockComponent activityId={activityId} ends={ends}>
      {t("custom_fields.changed", { name: after.name || before.name })} {t("custom_fields.from")}{" "}
      <span className="font-medium">{format(before.value)}</span> {t("custom_fields.to")}{" "}
      <span className="font-medium">{format(after.value)}</span>
    </IssueActivityBlockComponent>
  );
});
