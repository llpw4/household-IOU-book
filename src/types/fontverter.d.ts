declare module "fontverter" {
  type FontFormat = "sfnt" | "woff" | "woff2" | "truetype";

  export function detectFormat(buffer: Buffer): Exclude<FontFormat, "truetype">;

  export function convert(
    buffer: Buffer,
    toFormat: FontFormat,
    fromFormat?: FontFormat,
  ): Promise<Buffer>;

  const fontverter: {
    detectFormat: typeof detectFormat;
    convert: typeof convert;
  };

  export default fontverter;
}
