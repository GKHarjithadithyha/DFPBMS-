import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  ChitAllocation,
  ChitData,
  ChitDividend,
  ChitDividendCredit,
  ChitGroupRec,
  ChitPayment,
  ChitPenalty,
  ChitPrize,
  ChitSchemeRec,
  PayMode,
  PrizeVerification,
} from './chitTypes';
import {
  addMonths,
  auctionOf,
  buildLedger,
  closureChecklist,
  dividendCredited,
  dividendSummary,
  isAuctionLocked,
  sum,
  todayStr,
} from './chitCalc';
import { buildSeedAuctions, buildSeedData } from './chitMock';

const STORAGE_KEY = 'pbms_chit_ledger_v4';

export type Res<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Res<T> => ({ ok: true, value });
const fail = (error: string): Res<never> => ({ ok: false, error });

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

const loadData = (): ChitData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChitData;
  } catch {
    /* storage unavailable or corrupt: fall back to the seed */
  }
  return buildSeedData();
};

export interface PaymentInput {
  allocationId: string;
  month: number;
  date: string;
  /** Received in cash. */
  cashAmount: number;
  /** Received into a bank account (UPI / transfer / cheque). */
  bankAmount: number;
  bankMode?: PayMode;
  bankAccountId?: string;
  reference?: string;
  remarks?: string;
  /** Penalty for the month as the operator wants it; the difference is stored as an adjustment entry. */
  penaltyTotal?: number;
}

/** Every figure below is typed in by the operator and stored as entered. */
export interface AuctionInput {
  auctionDate: string;
  winnerAllocationId: string;
  poolAmount: number;
  prizeAmount: number;
  discountAmount: number;
  commissionPct: number;
  commissionAmount: number;
  dividendAmount: number;
  remarks?: string;
}

export interface DividendRowInput {
  allocationId: string;
  eligible: boolean;
  amount: number;
}

interface ChitStore {
  data: ChitData;

  saveScheme: (scheme: Omit<ChitSchemeRec, 'id'> & { id?: string }) => ChitSchemeRec;
  createGroup: (input: { name: string; schemeId: string; startDate: string }) => Res<ChitGroupRec>;
  activateGroup: (groupId: string) => Res;
  advanceMonth: (groupId: string) => Res;
  setClosureCheck: (groupId: string, key: string, value: boolean) => void;
  closeGroup: (groupId: string) => Res;

  allocateMembers: (groupId: string, picks: { profileId: string; ticketNumber: number }[]) => Res;
  removeAllocation: (allocationId: string) => Res;

  recordPayment: (input: PaymentInput) => Res<ChitPayment>;
  addPenalty: (input: { allocationId: string; month: number; amount: number; date: string; reason: string }) => Res;

  setAuctionStatus: (auctionId: string, input: { status: 'not_conducted' | 'postponed'; remarks?: string; scheduledDate?: string }) => Res;
  recordAuction: (auctionId: string, input: AuctionInput) => Res;
  saveDividendAllocation: (groupId: string, month: number, rows: DividendRowInput[]) => Res;
  recordDividendCredits: (entries: { dividendId: string; amount: number }[], date: string, note?: string) => Res;

  updatePrizeVerification: (prizeId: string, verification: PrizeVerification, remarks?: string) => Res;
  recordDisbursement: (prizeId: string, input: { verification: PrizeVerification; date: string; mode: PayMode; reference?: string; remarks?: string }) => Res;
}

const ChitContext = createContext<ChitStore | null>(null);

export const useChit = (): ChitStore => {
  const ctx = useContext(ChitContext);
  if (!ctx) throw new Error('useChit must be used inside <ChitProvider>');
  return ctx;
};

export const ChitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getProfileById, userName, masterData, postCentralTransaction } = useERP();
  const [data, setData] = useState<ChitData>(loadData);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable: state stays in memory */
    }
  }, [data]);

  const patch = useCallback((fn: (d: ChitData) => Partial<ChitData>) => setData(d => ({ ...d, ...fn(d) })), []);

  const profileName = (allocationId: string) => {
    const a = data.allocations.find(x => x.id === allocationId);
    return (a && getProfileById(a.profileId)?.name) || a?.profileId || 'Chit Member';
  };

  const nextReceiptNumber = () => {
    const prefix = `${masterData.receiptPrefix}CF-`;
    const max = Math.max(0, ...data.payments.map(p => (p.receiptNumber.startsWith(prefix) ? Number(p.receiptNumber.slice(prefix.length)) || 0 : 0)));
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  };

  // ---- Schemes & groups ---------------------------------------------------

  const saveScheme: ChitStore['saveScheme'] = scheme => {
    const rec: ChitSchemeRec = { ...scheme, id: scheme.id || `SCH-${String(data.schemes.length + 1).padStart(2, '0')}` };
    patch(d => ({
      schemes: d.schemes.some(s => s.id === rec.id) ? d.schemes.map(s => (s.id === rec.id ? rec : s)) : [...d.schemes, rec],
    }));
    return rec;
  };

  const createGroup: ChitStore['createGroup'] = ({ name, schemeId, startDate }) => {
    const scheme = data.schemes.find(s => s.id === schemeId);
    if (!scheme) return fail('Select a scheme for the group.');
    if (scheme.status !== 'active') return fail('This scheme is inactive. Choose an active scheme.');
    if (!name.trim()) return fail('Enter a group name.');
    if (!startDate) return fail('Select a start date.');
    const year = startDate.slice(0, 4);
    const seq = data.groups.filter(g => g.id.startsWith(`CG-${year}-`)).length + 1;
    const group: ChitGroupRec = {
      id: `CG-${year}-${String(seq).padStart(2, '0')}`,
      name: name.trim(),
      schemeId,
      startDate,
      endDate: addMonths(startDate, scheme.durationMonths - 1),
      totalMembers: scheme.totalMembers,
      durationMonths: scheme.durationMonths,
      totalValue: scheme.totalValue,
      monthlyCollection: scheme.monthlySubscription,
      foremanCommissionPct: scheme.foremanCommissionPct,
      currentMonth: 1,
      status: 'forming',
      closureChecks: {},
    };
    patch(d => ({ groups: [group, ...d.groups], auctions: [...d.auctions, ...buildSeedAuctions(group)] }));
    return ok(group);
  };

  const updateGroup = (groupId: string, fn: (g: ChitGroupRec) => ChitGroupRec) =>
    patch(d => ({ groups: d.groups.map(g => (g.id === groupId ? fn(g) : g)) }));

  const activateGroup: ChitStore['activateGroup'] = groupId => {
    const g = data.groups.find(x => x.id === groupId);
    if (!g) return fail('Group not found.');
    if (g.status !== 'forming') return fail('Only a forming group can be activated.');
    if (!data.allocations.some(a => a.groupId === groupId)) return fail('Allocate at least one member before activating the group.');
    updateGroup(groupId, x => ({ ...x, status: 'active' }));
    return ok(undefined);
  };

  const advanceMonth: ChitStore['advanceMonth'] = groupId => {
    const g = data.groups.find(x => x.id === groupId);
    if (!g) return fail('Group not found.');
    if (g.status !== 'active') return fail('Activate the group before moving to the next month.');
    if (g.currentMonth >= g.durationMonths) return fail('The group is already in its final month.');
    const a = auctionOf(data, groupId, g.currentMonth);
    if (a && a.status === 'not_conducted') return fail(`Record or postpone the Month ${g.currentMonth} auction before moving on.`);
    updateGroup(groupId, x => ({ ...x, currentMonth: x.currentMonth + 1 }));
    return ok(undefined);
  };

  const setClosureCheck: ChitStore['setClosureCheck'] = (groupId, key, value) =>
    updateGroup(groupId, g => ({ ...g, closureChecks: { ...g.closureChecks, [key]: value } }));

  const closeGroup: ChitStore['closeGroup'] = groupId => {
    const g = data.groups.find(x => x.id === groupId);
    if (!g) return fail('Group not found.');
    if (g.status === 'closed') return fail('Group is already closed.');
    if (closureChecklist(data, g).some(i => !i.passed)) return fail('Complete every reconciliation item before closing the group.');
    updateGroup(groupId, x => ({ ...x, status: 'closed', closedOn: todayStr() }));
    return ok(undefined);
  };

  // ---- Member allocation --------------------------------------------------

  const allocateMembers: ChitStore['allocateMembers'] = (groupId, picks) => {
    const g = data.groups.find(x => x.id === groupId);
    if (!g) return fail('Group not found.');
    if (g.status === 'closed') return fail('This group is closed.');
    if (picks.length === 0) return fail('Select at least one member.');
    const existing = data.allocations.filter(a => a.groupId === groupId);
    if (existing.length + picks.length > g.totalMembers) {
      return fail(`Only ${g.totalMembers - existing.length} slot(s) left in this group.`);
    }
    const tickets = new Set(existing.map(a => a.ticketNumber));
    const profiles = new Set(existing.map(a => a.profileId));
    for (const p of picks) {
      if (!Number.isInteger(p.ticketNumber) || p.ticketNumber < 1 || p.ticketNumber > g.totalMembers) {
        return fail(`Ticket numbers must be between 1 and ${g.totalMembers}.`);
      }
      if (tickets.has(p.ticketNumber)) return fail(`Ticket #${p.ticketNumber} is already assigned in this group.`);
      if (profiles.has(p.profileId)) return fail('A selected member is already allocated to this group.');
      tickets.add(p.ticketNumber);
      profiles.add(p.profileId);
    }
    const joinMonth = g.status === 'forming' ? 1 : g.currentMonth;
    const created: ChitAllocation[] = picks.map(p => ({
      id: uid('AL'),
      groupId,
      profileId: p.profileId,
      ticketNumber: p.ticketNumber,
      monthlyContribution: g.monthlyCollection,
      joinMonth,
      allocatedOn: todayStr(),
    }));
    patch(d => ({ allocations: [...d.allocations, ...created] }));
    return ok(undefined);
  };

  const removeAllocation: ChitStore['removeAllocation'] = allocationId => {
    const touched =
      data.payments.some(p => p.allocationId === allocationId) ||
      data.penalties.some(p => p.allocationId === allocationId) ||
      data.dividends.some(p => p.allocationId === allocationId) ||
      data.prizes.some(p => p.allocationId === allocationId) ||
      data.auctions.some(a => a.winnerAllocationId === allocationId);
    if (touched) return fail('This ticket already has ledger activity and cannot be removed.');
    patch(d => ({ allocations: d.allocations.filter(a => a.id !== allocationId) }));
    return ok(undefined);
  };

  // ---- Collections --------------------------------------------------------

  const recordPayment: ChitStore['recordPayment'] = input => {
    const a = data.allocations.find(x => x.id === input.allocationId);
    const g = a && data.groups.find(x => x.id === a.groupId);
    if (!a || !g) return fail('Ticket not found.');
    if (g.status === 'closed') return fail('This group is closed.');
    if (!input.date) return fail('Select the payment date.');
    const cash = input.cashAmount || 0;
    const bank = input.bankAmount || 0;
    if (cash < 0 || bank < 0) return fail('Amounts cannot be negative.');
    const total = cash + bank;
    if (!(total > 0)) return fail('Enter an amount received greater than zero.');
    if (bank > 0) {
      if (!input.bankMode || input.bankMode === 'cash') return fail('Select how the bank amount was paid (UPI, Bank Transfer or Cheque).');
      if (!input.bankAccountId) return fail('Select the bank account that received the amount.');
      if (!input.reference?.trim()) return fail('Enter the transaction reference for the bank amount.');
    }
    const row = buildLedger(data, g, input.month).find(r => r.allocation.id === a.id);
    if (!row) return fail('This ticket has no instalment due for the selected month.');

    let penaltyDelta = 0;
    if (input.penaltyTotal !== undefined) {
      if (!(input.penaltyTotal >= 0)) return fail('Penalty cannot be negative.');
      penaltyDelta = input.penaltyTotal - row.penalty;
    }
    const balance = row.balance + penaltyDelta;
    if (total > balance) return fail(`Amount exceeds the pending balance of ₹${balance.toLocaleString('en-IN')}.`);

    const payment: ChitPayment = {
      id: uid('PAY'),
      receiptNumber: nextReceiptNumber(),
      groupId: g.id,
      allocationId: a.id,
      month: input.month,
      amount: total,
      cashAmount: cash,
      bankAmount: bank,
      bankAccountId: bank > 0 ? input.bankAccountId : undefined,
      date: input.date,
      mode: bank > 0 ? input.bankMode! : 'cash',
      reference: input.reference?.trim() || undefined,
      remarks: input.remarks?.trim() || undefined,
      recordedBy: userName,
    };
    const adjustment: ChitPenalty[] =
      penaltyDelta !== 0
        ? [{ id: uid('PEN'), groupId: g.id, allocationId: a.id, month: input.month, amount: penaltyDelta, date: input.date, reason: penaltyDelta > 0 ? 'Penalty added at collection' : 'Penalty reduced at collection' }]
        : [];
    patch(d => ({ payments: [...d.payments, payment], penalties: [...d.penalties, ...adjustment] }));

    // Each part lands in its own book: cash in the Cash Book, the bank part in the chosen account's Bank Book.
    const party = profileName(a.id);
    const post = (mode: 'cash' | 'bank', amount: number) =>
      postCentralTransaction({
        amount,
        direction: 'receipt',
        mode,
        bankAccountId: mode === 'bank' ? input.bankAccountId : undefined,
        classification: 'accounted',
        sourceModule: 'Chit Fund',
        sourceRecordId: payment.receiptNumber,
        partyName: party,
        description: `Chit instalment — ${g.name} · Ticket #${a.ticketNumber} · Month ${input.month}`,
        remarks: [mode === 'bank' && input.reference, input.remarks].filter(Boolean).join(' • ') || undefined,
        date: input.date,
      });
    if (cash > 0) post('cash', cash);
    if (bank > 0) post('bank', bank);
    return ok(payment);
  };

  const addPenalty: ChitStore['addPenalty'] = input => {
    const a = data.allocations.find(x => x.id === input.allocationId);
    if (!a) return fail('Ticket not found.');
    if (!(input.amount > 0)) return fail('Enter a penalty amount greater than zero.');
    if (!input.reason.trim()) return fail('Enter a reason for the penalty.');
    const penalty: ChitPenalty = { id: uid('PEN'), groupId: a.groupId, ...input, reason: input.reason.trim() };
    patch(d => ({ penalties: [...d.penalties, penalty] }));
    return ok(undefined);
  };

  // ---- Auction details ----------------------------------------------------

  const removeMonthOutcome = (d: ChitData, groupId: string, month: number): Partial<ChitData> => ({
    dividends: d.dividends.filter(x => !(x.groupId === groupId && x.month === month)),
    prizes: d.prizes.filter(x => !(x.groupId === groupId && x.month === month)),
  });

  const setAuctionStatus: ChitStore['setAuctionStatus'] = (auctionId, input) => {
    const a = data.auctions.find(x => x.id === auctionId);
    if (!a) return fail('Auction month not found.');
    if (a.status === 'conducted' && isAuctionLocked(data, a.groupId, a.month)) {
      return fail('Dividend credits or a prize payment already exist for this month, so the recorded result is locked.');
    }
    patch(d => ({
      ...(a.status === 'conducted' ? removeMonthOutcome(d, a.groupId, a.month) : {}),
      auctions: d.auctions.map(x =>
        x.id === auctionId
          ? {
              ...x,
              status: input.status,
              remarks: input.remarks?.trim() || undefined,
              scheduledDate: input.scheduledDate || x.scheduledDate,
              auctionDate: undefined,
              winnerAllocationId: undefined,
              ticketNumber: undefined,
              prizeAmount: undefined,
              discountAmount: undefined,
              commissionPct: undefined,
              commissionAmount: undefined,
              dividendAmount: undefined,
            }
          : x
      ),
    }));
    return ok(undefined);
  };

  const recordAuction: ChitStore['recordAuction'] = (auctionId, input) => {
    const a = data.auctions.find(x => x.id === auctionId);
    const g = a && data.groups.find(x => x.id === a.groupId);
    if (!a || !g) return fail('Auction month not found.');
    if (g.status === 'closed') return fail('This group is closed.');
    if (a.status === 'conducted' && isAuctionLocked(data, a.groupId, a.month)) {
      return fail('Dividend credits or a prize payment already exist for this month, so the recorded result is locked.');
    }
    const winner = data.allocations.find(x => x.id === input.winnerAllocationId && x.groupId === g.id);
    if (!winner) return fail('Select the winning member from the group members.');
    if (data.auctions.some(x => x.groupId === g.id && x.id !== a.id && x.winnerAllocationId === winner.id)) {
      return fail('This ticket has already won an earlier auction in this group.');
    }
    if (!input.auctionDate) return fail('Enter the auction date.');
    if (!(input.poolAmount > 0)) return fail('Enter the monthly pool amount.');
    if (!(input.prizeAmount > 0)) return fail('Enter the winning bid / prize amount.');
    const money = [input.discountAmount, input.commissionAmount, input.dividendAmount];
    if (money.some(v => !Number.isFinite(v) || v < 0)) return fail('Discount, commission and dividend must be zero or more.');
    if (input.commissionPct < 0 || input.commissionPct > 100) return fail('Select a valid commission percentage.');

    // Dividend rows start at zero: the operator allocates the entered dividend by hand.
    const newDividends: ChitDividend[] = data.allocations
      .filter(x => x.groupId === g.id && x.id !== winner.id)
      .map(x => ({ id: uid('DIV'), groupId: g.id, month: a.month, allocationId: x.id, eligible: true, eligibleAmount: 0 }));

    patch(d => {
      const prior = d.prizes.find(p => p.groupId === g.id && p.month === a.month);
      const same = prior && prior.allocationId === winner.id;
      const prize: ChitPrize = {
        id: prior?.id || uid('PRZ'),
        groupId: g.id,
        month: a.month,
        allocationId: winner.id,
        amount: input.prizeAmount,
        verification: same ? prior.verification : 'pending',
        disbursed: false,
        remarks: same ? prior.remarks : undefined,
      };
      return {
        auctions: d.auctions.map(x =>
          x.id === a.id
            ? {
                ...x,
                status: 'conducted',
                auctionDate: input.auctionDate,
                winnerAllocationId: winner.id,
                ticketNumber: winner.ticketNumber,
                poolAmount: input.poolAmount,
                prizeAmount: input.prizeAmount,
                discountAmount: input.discountAmount,
                commissionPct: input.commissionPct,
                commissionAmount: input.commissionAmount,
                dividendAmount: input.dividendAmount,
                remarks: input.remarks?.trim() || undefined,
              }
            : x
        ),
        dividends: [...d.dividends.filter(x => !(x.groupId === g.id && x.month === a.month)), ...newDividends],
        prizes: [...d.prizes.filter(x => !(x.groupId === g.id && x.month === a.month)), prize],
      };
    });
    return ok(undefined);
  };

  // ---- Dividends ----------------------------------------------------------

  const saveDividendAllocation: ChitStore['saveDividendAllocation'] = (groupId, month, rows) => {
    const summary = dividendSummary(data, groupId, month);
    const total = sum(rows.filter(r => r.eligible).map(r => r.amount));
    if (rows.some(r => r.amount < 0 || !Number.isFinite(r.amount))) return fail('Dividend amounts cannot be negative.');
    if (total > summary.distributable) {
      return fail(`Allocated ₹${total.toLocaleString('en-IN')} exceeds the distributable dividend of ₹${summary.distributable.toLocaleString('en-IN')} entered for this auction.`);
    }
    for (const r of rows) {
      const existing = data.dividends.find(x => x.groupId === groupId && x.month === month && x.allocationId === r.allocationId);
      const credited = existing ? dividendCredited(data, existing.id) : 0;
      if (credited > 0 && (!r.eligible || r.amount < credited)) {
        return fail(`${profileName(r.allocationId)} has already been credited ₹${credited.toLocaleString('en-IN')}; the allocation cannot go below that.`);
      }
    }
    patch(d => {
      const kept = d.dividends.filter(x => !(x.groupId === groupId && x.month === month && rows.some(r => r.allocationId === x.allocationId)));
      const updated: ChitDividend[] = rows.map(r => ({
        id: d.dividends.find(x => x.groupId === groupId && x.month === month && x.allocationId === r.allocationId)?.id || uid('DIV'),
        groupId,
        month,
        allocationId: r.allocationId,
        eligible: r.eligible,
        eligibleAmount: r.eligible ? r.amount : 0,
      }));
      return { dividends: [...kept, ...updated] };
    });
    return ok(undefined);
  };

  const recordDividendCredits: ChitStore['recordDividendCredits'] = (entries, date, note) => {
    if (!date) return fail('Enter the credit date.');
    const credits: ChitDividendCredit[] = [];
    for (const e of entries) {
      const div = data.dividends.find(x => x.id === e.dividendId);
      if (!div) return fail('Dividend row not found.');
      if (!(e.amount > 0)) return fail('Enter a credit amount greater than zero.');
      const remaining = div.eligibleAmount - dividendCredited(data, div.id);
      if (e.amount > remaining) return fail(`${profileName(div.allocationId)}: credit exceeds the pending dividend of ₹${remaining.toLocaleString('en-IN')}.`);
      credits.push({
        id: uid('DCR'),
        dividendId: div.id,
        groupId: div.groupId,
        allocationId: div.allocationId,
        month: div.month,
        amount: e.amount,
        date,
        note: note?.trim() || undefined,
      });
    }
    patch(d => ({ credits: [...d.credits, ...credits] }));
    return ok(undefined);
  };

  // ---- Prize disbursement -------------------------------------------------

  const updatePrizeVerification: ChitStore['updatePrizeVerification'] = (prizeId, verification, remarks) => {
    const p = data.prizes.find(x => x.id === prizeId);
    if (!p) return fail('Prize record not found.');
    if (p.disbursed) return fail('This prize has already been disbursed.');
    patch(d => ({ prizes: d.prizes.map(x => (x.id === prizeId ? { ...x, verification, remarks: remarks?.trim() || undefined } : x)) }));
    return ok(undefined);
  };

  const recordDisbursement: ChitStore['recordDisbursement'] = (prizeId, input) => {
    const p = data.prizes.find(x => x.id === prizeId);
    if (!p) return fail('Prize record not found.');
    if (p.disbursed) return fail('This prize has already been disbursed.');
    if (input.verification !== 'verified') return fail('The security / guarantee verification must be marked Verified before the prize is disbursed.');
    if (!input.date) return fail('Enter the disbursement date.');
    if (!input.mode) return fail('Select the payment mode.');
    if (input.mode !== 'cash' && !input.reference?.trim()) return fail('Enter the transaction reference for a non-cash payment.');
    patch(d => ({
      prizes: d.prizes.map(x =>
        x.id === prizeId
          ? { ...x, verification: 'verified', disbursed: true, disbursementDate: input.date, mode: input.mode, reference: input.reference?.trim() || undefined, remarks: input.remarks?.trim() || undefined }
          : x
      ),
    }));
    return ok(undefined);
  };

  const value = useMemo<ChitStore>(
    () => ({
      data,
      saveScheme,
      createGroup,
      activateGroup,
      advanceMonth,
      setClosureCheck,
      closeGroup,
      allocateMembers,
      removeAllocation,
      recordPayment,
      addPenalty,
      setAuctionStatus,
      recordAuction,
      saveDividendAllocation,
      recordDividendCredits,
      updatePrizeVerification,
      recordDisbursement,
    }),
    // Actions close over `data`, so they are rebuilt whenever it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  return <ChitContext.Provider value={value}>{children}</ChitContext.Provider>;
};
