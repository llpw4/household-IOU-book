import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");

export async function saveAttachment(
  recordId: string,
  filename: string,
  data: Buffer,
): Promise<string> {
  const safeName = filename.replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
  const dir = path.join(UPLOAD_ROOT, recordId);
  await mkdir(dir, { recursive: true });

  const localPath = path.join(dir, safeName);
  await writeFile(localPath, data);

  return path.relative(process.cwd(), localPath).replace(/\\/g, "/");
}

export function getAbsolutePath(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
}
