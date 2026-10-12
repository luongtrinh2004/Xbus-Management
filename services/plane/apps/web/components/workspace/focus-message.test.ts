import assert from "node:assert/strict";
import test from "node:test";
import { getFocusCommand } from "./focus-message";

test("focus commands only accept the embedding parent and preserve an explicit exit", () => {
  const parent = {};
  const event = {
    source: parent,
    origin: "http://localhost:3000",
    data: { type: "xbus-work-focus", enabled: true },
  };
  assert.equal(getFocusCommand(event, parent, null), true);
  assert.equal(
    getFocusCommand(
      { ...event, data: { type: "xbus-work-focus", enabled: false } },
      parent,
      event.origin,
    ),
    false,
  );
  assert.equal(getFocusCommand({ ...event, source: {} }, parent, null), undefined);
  assert.equal(
    getFocusCommand({ ...event, origin: "https://other.example" }, parent, event.origin),
    undefined,
  );
  assert.equal(getFocusCommand({ ...event, origin: "null" }, parent, null), undefined);
  assert.equal(
    getFocusCommand({ ...event, data: { type: "xbus-work-focus", enabled: "true" } }, parent, null),
    undefined,
  );
  assert.equal(getFocusCommand({ ...event, data: null }, parent, null), undefined);
});
