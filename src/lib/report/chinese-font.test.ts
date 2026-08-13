import { describe, expect, it } from "vitest";
import path from "path";
import {
  BUNDLED_CHINESE_FONT,
  getBundledChineseFontCandidates,
  resolveChineseFontPath,
} from "./chinese-font";

describe("resolveChineseFontPath", () => {
  it("prefers bundled font over system fonts", () => {
    const bundled = "/app/assets/fonts/NotoSansSC-Regular.woff2";
    const system = "C:\\Windows\\Fonts\\simhei.ttf";

    expect(
      resolveChineseFontPath({
        bundledCandidates: [bundled],
        systemCandidates: [system],
        exists: (candidate) => candidate === bundled || candidate === system,
      }),
    ).toBe(bundled);
  });

  it("falls back to system font when bundled font is missing", () => {
    const system = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc";

    expect(
      resolveChineseFontPath({
        bundledCandidates: ["/missing/bundled.woff2"],
        systemCandidates: [system],
        exists: (candidate) => candidate === system,
      }),
    ).toBe(system);
  });

  it("throws when no font candidates exist", () => {
    expect(() =>
      resolveChineseFontPath({
        bundledCandidates: ["/missing/bundled.woff2"],
        systemCandidates: ["/missing/system.ttf"],
        exists: () => false,
      }),
    ).toThrow(/assets\/fonts/);
  });

  it("builds bundled candidate paths from cwd", () => {
    expect(getBundledChineseFontCandidates("/srv/app")).toEqual([
      path.join("/srv/app", "assets", "fonts", BUNDLED_CHINESE_FONT),
      path.join("/srv/app", "public", "fonts", BUNDLED_CHINESE_FONT),
    ]);
  });

  it("resolves bundled font shipped with the app", () => {
    const fontPath = resolveChineseFontPath();
    expect(fontPath).toMatch(/NotoSansSC-Regular\.woff2$/);
  });
});
