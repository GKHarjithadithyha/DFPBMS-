import React, { useState } from 'react';
import { Banknote, CheckCircle2, Landmark, Pause, Pencil, Play, ReceiptText, Shuffle } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { PaymentMode, RentalSettlement } from '../../types';
import { Field, Pill, inputCls, primaryBtn, secondaryBtn, useRentalData } from './rentalUi';
import { todayStr } from '../../utils/rentalUtils';

type Tone = 'green' | 'amber' | 'rose';

/** Pending Refund / Partially Refunded / Fully Refunded / Refund On Hold (or the tenant-payable equivalents). */
export const refundStatus = (s: RentalSettlement): { label: string; tone: Tone } => {
  if (s.refundableAmount <= 0) {
    if (s.status === 'settled') return { label: 'Settled', tone: 'green' };
    return s.status === 'partially_settled' ? { label: 'Partially Settled', tone: 'amber' } : { label: 'Payment Pending', tone: 'rose' };
  }
  if (s.status === 'settled') return { label: 'Fully Refunded', tone: 'green' };
  if (s.onHold) return { label: 'Refund On Hold', tone: 'rose' };
  return s.status === 'partially_settled' ? { label: 'Partially Refunded', tone: 'amber' } : { label: 'Pending Refund', tone: 'rose' };
};

export const RefundStatusPill: React.FC<{ settlement: RentalSettlement }> = ({ settlement }) => {
  const s = refundStatus(settlement);
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

const sumOf = (s: RentalSettlement, mode: PaymentMode) =>
  s.payments.filter(p => p.direction === 'payment' && p.mode === mode).reduce((t, p) => t + p.amount, 0);
export const cashRefunded = (s: RentalSettlement) => sumOf(s, 'cash');
export const bankRefunded = (s: RentalSettlement) => sumOf(s, 'bank');

type Channel = 'cash' | 'bank' | 'both';
const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank', label: 'Bank Transfer', icon: Landmark },
  { id: 'both', label: 'Cash + Bank', icon: Shuffle },
];

export const SettlementPanel: React.FC<{
  settlementId: string;
  onClose: () => void;
  onConfirmHandover: () => { ok: boolean; message?: string };
}> = ({ settlementId, onClose, onConfirmHandover }) => {
  const { rentalSettlements, rentalAgreements, bankAccounts, userName, processSettlementRefund, reviseSettlement, setSettlementHold, recordSettlementPayment } = useERP();
  const data = useRentalData();
  const s = rentalSettlements.find(x => x.id === settlementId);

  const [date, setDate] = useState(todayStr());
  const [channel, setChannel] = useState<Channel>('cash');
  const [cashAmt, setCashAmt] = useState('');
  const [bankAmt, setBankAmt] = useState('');
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || '');
  const [utr, setUtr] = useState('');
  const [remarks, setRemarks] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [editing, setEditing] = useState(false);
  const [eOther, setEOther] = useState('0');
  const [eDed, setEDed] = useState('0');
  const [eNote, setENote] = useState('');
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  // Tenant-payable settlements keep the simple single payment form.
  const [payMode, setPayMode] = useState<PaymentMode>('cash');
  const [payBank, setPayBank] = useState('');
  const [payAmt, setPayAmt] = useState('');

  if (!s) return null;

  const agreement = rentalAgreements.find(a => a.id === s.agreementId);
  const child = data.childById.get(s.childPropertyId);
  const tenant = data.profileById.get(s.tenantProfileId);
  const refundDir = s.refundableAmount > 0;
  const target = refundDir ? s.refundableAmount : s.payableByTenant;
  const remaining = Math.max(0, target - s.settledAmount);
  const lease = s.occupancyType === 'lease';

  const cashN = channel === 'bank' ? 0 : Number(cashAmt) || 0;
  const bankN = channel === 'cash' ? 0 : Number(bankAmt) || 0;
  const total = cashN + bankN;
  const after = remaining - total;

  const pick = (next: Channel) => {
    const typed = Number(cashAmt) || Number(bankAmt) || 0;
    if (next === 'cash') { setCashAmt(typed ? String(typed) : ''); setBankAmt(''); }
    if (next === 'bank') { setBankAmt(typed ? String(typed) : ''); setCashAmt(''); }
    setChannel(next);
    setError('');
    setConfirming(false);
  };

  const validate = () => {
    if (!date) return 'Select the refund date.';
    if (cashN < 0 || bankN < 0) return 'Amounts cannot be negative.';
    if (!(total > 0)) return 'Enter a cash or bank refund amount.';
    if (total > remaining) return `Cash + bank (${formatCurrency(total)}) exceeds the remaining refund of ${formatCurrency(remaining)}.`;
    if (bankN > 0 && !bankId) return 'Select the bank account the refund is paid from.';
    if (bankN > 0 && !utr.trim()) return 'Enter the UTR / transaction reference for the bank refund.';
    return '';
  };

  const refundGroups = (() => {
    const m = new Map<string, { id: string; date: string; cash: number; bank: number; reference?: string; remarks?: string; bankAccountId?: string }>();
    s.payments.filter(p => p.direction === 'payment').forEach((p, i) => {
      const key = p.refundId || `legacy-${i}`;
      const g = m.get(key) || { id: p.refundId || `${s.id}-P${i + 1}`, date: p.date, cash: 0, bank: 0, reference: p.reference, remarks: p.remarks };
      if (p.mode === 'cash') g.cash += p.amount; else { g.bank += p.amount; g.bankAccountId = p.bankAccountId; }
      g.reference = g.reference || p.reference;
      m.set(key, g);
    });
    return [...m.values()];
  })();

  const buildReceipt = (g: { id: string; date: string; cash: number; bank: number; reference?: string; bankAccountId?: string }): ReceiptData => {
    const bankName = bankAccounts.find(b => b.id === (g.bankAccountId || bankId))?.bankName;
    return {
      receiptNumber: g.id,
      date: g.date,
      customerName: tenant?.name || 'Tenant',
      profileId: s.tenantProfileId,
      moduleName: `Rental — Security Deposit Refund · ${child?.unitNumber || ''}`,
      sourceRecordId: s.id,
      totalAmount: g.cash + g.bank,
      paymentMode: g.cash > 0 && g.bank > 0 ? 'Cash + Bank Transfer' : g.bank > 0 ? 'Bank Transfer' : 'Cash',
      bankName: g.bank > 0 ? bankName : undefined,
      collectedBy: userName,
      allocations: [
        ...(g.cash > 0 ? [{ label: 'Refund paid in cash', amount: g.cash }] : []),
        ...(g.bank > 0 ? [{ label: `Refund by bank transfer${g.reference ? ` (UTR ${g.reference})` : ''}`, amount: g.bank }] : []),
      ],
      remarks: `Settlement ${s.id} • Total refundable ${formatCurrency(s.refundableAmount)} • Refunded so far ${formatCurrency(s.settledAmount)} • Remaining ${formatCurrency(remaining)}`,
    };
  };

  const process = () => {
    const res = processSettlementRefund(s.id, { date, cashAmount: cashN, bankAmount: bankN, bankAccountId: bankN > 0 ? bankId : undefined, reference: utr, remarks });
    if (!res.ok) { setError(res.message || 'Refund failed.'); setConfirming(false); return; }
    setReceipt(buildReceipt({ id: res.id || '', date, cash: cashN, bank: bankN, reference: utr.trim() || undefined }));
    setConfirming(false);
    setCashAmt(''); setBankAmt(''); setUtr(''); setRemarks(''); setError('');
  };

  const saveEdit = () => {
    const res = reviseSettlement(s.id, { otherDues: Number(eOther) || 0, deductions: Number(eDed) || 0, deductionDescription: eNote });
    if (!res.ok) { setError(res.message || 'Could not update the deductions.'); return; }
    setEditing(false);
    setError('');
  };

  const Line: React.FC<{ k: React.ReactNode; v: React.ReactNode; bold?: boolean; sign?: '−' | '+' }> = ({ k, v, bold, sign }) => (
    <div className={`flex justify-between py-1 text-xs ${bold ? 'font-bold border-t border-slate-300 mt-1 pt-2 text-slate-900' : 'text-slate-600'}`}>
      <span>{sign ? `${sign} ` : ''}{k}</span>
      <span className="font-mono tabular-nums">{v}</span>
    </div>
  );

  const status = refundStatus(s);
  const totalDeductions = s.pendingRent + s.pendingMaintenance + s.otherDues + s.deductions;
  const security = agreement?.securityDeposit ?? s.refundableDeposit;
  const advance = agreement?.advanceAmount ?? Math.max(0, s.refundableDeposit - security);

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={`${refundDir || !s.payableByTenant ? 'Final Settlement & Refund' : 'Final Settlement'} — ${s.id}`}
        subtitle={`${tenant?.name || ''} • ${child?.unitNumber || ''} • vacating ${formatDate(s.vacatingDate)}`}
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Settlement figures */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                {([
                  ['Tenant', tenant?.name],
                  ['Property', data.parentOf(s.childPropertyId)?.name],
                  [lease ? 'Unit / Office' : 'Flat / Office', child?.unitNumber],
                  ['Occupancy start', agreement ? formatDate(agreement.occupancyStartDate || agreement.startDate) : '—'],
                  ['Vacating date', formatDate(s.vacatingDate)],
                  ['Status', <Pill key="st" tone={status.tone}>{status.label}</Pill>],
                ] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</div>
                    <div className="font-semibold text-slate-900">{v || '—'}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Refund calculation</h4>
                  {s.status !== 'settled' && !editing && (
                    <button type="button" className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 hover:underline" onClick={() => { setEOther(String(s.otherDues)); setEDed(String(s.deductions)); setENote(s.deductionDescription); setEditing(true); }}>
                      <Pencil className="w-3 h-3" /><span>Edit deductions</span>
                    </button>
                  )}
                </div>
                <Line k="Security deposit paid" v={formatCurrency(security)} />
                <Line k="Advance amount paid" v={formatCurrency(advance)} sign="+" />
                {!lease && <Line k="Outstanding rent" v={formatCurrency(s.pendingRent)} sign="−" />}
                <Line k="Pending maintenance" v={formatCurrency(s.pendingMaintenance)} sign="−" />
                <Line k="Other outstanding dues" v={formatCurrency(s.otherDues)} sign="−" />
                <Line k="Other deductions" v={formatCurrency(s.deductions)} sign="−" />
                {s.deductionDescription && <p className="text-[11px] italic text-slate-500 py-1">“{s.deductionDescription}”</p>}
                <Line k="Total refundable" v={<span className="text-emerald-700">{formatCurrency(s.refundableAmount)}</span>} bold />
                {s.payableByTenant > 0 && <Line k="Payable by tenant" v={<span className="text-rose-600">{formatCurrency(s.payableByTenant)}</span>} bold />}

                {editing && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Other dues (₹)"><input type="number" min={0} value={eOther} onChange={e => setEOther(e.target.value)} className={`${inputCls} font-mono`} /></Field>
                      <Field label="Other deductions (₹)"><input type="number" min={0} value={eDed} onChange={e => setEDed(e.target.value)} className={`${inputCls} font-mono`} /></Field>
                    </div>
                    <Field label="Remarks" required={(Number(eDed) || 0) > 0} hint="Required whenever a deduction is applied.">
                      <input value={eNote} onChange={e => setENote(e.target.value)} className={inputCls} placeholder="e.g. Wall repainting and door damage" />
                    </Field>
                    <div className="flex justify-end space-x-2">
                      <button type="button" className={secondaryBtn} onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
                      <button type="button" className={primaryBtn} onClick={saveEdit}>Update Settlement</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Exit history summary */}
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Exit history</h4>
                <Line k="Vacating date" v={formatDate(s.vacatingDate)} />
                <Line k="Original security deposit" v={formatCurrency(s.refundableDeposit)} />
                <Line k="Total deductions" v={formatCurrency(totalDeductions)} />
                <Line k="Total refundable" v={formatCurrency(s.refundableAmount)} />
                <Line k="Cash refunded" v={formatCurrency(cashRefunded(s))} />
                <Line k="Bank refunded" v={formatCurrency(bankRefunded(s))} />
                <Line k="Remaining refund" v={<span className={remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(refundDir ? remaining : 0)}</span>} />
                <Line k="Settlement status" v={<Pill tone={status.tone}>{status.label}</Pill>} />
              </div>
            </div>

            {/* Refund processing */}
            <div className="space-y-4">
              {refundDir && s.onHold && s.status !== 'settled' && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs space-y-2">
                  <p className="font-semibold text-rose-800">Refund on hold</p>
                  <p className="text-rose-700">{s.holdReason}</p>
                  <button type="button" className={secondaryBtn} onClick={() => { const r = setSettlementHold(s.id, false); if (!r.ok) setError(r.message || ''); }}>
                    <Play className="w-3.5 h-3.5" /><span>Release hold</span>
                  </button>
                </div>
              )}

              {refundDir && remaining > 0 && !s.onHold && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">Process refund</h4>
                    <span className="text-[11px] text-slate-500">Remaining <b className="font-mono text-slate-800">{formatCurrency(remaining)}</b></span>
                  </div>

                  {!confirming ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {CHANNELS.map(c => (
                          <button key={c.id} type="button" onClick={() => pick(c.id)}
                            className={`flex items-center justify-center space-x-1.5 rounded-lg border p-2 text-[11px] font-semibold ${channel === c.id ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                            <c.icon className="w-3.5 h-3.5" /><span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Refund date" required><input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
                        <div />
                        {channel !== 'bank' && (
                          <Field label="Cash refund amount (₹)" required>
                            <input type="number" min={1} value={cashAmt} onChange={e => { setCashAmt(e.target.value); setError(''); }} className={`${inputCls} font-mono font-bold`} placeholder={channel === 'cash' ? String(remaining) : ''} />
                          </Field>
                        )}
                        {channel !== 'cash' && (
                          <Field label="Bank refund amount (₹)" required>
                            <input type="number" min={1} value={bankAmt} onChange={e => { setBankAmt(e.target.value); setError(''); }} className={`${inputCls} font-mono font-bold`} placeholder={channel === 'bank' ? String(remaining) : ''} />
                          </Field>
                        )}
                      </div>
                      {channel !== 'cash' && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                          <Field label="Bank account" required>
                            <select value={bankId} onChange={e => setBankId(e.target.value)} className={inputCls}>
                              <option value="">— Select bank account —</option>
                              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — A/c {b.accountNumber}</option>)}
                            </select>
                          </Field>
                          <Field label="UTR / transaction reference" required><input value={utr} onChange={e => setUtr(e.target.value)} className={`${inputCls} font-mono`} /></Field>
                        </div>
                      )}
                      <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>

                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-slate-500">Total refunded now</span><b className="font-mono">{formatCurrency(total)}</b></div>
                        <div className="flex justify-between"><span className="text-slate-500">Remaining refund after this</span><b className={`font-mono ${after < 0 ? 'text-rose-600' : after > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>{formatCurrency(Math.max(0, after))}</b></div>
                        {after < 0 && <p className="text-[11px] text-rose-600">Cash + bank exceeds the remaining refund by {formatCurrency(-after)}.</p>}
                        {after > 0 && total > 0 && <p className="text-[11px] text-amber-700">Partial refund — you can record another refund later for the balance.</p>}
                      </div>

                      <div className="flex justify-end">
                        <button type="button" className={primaryBtn} onClick={() => { const m = validate(); setError(m); if (!m) setConfirming(true); }}>Process Refund</button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <p className="font-semibold text-slate-800">Confirm final settlement refund</p>
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        <div className="flex justify-between p-2.5"><span className="text-slate-500">Tenant</span><b>{tenant?.name}</b></div>
                        <div className="flex justify-between p-2.5"><span className="text-slate-500">Total refundable</span><b className="font-mono">{formatCurrency(s.refundableAmount)}</b></div>
                        <div className="flex justify-between p-2.5"><span className="text-slate-500">Already refunded</span><b className="font-mono">{formatCurrency(s.settledAmount)}</b></div>
                        {cashN > 0 && <div className="flex justify-between p-2.5"><span className="text-slate-500">Cash refund → Cash Book</span><b className="font-mono">{formatCurrency(cashN)}</b></div>}
                        {bankN > 0 && (
                          <div className="flex justify-between p-2.5"><span className="text-slate-500">Bank refund → {bankAccounts.find(b => b.id === bankId)?.bankName} Bank Book<span className="block text-[10px] font-mono">UTR {utr}</span></span><b className="font-mono">{formatCurrency(bankN)}</b></div>
                        )}
                        <div className="flex justify-between p-2.5 bg-slate-50"><span className="font-semibold text-slate-700">Refunded now</span><b className="font-mono">{formatCurrency(total)}</b></div>
                        <div className="flex justify-between p-2.5"><span className="font-semibold text-slate-700">Remaining refund balance</span><b className={`font-mono ${after > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>{formatCurrency(after)}</b></div>
                      </div>
                      <p className="text-[11px] text-slate-500">Demo only: this updates the in-app Cash Book / Bank Book. No real transfer is made.</p>
                      <div className="flex justify-end space-x-2">
                        <button type="button" className={secondaryBtn} onClick={() => setConfirming(false)}>Back</button>
                        <button type="button" className={primaryBtn} onClick={process}>Confirm &amp; Process Refund</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!refundDir && remaining > 0 && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const res = recordSettlementPayment(s.id, { date: todayStr(), amount: Number(payAmt) || remaining, mode: payMode, bankAccountId: payMode === 'bank' ? payBank || undefined : undefined });
                    setError(res.ok ? '' : res.message || 'Payment failed.');
                  }}
                  className="rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-800">Record payment from tenant</h4>
                  <Field label="Amount (₹)" required hint={`Balance ${formatCurrency(remaining)}`}>
                    <input type="number" min={1} max={remaining} value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder={String(remaining)} className={`${inputCls} font-mono`} />
                  </Field>
                  <CashBankSelector mode={payMode} onModeChange={setPayMode} bankAccountId={payBank} onBankAccountChange={setPayBank} label="Payment Mode & Book" />
                  <button type="submit" className={primaryBtn}>Record Payment</button>
                </form>
              )}

              {remaining <= 0 && (
                <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <CheckCircle2 className="w-4 h-4" /><span>{refundDir ? 'The refund has been paid in full.' : 'Nothing further to settle on this record.'}</span>
                </div>
              )}

              {refundDir && s.status !== 'settled' && !s.onHold && (
                <div className="text-xs">
                  {!holdOpen ? (
                    <button type="button" className="inline-flex items-center space-x-1 text-slate-500 hover:text-rose-600 font-semibold" onClick={() => setHoldOpen(true)}>
                      <Pause className="w-3.5 h-3.5" /><span>Put refund on hold</span>
                    </button>
                  ) : (
                    <div className="flex items-end gap-2">
                      <Field label="Reason for hold" required className="flex-1"><input value={holdReason} onChange={e => setHoldReason(e.target.value)} className={inputCls} placeholder="e.g. Damage assessment pending" /></Field>
                      <button type="button" className={secondaryBtn} onClick={() => setHoldOpen(false)}>Cancel</button>
                      <button type="button" className={primaryBtn} onClick={() => { const r = setSettlementHold(s.id, true, holdReason); if (r.ok) { setHoldOpen(false); setHoldReason(''); setError(''); } else setError(r.message || ''); }}>Hold</button>
                    </div>
                  )}
                </div>
              )}

              {refundGroups.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Refund transactions</h4>
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                      <tr><th className="text-left py-1 font-semibold">Date</th><th className="text-right font-semibold">Cash</th><th className="text-right font-semibold">Bank</th><th className="text-left pl-3 font-semibold">Ref</th><th /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {refundGroups.map(g => (
                        <tr key={g.id}>
                          <td className="py-1.5 whitespace-nowrap">{formatDate(g.date)}</td>
                          <td className="text-right font-mono">{g.cash ? formatCurrency(g.cash) : '—'}</td>
                          <td className="text-right font-mono">{g.bank ? formatCurrency(g.bank) : '—'}</td>
                          <td className="pl-3 font-mono text-slate-500 truncate max-w-[7rem]" title={g.reference || g.id}>{g.reference || g.id}</td>
                          <td className="text-right">
                            <button type="button" className="inline-flex items-center space-x-1 text-emerald-700 font-semibold hover:underline" onClick={() => setReceipt(buildReceipt(g))}>
                              <ReceiptText className="w-3 h-3" /><span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!s.handoverConfirmed && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-xs space-y-2">
                  <p className="text-amber-900">The unit is still occupied. Confirm the handover to close the occupancy and mark the unit vacant. Unpaid dues are carried into this settlement.</p>
                  <button type="button" onClick={() => { const r = onConfirmHandover(); if (r.ok) onClose(); }} className={primaryBtn}>Confirm Handover &amp; Close Occupancy</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ReceiptModal isOpen={Boolean(receipt)} onClose={() => setReceipt(null)} data={receipt} title="Security Deposit Refund Receipt" />
    </>
  );
};
