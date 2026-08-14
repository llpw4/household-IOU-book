const { existsSync, mkdirSync, statSync, writeFileSync } = require("fs");
const path = require("path");

const FONT_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_PATH = path.join(FONT_DIR, "NotoSansSC-Regular.woff");
const MIN_SIZE = 500_000;

const FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.5/files/noto-sans-sc-chinese-simplified-400-normal.woff",
  "https://unpkg.com/@fontsource/noto-sans-sc@5.2.5/files/noto-sans-sc-chinese-simplified-400-normal.woff",
];

function hasValidFontFile() {
  if (!existsSync(FONT_PATH)) {
    return false;
  }
  return statSync(FONT_PATH).size >= MIN_SIZE;
}

async function downloadFont(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_SIZE) {
    throw new Error(`unexpected size ${buffer.length}`);
  }

  return buffer;
}

async function main() {
  if (process.env.SKIP_PDF_FONT_DOWNLOAD === "1") {
    console.log("[ensure-pdf-font] skipped (SKIP_PDF_FONT_DOWNLOAD=1)");
    return;
  }

  if (hasValidFontFile()) {
    console.log("[ensure-pdf-font] font already present");
    return;
  }

  mkdirSync(FONT_DIR, { recursive: true });

  for (const url of FONT_URLS) {
    try {
      console.log(`[ensure-pdf-font] downloading ${url}`);
      const buffer = await downloadFont(url);
      writeFileSync(FONT_PATH, buffer);
      console.log(`[ensure-pdf-font] saved ${buffer.length} bytes`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ensure-pdf-font] failed ${url}: ${message}`);
    }
  }

  console.warn(
    "[ensure-pdf-font] download failed; PDF export will use a system font if available",
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[ensure-pdf-font] error: ${message}`);
});
