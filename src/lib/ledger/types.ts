import type {
  AccountType,
  RepaymentPlan,
  TransactionType,
} from "@prisma/client";

export interface RecordInput {
  accountType: AccountType;
  transactionType: TransactionType;
  partyName: string;
  amount: number;
  transactionDate: Date;
  transferMethod?: string;
  purpose?: string;
  hasInterest?: boolean;
  repaymentPlan?: RepaymentPlan;
}

export interface RecordFilter {
  partyName?: string;
  accountType?: AccountType;
  year?: number;
  limit?: number;
}

export interface SummaryResult {
  totalReceivable: number;
  totalPayable: number;
}

export interface RecordWithParty {
  id: string;
  accountType: AccountType;
  transactionType: TransactionType;
  partyName: string;
  amount: number;
  transactionDate: Date;
  transferMethod: string | null;
  purpose: string | null;
  hasInterest: boolean;
  repaymentPlan: RepaymentPlan;
  createdAt: Date;
  attachments: { id: string; filename: string; localPath: string }[];
}

export interface PartyBalanceResult {
  partyName: string;
  netReceivable: number;
  netPayable: number;
  receivableBorrowTotal: number;
  receivableRepayTotal: number;
  payableBorrowTotal: number;
  payableRepayTotal: number;
  records: RecordWithParty[];
}

export interface PartySummaryItem {
  partyName: string;
  netReceivable: number;
  netPayable: number;
}

export interface AnnualChartPoint {
  year: number;
  receivableTotal: number;
  payableTotal: number;
}

export interface AnnualChartResult {
  year: number;
  receivableTotal: number;
  payableTotal: number;
  receivableByParty: {
    partyName: string;
    amount: number;
  }[];
  payableByParty: {
    partyName: string;
    amount: number;
  }[];
}

export interface PreviewResult {
  record: RecordInput;
  partyName: string;
  currentNetReceivable: number;
  currentNetPayable: number;
  afterNetReceivable: number;
  afterNetPayable: number;
  warnings: string[];
}

export interface BalanceDelta {
  receivable: number;
  payable: number;
}
