import assert from "node:assert/strict";
import test from "node:test";
import type { CustomField } from "@/types/custom-fields";
import { formatCustomFieldValue, parseCustomFieldInput } from "./helpers";
const field = {
  field_type: "text",
  number_format: "number",
  options: [{ id: "a", name: "Passed", color: "#000000", is_active: false }],
} as CustomField;

test("numeric zero is preserved; clearing differs from entering zero", () => {
  assert.equal(parseCustomFieldInput("number", "0"), 0);
  assert.equal(parseCustomFieldInput("number", ""), null);
  assert.throws(() => parseCustomFieldInput("number", "Infinity"));
  assert.throws(() => parseCustomFieldInput("number", "not a number"));
});
test("date-only values preserve the calendar day", () => {
  assert.equal(parseCustomFieldInput("date", "2026-10-19"), "2026-10-19");
  assert.equal(formatCustomFieldValue({ ...field, field_type: "date" }, "2026-10-19", "vi-VN", String), "19/10/2026");
  assert.equal(formatCustomFieldValue({ ...field, field_type: "date" }, "2026-10-19", "en", String), "2026-10-19");
});
test("archived option values remain readable", () => {
  assert.equal(formatCustomFieldValue({ ...field, field_type: "single_select" }, "a", "en", String), "Passed");
  assert.equal(formatCustomFieldValue({ ...field, field_type: "multi_select" }, ["a"], "en", String), "Passed");
});
test("people display names without changing stored ids", () => {
  const value = ["user1", "user2"];
  assert.equal(
    formatCustomFieldValue({ ...field, field_type: "people" }, value, "en", (id) => (id === "user1" ? "Alice" : "Bob")),
    "Alice, Bob"
  );
  assert.deepEqual(value, ["user1", "user2"]);
});
test("numeric display respects format and null values", () => {
  assert.equal(
    formatCustomFieldValue({ ...field, field_type: "number", number_format: "percent" }, 0, "en", String),
    "0%"
  );
  assert.equal(formatCustomFieldValue(field, null, "en", String), "");
});
