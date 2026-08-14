import { existsSync, readFileSync } from "fs";
import fontverter from "fontverter";
import path from "path";

export const BUNDLED_CHINESE_FONT = "NotoSansSC-Regular.woff";
export const BUNDLED_CHINESE_FONT_TTF = "NotoSansSC-Regular.ttf";

/** pdfkit/fontkit cannot subset TrueType Collection (.ttc) fonts. */
export function isPdfKitCompatibleFontPath(fontPath: string): boolean {
  const ext = path.extname(fontPath).toLowerCase();
  return ext === ".ttf" || ext === ".otf" || ext === ".woff" || ext === ".woff2";
}

export function getBundledChineseFontCandidates(cwd = process.cwd()): string[] {
  return [
    path.join(cwd, "assets", "fonts", BUNDLED_CHINESE_FONT_TTF),
    path.join(cwd, "assets", "fonts", BUNDLED_CHINESE_FONT),
    path.join(cwd, "public", "fonts", BUNDLED_CHINESE_FONT_TTF),
    path.join(cwd, "public", "fonts", BUNDLED_CHINESE_FONT),
  ];
}

export function getSystemChineseFontCandidates(
  windir = process.env.WINDIR,
): string[] {
  const windowsRoot = windir ?? "C:\\Windows";
  return [
    path.join(windowsRoot, "Fonts", "simhei.ttf"),
    path.join(windowsRoot, "Fonts", "msyh.ttf"),
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf",
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
    ...(options?.systemCandidates ?? getSystemChineseFontCandidates(options?.windir)),
    ...(options?.bundledCandidates ?? getBundledChineseFontCandidates(options?.cwd)),
  ];

  for (const candidate of candidates) {
    if (exists(candidate) && isPdfKitCompatibleFontPath(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "未找到可用的中文字体。请运行 npm install 或 npm run fonts:ensure 下载字体，或手动放置 assets/fonts/NotoSansSC-Regular.woff。",
  );
}

function detectFontContainerFormat(fontPath: string): "sfnt" | "woff" | "woff2" {
  if (fontPath.endsWith(".woff2")) return "woff2";
  if (fontPath.endsWith(".woff")) return "woff";
  return "sfnt";
}

let cachedFontBuffer: Buffer | null = null;
let loadingPromise: Promise<Buffer> | null = null;

export async function loadChineseFontBuffer(options?: {
  cwd?: string;
  windir?: string;
  bundledCandidates?: string[];
  systemCandidates?: string[];
  exists?: (candidate: string) => boolean;
  readFile?: (fontPath: string) => Buffer;
  convertFont?: (
    raw: Buffer,
    toFormat: "sfnt",
    fromFormat: "sfnt" | "woff" | "woff2",
  ) => Promise<Buffer>;
}): Promise<Buffer> {
  if (cachedFontBuffer) {
    return cachedFontBuffer;
  }

  if (!loadingPromise) {
    loadingPromise = prepareChineseFontBuffer(options).then((buffer) => {
      cachedFontBuffer = buffer;
      return buffer;
    });
  }

  return loadingPromise;
}

async function prepareChineseFontBuffer(options?: {
  cwd?: string;
  windir?: string;
  bundledCandidates?: string[];
  systemCandidates?: string[];
  exists?: (candidate: string) => boolean;
  readFile?: (fontPath: string) => Buffer;
  convertFont?: (
    raw: Buffer,
    toFormat: "sfnt",
    fromFormat: "sfnt" | "woff" | "woff2",
  ) => Promise<Buffer>;
}): Promise<Buffer> {
  const readFile = options?.readFile ?? ((fontPath: string) => readFileSync(fontPath));
  const convertFont =
    options?.convertFont ??
    ((raw, toFormat, fromFormat) => fontverter.convert(raw, toFormat, fromFormat));

  const fontPath = resolveChineseFontPath(options);
  const raw = readFile(fontPath);
  const format = detectFontContainerFormat(fontPath);

  if (format === "sfnt") {
    return raw;
  }

  return convertFont(raw, "sfnt", format);
}

export function resetChineseFontCacheForTests(): void {
  cachedFontBuffer = null;
  loadingPromise = null;
}
