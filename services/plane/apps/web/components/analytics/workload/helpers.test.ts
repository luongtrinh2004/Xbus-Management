import assert from "node:assert/strict";
import test from "node:test";
import { moveWorkloadWeek, workloadLevel } from "./helpers";

test("workload week navigation handles month/year and leap boundaries", () => {
  assert.equal(moveWorkloadWeek("2026-12-28", 1), "2027-01-04");
  assert.equal(moveWorkloadWeek("2024-02-26", 1), "2024-03-04");
  assert.equal(moveWorkloadWeek("2026-10-19", -1), "2026-10-12");
});
test("only counts above capacity are overloaded and bars remain bounded", () => {
  assert.deepEqual(workloadLevel(20, 20), { overloaded: false, percent: 100 });
  assert.deepEqual(workloadLevel(21, 20), { overloaded: true, percent: 100 });
  assert.deepEqual(workloadLevel(0, 20), { overloaded: false, percent: 0 });
});
