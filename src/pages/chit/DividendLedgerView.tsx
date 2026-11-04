import React, { useMemo, useState } from 'react';
import { CheckCheck, History, Settings2 } from 'lucide-react';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { auctionOf, dividendCredited, dividendSummary, monthLabel, monthTitle, sum, todayStr } from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import { EmptyNote, Field, FormError, Money, Pill, filterCls, inputCls, primaryBtn, secondaryBtn, useMemberLookup } from './chitUi';

interface Row {
  id: string;
  ticket: number;
  name: string;
  eligibleAmount: number;
  credited: number;
  creditDate: string;
  status: 'Not eligible' | 'Pending' | 'Part credited' | 'Credited';
  allocationId: string;
  pending: number;
}

const STATUS_TONE = { 'Not eligible': 'slate', Pending: 'amber', 'Part credited': 'blue', Credited: 'green' } as const;

export const DividendLedgerView: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();

  const conductedMonths = data.auctions.filter(a => a.groupId === group.id && a.status === 'conducted').map(a => a.month).sort((a, b) => b - a);
  const [pickedMonth, setPickedMonth] = useState<number | null>(null);
  const month = pickedMonth && conductedMonths.includes(pickedMonth) ? pickedMonth : conductedMonths[0];

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [credit, setCredit] = useState<{ dividendId: string; label: string; pending: number }[] | null>(null);
  const [historyFor, setHistoryFor] = useState<string | 'all' | null>(null);

  const summary = month ? dividendSummary(data, group.id, month) : null;

  const rows: Row[] = useMemo(() => {
    if (!month) return [];
    return data.dividends
      .filter(d => d.groupId === group.id && d.month === month)
      .map(d => {
        const info = lookup.info(d.allocationId);
        const credited = dividendCredited(data, d.id);
        const credits = data.credits.filter(c => c.dividendId === d.id).sort((a, b) => b.date.localeCompare(a.date));
        const pending = d.eligible ? d.eligibleAmount - credited : 0;
        const status: Row['status'] = !d.eligible ? 'Not eligible' : credited <= 0 ? 'Pending' : pending > 0 ? 'Part credited' : 'Credited';
        return {
          id: d.id,
          ticket: info?.allocation.ticketNumber ?? 0,
          name: info?.name || '—',
          eligibleAmount: d.eligible ? d.eligibleAmount : 0,
          credited,
          creditDate: credits[0] ? formatDate(credits[0].date) : '',
          status,
          allocationId: d.allocationId,
          pending,
        };
      })
      .sort((a, b) => a.ticket - b.ticket);
  }, [data, group.id, month, lookup]);

  const columns: Column<Row>[] = [
    { header: 'Ticket No.', accessor: 'ticket', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-slate-900">#{r.ticket}</span> },
    { header: 'Member Name', accessor: 'name', sortable: true, render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Eligible Dividend', accessor: 'eligibleAmount', className: 'text-right', render: (_v, r) => <Money value={r.eligibleAmount} tone={r.status === 'Not eligible' ? 'muted' : 'default'} /> },
    { header: 'Dividend Credited', accessor: 'credited', className: 'text-right', render: (_v, r) => <Money value={r.credited} tone={r.credited > 0 ? 'good' : 'muted'} /> },
    { header: 'Credit Date', accessor: 'creditDate', render: (_v, r) => <span className="whitespace-nowrap text-slate-600">{r.creditDate || '—'}</span> },
    { header: 'Status', accessor: 'status', render: (_v, r) => <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => (
        <div className="flex items-center justify-end space-x-1.5">
          {r.pending > 0 && group.status !== 'closed' && (
            <button type="button" className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap"
              onClick={() => setCredit([{ dividendId: r.id, label: `#${r.ticket} ${r.name}`, pending: r.pending }])}>
              Record Credit
            </button>
          )}
          <button type="button" title="Credit history" aria-label="Credit history" className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300" onClick={() => setHistoryFor(r.allocationId)}>
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const pendingEntries = rows.filter(r => r.pending > 0).map(r => ({ dividendId: r.id, label: `#${r.ticket} ${r.name}`, pending: r.pending }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Auction month">
            <select aria-label="Dividend month" value={month ?? ''} disabled={!month} onChange={e => setPickedMonth(Number(e.target.value))} className={filterCls}>
              {conductedMonths.length === 0 && <option value="">No conducted auctions</option>}
              {conductedMonths.map(m => <option key={m} value={m}>{monthTitle(group, m)}</option>)}
            </select>
          </Field>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setHistoryFor('all')}>
              <History className="w-3.5 h-3.5" /><span>Dividend History</span>
            </button>
            <button type="button" className={secondaryBtn} disabled={!month || group.status === 'closed'} onClick={() => setAllocateOpen(true)}>
              <Settings2 className="w-3.5 h-3.5" /><span>Allocate Dividend</span>
            </button>
            <button type="button" className={primaryBtn} disabled={pendingEntries.length === 0 || group.status === 'closed'} onClick={() => setCredit(pendingEntries)}>
              <CheckCheck className="w-4 h-4" /><span>Credit All Pending</span>
            </button>
          </div>
        </div>

        {summary && (
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Total distributable', summary.distributable, 'default'],
              ['Total allocated', summary.allocated, 'default'],
              ['Unallocated', summary.unallocated, summary.unallocated !== 0 ? 'bad' : 'muted'],
              ['Credited', summary.credited, 'good'],
              ['Allocated, not yet credited', summary.allocated - summary.credited, 'default'],
            ].map(([k, v, tone]) => (
              <div key={k as string} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</dt>
                <dd className="mt-0.5 text-sm"><Money value={v as number} bold tone={tone as 'default'} /></dd>
              </div>
            ))}
          </dl>
        )}
        {summary && summary.unallocated > 0 && (
          <p className="text-[11px] text-amber-700">₹{summary.unallocated.toLocaleString('en-IN')} of the distributable dividend is not yet allocated to any member.</p>
        )}
      </div>

      {month ? (
        <DataTable
          data={rows}
          columns={columns}
          keyExtractor={r => r.id}
          compact
          printable
          searchPlaceholder="Search ticket or member..."
          exportFileName={`chit_${group.id}_month${month}_dividend`}
          printTitle={`${group.name} — Dividend Ledger, ${monthTitle(group, month)}`}
          emptyTitle="Dividend not allocated"
          emptySubtitle="Use Allocate Dividend to assign the distributable amount to members."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200"><EmptyNote>Record a conducted auction to create its dividend ledger.</EmptyNote></div>
      )}

      {allocateOpen && month && <AllocateModal group={group} month={month} onClose={() => setAllocateOpen(false)} />}
      {credit && <CreditModal entries={credit} onClose={() => setCredit(null)} />}
      {historyFor && <HistoryModal group={group} allocationId={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
};

const AllocateModal: React.FC<{ group: ChitGroupRec; month: number; onClose: () => void }> = ({ group, month, onClose }) => {
  const { data, saveDividendAllocation } = useChit();
  const lookup = useMemberLookup();
  const auction = auctionOf(data, group.id, month)!;
  const { distributable, rows: existing } = dividendSummary(data, group.id, month);

  const members = data.allocations.filter(a => a.groupId === group.id).sort((a, b) => a.ticketNumber - b.ticketNumber);
  const [state, setState] = useState(() =>
    Object.fromEntries(
      members.map(m => {
        const row = existing.find(d => d.allocationId === m.id);
        return [m.id, { eligible: row ? row.eligible : m.id !== auction.winnerAllocationId, amount: String(row?.eligibleAmount ?? 0) }];
      })
    ) as Record<string, { eligible: boolean; amount: string }>
  );
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, change: Partial<{ eligible: boolean; amount: string }>) => {
    setError(null);
    setState(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...change } };
      return next;
    });
  };

  const total = sum(members.filter(m => state[m.id].eligible).map(m => Number(state[m.id].amount) || 0));
  const eligibleCount = members.filter(m => state[m.id].eligible).length;

  const submit = () => {
    const res = saveDividendAllocation(
      group.id,
      month,
      members.map(m => ({ allocationId: m.id, eligible: state[m.id].eligible, amount: state[m.id].eligible ? Number(state[m.id].amount) || 0 : 0 }))
    );
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Allocate Dividend — ${monthTitle(group, month)}`}
      subtitle="Enter each member's dividend by hand — tick who is eligible and set the amount."
      maxWidth="3xl"
      footer={
        <>
          <span className={`mr-auto text-xs font-semibold ${total > distributable ? 'text-rose-600' : 'text-slate-600'}`}>
            Allocated ₹{total.toLocaleString('en-IN')} of ₹{distributable.toLocaleString('en-IN')} · ₹{(distributable - total).toLocaleString('en-IN')} unallocated
          </span>
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={primaryBtn} onClick={submit}>Save Allocation</button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{eligibleCount} eligible member{eligibleCount === 1 ? '' : 's'}</span>
        </div>

        <table className="w-full text-left">
          <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <th className="py-1.5 w-10">Eligible</th><th>Ticket</th><th>Member</th><th className="text-right">Dividend (₹)</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {members.map(m => {
              const s = state[m.id];
              const won = auction.winnerAllocationId === m.id;
              return (
                <tr key={m.id} className={s.eligible ? '' : 'text-slate-400'}>
                  <td className="py-2"><input type="checkbox" aria-label={`Eligible: ${lookup.nameOf(m.id)}`} checked={s.eligible} onChange={e => update(m.id, { eligible: e.target.checked })} className="accent-emerald-600 w-4 h-4" /></td>
                  <td className="font-mono font-bold">#{m.ticketNumber}</td>
                  <td>{lookup.nameOf(m.id)} {won && <Pill tone="purple">Month winner</Pill>}</td>
                  <td className="text-right">
                    <input
                      type="number" min={0} disabled={!s.eligible}
                      value={s.eligible ? s.amount : '0'}
                      onChange={e => update(m.id, { amount: e.target.value })}
                      className={`w-28 border border-slate-300 rounded-md p-1.5 text-right font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${!s.eligible ? 'bg-slate-50' : 'bg-white'}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <FormError message={error} />
      </div>
    </Modal>
  );
};

const CreditModal: React.FC<{ entries: { dividendId: string; label: string; pending: number }[]; onClose: () => void }> = ({ entries, onClose }) => {
  const { recordDividendCredits } = useChit();
  const [amounts, setAmounts] = useState(() => Object.fromEntries(entries.map(e => [e.dividendId, String(e.pending)])));
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = recordDividendCredits(
      entries.map(x => ({ dividendId: x.dividendId, amount: Number(amounts[x.dividendId]) || 0 })),
      date,
      note
    );
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title={entries.length > 1 ? `Credit Dividend — ${entries.length} members` : 'Record Dividend Credit'} subtitle="Credits are recorded against the member's dividend entitlement" maxWidth="lg">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
          {entries.map(x => (
            <li key={x.dividendId} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <div className="font-semibold text-slate-800">{x.label}</div>
                <div className="text-[10px] text-slate-400">Pending ₹{x.pending.toLocaleString('en-IN')}</div>
              </div>
              <input type="number" min={1} max={x.pending} required value={amounts[x.dividendId]} onChange={e => { setAmounts({ ...amounts, [x.dividendId]: e.target.value }); setError(null); }}
                className="w-28 border border-slate-300 rounded-md p-1.5 text-right font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500" />
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit date" required><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Note"><input value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
        </div>
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Record Credit</button>
        </div>
      </form>
    </Modal>
  );
};

const HistoryModal: React.FC<{ group: ChitGroupRec; allocationId: string | 'all'; onClose: () => void }> = ({ group, allocationId, onClose }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  const credits = data.credits
    .filter(c => c.groupId === group.id && (allocationId === 'all' || c.allocationId === allocationId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.month - a.month);

  return (
    <Modal isOpen onClose={onClose} title="Dividend History" subtitle={allocationId === 'all' ? `${group.name} · all members` : `${group.name} · ${lookup.nameOf(allocationId)}`} maxWidth="2xl">
      {credits.length === 0 ? (
        <EmptyNote>No dividend credits recorded yet.</EmptyNote>
      ) : (
        <table className="w-full text-left text-xs">
          <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <th className="py-1.5">Credit date</th><th>Auction month</th><th>Ticket</th><th>Member</th><th className="text-right">Amount</th><th className="pl-4">Note</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {credits.map(c => (
              <tr key={c.id}>
                <td className="py-2 whitespace-nowrap">{formatDate(c.date)}</td>
                <td>{monthLabel(group, c.month)} (M{c.month})</td>
                <td className="font-mono">#{lookup.info(c.allocationId)?.allocation.ticketNumber}</td>
                <td className="font-semibold text-slate-800">{lookup.nameOf(c.allocationId)}</td>
                <td className="text-right"><Money value={c.amount} tone="good" /></td>
                <td className="pl-4 text-slate-500">{c.note || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 font-bold">
            <td colSpan={4} className="py-2">Total credited</td>
            <td className="text-right"><Money value={sum(credits.map(c => c.amount))} bold /></td><td /></tr></tfoot>
        </table>
      )}
    </Modal>
  );
};
