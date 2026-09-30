import unzipper from "unzipper";
import { createExtractorFromData } from "node-unrar-js";
import { classifyGalleryMedia } from "./galleryMediaTypes";

const archiveExtensions = new Set(["zip", "rar"]);

export function isGalleryArchive(fileName = "") {
  return archiveExtensions.has(String(fileName).split(".").pop()?.toLowerCase());
}

export async function extractGalleryArchive(fileName, buffer) {
  const extension = String(fileName).split(".").pop()?.toLowerCase();
  if (extension === "zip") {
    const archive = await unzipper.Open.buffer(buffer);
    const files = [];
    let skippedFiles = 0;
    for (const entry of archive.files) {
      const media = classifyGalleryMedia({ name: entry.path, type: "" });
      if (entry.type === "File" && (media.isImage || media.isVideo)) {
        files.push({ name: entry.path, buffer: await entry.buffer() });
      } else if (entry.type === "File") {
        skippedFiles += 1;
      }
    }
    return { files, skippedFiles };
  }

  if (extension === "rar") {
    const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const extractor = await createExtractorFromData({ data });
    const list = extractor.getFileList();
    let skippedFiles = 0;
    const names = [...list.fileHeaders]
      .filter(header => !header.flags.directory && (() => {
        const media = classifyGalleryMedia({ name: header.name, type: "" });
        if (!media.isImage && !media.isVideo) skippedFiles += 1;
        return media.isImage || media.isVideo;
      })())
      .map(header => header.name);
    const extracted = extractor.extract({ files: names });
    const files = [...extracted.files]
      .filter(file => file.extraction)
      .map(file => ({ name: file.fileHeader.name, buffer: Buffer.from(file.extraction) }));
    return { files, skippedFiles };
  }

  throw new Error("Chỉ hỗ trợ tệp ZIP hoặc RAR");
}
