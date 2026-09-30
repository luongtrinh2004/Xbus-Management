import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source = await fs.readFile('src/app/api/funds/route.js', 'utf8');
const validators = source.slice(source.indexOf('const validBusinessDate'), source.indexOf('const reminderDefaults'));
const handler = source.slice(source.indexOf('export async function POST'), source.indexOf('async function changeTransaction')).replace('export ', '');
async function create(body) {
  let saved;
  const logs = [];
  const context = vm.createContext({
    console, process, secret: 'test',
    getToken: async () => ({ id: 'admin', role: 'admin', name: 'Quản trị' }),
    NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) },
    getFunds: async () => [{ id: 'fund_2026_9', month: 9, year: 2026, expenses: [], incomes: [] }],
    getUsers: async () => [],
    saveFunds: async funds => { saved = funds; },
    appendAuditLog: async log => logs.push(log),
    fundLabels: { office: 'Văn phòng', happy_hour: 'Happy Hour' },
    businessDateToIso: (date, fallback) => date || fallback,
    buildFundResponse: fund => fund,
  });
  vm.runInContext(validators + handler, context);
  const response = await context.POST({ json: async () => body });
  return { response, saved, logs };
}
for (const kind of ['expense', 'income']) {
  test(`creates ${kind} with a numeric amount from form input`, async () => {
    const { response, saved, logs } = await create({ kind, category: kind === 'expense' ? 'office' : 'happy_hour', amount: '150000', month: 9, year: 2026 });
    assert.equal(response.status, 201);
    assert.equal(saved[0][kind === 'expense' ? 'expenses' : 'incomes'][0].amount, 150000);
    assert.equal(logs[0].action, kind === 'expense' ? 'CREATE_FUND_EXPENSE' : 'CREATE_FUND_INCOME');
  });
}
test('invalid amounts return 400 without saving or auditing', async () => {
  for (const amount of [undefined, '', 'abc', 0, -1, Infinity]) {
    const { response, saved, logs } = await create({ kind: 'expense', amount, month: 9, year: 2026 });
    assert.equal(response.status, 400);
    assert.equal(saved, undefined);
    assert.equal(logs.length, 0);
  }
});

test('invalid dates, periods and payloads return 400 before saving', async () => {
  for (const override of [{ date: 'invalid' }, { date: '2026-02-30' }, { month: 13 }, { year: 9999 }, { month: 1.5 }, { note: 123 }]) {
    const { response, saved } = await create({ kind: 'expense', amount: 1000, month: 9, year: 2026, ...override });
    assert.equal(response.status, 400);
    assert.equal(saved, undefined);
  }
  assert.equal((await create(null)).response.status, 400);
});
test('editing/deleting expenses succeeds; invalid edits never persist', async () => {
  const mutation = source.slice(source.indexOf('async function changeTransaction')).replaceAll('export async function', 'async function');
  for (const [method, patch, expected] of [
    ['PATCH', { amount: '2000', date: '2026-09-30' }, 200],
    ['DELETE', {}, 200],
    ['PATCH', { amount: 'Infinity' }, 400],
    ['PATCH', { amount: 2000, date: 'wrong' }, 400],
    ['PATCH', { amount: 2000, kind: 'unknown' }, 400],
  ]) {
    let saved;
    const context = vm.createContext({
      console, process, secret: 'test',
      getToken: async () => ({ id: 'admin', role: 'admin' }),
      NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) },
      getFunds: async () => [{ id: 'f', month: 9, year: 2026, expenses: [{ id: 'exp1', amount: 1000 }] }],
      getUsers: async () => [], saveUsers: async () => {},
      saveFunds: async funds => { saved = funds; }, appendAuditLog: async () => {},
      fundLabels: {}, businessDateToIso: date => date, buildFundResponse: fund => fund,
    });
    vm.runInContext(validators + mutation, context);
    const response = await context[method]({ json: async () => ({ month: 9, year: 2026, kind: 'expense', transactionId: 'exp1', ...patch }) });
    assert.equal(response.status, expected);
    if (expected === 400) assert.equal(saved, undefined);
    else if (method === 'PATCH') assert.equal(saved[0].expenses[0].amount, 2000);
    else assert.equal(saved[0].expenses.length, 0);
  }
});
