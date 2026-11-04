import React, { useMemo, useState } from 'react';
import { Gavel, Lock, Pencil } from 'lucide-react';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { isAuctionLocked, monthLabel, todayStr } from './chitCalc';
import { ChitAuction, ChitGroupRec } from './chitTypes';
import { AuctionStatusPill, Field, FormError, Money, filterCls, inputCls, primaryBtn, secondaryBtn, useMemberLookup } from './chitUi';

interface Row {
  id: string;
  month: string;
  monthNo: number;
  date: string;
  status: string;
  winner: string;
  ticket: string;
  prize: number | string;
  discount: number | string;
  remarks: string;
  auction: ChitAuction;
}

export const AuctionRegisterView: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  const [editing, setEditing] = useState<ChitAuction | null>(null);
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows: Row[] = useMemo(
    () =>
      data.auctions
        .filter(a => a.groupId === group.id)
        .sort((a, b) => a.month - b.month)
        .map(a => {
          const done = a.status === 'conducted';
          return {
            id: a.id,
            month: `Month ${a.month} · ${monthLabel(group, a.month)}`,
            monthNo: a.month,
            date: formatDate(done && a.auctionDate ? a.auctionDate : a.scheduledDate),
            status: a.status,
            winner: done ? lookup.nameOf(a.winnerAllocationId) : '',
            ticket: done && a.ticketNumber ? `#${a.ticketNumber}` : '',
            prize: done ? a.prizeAmount ?? '' : '',
            discount: done && a.discountAmount !== undefined ? a.discountAmount : '',
            remarks: a.remarks || '',
            auction: a,
          };
        })
        .filter(r => (monthFilter === 'all' || r.monthNo === Number(monthFilter)) && (statusFilter === 'all' || r.status === statusFilter)),
    [data.auctions, group, lookup, monthFilter, statusFilter]
  );

  const money = (v: number | string, bold = false) => (v === '' ? <span className="text-slate-300">—</span> : <Money value={Number(v)} bold={bold} />);

  const columns: Column<Row>[] = [
    { header: 'Auction Month', accessor: 'month', render: (_v, r) => <span className="font-semibold text-slate-900 whitespace-nowrap">{r.month}</span> },
    { header: 'Auction Date', accessor: 'date', render: (_v, r) => <span className="whitespace-nowrap">{r.date}</span> },
    { header: 'Status', accessor: 'status', render: (_v, r) => <AuctionStatusPill status={r.auction.status} /> },
    { header: 'Winner Name', accessor: 'winner', render: (_v, r) => (r.winner ? <span className="font-semibold text-slate-900">{r.winner}</span> : <span className="text-slate-300">—</span>) },
    { header: 'Ticket No.', accessor: 'ticket', render: (_v, r) => (r.ticket ? <span className="font-mono font-bold">{r.ticket}</span> : <span className="text-slate-300">—</span>) },
    { header: 'Bid / Prize Amount', accessor: 'prize', className: 'text-right', render: (_v, r) => money(r.prize, true) },
    { header: 'Auction Discount', accessor: 'discount', className: 'text-right', render: (_v, r) => money(r.discount) },
    { header: 'Remarks', accessor: 'remarks', render: (_v, r) => <span className="text-slate-500">{r.remarks || '—'}</span> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => {
        const done = r.auction.status === 'conducted';
        const locked = done && isAuctionLocked(data, group.id, r.auction.month);
        return (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={group.status === 'closed'}
              onClick={() => setEditing(r.auction)}
              className={done
                ? 'inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 text-[11px] font-semibold disabled:opacity-40'
                : 'inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap disabled:opacity-40'}
            >
              {locked ? <Lock className="w-3 h-3" /> : done ? <Pencil className="w-3 h-3" /> : <Gavel className="w-3 h-3" />}
              <span>{locked ? 'View' : done ? 'Edit' : 'Enter Result'}</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <p className="text-xs text-slate-500 mb-3">
        Auctions are conducted outside the software. Enter the result once it is over — every figure is stored exactly as you type it.
      </p>
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        printable
        searchPlaceholder="Search month, winner, remarks..."
        exportFileName={`chit_${group.id}_auction_details`}
        printTitle={`${group.name} — Auction Details`}
        emptyTitle="No auction months match"
        filterComponent={
          <div className="flex items-center gap-2">
            <select aria-label="Auction month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={filterCls}>
              <option value="all">All months</option>
              {Array.from({ length: group.durationMonths }, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m} · {monthLabel(group, m)}</option>)}
            </select>
            <select aria-label="Auction status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={filterCls}>
              <option value="all">All statuses</option>
              <option value="not_conducted">Not Conducted</option>
              <option value="conducted">Conducted</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
        }
      />
      {editing && <AuctionEntryModal group={group} auction={editing} onClose={() => setEditing(null)} />}
    </>
  );
};

const COMMISSION_PCTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

const numStr = (v?: number) => (v === undefined ? '' : String(v));

/** Entry form for a manually conducted auction. Nothing here is computed — values are saved as typed. */
const AuctionEntryModal: React.FC<{ group: ChitGroupRec; auction: ChitAuction; onClose: () => void }> = ({ group, auction, onClose }) => {
  const { data, recordAuction, setAuctionStatus } = useChit();
  const lookup = useMemberLookup();
  const locked = auction.status === 'conducted' && isAuctionLocked(data, group.id, auction.month);

  const [status, setStatus] = useState<ChitAuction['status']>(auction.status === 'not_conducted' ? 'conducted' : auction.status);
  const [auctionDate, setAuctionDate] = useState(auction.auctionDate || (auction.scheduledDate <= todayStr() ? auction.scheduledDate : todayStr()));
  const [winnerId, setWinnerId] = useState(auction.winnerAllocationId || '');
  const [pool, setPool] = useState(String(auction.poolAmount));
  const [prize, setPrize] = useState(numStr(auction.prizeAmount));
  const [discount, setDiscount] = useState(numStr(auction.discountAmount));
  const [pct, setPct] = useState(String(auction.commissionPct ?? group.foremanCommissionPct));
  const [commission, setCommission] = useState(numStr(auction.commissionAmount));
  const [dividend, setDividend] = useState(numStr(auction.dividendAmount));
  const [remarks, setRemarks] = useState(auction.remarks || '');
  const [rescheduled, setRescheduled] = useState(auction.scheduledDate);
  const [error, setError] = useState<string | null>(null);

  const priorWinners = new Set(
    data.auctions.filter(a => a.groupId === group.id && a.id !== auction.id && a.winnerAllocationId).map(a => a.winnerAllocationId)
  );
  const candidates = data.allocations
    .filter(a => a.groupId === group.id && !priorWinners.has(a.id))
    .sort((a, b) => a.ticketNumber - b.ticketNumber);
  const winner = candidates.find(c => c.id === winnerId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res =
      status === 'conducted'
        ? recordAuction(auction.id, {
            auctionDate, winnerAllocationId: winnerId, poolAmount: Number(pool), prizeAmount: Number(prize),
            discountAmount: Number(discount) || 0, commissionPct: Number(pct), commissionAmount: Number(commission) || 0,
            dividendAmount: Number(dividend) || 0, remarks,
          })
        : setAuctionStatus(auction.id, { status, remarks, scheduledDate: status === 'postponed' ? rescheduled : undefined });
    if (res.ok) onClose();
    else setError(res.error);
  };

  const statusBtn = (s: ChitAuction['status'], label: string) => (
    <button
      key={s}
      type="button"
      onClick={() => { setStatus(s); setError(null); }}
      className={`flex-1 px-3 py-2 text-xs font-semibold border-r last:border-r-0 border-slate-200 transition-colors ${
        status === s ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
  const ro = `${inputCls} bg-slate-50 text-slate-700`;
  const num = `${inputCls} font-mono`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Auction Details — Month ${auction.month} · ${monthLabel(group, auction.month)}`}
      subtitle={`${group.name} · scheduled ${formatDate(auction.scheduledDate)}`}
      maxWidth="2xl"
    >
      <form onSubmit={submit} className="text-xs">
        {locked && (
          <div className="mb-4 flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            <Lock className="w-4 h-4 shrink-0 mt-px" />
            <span>Dividend credits or a prize payment already exist for this month, so the recorded result is locked.</span>
          </div>
        )}

        <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-4" role="group" aria-label="Auction status">
          {statusBtn('conducted', 'Conducted')}
          {statusBtn('postponed', 'Postponed')}
          {statusBtn('not_conducted', 'Not Conducted')}
        </div>

        {status === 'conducted' ? (
          <fieldset disabled={locked} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Chit group"><input readOnly value={`${group.id}`} className={`${ro} font-mono`} /></Field>
              <Field label="Auction month"><input readOnly value={`Month ${auction.month}`} className={ro} /></Field>
              <Field label="Auction date" required><input type="date" required value={auctionDate} onChange={e => setAuctionDate(e.target.value)} className={inputCls} /></Field>
              <Field label="Winning member" required className="col-span-2">
                <select required value={winnerId} onChange={e => { setWinnerId(e.target.value); setError(null); }} className={inputCls}>
                  <option value="">Select member…</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>#{c.ticketNumber} · {lookup.nameOf(c.id)}</option>)}
                </select>
              </Field>
              <Field label="Ticket number"><input readOnly value={winner ? `#${winner.ticketNumber}` : ''} placeholder="Auto from member" className={`${ro} font-mono`} /></Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Monthly pool amount (₹)" required><input type="number" min={1} required value={pool} onChange={e => setPool(e.target.value)} className={num} /></Field>
              <Field label="Winning bid / prize amount (₹)" required><input type="number" min={1} required value={prize} onChange={e => { setPrize(e.target.value); setError(null); }} className={`${num} font-bold`} /></Field>
              <Field label="Auction discount (₹)"><input type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)} className={num} /></Field>
              <Field label="Company commission %">
                <select value={pct} onChange={e => setPct(e.target.value)} className={inputCls}>
                  {[...new Set([...COMMISSION_PCTS, Number(pct)])].sort((a, b) => a - b).map(p => <option key={p} value={p}>{p}%</option>)}
                </select>
              </Field>
              <Field label="Company commission amount (₹)"><input type="number" min={0} value={commission} onChange={e => setCommission(e.target.value)} className={num} /></Field>
              <Field label="Distributable dividend (₹)"><input type="number" min={0} value={dividend} onChange={e => setDividend(e.target.value)} className={num} /></Field>
            </div>
            <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
            <p className="text-[11px] text-slate-400">Discount, commission and dividend are entered by the operator and saved as typed — the system does not calculate them.</p>
          </fieldset>
        ) : (
          <div className="space-y-3 max-w-lg">
            <p className="text-slate-500">No winner details are needed while the auction is {status === 'postponed' ? 'postponed' : 'not conducted'}.</p>
            {status === 'postponed' && (
              <Field label="Rescheduled date"><input type="date" value={rescheduled} onChange={e => setRescheduled(e.target.value)} className={inputCls} /></Field>
            )}
            <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="e.g. Postponed — quorum not available" /></Field>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <FormError message={error} />
          <div className="flex justify-end space-x-2">
            <button type="button" className={secondaryBtn} onClick={onClose}>{locked ? 'Close' : 'Cancel'}</button>
            {!locked && <button type="submit" className={primaryBtn}>{status === 'conducted' ? 'Save Auction Details' : 'Save Status'}</button>}
          </div>
        </div>
      </form>
    </Modal>
  );
};
