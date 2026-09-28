import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('src/libs/dataRepository.js', 'utf8');
const saveFunction = source.slice(source.indexOf('export async function saveAssetProduct('), source.indexOf('export async function saveAssetCategory(')).replace('export ', '');
const ids = fs.readFileSync('src/libs/assetIds.js', 'utf8').replaceAll('export ', '');

test('editing an uncoded product synchronizes imports and exports, including a second rename', async () => {
  let data = {
    products: [{ id: 'p1', name: 'Máy cũ', code: '', unit: 'Cái' }],
    categories: [{ id: 'cat', name: 'Thiết bị' }],
    imports: [{ id: 'i1', name: 'Máy cũ', documentCode: 'may_cu', quantity: 5, date: '2026-05-28', ticketId: 'AAA001', status: 'approved' }],
    exports: [{ id: 'e1', name: 'Máy cũ', quantity: 2, person: 'An', issuedTo: 'Bình' }, { id: 'other', name: 'Khác', quantity: 1 }],
  };
  const context = vm.createContext({ mysqlEnabled: () => false, json: {
    getAssets: async () => structuredClone(data),
    saveAssets: async value => { data = structuredClone(value); },
  } });
  vm.runInContext(`${ids}\n${saveFunction}`, context);
  const product = { id: 'p1', name: 'Máy mới', code: 'NEW', categoryId: 'cat', unit: 'Bộ', description: 'Mô tả', location: 'B-3', active: true };
  await context.saveAssetProduct(product);
  for (const row of [data.imports[0], data.exports[0]]) {
    assert.equal(row.documentCode, 'may_moi');
    assert.equal(row.name, product.name);
    assert.equal(row.code, 'NEW');
    assert.equal(row.category, 'Thiết bị');
    assert.equal(row.unit, 'Bộ');
    assert.equal(row.description, 'Mô tả');
    assert.equal(row.location, 'B-3');
  }
  assert.equal(data.imports[0].quantity, 5);
  assert.equal(data.imports[0].date, '2026-05-28');
  assert.equal(data.imports[0].ticketId, 'AAA001');
  assert.equal(data.exports[0].issuedTo, 'Bình');
  assert.equal(data.exports[1].name, 'Khác');
  await context.saveAssetProduct({ ...product, name: 'Máy lần ba', description: '', location: '' });
  assert.equal(data.imports[0].documentCode, 'may_lan_ba');
  assert.equal(data.exports[0].name, 'Máy lần ba');
  assert.equal(data.exports[0].location, '');
});

test('MySQL rolls back product changes if transaction synchronization fails', async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    execute: async (sql) => {
      if (sql.startsWith('SELECT *')) return [[{ name: 'Old', document_code: 'old' }]];
      if (sql.startsWith('SELECT name')) return [[]];
      if (sql.includes('UPDATE asset_transactions')) throw new Error('sync failed');
      return [{}];
    },
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
  };
  const context = vm.createContext({ mysqlEnabled: () => true, getMysqlPool: () => ({ getConnection: async () => connection }) });
  vm.runInContext(`${ids}\n${saveFunction}`, context);
  await assert.rejects(context.saveAssetProduct({ id: 'p1', name: 'New', unit: 'Cái' }), /sync failed/);
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});
