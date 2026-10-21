import { API_BASE_URL } from "@plane/constants";
import { APIService } from "./api.service";

export const PROJECT_HEALTH_STATUSES = ["on_track", "at_risk", "off_track", "on_hold", "complete"] as const;
export type ProjectHealthStatus = (typeof PROJECT_HEALTH_STATUSES)[number];
export type ProjectOverviewDetails = {
  start_date: string | null;
  target_date: string | null;
  links: { title: string; url: string }[];
  revision: number;
};
export type ProjectStatusUpdate = {
  id: string;
  status: ProjectHealthStatus;
  title: string;
  summary: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
  client_request_id: string;
};
export type ProjectOverviewData = {
  project: { id: string; name: string; description: string };
  details: ProjectOverviewDetails;
  members: { user_id: string; name: string; role: number }[];
  task_counts: { total: number; completed: number; overdue: number };
  latest_update: ProjectStatusUpdate | null;
  can_edit: boolean;
};
export type ProjectStatusHistory = {
  results: ProjectStatusUpdate[];
  count: number;
  next_page: number | null;
};
export type ProjectStatusInput = Pick<ProjectStatusUpdate, "status" | "title" | "summary" | "client_request_id">;

export class ProjectOverviewService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  private path(slug: string, projectId: string) {
    return `/api/workspaces/${encodeURIComponent(slug)}/projects/${projectId}`;
  }
  async load(slug: string, projectId: string): Promise<ProjectOverviewData> {
    return this.get(`${this.path(slug, projectId)}/overview/`).then((response) => response.data);
  }
  async saveDetails(slug: string, projectId: string, data: ProjectOverviewDetails): Promise<ProjectOverviewDetails> {
    return this.put(`${this.path(slug, projectId)}/overview/`, data).then((response) => response.data);
  }
  async history(slug: string, projectId: string, page: number): Promise<ProjectStatusHistory> {
    return this.get(`${this.path(slug, projectId)}/status-updates/`, { params: { page } }).then(
      (response) => response.data
    );
  }
  async publish(slug: string, projectId: string, data: ProjectStatusInput): Promise<ProjectStatusUpdate> {
    return this.post(`${this.path(slug, projectId)}/status-updates/`, data).then((response) => response.data);
  }
}
