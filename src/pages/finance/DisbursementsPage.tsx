import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { Loan, PaymentMode } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreditCard, CheckCircle2, Banknote, ShieldAlert } from 'lucide-react';

interface DisbursementsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const DisbursementsPage: React.FC<DisbursementsPageProps> = ({ onNavigate }) => {
  const { loans, getProfileById, disburseLoan } = useERP();

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank');
  const [bankAccountId, setBankAccountId] = useState('BA-01');

  // Sanctioned loans ready for disbursement
  const sanctionedLoans = loans.filter(l => l.status === 'sanctioned');
  const disbursedLoans = loans.filter(l => l.status === 'active' || l.status === 'npa' || l.status === 'closed');

  const totalSanctionedAmount = sanctionedLoans.reduce((acc, l) => acc + l.principalAmount, 0);

  const handleOpenDisburseModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDisburseModalOpen(true);
  };

  const handleDisburseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    disburseLoan(selectedLoan.id, paymentMode, paymentMode === 'bank' ? bankAccountId : undefined);
    setIsDisburseModalOpen(false);
    setSelectedLoan(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Disbursement Register"
        subtitle="Process fund disbursements for sanctioned loan applications via Central Cash or Bank accounts."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Disbursements' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Sanctioned Pending Disbursement"
          value={formatCurrency(totalSanctionedAmount)}
          subtitle={`${sanctionedLoans.length} approved loans pending payout`}
          icon={Banknote}
          variant="amber"
        />
        <StatCard
          title="Total Disbursed Accounts"
          value={disbursedLoans.length}
          subtitle="Capital released to borrowers"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Average Disbursement"
          value={formatCurrency(sanctionedLoans.length ? totalSanctionedAmount / sanctionedLoans.length : 0)}
          subtitle="Mean ticket size ready for payout"
          icon={CreditCard}
          variant="blue"
        />
      </div>

      {/* Sanctioned Loans - Action Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Loans Ready For Disbursement</h3>
            <p className="text-xs text-slate-500">Applications approved by Credit Admin awaiting fund release</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-mono">
            {sanctionedLoans.length} Pending Payout
          </span>
        </div>

        {sanctionedLoans.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Pending Disbursements</p>
            <p className="text-[11px] text-slate-400 mt-1">All sanctioned loan applications have been disbursed to borrowers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Loan ID</th>
                  <th className="p-3">Borrower</th>
                  <th className="p-3">Principal Amount</th>
                  <th className="p-3">Approved Rates</th>
                  <th className="p-3">Application Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sanctionedLoans.map((l) => {
                  const borrower = getProfileById(l.profileId);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{borrower?.name || 'Unknown Borrower'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{borrower?.id}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(l.principalAmount)}</td>
                      <td className="p-3 font-mono">
                        <span className="text-blue-700 font-semibold">{l.officialInterestRate}%</span> + <span className="text-purple-700 font-semibold">{l.nonAccountedInterestRate}%</span>
                      </td>
                      <td className="p-3 text-slate-500">{formatDate(l.createdAt)}</td>
                      <td className="p-3"><StatusBadge status={l.status} /></td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDisburseModal(l)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                        >
                          Disburse Funds
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disbursed History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Recent Disbursed Loan History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Loan ID</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Disbursed Principal</th>
                <th className="p-3">Disbursement Date</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {disbursedLoans.slice(0, 10).map((l) => {
                const borrower = getProfileById(l.profileId);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{borrower?.name || 'Borrower'}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(l.principalAmount)}</td>
                    <td className="p-3 text-slate-500">{l.disbursementDate ? formatDate(l.disbursementDate) : 'Disbursed'}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement Modal */}
      <Modal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
        title={`Disburse Funds for ${selectedLoan?.id || ''}`}
      >
        {selectedLoan && (
          <form onSubmit={handleDisburseSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{getProfileById(selectedLoan.profileId)?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Sanctioned Principal:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(selectedLoan.principalAmount)}</span>
              </div>
            </div>

            <CashBankSelector
              mode={paymentMode}
              bankAccountId={bankAccountId}
              onModeChange={setPaymentMode}
              onBankAccountChange={setBankAccountId}
              label="Select Disbursement Source Account"
            />

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Disbursing will immediately debit the selected bank/cash ledger and transition loan status to <strong>Active</strong>.
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Confirm & Disburse Payout
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
