import test from "node:test";
import assert from "node:assert/strict";
import {
  planeAvatarUrl,
  planePersonnel,
} from "../src/libs/planeIntegration.js";

test("avatar retains its staff path, storage backend and version on the XBus origin", () => {
  const avatarUrl = "/api/media/avatars/NV002/NV002.png?storage=minio&v=123";
  assert.equal(
    planeAvatarUrl({ avatarUrl }, "https://office.example.com"),
    `https://office.example.com${avatarUrl}`,
  );
  assert.equal(
    planeAvatarUrl(
      { avatarUrl: "https://photos.example.com/staff.png?v=2" },
      "https://office.example.com",
    ),
    "https://photos.example.com/staff.png?v=2",
  );
});

test("missing avatars use the existing XBus defaults by role and gender", () => {
  for (const [role, gender, file] of [
    ["admin", "female", "female-admin.png"],
    ["admin", "male", "male-admin.png"],
    ["user", "female", "female-user.png"],
    ["user", "male", "male-user.png"],
    ["assistant", "female", "assistant.png"],
  ]) {
    assert.equal(
      planeAvatarUrl({ role, gender }, "https://office.example.com"),
      `https://office.example.com/images/avatars/${file}`,
    );
  }
  assert.equal(
    planeAvatarUrl(
      { avatarUrl: "javascript:alert(1)", role: "user", gender: "female" },
      "https://office.example.com",
    ),
    "https://office.example.com/images/avatars/female-user.png",
  );
});

test("personnel preserves source identity and includes only work profile fields", () => {
  const [person] = planePersonnel(
    [
      {
        id: "staff-2",
        name: "Trần Thị Bình",
        email: "Staff@Example.com",
        code: "NV002",
        role: "assistant",
        status: "able",
        typeId: "dept-1",
        categoryId: "cat-1",
        password: "private",
        citizenId: "private",
        birthday: "private",
        address: "private",
      },
    ],
    [{ id: "dept-1", name: "Kỹ thuật" }],
    [{ id: "cat-1", name: "Chính thức" }],
  );
  assert.equal(person.id, "staff-2");
  assert.equal(person.name, "Trần Thị Bình");
  assert.equal(person.email, "staff@example.com");
  assert.equal(person.code, "NV002");
  assert.equal(person.department, "Kỹ thuật");
  assert.equal(person.category, "Chính thức");
  assert.equal(person.role, "member");
  for (const key of ["password", "citizenId", "birthday", "address"])
    assert.equal(key in person, false);
});
