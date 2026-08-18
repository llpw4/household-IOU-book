import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

const basePath = normalizeBasePath(process.env.BASE_PATH);

if (process.env.NODE_ENV === "production" && !basePath) {
  console.warn(
    "[next.config] BASE_PATH 未设置，应用将部署在域名根路径。子路径部署请在 build 前设置 BASE_PATH=/your-path",
  );
} else {
  console.log(`[next.config] basePath=${basePath || "(root)"}`);
}

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    BASE_PATH: basePath,
  },
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;
