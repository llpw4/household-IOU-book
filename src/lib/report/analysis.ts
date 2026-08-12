import type { AccountType, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { decimalToNumber } from "@/lib/utils";
import { computeBalanceDelta } from "@/lib/ledger/service";

export interface AnalysisRecord {
  accountType: AccountType;
  transactionType: TransactionType;
  amount: number;
  transactionDate: Date;
  partyName: string;
  purpose: string | null;
  hasInterest: boolean;
}

export interface PartyDetail {
  name: string;
  netReceivable: number;
  netPayable: number;
  borrowCount: number;
  repayCount: number;
  totalBorrow: number;
  totalRepay: number;
  lastActivity: string;
  status: "已结清" | "有借无还" | "部分回款" | "持续负债";
}

export interface YearSummary {
  year: number;
  borrow: number;
  repay: number;
  count: number;
}

export interface AnalysisReport {
  generatedAt: Date;
  overview: {
    recordCount: number;
    partyCount: number;
    totalReceivable: number;
    totalPayable: number;
    netPosition: number;
    dateFrom: string;
    dateTo: string;
  };
  topReceivable: { name: string; amount: number }[];
  topPayable: { name: string; amount: number }[];
  partyDetails: PartyDetail[];
  byYear: YearSummary[];
  largestTransactions: {
    date: string;
    party: string;
    label: string;
    amount: number;
    purpose: string | null;
  }[];
  meta: {
    interestCount: number;
    withPurpose: number;
    attachmentCount: number;
  };
  insights: string[];
}

function classifyParty(detail: Omit<PartyDetail, "status">): PartyDetail["status"] {
  if (detail.netPayable > 0) return "持续负债";
  if (detail.netReceivable === 0 && detail.netPayable === 0) return "已结清";
  if (detail.repayCount === 0 && detail.netReceivable > 0) return "有借无还";
  if (detail.netReceivable > 0) return "部分回款";
  return "已结清";
}

function buildInsights(report: Omit<AnalysisReport, "insights" | "generatedAt">): string[] {
  const insights: string[] = [];
  const { overview, topReceivable, topPayable, partyDetails, byYear, meta } = report;

  insights.push(
    `整体净头寸为 ${formatMoney(overview.netPosition)} 元（净应收 ${formatMoney(overview.totalReceivable)}，净应付 ${formatMoney(overview.totalPayable)}），处于「${overview.netPosition >= 0 ? "净债权人" : "净债务人"}」状态。`,
  );

  if (topPayable.length === 1 && topPayable[0]!.amount === overview.totalPayable) {
    const bank = topPayable[0]!;
    const bankDetail = partyDetails.find((p) => p.name === bank.name);
    if (bankDetail && bankDetail.totalBorrow > 0) {
      const rate = ((bankDetail.totalRepay / bankDetail.totalBorrow) * 100).toFixed(1);
      insights.push(
        `全部净应付 ${formatMoney(bank.amount)} 元均来自「${bank.name}」，历史借款 ${formatMoney(bankDetail.totalBorrow)} 元，已还 ${formatMoney(bankDetail.totalRepay)} 元，还款率约 ${rate}%。`,
      );
    }
  }

  if (topReceivable.length > 0) {
    const top = topReceivable[0]!;
    const share = ((top.amount / overview.totalReceivable) * 100).toFixed(1);
    const detail = partyDetails.find((p) => p.name === top.name);
    insights.push(
      `应收端「${top.name}」占净应收 ${share}%（${formatMoney(top.amount)} 元）${detail ? `，末次流水 ${detail.lastActivity}` : ""}，集中度较高。`,
    );
  }

  const noRepay = partyDetails.filter((p) => p.status === "有借无还");
  if (noRepay.length > 0) {
    const total = noRepay.reduce((s, p) => s + p.netReceivable, 0);
    insights.push(
      `${noRepay.length} 个相关方有借无还，合计 ${formatMoney(total)} 元：${noRepay.map((p) => p.name).join("、")}。`,
    );
  }

  const y2026 = byYear.find((y) => y.year === 2026);
  if (y2026) {
    const netRepay = y2026.repay - y2026.borrow;
    if (netRepay > 0) {
      insights.push(
        `2026 年借 ${formatMoney(y2026.borrow)} 元、还 ${formatMoney(y2026.repay)} 元，净还债 ${formatMoney(netRepay)} 元，整体在降杠杆。`,
      );
    }
  }

  if (meta.attachmentCount === 0) {
    insights.push(`全部 ${overview.recordCount} 条流水均无凭证附件，建议为大额记录补充转账截图或借条。`);
  }

  return insights;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function buildAnalysisReport(userId: string): Promise<AnalysisReport> {
  const raw = await prisma.record.findMany({
    where: { party: { userId } },
    include: { party: true },
    orderBy: { transactionDate: "asc" },
  });

  const records: AnalysisRecord[] = raw.map((r) => ({
    accountType: r.accountType,
    transactionType: r.transactionType,
    amount: decimalToNumber(r.amount),
    transactionDate: r.transactionDate,
    partyName: r.party.name,
    purpose: r.purpose,
    hasInterest: r.hasInterest,
  }));

  const byParty = new Map<
    string,
    { receivable: number; payable: number; rows: AnalysisRecord[] }
  >();

  for (const record of records) {
    const delta = computeBalanceDelta(
      record.accountType,
      record.transactionType,
      record.amount,
    );
    const current = byParty.get(record.partyName) ?? {
      receivable: 0,
      payable: 0,
      rows: [],
    };
    current.receivable += delta.receivable;
    current.payable += delta.payable;
    current.rows.push(record);
    byParty.set(record.partyName, current);
  }

  let totalReceivable = 0;
  let totalPayable = 0;
  const topReceivable: { name: string; amount: number }[] = [];
  const topPayable: { name: string; amount: number }[] = [];

  for (const [name, value] of byParty) {
    const netReceivable = Math.max(0, value.receivable);
    const netPayable = Math.max(0, value.payable);
    totalReceivable += netReceivable;
    totalPayable += netPayable;
    if (netReceivable > 0) topReceivable.push({ name, amount: netReceivable });
    if (netPayable > 0) topPayable.push({ name, amount: netPayable });
  }

  topReceivable.sort((a, b) => b.amount - a.amount);
  topPayable.sort((a, b) => b.amount - a.amount);

  const byYearMap = new Map<number, YearSummary>();
  for (const record of records) {
    const year = record.transactionDate.getFullYear();
    const current = byYearMap.get(year) ?? { year, borrow: 0, repay: 0, count: 0 };
    current.count += 1;
    if (record.transactionType === "BORROW") current.borrow += record.amount;
    else current.repay += record.amount;
    byYearMap.set(year, current);
  }

  const partyDetails: PartyDetail[] = [...byParty.entries()]
    .map(([name, value]) => {
      const borrows = value.rows.filter((r) => r.transactionType === "BORROW");
      const repays = value.rows.filter((r) => r.transactionType === "REPAY");
      const base = {
        name,
        netReceivable: Math.max(0, value.receivable),
        netPayable: Math.max(0, value.payable),
        borrowCount: borrows.length,
        repayCount: repays.length,
        totalBorrow: borrows.reduce((sum, r) => sum + r.amount, 0),
        totalRepay: repays.reduce((sum, r) => sum + r.amount, 0),
        lastActivity: value.rows[value.rows.length - 1]!.transactionDate
          .toISOString()
          .slice(0, 10),
      };
      return { ...base, status: classifyParty(base) };
    })
    .sort(
      (a, b) =>
        b.netReceivable + b.netPayable - (a.netReceivable + a.netPayable),
    );

  const typeLabel = (accountType: AccountType, transactionType: TransactionType) => {
    const account = accountType === "RECEIVABLE" ? "应收" : "应付";
    const tx = transactionType === "BORROW" ? "借" : "还";
    return `${account}/${tx}`;
  };

  const largestTransactions = [...records]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((r) => ({
      date: r.transactionDate.toISOString().slice(0, 10),
      party: r.partyName,
      label: typeLabel(r.accountType, r.transactionType),
      amount: r.amount,
      purpose: r.purpose,
    }));

  const overview = {
    recordCount: records.length,
    partyCount: byParty.size,
    totalReceivable,
    totalPayable,
    netPosition: totalReceivable - totalPayable,
    dateFrom: records[0]?.transactionDate.toISOString().slice(0, 10) ?? "-",
    dateTo: records[records.length - 1]?.transactionDate.toISOString().slice(0, 10) ?? "-",
  };

  const meta = {
    interestCount: records.filter((r) => r.hasInterest).length,
    withPurpose: records.filter((r) => r.purpose?.trim()).length,
    attachmentCount: await prisma.attachment.count({
      where: { record: { party: { userId } } },
    }),
  };

  const partial = {
    overview,
    topReceivable,
    topPayable,
    partyDetails,
    byYear: [...byYearMap.values()].sort((a, b) => a.year - b.year),
    largestTransactions,
    meta,
  };

  return {
    generatedAt: new Date(),
    ...partial,
    insights: buildInsights(partial),
  };
}

export function buildAnalysisFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `借还本数据分析报告-${stamp}.pdf`;
}
