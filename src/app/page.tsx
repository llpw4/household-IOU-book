import { PartySummaryList } from "@/components/party-summary";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/service";
import { getPartySummaries, getSummary } from "@/lib/ledger/service";
import { formatCurrency } from "@/lib/utils";

export default async function HomePage() {
  const user = await requireUser();
  const [summary, parties] = await Promise.all([
    getSummary(user.id),
    getPartySummaries(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>总应收(欠我的)</CardTitle>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {formatCurrency(summary.totalReceivable)}
          </p>
        </Card>
        <Card>
          <CardTitle>总应付(我欠的)</CardTitle>
          <p className="mt-3 text-3xl font-bold text-amber-700">
            {formatCurrency(summary.totalPayable)}
          </p>
        </Card>
      </div>

      <PartySummaryList parties={parties} />
    </div>
  );
}
