import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  buildAnalysisFilename,
  buildAnalysisReport,
} from "@/lib/report/analysis";
import { generateAnalysisPdf } from "@/lib/report/pdf";
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

    const report = await buildAnalysisReport(user.id);
    const buffer = await generateAnalysisPdf(report);
    const filename = buildAnalysisFilename(report.generatedAt);

    void (async () => {
      try {
        const exportDir = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "exports");
        await mkdir(exportDir, { recursive: true });
        await writeFile(path.join(exportDir, filename), buffer);
      } catch (error) {
        logApi("warn", "export.analysis_backup_failed", {
          path: "/api/export/analysis",
          message:
            error instanceof Error
              ? error.message
              : "本地备份失败（可能文件正被占用）",
        });
      }
    })();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    logApi("error", "export.analysis_failed", {
      path: "/api/export/analysis",
      message: error instanceof Error ? error.message : "导出 PDF 失败",
    });
    return NextResponse.json({ error: "导出 PDF 失败" }, { status: 500 });
  }
}
