import type { TIssueMap } from "@plane/types";

export function getRootListIssueIds(issueIds: string[], issuesMap: TIssueMap): string[] {
  const visibleIds = new Set(issueIds);
  return issueIds.filter((id) => {
    const parentId = issuesMap[id]?.parent_id;
    // Keep standalone search/filter results when their parent is not loaded.
    return !parentId || !visibleIds.has(parentId) || !issuesMap[parentId]?.created_at;
  });
}
