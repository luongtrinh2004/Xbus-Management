// Isolated regression checks; no database or production writes.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Date,
    Intl,
    URL,
    console,
    process: { env: {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

const rules = load("src/libs/fundRules.js");
const periods = [
  { id: "imported", year: 2020, month: 2, opening_balance: 123000 },
];
const users = [
  {
    id: "payer",
    name: "Payer",
    status: "able",
    categoryId: "category_official",
  },
  {
    id: "unpaid",
    name: "Unpaid",
    status: "able",
    categoryId: "category_intern",
  },
];
const payments = [
  { fund_period_id: "imported", user_id: "payer", paid: 1, amount: 2532000 },
  // Historical invalid reference: retain recorded money; never reinsert on GET.
  { fund_period_id: "imported", user_id: "deleted", paid: 1, amount: 100000 },
];
const transactions = [
  {
    id: "income",
    fund_period_id: "imported",
    kind: "income",
    amount: 50000,
    category: "other",
    occurred_at: "2020-02-15T05:00:00Z",
  },
];
const documents = new Map([
  [
    "fund-meta:imported",
    {
      members: {
        payer: {
          userId: "wrong-legacy-id",
          requiredAmount: 100000,
          baseAmount: 100000,
        },
        unpaid: { requiredAmount: 75000, baseAmount: 75000 },
        removedUnpaid: { requiredAmount: 100000 },
      },
    },
  ],
]);
const writes = [];
let committed = 0;
let rolledBack = 0;
let released = 0;
let failMetadata = false;
const connection = {
  beginTransaction: async () => {},
  commit: async () => {
    committed++;
  },
  rollback: async () => {
    rolledBack++;
  },
  release: () => {
    released++;
  },
  async execute(sql, values) {
    writes.push(sql);
    // This models the production FK error, and also detects deleting money.
    if (/fund_member_payments|fund_transactions/.test(sql)) {
      throw Object.assign(new Error("Invalid payment user reference"), {
        code: "ER_NO_REFERENCED_ROW_2",
      });
    }
    if (sql.startsWith("INSERT INTO fund_periods")) {
      if (!periods.some((p) => p.year === values[1] && p.month === values[2])) {
        periods.push({
          id: values[0],
          year: values[1],
          month: values[2],
          opening_balance: values[3],
        });
      }
    } else if (sql.startsWith("INSERT INTO app_documents")) {
      if (failMetadata) throw new Error("metadata unavailable");
      documents.set(values[0], JSON.parse(values[1]));
    } else throw new Error(`Unexpected write: ${sql}`);
    return [{ affectedRows: 1 }];
  },
};
const pool = {
  getConnection: async () => connection,
  async query(sql) {
    if (sql.includes("FROM fund_periods")) return [periods];
    if (sql.includes("FROM fund_member_payments")) return [payments];
    if (sql.includes("FROM fund_transactions")) return [transactions];
    if (sql.includes("FROM users")) return [users];
    if (sql.includes("FROM app_documents"))
      return [
        [...documents].map(([document_key, document_value]) => ({
          document_key,
          document_value,
        })),
      ];
    throw new Error(`Unexpected read: ${sql}`);
  },
};
const repository = load("src/libs/dataRepository.js", {
  "./jsonRepository.js": {},
  "@/libs/assetIds": {},
  "./fundRules.js": rules,
  "./mysql.js": { isMysqlEnabled: () => true, getMysqlPool: () => pool },
});
const route = load("src/app/api/funds/route.js", {
  "next/server": {
    NextResponse: {
      json: (body, opts) => ({ body, status: opts?.status || 200 }),
    },
  },
  "next-auth/jwt": { getToken: async () => ({ id: "admin" }) },
  "@/libs/fundRules": rules,
  "@/libs/dataRepository": {
    ...repository,
    getUsers: async () => users,
    getSettings: async () => ({}),
    saveFunds: async () => {
      throw new Error("GET must not rewrite financial records");
    },
  },
});

(async () => {
  const moneyBefore = JSON.stringify({ payments, transactions });
  const [imported] = await repository.getFunds();
  assert.equal(
    imported.members.find((m) => m.userId === "payer").amount,
    2532000,
  );
  assert(!imported.members.some((m) => m.userId === "wrong-legacy-id"));
  assert(!imported.members.some((m) => m.userId === "removedUnpaid"));
  assert.equal(
    imported.members.find((m) => m.userId === "unpaid").requiredAmount,
    75000,
  );

  const request = {
    nextUrl: new URL("http://localhost/api/funds?year=2020&month=2"),
  };
  const first = await route.GET(request);
  assert.equal(first.status, 200);
  assert.equal(first.body.memberIncome, 2632000);
  assert.equal(first.body.totalIncome, 2682000);
  assert.equal(first.body.balance, 2805000);
  assert.equal(first.body.members.length, 3);
  assert.equal(first.body.incomes.length, 1);
  assert.equal(committed, 1);

  const second = await route.GET(request);
  assert.equal(second.status, 200);
  assert.equal(second.body.totalIncome, first.body.totalIncome);
  assert.equal(
    second.body.members.find((m) => m.userId === "unpaid").requiredAmount,
    75000,
  );
  assert.equal(JSON.stringify({ payments, transactions }), moneyBefore);
  assert(
    writes.every((sql) => !/fund_member_payments|fund_transactions/.test(sql)),
  );

  // New period rosters survive reload without creating payment rows.
  const newRequest = {
    nextUrl: new URL("http://localhost/api/funds?year=2020&month=3"),
  };
  assert.equal((await route.GET(newRequest)).body.members.length, 2);
  assert.equal((await route.GET(newRequest)).body.members.length, 2);
  assert.equal(payments.length, 2);

  failMetadata = true;
  await assert.rejects(
    repository.saveFundSnapshots([imported]),
    /metadata unavailable/,
  );
  assert.equal(rolledBack, 1);
  assert.equal(released, committed + rolledBack);
  console.log(
    "PASS: historical GET, preserved money/rates, deleted users, authoritative IDs, roster reload, rollback/release",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
