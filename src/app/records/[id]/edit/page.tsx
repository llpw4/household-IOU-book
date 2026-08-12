import { notFound, redirect } from "next/navigation";
import { removeRecordAction } from "@/app/actions/records";
import { RecordForm } from "@/components/record-form";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/service";
import { getRecordById } from "@/lib/ledger/service";
import { listPartyOptions } from "@/lib/party/service";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [record, parties] = await Promise.all([
    getRecordById(user.id, id),
    listPartyOptions(user.id),
  ]);

  if (!record) {
    notFound();
  }

  async function deleteRecord() {
    "use server";
    await removeRecordAction(id);
    redirect("/records?flash=deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">编辑流水</h1>
        <p className="text-sm text-stone-500">修改后仍需预览确认</p>
      </div>

      <RecordForm
        parties={parties}
        initialRecord={record}
        recordId={record.id}
        returnTo={`/records/${record.id}/edit`}
      />

      <Card>
        <CardTitle>删除流水</CardTitle>
        <p className="mt-2 text-sm text-stone-600">
          删除后不可恢复，请确认该记录确实需要移除。
        </p>
        <form action={deleteRecord} className="mt-4">
          <Button variant="destructive" type="submit">
            删除此流水
          </Button>
        </form>
      </Card>
    </div>
  );
}
