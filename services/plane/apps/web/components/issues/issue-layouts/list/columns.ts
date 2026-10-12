import type { IIssueDisplayProperties } from "@plane/types";

export type ListColumn = { key: keyof IIssueDisplayProperties; label: string; width: number };

const COLUMNS: ListColumn[] = [
  { key: "assignee", label: "common.assignees", width: 120 },
  { key: "due_date", label: "common.order_by.due_date", width: 150 },
  { key: "priority", label: "common.priority", width: 112 },
  { key: "estimate", label: "common.estimate", width: 110 },
  { key: "labels", label: "common.labels", width: 150 },
  { key: "state", label: "common.state", width: 150 },
  { key: "start_date", label: "common.order_by.start_date", width: 150 },
  { key: "modules", label: "common.modules", width: 140 },
  { key: "cycle", label: "common.cycles", width: 130 },
  { key: "sub_issue_count", label: "common.sub_work_items", width: 100 },
  { key: "attachment_count", label: "common.attachments", width: 100 },
  { key: "link", label: "common.links", width: 100 },
];

export function getListColumns(
  properties: IIssueDisplayProperties | undefined,
  capabilities: { modules: boolean; cycle: boolean; estimate: boolean; isEpic: boolean },
): ListColumn[] {
  return COLUMNS.filter(({ key }) => {
    if (!properties?.[key]) return false;
    if (key === "modules" || key === "cycle") return !capabilities.isEpic && capabilities[key];
    if (key === "sub_issue_count") return !capabilities.isEpic;
    if (key === "estimate") return capabilities.estimate;
    return true;
  });
}
