import type { IState, TIssue, TIssueSubIssues, TStateGroups } from "@plane/types";

/** Resolve the shortcut through the project's own states, without inventing a status. */
export function getCompletionTarget(states: IState[], currentStateId: string | null | undefined): IState | undefined {
  const isCompleted = states.find((state) => state.id === currentStateId)?.group === "completed";
  // Keep compatibility with the web app's current ECMAScript target.
  // oxlint-disable-next-line unicorn/no-array-sort
  const ordered = [...states].sort((a, b) => a.order - b.order || a.sequence - b.sequence || a.id.localeCompare(b.id));
  if (!isCompleted)
    return (
      ordered.find((state) => state.group === "completed" && state.default) ??
      ordered.find((state) => state.group === "completed")
    );

  const openStates = ordered.filter((state) => state.group !== "completed" && state.group !== "cancelled");
  return (
    openStates.find((state) => state.default) ??
    openStates.find((state) => state.group === "unstarted") ??
    openStates.find((state) => state.group === "backlog") ??
    openStates[0]
  );
}

type Descendant = Pick<TIssue, "id" | "project_id" | "state_id" | "sub_issues_count">;
type SubIssueResponse = Pick<TIssueSubIssues, "state_distribution"> & {
  sub_issues: Descendant[] | Record<string, Descendant[]>;
};

/** Read the live tree, including collapsed grandchildren, and count every unresolved item once. */
export async function countUnfinishedDescendants(
  projectId: string,
  issueId: string,
  fetchChildren: (projectId: string, parentId: string) => Promise<SubIssueResponse>,
  getStateGroup: (stateId: string | null | undefined) => TStateGroups | undefined
): Promise<number> {
  const seen = new Set([issueId]);
  const pending = [{ projectId, issueId }];
  let unfinished = 0;

  while (pending.length > 0) {
    const parent = pending.shift()!;
    // Traverse sequentially to avoid flooding the API for deeply nested task trees.
    // oxlint-disable-next-line no-await-in-loop
    const response = await fetchChildren(parent.projectId, parent.issueId);
    const children = Array.isArray(response.sub_issues)
      ? response.sub_issues
      : Object.values(response.sub_issues).flat();
    const groups = new Map<string, TStateGroups>();
    for (const [group, ids] of Object.entries(response.state_distribution ?? {})) {
      for (const id of ids) groups.set(id, group as TStateGroups);
    }
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const group = groups.get(child.id) ?? getStateGroup(child.state_id);
      if (group !== "completed" && group !== "cancelled") unfinished += 1;
      if (child.sub_issues_count) pending.push({ projectId: child.project_id ?? parent.projectId, issueId: child.id });
    }
  }

  return unfinished;
}
