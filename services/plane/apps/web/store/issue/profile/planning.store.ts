import { computed, makeObservable, observable, runInAction } from "mobx";
import { MyTaskPlanningService } from "@/services/my-task-planning.service";
import type { TPlanningBucket, TPlanningPlacement } from "@/services/my-task-planning.service";
import type { IIssueRootStore } from "../root.store";

export class MyTaskPlanningStore {
  placements: Record<string, TPlanningPlacement> = {};
  isLoading = false;
  savingIds: Record<string, boolean> = {};
  error = false;
  nextCursor: string | null = null;
  private pagesLoaded = 1;
  private version = 0;
  private service = new MyTaskPlanningService();

  constructor(
    private root: IIssueRootStore,
    readonly slug: string,
    readonly userId: string,
    readonly includeCompleted = false
  ) {
    makeObservable(this, {
      placements: observable,
      isLoading: observable,
      savingIds: observable,
      error: observable,
      nextCursor: observable,
      groups: computed,
    });
  }

  get groups() {
    const groups: Record<TPlanningBucket, string[]> = { recently_assigned: [], today: [], upcoming: [], later: [] };
    for (const placement of Object.values(this.placements)) {
      const issue = this.root.issues.getIssueById(placement.issue_id);
      if (!issue || issue.archived_at || !issue.assignee_ids?.includes(this.userId)) continue;
      if (
        !this.includeCompleted &&
        (issue.completed_at ||
          ["completed", "cancelled"].includes(this.root.stateMap?.[issue.state_id ?? ""]?.group ?? ""))
      )
        continue;
      groups[placement.bucket].push(issue.id);
    }
    for (const ids of Object.values(groups))
      ids.sort((a, b) => this.placements[a].sort_order - this.placements[b].sort_order || a.localeCompare(b));
    return groups;
  }

  async load(more = false) {
    if (this.isLoading || (more && !this.nextCursor)) return;
    const version = this.version;
    runInAction(() => {
      this.isLoading = true;
    });
    try {
      const placements: Record<string, TPlanningPlacement> = more ? { ...this.placements } : {};
      let cursor = more ? (this.nextCursor ?? undefined) : undefined;
      let nextCursor: string | null = null;
      const pageCount = more ? 1 : this.pagesLoaded;
      for (let page = 0; page < pageCount; page++) {
        const result = await this.service.list(this.slug, this.includeCompleted, cursor);
        for (const row of result.results) {
          const current = this.root.issues.getIssueById(row.issue.id);
          if (
            !current?.updated_at ||
            !row.issue.updated_at ||
            new Date(current.updated_at) <= new Date(row.issue.updated_at)
          ) {
            this.root.issues.addIssue([row.issue]);
          }
          placements[row.issue.id] = { issue_id: row.issue.id, bucket: row.bucket, sort_order: row.sort_order };
        }
        nextCursor = result.next_cursor;
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      if (version !== this.version) return;
      if (more) this.pagesLoaded++;
      runInAction(() => {
        this.placements = placements;
        this.nextCursor = nextCursor;
        this.error = false;
      });
    } catch {
      runInAction(() => {
        this.error = true;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async move(issueId: string, bucket: TPlanningBucket, beforeId?: string) {
    if (this.savingIds[issueId] || !this.placements[issueId]) return;
    const targetIds = this.groups[bucket].filter((id) => id !== issueId);
    const index = beforeId ? targetIds.indexOf(beforeId) : targetIds.length;
    if (index < 0) return;
    const before = index > 0 ? this.placements[targetIds[index - 1]].sort_order : undefined;
    const after = index < targetIds.length ? this.placements[targetIds[index]].sort_order : undefined;
    const sortOrder =
      before === undefined ? (after ?? 0) - 1000 : after === undefined ? before + 1000 : (before + after) / 2;
    this.version++;
    runInAction(() => {
      this.savingIds[issueId] = true;
    });
    try {
      const saved = await this.service.move(this.slug, issueId, bucket, sortOrder);
      runInAction(() => {
        this.placements[issueId] = saved;
      });
    } finally {
      this.version++;
      runInAction(() => {
        this.savingIds[issueId] = false;
      });
    }
  }
}
