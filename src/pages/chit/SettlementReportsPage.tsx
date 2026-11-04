import React, { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, Column } from '../../components/common/DataTable';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import {
  auctionAmounts, balanceAfter, dividendCredited, groupStats, monthLabel, monthTitle, prizeStatus, sum,
} from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import {
  AuctionStatusPill, EmptyNote, GroupSelect, GroupStatusPill, Money, PRIZE_LABEL, PrizeStatusPill, Section,
  useGroupChoice, useMemberLookup,
} from './chitUi';
import { ClosureChecklist, FinancialKpis, SettlementStatement } from './SettlementViews';

type Navigate = (tabId: string, subTabId?: string) => void;
const money = (v: number, tone?: 'default' | 'good' | 'bad' | 'muted', bold?: boolean) => <Money value={v} tone={tone} bold={bold} />;

const TABS = [
  { id: 'groups', label: 'Group Summary' },
  { id: 'contribution', label: 'Contribution Ledger' },
  { id: 'penalty', label: 'Penalty Ledger' },
  { id: 'dividend', label: 'Dividend Ledger' },
  { id: 'auctions', label: 'Auction History' },
  { id: 'prizes', label: 'Prize History' },
  { id: 'outstanding', label: 'Outstanding Balances' },
  { id: 'settlement', label: 'Final Settlement & Closure' },
];

export const SettlementReportsPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const { data } = useChit();
  const { groupId, group, setGroupId } = useGroupChoice();
  const [tab, setTab] = useState('groups');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Group-wise and member-wise ledgers, outstanding balances, and the final reconciliation before a group is closed."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Reports' }]}
        actions={data.groups.length > 0 && <GroupSelect value={groupId} onChange={setGroupId} className="min-w-[260px]" />}
      />

      {group ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 -mt-2">
            <GroupStatusPill status={group.status} />
            <span><strong className="text-slate-800">{group.name}</strong> · {group.id}</span>
            <span>Month {group.currentMonth} of {group.durationMonths}</span>
            {onNavigate && (
              <button type="button" className="text-emerald-700 font-semibold hover:underline" onClick={() => onNavigate('chit', `group:${group.id}`)}>Open workspace</button>
            )}
          </div>
          <FinancialKpis group={group} />
          <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />
          {tab === 'groups' && <GroupSummaryReport selected={group.id} onPick={id => { setGroupId(id); setTab('settlement'); }} />}
          {tab === 'contribution' && <ContributionReport group={group} />}
          {tab === 'penalty' && <PenaltyReport group={group} />}
          {tab === 'dividend' && <DividendReport group={group} />}
          {tab === 'auctions' && <AuctionHistoryReport group={group} />}
          {tab === 'prizes' && <PrizeHistoryReport group={group} />}
          {tab === 'outstanding' && <OutstandingReport group={group} />}
          {tab === 'settlement' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SettlementStatement group={group} />
              <ClosureChecklist group={group} />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200"><EmptyNote>No chit groups yet.</EmptyNote></div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const GroupSummaryReport: React.FC<{ selected: string; onPick: (id: string) => void }> = ({ selected, onPick }) => {
  const { data } = useChit();
  interface Row { id: string; group: ChitGroupRec; name: string; expected: number; collected: number; outstanding: number; discounts: number; commission: number; dividends: number; prizes: number; liabilities: number }
  const rows: Row[] = data.groups.map(g => {
    const s = groupStats(data, g);
    return { id: g.id, group: g, name: g.name, expected: s.expectedToDate, collected: s.collected, outstanding: Math.max(0, s.outstanding), discounts: s.discounts, commission: s.commission, dividends: s.dividendsCredited, prizes: s.prizesDisbursed, liabilities: s.liabilities };
  });
  const total = (k: keyof Row) => sum(rows.map(r => r[k] as number));

  const cols: Column<Row>[] = [
    { header: 'Group', accessor: 'id', render: (_v, r) => (
      <button type="button" className={`text-left hover:underline ${r.id === selected ? 'text-emerald-700' : 'text-slate-900'}`} onClick={() => onPick(r.id)}>
        <span className="font-mono font-bold">{r.id}</span> <span className="font-semibold">{r.name}</span>
      </button>) },
    { header: 'Status', render: (_v, r) => <GroupStatusPill status={r.group.status} /> },
    { header: 'Expected', accessor: 'expected', className: 'text-right', render: (_v, r) => money(r.expected) },
    { header: 'Collected', accessor: 'collected', className: 'text-right', render: (_v, r) => money(r.collected, 'good') },
    { header: 'Outstanding', accessor: 'outstanding', className: 'text-right', render: (_v, r) => money(r.outstanding, r.outstanding > 0 ? 'bad' : 'muted') },
    { header: 'Auction Discounts', accessor: 'discounts', className: 'text-right', render: (_v, r) => money(r.discounts) },
    { header: 'Commission', accessor: 'commission', className: 'text-right', render: (_v, r) => money(r.commission) },
    { header: 'Dividends Credited', accessor: 'dividends', className: 'text-right', render: (_v, r) => money(r.dividends) },
    { header: 'Prizes Disbursed', accessor: 'prizes', className: 'text-right', render: (_v, r) => money(r.prizes) },
    { header: 'Liabilities', accessor: 'liabilities', className: 'text-right', render: (_v, r) => money(r.liabilities, r.liabilities > 0 ? 'bad' : 'muted', true) },
  ];

  return (
    <div className="space-y-2">
      <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable exportFileName="chit_group_financial_summary" printTitle="Chit Fund — Group-wise Financial Summary" />
      <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-xs bg-white rounded-xl border border-slate-200 px-4 py-2.5">
        <strong className="text-slate-700 mr-auto">All groups</strong>
        <span>Expected {money(total('expected'), 'default', true)}</span>
        <span>Collected {money(total('collected'), 'good', true)}</span>
        <span>Outstanding {money(total('outstanding'), 'bad', true)}</span>
        <span>Liabilities {money(total('liabilities'), 'default', true)}</span>
      </div>
    </div>
  );
};

const ContributionReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; ticket: number; name: string; charged: number; penalty: number; paid: number; outstanding: number; last: string }
  const rows: Row[] = data.allocations.filter(a => a.groupId === group.id).sort((a, b) => a.ticketNumber - b.ticketNumber).map(a => {
    const months = Math.max(0, group.currentMonth - a.joinMonth + 1);
    const penalty = sum(data.penalties.filter(p => p.allocationId === a.id && p.month <= group.currentMonth).map(p => p.amount));
    const pays = data.payments.filter(p => p.allocationId === a.id);
    return { id: a.id, ticket: a.ticketNumber, name: lookup.nameOf(a.id), charged: months * a.monthlyContribution, penalty, paid: sum(pays.map(p => p.amount)), outstanding: balanceAfter(data, a, group.currentMonth), last: pays.length ? formatDate(pays.map(p => p.date).sort().pop()) : '' };
  });
  const cols: Column<Row>[] = [
    { header: 'Ticket', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Member', accessor: 'name', render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Instalments Due', accessor: 'charged', className: 'text-right', render: (_v, r) => money(r.charged) },
    { header: 'Penalties', accessor: 'penalty', className: 'text-right', render: (_v, r) => money(r.penalty, r.penalty ? 'bad' : 'muted') },
    { header: 'Total Paid', accessor: 'paid', className: 'text-right', render: (_v, r) => money(r.paid, 'good') },
    { header: 'Outstanding', accessor: 'outstanding', className: 'text-right', render: (_v, r) => money(r.outstanding, r.outstanding > 0 ? 'bad' : 'muted', true) },
    { header: 'Last Payment', accessor: 'last', render: (_v, r) => r.last || '—' },
  ];
  return <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search member..." exportFileName={`chit_${group.id}_contributions`} printTitle={`${group.name} — Member-wise Contribution Ledger`} emptyTitle="No members allocated" />;
};

const PenaltyReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; date: string; month: string; ticket: number; name: string; reason: string; amount: number }
  const rows: Row[] = data.penalties.filter(p => p.groupId === group.id).sort((a, b) => b.date.localeCompare(a.date)).map(p => ({
    id: p.id, date: formatDate(p.date), month: monthTitle(group, p.month), ticket: lookup.info(p.allocationId)?.allocation.ticketNumber ?? 0, name: lookup.nameOf(p.allocationId), reason: p.reason, amount: p.amount,
  }));
  const cols: Column<Row>[] = [
    { header: 'Date', accessor: 'date', render: (_v, r) => <span className="whitespace-nowrap">{r.date}</span> },
    { header: 'Month', accessor: 'month' },
    { header: 'Ticket', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Member', accessor: 'name', render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Penalty', accessor: 'amount', className: 'text-right', render: (_v, r) => money(r.amount, 'bad', true) },
  ];
  return <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search member or reason..." exportFileName={`chit_${group.id}_penalties`} printTitle={`${group.name} — Member-wise Penalty Ledger`} emptyTitle="No penalties recorded" />;
};

const DividendReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; ticket: number; name: string; entitled: number; credited: number; pending: number; months: string }
  const rows: Row[] = data.allocations.filter(a => a.groupId === group.id).sort((a, b) => a.ticketNumber - b.ticketNumber).map(a => {
    const divs = data.dividends.filter(d => d.allocationId === a.id && d.eligible);
    const entitled = sum(divs.map(d => d.eligibleAmount));
    const credited = sum(divs.map(d => dividendCredited(data, d.id)));
    return { id: a.id, ticket: a.ticketNumber, name: lookup.nameOf(a.id), entitled, credited, pending: entitled - credited, months: divs.map(d => `M${d.month}`).join(', ') };
  });
  const cols: Column<Row>[] = [
    { header: 'Ticket', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Member', accessor: 'name', render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Auction Months', accessor: 'months', render: (_v, r) => <span className="text-slate-500">{r.months || '—'}</span> },
    { header: 'Eligible Dividend', accessor: 'entitled', className: 'text-right', render: (_v, r) => money(r.entitled) },
    { header: 'Credited', accessor: 'credited', className: 'text-right', render: (_v, r) => money(r.credited, 'good') },
    { header: 'Pending Credit', accessor: 'pending', className: 'text-right', render: (_v, r) => money(r.pending, r.pending > 0 ? 'bad' : 'muted', true) },
  ];
  return <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search member..." exportFileName={`chit_${group.id}_dividends`} printTitle={`${group.name} — Member-wise Dividend Ledger`} emptyTitle="No members allocated" />;
};

const AuctionHistoryReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; month: string; date: string; status: 'not_conducted' | 'conducted' | 'postponed'; winner: string; pool: number; prize: number; discount: number; commission: number; dividend: number; remarks: string }
  const rows: Row[] = data.auctions.filter(a => a.groupId === group.id && a.status !== 'not_conducted').sort((a, b) => a.month - b.month).map(a => {
    const f = auctionAmounts(a);
    return { id: a.id, month: `Month ${a.month} · ${monthLabel(group, a.month)}`, date: formatDate(a.auctionDate || a.scheduledDate), status: a.status, winner: a.status === 'conducted' ? `#${a.ticketNumber} ${lookup.nameOf(a.winnerAllocationId)}` : '', pool: a.poolAmount, prize: a.prizeAmount || 0, discount: f.discount, commission: f.commission, dividend: f.dividend, remarks: a.remarks || '' };
  });
  const cols: Column<Row>[] = [
    { header: 'Month', accessor: 'month', render: (_v, r) => <span className="font-semibold text-slate-900 whitespace-nowrap">{r.month}</span> },
    { header: 'Date', accessor: 'date', render: (_v, r) => <span className="whitespace-nowrap">{r.date}</span> },
    { header: 'Status', accessor: 'status', render: (_v, r) => <AuctionStatusPill status={r.status} /> },
    { header: 'Winner', accessor: 'winner', render: (_v, r) => r.winner || '—' },
    { header: 'Pool', accessor: 'pool', className: 'text-right', render: (_v, r) => (r.status === 'conducted' ? money(r.pool) : '—') },
    { header: 'Prize', accessor: 'prize', className: 'text-right', render: (_v, r) => (r.status === 'conducted' ? money(r.prize, 'default', true) : '—') },
    { header: 'Discount', accessor: 'discount', className: 'text-right', render: (_v, r) => (r.status === 'conducted' ? money(r.discount) : '—') },
    { header: 'Commission', accessor: 'commission', className: 'text-right', render: (_v, r) => (r.status === 'conducted' ? money(r.commission) : '—') },
    { header: 'Dividend', accessor: 'dividend', className: 'text-right', render: (_v, r) => (r.status === 'conducted' ? money(r.dividend) : '—') },
    { header: 'Remarks', accessor: 'remarks', render: (_v, r) => <span className="text-slate-500">{r.remarks || '—'}</span> },
  ];
  return <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search auction..." exportFileName={`chit_${group.id}_auction_history`} printTitle={`${group.name} — Auction History`} emptyTitle="No auctions recorded yet" emptySubtitle="Conducted and postponed auctions appear here." />;
};

const PrizeHistoryReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; month: string; winner: string; amount: number; status: string; date: string; ref: string; overall: ReturnType<typeof prizeStatus> }
  const rows: Row[] = data.prizes.filter(p => p.groupId === group.id).sort((a, b) => a.month - b.month).map(p => ({
    id: p.id, month: monthTitle(group, p.month), winner: lookup.nameOf(p.allocationId), amount: p.amount, status: PRIZE_LABEL[prizeStatus(p)], date: p.disbursementDate ? formatDate(p.disbursementDate) : '', ref: p.reference || '', overall: prizeStatus(p),
  }));
  const cols: Column<Row>[] = [
    { header: 'Auction Month', accessor: 'month', render: (_v, r) => <span className="font-semibold text-slate-900 whitespace-nowrap">{r.month}</span> },
    { header: 'Winner', accessor: 'winner' },
    { header: 'Prize Amount', accessor: 'amount', className: 'text-right', render: (_v, r) => money(r.amount, 'default', true) },
    { header: 'Status', accessor: 'status', render: (_v, r) => <PrizeStatusPill status={r.overall} /> },
    { header: 'Disbursed On', accessor: 'date', render: (_v, r) => r.date || '—' },
    { header: 'Payment Reference', accessor: 'ref', render: (_v, r) => <span className="font-mono text-slate-600">{r.ref || '—'}</span> },
  ];
  return <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search winner..." exportFileName={`chit_${group.id}_prizes`} printTitle={`${group.name} — Prize Disbursement History`} emptyTitle="No prizes awarded yet" />;
};

const OutstandingReport: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();
  interface Row { id: string; ticket: number; name: string; monthsBehind: number; outstanding: number; since: string }
  const rows: Row[] = data.allocations.filter(a => a.groupId === group.id).map(a => {
    const outstanding = balanceAfter(data, a, group.currentMonth);
    // The oldest month whose cumulative balance is still unpaid.
    let since = 0;
    for (let m = a.joinMonth; m <= group.currentMonth; m++) {
      if (balanceAfter(data, a, m) > 0) { since = m; break; }
    }
    return { id: a.id, ticket: a.ticketNumber, name: lookup.nameOf(a.id), monthsBehind: since ? group.currentMonth - since + 1 : 0, outstanding, since: since ? monthLabel(group, since) : '' };
  }).filter(r => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
  const cols: Column<Row>[] = [
    { header: 'Ticket', accessor: 'ticket', render: (_v, r) => <span className="font-mono font-bold">#{r.ticket}</span> },
    { header: 'Member', accessor: 'name', render: (_v, r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { header: 'Unpaid Since', accessor: 'since' },
    { header: 'Months Behind', accessor: 'monthsBehind', className: 'text-right', render: (_v, r) => <span className="font-mono">{r.monthsBehind}</span> },
    { header: 'Outstanding', accessor: 'outstanding', className: 'text-right', render: (_v, r) => money(r.outstanding, 'bad', true) },
  ];
  return (
    <DataTable data={rows} columns={cols} keyExtractor={r => r.id} compact printable searchPlaceholder="Search member..." exportFileName={`chit_${group.id}_outstanding`} printTitle={`${group.name} — Outstanding Balance Report`}
      emptyTitle="No outstanding balances" emptySubtitle="Every ticket is paid up to the current month."
      actions={<span className="text-xs text-slate-500">Total <Money value={sum(rows.map(r => r.outstanding))} tone="bad" bold /></span>} />
  );
};
