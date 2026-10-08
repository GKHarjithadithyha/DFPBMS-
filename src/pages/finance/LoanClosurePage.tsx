import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Loan } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Archive, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoanClosurePageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanClosurePage: React.FC<LoanClosurePageProps> = ({ onNavigate }) => {
  const { loans, getProfileById, closeLoan } = useERP();

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'npa');
  const closedLoans = loans.filter(l => l.status === 'closed');

  const handleOpenCloseModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    if (!selectedLoan) return;
    closeLoan(selectedLoan.id);
    setIsConfirmOpen(false);
    setSelectedLoan(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Account Closure & Settlement"
        subtitle="Formal loan closure, principal settlement verification, and collateral document return."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Loan Closure' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Closed Accounts"
          value={closedLoans.length}
          subtitle="Fully settled credit accounts"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Active Accounts Eligible for Closure"
          value={activeLoans.filter(l => l.pendingPrincipal === 0).length}
          subtitle="Zero principal balance accounts"
          icon={ShieldCheck}
          variant="blue"
        />
        <StatCard
          title="Active Loans Remaining"
          value={activeLoans.length}
          subtitle="Open loans on ledger"
          icon={Archive}
          variant="purple"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Loans Settlement Register</h3>
            <p className="text-xs text-slate-500">Initiate formal closure upon full principal repayment</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Original Principal</th>
                <th className="p-3">Pending Balance</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {activeLoans.map((l) => {
                const borrower = getProfileById(l.profileId);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{borrower?.name || 'Borrower'}</td>
                    <td className="p-3 font-mono">{formatCurrency(l.principalAmount)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(l.pendingPrincipal)}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenCloseModal(l)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs"
                      >
                        Close Loan Account
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Closed Loan Archives
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Original Principal</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {closedLoans.map((l) => {
                const borrower = getProfileById(l.profileId);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{borrower?.name || 'Borrower'}</td>
                    <td className="p-3 font-mono">{formatCurrency(l.principalAmount)}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmClose}
        title={`Confirm Final Loan Closure (${selectedLoan?.id || ''})`}
        message="Are you sure you want to close this loan account? The status will be permanently changed to Closed."
        confirmText="Confirm & Close Loan"
      />
    </div>
  );
};
