import { notFound } from "next/navigation";
import { RecordsTable } from "@/components/records-table";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/service";
import { getPartyBalance } from "@/lib/ledger/service";
import { formatCurrency } from "@/lib/utils";

function PartyBalanceCard({
  title,
  netAmount,
  borrowTotal,
  repayTotal,
  tone,
}: {
  title: string;
  netAmount: number;
  borrowTotal: number;
  repayTotal: number;
  tone: "receivable" | "payable";
}) {
  const netClassName =
    tone === "receivable" ? "text-emerald-700" : "text-amber-700";

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${netClassName}`}>
        {formatCurrency(netAmount)}
      </p>
      <dl className="mt-4 grid gap-2 border-t border-stone-100 pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-500">借款总额</dt>
          <dd className="font-medium tabular-nums text-stone-800">
            {formatCurrency(borrowTotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-500">还款总额</dt>
          <dd className="font-medium tabular-nums text-stone-800">
            {formatCurrency(repayTotal)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const user = await requireUser();
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const balance = await getPartyBalance(user.id, decodedName);

  if (!balance) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">借还明细-{balance.partyName}</h1>
        <p className="text-sm text-stone-500">按相关方查看借还往来明细</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PartyBalanceCard
          title="净应收(欠我的)"
          netAmount={balance.netReceivable}
          borrowTotal={balance.receivableBorrowTotal}
          repayTotal={balance.receivableRepayTotal}
          tone="receivable"
        />
        <PartyBalanceCard
          title="净应付(我欠的)"
          netAmount={balance.netPayable}
          borrowTotal={balance.payableBorrowTotal}
          repayTotal={balance.payableRepayTotal}
          tone="payable"
        />
      </div>

      <Card>
        <CardTitle>往来明细</CardTitle>
        <div className="mt-4">
          <RecordsTable records={balance.records} />
        </div>
      </Card>
    </div>
  );
}
