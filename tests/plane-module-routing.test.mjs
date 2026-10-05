import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nginx = readFileSync(new URL("../services/plane-xbus/nginx.module.conf", import.meta.url), "utf8");
const expression = nginx.match(/^location ~ (.+) \{$/m)?.[1];
assert.ok(expression, "Plane routing expression must exist");
const routesToPlane = new RegExp(expression);

test("module routes include Plane navigation, auth, assets, APIs and realtime", () => {
  for (const path of [
    "/xbus-office/projects/", "/xbus-office/settings/", "/auth/xbus/",
    "/assets/root-test.js", "/static/admin/css/base.css", "/live/collaboration",
    "/api/instances/", "/api/workspaces/xbus-office/projects/",
    "/api/users/me/", "/api/users/session/", "/api/users/file-assets/",
    "/api/assets/v2/user-assets/", "/manifest.json", "/site.webmanifest.json",
    "/uploads", "/uploads/workspace/file.png",
    "/settings/profile/general", "/spaces/project", "/god-mode/",
  ]) assert.ok(routesToPlane.test(path), path);
});

test("module routing preserves XBus pages, staff, assets, uploads and authentication", () => {
  for (const path of [
    "/", "/login", "/home", "/work/projects", "/api/work/plane/session",
    "/api/auth/session", "/api/users", "/api/users/employee-1",
    "/assets", "/api/assets", "/api/assets/history", "/api/notifications",
    "/uploads/gallery/photo.jpg", "/images/avatars/male-user.png", "/api/media/avatars/1",
    "/_next/static/chunks/main.js", "/api/xbus/bootstrap/",
  ]) assert.equal(routesToPlane.test(path), false, path);
});
