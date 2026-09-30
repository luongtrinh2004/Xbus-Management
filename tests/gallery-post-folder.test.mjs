import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
const source = (await fs.readFile('src/app/api/gallery/upload/route.js', 'utf8')).replace(/^import .*;\n/gm, '').replace('export async function', 'async function');
const postId = `post_${randomUUID()}`;
const files = Array.from({ length: 25 }, (_, index) => ({
  id: `media_${index}`, postId, type: index % 2 ? 'video' : 'image',
  filePath: `posts/${postId}/${index % 2 ? 'videos' : 'images'}/${index}.bin`,
  url: `/api/gallery/media/posts/${postId}/${index}.bin`, fileSize: 100,
}));
async function submit(body, existing = []) {
  let saved;
  const context = vm.createContext({
    process, console, randomUUID,
    NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) },
    getToken: async () => ({ id: 'user1' }), getUsers: async () => [],
    getGallery: async () => ({ items: existing }), saveGallery: async value => { saved = value; },
    auditGallery: async () => {}, sendMentionNotifications: async () => {},
  });
  vm.runInContext(source, context);
  const result = await context.POST({ headers: { get: () => 'application/json' }, json: async () => body });
  return { result, saved };
}
test('a post can finalize more than 20 mixed image/video files under one ID', async () => {
  const { result, saved } = await submit({ postId, uploadedFiles: files });
  assert.equal(result.status, 200);
  assert.equal(saved.items[0].id, postId);
  assert.equal(saved.items[0].files.length, 25);
  assert.equal(saved.items[0].hasImage, true);
  assert.equal(saved.items[0].hasVideo, true);
});
test('files belonging to another post cannot be attached', async () => {
  const { result, saved } = await submit({ postId, uploadedFiles: [{ ...files[0], postId: 'other' }] });
  assert.equal(result.status, 400);
  assert.equal(saved, undefined);
});
test('finalizing an existing post cannot duplicate it', async () => {
  const { result, saved } = await submit({ postId, uploadedFiles: files }, [{ id: postId }]);
  assert.equal(result.status, 409);
  assert.equal(saved, undefined);
});
