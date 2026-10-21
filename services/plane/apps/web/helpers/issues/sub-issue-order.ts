import type { TIssue } from "@plane/types";

type OrderedIssue = Pick<TIssue, "id" | "sort_order" | "parent_id" | "project_id">;

export function sortSubIssueIds(ids: string[], issues: Record<string, OrderedIssue | undefined>) {
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...ids].sort((a, b) => (issues[a]?.sort_order ?? 0) - (issues[b]?.sort_order ?? 0));
}

/** Only reorders siblings: dragging must never silently change a parent or project. */
export function getSubIssueOrder(
  ids: string[],
  issues: Record<string, OrderedIssue | undefined>,
  sourceId: string,
  targetId: string,
  side: "before" | "after",
): number | undefined {
  const source = issues[sourceId];
  const target = issues[targetId];
  if (
    !source ||
    !target ||
    sourceId === targetId ||
    !source.parent_id ||
    source.parent_id !== target.parent_id ||
    source.project_id !== target.project_id ||
    !ids.includes(sourceId) ||
    !ids.includes(targetId)
  )
    return;
  const remaining = sortSubIssueIds(
    ids.filter((id) => id !== sourceId),
    issues,
  );
  const index = remaining.indexOf(targetId) + (side === "after" ? 1 : 0);
  const previous = index > 0 ? issues[remaining[index - 1]]?.sort_order : undefined;
  const next = index < remaining.length ? issues[remaining[index]]?.sort_order : undefined;
  const order =
    previous === undefined
      ? (next ?? 0) - 10000
      : next === undefined
        ? previous + 10000
        : previous + (next - previous) / 2;
  // Do not persist an ambiguous order when old ranks have collided.
  if (!Number.isFinite(order) || order === previous || order === next) return;
  return order;
}
