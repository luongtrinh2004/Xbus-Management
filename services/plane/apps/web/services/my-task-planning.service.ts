import { API_BASE_URL } from "@plane/constants";
import type { TIssue } from "@plane/types";
import { APIService } from "./api.service";

export const PLANNING_BUCKETS = ["recently_assigned", "today", "upcoming", "later"] as const;
export type TPlanningBucket = (typeof PLANNING_BUCKETS)[number];
export type TPlanningRow = { issue: TIssue; bucket: TPlanningBucket; sort_order: number };
export type TPlanningPlacement = { issue_id: string; bucket: TPlanningBucket; sort_order: number };
export type TPlanningPage = { results: TPlanningRow[]; next_cursor: string | null };

export class MyTaskPlanningService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  async list(slug: string, includeCompleted: boolean, cursor?: string): Promise<TPlanningPage> {
    return (
      await this.get(`/api/workspaces/${slug}/my-tasks/planning/`, {
        params: { include_completed: includeCompleted, cursor },
      })
    ).data;
  }
  async move(slug: string, issueId: string, bucket: TPlanningBucket, sortOrder: number): Promise<TPlanningPlacement> {
    return (
      await this.patch(`/api/workspaces/${slug}/my-tasks/planning/${issueId}/`, { bucket, sort_order: sortOrder })
    ).data;
  }
}
