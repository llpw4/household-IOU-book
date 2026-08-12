import Link from "next/link";
import type { PartySummaryItem } from "@/lib/ledger/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";

function buildReceivableList(parties: PartySummaryItem[]) {
  return parties
    .filter((party) => party.netReceivable > 0)
    .sort((a, b) => b.netReceivable - a.netReceivable);
}

function buildPayableList(parties: PartySummaryItem[]) {
  return parties
    .filter((party) => party.netPayable > 0)
    .sort((a, b) => b.netPayable - a.netPayable);
}

function PartyAmountTable({
  items,
  amountKey,
  amountLabel,
  emptyText,
  amountClassName,
}: {
  items: PartySummaryItem[];
  amountKey: "netReceivable" | "netPayable";
  amountLabel: string;
  emptyText: string;
  amountClassName: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-stone-500">
          <tr>
            <th className="py-2">相关方</th>
            <th className="py-2 text-right">{amountLabel}</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-6 text-center text-stone-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            items.map((party) => (
              <tr key={party.partyName} className="border-t border-stone-100">
                <td className="py-3">
                  <Link
                    href={`/parties/${encodeURIComponent(party.partyName)}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {party.partyName}
                  </Link>
                </td>
                <td className={`py-3 text-right font-medium tabular-nums ${amountClassName}`}>
                  {formatCurrency(party[amountKey])}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PartySummaryList({
  parties,
}: {
  parties: PartySummaryItem[];
}) {
  const receivableList = buildReceivableList(parties);
  const payableList = buildPayableList(parties);

  if (receivableList.length === 0 && payableList.length === 0) {
    return (
      <Card>
        <CardTitle>按相关方汇总</CardTitle>
        <p className="mt-3 text-sm text-stone-500">暂无相关方记录</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-900">按相关方汇总</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>应收列表(欠我的)</CardTitle>
          <div className="mt-4">
            <PartyAmountTable
              items={receivableList}
              amountKey="netReceivable"
              amountLabel="应收金额"
              emptyText="暂无应收记录"
              amountClassName="text-emerald-700"
            />
          </div>
        </Card>

        <Card>
          <CardTitle>应付列表(我欠的)</CardTitle>
          <div className="mt-4">
            <PartyAmountTable
              items={payableList}
              amountKey="netPayable"
              amountLabel="应付金额"
              emptyText="暂无负债记录"
              amountClassName="text-amber-700"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
