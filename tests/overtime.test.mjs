import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  emptyOvertimeState,
  mutateOvertime,
  normalizeOtRequest,
  validateOtSchedule,
  allocateOtDays,
  overtimeView,
  parseOtFilters,
  normalizeOtConfig,
} from "../src/libs/overtime.js";
import {
  mutateOvertimeJson,
  readOvertimeJson,
} from "../src/libs/overtimeJsonStorage.js";
const users = [
  { id: "u1", role: "user", name: "An", status: "able" },
  { id: "u2", role: "user", name: "Bình", status: "able" },
  { id: "admin", role: "admin", name: "Admin", status: "able" },
  { id: "assistant", name: "Trợ lý", role: "assistant", status: "able" },
];
const [user, other, admin, assistant] = users;
const now = new Date("2026-10-08T05:00:00Z");
const input = {
  action: "create",
  date: "2026-10-09",
  start: "18:00",
  end: "20:00",
  reason: "Hoàn thành API",
};
const act = (state, actor, body, time = now) =>
  mutateOvertime(state, actor, body, users, time);
const action = (record, type, extras = {}) => ({
  ...extras,
  action: type,
  id: record.id,
  version: record.version,
});

test("full lifecycle records actor, history, actual and confirmed minutes separately", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, input);
  assert.equal(record.status, "PENDING");
  assert.equal(record.registeredMinutes, 120);
  act(state, admin, action(record, "approve"));
  assert.equal(record.approvedBy, admin.id);
  act(
    state,
    user,
    action(record, "report", {
      actualMinutes: 100,
      workReport: "Đã hoàn thành",
      note: "Xong sớm",
    }),
    new Date("2026-10-10T05:00:00Z"),
  );
  assert.equal(record.status, "WAITING_CONFIRMATION");
  act(
    state,
    admin,
    action(record, "return", { note: "Bổ sung kết quả kiểm thử" }),
  );
  assert.equal(record.status, "APPROVED");
  act(
    state,
    user,
    action(record, "report", {
      actualMinutes: 90,
      workReport: "Đã hoàn thành và kiểm thử",
    }),
    new Date("2026-10-10T05:00:00Z"),
  );
  act(
    state,
    admin,
    action(record, "confirm", {
      confirmedMinutes: 80,
      note: "Trừ thời gian nghỉ bổ sung",
    }),
  );
  assert.equal(record.status, "COMPLETED");
  assert.equal(record.registeredMinutes, 120);
  assert.equal(record.actualMinutes, 90);
  assert.equal(record.confirmedMinutes, 80);
  assert.equal(record.confirmedBy, admin.id);
  assert.equal(state.history.length, 6);
  for (const type of ["edit", "cancel", "report", "approve"])
    assert.throws(() => act(state, user, action(record, type, input)));
  const summary = overtimeView(
    state,
    user,
    users,
    parseOtFilters(new URLSearchParams({ year: "2026", month: "10" })),
  ).summary;
  assert.equal(summary.confirmedMinutes, 80);
  assert.equal(summary.COMPLETED, 1);
});

test("ownership, administrator actions and optimistic concurrency are enforced", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, {
    ...input,
    userId: "u2",
    status: "COMPLETED",
    approvedBy: "u1",
  });
  assert.equal(record.userId, "u1");
  assert.equal(record.status, "PENDING");
  assert.throws(
    () => act(state, other, action(record, "edit", input)),
    (error) => error.status === 404,
  );
  for (const actor of [user])
    for (const type of ["approve", "reject", "confirm", "return"])
      assert.throws(() =>
        act(state, actor, action(record, type, { note: "Test" })),
      );
  assert.throws(
    () => act(state, admin, { ...action(record, "approve"), version: 0 }),
    (error) => error.status === 409,
  );
  assert.throws(
    () => act(state, assistant, { action: "settings", config: state.config }),
    (error) => error.status === 403,
  );
  assert.throws(() =>
    act(
      state,
      user,
      action(record, "report", { actualMinutes: 50, workReport: "Test" }),
    ),
  );
});

test("rejection and cancellation are terminal and excluded from totals", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, input);
  assert.throws(() =>
    act(state, admin, action(record, "reject", { note: " " })),
  );
  act(state, admin, action(record, "reject", { note: "Không cần làm thêm" }));
  assert.equal(record.rejectionReason, "Không cần làm thêm");
  assert.throws(() => act(state, admin, action(record, "confirm")));
  const second = act(state, user, input);
  act(state, user, action(second, "cancel"));
  const summary = overtimeView(
    state,
    user,
    users,
    parseOtFilters(new URLSearchParams({ year: "2026", month: "10" })),
  ).summary;
  assert.equal(summary.registeredMinutes, 0);
  assert.equal(summary.confirmedMinutes, 0);
  assert.equal(summary.REJECTED, 1);
  assert.equal(summary.CANCELLED, 1);
});

test("overnight calculation, holiday/weekend classification, breaks and invalid date validation", () => {
  const config = {
    ...emptyOvertimeState().config,
    breakMinutes: 30,
    holidays: ["2026-10-09"],
  };
  const record = normalizeOtRequest(
    { ...input, start: "22:00", end: "02:00" },
    config,
    now,
  );
  assert.equal(record.registeredMinutes, 210);
  assert.equal(record.otType, "HOLIDAY");
  assert.equal(record.endTime, "2026-10-09T19:00:00.000Z");
  assert.equal(
    normalizeOtRequest({ ...input, date: "2026-10-10" }, config, now).otType,
    "WEEKEND",
  );
  assert.equal(
    normalizeOtRequest({ ...input, date: "2026-10-12" }, config, now).otType,
    "WEEKDAY",
  );
  for (const patch of [
    { date: "2026-02-30" },
    { start: "24:00" },
    { end: "19:60" },
    { start: "20:00" },
    { reason: " " },
    { date: "2026-10-07" },
  ])
    assert.throws(() =>
      normalizeOtRequest({ ...input, ...patch }, config, now),
    );
  assert.throws(() =>
    normalizeOtRequest({ ...input, start: "18:00", end: "18:20" }, config, now),
  );
});

test("overlap is checked across midnight, adjacency is allowed, and day/month caps use allocation", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, {
    ...input,
    date: "2026-10-31",
    start: "22:00",
    end: "02:00",
  });
  assert.throws(
    () =>
      act(state, user, {
        ...input,
        date: "2026-11-01",
        start: "01:00",
        end: "03:00",
      }),
    (error) => error.status === 409,
  );
  act(state, user, {
    ...input,
    date: "2026-11-01",
    start: "02:00",
    end: "03:00",
  });
  act(state, other, {
    ...input,
    date: "2026-11-01",
    start: "01:00",
    end: "03:00",
  });
  assert.deepEqual(
    allocateOtDays(record).map((day) => [day.date, day.registeredMinutes]),
    [
      ["2026-10-31", 120],
      ["2026-11-01", 120],
    ],
  );
  const candidate = {
    ...record,
    id: "candidate",
    startTime: "2026-11-01T13:00:00Z",
    endTime: "2026-11-01T14:00:00Z",
    registeredMinutes: 60,
  };
  assert.throws(() =>
    validateOtSchedule(candidate, state.requests, {
      ...state.config,
      maxDailyMinutes: 200,
    }),
  );
  assert.throws(() =>
    validateOtSchedule(candidate, state.requests, {
      ...state.config,
      maxMonthlyMinutes: 200,
    }),
  );
});

test("statistics allocate confirmed minutes exactly and protect personal scope", () => {
  const state = emptyOvertimeState();
  const record = act(state, admin, {
    ...input,
    userId: user.id,
    date: "2026-10-31",
    start: "23:01",
    end: "01:02",
    approveImmediately: true,
  });
  act(
    state,
    user,
    action(record, "report", { actualMinutes: 101, workReport: "Test" }),
    new Date("2026-11-02T05:00:00Z"),
  );
  act(state, admin, action(record, "confirm", { confirmedMinutes: 101 }));
  const oct = overtimeView(
    state,
    user,
    users,
    parseOtFilters(new URLSearchParams({ year: "2026", month: "10" })),
  );
  const nov = overtimeView(
    state,
    user,
    users,
    parseOtFilters(new URLSearchParams({ year: "2026", month: "11" })),
  );
  assert.equal(
    oct.summary.confirmedMinutes + nov.summary.confirmedMinutes,
    101,
  );
  assert.equal(
    oct.summary.registeredMinutes + nov.summary.registeredMinutes,
    121,
  );
  assert.equal(
    overtimeView(
      state,
      other,
      users,
      parseOtFilters(new URLSearchParams({ year: "2026", month: "" })),
    ).entries.length,
    0,
  );
  assert.equal(
    overtimeView(
      state,
      user,
      users,
      parseOtFilters(
        new URLSearchParams({ year: "2026", month: "11", from: "2026-11-02" }),
      ),
    ).entries.length,
    0,
  );
});

test("configuration accepts zero caps but rejects invalid and fractional values", () => {
  assert.equal(
    normalizeOtConfig(emptyOvertimeState().config).maxDailyMinutes,
    0,
  );
  for (const patch of [
    { maxDailyMinutes: -1 },
    { breakMinutes: 1.5 },
    { holidays: ["2026-02-30"] },
    { weekendDays: [7] },
    { allowPast: "true" },
  ])
    assert.throws(() =>
      normalizeOtConfig({ ...emptyOvertimeState().config, ...patch }),
    );
});

test("atomic JSON storage rejects simultaneous overlapping submissions and rolls back errors", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "overtime-"));
  process.env.OVERTIME_JSON_PATH = path.join(dir, "state.json");
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        mutateOvertimeJson((state) => ({
          state,
          result: act(state, user, input),
        })),
      ),
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const state = await readOvertimeJson();
    assert.equal(state.requests.length, 1);
    assert.equal(state.history.length, 1);
    await assert.rejects(
      mutateOvertimeJson((state) => {
        state.requests.push({ id: "bad" });
        throw new Error("Rollback");
      }),
    );
    assert.equal((await readOvertimeJson()).requests.length, 1);
  } finally {
    delete process.env.OVERTIME_JSON_PATH;
    await rm(dir, { recursive: true, force: true });
  }
});

test("pending edits remain allowed on their original past date and approved edits require admin notes", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, input);
  act(
    state,
    user,
    action(record, "edit", { ...input, reason: "Đổi nội dung" }),
    new Date("2026-10-11T05:00:00Z"),
  );
  assert.equal(record.reason, "Đổi nội dung");
  assert.throws(() =>
    act(
      state,
      user,
      action(record, "edit", { ...input, date: "2026-10-10" }),
      new Date("2026-10-11T05:00:00Z"),
    ),
  );
  const approved = act(emptyOvertimeState(), admin, {
    ...input,
    userId: user.id,
    approveImmediately: true,
  });
  const approvedState = { ...emptyOvertimeState(), requests: [approved] };
  assert.throws(() =>
    act(approvedState, user, action(approved, "edit", input)),
  );
  assert.throws(() =>
    act(approvedState, admin, action(approved, "edit", input)),
  );
  act(
    approvedState,
    admin,
    action(approved, "edit", {
      ...input,
      end: "21:00",
      note: "Bổ sung phạm vi công việc",
    }),
  );
  assert.equal(approved.registeredMinutes, 180);
  assert.equal(approvedState.history[0].before.registeredMinutes, 120);
});

test("reporting before OT finishes and confirming different minutes without explanation are rejected", () => {
  const state = emptyOvertimeState();
  const record = act(state, admin, {
    ...input,
    userId: user.id,
    approveImmediately: true,
  });
  assert.throws(
    () =>
      act(
        state,
        user,
        action(record, "report", { actualMinutes: 120, workReport: "Test" }),
      ),
    /kết thúc/,
  );
  act(
    state,
    user,
    action(record, "report", { actualMinutes: 120, workReport: "Test" }),
    new Date("2026-10-10T05:00:00Z"),
  );
  assert.throws(
    () =>
      act(state, admin, action(record, "confirm", { confirmedMinutes: 100 })),
    /Ghi chú/,
  );
});

test("assistant can approve and confirm employee OT, but cannot change configuration", () => {
  const state = emptyOvertimeState();
  const record = act(state, user, input);
  act(state, assistant, action(record, "approve"));
  assert.equal(record.approvedBy, assistant.id);
  act(
    state,
    user,
    action(record, "report", { actualMinutes: 120, workReport: "Done" }),
    new Date("2026-10-10T05:00:00Z"),
  );
  act(state, assistant, action(record, "confirm"));
  assert.equal(record.confirmedBy, assistant.id);
  const filters = parseOtFilters(
    new URLSearchParams({ year: "2026", month: "10", scope: "mine" }),
  );
  assert.equal(
    overtimeView(state, assistant, users, filters).entries.length,
    0,
  );
  assert.equal(
    overtimeView(state, assistant, users, { ...filters, scope: "all" }).entries
      .length,
    1,
  );
});
