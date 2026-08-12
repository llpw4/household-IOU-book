import { rm } from "fs/promises";
import path from "path";
import { prisma } from "../src/lib/db/client";

async function main() {
  const [attachments, records, parties] = await Promise.all([
    prisma.attachment.deleteMany(),
    prisma.record.deleteMany(),
    prisma.party.deleteMany(),
  ]);

  const uploadRoot = path.join(process.cwd(), "uploads");
  try {
    await rm(uploadRoot, { recursive: true, force: true });
  } catch {
    // uploads 目录不存在时忽略
  }

  console.log("已清空全部数据：");
  console.log(`- 流水：${records.count} 条`);
  console.log(`- 对方：${parties.count} 个`);
  console.log(`- 凭证：${attachments.count} 个`);
  console.log("- 本地上传目录：uploads/");
}

main()
  .catch((error) => {
    console.error("清空失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
