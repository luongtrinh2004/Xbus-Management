import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as Minio from 'minio';
import unzipper from 'unzipper';
const source=(await fs.promises.readFile('scripts/gallery-upload-worker.mjs','utf8')).replace(/^import .*;\n/gm,'');

test('plain video is composed directly in MinIO without downloading or uploading its bytes again',async()=>{
 let processor, destination;
 const client={composeObject:async(dest)=>{destination=dest;},getObject:async()=>{throw Error('Video must not be downloaded');},putObject:async()=>{throw Error('Video must not be re-uploaded');},removeObjects:async()=>{}};
 class Worker{constructor(name,fn){processor=fn;}on(){}}
 class Redis{async hset(){}async persist(){}}
 const context=vm.createContext({Worker,IORedis:Redis,Minio:{...Minio,Client:class{constructor(){return client;}}},process:{env:{}},console:{log(){},warn(){},error(){}},path,os,fs,Buffer,Transform,pipeline,unzipper});
 vm.runInContext(source,context);
 const result=await processor({data:{sessionId:'session',ownerId:'owner',postId:'post_test',fileName:'clip.mp4',totalChunks:2,sourceKey:'source',size:130000000},updateProgress:async()=>{}});
 assert.equal(destination.Object,'posts/post_test/videos/session_0_clip.mp4');
 assert.equal(destination.Headers['Content-Type'],'video/mp4');
 assert.equal(result.files[0].fileSize,130000000);
});

test('ZIP publishes its first media before extracting the next entry or completing the job', async()=>{
 const {Readable}=await import('node:stream');
 let processor; const objects=new Map(),states=[];
 const client={composeObject:async()=>{},getObject:async()=>Readable.from(['archive']),removeObjects:async()=>{},putObject:async(bucket,key,stream)=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);objects.set(key,Buffer.concat(chunks));}};
 class Worker{constructor(name,fn){processor=fn;}on(){}}
 class Redis{async hset(...args){states.push(args);}async persist(){}}
 const zip={Open:{file:async()=>({files:[
  {type:'File',path:'first.mp4',stream:()=>Readable.from(['first'])},
  {type:'File',path:'second.mp4',stream:()=>{
   assert.equal(objects.get('posts/post/videos/session_0_first.mp4').toString(),'first');
   assert.ok(states.some(s=>s.includes('readyFiles')&&s.includes('1')));
   assert.ok(!states.some(s=>s.includes('completed')));
   return Readable.from(['second']);
  }}
 ]})}};
 vm.runInContext(source,vm.createContext({Worker,IORedis:Redis,Minio:{...Minio,Client:class{constructor(){return client;}}},process:{env:{}},console:{log(){},warn(){},error(){}},path,os,fs,Buffer,Transform,pipeline,unzipper:zip}));
 const result=await processor({data:{sessionId:'session',ownerId:'owner',postId:'post',fileName:'album.zip',totalChunks:1,sourceKey:'source',size:100},updateProgress:async()=>{}});
 assert.equal(result.files.length,2);assert.equal(objects.size,2);
});
