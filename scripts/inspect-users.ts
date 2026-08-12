import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

import { prisma } from "../src/lib/db/client";

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const users = await prisma.user.findMany({
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });

  for (const user of users) {
    const parties = await prisma.party.findMany({
      where: { userId: user.id },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const recordCount = await prisma.record.count({
      where: { party: { userId: user.id } },
    });
    const receivable = await prisma.record.count({
      where: { party: { userId: user.id }, accountType: "RECEIVABLE" },
    });
    const payable = await prisma.record.count({
      where: { party: { userId: user.id }, accountType: "PAYABLE" },
    });

    console.log("");
    console.log(`${user.username}: 相关方 ${parties.length}，流水 ${recordCount}（应收 ${receivable}，应付 ${payable}）`);
    console.log(`  相关方: ${parties.map((p) => p.name).join("、") || "（无）"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
