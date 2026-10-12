import assert from "node:assert/strict";
import test from "node:test";
import { getStateChangeError } from "./change-error";

test("state changes display the workflow or review rejection from the API", () => {
  const message = "Công việc phải được duyệt qua mục Nghiệm thu trước khi hoàn thành.";
  assert.equal(getStateChangeError({ error: message }, "Error"), message);
  assert.equal(getStateChangeError({ detail: "Transition denied" }, "Error"), "Transition denied");
  assert.equal(getStateChangeError(new Error("Network error"), "Error"), "Network error");
  assert.equal(getStateChangeError({ error: { state_id: "invalid" } }, "Error"), "Error");
  assert.equal(getStateChangeError(undefined, "Error"), "Error");
});
