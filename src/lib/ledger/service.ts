import type {
  AccountType,
  Record,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { findPartyByName } from "@/lib/party/service";
import { decimalToNumber } from "@/lib/utils";
import type {
  AnnualChartPoint,
  AnnualChartResult,
  BalanceDelta,
  PartyBalanceResult,
  PartySummaryItem,
  PreviewResult,
  RecordFilter,
  RecordInput,
  RecordWithParty,
  SummaryResult,
} from "./types";

type RecordRow = Record & {
  party: { name: string };
  attachments: { id: string; filename: string; localPath: string }[];
};

function mapRecord(row: RecordRow): RecordWithParty {
  return {
    id: row.id,
    accountType: row.accountType,
    transactionType: row.transactionType,
    partyName: row.party.name,
    amount: decimalToNumber(row.amount),
    transactionDate: row.transactionDate,
    transferMethod: row.transferMethod,
    purpose: row.purpose,
    hasInterest: row.hasInterest,
    repaymentPlan: row.repaymentPlan,
    createdAt: row.createdAt,
    attachments: row.attachments,
  };
}

export function computeBalanceDelta(
  accountType: AccountType,
  transactionType: TransactionType,
  amount: number,
): BalanceDelta {
  const sign = transactionType === "BORROW" ? 1 : -1;

  if (accountType === "RECEIVABLE") {
    return { receivable: sign * amount, payable: 0 };
  }

  return { receivable: 0, payable: sign * amount };
}

function sumRecords(records: RecordWithParty[]): {
  receivable: number;
  payable: number;
} {
  return records.reduce(
    (acc, record) => {
      const delta = computeBalanceDelta(
        record.accountType,
        record.transactionType,
        record.amount,
      );
      return {
        receivable: acc.receivable + delta.receivable,
        payable: acc.payable + delta.payable,
      };
    },
    { receivable: 0, payable: 0 },
  );
}

function sumPartyBorrowRepayTotals(records: RecordWithParty[]): {
  receivableBorrowTotal: number;
  receivableRepayTotal: number;
  payableBorrowTotal: number;
  payableRepayTotal: number;
} {
  return records.reduce(
    (acc, record) => {
      if (record.accountType === "RECEIVABLE") {
        if (record.transactionType === "BORROW") {
          acc.receivableBorrowTotal += record.amount;
        } else {
          acc.receivableRepayTotal += record.amount;
        }
        return acc;
      }

      if (record.transactionType === "BORROW") {
        acc.payableBorrowTotal += record.amount;
      } else {
        acc.payableRepayTotal += record.amount;
      }

      return acc;
    },
    {
      receivableBorrowTotal: 0,
      receivableRepayTotal: 0,
      payableBorrowTotal: 0,
      payableRepayTotal: 0,
    },
  );
}

async function resolvePartyForRecord(userId: string, name: string) {
  return findPartyByName(userId, name);
}

async function fetchRecords(
  userId: string,
  filter: RecordFilter = {},
): Promise<RecordWithParty[]> {
  const where: {
    party: { userId: string; name?: string };
    accountType?: AccountType;
    transactionDate?: { gte: Date; lte: Date };
  } = {
    party: { userId },
  };

  if (filter.accountType) {
    where.accountType = filter.accountType;
  }

  if (filter.partyName) {
    where.party.name = filter.partyName.trim();
  }

  if (filter.year) {
    where.transactionDate = {
      gte: new Date(`${filter.year}-01-01`),
      lte: new Date(`${filter.year}-12-31T23:59:59.999`),
    };
  }

  const rows = await prisma.record.findMany({
    where,
    include: {
      party: true,
      attachments: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: filter.limit,
  });

  return rows.map(mapRecord);
}

export async function getSummary(userId: string): Promise<SummaryResult> {
  const records = await fetchRecords(userId);
  const totals = sumRecords(records);

  return {
    totalReceivable: Math.max(0, totals.receivable),
    totalPayable: Math.max(0, totals.payable),
  };
}

export async function getPartySummaries(
  userId: string,
): Promise<PartySummaryItem[]> {
  const parties = await prisma.party.findMany({
    where: { userId },
    include: {
      records: {
        include: { party: true, attachments: true },
        orderBy: { transactionDate: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return parties.map((party) => {
    const records = party.records.map((row) =>
      mapRecord(row as RecordRow),
    );
    const totals = sumRecords(records);

    return {
      partyName: party.name,
      netReceivable: Math.max(0, totals.receivable),
      netPayable: Math.max(0, totals.payable),
    };
  });
}

export async function getPartyBalance(
  userId: string,
  partyName: string,
): Promise<PartyBalanceResult | null> {
  const party = await prisma.party.findFirst({
    where: { userId, name: partyName.trim() },
  });

  if (!party) {
    return null;
  }

  const records = await fetchRecords(userId, { partyName });
  const totals = sumRecords(records);
  const borrowRepayTotals = sumPartyBorrowRepayTotals(records);

  return {
    partyName: party.name,
    netReceivable: Math.max(0, totals.receivable),
    netPayable: Math.max(0, totals.payable),
    ...borrowRepayTotals,
    records,
  };
}

function endOfYear(year: number): Date {
  return new Date(`${year}-12-31T23:59:59.999`);
}

function filterRecordsAsOfYear(
  records: RecordWithParty[],
  year: number,
): RecordWithParty[] {
  const cutoff = endOfYear(year);
  return records.filter((record) => record.transactionDate <= cutoff);
}

function aggregateByParty(records: RecordWithParty[]): {
  receivableTotal: number;
  payableTotal: number;
  receivableByParty: { partyName: string; amount: number }[];
  payableByParty: { partyName: string; amount: number }[];
} {
  const byPartyMap = new Map<
    string,
    { receivable: number; payable: number }
  >();

  for (const record of records) {
    const delta = computeBalanceDelta(
      record.accountType,
      record.transactionType,
      record.amount,
    );

    const current = byPartyMap.get(record.partyName) ?? {
      receivable: 0,
      payable: 0,
    };

    current.receivable += delta.receivable;
    current.payable += delta.payable;
    byPartyMap.set(record.partyName, current);
  }

  let receivableTotal = 0;
  let payableTotal = 0;
  const receivableByParty: { partyName: string; amount: number }[] = [];
  const payableByParty: { partyName: string; amount: number }[] = [];

  for (const [partyName, value] of byPartyMap.entries()) {
    const receivable = Math.max(0, value.receivable);
    const payable = Math.max(0, value.payable);

    receivableTotal += receivable;
    payableTotal += payable;

    if (receivable > 0) {
      receivableByParty.push({ partyName, amount: receivable });
    }

    if (payable > 0) {
      payableByParty.push({ partyName, amount: payable });
    }
  }

  receivableByParty.sort((a, b) =>
    a.partyName.localeCompare(b.partyName, "zh-CN"),
  );
  payableByParty.sort((a, b) =>
    a.partyName.localeCompare(b.partyName, "zh-CN"),
  );

  return {
    receivableTotal,
    payableTotal,
    receivableByParty,
    payableByParty,
  };
}

export async function getAnnualChartSeries(
  userId: string,
): Promise<AnnualChartPoint[]> {
  const records = await fetchRecords(userId);
  if (records.length === 0) {
    return [];
  }

  const years = new Set<number>();
  for (const record of records) {
    years.add(record.transactionDate.getFullYear());
  }

  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const minYear = sortedYears[0]!;
  const maxYear = Math.max(sortedYears[sortedYears.length - 1]!, currentYear);

  const points: AnnualChartPoint[] = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    const filtered = filterRecordsAsOfYear(records, year);
    const totals = sumRecords(filtered);

    points.push({
      year,
      receivableTotal: Math.max(0, totals.receivable),
      payableTotal: Math.max(0, totals.payable),
    });
  }

  return points;
}

export async function getAnnualChart(
  userId: string,
  year?: number,
): Promise<AnnualChartResult> {
  const targetYear = year ?? new Date().getFullYear();
  const records = filterRecordsAsOfYear(await fetchRecords(userId), targetYear);
  const aggregated = aggregateByParty(records);

  return {
    year: targetYear,
    receivableTotal: aggregated.receivableTotal,
    payableTotal: aggregated.payableTotal,
    receivableByParty: aggregated.receivableByParty,
    payableByParty: aggregated.payableByParty,
  };
}

export async function listRecords(
  userId: string,
  filter: RecordFilter = {},
): Promise<RecordWithParty[]> {
  return fetchRecords(userId, filter);
}

export async function previewRecord(
  userId: string,
  input: RecordInput,
  excludeRecordId?: string,
): Promise<PreviewResult> {
  const party = await resolvePartyForRecord(userId, input.partyName);
  const existing = await fetchRecords(userId, { partyName: party.name });
  const filtered = excludeRecordId
    ? existing.filter((item) => item.id !== excludeRecordId)
    : existing;

  const current = sumRecords(filtered);
  const delta = computeBalanceDelta(
    input.accountType,
    input.transactionType,
    input.amount,
  );

  const afterReceivable = current.receivable + delta.receivable;
  const afterPayable = current.payable + delta.payable;
  const warnings: string[] = [];

  if (afterReceivable < 0) {
    warnings.push("操作后应收余额将为负数，请核对是否记错方向或金额。");
  }

  if (afterPayable < 0) {
    warnings.push("操作后应付余额将为负数，请核对是否记错方向或金额。");
  }

  return {
    record: input,
    partyName: party.name,
    currentNetReceivable: Math.max(0, current.receivable),
    currentNetPayable: Math.max(0, current.payable),
    afterNetReceivable: Math.max(0, afterReceivable),
    afterNetPayable: Math.max(0, afterPayable),
    warnings,
  };
}

export async function createRecord(
  userId: string,
  input: RecordInput,
): Promise<RecordWithParty> {
  if (input.amount <= 0) {
    throw new Error("金额必须大于 0");
  }

  const party = await resolvePartyForRecord(userId, input.partyName);

  const row = await prisma.record.create({
    data: {
      accountType: input.accountType,
      transactionType: input.transactionType,
      partyId: party.id,
      amount: input.amount,
      transactionDate: input.transactionDate,
      transferMethod: input.transferMethod?.trim() || null,
      purpose: input.purpose?.trim() || null,
      hasInterest: input.hasInterest ?? false,
      repaymentPlan: input.repaymentPlan ?? "UNSPECIFIED",
    },
    include: {
      party: true,
      attachments: true,
    },
  });

  return mapRecord(row as RecordRow);
}

export async function updateRecord(
  userId: string,
  id: string,
  input: RecordInput,
): Promise<RecordWithParty> {
  if (input.amount <= 0) {
    throw new Error("金额必须大于 0");
  }

  const existing = await prisma.record.findFirst({
    where: { id, party: { userId } },
  });
  if (!existing) {
    throw new Error("流水不存在");
  }

  const party = await resolvePartyForRecord(userId, input.partyName);

  const row = await prisma.record.update({
    where: { id },
    data: {
      accountType: input.accountType,
      transactionType: input.transactionType,
      partyId: party.id,
      amount: input.amount,
      transactionDate: input.transactionDate,
      transferMethod: input.transferMethod?.trim() || null,
      purpose: input.purpose?.trim() || null,
      hasInterest: input.hasInterest ?? false,
      repaymentPlan: input.repaymentPlan ?? "UNSPECIFIED",
    },
    include: {
      party: true,
      attachments: true,
    },
  });

  return mapRecord(row as RecordRow);
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  const existing = await prisma.record.findFirst({
    where: { id, party: { userId } },
  });
  if (!existing) {
    throw new Error("流水不存在");
  }

  await prisma.record.delete({ where: { id } });
}

export async function deleteRecords(
  userId: string,
  ids: string[],
): Promise<number> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return 0;
  }

  const result = await prisma.record.deleteMany({
    where: { id: { in: uniqueIds }, party: { userId } },
  });

  return result.count;
}

export async function getRecordById(
  userId: string,
  id: string,
): Promise<RecordWithParty | null> {
  const row = await prisma.record.findFirst({
    where: { id, party: { userId } },
    include: {
      party: true,
      attachments: true,
    },
  });

  return row ? mapRecord(row as RecordRow) : null;
}

export async function listPartyNames(userId: string): Promise<string[]> {
  const parties = await prisma.party.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return parties.map((party) => party.name);
}
