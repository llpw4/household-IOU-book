import { PrismaClient } from "@prisma/client";
import path from "path";

process.env.DATABASE_URL = `file:${path.join(process.cwd(), "prisma/prisma/dev.db").replace(/\\/g, "/")}`;

const prisma = new PrismaClient();

function n(v: unknown): number {
  return Number(v);
}

function fmt(v: number): string {
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Row = {
  accountType: "RECEIVABLE" | "PAYABLE";
  transactionType: "BORROW" | "REPAY";
  amount: number;
  transactionDate: Date;
  partyName: string;
  purpose: string | null;
  hasInterest: boolean;
  repaymentPlan: string;
};

function delta(r: Row) {
  const sign = r.transactionType === "BORROW" ? 1 : -1;
  if (r.accountType === "RECEIVABLE") return { receivable: sign * r.amount, payable: 0 };
  return { receivable: 0, payable: sign * r.amount };
}

async function main() {
  const raw = await prisma.record.findMany({
    include: { party: true },
    orderBy: { transactionDate: "asc" },
  });

  const records: Row[] = raw.map((r) => ({
    accountType: r.accountType,
    transactionType: r.transactionType,
    amount: n(r.amount),
    transactionDate: r.transactionDate,
    partyName: r.party.name,
    purpose: r.purpose,
    hasInterest: r.hasInterest,
    repaymentPlan: r.repaymentPlan,
  }));

  const byParty = new Map<string, { receivable: number; payable: number; rows: Row[] }>();
  for (const r of records) {
    const d = delta(r);
    const cur = byParty.get(r.partyName) ?? { receivable: 0, payable: 0, rows: [] };
    cur.receivable += d.receivable;
    cur.payable += d.payable;
    cur.rows.push(r);
    byParty.set(r.partyName, cur);
  }

  let totalReceivable = 0;
  let totalPayable = 0;
  const receivableParties: { name: string; amount: number }[] = [];
  const payableParties: { name: string; amount: number }[] = [];

  for (const [name, v] of byParty) {
    const nr = Math.max(0, v.receivable);
    const np = Math.max(0, v.payable);
    totalReceivable += nr;
    totalPayable += np;
    if (nr > 0) receivableParties.push({ name, amount: nr });
    if (np > 0) payableParties.push({ name, amount: np });
  }
  receivableParties.sort((a, b) => b.amount - a.amount);
  payableParties.sort((a, b) => b.amount - a.amount);

  const byYear = new Map<number, { borrow: number; repay: number; count: number }>();
  for (const r of records) {
    const y = r.transactionDate.getFullYear();
    const cur = byYear.get(y) ?? { borrow: 0, repay: 0, count: 0 };
    cur.count++;
    if (r.transactionType === "BORROW") cur.borrow += r.amount;
    else cur.repay += r.amount;
    byYear.set(y, cur);
  }

  const interestCount = records.filter((r) => r.hasInterest).length;
  const withPurpose = records.filter((r) => r.purpose?.trim()).length;

  const largest = [...records].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const netPosition = totalReceivable - totalPayable;

  console.log(JSON.stringify({
    overview: {
      recordCount: records.length,
      partyCount: byParty.size,
      totalReceivable,
      totalPayable,
      netPosition,
      dateRange: {
        from: records[0]?.transactionDate.toISOString().slice(0, 10),
        to: records[records.length - 1]?.transactionDate.toISOString().slice(0, 10),
      },
    },
    topReceivable: receivableParties,
    topPayable: payableParties,
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, ...v })),
    largestTransactions: largest.map((r) => ({
      date: r.transactionDate.toISOString().slice(0, 10),
      party: r.partyName,
      type: `${r.accountType}/${r.transactionType}`,
      amount: r.amount,
      purpose: r.purpose,
    })),
    meta: { interestCount, withPurpose, attachmentCount: await prisma.attachment.count() },
    partyDetails: [...byParty.entries()].map(([name, v]) => {
      const borrows = v.rows.filter((r) => r.transactionType === "BORROW");
      const repays = v.rows.filter((r) => r.transactionType === "REPAY");
      return {
        name,
        netReceivable: Math.max(0, v.receivable),
        netPayable: Math.max(0, v.payable),
        borrowCount: borrows.length,
        repayCount: repays.length,
        totalBorrow: borrows.reduce((s, r) => s + r.amount, 0),
        totalRepay: repays.reduce((s, r) => s + r.amount, 0),
        lastActivity: v.rows[v.rows.length - 1]?.transactionDate.toISOString().slice(0, 10),
      };
    }).sort((a, b) => (b.netReceivable + b.netPayable) - (a.netReceivable + a.netPayable)),
  }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
