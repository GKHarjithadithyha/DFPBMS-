import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Tabs } from '../../components/common/Tabs';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { auctionOf, groupStats, monthLabel, monthTitle } from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import { AuctionRegisterView } from './AuctionRegisterView';
import { PaymentCollectionView } from './PaymentCollectionView';
import { DividendLedgerView } from './DividendLedgerView';
import { MemberAllocationView } from './MemberAllocationView';
import { PrizeRegisterView } from './PrizeRegisterView';
import { GroupFinancialSummary } from './SettlementViews';
import { AuctionStatusPill, FormError, GroupStatusPill, Money, Section, primaryBtn, secondaryBtn } from './chitUi';

type Navigate = (tabId: string, subTabId?: string) => void;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'collection', label: 'Collection Ledger' },
  { id: 'auction', label: 'Auction Ledger' },
  { id: 'dividend', label: 'Dividend Ledger' },
  { id: 'prize', label: 'Prize Disbursement' },
  { id: 'summary', label: 'Financial Summary' },
];

export const GroupWorkspacePage: React.FC<{ groupId: string; initialTab?: string; onNavigate?: Navigate }> = ({ groupId, initialTab, onNavigate }) => {
  const { data, activateGroup, advanceMonth } = useChit();
  const group = data.groups.find(g => g.id === groupId);
  const [tab, setTab] = useState(TABS.some(t => t.id === initialTab) ? (initialTab as string) : 'overview');
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <div className="space-y-4">
        <PageHeader title="Group not found" subtitle={`There is no chit group with ID ${groupId}.`} breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Group Workspace' }]} />
        <button type="button" className={secondaryBtn} onClick={() => onNavigate?.('chit', 'chit_schemes_groups')}>
          <ArrowLeft className="w-4 h-4" /><span>Back to Schemes & Groups</span>
        </button>
      </div>
    );
  }

  const run = (res: { ok: boolean }) => setError(res.ok ? null : (res as unknown as { error: string }).error);
  const counts = {
    members: data.allocations.filter(a => a.groupId === group.id).length,
    prize: data.prizes.filter(p => p.groupId === group.id && !p.disbursed).length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={group.name}
        subtitle={`${group.id} · ${group.durationMonths}-month chit · ₹${group.totalValue.toLocaleString('en-IN')} · ${formatDate(group.startDate)} to ${formatDate(group.endDate)}`}
        badge={<GroupStatusPill status={group.status} />}
        breadcrumbs={[
          { label: 'Business Modules' },
          { label: 'Chit Fund' },
          { label: 'Schemes & Groups', onClick: () => onNavigate?.('chit', 'chit_schemes_groups') },
          { label: group.id },
        ]}
        actions={
          <>
            {group.status === 'forming' && (
              <button type="button" className={primaryBtn} onClick={() => run(activateGroup(group.id))}>
                <Play className="w-4 h-4" /><span>Activate Group</span>
              </button>
            )}
            {group.status === 'active' && group.currentMonth < group.durationMonths && (
              <button type="button" className={secondaryBtn} onClick={() => run(advanceMonth(group.id))}>
                <ArrowRight className="w-4 h-4" /><span>Move to Month {group.currentMonth + 1}</span>
              </button>
            )}
          </>
        }
      />
      <FormError message={error} />

      <Tabs
        tabs={TABS.map(t => ({ ...t, count: t.id === 'members' ? `${counts.members}/${group.totalMembers}` : t.id === 'prize' && counts.prize ? counts.prize : undefined }))}
        activeTab={tab}
        onChange={t => { setTab(t); setError(null); }}
      />

      {tab === 'overview' && <WorkspaceOverview group={group} goTo={setTab} />}
      {tab === 'members' && <MemberAllocationView group={group} onNavigate={onNavigate} />}
      {tab === 'collection' && <PaymentCollectionView group={group} onNavigate={onNavigate} />}
      {tab === 'auction' && <AuctionRegisterView group={group} />}
      {tab === 'dividend' && <DividendLedgerView group={group} />}
      {tab === 'prize' && <PrizeRegisterView group={group} />}
      {tab === 'summary' && <GroupFinancialSummary group={group} />}
    </div>
  );
};

const WorkspaceOverview: React.FC<{ group: ChitGroupRec; goTo: (tab: string) => void }> = ({ group, goTo }) => {
  const { data } = useChit();
  const s = groupStats(data, group);
  const scheme = data.schemes.find(x => x.id === group.schemeId);
  const auction = auctionOf(data, group.id, group.currentMonth);
  const pendingPrizes = data.prizes.filter(p => p.groupId === group.id && !p.disbursed).length;

  const details: [string, React.ReactNode][] = [
    ['Scheme', scheme ? `${scheme.id} — ${scheme.name}` : group.schemeId],
    ['Members', `${s.enrolled} of ${group.totalMembers} allocated`],
    ['Monthly subscription', <Money key="m" value={group.monthlyCollection} />],
    ['Monthly collection (full group)', <Money key="g" value={group.monthlyCollection * group.totalMembers} />],
    ['Foreman commission', `${group.foremanCommissionPct}% of auction discount`],
    ['Current month', monthTitle(group, group.currentMonth)],
    ['Ends', `${formatDate(group.endDate)} (${monthLabel(group, group.durationMonths)})`],
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <Section title="Group Details" className="xl:col-span-2">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
          {details.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-900 text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={`This month — ${monthLabel(group, group.currentMonth)}`}>
        <ul className="space-y-3 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Collected</span>
            <span><Money value={s.monthCollected} tone="good" bold /> <span className="text-slate-400">of</span> <Money value={s.monthDemand} /></span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Members paid</span>
            <span className="font-mono font-semibold">{s.paidMembers} / {s.paidMembers + s.pendingMembers}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Auction</span>
            {auction ? <AuctionStatusPill status={auction.status} /> : '—'}
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Prizes awaiting payment</span>
            <span className="font-mono font-semibold">{pendingPrizes}</span>
          </li>
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={secondaryBtn} onClick={() => goTo('collection')}>Collections</button>
          <button type="button" className={secondaryBtn} onClick={() => goTo('auction')}>Auctions</button>
        </div>
      </Section>
    </div>
  );
};
