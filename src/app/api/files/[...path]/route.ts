import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getAbsolutePath } from "@/lib/storage/local";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { path: segments } = await context.params;
    const relativePath = segments.join("/");

    if (
      relativePath.includes("..") ||
      !relativePath.startsWith("uploads/")
    ) {
      return NextResponse.json({ error: "非法路径" }, { status: 400 });
    }

    const absolutePath = getAbsolutePath(relativePath);
    const data = await readFile(absolutePath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
