import { DataManagementPanel } from "@/components/data-management";
import { requireUser } from "@/lib/auth/service";

export default async function DataSettingsPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">数据管理</h1>
        <p className="text-sm text-stone-500">Excel 导出校对与导入补录</p>
      </div>
      <DataManagementPanel />
    </div>
  );
}
