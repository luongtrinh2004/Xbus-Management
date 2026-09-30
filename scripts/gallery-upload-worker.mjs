import { Worker } from "bullmq";
import IORedis from "ioredis";
import * as Minio from "minio";
import path from "node:path";
import unzipper from "unzipper";
import { createExtractorFromData } from "node-unrar-js";

const connection = new IORedis(process.env.REDIS_URL || "redis://redis:6379", { maxRetriesPerRequest: null });
const bucket = process.env.MINIO_BUCKET || "xbus-gallery";
const client = new Minio.Client({ endPoint: process.env.MINIO_ENDPOINT || "minio", port: Number(process.env.MINIO_PORT || 9000), useSSL: process.env.MINIO_USE_SSL === "true", accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "xbus_admin", secretKey: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "xbus_secret_password" });
const image = new Set(["jpg","jpeg","jfif","png","gif","webp","avif","heic","heif","tif","tiff","bmp","dng","raw","cr2","cr3","nef","arw"]);
const video = new Set(["mp4","mov","webm","m4v","avi","mkv","mpeg","mpg","3gp","mts"]);
const read = async key => { const stream = await client.getObject(bucket, key); const chunks=[]; for await(const c of stream) chunks.push(c); return Buffer.concat(chunks); };
const media = name => { const ext=path.extname(name).slice(1).toLowerCase(); return { ext, type: video.has(ext) ? "video" : image.has(ext) ? "image" : null, mime: video.has(ext) ? `video/${ext === "mov" ? "quicktime" : ext}` : image.has(ext) ? `image/${ext === "jpg" ? "jpeg" : ext}` : "" }; };
async function extract(name, buffer) { const ext=path.extname(name).slice(1).toLowerCase(); if(ext==="zip"){ const zip=await unzipper.Open.buffer(buffer); const out=[]; for(const f of zip.files) if(f.type==="File"&&media(f.path).type) out.push({name:f.path,buffer:await f.buffer()}); return out; } if(ext==="rar"){ const data=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength); const x=await createExtractorFromData({data}); const names=[...x.getFileList().fileHeaders].filter(h=>!h.flags.directory&&media(h.name).type).map(h=>h.name); return [...x.extract({files:names}).files].filter(f=>f.extraction).map(f=>({name:f.fileHeader.name,buffer:Buffer.from(f.extraction)})); } return [{name,buffer}]; }
const worker = new Worker("gallery-upload", async job => { await job.updateProgress(5); const source=await read(job.data.sourceKey); const entries=await extract(job.data.fileName,source); const files=[]; for(let i=0;i<entries.length;i++){ const entry=entries[i], info=media(entry.name); if(!info.type) continue; const clean=path.basename(entry.name).replace(/[^\w.-]/g,"_"); const key=`posts/${job.data.postId}/${info.type === "video" ? "videos" : "images"}/${Date.now()}_${i}_${clean}`; await client.putObject(bucket,key,entry.buffer,entry.buffer.length,{"Content-Type":info.mime}); files.push({id:`media_${Date.now()}_${i}`,fileName:path.basename(entry.name),type:info.type,url:`/api/gallery/media/${key}`,thumbnail:info.type==="image"?`/api/gallery/media/${key}`:"",filePath:key,objectKey:key,storageType:"minio",fileSize:entry.buffer.length,fileSizeFormatted:`${(entry.buffer.length/1024/1024).toFixed(2)} MB`,fileFormat:info.ext.toUpperCase(),postId:job.data.postId}); await job.updateProgress(Math.round(((i+1)/Math.max(entries.length,1))*95)); } await job.updateProgress(100); return {files}; }, { connection, concurrency: 1 });
worker.on("failed", (job, error) => console.error("[gallery worker]", job?.id, error));
console.log("Gallery upload worker started");
