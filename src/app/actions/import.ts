"use server";

import { requireUser } from "@/lib/auth/service";
import {
  diffWithDatabase,
  importRecords,
  parseExcel,
  type ImportAnalysisResult,
  type ParsedExcelParty,
  type ParsedExcelRecord,
} from "@/lib/excel/service";

export async function analyzeImportAction(
  formData: FormData,
): Promise<ImportAnalysisResult> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("请上传 Excel 文件");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { parties, records } = await parseExcel(buffer);

  return {
    parties,
    diff: await diffWithDatabase(user.id, records),
  };
}

export async function confirmImportAction(
  records: ParsedExcelRecord[],
  parties: ParsedExcelParty[] = [],
): Promise<number> {
  const user = await requireUser();
  const toImport = records.map(({ rowNumber: _rowNumber, ...record }) => record);
  const partyInput = parties.map(({ rowNumber: _rowNumber, ...party }) => party);
  return importRecords(user.id, toImport, partyInput);
}
