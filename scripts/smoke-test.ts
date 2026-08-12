import { createUserAccount } from "../src/lib/auth/service";
import {
  createRecord,
  deleteRecords,
  listRecords,
} from "../src/lib/ledger/service";
import { createParty } from "../src/lib/party/service";
import {
  coerceValidDate,
  parseDateInputValue,
  toDateInputValue,
} from "../src/lib/utils";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("=== 借还本 冒烟测试 (test 用户) ===");

  const { prisma } = await import("../src/lib/db/client");

  let testUser = await prisma.user.findUnique({ where: { username: "test" } });
  if (!testUser) {
    const created = await createUserAccount("test", "test-20260811");
    testUser = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    console.log("✓ 创建 test 用户");
  }

  const userId = testUser.id;

  // 1. 日期工具
  assert(toDateInputValue(new Date("2025-03-01")) === "2025-03-01", "toDateInputValue 正常日期");
  assert(toDateInputValue(new Date("invalid")) === toDateInputValue(new Date()), "toDateInputValue 非法日期回退");
  assert(parseDateInputValue("").getTime() > 0, "parseDateInputValue 空值回退");
  assert(parseDateInputValue("2025-06-15").toISOString().startsWith("2025-06-1"), "parseDateInputValue 合法值");
  assert(coerceValidDate(undefined).getTime() > 0, "coerceValidDate 空值");
  console.log("✓ 日期工具");

  // 2. 创建临时流水
  const marker = `冒烟测试-${Date.now()}`;
  await createParty(userId, { name: marker, partyType: "RELATIVE" });
  const created = await createRecord(userId, {
    accountType: "RECEIVABLE",
    transactionType: "BORROW",
    partyName: marker,
    amount: 1,
    transactionDate: new Date("2025-01-01"),
    purpose: "smoke-test",
  });
  console.log("✓ 创建临时流水", created.id);

  const listed = await listRecords(userId, { partyName: marker });
  assert(listed.length === 1, "listRecords 应找到 1 条");
  console.log("✓ 查询临时流水");

  // 3. 批量删除
  const deleted = await deleteRecords(userId, [created.id]);
  assert(deleted === 1, "deleteRecords 应删除 1 条");
  const afterDelete = await listRecords(userId, { partyName: marker });
  assert(afterDelete.length === 0, "删除后应无记录");
  console.log("✓ 批量删除");

  console.log("=== 全部通过 ===");
}

main()
  .catch((error) => {
    console.error("✗ 冒烟测试失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db/client");
    await prisma.$disconnect();
  });
