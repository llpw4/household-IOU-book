import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { exportToExcel, parseExcel } from "./service";
import { prisma } from "@/lib/db/client";
import { createUserAccount } from "@/lib/auth/service";

async function withTestUser<T>(
  fn: (userId: string) => Promise<T>,
): Promise<T> {
  const user = await createUserAccount(`excel-${Date.now()}`, "test-Excel1!");
  try {
    return await fn(user.id);
  } finally {
    await prisma.attachment.deleteMany({
      where: { record: { party: { userId: user.id } } },
    });
    await prisma.record.deleteMany({ where: { party: { userId: user.id } } });
    await prisma.party.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

describe("excel party sheet", () => {
  it("exports and parses 相关方 worksheet", async () => {
    await withTestUser(async (userId) => {
      await prisma.party.createMany({
        data: [
          { userId, name: "测试甲方", partyType: "RELATIVE", note: "表哥" },
          { userId, name: "测试银行", partyType: "ORGANIZATION", note: "房贷" },
        ],
      });

      const buffer = await exportToExcel(userId);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

      expect(workbook.getWorksheet("相关方")).toBeTruthy();
      expect(workbook.getWorksheet("借还流水")).toBeTruthy();

      const parsed = await parseExcel(buffer);
      expect(parsed.parties).toHaveLength(2);
      expect(parsed.parties[0]?.name).toBe("测试甲方");
      expect(parsed.parties[0]?.partyType).toBe("RELATIVE");
      expect(parsed.parties[1]?.name).toBe("测试银行");
    });
  });

  it("supports legacy single-sheet workbooks", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("借还流水");
    sheet.addRow([
      "记账类型",
      "相关方名称",
      "借还类型",
      "金额",
      "款项日期",
      "转账方式",
      "用途/备注",
      "是否计息",
      "约定还款方式",
    ]);
    sheet.addRow([
      "应收(欠我的)",
      "张三",
      "借",
      1000,
      "2025-01-01",
      "",
      "",
      "否",
      "未约定",
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseExcel(buffer);

    expect(parsed.parties).toHaveLength(0);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]?.partyName).toBe("张三");
  });
});
