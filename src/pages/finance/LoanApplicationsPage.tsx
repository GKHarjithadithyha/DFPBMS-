import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PrintableLoanApplicationModal } from '../../components/finance/PrintableLoanApplicationModal';
import { formatCurrency } from '../../utils/formatters';
import { Loan } from '../../types';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';

interface LoanApplicationsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanApplicationsPage: React.FC<LoanApplicationsPageProps> = ({ onNavigate }) => {
  const { loans, profiles, getProfileById, sanctionLoan, rejectLoan } = useERP();

  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [isSanctionOpen, setIsSanctionOpen] = useState(false);
  const [sanctionRemarks, setSanctionRemarks] = useState('Verified KYC and property documents. Approved.');

  // Print modal state
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printingLoan, setPrintingLoan] = useState<Loan | null>(null);

  const pendingApps = loans.filter(l => l.status === 'pending_approval');
  const activeLoans = loans.filter(l => l.status === 'active');
  const selectedLoan = loans.find(l => l.id === selectedLoanId);
  const borrower = selectedLoan ? getProfileById(selectedLoan.profileId) : undefined;

  const handleNewLoanClick = () => {
    if (onNavigate) {
      onNavigate('finance', 'finance_new_loan');
    } else {
      window.location.hash = 'finance/finance_new_loan';
    }
  };

  const handleOpenPrintModal = (loan: Loan) => {
    setPrintingLoan(loan);
    setIsPrintOpen(true);
  };

  const handleSanctionSubmit = (decision: 'approve' | 'reject') => {
    if (!selectedLoan) return;
    if (decision === 'approve') {
      sanctionLoan(selectedLoan.id, sanctionRemarks);
    } else {
      rejectLoan(selectedLoan.id, sanctionRemarks);
    }
    setIsSanctionOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Applications & Origination Pipeline"
        subtitle="Review loan applications, verify collateral, and perform sanction approval or rejection."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Applications' }]}
        actions={
          <button
            type="button"
            onClick={handleNewLoanClick}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Loan Application</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pending Sanction"
          value={pendingApps.length}
          subtitle="Requires Underwriting Review"
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="Active Loans"
          value={activeLoans.length}
          subtitle="Sanctioned & Disbursed"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Total Applications"
          value={loans.length}
          subtitle="Lifetime applications"
          icon={CreditCard}
          variant="slate"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Applications Register ({pendingApps.length} Pending Approval)
        </h3>

        {pendingApps.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Pending Applications</p>
            <p className="text-xs text-slate-400">All loan applications have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Application ID</th>
                  <th className="p-3">Borrower Name</th>
                  <th className="p-3">Requested Principal</th>
                  <th className="p-3">Dual Stream Rates</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {pendingApps.map((l) => {
                  const p = getProfileById(l.profileId);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                      <td className="p-3 font-medium text-slate-900">{p?.name || 'Borrower'}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(l.principalAmount)}</td>
                      <td className="p-3 font-mono">
                        Off: {l.officialInterestRate}% | Non-Acc: {l.nonAccountedInterestRate}%
                      </td>
                      <td className="p-3 capitalize">{l.collectionFrequency}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintModal(l)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Form</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoanId(l.id);
                            setIsSanctionOpen(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                        >
                          Sanction / Review
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

      {/* Sanction Modal */}
      <Modal
        isOpen={isSanctionOpen}
        onClose={() => setIsSanctionOpen(false)}
        title="Underwrite & Sanction Loan"
        subtitle={`Underwriting review and sanction approval for Loan ID ${selectedLoan?.id}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-medium">Borrower:</span>
              <p className="font-bold text-slate-900">{borrower?.name} — {formatCurrency(selectedLoan?.principalAmount || 0)}</p>
            </div>
            {selectedLoan && (
              <button
                type="button"
                onClick={() => handleOpenPrintModal(selectedLoan)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Application</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Underwriter Remarks / Conditions</label>
            <textarea
              rows={3}
              value={sanctionRemarks}
              onChange={e => setSanctionRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => handleSanctionSubmit('reject')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Reject Application
            </button>
            <button
              type="button"
              onClick={() => handleSanctionSubmit('approve')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Sanction & Approve
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Paper Loan Application Modal */}
      {printingLoan && (
        <PrintableLoanApplicationModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          loan={printingLoan}
          borrower={getProfileById(printingLoan.profileId)}
          coBorrower={getProfileById(printingLoan.coBorrowerProfileId)}
          guarantor1={getProfileById(printingLoan.guarantor1ProfileId)}
          guarantor2={getProfileById(printingLoan.guarantor2ProfileId)}
          applicationPlace={printingLoan.applicationPlace || 'Bangalore'}
          applicationDate={printingLoan.applicationDate || new Date().toISOString().slice(0, 10)}
        />
      )}
    </div>
  );
};
