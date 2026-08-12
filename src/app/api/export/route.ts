import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  buildExportFilename,
  exportToExcel,
} from "@/lib/excel/service";
import { logApi } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const buffer = await exportToExcel(user.id);
    const filename = buildExportFilename();

    try {
      const exportDir = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "exports");
      await mkdir(exportDir, { recursive: true });
      await writeFile(path.join(exportDir, filename), buffer);
    } catch (error) {
      logApi("warn", "export.excel_backup_failed", {
        path: "/api/export",
        message:
          error instanceof Error
            ? error.message
            : "本地备份失败（可能文件正被 Excel 打开）",
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    logApi("error", "export.excel_failed", {
      path: "/api/export",
      message: error instanceof Error ? error.message : "导出 Excel 失败",
    });
    return NextResponse.json({ error: "导出 Excel 失败" }, { status: 500 });
  }
}
