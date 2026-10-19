/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import type { CustomField, CustomFieldType, CustomFieldValue } from "@/types/custom-fields";

export function parseCustomFieldInput(type: CustomFieldType, raw: string): CustomFieldValue {
  if (!raw) return null;
  if (type === "number") {
    const number = Number(raw);
    if (!Number.isFinite(number)) throw new Error("Invalid number");
    return number;
  }
  if (type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("Invalid date");
  return raw;
}

export function formatCustomFieldValue(
  field: CustomField,
  value: CustomFieldValue,
  locale: string,
  personName: (id: string) => string
): string {
  if (value == null) return "";
  const optionName = (id: string) => field.options.find((option) => option.id === id)?.name ?? id;
  if (field.field_type === "people" && Array.isArray(value)) return value.map(personName).join(", ");
  if (field.field_type === "multi_select" && Array.isArray(value)) return value.map(optionName).join(", ");
  if (field.field_type === "single_select" && typeof value === "string") return optionName(value);
  if (field.field_type === "number" && typeof value === "number") {
    if (field.number_format === "currency")
      return new Intl.NumberFormat(locale, { style: "currency", currency: "VND" }).format(value);
    return new Intl.NumberFormat(locale).format(value) + (field.number_format === "percent" ? "%" : "");
  }
  // Date-only values stay date-only; never convert them through the host timezone.
  if (field.field_type === "date" && typeof value === "string") {
    const [year, month, day] = value.split("-");
    return locale.toLowerCase().startsWith("vi") ? `${day}/${month}/${year}` : value;
  }
  return String(value);
}
