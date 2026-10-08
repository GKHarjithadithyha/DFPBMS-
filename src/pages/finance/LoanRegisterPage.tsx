import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { PaymentMode, CollectionScheduleItem } from '../../types';
import { formatCurrency, calculateMonthlyInterest } from '../../utils/formatters';
import {
  Plus,
  Receipt,
  ArrowUpCircle,
  Archive,
  Shield,
  Calendar,
} from 'lucide-react';

import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Tabs } from '../../components/common/Tabs';
import { CollectionScheduleTable } from '../../components/finance/CollectionScheduleTable';

interface LoanRegisterPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanRegisterPage: React.FC<LoanRegisterPageProps> = ({ onNavigate }) => {
  const {
    loans,
    userRole,
    getProfileById,
    sanctionLoan,
    disburseLoan,
    collectLoanPayment,
    topUpLoan,
    closeLoan,
  } = useERP();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'schedule' | 'ledger' | 'overview' | 'timeline' | 'documents'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

  // Modals state
  const [isSanctionOpen, setIsSanctionOpen] = useState(false);
  const [isDisbursementOpen, setIsDisbursementOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form states
  const [sanctionRemarks, setSanctionRemarks] = useState('Verified KYC and property documents. Approved.');
  const [disburseMode, setDisburseMode] = useState<PaymentMode>('bank');
  const [disburseBankId, setDisburseBankId] = useState<string>('BA-01');

  // Collection
  const [colPrincipal, setColPrincipal] = useState('');
  const [colOfficialInt, setColOfficialInt] = useState('');
  const [colNonAccountedInt, setColNonAccountedInt] = useState('');
  const [colPenalty, setColPenalty] = useState('');
  const [colMode, setColMode] = useState<PaymentMode>('cash');
  const [colBankId, setColBankId] = useState<string>('BA-01');
  const [colRemarks, setColRemarks] = useState('');

  // Top-Up
  const [topUpAmount, setTopUpAmount] = useState('50000');
  const [topUpMode, setTopUpMode] = useState<PaymentMode>('bank');
  const [topUpBankId, setTopUpBankId] = useState<string>('BA-01');
  const [topUpRemarks, setTopUpRemarks] = useState('Additional principal sanctioned for shop inventory');

  const selectedLoan = loans.find(l => l.id === selectedLoanId) || loans[0];
  const borrower = selectedLoan ? getProfileById(selectedLoan.profileId) : undefined;
  const guarantor1 = selectedLoan ? getProfileById(selectedLoan.guarantor1ProfileId) : undefined;
  const guarantor2 = selectedLoan ? getProfileById(selectedLoan.guarantor2ProfileId) : undefined;

  const filteredLoans = loans.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const p = getProfileById(l.profileId);
      const matchId = l.id.toLowerCase().includes(q);
      const matchName = p?.name.toLowerCase().includes(q);
      return matchId || matchName;
    }
    return true;
  });

  const monthlyOfficialInterestDue = selectedLoan
    ? calculateMonthlyInterest(selectedLoan.pendingPrincipal, selectedLoan.officialInterestRate)
    : 0;

  const monthlyNonAccountedInterestDue = selectedLoan
    ? calculateMonthlyInterest(selectedLoan.pendingPrincipal, selectedLoan.nonAccountedInterestRate)
    : 0;

  // Dynamic Collection Schedule for selectedLoan
  const [selectedLoanSchedule, setSelectedLoanSchedule] = useState<CollectionScheduleItem[]>([]);

  useEffect(() => {
    if (!selectedLoan) {
      setSelectedLoanSchedule([]);
      return;
    }

    const numCycles = selectedLoan.collectionFrequency === 'monthly' ? 12 : 10;
    const basePrincipal = selectedLoan.pendingPrincipal || selectedLoan.principalAmount || 100000;
    const principalPerCycle = Math.round(basePrincipal / numCycles);
    const officialRate = selectedLoan.officialInterestRate || 0;
    const operationalRate = selectedLoan.nonAccountedInterestRate || 0;

    let cycleOfficialInterest = 0;
    let cycleOperationalInterest = 0;

    if (selectedLoan.collectionFrequency === 'monthly') {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRate / 100)) / 12);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRate / 100)) / 12);
    } else if (selectedLoan.collectionFrequency === 'weekly') {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRate / 100)) / 52);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRate / 100)) / 52);
    } else {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRate / 100)) / 365);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRate / 100)) / 365);
    }

    const cycleTotalInterest = cycleOfficialInterest + cycleOperationalInterest;
    const pen = selectedLoan.manualPenalty || 0;
    const startDate = selectedLoan.firstCollectionDate ? new Date(selectedLoan.firstCollectionDate) : new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sched: CollectionScheduleItem[] = [];
    for (let i = 1; i <= numCycles; i++) {
      const d = new Date(startDate);
      if (selectedLoan.collectionFrequency === 'monthly') {
        d.setMonth(d.getMonth() + (i - 1));
      } else if (selectedLoan.collectionFrequency === 'weekly') {
        d.setDate(d.getDate() + (i - 1) * 7);
      } else {
        d.setDate(d.getDate() + (i - 1));
      }

      const dueDateStr = d.toISOString().slice(0, 10);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const isPast = due.getTime() < today.getTime();
      const overdueDays = isPast ? Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const isLast = i === numCycles;
      const prin = isLast ? Math.max(0, basePrincipal - principalPerCycle * (numCycles - 1)) : principalPerCycle;
      const cyclePen = i === 1 ? pen : 0;
      const totalDue = Math.round(prin + cycleTotalInterest + cyclePen);

      let status: CollectionScheduleItem['status'] = 'PENDING';
      let amountPaid = 0;
      if (i === 1 && selectedLoan.totalPrincipalCollected > 0) {
        amountPaid = totalDue;
        status = 'PAID';
      } else if (amountPaid > 0 && amountPaid < totalDue) {
        status = 'PARTIAL';
      } else if (overdueDays > 0) {
        status = 'OVERDUE';
      } else {
        status = 'PENDING';
      }

      const bal = Math.max(0, totalDue - amountPaid);

      sched.push({
        installmentNumber: i,
        dueDate: dueDateStr,
        principal: prin,
        interest: cycleTotalInterest,
        officialInterest: cycleOfficialInterest,
        operationalInterest: cycleOperationalInterest,
        penalty: cyclePen,
        totalDue,
        amountPaid,
        balance: bal,
        status,
        overdueDays,
      });
    }

    setSelectedLoanSchedule(sched);
  }, [selectedLoan]);

  const handleNewLoanClick = () => {
    if (onNavigate) {
      onNavigate('finance', 'finance_new_loan');
    } else {
      window.location.hash = 'finance/finance_new_loan';
    }
  };

  const handleDisbursementSubmit = () => {
    if (!selectedLoan) return;
    disburseLoan(selectedLoan.id, disburseMode, disburseBankId);
    setIsDisbursementOpen(false);
  };

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const p = Number(colPrincipal) || 0;
    const offInt = Number(colOfficialInt) || 0;
    const nonOffInt = Number(colNonAccountedInt) || 0;
    const pen = Number(colPenalty) || 0;

    const receiptNum = collectLoanPayment(selectedLoan.id, {
      principal: p,
      officialInterest: offInt,
      nonAccountedInterest: nonOffInt,
      penalty: pen,
      otherCharges: 0,
      mode: colMode,
      bankAccountId: colBankId,
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

    setIsCollectionOpen(false);
    setColPrincipal('');
    setColOfficialInt('');
    setColNonAccountedInt('');
    setColPenalty('');
    setColRemarks('');
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    topUpLoan(selectedLoan.id, Number(topUpAmount), topUpMode, topUpBankId, topUpRemarks);
    setIsTopUpOpen(false);
  };

  const handleConfirmCloseSubmit = () => {
    if (!selectedLoan) return;
    closeLoan(selectedLoan.id);
    setIsConfirmCloseOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Loan Register & Repayment Workspace"
        subtitle="Full loan lifecycle: onboarding, sanction, disbursement, dual-stream interest recalculation on pending principal, top-up, and closure."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Loan Register' }]}
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

      {/* Main Workspace Layout (Left: Directory, Right: Lifecycle Workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Customer / Loan Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Loans Directory ({filteredLoans.length})
              </span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-[11px] border border-slate-300 rounded-lg px-2 py-0.5 bg-white text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="npa">NPA (&gt;90 Days)</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Search loan ID or customer name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredLoans.map(loan => {
              const p = getProfileById(loan.profileId);
              const isSelected = loan.id === selectedLoanId;

              return (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoanId(loan.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/60 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">{loan.id}</span>
                    <StatusBadge status={loan.status} />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">{p?.name || 'Customer'}</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {formatCurrency(loan.pendingPrincipal)}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Rate: {loan.officialInterestRate}% + {loan.nonAccountedInterestRate}%</span>
                    <span className="capitalize text-slate-400">{loan.collectionFrequency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Loan Lifecycle & Repayment Workspace */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {selectedLoan ? (
            <>
              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-slate-900 font-mono">{selectedLoan.id}</h2>
                    <StatusBadge status={selectedLoan.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Borrower: <span className="font-semibold text-slate-800">{borrower?.name}</span> ({borrower?.mobile || borrower?.primaryPhone})
                  </p>
                </div>

                {/* Lifecycle Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedLoan.status === 'pending_approval' && (
                    <button
                      type="button"
                      onClick={() => setIsSanctionOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Sanction / Underwrite
                    </button>
                  )}

                  {selectedLoan.status === 'pending_approval' && (
                    <button
                      type="button"
                      onClick={() => setIsDisbursementOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Disburse Funds
                    </button>
                  )}

                  {selectedLoan.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setColPrincipal('0');
                          setColOfficialInt(String(monthlyOfficialInterestDue));
                          setColNonAccountedInt(String(monthlyNonAccountedInterestDue));
                          setIsCollectionOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Collect Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsTopUpOpen(true)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Top-Up</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsConfirmCloseOpen(true)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Close Loan</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Loan Financial Summary Cards */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Pending Principal</span>
                    <p className="text-base font-bold font-mono text-slate-900">{formatCurrency(selectedLoan.pendingPrincipal)}</p>
                    <span className="text-[10px] text-slate-400">
                      Applied: {formatCurrency(selectedLoan.principalAmount)}
                      {selectedLoan.deductedAmount ? ` (Ded: ${formatCurrency(selectedLoan.deductedAmount)})` : ''}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1">
                    <span className="text-xs text-blue-700 font-medium">Official Interest</span>
                    <p className="text-base font-bold font-mono text-blue-900">{formatCurrency(monthlyOfficialInterestDue)} / mo</p>
                    <span className="text-[10px] text-blue-600 font-mono">Rate: {selectedLoan.officialInterestRate}% p.a.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1">
                    <span className="text-xs text-amber-700 font-medium">Operational Interest</span>
                    <p className="text-base font-bold font-mono text-amber-900">{formatCurrency(monthlyNonAccountedInterestDue)} / mo</p>
                    <span className="text-[10px] text-amber-600 font-mono">Rate: {selectedLoan.nonAccountedInterestRate}% p.a.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-1">
                    <span className="text-xs text-purple-700 font-medium">Pledged Collateral</span>
                    <p className="text-xs font-semibold text-purple-950 truncate" title={selectedLoan.collateralDetails}>
                      {selectedLoan.collateralDetails}
                    </p>
                    <span className="text-[10px] text-purple-600 font-mono capitalize">
                      Freq: {selectedLoan.collectionFrequency}
                    </span>
                  </div>
                </div>

                {/* Sub-tabs: Collection Schedule and Repayment Ledger */}
                <Tabs
                  tabs={[
                    { id: 'schedule', label: 'Collection Schedule' },
                    { id: 'ledger', label: 'Repayment Ledger' },
                  ]}
                  activeTab={activeTab === 'ledger' ? 'ledger' : 'schedule'}
                  onChange={(tab) => setActiveTab(tab as any)}
                />

                {(activeTab === 'schedule' || activeTab === 'overview' || activeTab === 'timeline') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Active Collection Schedule
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        First Due Date: <strong>{selectedLoan.firstCollectionDate || '—'}</strong>
                      </span>
                    </div>

                    <CollectionScheduleTable
                      schedule={selectedLoanSchedule}
                      onUpdateSchedule={setSelectedLoanSchedule}
                    />
                  </div>
                )}

                {activeTab === 'ledger' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Repayment & Transaction History</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Principal Red.</th>
                            <th className="p-2.5">Official Int</th>
                            <th className="p-2.5">Non-Acc Int</th>
                            <th className="p-2.5">Penalty</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Receipt #</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          <tr>
                            <td colSpan={7} className="p-5 text-center text-slate-400 text-xs">
                              No repayments recorded yet for this loan account.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a loan account from the directory on the left.
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Sanction Modal */}
      <Modal
        isOpen={isSanctionOpen}
        onClose={() => setIsSanctionOpen(false)}
        title="Underwrite & Sanction Loan"
        subtitle={`Rule BR-005: Dual approval workflow for Loan ID ${selectedLoan?.id}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium">Borrower:</span>
            <p className="font-bold text-slate-900">{borrower?.name} — {formatCurrency(selectedLoan?.principalAmount || 0)}</p>
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
              onClick={() => {
                if (selectedLoan) sanctionLoan(selectedLoan.id, sanctionRemarks);
                setIsSanctionOpen(false);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Sanction & Approve
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Disbursement Modal */}
      <Modal
        isOpen={isDisbursementOpen}
        onClose={() => setIsDisbursementOpen(false)}
        title="Disburse Loan Funds"
        subtitle={`Rule BR-006: Transfer principal amount ${formatCurrency(selectedLoan?.principalAmount || 0)} to borrower.`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <CashBankSelector
            mode={disburseMode}
            onModeChange={setDisburseMode}
            selectedBankAccountId={disburseBankId}
            onBankChange={setDisburseBankId}
          />

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsDisbursementOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDisbursementSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Confirm Disbursement
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Collection Modal */}
      <Modal
        isOpen={isCollectionOpen}
        onClose={() => setIsCollectionOpen(false)}
        title="Record Loan Repayment"
        subtitle={`Rule BR-010: Collect interest and/or principal reduction for Loan ${selectedLoan?.id}`}
        maxWidth="lg"
      >
        <form onSubmit={handleCollectionSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Principal Reduction (₹)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={colPrincipal}
                onChange={e => setColPrincipal(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>

            <div>
              <label className="block text-blue-900 font-semibold mb-1">Official Interest (Accounted) (₹)</label>
              <input
                type="number"
                value={colOfficialInt}
                onChange={e => setColOfficialInt(e.target.value)}
                className="w-full border border-blue-300 rounded-lg p-2 font-mono bg-blue-50/20"
              />
            </div>

            <div>
              <label className="block text-purple-900 font-semibold mb-1">Non-Accounted Interest (₹)</label>
              <input
                type="number"
                value={colNonAccountedInt}
                onChange={e => setColNonAccountedInt(e.target.value)}
                className="w-full border border-purple-300 rounded-lg p-2 font-mono bg-purple-50/20"
              />
            </div>

            <div>
              <label className="block text-rose-900 font-semibold mb-1">Penalty / Late Fee (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={colPenalty}
                onChange={e => setColPenalty(e.target.value)}
                className="w-full border border-rose-300 rounded-lg p-2 font-mono bg-rose-50/20"
              />
            </div>
          </div>

          <CashBankSelector
            mode={colMode}
            onModeChange={setColMode}
            selectedBankAccountId={colBankId}
            onBankChange={setColBankId}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCollectionOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Submit & Print Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Top-Up Modal */}
      <Modal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        title="Top-Up Loan (Additional Principal)"
        subtitle={`Rule BR-012: Additional principal added under SAME Loan ID ${selectedLoan?.id}`}
        maxWidth="lg"
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Additional Principal Amount (₹) *</label>
            <input
              type="number"
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
              required
            />
          </div>

          <CashBankSelector
            mode={topUpMode}
            onModeChange={setTopUpMode}
            selectedBankAccountId={topUpBankId}
            onBankChange={setTopUpBankId}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTopUpOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Confirm Top-Up Disbursement
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Loan Closure Dialog */}
      <ConfirmDialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={handleConfirmCloseSubmit}
        title="Confirm Formal Loan Closure"
        description={`Are you sure you want to officially CLOSE loan ${selectedLoan?.id}?`}
        variant="warning"
      />

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />
    </div>
  );
};
