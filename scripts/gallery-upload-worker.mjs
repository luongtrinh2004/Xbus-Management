import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as Minio from 'minio';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import unzipper from 'unzipper';
import { createExtractorFromData } from 'node-unrar-js';
import sharp from 'sharp';
import convertHeic from 'heic-convert';

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', { maxRetriesPerRequest: null });
const bucket = process.env.MINIO_BUCKET || 'xbus-gallery';
const client = new Minio.Client({ endPoint: process.env.MINIO_ENDPOINT || 'minio', port: Number(process.env.MINIO_PORT || 9000), useSSL: process.env.MINIO_USE_SSL === 'true', accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER, secretKey: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD });
const images = new Set(['jpg','jpeg','jfif','png','gif','webp','avif','heic','heif','hif','tif','tiff','bmp','ico','svg','jxl','psd','dng','raw','cr2','cr3','nef','arw','orf','raf','rw2']);
const videos = new Set(['mp4','mov','webm','m4v','avi','mkv','mpeg','mpg','3gp','mts']);
const media = name => {
  const ext = path.extname(name).slice(1).toLowerCase();
  const type = videos.has(ext) ? 'video' : images.has(ext) ? 'image' : null;
  const mime = ({jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',tif:'image/tiff',mov:'video/quicktime',mkv:'video/x-matroska',avi:'video/x-msvideo'})[ext] || `${type}/${ext}`;
  return { ext, type, mime };
};
const worker = new Worker('gallery-upload', async job => {
  const { sessionId, ownerId, postId, fileName, totalChunks, sourceKey, size } = job.data;
  const stateKey = `gallery:upload:${sessionId}`;
  const progress = async value => { await job.updateProgress(value); await connection.hset(stateKey, 'state','processing','progress',String(value),'error',''); };
  await progress(1);
  await connection.hset(stateKey, 'readyFiles', '0', 'totalFiles', '0');
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(),'gallery-'));
  try {
    const sources = Array.from({length: totalChunks}, (_,i) => new Minio.CopySourceOptions({ Bucket:bucket, Object:`uploads/${ownerId}/${sessionId}/chunks/${String(i).padStart(8,'0')}` }));
    const direct = media(fileName);
    if (direct.type === 'video') {
      // Compose directly inside MinIO: no download to worker disk and re-upload.
      const clean = path.basename(fileName).replace(/[^\w.-]/g, '_');
      const key = `posts/${postId}/videos/${sessionId}_0_${clean}`;
      await client.composeObject(new Minio.CopyDestinationOptions({ Bucket: bucket, Object: key, Headers: { 'Content-Type': direct.mime } }), sources);
      await connection.hset(stateKey, 'state', 'completed', 'progress', '100', 'readyFiles', '1', 'totalFiles', '1');
      await connection.persist(stateKey);
      await job.updateProgress(100);
      try { await client.removeObjects(bucket, sources.map(source => source.Object)); } catch (error) { console.warn('Upload cleanup:', error.message); }
      return { files: [{ id: `media_${sessionId}_0`, fileName, type: 'video', url: `/api/gallery/media/${key}`, thumbnail: '', filePath: key, objectKey: key, storageType: 'minio', fileSize: size, fileFormat: direct.ext.toUpperCase(), postId }] };
    }
    await client.composeObject(new Minio.CopyDestinationOptions({ Bucket:bucket, Object:sourceKey }), sources);
    await progress(5);
    const sourcePath = path.join(temp,'source');
    await pipeline(await client.getObject(bucket,sourceKey),fs.createWriteStream(sourcePath));
    await progress(10);
    const extension = path.extname(fileName).toLowerCase();
    let entries;
    let totalFiles;
    if (extension === '.zip') {
      const zip = await unzipper.Open.file(sourcePath);
      entries = zip.files.filter(f => f.type === 'File' && media(f.path).type).map(f => ({ name:f.path, stream:()=>f.stream() }));
    } else if (extension === '.rar') {
      if (size > 512 * 1024 ** 2) throw Error('RAR trên 512 MB chưa hỗ trợ xử lý; vui lòng chuyển sang ZIP');
      const buffer = await fs.promises.readFile(sourcePath);
      const extractor = await createExtractorFromData({data:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)});
      const headers = [...extractor.getFileList().fileHeaders].filter(f=> !f.flags.directory && media(f.name).type);
      if (headers.reduce((n,f)=>n+f.unpSize,0)>512*1024**2) throw Error('Dung lượng giải nén RAR vượt 512 MB; vui lòng dùng ZIP');
      const { Readable } = await import('node:stream');
      totalFiles = headers.length;
      // Consume extraction lazily: publish each entry before extracting the next.
      entries = (function* () {
        for (const f of extractor.extract({files:headers.map(f=>f.name)}).files) {
          if (f.extraction) yield {name:f.fileHeader.name,stream:()=>Readable.from([Buffer.from(f.extraction)])};
        }
      })();
    } else entries = [{name:fileName,stream:()=>fs.createReadStream(sourcePath)}];
    totalFiles ??= entries.length;
    await connection.hset(stateKey, 'totalFiles', String(totalFiles));
    if (!totalFiles) throw Error('Không tìm thấy ảnh hoặc video trong tệp');
    let expanded = 0;
    const files = [];
    let i = 0;
    for (const entry of entries) {
      const info=media(entry.name);
      if (!info.type) throw Error('Định dạng không được hỗ trợ');
      const clean=path.basename(entry.name).replace(/[^\w.-]/g,'_');
      const key=`posts/${postId}/${info.type==='video'?'videos':'images'}/${sessionId}_${i}_${clean}`;
      const local=path.join(temp,'entry');
      const limit=new Transform({transform(chunk,enc,done){expanded+=chunk.length;done(expanded>20*1024**3?Error('Dung lượng giải nén vượt 20 GB'):null,chunk);}});
      await pipeline(entry.stream(),limit,fs.createWriteStream(local));
      const stat=await fs.promises.stat(local);
      await client.putObject(bucket,key,fs.createReadStream(local),stat.size,{'Content-Type':info.mime});
      let thumbnail='';
      if(info.type==='image' && stat.size<128*1024**2) {
        try {
          let input=local;
          if(['heic','heif','hif'].includes(info.ext)) input=Buffer.from(await convertHeic({buffer:await fs.promises.readFile(local),format:'JPEG',quality:.9}));
          const preview=await sharp(input).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
          const thumbKey=`posts/${postId}/thumbnails/thumb_${path.basename(key,path.extname(key))}.webp`;
          await client.putObject(bucket,thumbKey,preview,preview.length,{'Content-Type':'image/webp'});
          thumbnail=`/api/gallery/media/${thumbKey}`;
        } catch(error) { console.warn('Thumbnail:',error.message); }
      }
      files.push({id:`media_${sessionId}_${i}`,fileName:path.basename(entry.name),type:info.type,url:`/api/gallery/media/${key}`,thumbnail,filePath:key,objectKey:key,storageType:'minio',fileSize:stat.size,fileFormat:info.ext.toUpperCase(),postId});
      i++;
      await connection.hset(stateKey, 'readyFiles', String(i));
      await progress(10+Math.round(i/totalFiles*89));
    }
    await connection.hset(stateKey,'state','completed','progress','100');
    await connection.persist(stateKey);
    await job.updateProgress(100);
    // Cleanup is best effort after success; failure must not rerun a completed upload.
    try { await client.removeObjects(bucket,[sourceKey,...sources.map(s=>s.Object)]); } catch(error) { console.warn('Upload cleanup:',error.message); }
    return {files};
  } finally { await fs.promises.rm(temp,{recursive:true,force:true}); }
}, {connection,concurrency:1});
worker.on('failed',async(job,error)=>{
  console.error('[gallery worker]',job?.id,error);
  if(job) await connection.hset(`gallery:upload:${job.data.sessionId}`,'state',job.attemptsMade >= (job.opts.attempts || 1)?'failed':'processing','error',error.message).catch(console.error);
});
console.log('Gallery upload worker started');
