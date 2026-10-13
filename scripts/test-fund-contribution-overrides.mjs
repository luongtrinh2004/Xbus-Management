import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const importSource = (source) =>
  import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
const overrides = await importSource(
  await readFile(
    new URL("../src/libs/fundContributionOverrides.js", import.meta.url),
    "utf8",
  ),
);
const fund = await importSource(
  await readFile(new URL("../src/libs/fundRules.js", import.meta.url), "utf8"),
);
const old = {
  id: "old",
  categoryId: "category_official",
  amount: 100000,
  startPeriod: "2098-12",
  endPeriod: "2100-01",
};
for (const [startPeriod, endPeriod, expected] of [
  ["2098-12", "2100-01", []],
  [
    "2099-01",
    "2099-12",
    [
      ["2098-12", "2098-12"],
      ["2100-01", "2100-01"],
    ],
  ],
  ["2098-11", "2099-06", [["2099-07", "2100-01"]]],
  ["2099-07", "2100-02", [["2098-12", "2099-06"]]],
  ["2100-02", "2100-03", [["2098-12", "2100-01"]]],
]) {
  const incoming = {
    ...old,
    id: "new",
    amount: 200000,
    startPeriod,
    endPeriod,
  };
  const actual = overrides.overrideContributionRules([old], [incoming]);
  assert.deepEqual(
    actual.slice(0, -1).map((r) => [r.startPeriod, r.endPeriod]),
    expected,
  );
  assert.equal(new Set(actual.map((r) => r.id)).size, actual.length);
  assert.equal(old.amount, 100000);
}
let settings = {
  fundContributionRules: Object.keys(fund.fundCategories).map((categoryId) => ({
    ...old,
    id: categoryId,
    categoryId,
  })),
  fundContributionSaveHistory: [],
};
let writes = 0;
globalThis.fundOverrideMocks = {
  NextResponse: {
    json: (body, options) => ({ body, status: options?.status || 200 }),
  },
  getToken: async () => ({ id: "admin", role: "admin", name: "Admin" }),
  getSettings: async () => structuredClone(settings),
  saveSettings: async (value) => {
    writes++;
    settings = structuredClone(value);
  },
  getFunds: async () => [],
  getUsers: async () => [],
  saveFundSnapshots: async () => {},
  appendAuditLog: async () => {},
  randomUUID,
  ...fund,
  ...overrides,
};
let routeSource = await readFile(
  new URL("../src/app/api/fund-settings/route.js", import.meta.url),
  "utf8",
);
routeSource = routeSource.replace(/^import[\s\S]*?;\n/gm, "");
const dependencies = Object.keys(globalThis.fundOverrideMocks).join(",");
const route = await importSource(
  `const {${dependencies}}=globalThis.fundOverrideMocks;\n${routeSource}`,
);
const incoming = Object.keys(fund.fundCategories).map((categoryId) => ({
  categoryId,
  amount: 200000,
  startPeriod: "2099-01",
  endPeriod: "2099-12",
}));
const req = (rules) => ({ json: async () => ({ rules }) });
let response = await route.PATCH(req(incoming));
assert.equal(response.status, 200);
assert.equal(settings.fundContributionSaveHistory.length, 1);
assert.equal(settings.fundContributionSaveHistory[0].rules.length, 4);
for (const categoryId of Object.keys(fund.fundCategories)) {
  assert.equal(
    fund.amountForPeriod(settings, categoryId, { year: 2098, month: 12 }),
    100000,
  );
  assert.equal(
    fund.amountForPeriod(settings, categoryId, { year: 2099, month: 6 }),
    200000,
  );
  assert.equal(
    fund.amountForPeriod(settings, categoryId, { year: 2100, month: 1 }),
    100000,
  );
}
const first = structuredClone(settings.fundContributionSaveHistory[0]);
response = await route.PATCH(
  req(incoming.map((r) => ({ ...r, amount: 250000 }))),
);
assert.equal(response.status, 200);
assert.equal(settings.fundContributionSaveHistory.length, 2);
assert.deepEqual(settings.fundContributionSaveHistory[0], first);
const before = structuredClone(settings);
const beforeWrites = writes;
response = await route.PATCH(
  req(incoming.map((r, i) => ({ ...r, amount: i === 3 ? -1 : r.amount }))),
);
assert.equal(response.status, 400);
assert.deepEqual(settings, before);
assert.equal(writes, beforeWrites);
console.log(
  "PASS: interval replacement/splitting, year boundaries, four-category API overwrite, immutable history, invalid batch writes nothing",
);
