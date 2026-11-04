import {
  ChitAllocation,
  ChitAuction,
  ChitData,
  ChitGroupRec,
  ChitPayment,
  ChitPenalty,
  ChitPrize,
  PrizeStatus,
  paymentModeText,
} from './chitTypes';

export const todayStr = () => new Date().toISOString().slice(0, 10);

/** Adds calendar months to a YYYY-MM-DD date, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (dateStr: string, n: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

/** "Nov 2026" for the n-th month of the group. */
export const monthLabel = (group: Pick<ChitGroupRec, 'startDate'>, month: number): string => {
  const d = new Date(`${addMonths(group.startDate, month - 1)}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const monthTitle = (group: Pick<ChitGroupRec, 'startDate'>, month: number) =>
  `Month ${month} · ${monthLabel(group, month)}`;

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

// ---------------------------------------------------------------------------
// Collection register
// ---------------------------------------------------------------------------

export type LedgerStatus = 'paid' | 'partial' | 'pending' | 'overdue';

export interface LedgerRow {
  allocation: ChitAllocation;
  instalment: number;
  previousOutstanding: number;
  penalty: number;
  /** Previous pending + instalment + penalty. */
  currentDue: number;
  received: number;
  balance: number;
  dueDate: string;
  lastPaymentDate: string;
  lastMode: string;
  status: LedgerStatus;
  payments: ChitPayment[];
}

const chargesUpTo = (a: ChitAllocation, month: number, penalties: ChitPenalty[]) => {
  const months = Math.max(0, month - a.joinMonth + 1);
  const penalty = sum(penalties.filter(p => p.allocationId === a.id && p.month <= month).map(p => p.amount));
  return months * a.monthlyContribution + penalty;
};

const paidUpTo = (a: ChitAllocation, month: number, payments: ChitPayment[]) =>
  sum(payments.filter(p => p.allocationId === a.id && p.month <= month).map(p => p.amount));

/** What the member still owes after the given month closes (instalments + penalties − payments). */
export const balanceAfter = (data: ChitData, a: ChitAllocation, month: number) =>
  chargesUpTo(a, month, data.penalties) - paidUpTo(a, month, data.payments);

export const buildLedger = (data: ChitData, group: ChitGroupRec, month: number): LedgerRow[] =>
  data.allocations
    .filter(a => a.groupId === group.id && a.joinMonth <= month)
    .sort((x, y) => x.ticketNumber - y.ticketNumber)
    .map(a => {
      const payments = data.payments
        .filter(p => p.allocationId === a.id && p.month === month)
        .sort((x, y) => x.date.localeCompare(y.date));
      const previousOutstanding = balanceAfter(data, a, month - 1);
      const penalty = sum(data.penalties.filter(p => p.allocationId === a.id && p.month === month).map(p => p.amount));
      const currentDue = previousOutstanding + a.monthlyContribution + penalty;
      const received = sum(payments.map(p => p.amount));
      const balance = currentDue - received;
      const last = payments[payments.length - 1];
      const dueDate = addMonths(group.startDate, month - 1);
      const status: LedgerStatus =
        balance <= 0 ? 'paid' : received > 0 ? 'partial' : todayStr() > dueDate ? 'overdue' : 'pending';
      return {
        allocation: a,
        instalment: a.monthlyContribution,
        previousOutstanding,
        penalty,
        currentDue,
        received,
        balance,
        dueDate,
        lastPaymentDate: last?.date || '',
        lastMode: last ? paymentModeText(last) : '',
        status,
        payments,
      };
    });

// ---------------------------------------------------------------------------
// Auction / dividend / prize (all figures are the operator's entries)
// ---------------------------------------------------------------------------

export const auctionOf = (data: ChitData, groupId: string, month: number): ChitAuction | undefined =>
  data.auctions.find(a => a.groupId === groupId && a.month === month);

/** The figures the operator entered for a conducted auction (zero otherwise). */
export const auctionAmounts = (a: ChitAuction) =>
  a.status === 'conducted'
    ? { discount: a.discountAmount ?? 0, commission: a.commissionAmount ?? 0, dividend: a.dividendAmount ?? 0 }
    : { discount: 0, commission: 0, dividend: 0 };

export const dividendCredited = (data: ChitData, dividendId: string) =>
  sum(data.credits.filter(c => c.dividendId === dividendId).map(c => c.amount));

export const dividendSummary = (data: ChitData, groupId: string, month: number) => {
  const auction = auctionOf(data, groupId, month);
  const distributable = auction ? auctionAmounts(auction).dividend : 0;
  const rows = data.dividends.filter(d => d.groupId === groupId && d.month === month);
  const allocated = sum(rows.filter(d => d.eligible).map(d => d.eligibleAmount));
  const credited = sum(rows.map(d => dividendCredited(data, d.id)));
  return { distributable, allocated, credited, unallocated: distributable - allocated, rows };
};

/** A conducted month is locked once money has moved against it, so the outcome can't be silently rewritten. */
export const isAuctionLocked = (data: ChitData, groupId: string, month: number) =>
  data.credits.some(c => c.groupId === groupId && c.month === month) ||
  data.prizes.some(p => p.groupId === groupId && p.month === month && p.disbursed);

export const prizeStatus = (p: ChitPrize): PrizeStatus =>
  p.disbursed ? 'disbursed' : p.verification === 'verified' ? 'verified' : 'pending';

// ---------------------------------------------------------------------------
// Group level roll-ups
// ---------------------------------------------------------------------------

export interface GroupStats {
  enrolled: number;
  expectedToDate: number;
  collected: number;
  outstanding: number;
  penaltiesLevied: number;
  monthInstalments: number;
  monthDemand: number;
  monthCollected: number;
  monthPending: number;
  paidMembers: number;
  pendingMembers: number;
  auctionsConducted: number;
  discounts: number;
  commission: number;
  distributable: number;
  dividendsAllocated: number;
  dividendsCredited: number;
  prizesDue: number;
  prizesDisbursed: number;
  liabilities: number;
}

export const groupStats = (data: ChitData, group: ChitGroupRec): GroupStats => {
  const allocs = data.allocations.filter(a => a.groupId === group.id);
  const expectedToDate = sum(allocs.map(a => chargesUpTo(a, group.currentMonth, data.penalties)));
  const collected = sum(data.payments.filter(p => p.groupId === group.id).map(p => p.amount));
  const ledger = buildLedger(data, group, group.currentMonth);

  const conducted = data.auctions.filter(a => a.groupId === group.id && a.status === 'conducted');
  const figs = conducted.map(auctionAmounts);
  const distributable = sum(figs.map(f => f.dividend));
  const dividendsAllocated = sum(
    data.dividends.filter(d => d.groupId === group.id && d.eligible).map(d => d.eligibleAmount)
  );
  const dividendsCredited = sum(data.credits.filter(c => c.groupId === group.id).map(c => c.amount));
  const prizes = data.prizes.filter(p => p.groupId === group.id);
  const prizesDue = sum(prizes.map(p => p.amount));
  const prizesDisbursed = sum(prizes.filter(p => p.disbursed).map(p => p.amount));

  return {
    enrolled: allocs.length,
    expectedToDate,
    collected,
    outstanding: expectedToDate - collected,
    penaltiesLevied: sum(data.penalties.filter(p => p.groupId === group.id).map(p => p.amount)),
    monthInstalments: sum(ledger.map(r => r.instalment)),
    monthDemand: sum(ledger.map(r => r.currentDue)),
    monthCollected: sum(ledger.map(r => r.received)),
    monthPending: sum(ledger.map(r => Math.max(0, r.balance))),
    paidMembers: ledger.filter(r => r.status === 'paid').length,
    pendingMembers: ledger.filter(r => r.status !== 'paid').length,
    auctionsConducted: conducted.length,
    discounts: sum(figs.map(f => f.discount)),
    commission: sum(figs.map(f => f.commission)),
    distributable,
    dividendsAllocated,
    dividendsCredited,
    prizesDue,
    prizesDisbursed,
    liabilities: prizesDue - prizesDisbursed + (distributable - dividendsCredited),
  };
};

export interface ChecklistItem {
  key: string;
  label: string;
  detail: string;
  passed: boolean;
  manual: boolean;
}

export const closureChecklist = (data: ChitData, group: ChitGroupRec): ChecklistItem[] => {
  const s = groupStats(data, group);
  const conducted = data.auctions.filter(a => a.groupId === group.id && a.status === 'conducted').length;
  const prizes = data.prizes.filter(p => p.groupId === group.id);
  const undisbursed = prizes.filter(p => !p.disbursed).length;
  return [
    {
      key: 'auctions',
      label: 'All monthly auctions recorded',
      detail: `${conducted} of ${group.durationMonths} conducted`,
      passed: conducted >= group.durationMonths,
      manual: false,
    },
    {
      key: 'collections',
      label: 'All instalments collected, no outstanding dues',
      detail:
        group.currentMonth < group.durationMonths
          ? `Group is at month ${group.currentMonth} of ${group.durationMonths}`
          : `Outstanding ₹${Math.max(0, s.outstanding).toLocaleString('en-IN')}`,
      passed: group.currentMonth >= group.durationMonths && s.outstanding <= 0,
      manual: false,
    },
    {
      key: 'dividends',
      label: 'Dividends fully allocated and credited',
      detail: `Distributable ₹${s.distributable.toLocaleString('en-IN')} · allocated ₹${s.dividendsAllocated.toLocaleString('en-IN')} · credited ₹${s.dividendsCredited.toLocaleString('en-IN')}`,
      passed: s.distributable === s.dividendsAllocated && s.dividendsAllocated === s.dividendsCredited,
      manual: false,
    },
    {
      key: 'prizes',
      label: 'All prize amounts disbursed',
      detail: `${prizes.length - undisbursed} of ${prizes.length} disbursed`,
      passed: prizes.length >= conducted && undisbursed === 0,
      manual: false,
    },
    {
      key: 'commission',
      label: 'Company commission confirmed',
      detail: `Commission entered ₹${s.commission.toLocaleString('en-IN')}`,
      passed: Boolean(group.closureChecks.commission),
      manual: true,
    },
    {
      key: 'settlement',
      label: 'Final settlement statement reviewed',
      detail: 'Operator confirmation',
      passed: Boolean(group.closureChecks.settlement),
      manual: true,
    },
  ];
};

export const nextTicket = (data: ChitData, group: ChitGroupRec, taken: number[] = []) => {
  const used = new Set([...data.allocations.filter(a => a.groupId === group.id).map(a => a.ticketNumber), ...taken]);
  for (let t = 1; t <= group.totalMembers; t++) if (!used.has(t)) return t;
  return 0;
};

// ---------------------------------------------------------------------------
// Member ledger
// ---------------------------------------------------------------------------

export type PrizeReceived = 'not_won' | 'won_pending' | 'won_verified' | 'received';

export const memberSummary = (data: ChitData, group: ChitGroupRec, a: ChitAllocation) => {
  const months = Math.max(0, group.currentMonth - a.joinMonth + 1);
  const instalments = months * a.monthlyContribution;
  const penalties = sum(data.penalties.filter(p => p.allocationId === a.id).map(p => p.amount));
  const paid = sum(data.payments.filter(p => p.allocationId === a.id).map(p => p.amount));
  const dividendCreditsTotal = sum(data.credits.filter(c => c.allocationId === a.id).map(c => c.amount));
  const prize = data.prizes.find(p => p.allocationId === a.id);
  const prizeReceived: PrizeReceived = !prize
    ? 'not_won'
    : prize.disbursed
    ? 'received'
    : prize.verification === 'verified'
    ? 'won_verified'
    : 'won_pending';
  return { instalments, penalties, paid, outstanding: instalments + penalties - paid, dividendCreditsTotal, prize, prizeReceived };
};
