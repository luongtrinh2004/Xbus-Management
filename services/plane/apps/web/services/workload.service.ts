import { API_BASE_URL } from "@plane/constants";
import { APIService } from "./api.service";

export type WorkloadMember = {
  user_id: string;
  name: string;
  weekly_limit: number;
  counts: number[];
  unscheduled: number;
};
export type WorkloadData = {
  weeks: string[];
  members: WorkloadMember[];
  can_edit_capacity: boolean;
};

export class WorkloadService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  async load(slug: string, start?: string): Promise<WorkloadData> {
    return this.get(`/api/workspaces/${slug}/workload/`, { params: { start, weeks: 4 } }).then(
      (response) => response.data,
    );
  }
  async setCapacity(slug: string, userId: string, weeklyLimit: number): Promise<void> {
    await this.put(`/api/workspaces/${slug}/workload/capacities/${userId}/`, {
      weekly_limit: weeklyLimit,
    });
  }
}
