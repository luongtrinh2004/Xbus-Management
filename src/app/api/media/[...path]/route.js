import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const imagesRoot = path.resolve(process.cwd(), "public", "images");
const allowedRoots = new Set(["avatars", "afternoon-tea"]);
const contentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_req, { params }) {
  const segments = (await params).path || [];
  if (
    !segments.length ||
    !allowedRoots.has(segments[0]) ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/"),
    )
  )
    return NextResponse.json(
      { error: "Đường dẫn ảnh không hợp lệ" },
      { status: 400 },
    );

  const filePath = path.resolve(imagesRoot, ...segments);
  if (!filePath.startsWith(`${imagesRoot}${path.sep}`))
    return NextResponse.json(
      { error: "Đường dẫn ảnh không hợp lệ" },
      { status: 400 },
    );

  try {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension];
    if (!contentType)
      return NextResponse.json(
        { error: "Định dạng ảnh không hỗ trợ" },
        { status: 415 },
      );

    const image = await fs.readFile(filePath);
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT")
      return NextResponse.json(
        { error: "Không tìm thấy ảnh" },
        { status: 404 },
      );
    console.error("[Media] GET error:", error);
    return NextResponse.json({ error: "Không thể tải ảnh" }, { status: 500 });
  }
}
