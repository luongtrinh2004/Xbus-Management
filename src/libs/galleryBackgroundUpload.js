// This task lives outside the modal and continues during SPA navigation.
const CHUNK_SIZE = 100_000_000;
const active = new Set();
export const isGalleryUploadActive = postId => active.has(postId);
function emit(postId, sessionId, progress, state, error = '', metrics = {}) {
  window.dispatchEvent(new CustomEvent('gallery-upload-progress',{detail:{postId,sessionId,progress,state,error,...metrics}}));
}
async function retry(task) {
  let error;
  for(let attempt=0;attempt<3;attempt++) {
    try{return await task();}catch(e){error=e;await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
  }
  throw error;
}
function sendChunk(blob,sessionId,index,onProgress) {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',`/api/gallery/upload/chunk?sessionId=${encodeURIComponent(sessionId)}&index=${index}`);
    xhr.setRequestHeader('Content-Type','application/octet-stream');
    xhr.timeout=15*60*1000;
    let idle;
    const arm = () => { clearTimeout(idle); idle = setTimeout(() => {
      xhr.abort(); reject(Error('Không có tiến triển trong 90 giây. Chọn lại file gốc để tiếp tục.'));
    }, 90_000); };
    const done = fn => { clearTimeout(idle); fn(); };
    xhr.upload.onprogress=e=>{arm();if(e.lengthComputable)onProgress(e.loaded);};
    xhr.onload=()=>done(()=>{if(xhr.status>=200&&xhr.status<300)resolve();else {let message=`Upload lỗi HTTP ${xhr.status}`;try{message=JSON.parse(xhr.responseText).error||message;}catch{}reject(Error(message));}});
    xhr.onerror=()=>done(()=>reject(Error('Mất kết nối upload')));
    xhr.ontimeout=()=>done(()=>reject(Error('Upload hết thời gian chờ')));
    arm();
    xhr.send(blob);
  });
}
export async function startGalleryBackgroundUpload(postId, items) {
  if (active.has(postId)) throw Error("Bài đăng đang được tải lên trong tab này");
  active.add(postId);
  try {
    // Files are sequential; each file uses two concurrent 100 MB chunks.
    for(const item of items) {
      const {file,sessionId}=item;
      let validated = !item.resume;
      let lastProgress = 0;
      let lastBytes = 0;
      try {
        let existing = [];
        if (item.resume) {
          const response = await fetch(`/api/gallery/upload/chunk?sessionId=${encodeURIComponent(sessionId)}`, {signal:AbortSignal.timeout(45000)});
          const saved = await response.json();
          if (!response.ok) throw Error(saved.error);
          if (saved.meta.fileName !== file.name || saved.meta.size !== file.size) throw Error('Hãy chọn đúng file gốc (cùng tên và dung lượng)');
          if (['completed', 'processing'].includes(saved.state)) {
            emit(postId,sessionId,saved.state === 'completed' ? 100 : 70,saved.state,'',{uploadedBytes:file.size,totalBytes:file.size,bytesPerSecond:0});
            continue;
          }
          if (saved.state !== 'uploading') throw Error('Phiên upload đã lỗi hoặc hết hạn. Vui lòng tạo bài tải lên mới');
          existing = saved.chunks;
          validated = true;
        }
        const count=Math.ceil(file.size/CHUNK_SIZE);
        const loadedByChunk = Array.from({length:count}, (_,index) => existing.includes(index) ? Math.min(CHUNK_SIZE,file.size-index*CHUNK_SIZE) : 0);
        const initialBytes = loadedByChunk.reduce((sum,n)=>sum+n,0);
        const started = Date.now();
        let lastReport = 0;
        let nextIndex = 0;
        let stopped = false;
        const report = (force = false) => {
          const now = Date.now();
          if (!force && now - lastReport < 250) return;
          lastReport = now;
          const uploadedBytes = loadedByChunk.reduce((sum, bytes) => sum + bytes, 0);
          lastBytes = uploadedBytes;
          lastProgress = Math.min(70, Math.round(uploadedBytes / file.size * 70));
          emit(postId, sessionId, Math.min(70, Math.round(uploadedBytes / file.size * 70)), 'uploading', '', {
            uploadedBytes, totalBytes: file.size,
            bytesPerSecond: Math.max(0, uploadedBytes-initialBytes) / Math.max(1, (now - started) / 1000), measuredAt: now,
          });
        };
        // Two requests overlap network/server latency; each still carries at most 100 MB.
        const runners = Array.from({ length: Math.min(2, count) }, async () => {
          while (!stopped && nextIndex < count) {
            const index = nextIndex++;
            if (existing.includes(index)) continue;
            const offset = index * CHUNK_SIZE;
            const blob = file.slice(offset, Math.min(file.size, offset + CHUNK_SIZE));
            try {
              await retry(() => {
                loadedByChunk[index] = 0;
                return sendChunk(blob, sessionId, index, loaded => {
                  loadedByChunk[index] = Math.min(blob.size, loaded); report();
                });
              });
              loadedByChunk[index] = blob.size; report(true);
            } catch (error) { stopped = true; throw error; }
          }
        });
        const results = await Promise.allSettled(runners);
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
        await retry(async()=>{
          const response=await fetch('/api/gallery/upload/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId}),signal:AbortSignal.timeout(45000)});
          if(!response.ok)throw Error((await response.json()).error||'Không thể xếp hàng xử lý');
        });
        emit(postId,sessionId,70,'processing','',{uploadedBytes:file.size,totalBytes:file.size,bytesPerSecond:0,measuredAt:Date.now()});
        // Do not wait for BullMQ: upload the next file while worker processes this one.
      } catch(error) {
        if (!validated) throw error;
        emit(postId,sessionId,lastProgress,'uploading',error.message,{uploadedBytes:lastBytes,totalBytes:file.size,bytesPerSecond:0});
        await fetch('/api/gallery/upload/chunk',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId}),signal:AbortSignal.timeout(15000),keepalive:true}).catch(()=>{});
      }
    }
  } finally { active.delete(postId); }
}
if(typeof window!=='undefined') window.addEventListener('beforeunload',event=>{
  if(active.size){event.preventDefault();event.returnValue='';}
});
