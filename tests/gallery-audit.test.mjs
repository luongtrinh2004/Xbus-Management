import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function route(file, { token = { id: 'viewer', name: 'Người xem' }, items = [] } = {}) {
  const logs = [];
  let saves = 0;
  const context = vm.createContext({
    process, Set, URL, console,
    NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) },
    getToken: async () => token,
    getGallery: async () => ({ items }),
    resolveGalleryMinioFiles: async items => items,
    saveGallery: async () => { saves++; },
    auditGallery: async (...args) => logs.push(args),
    createNotification: () => {},
    sendMentionNotifications: async () => {},
    getUsers: async () => [],
  });
  const source = (await fs.readFile(file, 'utf8')).replace(/^import .*;\n/gm, '').replaceAll('export async function', 'async function');
  vm.runInContext(source, context);
  return { context, logs, saves: () => saves };
}
const params = { params: Promise.resolve({ id: 'post1' }) };
test('like and unlike record the authenticated actor and distinct actions', async () => {
  const { context, logs, saves } = await route('src/app/api/gallery/[id]/like/route.js', {
    items: [{ id: 'post1', title: 'Ảnh tập thể', likedBy: [] }],
  });
  await context.POST({}, params);
  await context.POST({}, params);
  assert.equal(saves(), 2);
  assert.equal(logs[0][0].id, 'viewer');
  assert.equal(logs[0][1], 'LIKE_GALLERY_POST');
  assert.equal(logs[1][1], 'UNLIKE_GALLERY_POST');
});
test('comment creation, edit and deletion each produce an audit event', async () => {
  const { context, logs } = await route('src/app/api/gallery/[id]/comment/route.js', { items: [{ id: 'post1', comments: [] }] });
  const created = await context.POST({ json: async () => ({ content: 'Ảnh đẹp' }) }, params);
  const commentId = created.data.comment.id;
  await context.PATCH({ json: async () => ({ commentId, content: 'Video đẹp' }) }, params);
  await context.DELETE({ url: `http://localhost/?commentId=${commentId}` }, params);
  assert.deepEqual(logs.map(log => log[1]), ['CREATE_GALLERY_COMMENT', 'UPDATE_GALLERY_COMMENT', 'DELETE_GALLERY_COMMENT']);
  assert.match(logs[1][3], /Video đẹp/);
});
test('activity endpoint restricts action codes and verifies file belongs to post', async () => {
  const { context, logs } = await route('src/app/api/gallery/[id]/activity/route.js', {
    items: [{ id: 'post1', files: [{ id: 'video1', type: 'video', fileName: 'clip.mp4' }] }],
  });
  for (const [body, status] of [
    [{ action: 'DELETE_GALLERY_POST' }, 400],
    [{ action: 'VIEW_GALLERY_MEDIA' }, 400],
    [{ action: 'DOWNLOAD_GALLERY_MEDIA', fileId: 'missing' }, 404],
    [{ action: 'PLAY_GALLERY_VIDEO', fileId: 'video1', adminId: 'forged' }, 200],
  ]) {
    const result = await context.POST({ json: async () => body }, params);
    assert.equal(result.status, status);
  }
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0].id, 'viewer');
  assert.match(logs[0][3], /clip.mp4/);
});
test('unauthenticated requests create no audit entries', async () => {
  const { context, logs } = await route('src/app/api/gallery/[id]/activity/route.js', { token: null });
  assert.equal((await context.POST({}, params)).status, 401);
  assert.equal(logs.length, 0);
});
test('batch actions reject edits to another employee’s post', async () => {
  const { context, logs, saves } = await route('src/app/api/gallery/batch/route.js', {
    items: [{ id: 'post1', uploader: { id: 'someone-else' } }],
  });
  const result = await context.POST({ json: async () => ({ action: 'delete', ids: ['post1'] }) });
  assert.equal(result.status, 403);
  assert.equal(logs.length, 0);
  assert.equal(saves(), 0);
});
