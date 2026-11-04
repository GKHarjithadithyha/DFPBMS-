import {
  ChitAllocation,
  ChitAuction,
  ChitData,
  ChitDividend,
  ChitDividendCredit,
  ChitGroupRec,
  ChitPayment,
  ChitPenalty,
  ChitPrize,
  ChitSchemeRec,
  PayMode,
} from './chitTypes';
import { addMonths } from './chitCalc';

/**
 * Mock Chit Fund records. Members are the existing Master Profile mock records (P000101–P000106);
 * nothing about them is copied here beyond the profile id.
 */

const SCHEMES: ChitSchemeRec[] = [
  { id: 'SCH-01', name: 'Dhavanam Mini Chit ₹60K', totalValue: 60000, totalMembers: 6, durationMonths: 6, monthlySubscription: 10000, foremanCommissionPct: 5, status: 'active' },
  { id: 'SCH-02', name: 'Dhavanam Monthly Chit ₹1L', totalValue: 100000, totalMembers: 10, durationMonths: 10, monthlySubscription: 10000, foremanCommissionPct: 5, status: 'active' },
  { id: 'SCH-03', name: 'Dhavanam Premium Chit ₹5L', totalValue: 500000, totalMembers: 20, durationMonths: 20, monthlySubscription: 25000, foremanCommissionPct: 4, status: 'inactive' },
];

const makeGroup = (g: Partial<ChitGroupRec> & Pick<ChitGroupRec, 'id' | 'name' | 'schemeId' | 'startDate'>): ChitGroupRec => {
  const s = SCHEMES.find(x => x.id === g.schemeId)!;
  return {
    totalMembers: s.totalMembers,
    durationMonths: s.durationMonths,
    totalValue: s.totalValue,
    monthlyCollection: s.monthlySubscription,
    foremanCommissionPct: s.foremanCommissionPct,
    endDate: addMonths(g.startDate, s.durationMonths - 1),
    currentMonth: 1,
    status: 'forming',
    closureChecks: {},
    ...g,
  };
};

export const buildSeedAuctions = (group: ChitGroupRec): ChitAuction[] =>
  Array.from({ length: group.durationMonths }, (_, i) => ({
    id: `AUC-${group.id}-${String(i + 1).padStart(2, '0')}`,
    groupId: group.id,
    month: i + 1,
    scheduledDate: addMonths(group.startDate, i),
    status: 'not_conducted' as const,
    poolAmount: group.totalValue,
  }));

export const buildSeedData = (): ChitData => {
  const groupA = makeGroup({ id: 'CG-2026-01', name: 'Mini Chit — Group A', schemeId: 'SCH-01', startDate: '2026-09-05', currentMonth: 3, status: 'active' });
  const groupB = makeGroup({ id: 'CG-2026-02', name: 'Monthly Chit — Group B', schemeId: 'SCH-02', startDate: '2026-11-01' });

  const alloc = (groupId: string, profileId: string, ticket: number): ChitAllocation => ({
    id: `AL-${groupId}-${ticket}`,
    groupId,
    profileId,
    ticketNumber: ticket,
    monthlyContribution: 10000,
    joinMonth: 1,
    allocatedOn: groupId === 'CG-2026-01' ? '2026-09-01' : '2026-10-28',
  });

  const allocations: ChitAllocation[] = [
    ...['P000101', 'P000102', 'P000103', 'P000104', 'P000105', 'P000106'].map((p, i) => alloc(groupA.id, p, i + 1)),
    alloc(groupB.id, 'P000101', 1),
    alloc(groupB.id, 'P000104', 2),
    alloc(groupB.id, 'P000105', 3),
  ];
  const al = (ticket: number) => `AL-${groupA.id}-${ticket}`;

  let rc = 0;
  const pay = (ticket: number, month: number, amount: number, date: string, mode: PayMode, reference?: string): ChitPayment => {
    rc += 1;
    return {
      id: `PAY-${String(rc).padStart(3, '0')}`,
      receiptNumber: `DF-REC-CF-${String(rc).padStart(4, '0')}`,
      groupId: groupA.id,
      allocationId: al(ticket),
      month,
      amount,
      date,
      mode,
      reference,
      recordedBy: 'Administrator',
    };
  };
  const modes: PayMode[] = ['cash', 'upi', 'bank_transfer', 'cheque'];
  const ref = (mode: PayMode, n: number) => (mode === 'cash' ? undefined : `${mode === 'upi' ? 'UPI' : mode === 'cheque' ? 'CHQ' : 'NEFT'}${400000 + n * 91}`);
  const full = (t: number, m: number, date: string) => {
    const mode = modes[(t + m) % 4];
    return pay(t, m, 10000, date, mode, ref(mode, rc + 1));
  };

  const payments: ChitPayment[] = [
    ...[1, 2, 3, 4, 5, 6].map(t => full(t, 1, `2026-09-0${Math.min(t + 3, 9)}`)),
    ...[1, 2, 4, 5].map(t => full(t, 2, `2026-10-0${t + 2}`)),
    pay(3, 2, 4000, '2026-10-12', 'cash'),
    ...[1, 2, 4].map(t => full(t, 3, `2026-11-0${t === 4 ? 3 : t}`)),
  ];

  const penalties: ChitPenalty[] = [
    { id: 'PEN-001', groupId: groupA.id, allocationId: al(6), month: 2, amount: 300, date: '2026-10-20', reason: 'Instalment unpaid 15 days after due date' },
  ];

  const auctions = [...buildSeedAuctions(groupA), ...buildSeedAuctions(groupB)];
  const conduct = (month: number, ticket: number, date: string, prize: number, discount: number, commission: number, dividend: number) => {
    const a = auctions.find(x => x.groupId === groupA.id && x.month === month)!;
    Object.assign(a, {
      status: 'conducted', auctionDate: date, winnerAllocationId: al(ticket), ticketNumber: ticket,
      prizeAmount: prize, discountAmount: discount, commissionPct: 5, commissionAmount: commission, dividendAmount: dividend,
    });
  };
  conduct(1, 2, '2026-09-05', 50000, 10000, 500, 9500);
  conduct(2, 5, '2026-10-05', 49000, 11000, 550, 10450);

  const dividends: ChitDividend[] = [];
  const credits: ChitDividendCredit[] = [];
  const winners: Record<number, number> = { 1: 2, 2: 5 };
  const shares: Record<number, number> = { 1: 1900, 2: 2090 };
  [1, 2].forEach(month => {
    [1, 2, 3, 4, 5, 6].filter(t => t !== winners[month]).forEach(t => {
      const id = `DIV-${groupA.id}-${month}-${t}`;
      dividends.push({ id, groupId: groupA.id, month, allocationId: al(t), eligible: true, eligibleAmount: shares[month] });
      if (month === 1 || [1, 2, 4].includes(t)) {
        credits.push({ id: `DCR-${id}`, dividendId: id, groupId: groupA.id, allocationId: al(t), month, amount: shares[month], date: month === 1 ? '2026-09-08' : '2026-10-09', note: 'Credited to member account' });
      }
    });
  });

  const prizes: ChitPrize[] = [
    {
      id: 'PRZ-001', groupId: groupA.id, month: 1, allocationId: al(2), amount: 50000, verification: 'verified',
      disbursed: true, disbursementDate: '2026-09-12', mode: 'bank_transfer', reference: 'NEFT-884102',
    },
    { id: 'PRZ-002', groupId: groupA.id, month: 2, allocationId: al(5), amount: 49000, verification: 'verified', disbursed: false },
  ];

  return {
    schemes: SCHEMES,
    groups: [groupA, groupB],
    allocations,
    payments,
    penalties,
    auctions,
    dividends,
    credits,
    prizes,
  };
};
