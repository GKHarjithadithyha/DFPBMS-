import React from 'react';
import { RentalOverview } from './RentalOverview';
import { PropertyManagement } from './PropertyManagement';
import { TenantAgreementManagement } from './TenantAgreementManagement';
import { CollectionManagement } from './CollectionManagement';
import { RentalExpenseManagement } from './RentalExpenseManagement';
import { PropertyHistory } from './PropertyHistory';

interface RentalManagementPageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
}

/**
 * Rental Management has exactly five submodules. Agreement renewal, expiry reminders, exit,
 * settlement, receipts, reports and the Cash/Bank Book postings live inside them as actions.
 * Old sub-tab ids from earlier navigation (bookmarked hashes) resolve to their new home.
 */
const SUBMODULE_BY_ID: Record<string, 'overview' | 'properties' | 'tenants' | 'collections' | 'expenses' | 'history'> = {
  rental_history: 'history',
  rental_overview: 'overview',
  overview: 'overview',
  rental_properties: 'properties',
  rental_parents: 'properties',
  parent_properties: 'properties',
  parents: 'properties',
  rental_units: 'properties',
  units: 'properties',
  rental_tenants: 'tenants',
  rental_agreements: 'tenants',
  lease_management: 'tenants',
  rental_collections: 'collections',
  collections: 'collections',
  rental_expenses: 'expenses',
};

export const RentalManagementPage: React.FC<RentalManagementPageProps> = ({ initialSubTab, onNavigate }) => {
  const view = SUBMODULE_BY_ID[initialSubTab || ''] || 'overview';

  switch (view) {
    case 'properties':
      return <PropertyManagement onNavigate={onNavigate} />;
    case 'tenants':
      return <TenantAgreementManagement onNavigate={onNavigate} />;
    case 'collections':
      return <CollectionManagement />;
    case 'expenses':
      return <RentalExpenseManagement />;
    case 'history':
      return <PropertyHistory onNavigate={onNavigate} />;
    default:
      return <RentalOverview onNavigate={onNavigate} />;
  }
};
