import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

const basePath = normalizeBasePath(process.env.BASE_PATH);

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    BASE_PATH: basePath,
  },
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;
