import React, { useMemo, useState } from 'react';
import { ShieldCheck, Wallet } from 'lucide-react';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { monthLabel, monthTitle, prizeStatus, sum, todayStr } from './chitCalc';
import { ChitGroupRec, ChitPrize, PAY_MODES, PayMode, PrizeVerification, payModeLabel } from './chitTypes';
import { Field, FormError, Money, Pill, PrizeStatusPill, filterCls, inputCls, primaryBtn, secondaryBtn, useMemberLookup } from './chitUi';

interface Row {
  id: string;
  monthNo: number;
  month: string;
  winner: string;
  ticket: number;
  amount: number;
  date: string;
  mode: string;
  reference: string;
  prize: ChitPrize;
}

export const PrizeRegisterView: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  const [monthFilter, setMonthFilter] = useState('all');
  const [recordFor, setRecordFor] = useState<ChitPrize | null>(null);
  const [verifyFor, setVerifyFor] = useState<ChitPrize | null>(null);

  const all = data.prizes.filter(p => p.groupId === group.id);
  const pending = all.filter(p => !p.disbursed);
  const disbursed = sum(all.filter(p => p.disbursed).map(p => p.amount));

  const rows: Row[] = useMemo(
    () =>
      all
        .filter(p => monthFilter === 'all' || p.month === Number(monthFilter))
        .sort((a, b) => a.month - b.month)
        .map(p => ({
          id: p.id,
          monthNo: p.month,
          month: monthTitle(group, p.month),
          winner: lookup.nameOf(p.allocationId),
          ticket: lookup.info(p.allocationId)?.allocation.ticketNumber ?? 0,
          amount: p.amount,
          date: p.disbursementDate ? formatDate(p.disbursementDate) : '',
          mode: payModeLabel(p.mode),
          reference: p.reference || '',
          prize: p,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.prizes, group, lookup, monthFilter]
  );

  const columns: Column<Row>[] = [
    { header: 'Auction Month', accessor: 'month', render: (_v, r) => <span className="font-semibold text-slate-900 whitespace-nowrap">{r.month}</span> },
    { header: 'Winner Name', accessor: 'winner', render: (_v, r) => <span className="font-semibold text-slate-900">{r.winner}</span> },
    { header: 'Ticket No.', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Prize Amount', accessor: 'amount', className: 'text-right', render: (_v, r) => <Money value={r.amount} bold /> },
    { header: 'Disbursement Date', accessor: 'date', render: (_v, r) => <span className="whitespace-nowrap">{r.date || '—'}</span> },
    { header: 'Payment Mode', accessor: 'mode', render: (_v, r) => r.mode || '—' },
    { header: 'Transaction Reference', accessor: 'reference', render: (_v, r) => <span className="font-mono text-slate-600">{r.reference || '—'}</span> },
    { header: 'Verification Status', render: (_v, r) => (r.prize.verification === 'verified' ? <Pill tone="green">Verified</Pill> : <Pill tone="amber">Pending</Pill>) },
    { header: 'Disbursement Status', render: (_v, r) => <PrizeStatusPill status={prizeStatus(r.prize)} /> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => {
        if (r.prize.disbursed || group.status === 'closed') return <span className="text-slate-300">—</span>;
        return (
          <div className="flex items-center justify-end space-x-1.5">
            <button type="button" className={secondaryBtn + ' !px-2.5 !py-1.5 !text-[11px]'} onClick={() => setVerifyFor(r.prize)}>
              <ShieldCheck className="w-3.5 h-3.5" /><span>Verification</span>
            </button>
            <button type="button" className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap" onClick={() => setRecordFor(r.prize)}>
              <Wallet className="w-3.5 h-3.5" /><span>Record Disbursement</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Auction month">
          <select aria-label="Auction month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={`${filterCls} font-semibold`}>
            <option value="all">All months</option>
            {Array.from({ length: group.durationMonths }, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m} · {monthLabel(group, m)}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3 flex-1 min-w-[280px] max-w-xl">
          <StatCard title="Pending Disbursements" value={pending.length} subtitle={`₹${sum(pending.map(p => p.amount)).toLocaleString('en-IN')} to be paid`} />
          <StatCard title="Total Disbursed" value={`₹${disbursed.toLocaleString('en-IN')}`} subtitle={`${all.length - pending.length} prize(s) paid`} />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Record the prize payment after you have made it. Nothing is paid or transferred from this screen.
      </p>
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        printable
        searchPlaceholder="Search winner or reference..."
        exportFileName={`chit_${group.id}_prize_disbursement`}
        printTitle={`${group.name} — Prize Disbursement Register`}
        emptyTitle="No prize entries"
        emptySubtitle="A prize entry appears when an auction result is saved under Auction Details."
      />
      {verifyFor && <VerifyModal group={group} prize={verifyFor} onClose={() => setVerifyFor(null)} />}
      {recordFor && <DisburseModal group={group} prize={recordFor} onClose={() => setRecordFor(null)} />}
    </div>
  );
};

const VerifyModal: React.FC<{ group: ChitGroupRec; prize: ChitPrize; onClose: () => void }> = ({ group, prize, onClose }) => {
  const { updatePrizeVerification } = useChit();
  const lookup = useMemberLookup();
  const [verification, setVerification] = useState<PrizeVerification>(prize.verification);
  const [remarks, setRemarks] = useState(prize.remarks || '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updatePrizeVerification(prize.id, verification, remarks);
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title="Security / Guarantee Verification" subtitle={`${lookup.nameOf(prize.allocationId)} · ${monthTitle(group, prize.month)}`} maxWidth="md">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <Field label="Verification status" hint="Verified once the winner's security / guarantee documents are on file">
          <select value={verification} onChange={e => setVerification(e.target.value as PrizeVerification)} className={inputCls}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
          </select>
        </Field>
        <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Save</button>
        </div>
      </form>
    </Modal>
  );
};

const DisburseModal: React.FC<{ group: ChitGroupRec; prize: ChitPrize; onClose: () => void }> = ({ group, prize, onClose }) => {
  const { recordDisbursement } = useChit();
  const lookup = useMemberLookup();
  const [verification, setVerification] = useState<PrizeVerification>(prize.verification);
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState<PayMode>('bank_transfer');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState(prize.remarks || '');
  const [error, setError] = useState<string | null>(null);
  const ro = `${inputCls} bg-slate-50 text-slate-700`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = recordDisbursement(prize.id, { verification, date, mode, reference, remarks });
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Disbursement" subtitle="Record a prize payment you have already made" maxWidth="2xl">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Chit group"><input readOnly value={group.id} className={`${ro} font-mono`} /></Field>
          <Field label="Auction month"><input readOnly value={`Month ${prize.month}`} className={ro} /></Field>
          <Field label="Winning member"><input readOnly value={lookup.nameOf(prize.allocationId)} className={ro} /></Field>
          <Field label="Prize amount" hint="From the saved auction record"><input readOnly value={`₹${prize.amount.toLocaleString('en-IN')}`} className={`${ro} font-mono font-bold`} /></Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Disbursement date" required><input type="date" required value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Payment mode" required>
            <select value={mode} onChange={e => setMode(e.target.value as PayMode)} className={inputCls}>
              {PAY_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Transaction reference" required={mode !== 'cash'}>
            <input value={reference} onChange={e => setReference(e.target.value)} className={`${inputCls} font-mono`} placeholder={mode === 'cash' ? 'Optional' : 'UTR / cheque no.'} />
          </Field>
          <Field label="Security / guarantee verification" required className="sm:col-span-1">
            <select value={verification} onChange={e => { setVerification(e.target.value as PrizeVerification); setError(null); }} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
            </select>
          </Field>
          <Field label="Remarks" className="sm:col-span-2"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
        </div>
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Record Disbursement</button>
        </div>
      </form>
    </Modal>
  );
};
