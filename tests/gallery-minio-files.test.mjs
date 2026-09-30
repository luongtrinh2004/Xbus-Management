import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const types = (await fs.readFile('src/libs/galleryMediaTypes.js','utf8')).replaceAll('export ', '');
const source = (await fs.readFile('src/libs/galleryMinioFiles.js','utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
const context=vm.createContext({createHash, MINIO_BUCKET:'test'});
vm.runInContext(types+source,context);
const post={id:'post_a',mediaSource:'minio',title:'Nội dung DB',files:[{id:'old',filePath:'posts/post_a/images/deleted.jpg'}]};
const client=objects=>({listObjectsV2:async function*(){yield* objects;}});
test('MinIO files replace stale database files and leave post text intact',async()=>{
 const objects=[{name:'posts/post_a/new.jpg',size:12,etag:'v1'},{name:'posts/post_a/videos/clip.mp4',size:34},{name:'posts/post_a/thumbnails/thumb_new.webp',size:2},{name:'posts/post_b/other.jpg',size:99}];
 const results=await context.resolveGalleryMinioFiles([post],client(objects));
 const [result]=results;
 assert.equal(result.title,post.title);assert.equal(result.files.length,2);assert.equal(result.fileSize,46);
 assert.equal(result.hasVideo,true);assert.equal(result.hasImage,true);assert.match(result.files[0].url,/v=v1/);
 assert.equal(result.files.some(f=>f.id==='old'),false);
 const discovered=results.find(item=>item.id==='post_b');
 assert.equal(discovered.files[0].fileName,'other.jpg');
 assert.equal(discovered.mediaSource,'minio');
});
test('empty folder means zero media, legacy posts remain unchanged',async()=>{
 const legacy={id:'legacy',url:'/old.jpg'};
 const results=await context.resolveGalleryMinioFiles([post,legacy],client([]));
 assert.equal(results[0].files.length,0);assert.equal(results[0].fileSize,0);assert.equal(results[1],legacy);
});
test('listing failure does not masquerade as an empty bucket',async()=>{
 await assert.rejects(context.resolveGalleryMinioFiles([post],{listObjectsV2:async function*(){throw Error('offline');}}),/offline/);
});
