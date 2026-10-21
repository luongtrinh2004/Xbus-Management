import type { TIssue } from "@plane/types";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type LocalIssueDraft = { version: 1; data: Partial<TIssue>; savedAt: string };
const stringFields = [
  "project_id",
  "type_id",
  "name",
  "description_html",
  "state_id",
  "parent_id",
  "priority",
  "cycle_id",
  "start_date",
  "target_date",
  "estimate_point",
] as const;
const arrayFields = ["assignee_ids", "label_ids", "module_ids"] as const;

// A subtask draft must never appear for an unrelated task or another account.
export const localIssueDraftKey = (userId: string, workspace: string, project: string, parent = "") =>
  `plane:issue-draft:v1:${[userId, workspace, project, parent].map(encodeURIComponent).join(":")}`;

export const readLocalIssueDraft = (storage: DraftStorage | undefined, key: string): LocalIssueDraft | null => {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalIssueDraft;
    if (
      draft.version !== 1 ||
      !draft.data ||
      typeof draft.data !== "object" ||
      typeof draft.data.project_id !== "string" ||
      (draft.data.name !== undefined && typeof draft.data.name !== "string") ||
      typeof draft.savedAt !== "string"
    )
      return null;
    const values: Record<string, unknown> = {};
    for (const field of stringFields) {
      const value = draft.data[field];
      if (value !== null && value !== undefined && typeof value !== "string") return null;
      if (value !== undefined) values[field] = value;
    }
    for (const field of arrayFields) {
      const value = draft.data[field];
      if (
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.some((id) => typeof id !== "string"))
      )
        return null;
      if (value !== undefined) values[field] = value;
    }
    const customValues = draft.data.custom_field_values;
    if (customValues !== undefined) {
      if (!customValues || typeof customValues !== "object" || Array.isArray(customValues)) return null;
      if (
        Object.values(customValues).some(
          (value) =>
            value !== null &&
            typeof value !== "string" &&
            !(typeof value === "number" && Number.isFinite(value)) &&
            !(Array.isArray(value) && value.every((id) => typeof id === "string"))
        )
      )
        return null;
      values.custom_field_values = customValues;
    }
    return { ...draft, data: values as Partial<TIssue> };
  } catch {
    return null;
  }
};

export const saveLocalIssueDraft = (storage: DraftStorage | undefined, key: string, data: Partial<TIssue>): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ version: 1, data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
};

export const removeLocalIssueDraft = (storage: DraftStorage | undefined, key: string): void => {
  try {
    storage?.removeItem(key);
  } catch {
    // Form state remains available in memory if the browser disables storage.
  }
};

export const getDraftStorage = (): DraftStorage | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};
