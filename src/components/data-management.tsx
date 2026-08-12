"use client";

import { useState, useTransition } from "react";
import { analyzeImportAction, confirmImportAction } from "@/app/actions/import";
import type { ImportDiffItem, ParsedExcelParty } from "@/lib/excel/service";
import {
  accountTypeLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";

export function DataManagementPanel() {
  const [diff, setDiff] = useState<ImportDiffItem[] | null>(null);
  const [parties, setParties] = useState<ParsedExcelParty[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await analyzeImportAction(formData);
        setDiff(result.diff);
        setParties(result.parties);
      } catch (err) {
        setError(err instanceof Error ? err.message : "解析失败");
      }
    });
  }

  function handleImport() {
    if (!diff) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const newRecords = diff
          .filter((item) => item.status === "new")
          .map((item) => ({
            ...item.record,
            rowNumber: item.rowNumber,
          }));

        const count = await confirmImportAction(newRecords, parties);

        setMessage(
          `成功导入 ${count} 条新记录${parties.length > 0 ? `，同步 ${parties.length} 个相关方` : ""}`,
        );
        setDiff(null);
        setParties([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "导入失败");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>导出 Excel</CardTitle>
        <p className="mt-2 text-sm text-stone-600">
          导出全部流水与相关方信息为 Excel 文件，含「相关方」「借还流水」两个工作表，便于人工校对和备份。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/export">
            <Button type="button">导出全部流水</Button>
          </a>
          <a href="/api/export/analysis">
            <Button type="button" variant="outline">
              导出 PDF 分析报告
            </Button>
          </a>
        </div>
      </Card>

      <Card>
        <CardTitle>导入 Excel</CardTitle>
        <p className="mt-2 text-sm text-stone-600">
          上传 Excel 文件后，系统会先展示新增/重复 diff；若文件含「相关方」工作表，确认导入时会同步相关方信息。
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleAnalyze(new FormData(event.currentTarget));
          }}
        >
          <div>
            <Label htmlFor="file">选择 Excel 文件</Label>
            <Input id="file" name="file" type="file" accept=".xlsx,.xls" required />
          </div>
          <Button type="submit" disabled={isPending}>
            解析并预览 diff
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {diff && (
          <div className="mt-6 space-y-4">
            {parties.length > 0 && (
              <p className="text-sm text-stone-600">
                已解析相关方 {parties.length} 个，确认导入时将一并写入或更新。
              </p>
            )}
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th className="px-4 py-3">行号</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">相关方</th>
                    <th className="px-4 py-3">类型</th>
                    <th className="px-4 py-3">借还</th>
                    <th className="px-4 py-3">金额</th>
                    <th className="px-4 py-3">日期</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((item) => (
                    <tr key={item.rowNumber} className="border-t border-stone-100">
                      <td className="px-4 py-3">{item.rowNumber}</td>
                      <td className="px-4 py-3">
                        {item.status === "new" ? "新增" : "重复"}
                      </td>
                      <td className="px-4 py-3">{item.record.partyName}</td>
                      <td className="px-4 py-3">
                        {accountTypeLabels[item.record.accountType]}
                      </td>
                      <td className="px-4 py-3">
                        {transactionTypeLabels[item.record.transactionType]}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(item.record.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(item.record.transactionDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleImport}
              disabled={isPending || diff.every((item) => item.status === "duplicate")}
            >
              确认导入新增记录
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
