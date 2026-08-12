import Link from "next/link";
import { PartyManagementPanel } from "@/components/party-management-panel";
import { requireUser } from "@/lib/auth/service";
import { listParties } from "@/lib/party/service";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const returnTo =
    params.returnTo?.startsWith("/") ? params.returnTo : undefined;
  const parties = await listParties(user.id);

  return (
    <div className="space-y-6">
      <div>
        {returnTo ? (
          <Link href={returnTo} className="text-sm text-emerald-700 hover:underline">
            ← 返回记账
          </Link>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold text-stone-900">相关方管理</h1>
        <p className="text-sm text-stone-500">
          维护相关方名称与类型。记账时只能从已有相关方中选择。
        </p>
      </div>

      <PartyManagementPanel parties={parties} returnTo={returnTo} />
    </div>
  );
}
