import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
register("./helpers/overtime-route-loader.mjs", import.meta.url);
const repo = await import("./helpers/stubs/dataRepository.mjs");
const { GET, POST, PATCH } = await import("../src/app/api/overtime/route.js");
const { GET: exportOt } = await import(
  "../src/app/api/overtime/export/route.js"
);
const { GET: statisticsOt } = await import(
  "../src/app/api/overtime/statistics/route.js"
);
const { mutateOvertimeStorage } = await import(
  "../src/libs/overtimeRepository.js"
);
const { readOvertime } = await import("../src/libs/overtimeRepository.js");
const users = [
  { id: "u1", name: "An", role: "user", status: "able" },
  { id: "u2", name: "Bình", role: "user", status: "able" },
  { id: "admin", name: "Admin", role: "admin", status: "able" },
  { id: "off", role: "admin", status: "disabled" },
];
const req = (body, params = "") =>
  new Request(
    `http://localhost/api/overtime${params}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
const date = new Date(Date.now() + 86400000 + 7 * 3600000)
  .toISOString()
  .slice(0, 10);

test("API uses current personnel role, protects list/detail/export, validates malformed payload and persists history", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ot-api-"));
  process.env.OVERTIME_JSON_PATH = path.join(dir, "state.json");
  process.env.DATA_SOURCE = "json";
  repo.__resetDataRepository({ users });
  try {
    globalThis.__WORK_TEST_TOKEN = null;
    assert.equal((await GET(req())).status, 401);
    globalThis.__WORK_TEST_TOKEN = { id: "off", role: "admin" };
    assert.equal((await POST(req({}))).status, 403);
    globalThis.__WORK_TEST_TOKEN = { id: "u1", role: "admin" };
    assert.equal(
      (await PATCH(req({ action: "settings", config: {} }))).status,
      403,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/overtime", {
            method: "POST",
            body: "{",
          }),
        )
      ).status,
      400,
    );
    const response = await POST(
      req({
        date,
        start: "18:00",
        end: "20:00",
        reason: "Kiểm thử",
        userId: "u2",
        approveImmediately: true,
      }),
    );
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.userId, "u1");
    assert.equal(created.status, "PENDING");
    assert.equal(
      (
        await PATCH(
          req({ action: "approve", id: created.id, version: created.version }),
        )
      ).status,
      403,
    );
    globalThis.__WORK_TEST_TOKEN = { id: "u2", role: "user" };
    assert.equal((await GET(req(null, `?id=${created.id}`))).status, 404);
    assert.equal(
      (
        await PATCH(
          req({
            action: "edit",
            id: created.id,
            version: created.version,
            date,
            start: "20:00",
            end: "21:00",
            reason: "Hack",
          }),
        )
      ).status,
      404,
    );
    const query = `?year=${date.slice(0, 4)}&month=${date.slice(5, 7)}&userId=u1`;
    assert.equal((await (await GET(req(null, query))).json()).total, 0);
    const exportResponse = await exportOt(req(null, query));
    assert.equal(exportResponse.status, 200);
    const workbook = XLSX.read(
      Buffer.from(await exportResponse.arrayBuffer()),
      { type: "buffer" },
    );
    assert.equal(
      XLSX.utils.sheet_to_json(workbook.Sheets["Danh sách OT"])[0]["Thông tin"],
      "Không có đơn OT phù hợp bộ lọc",
    );
    globalThis.__WORK_TEST_TOKEN = { id: "admin", role: "user" };
    assert.equal((await (await GET(req(null, query))).json()).total, 1);
    assert.equal(
      (
        await PATCH(
          req({ action: "approve", id: created.id, version: created.version }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await PATCH(
          req({
            action: "reject",
            id: created.id,
            version: created.version,
            note: "Stale",
          }),
        )
      ).status,
      409,
    );
    globalThis.__WORK_TEST_TOKEN = { id: "u1", role: "user" };
    const detail = await (await GET(req(null, `?id=${created.id}`))).json();
    assert.equal(detail.record.status, "APPROVED");
    assert.equal(detail.history.length, 2);
    assert.equal(
      (
        await PATCH(
          req({
            action: "report",
            id: created.id,
            version: detail.record.version,
            actualMinutes: 120,
            workReport: "Làm trước",
          }),
        )
      ).status,
      400,
    );
    const personalExport = await exportOt(req(null, query));
    const personalWorkbook = XLSX.read(
      Buffer.from(await personalExport.arrayBuffer()),
      { type: "buffer" },
    );
    assert.equal(
      XLSX.utils.sheet_to_json(personalWorkbook.Sheets["Danh sách OT"]).length,
      1,
    );
    assert.equal((await readOvertime()).history.length, 2);
    assert.equal((await GET(req(null, "?year=bad&month=99"))).status, 400);
  } finally {
    delete globalThis.__WORK_TEST_TOKEN;
    delete process.env.OVERTIME_JSON_PATH;
    await rm(dir, { recursive: true, force: true });
  }
});

test("OT statistics are restricted to current managers and include all personnel with correct totals", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ot-stats-"));
  process.env.OVERTIME_JSON_PATH = path.join(dir, "state.json");
  process.env.DATA_SOURCE = "json";
  const staff = [
    ...users,
    { id: "assistant", name: "Trợ lý", role: "assistant", status: "able" },
  ];
  repo.__resetDataRepository({ users: staff });
  try {
    await mutateOvertimeStorage((state) => {
      state.requests = [
        {
          id: "done",
          userId: "u1",
          startTime: "2026-10-08T11:00:00Z",
          endTime: "2026-10-08T13:00:00Z",
          otType: "WEEKDAY",
          status: "COMPLETED",
          registeredMinutes: 120,
          actualMinutes: 110,
          confirmedMinutes: 100,
          reason: "Done",
          workReport: "Done",
          createdAt: "2026-10-01T00:00:00Z",
        },
        {
          id: "pending",
          userId: "u2",
          startTime: "2026-10-09T11:00:00Z",
          endTime: "2026-10-09T12:30:00Z",
          otType: "WEEKDAY",
          status: "PENDING",
          registeredMinutes: 90,
          reason: "Pending",
          createdAt: "2026-10-02T00:00:00Z",
        },
        {
          id: "rejected",
          userId: "u2",
          startTime: "2026-10-10T11:00:00Z",
          endTime: "2026-10-10T13:00:00Z",
          otType: "WEEKEND",
          status: "REJECTED",
          registeredMinutes: 120,
          reason: "Rejected",
          createdAt: "2026-10-03T00:00:00Z",
        },
      ];
      return { state, result: true };
    });
    globalThis.__WORK_TEST_TOKEN = null;
    assert.equal((await statisticsOt(req())).status, 401);
    globalThis.__WORK_TEST_TOKEN = { id: "u1", role: "admin" };
    assert.equal((await statisticsOt(req())).status, 403);
    globalThis.__WORK_TEST_TOKEN = { id: "off", role: "admin" };
    assert.equal((await statisticsOt(req())).status, 403);
    for (const id of ["admin", "assistant"]) {
      globalThis.__WORK_TEST_TOKEN = { id, role: "user" };
      const response = await statisticsOt(
        req(null, "?year=2026&month=10&scope=mine"),
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.summary.registeredMinutes, 210);
      assert.equal(data.summary.confirmedMinutes, 100);
      assert.equal(data.summary.COMPLETED, 1);
      assert.equal(data.summary.PENDING, 1);
      assert.equal(data.employees.length, staff.length);
      assert.equal(
        data.employees.find((person) => person.userId === "admin")
          .registeredMinutes,
        0,
      );
    }
    const personal = await (
      await statisticsOt(req(null, "?year=2026&month=10&userId=u2"))
    ).json();
    assert.equal(personal.summary.registeredMinutes, 90);
    assert.equal(personal.employees.length, 1);
  } finally {
    delete globalThis.__WORK_TEST_TOKEN;
    delete process.env.OVERTIME_JSON_PATH;
    await rm(dir, { recursive: true, force: true });
  }
});
