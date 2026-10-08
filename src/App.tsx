import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { AppShell } from './components/layout/AppShell';

// Auth Page
import { LoginPage } from './pages/auth/LoginPage';

// Pages
import { Dashboard } from './pages/Dashboard';
import { CashBookPage } from './pages/financialCore/CashBookPage';
import { BankBookPage } from './pages/financialCore/BankBookPage';
import { CentralLedgerPage } from './pages/financialCore/CentralLedgerPage';

// Finance Sub-pages
import { FinanceOverviewPage } from './pages/finance/FinanceOverviewPage';
import { LoanApplicationsPage } from './pages/finance/LoanApplicationsPage';
import { LoanRegisterPage } from './pages/finance/LoanRegisterPage';
import { DisbursementsPage } from './pages/finance/DisbursementsPage';
import { LoanCollectionsPage } from './pages/finance/LoanCollectionsPage';
import { LoanTopUpsPage } from './pages/finance/LoanTopUpsPage';
import { LoanNPAPage } from './pages/finance/LoanNPAPage';
import { LoanClosurePage } from './pages/finance/LoanClosurePage';
import { NewLoanScreen } from './pages/finance/NewLoanScreen';

// Chit Fund Sub-pages
import { ChitOverviewPage } from './pages/chit/ChitOverviewPage';
import { ChitGroupsPage } from './pages/chit/ChitGroupsPage';
import { ChitSchemesPage } from './pages/chit/ChitSchemesPage';
import { ChitMembersPage } from './pages/chit/ChitMembersPage';
import { ChitAuctionsPage } from './pages/chit/ChitAuctionsPage';

// Business Modules
import { RentalManagementPage } from './pages/rental/RentalManagementPage';
import { ExpensePage } from './pages/expense/ExpensePage';
import { InvestmentPage } from './pages/investment/InvestmentPage';
import { ReceivablesPayablesPage } from './pages/receivablesPayables/ReceivablesPayablesPage';

// Shared Pages
import { ProfileDirectoryPage } from './pages/shared/ProfileDirectoryPage';
import { CalendarPage } from './pages/shared/CalendarPage';
import { DocumentRepositoryPage } from './pages/shared/DocumentRepositoryPage';
import { ReportsPage } from './pages/shared/ReportsPage';
import { AuditLogPage } from './pages/shared/AuditLogPage';
import { MasterDataPage } from './pages/shared/MasterDataPage';

const getInitialStateFromHash = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash) {
    const parts = hash.split('/');
    if (parts.length >= 2) {
      return { tab: parts[0], subTab: parts[1] };
    } else if (parts.length === 1) {
      return { tab: parts[0], subTab: '' };
    }
  }
  return { tab: 'dashboard', subTab: '' };
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useERP();

  const initialState = getInitialStateFromHash();
  const [currentTab, setCurrentTab] = useState<string>(initialState.tab);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialState.subTab);

  React.useEffect(() => {
    const handleHashChange = () => {
      const state = getInitialStateFromHash();
      setCurrentTab(state.tab);
      setActiveSubTab(state.subTab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleNavigate = (tabId: string, subTabId?: string) => {
    const sub = subTabId || '';
    setCurrentTab(tabId);
    setActiveSubTab(sub);

    const hashStr = sub ? `${tabId}/${sub}` : tabId;
    if (window.location.hash !== `#${hashStr}`) {
      window.location.hash = hashStr;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;

      case 'cash_book':
        return <CashBookPage />;

      case 'bank_book':
        return <BankBookPage />;

      case 'central_ledger':
        return <CentralLedgerPage />;

      case 'finance':
        if (activeSubTab === 'finance_applications' || activeSubTab === 'applications') {
          return <LoanApplicationsPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_register' || activeSubTab === 'register') {
          return <LoanRegisterPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_disbursement' || activeSubTab === 'disbursement') {
          return <DisbursementsPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_collections' || activeSubTab === 'collections') {
          return <LoanCollectionsPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_topup' || activeSubTab === 'topup') {
          return <LoanTopUpsPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_npa' || activeSubTab === 'npa') {
          return <LoanNPAPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_closure' || activeSubTab === 'closure') {
          return <LoanClosurePage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'finance_new_loan' || activeSubTab === 'new_loan') {
          return <NewLoanScreen onClose={() => handleNavigate('finance', 'finance_applications')} />;
        }
        return <FinanceOverviewPage onNavigate={handleNavigate} />;

      case 'chit':
        if (activeSubTab === 'chit_groups' || activeSubTab === 'groups') {
          return <ChitGroupsPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'chit_schemes' || activeSubTab === 'schemes') {
          return <ChitSchemesPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'chit_members' || activeSubTab === 'members') {
          return <ChitMembersPage onNavigate={handleNavigate} />;
        }
        if (activeSubTab === 'chit_auctions' || activeSubTab === 'auctions') {
          return <ChitAuctionsPage onNavigate={handleNavigate} />;
        }
        return <ChitOverviewPage onNavigate={handleNavigate} />;

      case 'rental':
        return <RentalManagementPage initialSubTab={activeSubTab} onNavigate={handleNavigate} />;

      case 'expense':
        return <ExpensePage initialSubTab={activeSubTab} onNavigate={handleNavigate} />;

      case 'investment':
        return <InvestmentPage initialSubTab={activeSubTab} onNavigate={handleNavigate} />;

      case 'receivables_payables':
        return <ReceivablesPayablesPage initialSubTab={activeSubTab} onNavigate={handleNavigate} />;

      case 'profiles':
        return <ProfileDirectoryPage />;

      case 'calendar':
        return <CalendarPage />;

      case 'documents':
        return <DocumentRepositoryPage />;

      case 'reports':
        return <ReportsPage />;

      case 'audit_logs':
        return <AuditLogPage />;

      case 'master_data':
        return <MasterDataPage />;

      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      activeSubTab={activeSubTab}
      onSelectTab={handleNavigate}
    >
      {renderActiveView()}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ERPProvider>
      <AppContent />
    </ERPProvider>
  );
};

export default App;
