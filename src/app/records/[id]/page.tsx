import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetailView } from "@/components/record-detail";
import { requireUser } from "@/lib/auth/service";
import { getRecordById } from "@/lib/ledger/service";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const record = await getRecordById(user.id, id);

  if (!record) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/records" className="text-sm text-emerald-700 hover:underline">
          ← 返回流水列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">查看流水</h1>
        <p className="text-sm text-stone-500">只读查看本条借还流水详情</p>
      </div>

      <RecordDetailView record={record} />
    </div>
  );
}
