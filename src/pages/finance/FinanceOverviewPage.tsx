import React from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, calculateMonthlyInterest } from '../../utils/formatters';
import {
  CreditCard,
  Plus,
  TrendingUp,
  Coins,
  Clock,
} from 'lucide-react';

interface FinanceOverviewPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const FinanceOverviewPage: React.FC<FinanceOverviewPageProps> = ({ onNavigate }) => {
  const { loans, getProfileById } = useERP();

  const activeLoans = loans.filter(l => l.status === 'active');
  const pendingApps = loans.filter(l => l.status === 'pending_approval');
  const totalActivePrincipal = loans.filter(l => l.status === 'active' || l.status === 'npa').reduce((acc, l) => acc + l.pendingPrincipal, 0);
  const totalAccountedYield = loans.filter(l => l.status === 'active').reduce((acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.officialInterestRate), 0);
  const totalNonAccountedYield = loans.filter(l => l.status === 'active').reduce((acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.nonAccountedInterestRate), 0);

  const handleNewLoanClick = () => {
    if (onNavigate) {
      onNavigate('finance', 'finance_new_loan');
    } else {
      window.location.hash = 'finance/finance_new_loan';
    }
  };

  const handleViewRegister = (loanId: string) => {
    if (onNavigate) {
      onNavigate('finance', 'finance_register');
    } else {
      window.location.hash = 'finance/finance_register';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Lending Overview"
        subtitle="Executive summary of active portfolio principal, dual-stream interest yields, and loan origination pipeline."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Overview' }]}
        actions={
          <button
            type="button"
            onClick={handleNewLoanClick}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan Application</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Principal"
          value={formatCurrency(totalActivePrincipal)}
          subtitle={`${activeLoans.length} active loan accounts`}
          icon={CreditCard}
          variant="emerald"
        />
        <StatCard
          title="Monthly Accounted Yield"
          value={formatCurrency(totalAccountedYield)}
          subtitle="Official ledger interest"
          icon={TrendingUp}
          variant="blue"
        />
        <StatCard
          title="Non-Accounted Yield"
          value={formatCurrency(totalNonAccountedYield)}
          subtitle="Parallel operational stream"
          icon={Coins}
          variant="purple"
        />
        <StatCard
          title="Pending Applications"
          value={pendingApps.length}
          subtitle="Awaiting sanction approval"
          icon={Clock}
          variant="amber"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Loan Portfolio Summary</h3>
            <p className="text-xs text-slate-500">Live records from Central Transaction Engine</p>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
            {loans.length} Total Loans
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Pending Principal</th>
                <th className="p-3">Dual Rates (Official / Non-Acc)</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loans.slice(0, 8).map((l) => {
                const p = getProfileById(l.profileId);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-medium text-slate-900">{p?.name || 'Unknown Party'}</td>
                    <td className="p-3 font-mono font-semibold">{formatCurrency(l.pendingPrincipal)}</td>
                    <td className="p-3 font-mono">
                      <span className="text-blue-700 font-bold">{l.officialInterestRate}%</span> + <span className="text-purple-700 font-bold">{l.nonAccountedInterestRate}%</span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewRegister(l.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                      >
                        View Workspace
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
