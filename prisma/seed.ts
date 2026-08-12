import { PrismaClient } from "@prisma/client";
import { createUserAccount } from "../src/lib/auth/service";

const prisma = new PrismaClient();

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.record.deleteMany();
  await prisma.party.deleteMany();
  await prisma.user.deleteMany();

  const testSeed = await createUserAccount("testSeed", "testSeed-20260811");
  await createUserAccount("test", "test-20260811");

  const zhangsan = await prisma.party.create({
    data: { userId: testSeed.id, name: "张三", partyType: "RELATIVE" },
  });
  const lisi = await prisma.party.create({
    data: { userId: testSeed.id, name: "李四", partyType: "FRIEND" },
  });
  const wangwu = await prisma.party.create({
    data: { userId: testSeed.id, name: "王五", partyType: "RELATIVE" },
  });
  const bank = await prisma.party.create({
    data: {
      userId: testSeed.id,
      name: "某银行",
      partyType: "ORGANIZATION",
      note: "房贷",
    },
  });
  const zhaoliu = await prisma.party.create({
    data: { userId: testSeed.id, name: "赵六", partyType: "RELATIVE" },
  });

  await prisma.record.createMany({
    data: [
      {
        accountType: "RECEIVABLE",
        transactionType: "BORROW",
        partyId: zhangsan.id,
        amount: 50000,
        transactionDate: new Date("2025-03-01"),
        transferMethod: "张三微信",
        purpose: "装修",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "REPAY",
        partyId: zhangsan.id,
        amount: 10000,
        transactionDate: new Date("2025-04-01"),
        transferMethod: "张三微信",
        purpose: "第一期还款",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "REPAY",
        partyId: zhangsan.id,
        amount: 8000,
        transactionDate: new Date("2025-05-01"),
        transferMethod: "张三支付宝",
        purpose: "第二期还款",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "BORROW",
        partyId: lisi.id,
        amount: 12000,
        transactionDate: new Date("2025-02-15"),
        transferMethod: "李四银行卡1234",
        purpose: "应急周转",
        repaymentPlan: "UNSPECIFIED",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "REPAY",
        partyId: lisi.id,
        amount: 5000,
        transactionDate: new Date("2025-06-10"),
        transferMethod: "李四微信",
        purpose: "部分还款",
        repaymentPlan: "UNSPECIFIED",
      },
      {
        accountType: "PAYABLE",
        transactionType: "BORROW",
        partyId: bank.id,
        amount: 200000,
        transactionDate: new Date("2024-12-20"),
        transferMethod: "某银行银行卡5678",
        purpose: "家庭装修贷款",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "PAYABLE",
        transactionType: "REPAY",
        partyId: bank.id,
        amount: 15000,
        transactionDate: new Date("2025-01-20"),
        transferMethod: "某银行银行卡5678",
        purpose: "月供",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "PAYABLE",
        transactionType: "REPAY",
        partyId: bank.id,
        amount: 15000,
        transactionDate: new Date("2025-02-20"),
        transferMethod: "某银行银行卡5678",
        purpose: "月供",
        repaymentPlan: "INSTALLMENT",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "BORROW",
        partyId: wangwu.id,
        amount: 8000,
        transactionDate: new Date("2024-08-01"),
        transferMethod: "王五微信",
        purpose: "临时周转",
        repaymentPlan: "LUMP_SUM",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "BORROW",
        partyId: wangwu.id,
        amount: 6000,
        transactionDate: new Date("2025-07-01"),
        transferMethod: "王五微信",
        purpose: "子女学费",
        repaymentPlan: "UNSPECIFIED",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "BORROW",
        partyId: zhaoliu.id,
        amount: 3000,
        transactionDate: new Date("2025-07-10"),
        transferMethod: "赵六微信",
        purpose: "短期借用",
        repaymentPlan: "LUMP_SUM",
      },
      {
        accountType: "RECEIVABLE",
        transactionType: "REPAY",
        partyId: zhaoliu.id,
        amount: 1000,
        transactionDate: new Date("2025-07-15"),
        transferMethod: "赵六微信",
        purpose: "部分归还",
        repaymentPlan: "LUMP_SUM",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
