import React, { useMemo, useState } from 'react';
import { Banknote, History, Landmark, ReceiptText, Shuffle, ShieldAlert, UserSearch, Wallet } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { LedgerRow, balanceAfter, buildLedger, monthTitle, sum, todayStr } from './chitCalc';
import { BANK_MODES, ChitGroupRec, ChitPayment, PayMode, payModeLabel, paymentModeText } from './chitTypes';
import { MemberProfileModal } from './MemberAllocationView';
import {
  ActionMenu, Field, FormError, LedgerStatusPill, MenuAction, Money,
  filterCls, inputCls, primaryBtn, secondaryBtn, useMemberLookup,
} from './chitUi';

type Navigate = (tabId: string, subTabId?: string) => void;

/** Builds the printable receipt for a recorded payment. */
export const useReceiptBuilder = () => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  return (p: ChitPayment): ReceiptData => {
    const group = data.groups.find(g => g.id === p.groupId)!;
    const info = lookup.info(p.allocationId);
    return {
      receiptNumber: p.receiptNumber,
      date: p.date,
      customerName: info?.name || 'Chit Member',
      profileId: info?.allocation.profileId,
      moduleName: `Chit Fund — ${group.name} · Ticket #${info?.allocation.ticketNumber ?? ''}`,
      sourceRecordId: group.id,
      totalAmount: p.amount,
      paymentMode: paymentModeText(p),
      collectedBy: p.recordedBy,
      allocations: [{ label: `Chit instalment — ${monthTitle(group, p.month)}`, amount: p.amount }],
      remarks: [
        (p.cashAmount ?? 0) > 0 && (p.bankAmount ?? 0) > 0 && `Cash ₹${p.cashAmount!.toLocaleString('en-IN')} + ${payModeLabel(p.mode)} ₹${p.bankAmount!.toLocaleString('en-IN')}`,
        p.reference && `Ref: ${p.reference}`,
        p.remarks,
      ].filter(Boolean).join(' • ') || undefined,
    };
  };
};

interface Row {
  id: string;
  ticket: number;
  name: string;
  instalment: number;
  previous: number;
  penalty: number;
  due: number;
  received: number;
  date: string;
  mode: string;
  status: string;
  ledger: LedgerRow;
}

export const PaymentCollectionView: React.FC<{ group: ChitGroupRec; onNavigate?: Navigate }> = ({ group, onNavigate }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  const receiptFor = useReceiptBuilder();

  const [month, setMonth] = useState(group.currentMonth);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pay, setPay] = useState<{ row: LedgerRow; partial: boolean } | null>(null);
  const [penaltyRow, setPenaltyRow] = useState<LedgerRow | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const activeMonth = Math.min(month, group.durationMonths);
  const ledger = useMemo(() => buildLedger(data, group, activeMonth), [data, group, activeMonth]);
  const expected = sum(ledger.map(r => r.currentDue));
  const collected = sum(ledger.map(r => r.received));
  const closed = group.status === 'closed';

  const rows: Row[] = ledger
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .map(r => ({
      id: r.allocation.id,
      ticket: r.allocation.ticketNumber,
      name: lookup.nameOf(r.allocation.id),
      instalment: r.instalment,
      previous: r.previousOutstanding,
      penalty: r.penalty,
      due: r.currentDue,
      received: r.received,
      date: r.lastPaymentDate ? formatDate(r.lastPaymentDate) : '',
      mode: r.lastMode,
      status: r.status,
      ledger: r,
    }));

  const columns: Column<Row>[] = [
    { header: 'Ticket No.', accessor: 'ticket', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-slate-900">#{r.ticket}</span> },
    { header: 'Member Name', accessor: 'name', sortable: true, render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Monthly Instalment', accessor: 'instalment', className: 'text-right', render: (_v, r) => <Money value={r.instalment} /> },
    { header: 'Previous Pending', accessor: 'previous', className: 'text-right', render: (_v, r) => <Money value={r.previous} tone={r.previous > 0 ? 'bad' : 'muted'} /> },
    { header: 'Penalty', accessor: 'penalty', className: 'text-right', render: (_v, r) => <Money value={r.penalty} tone={r.penalty > 0 ? 'bad' : 'muted'} /> },
    { header: 'Total Due', accessor: 'due', className: 'text-right', render: (_v, r) => <Money value={r.due} bold /> },
    { header: 'Amount Received', accessor: 'received', className: 'text-right', render: (_v, r) => <Money value={r.received} tone={r.received > 0 ? 'good' : 'muted'} /> },
    { header: 'Payment Date', accessor: 'date', render: (_v, r) => <span className="whitespace-nowrap text-slate-600">{r.date || '—'}</span> },
    { header: 'Payment Mode', accessor: 'mode', render: (_v, r) => <span className="text-slate-600">{r.mode || '—'}</span> },
    {
      header: 'Collection Status',
      accessor: 'status',
      render: (_v, r) => (
        <div className="space-y-0.5">
          <LedgerStatusPill status={r.ledger.status} />
          {r.ledger.balance > 0 && r.ledger.received > 0 && (
            <div className="text-[10px] text-slate-500">₹{r.ledger.balance.toLocaleString('en-IN')} pending</div>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => {
        const last = r.ledger.payments[r.ledger.payments.length - 1];
        const owing = r.ledger.balance > 0 && !closed;
        const actions: MenuAction[] = [
          ...(owing ? [{ label: 'Record Partial Payment', icon: Wallet, onClick: () => setPay({ row: r.ledger, partial: true }) }] : []),
          { label: 'View Payment History', icon: History, onClick: () => setHistoryId(r.id) },
          ...(last ? [{ label: 'Generate Receipt', icon: ReceiptText, onClick: () => setReceipt(receiptFor(last)) }] : []),
          ...(!closed ? [{ label: 'Add Penalty', icon: ShieldAlert, onClick: () => setPenaltyRow(r.ledger) }] : []),
          { label: 'View Member Details', icon: UserSearch, onClick: () => setProfileId(r.ledger.allocation.profileId) },
        ];
        return (
          <div className="flex items-center justify-end space-x-1.5">
            {owing && (
              <button type="button" className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap" onClick={() => setPay({ row: r.ledger, partial: false })}>
                Collect Payment
              </button>
            )}
            <ActionMenu actions={actions} />
          </div>
        );
      },
    },
  ];

  const historyInfo = historyId ? lookup.info(historyId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Collection month">
          <select aria-label="Collection month" value={activeMonth} onChange={e => setMonth(Number(e.target.value))} className={`${filterCls} font-semibold`}>
            {Array.from({ length: group.currentMonth }, (_, i) => i + 1).reverse().map(m => (
              <option key={m} value={m}>{monthTitle(group, m)}{m === group.currentMonth ? ' (current)' : ''}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3 flex-1 min-w-[320px]">
          <StatCard title="Expected Collection" value={`₹${expected.toLocaleString('en-IN')}`} subtitle="Instalments + previous pending + penalty" />
          <StatCard title="Total Collected" value={`₹${collected.toLocaleString('en-IN')}`} subtitle={expected ? `${Math.round((collected / expected) * 100)}% of expected` : '—'} />
          <StatCard title="Pending Amount" value={`₹${Math.max(0, expected - collected).toLocaleString('en-IN')}`} subtitle={`${ledger.filter(r => r.balance > 0).length} member(s) pending`} />
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        printable
        searchPlaceholder="Search ticket or member..."
        exportFileName={`chit_${group.id}_month${activeMonth}_collection`}
        printTitle={`${group.name} — Collection Register, ${monthTitle(group, activeMonth)}`}
        emptyTitle="No tickets in this register"
        emptySubtitle="Allocate members to this group to start collecting."
        filterComponent={
          <select aria-label="Collection status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={filterCls}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        }
      />

      {pay && (
        <CollectModal
          group={group}
          month={activeMonth}
          row={pay.row}
          partial={pay.partial}
          onClose={() => setPay(null)}
          onSaved={p => { setPay(null); setReceipt(receiptFor(p)); }}
        />
      )}
      {penaltyRow && <PenaltyModal group={group} month={activeMonth} row={penaltyRow} onClose={() => setPenaltyRow(null)} />}
      {profileId && <MemberProfileModal profileId={profileId} onClose={() => setProfileId(null)} onNavigate={onNavigate} />}

      <Modal
        isOpen={Boolean(historyInfo)}
        onClose={() => setHistoryId(null)}
        title={`Payment History — ${historyInfo?.name || ''}`}
        subtitle={historyInfo ? `${group.name} · Ticket #${historyInfo.allocation.ticketNumber}` : undefined}
        maxWidth="3xl"
      >
        {historyInfo && (() => {
          const a = historyInfo.allocation;
          const pays = data.payments.filter(p => p.allocationId === a.id).sort((x, y) => y.date.localeCompare(x.date));
          const pens = data.penalties.filter(p => p.allocationId === a.id).sort((x, y) => y.date.localeCompare(x.date));
          const outstanding = balanceAfter(data, a, group.currentMonth);
          const paid = sum(pays.map(p => p.amount));
          return (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                {([['Charged to date', outstanding + paid], ['Total received', paid], ['Outstanding', outstanding]] as [string, number][]).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</div>
                    <div className="mt-1 text-base"><Money value={v} bold tone={k === 'Outstanding' && v > 0 ? 'bad' : 'default'} /></div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Payments</h4>
                {pays.length === 0 ? <p className="text-slate-400">No payments recorded.</p> : (
                  <table className="w-full text-left">
                    <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-1.5">Date</th><th>Month</th><th className="text-right">Amount</th><th className="pl-4">Mode</th><th>Reference</th><th>Receipt</th><th /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {pays.map(p => (
                        <tr key={p.id}>
                          <td className="py-2">{formatDate(p.date)}</td>
                          <td>{monthTitle(group, p.month)}</td>
                          <td className="text-right"><Money value={p.amount} tone="good" /></td>
                          <td className="pl-4 whitespace-nowrap">{paymentModeText(p)}</td>
                          <td className="font-mono text-slate-500">{p.reference || '—'}</td>
                          <td className="font-mono text-slate-500">{p.receiptNumber}</td>
                          <td className="text-right"><button type="button" className="text-emerald-700 font-semibold hover:underline" onClick={() => { setHistoryId(null); setReceipt(receiptFor(p)); }}>Receipt</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Penalties</h4>
                {pens.length === 0 ? <p className="text-slate-400">No penalties recorded.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {pens.map(p => (
                      <li key={p.id} className="py-2 flex items-center justify-between">
                        <span className="text-slate-700">{formatDate(p.date)} · {monthTitle(group, p.month)} — {p.reason}</span>
                        <Money value={p.amount} tone={p.amount < 0 ? 'good' : 'bad'} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <ReceiptModal isOpen={Boolean(receipt)} data={receipt} onClose={() => setReceipt(null)} title="Chit Instalment Receipt" />
    </div>
  );
};

// ---------------------------------------------------------------------------

type Channel = 'cash' | 'bank' | 'both';
const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank', label: 'Bank', icon: Landmark },
  { id: 'both', label: 'Cash + Bank', icon: Shuffle },
];

const CollectModal: React.FC<{
  group: ChitGroupRec;
  month: number;
  row: LedgerRow;
  partial: boolean;
  onClose: () => void;
  onSaved: (p: ChitPayment) => void;
}> = ({ group, month, row, partial, onClose, onSaved }) => {
  const { recordPayment } = useChit();
  const lookup = useMemberLookup();

  const { bankAccounts } = useERP();

  const [penalty, setPenalty] = useState(String(row.penalty));
  const [channel, setChannel] = useState<Channel>('cash');
  const [cashAmt, setCashAmt] = useState(partial ? '' : String(row.balance));
  const [bankAmt, setBankAmt] = useState('');
  const [date, setDate] = useState(todayStr());
  const [bankMode, setBankMode] = useState<PayMode>('upi');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const penaltyN = Number(penalty) || 0;
  const totalDue = row.previousOutstanding + row.instalment + penaltyN;
  const balance = totalDue - row.received;
  const cashN = channel === 'bank' ? 0 : Number(cashAmt) || 0;
  const bankN = channel === 'cash' ? 0 : Number(bankAmt) || 0;
  const amountN = cashN + bankN;
  const after = balance - amountN;
  const ro = `${inputCls} bg-slate-50 text-slate-700`;

  /** Switching channel moves what was typed onto the active side, so the operator never re-enters it. */
  const pick = (next: Channel) => {
    const typed = Number(cashAmt) || 0 || Number(bankAmt) || 0;
    if (next === 'cash') { setCashAmt(typed ? String(typed) : ''); setBankAmt(''); }
    if (next === 'bank') { setBankAmt(typed ? String(typed) : ''); setCashAmt(''); }
    setChannel(next);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = recordPayment({
      allocationId: row.allocation.id, month, date,
      cashAmount: cashN, bankAmount: bankN, bankMode, bankAccountId,
      reference, remarks, penaltyTotal: penaltyN,
    });
    if (res.ok) onSaved(res.value);
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title={partial ? 'Record Partial Payment' : 'Collect Payment'} subtitle={`${group.name} · ${monthTitle(group, month)}`} maxWidth="2xl">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Member name" className="sm:col-span-2"><input readOnly value={lookup.nameOf(row.allocation.id)} className={ro} /></Field>
          <Field label="Ticket number"><input readOnly value={`#${row.allocation.ticketNumber}`} className={`${ro} font-mono`} /></Field>
          <Field label="Collection month"><input readOnly value={`Month ${month}`} className={ro} /></Field>
          <Field label="Monthly instalment"><input readOnly value={`₹${row.instalment.toLocaleString('en-IN')}`} className={`${ro} font-mono`} /></Field>
          <Field label="Previous outstanding"><input readOnly value={`₹${row.previousOutstanding.toLocaleString('en-IN')}`} className={`${ro} font-mono`} /></Field>
          <Field label="Penalty (editable)"><input type="number" min={0} value={penalty} onChange={e => { setPenalty(e.target.value); setError(null); }} className={`${inputCls} font-mono`} /></Field>
          <Field label="Balance payable" hint={row.received > 0 ? `₹${row.received.toLocaleString('en-IN')} already received` : undefined}>
            <input readOnly value={`₹${Math.max(0, balance).toLocaleString('en-IN')}`} className={`${ro} font-mono font-bold`} />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Collected through <span className="text-rose-500">*</span></div>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                className={`flex items-center justify-center space-x-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  channel === c.id ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <c.icon className="w-4 h-4" /><span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {channel !== 'bank' && (
            <Field label={channel === 'both' ? 'Cash amount (₹)' : 'Amount received (₹)'} required hint={channel === 'cash' && amountN > 0 && after > 0 ? `Partial — ₹${after.toLocaleString('en-IN')} will remain pending` : undefined}>
              <input type="number" min={1} required autoFocus value={cashAmt} onChange={e => { setCashAmt(e.target.value); setError(null); }} className={`${inputCls} font-mono font-bold`} />
            </Field>
          )}
          {channel !== 'cash' && (
            <Field label={channel === 'both' ? 'Bank amount (₹)' : 'Amount received (₹)'} required hint={channel === 'bank' && amountN > 0 && after > 0 ? `Partial — ₹${after.toLocaleString('en-IN')} will remain pending` : undefined}>
              <input type="number" min={1} required autoFocus={channel === 'bank'} value={bankAmt} onChange={e => { setBankAmt(e.target.value); setError(null); }} className={`${inputCls} font-mono font-bold`} />
            </Field>
          )}
          {channel === 'both' && (
            <Field label="Total received" hint={amountN > 0 && after > 0 ? `₹${after.toLocaleString('en-IN')} will remain pending` : undefined}>
              <input readOnly value={`₹${amountN.toLocaleString('en-IN')}`} className={`${ro} font-mono font-bold`} />
            </Field>
          )}
          <Field label="Payment date" required><input type="date" required value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        </div>

        {channel !== 'cash' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
              <span>Bank details{channel === 'both' ? ' (for the bank amount)' : ''}</span>
              <span className="text-slate-400">Posts to the Bank Book</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Payment mode" required>
                <select value={bankMode} onChange={e => setBankMode(e.target.value as PayMode)} className={inputCls}>
                  {BANK_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Bank account" required className="sm:col-span-2">
                <select required value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className={inputCls}>
                  <option value="">— Select bank account —</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — A/c {b.accountNumber}</option>)}
                </select>
              </Field>
              <Field label="Transaction reference" required className="sm:col-span-3">
                <input value={reference} onChange={e => setReference(e.target.value)} className={`${inputCls} font-mono`} placeholder={bankMode === 'cheque' ? 'Cheque no.' : 'UTR / UPI ref'} />
              </Field>
            </div>
          </div>
        )}

        <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>

        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Save Payment</button>
        </div>
      </form>
    </Modal>
  );
};

const PenaltyModal: React.FC<{ group: ChitGroupRec; month: number; row: LedgerRow; onClose: () => void }> = ({ group, month, row, onClose }) => {
  const { addPenalty } = useChit();
  const lookup = useMemberLookup();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addPenalty({ allocationId: row.allocation.id, month, amount: Number(amount), date, reason });
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Penalty" subtitle={`${lookup.nameOf(row.allocation.id)} · Ticket #${row.allocation.ticketNumber} · ${monthTitle(group, month)}`} maxWidth="md">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Penalty amount (₹)" required><input autoFocus type="number" min={1} required value={amount} onChange={e => { setAmount(e.target.value); setError(null); }} className={`${inputCls} font-mono font-bold`} /></Field>
          <Field label="Date" required><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Reason" required><input required value={reason} onChange={e => setReason(e.target.value)} className={inputCls} placeholder="e.g. Instalment unpaid 10 days after due date" /></Field>
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Add Penalty</button>
        </div>
      </form>
    </Modal>
  );
};
