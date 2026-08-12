import Link from "next/link";
import type { RecordWithParty } from "@/lib/ledger/types";
import {
  accountTypeLabels,
  repaymentPlanLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { amountToChineseUppercase } from "@/lib/amount-format";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 py-3 last:border-b-0">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd
        className={`text-right ${emphasize ? "text-base font-semibold tabular-nums text-stone-900" : "font-medium text-stone-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function RecordDetailView({ record }: { record: RecordWithParty }) {
  const uppercaseAmount = amountToChineseUppercase(record.amount);

  return (
    <Card>
      <CardTitle>流水详情</CardTitle>
      <dl className="mt-4">
        <DetailRow label="日期" value={formatDate(record.transactionDate)} />
        <DetailRow
          label="相关方"
          value={record.partyName}
        />
        <DetailRow
          label="记账类型"
          value={accountTypeLabels[record.accountType]}
        />
        <DetailRow
          label="借还类型"
          value={transactionTypeLabels[record.transactionType]}
        />
        <DetailRow
          label="金额"
          value={formatCurrency(record.amount)}
          emphasize
        />
        {uppercaseAmount ? (
          <div className="border-b border-stone-100 py-2 text-right text-xs text-stone-500">
            {uppercaseAmount}
          </div>
        ) : null}
        <DetailRow label="转账方式" value={record.transferMethod || "-"} />
        <DetailRow label="用途/备注" value={record.purpose || "-"} />
        <DetailRow label="是否计息" value={record.hasInterest ? "是" : "否"} />
        <DetailRow
          label="约定还款"
          value={repaymentPlanLabels[record.repaymentPlan]}
        />
      </dl>

      <div className="mt-4 border-t border-stone-100 pt-4">
        <div className="text-sm font-medium text-stone-700">凭证</div>
        {record.attachments.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">无</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {record.attachments.map((file) => (
              <a
                key={file.id}
                href={`/api/files/${file.localPath.split("/").map(encodeURIComponent).join("/")}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-emerald-700 hover:underline"
              >
                {file.filename}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/records/${record.id}/edit`}>
          <Button>编辑</Button>
        </Link>
        <Link href={`/parties/${encodeURIComponent(record.partyName)}`}>
          <Button variant="outline">查看相关方流水列表</Button>
        </Link>
        <Link href="/records">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    </Card>
  );
}
