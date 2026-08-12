import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createUserAccount } from "../auth/service";
import {
  computeBalanceDelta,
  createRecord,
  getAnnualChart,
  getPartyBalance,
  getSummary,
  previewRecord,
} from "./service";

const prisma = new PrismaClient();
let testUserId = "";

async function ensureParty(name: string) {
  await prisma.party.create({
    data: { userId: testUserId, name, partyType: "RELATIVE" },
  });
}

beforeEach(async () => {
  await prisma.attachment.deleteMany();
  await prisma.record.deleteMany();
  await prisma.party.deleteMany();
  await prisma.user.deleteMany();

  const user = await createUserAccount("test_ledger", "test-20260811");
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("computeBalanceDelta", () => {
  it("应收借 increases receivable", () => {
    expect(computeBalanceDelta("RECEIVABLE", "BORROW", 1000)).toEqual({
      receivable: 1000,
      payable: 0,
    });
  });

  it("应收还 decreases receivable", () => {
    expect(computeBalanceDelta("RECEIVABLE", "REPAY", 500)).toEqual({
      receivable: -500,
      payable: 0,
    });
  });

  it("应付借 increases payable", () => {
    expect(computeBalanceDelta("PAYABLE", "BORROW", 800)).toEqual({
      receivable: 0,
      payable: 800,
    });
  });
});

describe("LedgerService integration", () => {
  it("handles single borrow and repay", async () => {
    await ensureParty("张三");
    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "张三",
      amount: 10000,
      transactionDate: new Date("2025-03-01"),
    });

    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "REPAY",
      partyName: "张三",
      amount: 3000,
      transactionDate: new Date("2025-04-01"),
    });

    const summary = await getSummary(testUserId);
    expect(summary.totalReceivable).toBe(7000);
    expect(summary.totalPayable).toBe(0);

    const party = await getPartyBalance(testUserId, "张三");
    expect(party?.netReceivable).toBe(7000);
    expect(party?.receivableBorrowTotal).toBe(10000);
    expect(party?.receivableRepayTotal).toBe(3000);
    expect(party?.records).toHaveLength(2);
  });

  it("handles multiple borrows and mixed account types", async () => {
    await ensureParty("李四");
    await ensureParty("某银行");
    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "李四",
      amount: 5000,
      transactionDate: new Date("2025-01-10"),
    });

    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "李四",
      amount: 2000,
      transactionDate: new Date("2025-02-10"),
    });

    await createRecord(testUserId, {
      accountType: "PAYABLE",
      transactionType: "BORROW",
      partyName: "某银行",
      amount: 100000,
      transactionDate: new Date("2025-01-01"),
    });

    const summary = await getSummary(testUserId);
    expect(summary.totalReceivable).toBe(7000);
    expect(summary.totalPayable).toBe(100000);
  });

  it("aggregates cumulative annual chart by year-end", async () => {
    await ensureParty("王五");
    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "王五",
      amount: 4000,
      transactionDate: new Date("2024-06-01"),
    });

    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "王五",
      amount: 6000,
      transactionDate: new Date("2025-06-01"),
    });

    const chart2024 = await getAnnualChart(testUserId, 2024);
    expect(chart2024.receivableTotal).toBe(4000);

    const chart2025 = await getAnnualChart(testUserId, 2025);
    expect(chart2025.receivableTotal).toBe(10000);
  });

  it("warns when preview would make balance negative", async () => {
    await ensureParty("赵六");
    await createRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "BORROW",
      partyName: "赵六",
      amount: 1000,
      transactionDate: new Date("2025-05-01"),
    });

    const preview = await previewRecord(testUserId, {
      accountType: "RECEIVABLE",
      transactionType: "REPAY",
      partyName: "赵六",
      amount: 2000,
      transactionDate: new Date("2025-05-02"),
    });

    expect(preview.warnings.length).toBeGreaterThan(0);
    expect(preview.afterNetReceivable).toBe(0);
  });
});
