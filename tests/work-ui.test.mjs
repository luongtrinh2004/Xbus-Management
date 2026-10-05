import test from "node:test";
import assert from "node:assert/strict";

import {
  dashboardProgress,
  instantiateProjectTemplate,
  serializeEditableMembers,
  splitFavoriteProjects,
} from "../src/libs/workUi.js";
import {
  calendarDateKeys,
  localDateKey,
} from "../src/app/(dashboard)/work/components/workConstants.js";

test("member serialization never includes the immutable owner", () => {
  const members = [
    { userId: "owner", role: "owner" },
    { userId: "editor", role: "editor" },
    { userId: "member", role: "member" },
  ];
  assert.deepEqual(serializeEditableMembers(members, "owner"), [
    { userId: "editor", role: "editor" },
    { userId: "member", role: "member" },
  ]);
});

test("deep-linked built-in and custom templates instantiate immediately", () => {
  const custom = {
    id: "wtp_custom",
    name: "Custom",
    icon: "tabler-star",
    sections: [
      { name: "Queue", status: "todo" },
      { name: "Done", status: "done" },
    ],
    tasks: [{ title: "Seed", section: "Done", priority: "high" }],
  };
  const result = instantiateProjectTemplate(custom);
  assert.equal(result.templateId, "wtp_custom");
  assert.deepEqual(result.sections.map((item) => item.status), ["todo", "done"]);
  assert.equal(result.tasks[0].section, 1);
  assert.equal(result.tasks[0].status, "done");
});

test("dashboard progress uses the filtered task list", () => {
  assert.equal(
    dashboardProgress([
      { completed: true, status: "done" },
      { completed: false, status: "todo" },
    ]),
    50,
  );
  assert.equal(dashboardProgress([{ completed: true, status: "done" }]), 100);
});

test("favorite projects are not duplicated when every result is a favorite", () => {
  const projects = [
    { id: "a", favorite: true },
    { id: "b", favorite: true },
  ];
  assert.deepEqual(splitFavoriteProjects(projects), {
    favorites: projects,
    nonFavorites: [],
  });
});

test("local business date keys do not shift to UTC", () => {
  const localMidnight = new Date(2026, 9, 5, 0, 15, 0);
  assert.equal(localDateKey(localMidnight), "2026-10-05");
  assert.deepEqual(calendarDateKeys(2026, 9).slice(0, 2), [
    "2026-10-01",
    "2026-10-02",
  ]);
  assert.equal(calendarDateKeys(2026, 9).at(-1), "2026-10-31");
});
