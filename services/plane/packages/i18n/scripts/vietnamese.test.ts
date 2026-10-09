import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { renderFormattedDate, renderFormattedPayloadDate } from "../../utils/src/datetime";
import { setDisplayLanguage } from "../../utils/src/display-language";
import { getStateDisplayName } from "../../utils/src/state-display";

const require = createRequire(import.meta.url);
const requireICU = createRequire(require.resolve("i18next-icu"));
const { IntlMessageFormat } = requireICU("intl-messageformat");
const locales = new URL("../src/locales/", import.meta.url);

async function loadCatalogs() {
  const files = (await readdir(new URL("en/", locales))).filter((name) => name.endsWith(".json"));
  return Promise.all(
    files.map(async (file) => {
      const [english, vietnamese] = await Promise.all([
        readFile(new URL(`en/${file}`, locales), "utf8"),
        readFile(new URL(`vi-VN/${file}`, locales), "utf8"),
      ]);
      return { file, en: flatten(JSON.parse(english)), vi: flatten(JSON.parse(vietnamese)) };
    }),
  );
}

type Locale = { [key: string]: string | Locale };
function flatten(value: Locale, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof item === "string" ? [[path, item]] : Object.entries(flatten(item, path));
    }),
  );
}
function argumentsIn(message: string, locale: string): string[] {
  const names = new Set<string>();
  function visit(
    elements: { type: number; value?: string; options?: Record<string, { value: unknown[] }> }[],
  ) {
    for (const element of elements) {
      if ([1, 2, 3, 4, 5, 6].includes(element.type) && element.value) names.add(element.value);
      for (const option of Object.values(element.options ?? {}))
        visit(option.value as typeof elements);
    }
  }
  visit(new IntlMessageFormat(message, locale).getAst());
  return [...names].toSorted();
}

test("Vietnamese covers every namespace and preserves ICU values", async () => {
  for (const { file, en, vi } of await loadCatalogs()) {
    assert.deepEqual(Object.keys(vi).toSorted(), Object.keys(en).toSorted(), file);
    for (const [key, message] of Object.entries(en)) {
      const expected = argumentsIn(message, "en");
      // Vietnamese has no plural suffix; these existing English suffix arguments are intentionally omitted.
      const actual = argumentsIn(vi[key], "vi-VN");
      assert.deepEqual(
        actual,
        expected.filter((name) => name !== "plural"),
        `${file}: ${key}`,
      );
      assert.ok(vi[key].trim() || !message.trim(), `${file}: ${key} must not be blank`);
    }
  }
});

test("English retained in the Vietnamese catalog is limited to technical names and examples", async () => {
  const allowed = new Set([
    "Plane",
    "Plane AI",
    "Plane Pro",
    "Plane Runner",
    "Email",
    "URL",
    "ID",
    "Epic",
    "Epics",
    "Boolean",
    "Fibonacci",
    "CSV",
    "Excel",
    "JSON",
    "Webhooks",
    "AM",
    "PM",
    "Cron",
    "IdP",
    "GitHub",
    "Gitlab",
    "Gitlab Enterprise",
    "Client Secret",
    "Webhook Secret",
    "Slack",
    "Sentry",
    "Bitbucket Data Center",
    "OAuth Bridge",
    "GitHub Enterprise",
    "Private Key (Base64 encoded)",
    "120/minute",
    "{description} ({timezone}).",
  ]);
  for (const { file, en, vi } of await loadCatalogs()) {
    for (const [key, value] of Object.entries(en)) {
      if (value !== vi[key] || !/[a-z]/i.test(value)) continue;
      const example =
        /^(https?:\/\/|api:\/\/)/.test(value) ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
        /^[a-z]+\.[a-z]{2,}$/.test(value);
      assert.ok(
        allowed.has(value) || example,
        `${file}: ${key} still contains untranslated English: ${value}`,
      );
    }
  }
});

test("built-in state labels are Vietnamese without changing custom names or state records", () => {
  const state = { id: "state-1", name: "In Progress", group: "started", color: "#F59E0B" };
  assert.equal(getStateDisplayName(state), "Đang thực hiện");
  assert.equal(state.name, "In Progress");
  assert.equal(state.group, "started");
  assert.equal(getStateDisplayName({ name: "Review", group: "started" }), "Review");
  assert.equal(getStateDisplayName({ name: "Done", group: "unstarted" }), "Done");
  assert.equal(getStateDisplayName(undefined), undefined);
});

test("Vietnamese display dates do not change dates submitted to the API", () => {
  const date = new Date(2026, 9, 6);
  assert.equal(renderFormattedDate(date), "06/10/2026");
  assert.equal(renderFormattedPayloadDate(date), "2026-10-06");
  assert.equal(renderFormattedDate(null), undefined);
});

test("Vietnamese-created state labels switch to English without modifying stored names", () => {
  const started = { id: "custom-started", name: "Đang thực hiện", group: "started" };
  const completed = { id: "custom-completed", name: "Hoàn thành", group: "completed" };
  const snapshots = [JSON.stringify(started), JSON.stringify(completed)];
  try {
    setDisplayLanguage("en");
    assert.equal(getStateDisplayName(started), "In Progress");
    assert.equal(getStateDisplayName(completed), "Done");
    assert.equal(getStateDisplayName({ name: "Đang kiểm tra", group: "started" }), "Đang kiểm tra");
    assert.equal(getStateDisplayName({ name: "Hoàn thành", group: "started" }), "Hoàn thành");
    setDisplayLanguage("vi-VN");
    assert.equal(getStateDisplayName(started), "Đang thực hiện");
    assert.equal(getStateDisplayName(completed), "Hoàn thành");
    assert.deepEqual([JSON.stringify(started), JSON.stringify(completed)], snapshots);
  } finally {
    setDisplayLanguage("vi-VN");
  }
});

test("display helpers follow English/Vietnamese while preserving user data and API payloads", () => {
  const date = new Date(2026, 9, 6);
  const state = { name: "In Progress", group: "started" };
  setDisplayLanguage("en");
  assert.equal(getStateDisplayName(state), "In Progress");
  assert.equal(getStateDisplayName({ name: "Review", group: "started" }), "Review");
  assert.equal(renderFormattedDate(date), "Oct 06, 2026");
  assert.equal(renderFormattedDate(date, "MMM"), "Oct");
  assert.equal(renderFormattedPayloadDate(date), "2026-10-06");
  setDisplayLanguage("vi-VN");
  assert.equal(getStateDisplayName(state), "Đang thực hiện");
  assert.equal(state.name, "In Progress");
  assert.equal(renderFormattedDate(date), "06/10/2026");
  assert.equal(renderFormattedDate(date, "MMM"), "thg 10");
  assert.equal(renderFormattedPayloadDate(date), "2026-10-06");
});

test("embedded XBus restores and switches English/Vietnamese without losing catalogs", async () => {
  process.env.VITE_XBUS_EMBEDDED = "true";
  const storage = new Map([["userLanguage", "en"]]);
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    document: { documentElement: { lang: "en" } },
  });
  const { initPromise, i18nInstance } = await import("../src/core/instance");
  const { setLanguage } = await import("../src/core/set-language");
  const { SUPPORTED_LANGUAGES } = await import("../src/constants/language");
  await initPromise;
  i18nInstance.on("languageChanged", setDisplayLanguage);
  setDisplayLanguage(i18nInstance.language);
  assert.equal(i18nInstance.language, "en");
  assert.equal(i18nInstance.t("sidebar.work_items"), "Work items");
  assert.equal(i18nInstance.t("sidebar.projects"), "Projects");
  assert.equal(i18nInstance.t("show_more"), "Show more");
  assert.equal(i18nInstance.t("project_settings_label"), "Project settings");
  assert.equal(getStateDisplayName({ name: "Todo", group: "unstarted" }), "Todo");
  await setLanguage("vi-VN");
  assert.equal(i18nInstance.language, "vi-VN");
  assert.equal(document.documentElement.lang, "vi-VN");
  assert.equal(storage.get("userLanguage"), "vi-VN");
  assert.deepEqual(SUPPORTED_LANGUAGES, [
    { label: "English", value: "en" },
    { label: "Tiếng Việt", value: "vi-VN" },
  ]);
  assert.equal(i18nInstance.t("sidebar.work_items"), "Công việc");
  assert.equal(i18nInstance.t("show_more"), "Xem thêm");
  assert.equal(i18nInstance.t("project_settings_label"), "Cài đặt dự án");
  assert.equal(getStateDisplayName({ name: "Todo", group: "unstarted" }), "Cần làm");
  await setLanguage("en");
  assert.equal(i18nInstance.language, "en");
  assert.equal(document.documentElement.lang, "en");
  assert.equal(storage.get("userLanguage"), "en");
  assert.equal(i18nInstance.t("sidebar.work_items"), "Work items");
  await setLanguage("fr");
  assert.equal(i18nInstance.language, "en");
  window.localStorage.setItem = () => {
    throw new Error("Storage blocked");
  };
  await setLanguage("vi-VN");
  assert.equal(i18nInstance.language, "vi-VN");
  assert.equal(document.documentElement.lang, "vi-VN");
});
