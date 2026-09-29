import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { Readable } from 'node:stream';
const source = (await fs.readFile('src/libs/avatarStorage.js', 'utf8'))
  .replace(/^import .*;\n/gm, '').replaceAll('export ', '');
function setup(available = true) {
  const objects = new Map();
  const removed = [];
  const client = {
    putObject: async (bucket, key, buffer, size, metadata) => { objects.set(key, { buffer, metadata }); },
    removeObject: async (bucket, key) => { removed.push(key); objects.delete(key); },
    getObject: async (bucket, key) => Readable.from([objects.get(key).buffer]),
  };
  const context = vm.createContext({ path, fs, process, Buffer, URLSearchParams,
    ensureBucket: async () => available, getMinioClient: () => client, MINIO_BUCKET: 'xbus-gallery',
  });
  vm.runInContext(source, context);
  return { context, objects, removed };
}
test('stores the requested key, disables caching, replaces and deletes avatars', async () => {
  const { context: c, objects, removed } = setup();
  const first = await c.storeAvatar('NV001', 'png', Buffer.from('first'));
  assert.match(first, /^\/api\/media\/avatars\/NV001\/NV001.png\?storage=minio&v=/);
  assert.equal(objects.get('avatars/NV001/NV001.png').metadata['Cache-Control'], 'no-store, max-age=0');
  const second = await c.storeAvatar('NV001', 'webp', Buffer.from('second'));
  await c.removeAvatar(first, second);
  assert.deepEqual(removed, ['avatars/NV001/NV001.png']);
  await c.removeAvatar(second, second);
  assert.equal(objects.size, 1);
  await c.removeAvatar(second);
  assert.equal(objects.size, 0);
});
test('rename copies to new staff code before old avatar is removed', async () => {
  const { context: c, objects } = setup();
  const first = await c.storeAvatar('NV001', 'jpg', Buffer.from('image'));
  const moved = await c.moveAvatarToStaffCode(first, 'NV001', 'NV002');
  assert.equal(objects.size, 2);
  assert.equal(objects.get('avatars/NV002/NV002.jpg').buffer.toString(), 'image');
  await c.removeAvatar(first, moved);
  assert.equal(objects.size, 1);
});
test('MinIO failure rejects upload without local fallback', async () => {
  const { context: c, objects } = setup(false);
  await assert.rejects(c.storeAvatar('NV001', 'png', Buffer.from('image')), /MinIO/);
  assert.equal(objects.size, 0);
});
test('protect default avatars and reject traversal paths', () => {
  const { context: c } = setup();
  for (const url of ['/images/avatars/male-user.png', '/api/media/avatars/%2e%2e/secret.png', '/api/media/avatars/a%5csecret.png']) {
    assert.equal(c.parseAvatarUrl(url), null);
  }
  assert.equal(c.parseAvatarUrl('/api/media/avatars/NV001/NV001.png?v=1').minio, false);
});
