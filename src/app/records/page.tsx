import Link from "next/link";
import { FlashToast } from "@/components/flash-toast";
import { RecordsTable } from "@/components/records-table";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/service";
import { listPartyNames, listRecords } from "@/lib/ledger/service";
import { RecordsFilter } from "@/components/records-filter";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    partyName?: string;
    accountType?: "RECEIVABLE" | "PAYABLE";
    year?: string;
    flash?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [records, partyNames] = await Promise.all([
    listRecords(user.id, {
      partyName: params.partyName,
      accountType: params.accountType,
      year: params.year ? Number(params.year) : undefined,
    }),
    listPartyNames(user.id),
  ]);

  return (
    <div className="space-y-6">
      <FlashToast flash={params.flash} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">流水列表</h1>
          <p className="text-sm text-stone-500">查看、筛选和管理全部借还流水</p>
        </div>
        <Link href="/records/new">
          <Button>记一笔</Button>
        </Link>
      </div>

      <RecordsFilter
        partyNames={partyNames}
        initialPartyName={params.partyName}
        initialAccountType={params.accountType}
        initialYear={params.year}
      />

      <Card>
        <CardTitle>全部流水（{records.length} 条）</CardTitle>
        <div className="mt-4">
          <RecordsTable records={records} />
        </div>
      </Card>
    </div>
  );
}
