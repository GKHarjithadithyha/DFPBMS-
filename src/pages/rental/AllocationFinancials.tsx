import React, { useMemo, useState } from 'react';
import { Banknote, CalendarDays, ChevronLeft, ChevronRight, Info, Landmark, Shuffle, TrendingUp } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Field, inputCls } from './rentalUi';
import { dueDateFor } from '../../utils/rentalUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';

/* ------------------------------------------------------------------ */
/* Date helpers (all YYYY-MM-DD, local time)                           */
/* ------------------------------------------------------------------ */
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const monthKey = (date: string) => date.slice(0, 7);
const parts = (date: string) => ({ y: Number(date.slice(0, 4)), m0: Number(date.slice(5, 7)) - 1, d: Number(date.slice(8, 10)) });
const daysIn = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** Adds calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export const addMonthsTo = (date: string, n: number) => {
  const { y, m0, d } = parts(date);
  const t = new Date(y, m0 + n, 1);
  return ymd(t.getFullYear(), t.getMonth(), Math.min(d, daysIn(t.getFullYear(), t.getMonth())));
};

export const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
};

/** First occurrence of the recurring day on or after `from`, honouring short months. */
export const nextDueFrom = (day: number, from: string) => {
  const { y, m0 } = parts(from);
  const here = dueDateFor(ymd(y, m0, 1).slice(0, 7), day);
  return here >= from ? here : dueDateFor(monthKey(addMonthsTo(ymd(y, m0, 1), 1)), day);
};

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/* Payment due date calendar                                           */
/* ------------------------------------------------------------------ */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DueDatePicker: React.FC<{
  /** The picked date; its day-of-month becomes the recurring payment day. */
  value: string;
  onChange: (date: string) => void;
  /** Dues cannot fall before the occupancy starts; used to compute the next due date. */
  startDate: string;
  today: string;
}> = ({ value, onChange, startDate, today }) => {
  const [open, setOpen] = useState(false);
  const sel = parts(value);
  const [view, setView] = useState({ y: sel.y, m0: sel.m0 });

  const day = sel.d;
  const next = nextDueFrom(day, startDate > today ? startDate : today);

  const first = new Date(view.y, view.m0, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first grid
  const total = daysIn(view.y, view.m0);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    const t = new Date(view.y, view.m0 + n, 1);
    setView({ y: t.getFullYear(), m0: t.getMonth() });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setView({ y: sel.y, m0: sel.m0 }); setOpen(o => !o); }}
        className={`${inputCls} flex items-center justify-between text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="font-medium text-slate-800">{formatDate(value)}</span>
        <CalendarDays className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Choose payment due date" className="absolute left-0 z-50 mt-1.5 w-[17.5rem] max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-semibold text-slate-800">{MONTH_NAMES[view.m0]} {view.y}</span>
              <button type="button" aria-label="Next month" onClick={() => shift(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400 mb-1">
              {WEEKDAYS.map(w => <span key={w} className="py-1">{w}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const date = ymd(view.y, view.m0, d);
                const selected = date === value;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(date); setOpen(false); }}
                    className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                      selected ? 'bg-emerald-600 text-white' : date === today ? 'ring-1 ring-emerald-500 text-emerald-700 hover:bg-emerald-50' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px]">
              <button type="button" className="text-emerald-700 font-semibold hover:underline" onClick={() => { const p = parts(today); setView({ y: p.y, m0: p.m0 }); }}>Go to today</button>
              <button type="button" className="text-slate-500 hover:underline" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </>
      )}

      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
        <p>Recurring: <b className="text-slate-700">{ordinal(day)} of every month</b>{day > 28 && ' (last day in shorter months)'}</p>
        <p>Next payment due: <b className="text-slate-700">{formatDate(next)}</b></p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Annual rent escalation                                              */
/* ------------------------------------------------------------------ */
const MAX_ROWS = 12;

export const RentEscalationSection: React.FC<{
  enabled: boolean;
  onToggle: (v: boolean) => void;
  percent: string;
  onPercent: (v: string) => void;
  baseRent: number;
  startDate: string;
  durationMonths: number;
  today: string;
}> = ({ enabled, onToggle, percent, onPercent, baseRent, startDate, durationMonths, today }) => {
  const pct = Math.max(0, Number(percent) || 0);

  const schedule = useMemo(() => {
    const blocks = Math.ceil(durationMonths / 12);
    return Array.from({ length: Math.min(blocks, MAX_ROWS) }, (_, k) => {
      const from = k * 12 + 1;
      const to = Math.min((k + 1) * 12, durationMonths);
      const rent = Math.round(baseRent * Math.pow(1 + pct / 100, k) * 100) / 100;
      return { k, from, to, rent, start: addMonthsTo(startDate, k * 12), end: addMonthsTo(startDate, to) };
    });
  }, [baseRent, pct, durationMonths, startDate]);

  const blocks = Math.ceil(durationMonths / 12);
  const revised = schedule[1]?.rent ?? baseRent;

  // Next anniversary that is still ahead of today and inside the rental term.
  const nextEscalation = useMemo(() => {
    for (let k = 1; k < blocks; k++) {
      const d = addMonthsTo(startDate, k * 12);
      if (d > today) return d;
    }
    return '';
  }, [blocks, startDate, today]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Annual Rent Escalation</h4>
        </div>
        <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <span>{enabled ? 'Enabled' : 'Disabled'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable annual rent escalation"
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </label>
      </div>

      {enabled && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Annual Rent Hike" required>
              <div className="relative">
                <input type="number" min={0} max={100} step="0.1" value={percent} onChange={e => onPercent(e.target.value)} className={`${inputCls} font-mono pr-8`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
              </div>
            </Field>
            <Field label="Escalation Frequency">
              <input readOnly value="Every 12 Months" className={`${inputCls} bg-slate-50 text-slate-700`} />
            </Field>
            <Field label="Next Escalation Date">
              <input readOnly value={nextEscalation ? formatDate(nextEscalation) : '—'} className={`${inputCls} bg-slate-50 text-slate-700`} />
            </Field>
            <Field label="Current Monthly Rent">
              <input readOnly value={money(baseRent)} className={`${inputCls} bg-slate-50 font-mono text-slate-700`} />
            </Field>
            <Field label="Revised Monthly Rent" hint="After the first escalation.">
              <input readOnly value={money(revised)} className={`${inputCls} bg-emerald-50/60 font-mono font-bold text-emerald-800`} />
            </Field>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Rental schedule preview</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Period</th>
                    <th className="text-left font-semibold px-3 py-2">Dates</th>
                    <th className="text-right font-semibold px-3 py-2">Monthly Rent</th>
                    <th className="text-right font-semibold px-3 py-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedule.map(r => (
                    <tr key={r.k}>
                      <td className="px-3 py-1.5 font-medium text-slate-800 whitespace-nowrap">Month {r.from}{r.to > r.from ? `–${r.to}` : ''}</td>
                      <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{formatDate(r.start)} – {formatDate(r.end)}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums font-semibold text-slate-900">{money(r.rent)}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-500">
                        {r.k === 0 ? 'Base' : `+${money(Math.round((r.rent - schedule[r.k - 1].rent) * 100) / 100)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {blocks > MAX_ROWS && <p className="mt-1 text-[10px] text-slate-400">Showing the first {MAX_ROWS} years of {blocks}.</p>}
          </div>

          <p className="flex items-start space-x-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            <span>The rent increases by this percentage every 12 months, compounded on the previous year's rent. This is a planning preview and is not saved with the allocation.</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Deposit receipt: Cash Book, Bank Book or both                       */
/* ------------------------------------------------------------------ */
export type DepositChannel = 'cash' | 'bank' | 'both';

export const DepositReceiptSelector: React.FC<{
  total: number;
  channel: DepositChannel;
  onChannel: (c: DepositChannel) => void;
  cashAmount: string;
  onCashAmount: (v: string) => void;
  bankAccountId: string;
  onBankAccount: (id: string) => void;
}> = ({ total, channel, onChannel, cashAmount, onCashAmount, bankAccountId, onBankAccount }) => {
  const { bankAccounts, totalCashBalance } = useERP();
  const cash = Math.min(total, Math.max(0, Number(cashAmount) || 0));
  const bank = total - cash;
  const options: { id: DepositChannel; label: string; icon: React.ComponentType<{ className?: string }>; note: string }[] = [
    { id: 'cash', label: 'Cash Book', icon: Banknote, note: `Avail: ${formatCurrency(totalCashBalance)}` },
    { id: 'bank', label: 'Bank Book', icon: Landmark, note: `${bankAccounts.length} accounts` },
    { id: 'both', label: 'Cash + Bank', icon: Shuffle, note: 'Part in each' },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">Received into <span className="text-rose-500">*</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onChannel(o.id);
              if (o.id === 'both' && !(Number(cashAmount) > 0)) onCashAmount('');
            }}
            className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
              channel === o.id ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg ${channel === o.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}><o.icon className="w-4 h-4" /></span>
              <span className="font-semibold">{o.label}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono text-right">{o.note}</span>
          </button>
        ))}
      </div>

      {channel === 'both' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Cash amount (₹)" required>
            <input type="number" min={1} max={total - 1} value={cashAmount} onChange={e => onCashAmount(e.target.value)} className={`${inputCls} font-mono`} placeholder="e.g. 50000" />
          </Field>
          <Field label="Bank amount (₹)" hint="Balance of the deposit.">
            <input readOnly value={bank.toLocaleString('en-IN')} className={`${inputCls} bg-slate-50 font-mono text-slate-700`} />
          </Field>
          <Field label="Total deposit">
            <input readOnly value={total.toLocaleString('en-IN')} className={`${inputCls} bg-slate-50 font-mono font-bold text-slate-700`} />
          </Field>
        </div>
      )}

      {channel !== 'cash' && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Receiving bank account <span className="text-rose-500">*</span></span>
            <span className="text-[11px] text-slate-400">Updates Bank Book automatically</span>
          </div>
          <select value={bankAccountId} onChange={e => onBankAccount(e.target.value)} className={inputCls}>
            <option value="">— Select Bank Account —</option>
            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — A/c: {b.accountNumber} (Bal: {formatCurrency(b.currentBalance)})</option>)}
          </select>
        </div>
      )}
    </div>
  );
};
