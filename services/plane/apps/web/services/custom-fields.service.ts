/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { API_BASE_URL } from "@plane/constants";
import { APIService } from "./api.service";
import type { CustomField, CustomFieldValues } from "@/types/custom-fields";

export class CustomFieldsService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  private projectPath(slug: string, projectId: string) {
    return `/api/workspaces/${slug}/projects/${projectId}`;
  }
  async fields(slug: string, projectId: string): Promise<CustomField[]> {
    return (await this.get(`${this.projectPath(slug, projectId)}/custom-fields/`)).data;
  }
  async saveField(slug: string, projectId: string, data: Partial<CustomField>, id?: string): Promise<CustomField> {
    const path = `${this.projectPath(slug, projectId)}/custom-fields/`;
    return (id ? await this.patch(`${path}${id}/`, data) : await this.post(path, data)).data;
  }
  async values(slug: string, projectId: string, ids: string[]): Promise<Record<string, CustomFieldValues>> {
    return (
      await this.get(`${this.projectPath(slug, projectId)}/custom-field-values/`, { params: { issues: ids.join(",") } })
    ).data;
  }
  async saveValues(
    slug: string,
    projectId: string,
    issueId: string,
    values: CustomFieldValues
  ): Promise<CustomFieldValues> {
    return (await this.put(`${this.projectPath(slug, projectId)}/issues/${issueId}/custom-field-values/`, { values }))
      .data;
  }
}
