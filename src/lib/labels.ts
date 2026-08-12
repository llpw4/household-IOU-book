import type {
  AccountType,
  RepaymentPlan,
  TransactionType,
  PartyType,
} from "@prisma/client";

export const accountTypeLabels: Record<AccountType, string> = {
  RECEIVABLE: "应收(欠我的)",
  PAYABLE: "应付(我欠的)",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  BORROW: "借",
  REPAY: "还",
};

export const repaymentPlanLabels: Record<RepaymentPlan, string> = {
  LUMP_SUM: "一次性",
  INSTALLMENT: "分期",
  UNSPECIFIED: "未约定",
};

export const partyTypeLabels: Record<PartyType, string> = {
  RELATIVE: "亲戚",
  FRIEND: "朋友",
  ORGANIZATION: "机构/公司",
};

export const partyTypeOptions = Object.entries(partyTypeLabels) as [
  PartyType,
  string,
][];

export function parseAccountType(value: string): AccountType | null {
  if (
    value === "应收(欠我的)" ||
    value === "谁欠我（应收）" ||
    value === "RECEIVABLE"
  ) {
    return "RECEIVABLE";
  }
  if (
    value === "应付(我欠的)" ||
    value === "我欠谁（应付）" ||
    value === "PAYABLE"
  ) {
    return "PAYABLE";
  }
  return null;
}

export function parseTransactionType(value: string): TransactionType | null {
  if (value === "借" || value === "BORROW") return "BORROW";
  if (value === "还" || value === "REPAY") return "REPAY";
  return null;
}

export function parseRepaymentPlan(value: string): RepaymentPlan | null {
  if (value === "一次性" || value === "LUMP_SUM") return "LUMP_SUM";
  if (value === "分期" || value === "INSTALLMENT") return "INSTALLMENT";
  if (value === "未约定" || value === "UNSPECIFIED") return "UNSPECIFIED";
  return null;
}
