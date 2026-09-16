// Isolated checks: no database, network requests or production data writes.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const crypto = require("node:crypto");
function load(file, mocks = {}, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency ${name}`);
      return mocks[name];
    },
    process: { env },
    console,
    crypto,
    URL,
    Date,
    Intl,
  });
  return exports;
}
const rules = load("src/libs/fundRules.js");
const future = { year: 2099, month: 12, members: [] };
const futureUsers = [
  {
    id: "future-a",
    name: "A",
    status: "able",
    categoryId: "category_official",
  },
];
rules.snapshotFund(future, futureUsers, {});
assert.equal(future.members.length, 1);
future.members[0].paid = true;
future.members[0].amount = 12345;
rules.snapshotFund(
  future,
  [
    ...futureUsers,
    {
      id: "future-b",
      name: "B",
      status: "able",
      categoryId: "category_intern",
    },
  ],
  {},
);
assert.equal(future.members.length, 2);
assert.equal(future.members[0].amount, 12345);
rules.snapshotFund(future, [], {});
assert.equal(
  future.members.length,
  1,
  "Preserve recorded money when removing future staff",
);
assert.equal(future.members[0].rosterHidden, true);
const makePeriod = (month, amount, voluntarySurplus = false) => ({
  year: 2026,
  month,
  members: [
    {
      userId: "carry-user",
      requiredAmount: 150000,
      paid: amount > 0,
      amount,
      voluntarySurplus,
    },
  ],
});
let carryFunds = [makePeriod(9, 200000), makePeriod(10, 100000)];
rules.applyFundBalances(carryFunds);
assert.equal(carryFunds[1].members[0].requiredAmount, 100000);
assert.equal(carryFunds[1].members[0].difference, 0);
rules.applyFundBalances(carryFunds);
assert.equal(
  carryFunds[1].members[0].requiredAmount,
  100000,
  "Repeated recalculation must not double-credit",
);
carryFunds = [makePeriod(9, 50000), makePeriod(10, 0)];
rules.applyFundBalances(carryFunds);
assert.equal(carryFunds[1].members[0].requiredAmount, 250000);
carryFunds = [
  makePeriod(9, 500000, true),
  makePeriod(10, 100000, true),
  makePeriod(11, 0, true),
];
rules.applyFundBalances(carryFunds);
assert.equal(
  carryFunds[1].members[0].requiredAmount,
  150000,
  "Voluntary surplus is not credited",
);
assert.equal(
  carryFunds[2].members[0].requiredAmount,
  200000,
  "Voluntary payer debt still carries",
);
carryFunds = [
  makePeriod(9, 500000),
  makePeriod(10, 0),
  makePeriod(11, 0),
  makePeriod(12, 0),
];
rules.applyFundBalances(carryFunds);
assert.equal(carryFunds[1].members[0].requiredAmount, 0);
assert.equal(carryFunds[2].members[0].requiredAmount, 0);
assert.equal(
  carryFunds[3].members[0].requiredAmount,
  100000,
  "Unused credit survives multiple periods",
);
const windowSettings = {
  fundMinimumAmounts: { category_official: 5000 },
  fundContributionWindow: {
    amounts: { ...rules.defaultFundAmounts, category_official: 250000 },
    startPeriod: "2026-09",
    endPeriod: "2026-10",
  },
};
assert.equal(
  rules.amountForPeriod(windowSettings, "category_official", {
    year: 2026,
    month: 10,
  }),
  250000,
);
assert.equal(
  rules.amountForPeriod(windowSettings, "category_official", {
    year: 2026,
    month: 11,
  }),
  150000,
);
console.log(
  "PASS: surplus/debt carry, voluntary surplus, repeat calculations, multi-period credit, fixed fallback after expiry",
);
const user = {
  id: "member-1",
  name: "Test member",
  categoryId: "category_official",
  status: "able",
  role: "user",
};
const settings = {
  fundMinimumAmounts: { category_official: 100000 },
  fundContributionRules: [
    {
      id: "r1",
      categoryId: "category_official",
      amount: 150000,
      startPeriod: "2026-10",
      endPeriod: "2026-12",
    },
  ],
};
assert.equal(
  rules.amountForPeriod(settings, user.categoryId, { year: 2026, month: 9 }),
  150000,
);
assert.equal(
  rules.amountForPeriod(settings, user.categoryId, { year: 2026, month: 10 }),
  150000,
);
assert.equal(
  rules.amountForPeriod(settings, user.categoryId, { year: 2027, month: 1 }),
  150000,
);
const fund = {
  id: "f",
  year: 2026,
  month: 9,
  members: [
    { userId: user.id, paid: true, amount: 5000, requiredAmount: 100000 },
  ],
};
rules.snapshotFund(fund, [user], settings);
assert.equal(fund.members[0].requiredAmount, 100000);
rules.snapshotFund(fund, [{ ...user, categoryId: "category_intern" }], {
  fundMinimumAmounts: { category_official: 999999 },
});
assert.equal(fund.members[0].requiredAmount, 100000);
for (const [amount, paid, cancelled, expected] of [
  [0, false, false, "unpaid"],
  [5000, true, false, "underpaid"],
  [100000, true, false, "paid"],
  [200000, true, false, "overpaid"],
  [5000, true, true, "cancelled"],
]) {
  assert.equal(
    rules.fundPaymentStatus({
      amount,
      paid,
      obligationCancelled: cancelled,
      requiredAmount: 100000,
    }).key,
    expected,
  );
}
const state = {
  funds: [fund],
  settings,
  logs: [],
  token: { id: "admin", role: "admin", name: "Admin" },
};
const repository = {
  getFunds: async () => structuredClone(state.funds),
  saveFunds: async (funds) => {
    state.funds = funds;
  },
  getSettings: async () => structuredClone(state.settings),
  saveSettings: async (s) => {
    state.settings = s;
  },
  getUsers: async () => [user],
  saveUsers: async () => {},
  appendAuditLog: async (log) => state.logs.push(log),
};
const mocks = {
  "next/server": {
    NextResponse: {
      json: (body, options) => ({ body, status: options?.status || 200 }),
    },
  },
  "next-auth/jwt": { getToken: async () => state.token },
  "@/libs/dataRepository": repository,
  "@/libs/fundRules": rules,
};
const settingsRoute = load("src/app/api/fund-settings/route.js", mocks);
const fundsRoute = load("src/app/api/funds/route.js", mocks);
const req = (body) => ({ json: async () => body });
(async () => {
  let result = await settingsRoute.PATCH(
    req({
      categoryId: user.categoryId,
      amount: 200000,
      startPeriod: "2026-11",
      endPeriod: "2027-01",
    }),
  );
  assert.equal(result.status, 400, "Require all four amounts");
  result = await settingsRoute.PATCH(
    req({
      categoryId: user.categoryId,
      amount: 200000,
      startPeriod: "2027-01",
      endPeriod: "2027-12",
      amounts: { ...rules.defaultFundAmounts, category_official: 200000 },
      voluntaryUserIds: [],
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(
    state.funds[0].members[0].requiredAmount,
    100000,
    "Changing rates must preserve historical obligation",
  );
  result = await fundsRoute.PATCH(
    req({
      kind: "member",
      userId: user.id,
      month: 9,
      year: 2026,
      obligationCancelled: true,
      cancellationReason: "",
    }),
  );
  assert.equal(result.status, 400);
  result = await fundsRoute.PATCH(
    req({
      kind: "member",
      userId: user.id,
      month: 9,
      year: 2026,
      obligationCancelled: true,
      cancellationReason: "Được miễn",
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(
    state.funds[0].members[0].amount,
    5000,
    "Cancellation must preserve actual collected money",
  );
  assert.equal(result.body.memberIncome, 5000);
  assert.equal(state.funds[0].members[0].obligationCancelled, true);
  result = await fundsRoute.PATCH(
    req({
      kind: "member",
      userId: user.id,
      month: 9,
      year: 2026,
      paid: true,
      amount: 5000,
    }),
  );
  assert.equal(result.status, 409);
  result = await fundsRoute.PATCH(
    req({
      kind: "member",
      userId: user.id,
      month: 9,
      year: 2026,
      obligationCancelled: false,
    }),
  );
  assert.equal(result.status, 200);
  state.token = { id: user.id, role: "user" };
  result = await settingsRoute.PATCH(req({ action: "delete", id: "r1" }));
  assert.equal(result.status, 403);
  result = await fundsRoute.PATCH(
    req({
      kind: "member",
      userId: user.id,
      month: 9,
      year: 2026,
      obligationCancelled: true,
      cancellationReason: "Test",
    }),
  );
  assert.equal(result.status, 403);
  const paymentMocks = {
    ...mocks,
    qrcode: {
      default: { toDataURL: async () => "data:image/png;base64,test" },
    },
    "@payos/node": {
      PayOS: class {
        paymentRequests = {
          create: async () => ({
            qrCode: "qr",
            checkoutUrl: "https://example.test",
            paymentLinkId: "link",
            accountName: "Test account",
          }),
          get: async () => ({
            status: "PAID",
            amountPaid: 5000,
            transactions: [],
          }),
        };
        webhooks = {
          verify: async () => ({
            code: "00",
            orderCode: state.funds[0].members[0].orderCode,
            amount: 5000,
            reference: "test",
          }),
        };
      },
    },
  };
  const env = {
    CLIENT_ID: "test",
    API_KEY: "test",
    CHECKSUM_KEY: "test",
    NEXT_PUBLIC_APP_URL: "https://example.test",
  };
  const payments = load(
    "src/app/api/fund-payments/route.js",
    paymentMocks,
    env,
  );
  state.funds[0].members[0].paid = false;
  result = await payments.POST(req({ month: 12, year: 2099, amount: 5000 }));
  assert.equal(result.status, 403, "Block future online payments");
  result = await payments.POST(req({ month: 9, year: 2026, amount: 5000 }));
  assert.equal(result.status, 201, "Accept below required amount");
  assert.equal(state.funds[0].members[0].requiredAmount, 100000);
  const paymentReq = {
    nextUrl: new URL(`https://example.test?orderCode=${result.body.orderCode}`),
  };
  result = await payments.GET(paymentReq);
  assert.equal(result.body.paid, true);
  assert.equal(
    rules.fundPaymentStatus(state.funds[0].members[0]).key,
    "underpaid",
  );
  assert.equal(state.logs.at(-1).adminId, user.id, "Audit actor is payer");
  assert.ok(state.logs.at(-1).details.includes(user.name));
  const logCount = state.logs.length;
  await payments.GET(paymentReq);
  assert.equal(
    state.logs.length,
    logCount,
    "Sequential rechecks must not duplicate audit entries",
  );
  state.funds[0].members[0].obligationCancelled = true;
  result = await payments.POST(req({ month: 9, year: 2026, amount: 5000 }));
  assert.equal(result.status, 409);
  state.funds[0].members[0].paid = false;
  const webhook = load(
    "src/app/api/payments/payos/webhook/route.js",
    paymentMocks,
    env,
  );
  result = await webhook.POST(req({}));
  assert.equal(result.status, 200);
  assert.equal(state.funds[0].members[0].paid, true);
  assert.equal(
    state.funds[0].members[0].obligationCancelled,
    true,
    "Late settlement preserves cancellation",
  );
  assert.equal(state.logs.at(-1).adminId, user.id);
  console.log(
    "PASS: rate periods, immutable snapshots, five statuses, cancellation/accounting, role permissions, online underpayment, payer audit, late webhook",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
