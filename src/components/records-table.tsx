"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeRecordsAction } from "@/app/actions/records";
import type { RecordWithParty } from "@/lib/ledger/types";
import {
  accountTypeLabels,
  repaymentPlanLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function RecordsTable({ records }: { records: RecordWithParty[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedIds.size;
  const allSelected = records.length > 0 && selectedCount === records.length;
  const someSelected = selectedCount > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(records.map((record) => record.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    if (selectedCount === 0) {
      return;
    }

    if (
      !window.confirm(
        `确定删除选中的 ${selectedCount} 条流水吗？删除后不可恢复。`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await removeRecordsAction([...selectedIds]);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
        暂无流水记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {someSelected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <span className="text-sm text-stone-700">
            已选 {selectedCount} 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setSelectedIds(new Set())}
            >
              取消选择
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleBulkDelete}
            >
              {isPending ? "删除中…" : "删除选中"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-600">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="全选"
                  checked={allSelected}
                  ref={(element) => {
                    if (element) {
                      element.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                />
              </th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">相关方</th>
              <th className="px-4 py-3">记账类型</th>
              <th className="px-4 py-3">借还</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">转账方式</th>
              <th className="px-4 py-3">备注</th>
              <th className="px-4 py-3">凭证</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={`border-t border-stone-100 ${
                  selectedIds.has(record.id) ? "bg-emerald-50/40" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${record.partyName} ${formatDate(record.transactionDate)} 流水`}
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleOne(record.id)}
                    className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(record.transactionDate)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/parties/${encodeURIComponent(record.partyName)}`}
                    className="text-emerald-700 hover:underline"
                  >
                    {record.partyName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {accountTypeLabels[record.accountType]}
                </td>
                <td className="px-4 py-3">
                  {transactionTypeLabels[record.transactionType]}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(record.amount)}
                </td>
                <td className="px-4 py-3">{record.transferMethod || "-"}</td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {record.purpose || "-"}
                </td>
                <td className="px-4 py-3">
                  {record.attachments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {record.attachments.map((file) => (
                        <a
                          key={file.id}
                          href={`/api/files/${file.localPath.split("/").map(encodeURIComponent).join("/")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline"
                        >
                          {file.filename}
                        </a>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/records/${record.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      查看
                    </Link>
                    <Link
                      href={`/records/${record.id}/edit`}
                      className="text-emerald-700 hover:underline"
                    >
                      编辑
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecordMeta({ record }: { record: RecordWithParty }) {
  return (
    <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
      <div>是否计息：{record.hasInterest ? "是" : "否"}</div>
      <div>约定还款：{repaymentPlanLabels[record.repaymentPlan]}</div>
    </div>
  );
}
