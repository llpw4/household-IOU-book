"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { PartyType } from "@prisma/client";
import {
  accountTypeLabels,
  partyTypeLabels,
  repaymentPlanLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import type { PreviewResult, RecordInput, RecordWithParty } from "@/lib/ledger/types";
import {
  amountToChineseUppercase,
  formatAmountWithCommas,
  parseAmountInput,
} from "@/lib/amount-format";
import { formatCurrency, formatDate, coerceValidDate } from "@/lib/utils";
import { DateInput } from "@/components/date-input";
import { previewRecordAction, submitRecordAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function SuccessOverlay({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white px-8 py-7 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700">
          ✓
        </div>
        <p className="mt-4 text-lg font-semibold text-stone-900">{message}</p>
        <p className="mt-2 text-sm text-stone-500">可继续记下一笔</p>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  subValue,
  emphasize,
}: {
  label: string;
  value: string;
  subValue?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd className="text-right">
        <div
          className={
            emphasize
              ? "text-base font-semibold tabular-nums text-stone-900"
              : "font-medium text-stone-800"
          }
        >
          {value}
        </div>
        {subValue ? (
          <div className="mt-0.5 text-xs font-normal text-stone-500">{subValue}</div>
        ) : null}
      </dd>
    </div>
  );
}

function toFormState(record?: RecordWithParty): RecordInput {
  return {
    accountType: record?.accountType ?? "RECEIVABLE",
    transactionType: record?.transactionType ?? "BORROW",
    partyName: record?.partyName ?? "",
    amount: record?.amount ?? 0,
    transactionDate: record?.transactionDate
      ? coerceValidDate(record.transactionDate)
      : coerceValidDate(undefined),
    transferMethod: record?.transferMethod ?? "",
    purpose: record?.purpose ?? "",
    hasInterest: record?.hasInterest ?? false,
    repaymentPlan: record?.repaymentPlan ?? "UNSPECIFIED",
  };
}

export function RecordForm({
  parties,
  initialRecord,
  recordId,
  returnTo = "/records/new",
}: {
  parties: { name: string; partyType: PartyType }[];
  initialRecord?: RecordWithParty;
  recordId?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RecordInput>(toFormState(initialRecord));
  const [amountText, setAmountText] = useState(() =>
    initialRecord?.amount
      ? formatAmountWithCommas(initialRecord.amount)
      : "",
  );
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentKey, setAttachmentKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function resetForm() {
    setForm(toFormState());
    setAmountText("");
    setPreview(null);
    setAttachment(null);
    setAttachmentKey((current) => current + 1);
    setError(null);
  }

  function updateField<K extends keyof RecordInput>(
    key: K,
    value: RecordInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleAmountFocus() {
    if (form.amount > 0) {
      setAmountText(String(form.amount));
    }
  }

  function handleAmountChange(value: string) {
    setAmountText(value);
    updateField("amount", parseAmountInput(value));
  }

  function handleAmountBlur() {
    const amount = parseAmountInput(amountText);
    updateField("amount", amount);

    if (amount <= 0) {
      setAmountText("");
      return;
    }

    setAmountText(formatAmountWithCommas(amount));
  }

  function handlePreview() {
    setError(null);
    startTransition(async () => {
      try {
        if (!form.partyName.trim()) {
          throw new Error("请选择相关方");
        }
        if (form.amount <= 0) {
          throw new Error("金额必须大于 0");
        }

        const result = await previewRecordAction(form, recordId);
        setPreview(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "预览失败");
      }
    });
  }

  function handleSubmit() {
    if (!preview) return;

    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("payload", JSON.stringify(form));
        if (recordId) {
          formData.set("recordId", recordId);
        }
        if (attachment) {
          formData.set("attachment", attachment);
        }

        await submitRecordAction(formData);

        if (recordId) {
          router.push("/records?flash=updated");
          return;
        }

        resetForm();
        setSuccessMessage("流水已成功入账");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存失败");
      }
    });
  }

  return (
    <>
      {successMessage ? <SuccessOverlay message={successMessage} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-0">
        <div className="border-b border-stone-100 px-5 py-4">
          <CardTitle>{recordId ? "编辑信息" : "填写信息"}</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            按步骤填写借还详情，完成后预览确认
          </p>
        </div>

        <div className="grid gap-4 px-5 py-6 sm:grid-cols-2">
          <FormField label="记账类型" htmlFor="accountType">
            <Select
              id="accountType"
              value={form.accountType}
              onChange={(event) =>
                updateField(
                  "accountType",
                  event.target.value as RecordInput["accountType"],
                )
              }
            >
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="借还类型" htmlFor="transactionType">
            <Select
              id="transactionType"
              value={form.transactionType}
              onChange={(event) =>
                updateField(
                  "transactionType",
                  event.target.value as RecordInput["transactionType"],
                )
              }
            >
              {Object.entries(transactionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="相关方" htmlFor="partyName" className="sm:col-span-2">
            {parties.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-600">
                暂无相关方，请先
                <Link
                  href={`/parties?returnTo=${encodeURIComponent(returnTo)}`}
                  className="mx-1 font-medium text-emerald-700 hover:underline"
                >
                  新增相关方
                </Link>
                后再记账。
              </div>
            ) : (
              <>
                <Select
                  id="partyName"
                  value={form.partyName}
                  onChange={(event) =>
                    updateField("partyName", event.target.value)
                  }
                  required
                >
                  <option value="">请选择相关方</option>
                  {parties.map((party) => (
                    <option key={party.name} value={party.name}>
                      {party.name}（{partyTypeLabels[party.partyType]}）
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-xs text-stone-500">
                  没有需要的相关方？
                  <Link
                    href={`/parties?returnTo=${encodeURIComponent(returnTo)}`}
                    className="ml-1 text-emerald-700 hover:underline"
                  >
                    新增相关方
                  </Link>
                </p>
              </>
            )}
          </FormField>

          <FormField label="金额" htmlFor="amount">
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amountText}
              onFocus={handleAmountFocus}
              onChange={(event) => handleAmountChange(event.target.value)}
              onBlur={handleAmountBlur}
              className="tabular-nums"
            />
          </FormField>

          <FormField
            label="款项日期"
            htmlFor="transactionDate"
            hint="支持 2025-07-22、2025/7/22，或点击「选择」"
          >
            <DateInput
              id="transactionDate"
              value={coerceValidDate(form.transactionDate)}
              onChange={(date) => updateField("transactionDate", date)}
            />
          </FormField>

          <FormField label="转账方式" htmlFor="transferMethod">
            <Input
              id="transferMethod"
              value={form.transferMethod ?? ""}
              onChange={(event) =>
                updateField("transferMethod", event.target.value)
              }
              placeholder="如：某人微信"
            />
          </FormField>

          <FormField label="约定还款方式" htmlFor="repaymentPlan">
            <Select
              id="repaymentPlan"
              value={form.repaymentPlan ?? "UNSPECIFIED"}
              onChange={(event) =>
                updateField(
                  "repaymentPlan",
                  event.target.value as RecordInput["repaymentPlan"],
                )
              }
            >
              {Object.entries(repaymentPlanLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="用途/备注" htmlFor="purpose" className="sm:col-span-2">
            <Textarea
              id="purpose"
              rows={3}
              value={form.purpose ?? ""}
              onChange={(event) => updateField("purpose", event.target.value)}
              placeholder="如：装修、应急"
            />
          </FormField>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                id="hasInterest"
                type="checkbox"
                checked={form.hasInterest ?? false}
                onChange={(event) =>
                  updateField("hasInterest", event.target.checked)
                }
                className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
              />
              <Label htmlFor="hasInterest" className="mb-0">
                是否计息
              </Label>
            </div>

            {!recordId ? (
              <div className="min-w-0 flex-1">
                <Label htmlFor="attachment" className="mb-1">
                  凭证（可选）
                </Label>
                <Input
                  key={attachmentKey}
                  id="attachment"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setAttachment(event.target.files?.[0] ?? null)
                  }
                  className="py-1.5"
                />
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mx-5 mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-stone-100 px-5 py-4">
          <Button onClick={handlePreview} disabled={isPending || parties.length === 0}>
            预览确认
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/records")}
            disabled={isPending}
          >
            取消
          </Button>
        </div>
      </Card>

      <Card className="h-fit p-0 xl:sticky xl:top-24">
        <div className="border-b border-stone-100 px-5 py-4">
          <CardTitle>入账预览</CardTitle>
          <p className="mt-1 text-sm text-stone-500">确认无误后再提交</p>
        </div>

        {!preview ? (
          <div className="px-5 py-10">
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-stone-200">
                预览
              </div>
              <p className="mt-4 text-sm font-medium text-stone-700">
                填写左侧信息后预览
              </p>
              <p className="mt-1 text-xs text-stone-500">
                系统将展示入账后的余额变化
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5 text-sm">
            <dl className="space-y-3 rounded-xl bg-stone-50 p-4">
              <PreviewRow label="相关方" value={preview.partyName} />
              <PreviewRow
                label="记账类型"
                value={accountTypeLabels[preview.record.accountType]}
              />
              <PreviewRow
                label="借还类型"
                value={transactionTypeLabels[preview.record.transactionType]}
              />
              <PreviewRow
                label="金额"
                value={formatCurrency(preview.record.amount)}
                subValue={amountToChineseUppercase(preview.record.amount)}
                emphasize
              />
              <PreviewRow
                label="日期"
                value={formatDate(preview.record.transactionDate)}
              />
            </dl>

            <div>
              <div className="text-sm font-medium text-stone-700">余额变化</div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <div className="text-xs text-emerald-800">应收(欠我的)</div>
                  <div className="mt-1 tabular-nums text-emerald-900">
                    {formatCurrency(preview.currentNetReceivable)}
                    <span className="mx-2 text-emerald-600">→</span>
                    {formatCurrency(preview.afterNetReceivable)}
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  <div className="text-xs text-amber-800">应付(我欠的)</div>
                  <div className="mt-1 tabular-nums text-amber-900">
                    {formatCurrency(preview.currentNetPayable)}
                    <span className="mx-2 text-amber-600">→</span>
                    {formatCurrency(preview.afterNetPayable)}
                  </div>
                </div>
              </div>
            </div>

            {preview.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-lg bg-amber-50 px-4 py-3 text-amber-800"
              >
                {warning}
              </div>
            ))}

            <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
              <Button onClick={handleSubmit} disabled={isPending}>
                确认入账
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>
                返回修改
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
    </>
  );
}
