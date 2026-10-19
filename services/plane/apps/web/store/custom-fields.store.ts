/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { makeAutoObservable, runInAction } from "mobx";
import { sortBy } from "lodash-es";
import { CustomFieldsService } from "@/services/custom-fields.service";
import type { CustomField, CustomFieldValue, CustomFieldValues } from "@/types/custom-fields";

export class CustomFieldsStore {
  fieldsByProject: Record<string, CustomField[]> = {};
  valuesByIssue: Record<string, CustomFieldValues> = {};
  loadedIssues: Record<string, boolean> = {};
  private service = new CustomFieldsService();
  private requests = new Map<string, Promise<void>>();
  private writes = new Map<string, Promise<void>>();
  private versions = new Map<string, number>();
  constructor() {
    makeAutoObservable<CustomFieldsStore, "service" | "requests" | "writes" | "versions">(
      this,
      { service: false, requests: false, writes: false, versions: false },
      { autoBind: true }
    );
  }
  fields(projectId: string) {
    return this.fieldsByProject[projectId] ?? [];
  }
  async loadFields(slug: string, projectId: string) {
    const key = `fields:${projectId}`;
    if (this.requests.has(key)) return this.requests.get(key);
    const request = this.service
      .fields(slug, projectId)
      .then((fields) => {
        runInAction(() => {
          this.fieldsByProject[projectId] = fields;
        });
        return undefined;
      })
      .finally(() => {
        this.requests.delete(key);
      });
    this.requests.set(key, request);
    return request;
  }
  async loadValues(slug: string, projectId: string, ids: string[], force = false) {
    const needed = sortBy([...new Set(ids)].filter((id) => force || !this.loadedIssues[id]));
    if (!needed.length) return;
    const key = `values:${projectId}:${needed.join(",")}`;
    if (this.requests.has(key)) return this.requests.get(key);
    const request = (async () => {
      for (let i = 0; i < needed.length; i += 100) {
        const chunk = needed.slice(i, i + 100).filter((id) => !this.writes.has(id));
        if (!chunk.length) continue;
        const versions = new Map(chunk.map((id) => [id, this.versions.get(id) ?? 0]));
        // Keep large lists from flooding the API with concurrent requests.
        // oxlint-disable-next-line no-await-in-loop
        const values = await this.service.values(slug, projectId, chunk);
        runInAction(() => {
          for (const id of chunk) {
            if (versions.get(id) !== (this.versions.get(id) ?? 0)) continue;
            this.valuesByIssue[id] = values[id] ?? {};
            this.loadedIssues[id] = true;
          }
        });
      }
    })().finally(() => {
      this.requests.delete(key);
    });
    this.requests.set(key, request);
    return request;
  }
  async saveField(slug: string, projectId: string, data: Partial<CustomField>, id?: string) {
    const field = await this.service.saveField(slug, projectId, data, id);
    runInAction(() => {
      this.fieldsByProject[projectId] = sortBy(
        [...this.fields(projectId).filter((item) => item.id !== field.id), field],
        ["sort_order", "name"]
      );
    });
    return field;
  }
  async saveValue(slug: string, projectId: string, issueId: string, fieldId: string, value: CustomFieldValue) {
    // Serialize edits to one work item so two cells cannot apply stale full
    // responses in reverse order. Reads started before an edit are discarded.
    const previous = this.writes.get(issueId) ?? Promise.resolve();
    const write = previous
      .catch(() => undefined)
      .then(async () => {
        this.versions.set(issueId, (this.versions.get(issueId) ?? 0) + 1);
        const values = await this.service.saveValues(slug, projectId, issueId, { [fieldId]: value });
        runInAction(() => {
          this.valuesByIssue[issueId] = values;
          this.loadedIssues[issueId] = true;
        });
        return undefined;
      });
    this.writes.set(issueId, write);
    try {
      await write;
    } finally {
      if (this.writes.get(issueId) === write) this.writes.delete(issueId);
    }
  }
}
