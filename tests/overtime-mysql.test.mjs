import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMysqlPool } from "../src/libs/mysql.js";
import {
  readOvertime,
  mutateOvertimeStorage,
} from "../src/libs/overtimeRepository.js";
import { mutateOvertime } from "../src/libs/overtime.js";

// Only run against a disposable test database, never the app's configured DB.
const enabled = Boolean(process.env.OVERTIME_TEST_DATABASE_URL);
const users = [
  { id: "u1", name: "An", role: "user", status: "able" },
  { id: "admin", name: "Admin", role: "admin", status: "able" },
];
test(
  "MySQL migration, transactional lifecycle, concurrency and rollback",
  { skip: !enabled },
  async () => {
    process.env.DATABASE_URL = process.env.OVERTIME_TEST_DATABASE_URL;
    process.env.DATA_SOURCE = "mysql";
    const pool = getMysqlPool();
    try {
      await pool.query("CREATE TABLE users (id VARCHAR(64) PRIMARY KEY)");
      await pool.query("INSERT INTO users(id) VALUES ('u1'),('admin')");
      const migration = await readFile(
        new URL("../database/migrations/020_overtime.sql", import.meta.url),
        "utf8",
      );
      for (const statement of migration
        .split(";")
        .filter((statement) => statement.trim()))
        await pool.query(statement);
      const now = new Date("2026-10-08T05:00:00Z");
      const body = {
        action: "create",
        date: "2026-10-09",
        start: "22:00",
        end: "02:00",
        reason: "SQL lifecycle",
      };
      const write = (actor, input, date = now) =>
        mutateOvertimeStorage((state) => ({
          state,
          result: mutateOvertime(state, actor, input, users, date),
        }));
      const submissions = await Promise.allSettled(
        Array.from({ length: 6 }, () => write(users[0], body)),
      );
      assert.equal(
        submissions.filter((item) => item.status === "fulfilled").length,
        1,
      );
      let state = await readOvertime();
      assert.equal(state.requests.length, 1);
      assert.equal(state.history.length, 1);
      assert.equal(state.config.allowPast, false);
      let record = state.requests[0];
      record = await write(users[1], {
        action: "approve",
        id: record.id,
        version: record.version,
      });
      record = await write(
        users[0],
        {
          action: "report",
          id: record.id,
          version: record.version,
          actualMinutes: 220,
          workReport: "Done",
        },
        new Date("2026-10-10T05:00:00Z"),
      );
      record = await write(users[1], {
        action: "confirm",
        id: record.id,
        version: record.version,
        confirmedMinutes: 220,
      });
      state = await readOvertime();
      assert.equal(state.requests[0].status, "COMPLETED");
      assert.equal(state.history.length, 4);
      const [rows] = await pool.query(
        "SELECT user_id,registered_minutes,confirmed_minutes,status FROM overtime_requests",
      );
      assert.equal(rows[0].registered_minutes, 240);
      assert.equal(rows[0].confirmed_minutes, 220);
      assert.equal(rows[0].status, "COMPLETED");
      const [logs] = await pool.query(
        "SELECT action,changed_by FROM overtime_history ORDER BY action",
      );
      assert.equal(logs.length, 4);
      await assert.rejects(
        mutateOvertimeStorage((state) => {
          state.config.allowPast = true;
          throw new Error("Rollback");
        }),
      );
      assert.equal((await readOvertime()).config.allowPast, false);
      await assert.rejects(
        write(users[0], { action: "cancel", id: record.id, version: 1 }),
      );
      assert.equal((await readOvertime()).history.length, 4);
    } finally {
      await pool.end();
    }
  },
);
