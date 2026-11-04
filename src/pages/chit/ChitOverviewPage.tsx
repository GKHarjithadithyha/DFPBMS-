import React, { useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { buildLedger, groupStats, monthLabel, prizeStatus, sum } from './chitCalc';
import { paymentModeText } from './chitTypes';
import { AuctionStatusPill, EmptyNote, GroupStatusPill, LedgerStatusPill, Money, PrizeStatusPill, Section, primaryBtn, useMemberLookup } from './chitUi';

type Navigate = (tabId: string, subTabId?: string) => void;

const Th: React.FC<{ children?: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th className={`py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Table: React.FC<{ head: React.ReactNode; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto -mx-4 -my-4">
    <table className="w-full text-xs">
      <thead className="bg-slate-50/75 border-b border-slate-200"><tr>{head}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const ChitOverviewPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const { data } = useChit();
  const lookup = useMemberLookup();

  const go = (sub: string, groupId?: string) => {
    if (groupId) { try { sessionStorage.setItem('pbms_chit_selected_group', groupId); } catch { /* ignore */ } }
    onNavigate?.('chit', sub);
  };

  const running = data.groups.filter(g => g.status !== 'closed');
  const stats = useMemo(() => new Map(data.groups.map(g => [g.id, groupStats(data, g)])), [data]);
  const st = (id: string) => stats.get(id)!;

  const monthExpected = sum(running.map(g => st(g.id).monthDemand));
  const monthReceived = sum(running.map(g => st(g.id).monthCollected));
  const monthPending = sum(running.map(g => st(g.id).monthPending));
  const pendingPrizes = data.prizes.filter(p => !p.disbursed).sort((a, b) => a.groupId.localeCompare(b.groupId) || a.month - b.month);

  const recent = [...data.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const pendingMembers = useMemo(
    () =>
      data.groups
        .filter(g => g.status !== 'closed')
        .flatMap(g => buildLedger(data, g, g.currentMonth).filter(r => r.balance > 0).map(r => ({ g, r })))
        .sort((a, b) => b.r.balance - a.r.balance)
        .slice(0, 7),
    [data]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chit Fund Overview"
        subtitle="Collections, auctions and prize payments across all chit groups."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Overview' }]}
        actions={
          <button type="button" className={primaryBtn} onClick={() => go('chit_schemes_groups')}>
            <CalendarPlus className="w-4 h-4" /><span>Schemes & Groups</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard title="Total Chit Groups" value={data.groups.length} subtitle={`${data.groups.filter(g => g.status === 'active').length} active`} />
        <StatCard title="Active Members" value={sum(running.map(g => st(g.id).enrolled))} subtitle="Tickets in running groups" />
        <StatCard title="Monthly Expected" value={`₹${monthExpected.toLocaleString('en-IN')}`} subtitle="Current month, incl. pending" />
        <StatCard title="Monthly Received" value={`₹${monthReceived.toLocaleString('en-IN')}`} subtitle={monthExpected ? `${Math.round((monthReceived / monthExpected) * 100)}% collected` : '—'} />
        <StatCard title="Pending Collections" value={`₹${monthPending.toLocaleString('en-IN')}`} subtitle={pendingMembers.length ? 'Members yet to pay' : 'All paid up'} />
        <StatCard title="Auctions Conducted" value={sum(data.groups.map(g => st(g.id).auctionsConducted))} subtitle="Across all groups" />
        <StatCard title="Pending Prize Payments" value={pendingPrizes.length} subtitle={`₹${sum(pendingPrizes.map(p => p.amount)).toLocaleString('en-IN')} to be paid`} />
      </div>

      <Section title="Active Chit Groups" subtitle="Open a group to see its members, collections, auctions and prize payments">
        <Table head={<><Th>Group</Th><Th>Name</Th><Th right>Members</Th><Th>Month</Th><Th right>Chit value</Th><Th right>Monthly collection</Th><Th>Status</Th></>}>
          {data.groups.length === 0 && <tr><td colSpan={7}><EmptyNote>No chit groups yet.</EmptyNote></td></tr>}
          {data.groups.map(g => (
            <tr key={g.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => onNavigate?.('chit', `group:${g.id}`)}>
              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{g.id}</td>
              <td className="px-3 font-semibold text-slate-900">{g.name}</td>
              <td className="px-3 text-right font-mono">{st(g.id).enrolled}<span className="text-slate-400"> / {g.totalMembers}</span></td>
              <td className="px-3 whitespace-nowrap">{g.currentMonth} of {g.durationMonths} <span className="text-slate-400">· {monthLabel(g, g.currentMonth)}</span></td>
              <td className="px-3 text-right"><Money value={g.totalValue} /></td>
              <td className="px-3 text-right"><Money value={g.monthlyCollection * g.totalMembers} /></td>
              <td className="px-3"><GroupStatusPill status={g.status} /></td>
            </tr>
          ))}
        </Table>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Section title="Recent Collections" subtitle="Latest instalments received">
          <Table head={<><Th>Date</Th><Th>Member</Th><Th>Group</Th><Th>Mode</Th><Th right>Amount</Th></>}>
            {recent.map(p => (
              <tr key={p.id}>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{formatDate(p.date)}</td>
                <td className="px-3 font-semibold text-slate-800">{lookup.nameOf(p.allocationId)}</td>
                <td className="px-3 font-mono text-slate-500">{p.groupId}</td>
                <td className="px-3 text-slate-600">{paymentModeText(p)}</td>
                <td className="px-3 text-right"><Money value={p.amount} tone="good" bold /></td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan={5}><EmptyNote>No collections recorded yet.</EmptyNote></td></tr>}
          </Table>
        </Section>

        <Section title="Pending Member Payments" subtitle="Largest balances in the current month">
          <Table head={<><Th>Member</Th><Th>Group</Th><Th right>Balance</Th><Th>Status</Th></>}>
            {pendingMembers.map(({ g, r }) => (
              <tr key={r.allocation.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => go('chit_collection', g.id)}>
                <td className="py-2.5 px-3 font-semibold text-slate-800"><span className="font-mono text-slate-500">#{r.allocation.ticketNumber}</span> {lookup.nameOf(r.allocation.id)}</td>
                <td className="px-3 font-mono text-slate-500">{g.id}</td>
                <td className="px-3 text-right"><Money value={r.balance} tone="bad" bold /></td>
                <td className="px-3"><LedgerStatusPill status={r.status} /></td>
              </tr>
            ))}
            {pendingMembers.length === 0 && <tr><td colSpan={4}><EmptyNote>No pending payments.</EmptyNote></td></tr>}
          </Table>
        </Section>

        <Section title="Monthly Auction Status" subtitle="Current month of each running group">
          <Table head={<><Th>Group</Th><Th>Month</Th><Th>Status</Th><Th>Date</Th><Th right>Conducted</Th></>}>
            {running.map(g => {
              const a = data.auctions.find(x => x.groupId === g.id && x.month === g.currentMonth);
              return (
                <tr key={g.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => go('chit_auction', g.id)}>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{g.id}</td>
                  <td className="px-3">Month {g.currentMonth}</td>
                  <td className="px-3">{a ? <AuctionStatusPill status={a.status} /> : '—'}</td>
                  <td className="px-3 whitespace-nowrap">{a ? formatDate(a.auctionDate || a.scheduledDate) : '—'}</td>
                  <td className="px-3 text-right font-mono">{st(g.id).auctionsConducted}<span className="text-slate-400"> / {g.durationMonths}</span></td>
                </tr>
              );
            })}
            {running.length === 0 && <tr><td colSpan={5}><EmptyNote>No running groups.</EmptyNote></td></tr>}
          </Table>
        </Section>

        <Section title="Pending Prize Disbursements" subtitle="Winners yet to be paid">
          <Table head={<><Th>Group · Month</Th><Th>Winner</Th><Th right>Prize</Th><Th>Status</Th></>}>
            {pendingPrizes.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => go('chit_prize', p.groupId)}>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.groupId} · M{p.month}</td>
                <td className="px-3 font-semibold text-slate-800">{lookup.nameOf(p.allocationId)}</td>
                <td className="px-3 text-right"><Money value={p.amount} bold /></td>
                <td className="px-3"><PrizeStatusPill status={prizeStatus(p)} /></td>
              </tr>
            ))}
            {pendingPrizes.length === 0 && <tr><td colSpan={4}><EmptyNote>No prize payments are pending.</EmptyNote></td></tr>}
          </Table>
        </Section>
      </div>
    </div>
  );
};
