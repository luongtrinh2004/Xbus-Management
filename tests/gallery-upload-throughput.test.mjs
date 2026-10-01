import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('uploads two bounded chunks concurrently and reports exact cumulative bytes before completion', async () => {
 const source=(await fs.readFile('src/libs/galleryBackgroundUpload.js','utf8')).replaceAll('export ','');
 let active=0,max=0,completed=false;const events=[],sizes=[];
 class XHR {
  constructor(){this.upload={};this.status=200;}
  open(){} setRequestHeader(){}
  send(blob){active++;max=Math.max(max,active);sizes.push(blob.size);this.upload.onprogress({lengthComputable:true,loaded:blob.size});setTimeout(()=>{active--;this.onload();},5);}
 }
 const context=vm.createContext({XMLHttpRequest:XHR,CustomEvent:class{constructor(t,o){this.detail=o.detail;}},window:{addEventListener(){},dispatchEvent:e=>events.push(e.detail)},setTimeout,clearTimeout,AbortSignal,fetch:async()=>{assert.equal(active,0);completed=true;return {ok:true};}});
 vm.runInContext(source,context);
 await context.startGalleryBackgroundUpload('post',[{sessionId:'session',file:{size:250000001,slice:(start,end)=>({size:end-start})}}]);
 assert.equal(max,2);assert.deepEqual(sizes,[100000000,100000000,50000001]);assert.equal(completed,true);
 assert.equal(events.at(-1).uploadedBytes,250000001);assert.equal(events.at(-1).bytesPerSecond,0);assert.equal(events.at(-1).state,'processing');
 assert.ok(events.every(e=>e.uploadedBytes<=250000001));
});
test('resume skips committed chunks and rejects the wrong original without changing server state', async () => {
 const source=(await fs.readFile('src/libs/galleryBackgroundUpload.js','utf8')).replaceAll('export ','');
 const sizes=[],methods=[];
 class XHR { constructor(){this.upload={};this.status=200;} open(){} setRequestHeader(){} send(blob){sizes.push(blob.size);this.onload();} }
 const context=vm.createContext({XMLHttpRequest:XHR,CustomEvent:class{},window:{addEventListener(){},dispatchEvent(){}},setTimeout,clearTimeout,AbortSignal,fetch:async(url,opts)=>{methods.push(opts?.method||'GET');return {ok:true,json:async()=>({meta:{fileName:'original.mp4',size:150000000},state:'uploading',chunks:[0]})};}});
 vm.runInContext(source,context);
 const file={name:'original.mp4',size:150000000,slice:(a,b)=>({size:b-a})};
 await context.startGalleryBackgroundUpload('post',[{sessionId:'session',file,resume:true}]);
 assert.deepEqual(sizes,[50000000]);assert.deepEqual(methods,['GET','POST']);
 await assert.rejects(context.startGalleryBackgroundUpload('post',[{sessionId:'session',file:{...file,name:'wrong.mp4'},resume:true}]),/đúng file gốc/);
 assert.deepEqual(methods,['GET','POST','GET']);
});
test('stalled chunks are aborted and retried rather than waiting fifteen minutes', async()=>{
 const source=(await fs.readFile('src/libs/galleryBackgroundUpload.js','utf8')).replaceAll('export ','');
 let aborted=0,sent=0;
 class XHR {constructor(){this.upload={};this.status=200;}open(){}setRequestHeader(){}abort(){aborted++;}send(){if(++sent>1)this.onload();}}
 const ctx=vm.createContext({XMLHttpRequest:XHR,CustomEvent:class{},window:{addEventListener(){},dispatchEvent(){}},setTimeout:(fn,delay)=>setTimeout(fn,delay===90000?5:0),clearTimeout,AbortSignal,fetch:async()=>({ok:true})});
 vm.runInContext(source,ctx);
 await ctx.startGalleryBackgroundUpload('post',[{sessionId:'session',file:{size:10,slice:()=>({size:10})}}]);
 assert.equal(aborted,1);assert.equal(sent,2);
});
