import { Readable } from "node:stream";

// Ignore unsupported/malformed ranges; reject valid ranges outside the file.
export function parseMediaRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix)) return null;
    if (suffix === 0 || size === 0) return { unsatisfiable: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (match[2] && end < start) return null;
    if (start >= size) return { unsatisfiable: true };
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

export async function createMediaResponse(req, { size, contentType, getStream }) {
  // Without a matching validator, If-Range must receive the full representation.
  const range = req.method === "HEAD" || req.headers.has("if-range")
    ? null : parseMediaRange(req.headers.get("range"), size);
  const headers = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (range?.unsatisfiable) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}`, "Content-Length": "0" },
    });
  }
  const length = range ? range.end - range.start + 1 : size;
  headers["Content-Length"] = String(length);
  if (range) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  let body = null;
  if (req.method !== "HEAD" && length > 0) {
    const stream = await getStream(range);
    // Native conversion propagates cancellation and applies backpressure.
    body = Readable.toWeb(stream, {
      strategy: { highWaterMark: 64 * 1024, size: chunk => chunk.length },
    });
  }
  return new Response(body, { status: range ? 206 : 200, headers });
}
