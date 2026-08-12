import ExcelJS from "exceljs";
import type { PartyType } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  accountTypeLabels,
  parseAccountType,
  parseRepaymentPlan,
  parseTransactionType,
  partyTypeLabels,
  repaymentPlanLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { createRecord } from "@/lib/ledger/service";
import { findOrCreatePartyForImport, parsePartyType } from "@/lib/party/service";
import type { RecordInput } from "@/lib/ledger/types";
import { decimalToNumber, formatDate } from "@/lib/utils";

const PARTY_SHEET_NAME = "相关方";
const RECORD_SHEET_NAME = "借还流水";

const PARTY_HEADERS = ["名称", "类型", "备注"] as const;

const RECORD_HEADERS = [
  "记账类型",
  "相关方名称",
  "借还类型",
  "金额",
  "款项日期",
  "转账方式",
  "用途/备注",
  "是否计息",
  "约定还款方式",
] as const;

export interface ParsedExcelParty {
  rowNumber: number;
  name: string;
  partyType: PartyType;
  note?: string;
}

export interface ParsedExcelRecord extends RecordInput {
  rowNumber: number;
}

export interface ParsedExcelData {
  parties: ParsedExcelParty[];
  records: ParsedExcelRecord[];
}

export interface ImportDiffItem {
  rowNumber: number;
  status: "new" | "duplicate";
  record: RecordInput;
  message: string;
}

export interface ImportAnalysisResult {
  parties: ParsedExcelParty[];
  diff: ImportDiffItem[];
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

function parseYesNo(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim();
  return text === "是" || text.toLowerCase() === "true";
}

function parseAmount(value: unknown): number {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error(`无效金额: ${value}`);
  }
  return amount;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  const text = String(value ?? "").trim();
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`无效日期: ${value}`);
  }
  return date;
}

function recordKey(record: RecordInput): string {
  return [
    record.accountType,
    record.partyName.trim(),
    record.transactionType,
    record.amount.toFixed(2),
    record.transactionDate.toISOString().slice(0, 10),
    record.transferMethod ?? "",
    record.purpose ?? "",
  ].join("|");
}

function findWorksheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((sheet) => sheet.name === name);
}

function resolveRecordSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const namedSheet = findWorksheet(workbook, RECORD_SHEET_NAME);
  if (namedSheet) {
    return namedSheet;
  }

  if (workbook.worksheets.length === 1) {
    return workbook.worksheets[0]!;
  }

  const fallback = workbook.worksheets.find((sheet) => sheet.name !== PARTY_SHEET_NAME);
  if (fallback) {
    return fallback;
  }

  throw new Error("Excel 文件中找不到借还流水工作表");
}

function parsePartySheet(sheet: ExcelJS.Worksheet): ParsedExcelParty[] {
  const parsed: ParsedExcelParty[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values as unknown[];
    const cells = values.slice(1);
    if (cells.every((cell) => cell === null || cell === undefined || cell === "")) {
      return;
    }

    const name = String(cells[0] ?? "").trim();
    if (!name) {
      throw new Error(`相关方表第 ${rowNumber} 行名称不能为空`);
    }

    const partyType = parsePartyType(String(cells[1] ?? ""));
    if (!partyType) {
      throw new Error(`相关方表第 ${rowNumber} 行类型无效，请填写亲戚/朋友/机构/公司`);
    }

    const note = String(cells[2] ?? "").trim();

    parsed.push({
      rowNumber,
      name,
      partyType,
      note: note || undefined,
    });
  });

  return parsed;
}

function parseRecordSheet(sheet: ExcelJS.Worksheet): ParsedExcelRecord[] {
  const parsed: ParsedExcelRecord[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values as unknown[];
    const cells = values.slice(1);
    if (cells.every((cell) => cell === null || cell === undefined || cell === "")) {
      return;
    }

    const accountType = parseAccountType(String(cells[0] ?? ""));
    const transactionType = parseTransactionType(String(cells[2] ?? ""));
    const repaymentPlan = parseRepaymentPlan(String(cells[8] ?? "未约定"));

    if (!accountType || !transactionType) {
      throw new Error(`借还流水第 ${rowNumber} 行字段无效，请检查记账类型和借还类型`);
    }

    parsed.push({
      rowNumber,
      accountType,
      partyName: String(cells[1] ?? "").trim(),
      transactionType,
      amount: parseAmount(cells[3]),
      transactionDate: parseDate(cells[4]),
      transferMethod: String(cells[5] ?? "").trim() || undefined,
      purpose: String(cells[6] ?? "").trim() || undefined,
      hasInterest: parseYesNo(cells[7]),
      repaymentPlan: repaymentPlan ?? "UNSPECIFIED",
    });
  });

  return parsed;
}

export async function exportToExcel(userId: string): Promise<Buffer> {
  const [parties, records] = await Promise.all([
    prisma.party.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.record.findMany({
      where: { party: { userId } },
      include: { party: true },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const workbook = new ExcelJS.Workbook();

  const partySheet = workbook.addWorksheet(PARTY_SHEET_NAME);
  partySheet.addRow([...PARTY_HEADERS]);
  partySheet.getRow(1).font = { bold: true };
  for (const party of parties) {
    partySheet.addRow([
      party.name,
      partyTypeLabels[party.partyType],
      party.note ?? "",
    ]);
  }
  partySheet.columns = PARTY_HEADERS.map(() => ({ width: 18 }));

  const recordSheet = workbook.addWorksheet(RECORD_SHEET_NAME);
  recordSheet.addRow([...RECORD_HEADERS]);
  recordSheet.getRow(1).font = { bold: true };
  for (const record of records) {
    recordSheet.addRow([
      accountTypeLabels[record.accountType],
      record.party.name,
      transactionTypeLabels[record.transactionType],
      decimalToNumber(record.amount),
      formatDate(record.transactionDate),
      record.transferMethod ?? "",
      record.purpose ?? "",
      yesNo(record.hasInterest),
      repaymentPlanLabels[record.repaymentPlan],
    ]);
  }
  recordSheet.columns = RECORD_HEADERS.map(() => ({ width: 18 }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function parseExcel(buffer: Buffer): Promise<ParsedExcelData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  if (workbook.worksheets.length === 0) {
    throw new Error("Excel 文件中没有工作表");
  }

  const partySheet = findWorksheet(workbook, PARTY_SHEET_NAME);
  const recordSheet = resolveRecordSheet(workbook);

  return {
    parties: partySheet ? parsePartySheet(partySheet) : [],
    records: parseRecordSheet(recordSheet),
  };
}

export async function importParties(
  userId: string,
  parties: Array<Omit<ParsedExcelParty, "rowNumber">>,
): Promise<number> {
  let count = 0;

  for (const party of parties) {
    const name = party.name.trim();
    if (!name) continue;

    await prisma.party.upsert({
      where: {
        userId_name: { userId, name },
      },
      update: {
        partyType: party.partyType,
        note: party.note?.trim() || null,
      },
      create: {
        userId,
        name,
        partyType: party.partyType,
        note: party.note?.trim() || null,
      },
    });
    count += 1;
  }

  return count;
}

export async function diffWithDatabase(
  userId: string,
  parsed: ParsedExcelRecord[],
): Promise<ImportDiffItem[]> {
  const existing = await prisma.record.findMany({
    where: { party: { userId } },
    include: { party: true },
  });

  const existingKeys = new Set(
    existing.map((record) =>
      recordKey({
        accountType: record.accountType,
        partyName: record.party.name,
        transactionType: record.transactionType,
        amount: decimalToNumber(record.amount),
        transactionDate: record.transactionDate,
        transferMethod: record.transferMethod ?? undefined,
        purpose: record.purpose ?? undefined,
      }),
    ),
  );

  return parsed.map((item) => {
    const key = recordKey(item);
    const duplicate = existingKeys.has(key);

    return {
      rowNumber: item.rowNumber,
      status: duplicate ? "duplicate" : "new",
      record: item,
      message: duplicate ? "与现有记录重复，将跳过" : "将新增",
    };
  });
}

export async function importRecords(
  userId: string,
  items: RecordInput[],
  parties: Array<Omit<ParsedExcelParty, "rowNumber">> = [],
): Promise<number> {
  await importParties(userId, parties);

  let count = 0;

  for (const item of items) {
    await findOrCreatePartyForImport(userId, item.partyName);
    await createRecord(userId, item);
    count += 1;
  }

  return count;
}

export function buildExportFilename(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `借还本账本_${stamp}.xlsx`;
}
