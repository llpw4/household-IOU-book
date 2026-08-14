import { describe, expect, it, beforeEach } from "vitest";
import path from "path";
import {
  BUNDLED_CHINESE_FONT,
  BUNDLED_CHINESE_FONT_TTF,
  getBundledChineseFontCandidates,
  isPdfKitCompatibleFontPath,
  loadChineseFontBuffer,
  resetChineseFontCacheForTests,
  resolveChineseFontPath,
} from "./chinese-font";

describe("resolveChineseFontPath", () => {
  it("prefers system font over bundled font", () => {
    const bundled = "/app/assets/fonts/NotoSansSC-Regular.woff";
    const system = "C:\\Windows\\Fonts\\simhei.ttf";

    expect(
      resolveChineseFontPath({
        bundledCandidates: [bundled],
        systemCandidates: [system],
        exists: (candidate) => candidate === bundled || candidate === system,
      }),
    ).toBe(system);
  });

  it("prefers bundled ttf over bundled woff", () => {
    const bundledTtf = "/app/assets/fonts/NotoSansSC-Regular.ttf";
    const bundledWoff = "/app/assets/fonts/NotoSansSC-Regular.woff";

    expect(
      resolveChineseFontPath({
        bundledCandidates: [bundledTtf, bundledWoff],
        systemCandidates: [],
        exists: (candidate) => candidate === bundledTtf || candidate === bundledWoff,
      }),
    ).toBe(bundledTtf);
  });

  it("falls back to bundled font when system font is missing", () => {
    const bundled = "/app/assets/fonts/NotoSansSC-Regular.woff";

    expect(
      resolveChineseFontPath({
        bundledCandidates: [bundled],
        systemCandidates: ["/missing/system.ttf"],
        exists: (candidate) => candidate === bundled,
      }),
    ).toBe(bundled);
  });

  it("skips ttc system fonts that pdfkit cannot subset", () => {
    const bundled = "/app/assets/fonts/NotoSansSC-Regular.woff";
    const ttc = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc";

    expect(isPdfKitCompatibleFontPath(ttc)).toBe(false);
    expect(
      resolveChineseFontPath({
        bundledCandidates: [bundled],
        systemCandidates: [ttc],
        exists: (candidate) => candidate === bundled || candidate === ttc,
      }),
    ).toBe(bundled);
  });

  it("throws when no font candidates exist", () => {
    expect(() =>
      resolveChineseFontPath({
        bundledCandidates: ["/missing/bundled.woff"],
        systemCandidates: ["/missing/system.ttf"],
        exists: () => false,
      }),
    ).toThrow(/assets\/fonts/);
  });

  it("builds bundled candidate paths from cwd", () => {
    expect(getBundledChineseFontCandidates("/srv/app")).toEqual([
      path.join("/srv/app", "assets", "fonts", BUNDLED_CHINESE_FONT_TTF),
      path.join("/srv/app", "assets", "fonts", BUNDLED_CHINESE_FONT),
      path.join("/srv/app", "public", "fonts", BUNDLED_CHINESE_FONT_TTF),
      path.join("/srv/app", "public", "fonts", BUNDLED_CHINESE_FONT),
    ]);
  });

  it("resolves an available chinese font on this machine", () => {
    const fontPath = resolveChineseFontPath();
    expect(fontPath.length).toBeGreaterThan(0);
  });
});

describe("loadChineseFontBuffer", () => {
  beforeEach(() => {
    resetChineseFontCacheForTests();
  });

  it("returns sfnt bytes directly for ttf sources", async () => {
    const ttf = Buffer.from("mock-ttf");
    let readCount = 0;

    const buffer = await loadChineseFontBuffer({
      bundledCandidates: ["/fonts/mock.ttf"],
      systemCandidates: [],
      exists: (candidate) => candidate === "/fonts/mock.ttf",
      readFile: () => {
        readCount += 1;
        return ttf;
      },
    });

    expect(buffer).toBe(ttf);
    expect(readCount).toBe(1);

    await loadChineseFontBuffer({
      bundledCandidates: ["/fonts/mock.ttf"],
      systemCandidates: [],
      exists: (candidate) => candidate === "/fonts/mock.ttf",
      readFile: () => {
        readCount += 1;
        return ttf;
      },
    });

    expect(readCount).toBe(1);
  });

  it("converts woff sources to sfnt once and caches the result", async () => {
    const woff = Buffer.from("mock-woff");
    const converted = Buffer.from("mock-sfnt");
    let convertCount = 0;

    const buffer = await loadChineseFontBuffer({
      bundledCandidates: ["/fonts/mock.woff"],
      systemCandidates: [],
      exists: (candidate) => candidate === "/fonts/mock.woff",
      readFile: () => woff,
      convertFont: async (raw, toFormat, fromFormat) => {
        convertCount += 1;
        expect(raw).toBe(woff);
        expect(toFormat).toBe("sfnt");
        expect(fromFormat).toBe("woff");
        return converted;
      },
    });

    expect(buffer).toBe(converted);
    expect(convertCount).toBe(1);

    await loadChineseFontBuffer({
      bundledCandidates: ["/fonts/mock.woff"],
      systemCandidates: [],
      exists: (candidate) => candidate === "/fonts/mock.woff",
      readFile: () => {
        throw new Error("should use cache");
      },
      convertFont: async () => {
        convertCount += 1;
        return converted;
      },
    });

    expect(convertCount).toBe(1);
  });
});
