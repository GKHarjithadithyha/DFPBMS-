import React from 'react';
import { ChitOverviewPage } from './ChitOverviewPage';
import { SchemesGroupsPage } from './SchemesGroupsPage';
import { AuctionDetailsPage, MemberAllocationPage, PaymentCollectionPage, PrizeDisbursementPage } from './ChitSectionPages';
import { MemberLedgerPage } from './MemberLedgerPage';
import { SettlementReportsPage } from './SettlementReportsPage';
import { GroupWorkspacePage } from './GroupWorkspacePage';
import { useChit } from './chitStore';

interface ChitModulePageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

type Section = 'overview' | 'schemes_groups' | 'allocation' | 'collection' | 'auction' | 'prize' | 'member_ledger' | 'reports';

/**
 * The Chit Fund module has eight sections plus a per-group workspace. Older sub-tab ids still
 * resolve (bookmarked hashes), and a bare group id or `group:<id>[:<tab>]` opens that group's workspace.
 */
const SECTION_BY_ID: Record<string, Section> = {
  chit_overview: 'overview',
  overview: 'overview',
  chit_schemes_groups: 'schemes_groups',
  chit_schemes: 'schemes_groups',
  chit_groups: 'schemes_groups',
  schemes: 'schemes_groups',
  groups: 'schemes_groups',
  chit_allocation: 'allocation',
  chit_members: 'allocation',
  members: 'allocation',
  chit_collection: 'collection',
  chit_auction: 'auction',
  chit_auctions: 'auction',
  auctions: 'auction',
  chit_prize: 'prize',
  chit_member_ledger: 'member_ledger',
  chit_reports: 'reports',
  chit_settlement: 'reports',
  // Retired accounting screens land on the closest operational page.
  chit_cashbook: 'collection',
  chit_bankbook: 'collection',
  chit_ledger: 'member_ledger',
};

export const ChitModulePage: React.FC<ChitModulePageProps> = ({ initialSubTab = '', onNavigate }) => {
  const { data } = useChit();

  const [head, id, tab] = initialSubTab.split(':');
  const workspaceId = head === 'group' ? id : data.groups.some(g => g.id === initialSubTab) ? initialSubTab : '';
  if (workspaceId) {
    return <GroupWorkspacePage key={`${workspaceId}:${tab || ''}`} groupId={workspaceId} initialTab={head === 'group' ? tab : undefined} onNavigate={onNavigate} />;
  }

  switch (SECTION_BY_ID[initialSubTab] || 'overview') {
    case 'schemes_groups':
      return <SchemesGroupsPage onNavigate={onNavigate} />;
    case 'allocation':
      return <MemberAllocationPage onNavigate={onNavigate} />;
    case 'collection':
      return <PaymentCollectionPage onNavigate={onNavigate} />;
    case 'auction':
      return <AuctionDetailsPage onNavigate={onNavigate} />;
    case 'prize':
      return <PrizeDisbursementPage onNavigate={onNavigate} />;
    case 'member_ledger':
      return <MemberLedgerPage onNavigate={onNavigate} />;
    case 'reports':
      return <SettlementReportsPage onNavigate={onNavigate} />;
    default:
      return <ChitOverviewPage onNavigate={onNavigate} />;
  }
};
