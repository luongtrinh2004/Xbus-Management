/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
export type CustomFieldType = "text" | "number" | "date" | "single_select" | "multi_select" | "people";
export type CustomFieldOption = { id: string; name: string; color: string; is_active: boolean };
export type CustomField = {
  id: string;
  project: string;
  name: string;
  field_type: CustomFieldType;
  options: CustomFieldOption[];
  number_format: "number" | "percent" | "currency";
  sort_order: number;
  is_active: boolean;
};
export type CustomFieldValue = string | number | string[] | null;
export type CustomFieldValues = Record<string, CustomFieldValue>;
