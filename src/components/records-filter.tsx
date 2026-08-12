"use client";

import { useRouter } from "next/navigation";
import { Label, Select } from "@/components/ui/field";
import { accountTypeLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function RecordsFilter({
  partyNames,
  initialPartyName,
  initialAccountType,
  initialYear,
}: {
  partyNames: string[];
  initialPartyName?: string;
  initialAccountType?: "RECEIVABLE" | "PAYABLE";
  initialYear?: string;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardTitle>筛选</CardTitle>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const params = new URLSearchParams();

          const partyName = String(formData.get("partyName") ?? "").trim();
          const accountType = String(formData.get("accountType") ?? "").trim();
          const year = String(formData.get("year") ?? "").trim();

          if (partyName) params.set("partyName", partyName);
          if (accountType) params.set("accountType", accountType);
          if (year) params.set("year", year);

          router.push(`/records?${params.toString()}`);
        }}
      >
        <div>
          <Label htmlFor="partyName">相关方</Label>
          <Select
            id="partyName"
            name="partyName"
            defaultValue={initialPartyName ?? ""}
          >
            <option value="">全部</option>
            {partyNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="accountType">记账类型</Label>
          <Select
            id="accountType"
            name="accountType"
            defaultValue={initialAccountType ?? ""}
          >
            <option value="">全部</option>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="year">年度</Label>
          <Select id="year" name="year" defaultValue={initialYear ?? ""}>
            <option value="">全部</option>
            {[2026, 2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit">应用筛选</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/records")}
          >
            重置
          </Button>
        </div>
      </form>
    </Card>
  );
}
