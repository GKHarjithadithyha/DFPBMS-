/**
 * Chit Fund operations model. Members are never stored here: an allocation only references a
 * Master Profile id, so customer / KYC data stays owned by the Profile Master.
 *
 * Every auction figure (discount, commission, dividend, prize) is typed in by the operator and
 * stored as entered — nothing here is derived by an auction or accounting engine.
 */

export type SchemeStatus = 'active' | 'inactive';

export interface ChitSchemeRec {
  id: string;
  name: string;
  totalValue: number;
  totalMembers: number;
  durationMonths: number;
  monthlySubscription: number;
  foremanCommissionPct: number;
  status: SchemeStatus;
}

export type GroupStatus = 'forming' | 'active' | 'closed';

export interface ChitGroupRec {
  id: string;
  name: string;
  schemeId: string;
  startDate: string;
  endDate: string;
  /** Snapshot of the scheme at creation, so later scheme edits never rewrite a running group. */
  totalMembers: number;
  durationMonths: number;
  totalValue: number;
  monthlyCollection: number;
  foremanCommissionPct: number;
  currentMonth: number;
  status: GroupStatus;
  closureChecks: Record<string, boolean>;
  closedOn?: string;
}

export interface ChitAllocation {
  id: string;
  groupId: string;
  profileId: string;
  ticketNumber: number;
  monthlyContribution: number;
  /** First month this member owes an instalment for. */
  joinMonth: number;
  allocatedOn: string;
}

export type PayMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque';
export const PAY_MODES: { id: PayMode; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cheque', label: 'Cheque' },
];
export const payModeLabel = (m?: PayMode) => PAY_MODES.find(x => x.id === m)?.label || '';

/** Non-cash instruments accepted for the bank part of a collection. */
export const BANK_MODES = PAY_MODES.filter(m => m.id !== 'cash');

export interface ChitPayment {
  id: string;
  receiptNumber: string;
  groupId: string;
  allocationId: string;
  month: number;
  /** Total received = cashAmount + bankAmount. */
  amount: number;
  /** Portion received in cash / into the bank account. Absent on payments saved before the split existed. */
  cashAmount?: number;
  bankAmount?: number;
  bankAccountId?: string;
  date: string;
  /** 'cash' for a cash-only receipt, otherwise the bank instrument used. */
  mode: PayMode;
  reference?: string;
  remarks?: string;
  recordedBy: string;
}

/** "Cash", "UPI" or "Cash + UPI" for a split receipt. */
export const paymentModeText = (p: Pick<ChitPayment, 'mode' | 'cashAmount' | 'bankAmount'>) =>
  (p.cashAmount ?? 0) > 0 && (p.bankAmount ?? 0) > 0 ? `Cash + ${payModeLabel(p.mode)}` : payModeLabel(p.mode);

export interface ChitPenalty {
  id: string;
  groupId: string;
  allocationId: string;
  month: number;
  /** Negative when the operator lowers a penalty at collection time. */
  amount: number;
  date: string;
  reason: string;
}

export type AuctionStatus = 'not_conducted' | 'conducted' | 'postponed';

export interface ChitAuction {
  id: string;
  groupId: string;
  month: number;
  scheduledDate: string;
  status: AuctionStatus;
  auctionDate?: string;
  winnerAllocationId?: string;
  ticketNumber?: number;
  poolAmount: number;
  /** Winning bid / prize amount, as entered. */
  prizeAmount?: number;
  discountAmount?: number;
  commissionPct?: number;
  commissionAmount?: number;
  /** Distributable dividend, as entered. */
  dividendAmount?: number;
  remarks?: string;
}

export interface ChitDividend {
  id: string;
  groupId: string;
  month: number;
  allocationId: string;
  eligible: boolean;
  eligibleAmount: number;
}

export interface ChitDividendCredit {
  id: string;
  dividendId: string;
  groupId: string;
  allocationId: string;
  month: number;
  amount: number;
  date: string;
  note?: string;
}

/** Security / guarantee verification of the winner. */
export type PrizeVerification = 'pending' | 'verified';
export type PrizeStatus = 'pending' | 'verified' | 'disbursed';

export interface ChitPrize {
  id: string;
  groupId: string;
  month: number;
  allocationId: string;
  /** Prize amount copied from the saved auction record. */
  amount: number;
  verification: PrizeVerification;
  disbursed: boolean;
  disbursementDate?: string;
  mode?: PayMode;
  reference?: string;
  remarks?: string;
}

export interface ChitData {
  schemes: ChitSchemeRec[];
  groups: ChitGroupRec[];
  allocations: ChitAllocation[];
  payments: ChitPayment[];
  penalties: ChitPenalty[];
  auctions: ChitAuction[];
  dividends: ChitDividend[];
  credits: ChitDividendCredit[];
  prizes: ChitPrize[];
}
