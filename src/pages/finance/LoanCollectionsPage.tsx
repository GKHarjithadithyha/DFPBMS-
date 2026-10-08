import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { Loan, PaymentMode } from '../../types';
import { formatCurrency, calculateMonthlyInterest } from '../../utils/formatters';
import { Receipt, Coins, TrendingUp, CheckCircle2 } from 'lucide-react';

interface LoanCollectionsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanCollectionsPage: React.FC<LoanCollectionsPageProps> = ({ onNavigate }) => {
  const { loans, getProfileById, collectLoanPayment, userRole } = useERP();

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form states
  const [colPrincipal, setColPrincipal] = useState('');
  const [colOfficialInt, setColOfficialInt] = useState('');
  const [colNonAccountedInt, setColNonAccountedInt] = useState('');
  const [colPenalty, setColPenalty] = useState('');
  const [colMode, setColMode] = useState<PaymentMode>('cash');
  const [colBankId, setColBankId] = useState<string>('BA-01');
  const [colRemarks, setColRemarks] = useState('');

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'npa');

  const totalActivePrincipal = activeLoans.reduce((acc, l) => acc + l.pendingPrincipal, 0);
  const totalMonthlyOfficialInterest = activeLoans.reduce(
    (acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.officialInterestRate),
    0
  );
  const totalMonthlyNonAccountedInterest = activeLoans.reduce(
    (acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.nonAccountedInterestRate),
    0
  );

  const handleOpenCollectModal = (loan: Loan) => {
    setSelectedLoan(loan);
    const offInt = calculateMonthlyInterest(loan.pendingPrincipal, loan.officialInterestRate);
    const nonOffInt = calculateMonthlyInterest(loan.pendingPrincipal, loan.nonAccountedInterestRate);
    setColPrincipal('0');
    setColOfficialInt(offInt.toString());
    setColNonAccountedInt(nonOffInt.toString());
    setColPenalty('0');
    setColRemarks('Regular monthly interest collection');
    setIsCollectModalOpen(true);
  };

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const p = Number(colPrincipal) || 0;
    const offInt = Number(colOfficialInt) || 0;
    const nonOffInt = Number(colNonAccountedInt) || 0;
    const pen = Number(colPenalty) || 0;

    const borrower = getProfileById(selectedLoan.profileId);

    const receiptNum = collectLoanPayment(selectedLoan.id, {
      principal: p,
      officialInterest: offInt,
      nonAccountedInterest: nonOffInt,
      penalty: pen,
      otherCharges: 0,
      mode: colMode,
      bankAccountId: colMode === 'bank' ? colBankId : undefined,
      remarks: colRemarks,
    });

    setReceiptData({
      receiptNumber: receiptNum,
      date: new Date().toISOString().slice(0, 10),
      customerName: borrower?.name || 'Borrower',
      profileId: borrower?.id,
      moduleName: 'Finance (Lending) Module',
      sourceRecordId: selectedLoan.id,
      totalAmount: p + offInt + nonOffInt + pen,
      paymentMode: colMode.toUpperCase(),
      collectedBy: userRole === 'admin' ? 'Administrator' : 'Employee',
      allocations: [
        { label: 'Principal Reduction', amount: p },
        { label: 'Official Interest (Accounted)', amount: offInt },
        { label: 'Operational Interest (Non-Accounted)', amount: nonOffInt },
        { label: 'Overdue Penalty', amount: pen },
      ].filter(a => a.amount > 0),
      remarks: colRemarks,
    });

    setIsCollectModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Collections & Payment Entry"
        subtitle="Record monthly interest collections, principal repayments, dual interest streams, and issue official CTE receipts."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Collections' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Loan Principal"
          value={formatCurrency(totalActivePrincipal)}
          subtitle={`${activeLoans.length} active collection accounts`}
          icon={Coins}
          variant="emerald"
        />
        <StatCard
          title="Monthly Official Due"
          value={formatCurrency(totalMonthlyOfficialInterest)}
          subtitle="Accounted interest stream"
          icon={TrendingUp}
          variant="blue"
        />
        <StatCard
          title="Monthly Non-Accounted Due"
          value={formatCurrency(totalMonthlyNonAccountedInterest)}
          subtitle="Parallel operational stream"
          icon={Receipt}
          variant="purple"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Accounts Pending Collection</h3>
            <p className="text-xs text-slate-500">Select an account to collect interest/principal repayments</p>
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
                <th className="p-3">Pending Principal</th>
                <th className="p-3">Official Monthly Int</th>
                <th className="p-3">Non-Acc Monthly Int</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {activeLoans.map((l) => {
                const borrower = getProfileById(l.profileId);
                const offDue = calculateMonthlyInterest(l.pendingPrincipal, l.officialInterestRate);
                const nonOffDue = calculateMonthlyInterest(l.pendingPrincipal, l.nonAccountedInterestRate);

                return (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{borrower?.name || 'Borrower'}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(l.pendingPrincipal)}</td>
                    <td className="p-3 font-mono font-semibold text-blue-700">{formatCurrency(offDue)} ({l.officialInterestRate}%)</td>
                    <td className="p-3 font-mono font-semibold text-purple-700">{formatCurrency(nonOffDue)} ({l.nonAccountedInterestRate}%)</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenCollectModal(l)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        Collect Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title={`Record Loan Collection for ${selectedLoan?.id || ''}`}
      >
        {selectedLoan && (
          <form onSubmit={handleCollectionSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{getProfileById(selectedLoan.profileId)?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Current Pending Principal:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(selectedLoan.pendingPrincipal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Payment (₹)</label>
                <input
                  type="number"
                  value={colPrincipal}
                  onChange={(e) => setColPrincipal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">Official Interest (Accounted)</label>
                <input
                  type="number"
                  value={colOfficialInt}
                  onChange={(e) => setColOfficialInt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">Non-Accounted Interest</label>
                <input
                  type="number"
                  value={colNonAccountedInt}
                  onChange={(e) => setColNonAccountedInt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">Penalty / Late Fee (₹)</label>
                <input
                  type="number"
                  value={colPenalty}
                  onChange={(e) => setColPenalty(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-rose-200 rounded-xl font-mono focus:ring-2 focus:ring-rose-500"
                  placeholder="0"
                />
              </div>
            </div>

            <CashBankSelector
              mode={colMode}
              bankAccountId={colBankId}
              onModeChange={setColMode}
              onBankAccountChange={setColBankId}
              label="Select Receiving Cash/Bank Account"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
              <input
                type="text"
                value={colRemarks}
                onChange={(e) => setColRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Submit Collection & Print Receipt
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CTE Receipt Printable Modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};
