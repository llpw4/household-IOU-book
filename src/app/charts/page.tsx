import {
  AnnualChartDetail,
  AnnualChartSeries,
} from "@/components/annual-chart";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/service";
import { getAnnualChart, getAnnualChartSeries } from "@/lib/ledger/service";

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const series = await getAnnualChartSeries(user.id);
  const availableYears =
    series.length > 0
      ? series.map((point) => point.year)
      : [currentYear];

  const selectedYear = params.year
    ? Number(params.year)
    : availableYears[availableYears.length - 1] ?? currentYear;

  const detail = await getAnnualChart(user.id, selectedYear);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">年度图表</h1>
        <p className="text-sm text-stone-500">
          查看截止各年度末的应收(欠我的)与应付(我欠的)累计总额
        </p>
      </div>

      <AnnualChartSeries series={series} />

      <Card>
        <CardTitle>选择年度查看明细</CardTitle>
        <p className="mt-2 text-sm text-stone-500">
          选择某一年度，查看截止该年 12 月 31 日的应收/应付明细
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
          <div>
            <Label htmlFor="year">年度</Label>
            <Select id="year" name="year" defaultValue={String(selectedYear)}>
              {availableYears
                .slice()
                .sort((a, b) => b - a)
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </Select>
          </div>
          <Button type="submit">查看明细</Button>
        </form>
      </Card>

      <AnnualChartDetail detail={detail} selectedYear={selectedYear} />
    </div>
  );
}
