import { RecordForm } from "@/components/record-form";
import { requireUser } from "@/lib/auth/service";
import { listPartyOptions } from "@/lib/party/service";

export default async function NewRecordPage() {
  const user = await requireUser();
  const parties = await listPartyOptions(user.id);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-stone-900">记一笔</h1>
        <p className="mt-1 text-sm text-stone-500">
          填写借还款信息，预览确认后入账
        </p>
      </div>
      <RecordForm parties={parties} returnTo="/records/new" />
    </div>
  );
}
