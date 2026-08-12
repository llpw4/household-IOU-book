import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import path from "path";

const candidates = [
  "prisma/dev.db",
  "prisma/prisma/dev.db",
];

async function inspect(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    console.log(`[跳过] 不存在: ${relativePath}`);
    return;
  }

  process.env.DATABASE_URL = `file:${absolutePath.replace(/\\/g, "/")}`;
  const prisma = new PrismaClient();

  try {
    const [partyCount, recordCount, attachmentCount] = await Promise.all([
      prisma.party.count(),
      prisma.record.count(),
      prisma.attachment.count(),
    ]);

    console.log(`\n=== ${relativePath} ===`);
    console.log(`对方: ${partyCount} 个 | 流水: ${recordCount} 条 | 凭证: ${attachmentCount} 个`);

    if (partyCount > 0) {
      const parties = await prisma.party.findMany({ orderBy: { name: "asc" } });
      console.log("对方列表:", parties.map((p) => p.name).join("、"));
    }

    if (recordCount > 0) {
      const records = await prisma.record.findMany({
        include: { party: true },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      });

      console.log("\n流水明细:");
      for (const record of records) {
        const date = record.transactionDate.toISOString().slice(0, 10);
        console.log(
          `- ${date} | ${record.party.name} | ${record.accountType}/${record.transactionType} | ${Number(record.amount)} | ${record.purpose ?? "-"}`,
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const candidate of candidates) {
    await inspect(candidate);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
