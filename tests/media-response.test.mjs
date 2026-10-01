import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

const source = await readFile(new URL('../src/libs/mediaResponse.js', import.meta.url), 'utf8');
const { createMediaResponse, parseMediaRange } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const data = Buffer.from('0123456789');
async function respond(range, method = 'GET', extraHeaders = {}) {
  const calls = [];
  const req = new Request('http://localhost/video.mp4', {
    method, headers: { ...(range ? { Range: range } : {}), ...extraHeaders },
  });
  const response = await createMediaResponse(req, {
    size: data.length, contentType: 'video/mp4',
    getStream: range => {
      calls.push(range);
      return Readable.from([range ? data.subarray(range.start, range.end + 1) : data]);
    },
  });
  return { response, calls };
}

for (const [range, expected, contentRange] of [
  ['bytes=0-2', '012', 'bytes 0-2/10'],
  ['bytes=6-', '6789', 'bytes 6-9/10'],
  ['bytes=-3', '789', 'bytes 7-9/10'],
  ['bytes=7-99', '789', 'bytes 7-9/10'],
  ['bytes=-99', '0123456789', 'bytes 0-9/10'],
]) {
  test(`partial media: ${range}`, async () => {
    const { response, calls } = await respond(range);
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.equal(response.headers.get('Content-Length'), String(expected.length));
    assert.equal(await response.text(), expected);
    assert.equal(calls.length, 1);
  });
}
for (const range of ['bytes=10-', 'bytes=-0']) {
  test(`unsatisfiable range: ${range}`, async () => {
    const { response, calls } = await respond(range);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
    assert.equal(calls.length, 0);
  });
}
test('full GET and malformed/multiple ranges return a complete file', async () => {
  for (const range of [null, 'bytes=abc', 'bytes=8-3', 'bytes=0-1,4-5']) {
    const { response } = await respond(range);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '0123456789');
  }
});
test('HEAD advertises range support without opening a file stream', async () => {
  const { response, calls } = await respond('bytes=0-2', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Length'), '10');
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(await response.text(), '');
  assert.equal(calls.length, 0);
});
test('If-Range without a matching validator sends the full file', async () => {
  const { response } = await respond('bytes=0-2', 'GET', { 'If-Range': '"old"' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '0123456789');
});
test('empty files reject byte ranges', () => {
  assert.deepEqual(parseMediaRange('bytes=0-', 0), { unsatisfiable: true });
});
test('cancelling the response destroys the source stream', async () => {
  const stream = new Readable({ read() {} });
  const response = await createMediaResponse(new Request('http://localhost/video'), {
    size: 100, contentType: 'video/mp4', getStream: () => stream,
  });
  await response.body.cancel();
  assert.equal(stream.destroyed, true);
});

test('matching If-Range ETag streams only requested video bytes', async () => {
 const response = await createMediaResponse(new Request('http://localhost/video', {headers:{Range:'bytes=3-5','If-Range':'"video-version"'}}), {
  size:10,contentType:'video/mp4',etag:'"video-version"',getStream:range=>{
   assert.deepEqual(range,{start:3,end:5});return Readable.from([data.subarray(3,6)]);
  }
 });
 assert.equal(response.status,206);assert.equal(response.headers.get('etag'),'"video-version"');assert.equal(await response.text(),'345');
});
