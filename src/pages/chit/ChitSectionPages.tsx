import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Tabs } from '../../components/common/Tabs';
import { monthLabel } from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import { AuctionRegisterView } from './AuctionRegisterView';
import { DividendLedgerView } from './DividendLedgerView';
import { MemberAllocationView } from './MemberAllocationView';
import { PaymentCollectionView } from './PaymentCollectionView';
import { PrizeRegisterView } from './PrizeRegisterView';
import { EmptyNote, GroupSelect, GroupStatusPill, secondaryBtn, useGroupChoice } from './chitUi';
import { useChit } from './chitStore';

type Navigate = (tabId: string, subTabId?: string) => void;

/** Header + chit group picker shared by the group-scoped sections. */
const GroupScopedPage: React.FC<{
  title: string;
  subtitle: string;
  crumb: string;
  onNavigate?: Navigate;
  children: (group: ChitGroupRec) => React.ReactNode;
}> = ({ title, subtitle, crumb, onNavigate, children }) => {
  const { data } = useChit();
  const { groupId, group, setGroupId } = useGroupChoice();

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: crumb }]}
        actions={
          data.groups.length > 0 && (
            <>
              <GroupSelect value={groupId} onChange={setGroupId} className="min-w-[260px]" />
              {group && onNavigate && (
                <button type="button" className={secondaryBtn} onClick={() => onNavigate('chit', `group:${group.id}`)}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Group Workspace</span>
                </button>
              )}
            </>
          )
        }
      />
      {group ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 -mt-2">
            <GroupStatusPill status={group.status} />
            <span><strong className="text-slate-800">{group.name}</strong> · {group.id}</span>
            <span>Month {group.currentMonth} of {group.durationMonths} ({monthLabel(group, group.currentMonth)})</span>
            <span>Chit value ₹{group.totalValue.toLocaleString('en-IN')}</span>
          </div>
          {children(group)}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200"><EmptyNote>No chit groups yet. Create one under Schemes & Groups.</EmptyNote></div>
      )}
    </div>
  );
};

export const MemberAllocationPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => (
  <GroupScopedPage
    title="Member Allocation"
    subtitle="Allocate existing Master Profile members to a chit group and assign chit-specific ticket numbers."
    crumb="Member Allocation"
    onNavigate={onNavigate}
  >
    {group => <MemberAllocationView group={group} onNavigate={onNavigate} />}
  </GroupScopedPage>
);

export const PaymentCollectionPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => (
  <GroupScopedPage
    title="Payment Collection"
    subtitle="Record the monthly instalments received from subscribers."
    crumb="Payment Collection"
    onNavigate={onNavigate}
  >
    {group => <PaymentCollectionView key={group.id} group={group} onNavigate={onNavigate} />}
  </GroupScopedPage>
);

export const AuctionDetailsPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const [tab, setTab] = useState('register');
  return (
    <GroupScopedPage
      title="Auction Details"
      subtitle="Enter the result of each auction after it has been conducted manually."
      crumb="Auction Details"
      onNavigate={onNavigate}
    >
      {group => (
        <div className="space-y-4">
          <Tabs
            variant="pills"
            activeTab={tab}
            onChange={setTab}
            className="w-fit"
            tabs={[
              { id: 'register', label: 'Auction Register' },
              { id: 'dividend', label: 'Dividend Credits' },
            ]}
          />
          {tab === 'register' && <AuctionRegisterView key={group.id} group={group} />}
          {tab === 'dividend' && <DividendLedgerView key={group.id} group={group} />}
        </div>
      )}
    </GroupScopedPage>
  );
};

export const PrizeDisbursementPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => (
  <GroupScopedPage
    title="Prize Disbursement"
    subtitle="Record the verification and payment of each auction winner's prize."
    crumb="Prize Disbursement"
    onNavigate={onNavigate}
  >
    {group => <PrizeRegisterView key={group.id} group={group} />}
  </GroupScopedPage>
);
