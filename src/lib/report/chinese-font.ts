import { existsSync } from "fs";
import path from "path";

export const BUNDLED_CHINESE_FONT = "NotoSansSC-Regular.woff2";

export function getBundledChineseFontCandidates(cwd = process.cwd()): string[] {
  return [
    path.join(cwd, "assets", "fonts", BUNDLED_CHINESE_FONT),
    path.join(cwd, "public", "fonts", BUNDLED_CHINESE_FONT),
  ];
}

export function getSystemChineseFontCandidates(
  windir = process.env.WINDIR,
): string[] {
  const windowsRoot = windir ?? "C:\\Windows";
  return [
    path.join(windowsRoot, "Fonts", "simhei.ttf"),
    path.join(windowsRoot, "Fonts", "msyh.ttc"),
    path.join(windowsRoot, "Fonts", "simsun.ttc"),
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  ];
}

export function resolveChineseFontPath(options?: {
  cwd?: string;
  windir?: string;
  bundledCandidates?: string[];
  systemCandidates?: string[];
  exists?: (candidate: string) => boolean;
}): string {
  const exists = options?.exists ?? existsSync;
  const candidates = [
    ...(options?.bundledCandidates ?? getBundledChineseFontCandidates(options?.cwd)),
    ...(options?.systemCandidates ?? getSystemChineseFontCandidates(options?.windir)),
  ];

  for (const candidate of candidates) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "未找到可用的中文字体。请确认 assets/fonts/NotoSansSC-Regular.woff2 已随项目部署。",
  );
}
