import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { Loan, PaymentMode } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ArrowUpCircle, TrendingUp, CreditCard } from 'lucide-react';

interface LoanTopUpsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanTopUpsPage: React.FC<LoanTopUpsPageProps> = ({ onNavigate }) => {
  const { loans, getProfileById, topUpLoan } = useERP();

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50000');
  const [topUpMode, setTopUpMode] = useState<PaymentMode>('bank');
  const [topUpBankId, setTopUpBankId] = useState<string>('BA-01');
  const [topUpRemarks, setTopUpRemarks] = useState('Additional principal sanctioned for shop expansion');

  const activeLoans = loans.filter(l => l.status === 'active');

  const handleOpenTopUpModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsTopUpModalOpen(true);
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    topUpLoan(selectedLoan.id, Number(topUpAmount), topUpMode, topUpMode === 'bank' ? topUpBankId : undefined, topUpRemarks);
    setIsTopUpModalOpen(false);
    setSelectedLoan(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Top-Up & Principal Capital Injection"
        subtitle="Sanction and release additional principal loans for existing active credit accounts with updated collateral terms."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Top-Up' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Accounts Eligible"
          value={activeLoans.length}
          subtitle="Qualified accounts for top-up"
          icon={CreditCard}
          variant="emerald"
        />
        <StatCard
          title="Total Active Principal"
          value={formatCurrency(activeLoans.reduce((acc, l) => acc + l.pendingPrincipal, 0))}
          subtitle="Current active credit balance"
          icon={TrendingUp}
          variant="blue"
        />
        <StatCard
          title="Top-Up Action"
          value="Instant Payout"
          subtitle="Central Cash/Bank Ledger update"
          icon={ArrowUpCircle}
          variant="purple"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Loan Accounts Directory</h3>
            <p className="text-xs text-slate-500">Select an account to add top-up principal</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            {activeLoans.length} Active Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Original Principal</th>
                <th className="p-3">Current Pending Principal</th>
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
                        onClick={() => handleOpenTopUpModal(l)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs inline-flex items-center space-x-1"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Sanction Top-Up</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Up Modal */}
      <Modal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        title={`Sanction Top-Up for ${selectedLoan?.id || ''}`}
      >
        {selectedLoan && (
          <form onSubmit={handleTopUpSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{getProfileById(selectedLoan.profileId)?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Current Pending Principal:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedLoan.pendingPrincipal)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Top-Up Amount (₹)</label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <CashBankSelector
              mode={topUpMode}
              bankAccountId={topUpBankId}
              onModeChange={setTopUpMode}
              onBankAccountChange={setTopUpBankId}
              label="Select Payout Account"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
              <input
                type="text"
                value={topUpRemarks}
                onChange={(e) => setTopUpRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Confirm & Disburse Top-Up
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
