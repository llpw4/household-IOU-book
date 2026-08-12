"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnnualChartPoint, AnnualChartResult } from "@/lib/ledger/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";

const WAN = 10_000;

function toWan(amount: number): number {
  return amount / WAN;
}

function formatWanAxisTick(wan: number): string {
  return `${Math.round(wan)}`;
}

function formatWanTick(wan: number): string {
  if (wan >= 100) return `${Math.round(wan)}`;
  if (wan >= 10) return wan.toFixed(1);
  if (wan >= 1) return wan.toFixed(1);
  return wan.toFixed(2);
}

function formatWanTooltip(wan: number): string {
  return `${formatWanTick(wan)} 万（${formatCurrency(wan * WAN)}）`;
}

function AnnualBarChart({
  title,
  description,
  series,
  valueKey,
  fill,
  emptyText,
}: {
  title: string;
  description: string;
  series: AnnualChartPoint[];
  valueKey: "receivableTotal" | "payableTotal";
  fill: string;
  emptyText: string;
}) {
  const chartData = series.map((point) => ({
    year: `${point.year}年`,
    amount: toWan(point[valueKey]),
  }));

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
      <div className="mt-6 h-72">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={(value) => `${formatWanAxisTick(Number(value))}万`}
                width={56}
              />
              <Tooltip formatter={(value: number) => formatWanTooltip(value)} />
              <Bar
                dataKey="amount"
                name={title}
                fill={fill}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function AnnualChartSeries({ series }: { series: AnnualChartPoint[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <AnnualBarChart
        title="截止各年度应收总额"
        description="横轴为年度，纵轴为截止该年 12 月 31 日「应收(欠我的)」累计总额（单位：万元）"
        series={series}
        valueKey="receivableTotal"
        fill="#047857"
        emptyText="暂无应收数据，请先录入借还流水"
      />
      <AnnualBarChart
        title="截止各年度应付总额"
        description="横轴为年度，纵轴为截止该年 12 月 31 日「应付(我欠的)」累计总额（单位：万元）"
        series={series}
        valueKey="payableTotal"
        fill="#b45309"
        emptyText="暂无应付数据，请先录入借还流水"
      />
    </div>
  );
}

export function AnnualChartDetail({
  detail,
  selectedYear,
}: {
  detail: AnnualChartResult;
  selectedYear: number;
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>截止 {selectedYear} 年末汇总</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-emerald-800">应收(欠我的)</div>
            <div className="mt-2 text-2xl font-bold text-emerald-900">
              {formatCurrency(detail.receivableTotal)}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="text-sm text-amber-800">应付(我欠的)</div>
            <div className="mt-2 text-2xl font-bold text-amber-900">
              {formatCurrency(detail.payableTotal)}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>截止 {selectedYear} 年末 · 应收(欠我的)明细</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="py-2">相关方</th>
                  <th className="py-2 text-right">应收金额</th>
                </tr>
              </thead>
              <tbody>
                {detail.receivableByParty.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-stone-500">
                      截止该年末无应收记录
                    </td>
                  </tr>
                ) : (
                  detail.receivableByParty.map((item) => (
                    <tr key={item.partyName} className="border-t border-stone-100">
                      <td className="py-3">
                        <Link
                          href={`/parties/${encodeURIComponent(item.partyName)}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {item.partyName}
                        </Link>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle>截止 {selectedYear} 年末 · 应付(我欠的)明细</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="py-2">相关方</th>
                  <th className="py-2 text-right">应付金额</th>
                </tr>
              </thead>
              <tbody>
                {detail.payableByParty.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-stone-500">
                      截止该年末无应付记录
                    </td>
                  </tr>
                ) : (
                  detail.payableByParty.map((item) => (
                    <tr key={item.partyName} className="border-t border-stone-100">
                      <td className="py-3">
                        <Link
                          href={`/parties/${encodeURIComponent(item.partyName)}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {item.partyName}
                        </Link>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
