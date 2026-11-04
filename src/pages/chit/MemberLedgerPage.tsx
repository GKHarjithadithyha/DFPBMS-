import React, { useMemo, useState } from 'react';
import { BookUser } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { PrizeReceived, memberSummary, monthTitle, sum } from './chitCalc';
import { ChitAllocation, ChitData, ChitGroupRec, payModeLabel, paymentModeText } from './chitTypes';
import { MemberProfileModal } from './MemberAllocationView';
import { Avatar, EmptyNote, Money, Pill, filterCls, secondaryBtn, useMemberLookup } from './chitUi';

type Navigate = (tabId: string, subTabId?: string) => void;

const PRIZE_TEXT: Record<PrizeReceived, { label: string; tone: 'slate' | 'amber' | 'blue' | 'green' }> = {
  not_won: { label: 'Not won', tone: 'slate' },
  won_pending: { label: 'Won · verification pending', tone: 'amber' },
  won_verified: { label: 'Won · payment pending', tone: 'blue' },
  received: { label: 'Prize received', tone: 'green' },
};

interface Row {
  id: string;
  name: string;
  profileId: string;
  group: string;
  ticket: number;
  instalments: number;
  paid: number;
  outstanding: number;
  penalties: number;
  dividends: number;
  prize: PrizeReceived;
  allocation: ChitAllocation;
  groupRec: ChitGroupRec;
}

export const MemberLedgerPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  const [groupFilter, setGroupFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      data.allocations
        .filter(a => groupFilter === 'all' || a.groupId === groupFilter)
        .map(a => {
          const g = data.groups.find(x => x.id === a.groupId)!;
          const s = memberSummary(data, g, a);
          return {
            id: a.id,
            name: lookup.nameOf(a.id),
            profileId: a.profileId,
            group: g.id,
            ticket: a.ticketNumber,
            instalments: s.instalments,
            paid: s.paid,
            outstanding: s.outstanding,
            penalties: s.penalties,
            dividends: s.dividendCreditsTotal,
            prize: s.prizeReceived,
            allocation: a,
            groupRec: g,
          };
        })
        .sort((a, b) => a.group.localeCompare(b.group) || a.ticket - b.ticket),
    [data, groupFilter, lookup]
  );

  const columns: Column<Row>[] = [
    {
      header: 'Member Name', accessor: 'name', sortable: true,
      render: (_v, r) => (
        <div className="flex items-center space-x-2.5">
          <Avatar name={r.name} />
          <button type="button" className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline text-left" onClick={() => setOpenId(r.id)}>{r.name}</button>
        </div>
      ),
    },
    { header: 'Member ID', accessor: 'profileId', render: (_v, r) => <span className="font-mono text-slate-600">{r.profileId}</span> },
    { header: 'Chit Group', accessor: 'group', render: (_v, r) => <span className="font-mono text-slate-700">{r.group}</span> },
    { header: 'Ticket', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Monthly Instalments', accessor: 'instalments', className: 'text-right', render: (_v, r) => <Money value={r.instalments} /> },
    { header: 'Payments Received', accessor: 'paid', className: 'text-right', render: (_v, r) => <Money value={r.paid} tone="good" /> },
    { header: 'Outstanding Dues', accessor: 'outstanding', className: 'text-right', render: (_v, r) => <Money value={r.outstanding} tone={r.outstanding > 0 ? 'bad' : 'muted'} bold /> },
    { header: 'Penalties', accessor: 'penalties', className: 'text-right', render: (_v, r) => <Money value={r.penalties} tone={r.penalties > 0 ? 'bad' : 'muted'} /> },
    { header: 'Dividend Credits', accessor: 'dividends', className: 'text-right', render: (_v, r) => <Money value={r.dividends} tone={r.dividends > 0 ? 'good' : 'muted'} /> },
    { header: 'Prize Received', accessor: 'prize', render: (_v, r) => <Pill tone={PRIZE_TEXT[r.prize].tone}>{PRIZE_TEXT[r.prize].label}</Pill> },
    {
      header: 'Action', className: 'text-right',
      render: (_v, r) => (
        <button type="button" className={secondaryBtn + ' !px-2.5 !py-1.5 !text-[11px]'} onClick={() => setOpenId(r.id)}>
          <BookUser className="w-3.5 h-3.5" /><span>View Ledger</span>
        </button>
      ),
    },
  ];

  const open = rows.find(r => r.id === openId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Member Ledger"
        subtitle="Each subscriber's instalments, payments, penalties, dividend credits and prize status. Member details come from the Profile Master."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Member Ledger' }]}
      />
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        printable
        searchPlaceholder="Search member, ID, group, ticket..."
        exportFileName="chit_member_ledger"
        printTitle="Chit Fund — Member Ledger"
        emptyTitle="No members allocated"
        emptySubtitle="Allocate members to a chit group to see their ledger."
        filterComponent={
          <select aria-label="Chit group" value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className={filterCls}>
            <option value="all">All groups</option>
            {data.groups.map(g => <option key={g.id} value={g.id}>{g.id} — {g.name}</option>)}
          </select>
        }
      />

      {open && <TransactionHistory row={open} onClose={() => setOpenId(null)} onProfile={() => setProfileId(open.profileId)} />}
      {profileId && <MemberProfileModal profileId={profileId} onClose={() => setProfileId(null)} onNavigate={onNavigate} />}
    </div>
  );
};

type Kind = 'Allocation' | 'Collection' | 'Penalty' | 'Dividend Credit' | 'Prize Won' | 'Prize Received';
const KIND_TONE = { Allocation: 'slate', Collection: 'green', Penalty: 'rose', 'Dividend Credit': 'blue', 'Prize Won': 'purple', 'Prize Received': 'green' } as const;

interface Entry { id: string; date: string; kind: Kind; text: string; ref: string; amount?: number }

const entriesFor = (data: ChitData, g: ChitGroupRec, a: ChitAllocation): Entry[] => {
  const out: Entry[] = [{ id: `al-${a.id}`, date: a.allocatedOn, kind: 'Allocation', text: `Allocated to ${g.name} as Ticket #${a.ticketNumber}`, ref: g.id }];
  data.payments.filter(p => p.allocationId === a.id).forEach(p =>
    out.push({ id: p.id, date: p.date, kind: 'Collection', text: `Instalment — ${monthTitle(g, p.month)} (${paymentModeText(p)})`, ref: p.receiptNumber, amount: p.amount }));
  data.penalties.filter(p => p.allocationId === a.id).forEach(p =>
    out.push({ id: p.id, date: p.date, kind: 'Penalty', text: `${monthTitle(g, p.month)} — ${p.reason}`, ref: '', amount: p.amount }));
  data.credits.filter(c => c.allocationId === a.id).forEach(c =>
    out.push({ id: c.id, date: c.date, kind: 'Dividend Credit', text: `Dividend — ${monthTitle(g, c.month)}${c.note ? ` · ${c.note}` : ''}`, ref: '', amount: c.amount }));
  data.auctions.filter(x => x.winnerAllocationId === a.id && x.status === 'conducted').forEach(x =>
    out.push({ id: x.id, date: x.auctionDate || x.scheduledDate, kind: 'Prize Won', text: `Won the ${monthTitle(g, x.month)} auction`, ref: x.id, amount: x.prizeAmount }));
  data.prizes.filter(p => p.allocationId === a.id && p.disbursed).forEach(p =>
    out.push({ id: `pd-${p.id}`, date: p.disbursementDate || '', kind: 'Prize Received', text: `Prize paid (${payModeLabel(p.mode)})`, ref: p.reference || '', amount: p.amount }));
  return out.sort((x, y) => y.date.localeCompare(x.date));
};

const TransactionHistory: React.FC<{ row: Row; onClose: () => void; onProfile: () => void }> = ({ row, onClose, onProfile }) => {
  const { data } = useChit();
  const entries = entriesFor(data, row.groupRec, row.allocation);
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${row.name} — Ledger`}
      subtitle={`${row.profileId} · ${row.groupRec.name} · Ticket #${row.ticket}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Instalments to date', row.instalments, 'default'],
            ['Payments received', row.paid, 'good'],
            ['Outstanding dues', row.outstanding, row.outstanding > 0 ? 'bad' : 'muted'],
            ['Dividend credits', row.dividends, 'good'],
          ] as [string, number, 'default' | 'good' | 'bad' | 'muted'][]).map(([k, v, tone]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</div>
              <div className="mt-1 text-sm"><Money value={v} bold tone={tone} /></div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Penalties <Money value={row.penalties} tone={row.penalties ? 'bad' : 'muted'} /> · Prize <Pill tone={PRIZE_TEXT[row.prize].tone}>{PRIZE_TEXT[row.prize].label}</Pill></span>
          <button type="button" className="text-emerald-700 font-semibold hover:underline" onClick={onProfile}>View member profile</button>
        </div>
        <h4 className="font-bold text-slate-700">Transaction history</h4>
        {entries.length === 0 ? <EmptyNote>No entries yet.</EmptyNote> : (
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-1.5">Date</th><th>Type</th><th>Details</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td><Pill tone={KIND_TONE[e.kind]}>{e.kind}</Pill></td>
                  <td className="text-slate-700 pr-2">{e.text}</td>
                  <td className="font-mono text-slate-500">{e.ref || '—'}</td>
                  <td className="text-right">{e.amount !== undefined ? <Money value={e.amount} tone={e.kind === 'Penalty' ? 'bad' : 'default'} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-slate-200 font-bold">
              <td colSpan={4} className="py-2">Collected so far</td>
              <td className="text-right"><Money value={sum(entries.filter(e => e.kind === 'Collection').map(e => e.amount || 0))} bold tone="good" /></td></tr></tfoot>
          </table>
        )}
      </div>
    </Modal>
  );
};
