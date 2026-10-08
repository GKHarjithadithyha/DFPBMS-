import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { Loan, PaymentMode } from '../../types';
import { formatCurrency, formatDate, formatDateTime, calculateMonthlyInterest } from '../../utils/formatters';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  XCircle,
  Banknote,
  Receipt,
  ArrowUpCircle,
  Archive,
  User,
  Shield,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  AlertTriangle,
  Info,
  TrendingUp,
  Coins,
  Download,
  Search,
} from 'lucide-react';

import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Tabs } from '../../components/common/Tabs';
import { NewLoanScreen } from './NewLoanScreen';

interface LoanWorkspacePageProps {
  initialSubTab?: string;
}

export const LoanWorkspacePage: React.FC<LoanWorkspacePageProps> = ({ initialSubTab }) => {
  const {
    loans,
    profiles,
    userRole,
    getProfileById,
    createLoanApplication,
    sanctionLoan,
    rejectLoan,
    disburseLoan,
    collectLoanPayment,
    topUpLoan,
    closeLoan,
  } = useERP();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'timeline' | 'documents'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isOriginationScreen, setIsOriginationScreen] = useState(false);

  // Sync sub-tab state
  React.useEffect(() => {
    if (!initialSubTab) return;
    if (initialSubTab === 'finance_new_loan') {
      setIsOriginationScreen(true);
    } else {
      setIsOriginationScreen(false);
    }
  }, [initialSubTab]);

  // Modals state
  const [isOriginationOpen, setIsOriginationOpen] = useState(false);
  const [isSanctionOpen, setIsSanctionOpen] = useState(false);
  const [isDisbursementOpen, setIsDisbursementOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form states
  const [newBorrowerId, setNewBorrowerId] = useState<string>(profiles[0]?.id || '');
  const [newGuarantor1Id, setNewGuarantor1Id] = useState<string>('');
  const [newGuarantor2Id, setNewGuarantor2Id] = useState<string>('');
  const [newCoBorrowerId, setNewCoBorrowerId] = useState<string>('');
  const [newPrincipal, setNewPrincipal] = useState('300000');
  const [newCollateral, setNewCollateral] = useState('Signed Promissory Note + Title Deed copy');
  const [newRepaymentTerms, setNewRepaymentTerms] = useState('Monthly interest collection on pending balance.');
  const [newOfficialRate, setNewOfficialRate] = useState('12.0');
  const [newNonAccountedRate, setNewNonAccountedRate] = useState('6.0');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Sanction
  const [sanctionRemarks, setSanctionRemarks] = useState('Verified KYC and property documents. Approved.');

  // Disbursement
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
  const coBorrower = selectedLoan ? getProfileById(selectedLoan.coBorrowerProfileId) : undefined;

  // Filtered loan list for directory
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

  // Dynamic calculations for selected loan
  const monthlyOfficialInterestDue = selectedLoan
    ? calculateMonthlyInterest(selectedLoan.pendingPrincipal, selectedLoan.officialInterestRate)
    : 0;

  const monthlyNonAccountedInterestDue = selectedLoan
    ? calculateMonthlyInterest(selectedLoan.pendingPrincipal, selectedLoan.nonAccountedInterestRate)
    : 0;

  const handleOriginationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createLoanApplication({
      profileId: newBorrowerId,
      guarantor1ProfileId: newGuarantor1Id || undefined,
      guarantor2ProfileId: newGuarantor2Id || undefined,
      coBorrowerProfileId: newCoBorrowerId || undefined,
      principalAmount: Number(newPrincipal),
      pendingPrincipal: Number(newPrincipal),
      collateralDetails: newCollateral,
      repaymentTerms: newRepaymentTerms,
      collectionFrequency: newFrequency,
      officialInterestRate: Number(newOfficialRate),
      nonAccountedInterestRate: Number(newNonAccountedRate),
    });
    setIsOriginationOpen(false);
    setSelectedLoanId(created.id);
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

  const handleCloseLoan = () => {
    setIsConfirmCloseOpen(true);
  };

  const handleConfirmCloseSubmit = () => {
    if (!selectedLoan) return;
    closeLoan(selectedLoan.id);
    setIsConfirmCloseOpen(false);
  };

  if (isOriginationScreen) {
    return (
      <NewLoanScreen
        onCancel={() => setIsOriginationScreen(false)}
        onSuccess={(createdLoanId) => {
          setSelectedLoanId(createdLoanId);
          setStatusFilter('pending_approval');
          setIsOriginationScreen(false);
        }}
      />
    );
  }

  // Calculate Metrics for Sub-Screens
  const totalActivePrincipal = loans.filter(l => l.status === 'active' || l.status === 'npa').reduce((acc, l) => acc + l.pendingPrincipal, 0);
  const totalAccountedYield = loans.filter(l => l.status === 'active').reduce((acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.officialInterestRate), 0);
  const totalNonAccountedYield = loans.filter(l => l.status === 'active').reduce((acc, l) => acc + calculateMonthlyInterest(l.pendingPrincipal, l.nonAccountedInterestRate), 0);
  const pendingApps = loans.filter(l => l.status === 'pending_approval');
  const activeLoans = loans.filter(l => l.status === 'active');
  const npaLoans = loans.filter(l => l.status === 'npa' || Boolean(l.isNpa));
  const closedLoans = loans.filter(l => l.status === 'closed');

  const activeSubView = initialSubTab || 'finance_overview';

  const renderContent = () => {
    // 1. OVERVIEW SCREEN
    if (activeSubView === 'finance_overview') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Finance & Lending Overview"
            subtitle="Executive summary of active portfolio principal, dual-stream interest yields, and loan origination pipeline."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Overview' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsOriginationScreen(true)}
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
                            onClick={() => {
                              setSelectedLoanId(l.id);
                              window.location.hash = 'finance/finance_register';
                            }}
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
    }

    // 2. LOAN APPLICATIONS SCREEN
    if (activeSubView === 'finance_applications') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Loan Applications & Origination Pipeline"
            subtitle="Review loan applications, verify collateral, and perform sanction approval or rejection."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Applications' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsOriginationScreen(true)}
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
                      <th className="p-3 text-right">Sanction Action</th>
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
        </div>
      );
    }

    // 3. DISBURSEMENT SCREEN
    if (activeSubView === 'finance_disbursement') {
      const sanctionedLoans = loans.filter(l => l.status === 'pending_approval' || l.status === 'active');
      return (
        <div className="space-y-6">
          <PageHeader
            title="Loan Disbursement Management"
            subtitle="Disburse sanctioned loan funds through Central Bank Book or Vault Cash Book."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Disbursement' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Disbursed Principal"
              value={formatCurrency(totalActivePrincipal)}
              subtitle="Active portfolio balance"
              icon={Banknote}
              variant="emerald"
            />
            <StatCard
              title="Active Accounts"
              value={activeLoans.length}
              subtitle="Currently disbursed loans"
              icon={CheckCircle2}
              variant="blue"
            />
            <StatCard
              title="Sanctioned Pipeline"
              value={pendingApps.length}
              subtitle="Awaiting disbursement setup"
              icon={Clock}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Sanctioned Loan Accounts & Disbursement Actions
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Sanctioned Amount</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3 text-right">Disbursement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {sanctionedLoans.map((l) => {
                    const p = getProfileById(l.profileId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                        <td className="p-3 font-medium text-slate-900">{p?.name}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(l.principalAmount)}</td>
                        <td className="p-3"><StatusBadge status={l.status} /></td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLoanId(l.id);
                              setIsDisbursementOpen(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
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
          </div>
        </div>
      );
    }

    // 4. COLLECTIONS SCREEN
    if (activeSubView === 'finance_collections') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Loan Collections & Dues Register"
            subtitle="Track interest dues on pending principal and execute repayment collections with receipt generation."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Collections' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Accounted Monthly Interest Dues"
              value={formatCurrency(totalAccountedYield)}
              subtitle="Official ledger due"
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              title="Non-Accounted Interest Dues"
              value={formatCurrency(totalNonAccountedYield)}
              subtitle="Operational stream due"
              icon={Coins}
              variant="purple"
            />
            <StatCard
              title="Active Loan Accounts"
              value={activeLoans.length}
              subtitle="Generating monthly yield"
              icon={CreditCard}
              variant="emerald"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Active Loans Interest Dues Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Pending Principal</th>
                    <th className="p-3">Monthly Official Int Due</th>
                    <th className="p-3">Monthly Operational Int Due</th>
                    <th className="p-3 text-right">Collect Repayment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {activeLoans.map((l) => {
                    const p = getProfileById(l.profileId);
                    const offInt = calculateMonthlyInterest(l.pendingPrincipal, l.officialInterestRate);
                    const nonOffInt = calculateMonthlyInterest(l.pendingPrincipal, l.nonAccountedInterestRate);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                        <td className="p-3 font-medium text-slate-900">{p?.name}</td>
                        <td className="p-3 font-mono font-semibold">{formatCurrency(l.pendingPrincipal)}</td>
                        <td className="p-3 font-mono text-blue-700 font-bold">{formatCurrency(offInt)}</td>
                        <td className="p-3 font-mono text-purple-700 font-bold">{formatCurrency(nonOffInt)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLoanId(l.id);
                              setColPrincipal('0');
                              setColOfficialInt(String(offInt));
                              setColNonAccountedInt(String(nonOffInt));
                              setIsCollectionOpen(true);
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
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
        </div>
      );
    }

    // 5. TOP-UP SCREEN
    if (activeSubView === 'finance_topup') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Loan Top-Up Workspace"
            subtitle="Add additional principal under rule BR-012 while keeping existing loan ID and auto-recalculating interest."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Top-Up' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Eligible Active Loans"
              value={activeLoans.length}
              subtitle="Can receive top-up principal"
              icon={ArrowUpCircle}
              variant="purple"
            />
            <StatCard
              title="Total Active Principal"
              value={formatCurrency(totalActivePrincipal)}
              subtitle="Base principal balance"
              icon={CreditCard}
              variant="emerald"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Loans Eligible for Principal Top-Up
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Original Principal</th>
                    <th className="p-3">Current Pending Balance</th>
                    <th className="p-3 text-right">Top-Up Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {activeLoans.map((l) => {
                    const p = getProfileById(l.profileId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                        <td className="p-3 font-medium text-slate-900">{p?.name}</td>
                        <td className="p-3 font-mono">{formatCurrency(l.principalAmount)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(l.pendingPrincipal)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLoanId(l.id);
                              setIsTopUpOpen(true);
                            }}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs"
                          >
                            + Top-Up Principal
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
    }

    // 6. NPA WATCHLIST SCREEN
    if (activeSubView === 'finance_npa') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="NPA Watchlist (>90 Days Overdue)"
            subtitle="Monitor non-performing assets, overdue Days Past Due (DPD), guarantor details, and legal recovery notes."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'NPA Watchlist' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="NPA Account Count"
              value={npaLoans.length}
              subtitle=">90 Days DPD Default"
              icon={AlertTriangle}
              variant="rose"
            />
            <StatCard
              title="Total Overdue Principal"
              value={formatCurrency(npaLoans.reduce((acc, l) => acc + l.pendingPrincipal, 0))}
              subtitle="Default risk exposure"
              icon={Archive}
              variant="rose"
            />
            <StatCard
              title="Portfolio NPA Ratio"
              value={`${totalActivePrincipal ? ((npaLoans.reduce((acc, l) => acc + l.pendingPrincipal, 0) / totalActivePrincipal) * 100).toFixed(1) : 0}%`}
              subtitle="NPA / Active Principal"
              icon={Shield}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Non-Performing Accounts Register</span>
              <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold">
                High Risk Watchlist
              </span>
            </h3>

            {npaLoans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Clean NPA Record</p>
                <p className="text-xs text-slate-400">No active loans currently exceed 90 Days Past Due.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="p-3">Loan ID</th>
                      <th className="p-3">Borrower Name</th>
                      <th className="p-3">Pending Principal</th>
                      <th className="p-3">DPD (Overdue Days)</th>
                      <th className="p-3">Guarantor Contact</th>
                      <th className="p-3 text-right">Recovery Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {npaLoans.map((l) => {
                      const p = getProfileById(l.profileId);
                      const g1 = getProfileById(l.guarantor1ProfileId);
                      return (
                        <tr key={l.id} className="hover:bg-rose-50/30">
                          <td className="p-3 font-mono font-bold text-rose-900">{l.id}</td>
                          <td className="p-3 font-semibold text-slate-900">{p?.name}</td>
                          <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(l.pendingPrincipal)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-mono font-bold rounded-md">
                              95 Days DPD
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{g1?.name || 'Guarantor On Record'} ({g1?.mobile || g1?.primaryPhone || 'Verified'})</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLoanId(l.id);
                                setIsCollectionOpen(true);
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
                            >
                              Recovery Payment
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
        </div>
      );
    }

    // 7. LOAN CLOSURE SCREEN
    if (activeSubView === 'finance_closure') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Loan Closure & NOC Settlement"
            subtitle="Archive settled loans, issue formal NOC documentation, and release pledged collateral."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'Loan Closure' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Closed Loan Accounts"
              value={closedLoans.length}
              subtitle="Fully settled loans"
              icon={Archive}
              variant="slate"
            />
            <StatCard
              title="Active Accounts Ready for Settlement"
              value={loans.filter(l => l.pendingPrincipal === 0 && l.status === 'active').length}
              subtitle="Zero balance loans"
              icon={CheckCircle2}
              variant="emerald"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Closed & Archived Loan Records
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Original Principal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">NOC & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loans.filter(l => l.status === 'closed' || l.status === 'active').map((l) => {
                    const p = getProfileById(l.profileId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                        <td className="p-3 font-medium text-slate-900">{p?.name}</td>
                        <td className="p-3 font-mono">{formatCurrency(l.principalAmount)}</td>
                        <td className="p-3"><StatusBadge status={l.status} /></td>
                        <td className="p-3 text-right space-x-2">
                          {l.status === 'closed' ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> NOC Issued
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLoanId(l.id);
                                setIsConfirmCloseOpen(true);
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
                            >
                              Formal Loan Closure
                            </button>
                          )}
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
    }

    // 8. DEFAULT FALLBACK / MASTER LOAN REGISTER SCREEN ('finance_register' or 'finance_ledger')
    return (
      <div className="space-y-6">
        <PageHeader
          title="Master Loan Register & Repayment Workspace"
          subtitle="Full loan lifecycle: onboarding, sanction, disbursement, dual-stream interest recalculation on pending principal, top-up, and closure."
          breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance (Lending)' }, { label: 'Loan Register' }]}
          actions={
            <button
              type="button"
              onClick={() => setIsOriginationScreen(true)}
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
                          onClick={handleCloseLoan}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Close Loan</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-tabs inside Loan Workspace */}
                <Tabs
                  tabs={[
                    { id: 'overview', label: 'Loan Parameters' },
                    { id: 'ledger', label: 'Repayment Ledger' },
                    { id: 'timeline', label: 'Schedule Timeline' },
                    { id: 'documents', label: 'Collateral & Guarantors' },
                  ]}
                  activeTab={activeTab}
                  onChange={(tab) => setActiveTab(tab as any)}
                />

                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-xs text-slate-500 font-medium">Pending Principal Balance</span>
                        <p className="text-lg font-bold font-mono text-slate-900">{formatCurrency(selectedLoan.pendingPrincipal)}</p>
                        <span className="text-[10px] text-slate-400">Original: {formatCurrency(selectedLoan.principalAmount)}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1">
                        <span className="text-xs text-blue-700 font-medium">Official Monthly Interest</span>
                        <p className="text-lg font-bold font-mono text-blue-900">{formatCurrency(monthlyOfficialInterestDue)}</p>
                        <span className="text-[10px] text-blue-600 font-mono">Rate: {selectedLoan.officialInterestRate}% / Month</span>
                      </div>

                      <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-1">
                        <span className="text-xs text-purple-700 font-medium">Non-Accounted Operational Int</span>
                        <p className="text-lg font-bold font-mono text-purple-900">{formatCurrency(monthlyNonAccountedInterestDue)}</p>
                        <span className="text-[10px] text-purple-600 font-mono">Rate: {selectedLoan.nonAccountedInterestRate}% / Month</span>
                      </div>
                    </div>

                    {/* Dual Stream Breakdown Box */}
                    <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                          Dual-Stream Interest Recalculation Engine
                        </h4>
                        <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                          Pending Principal Base
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 text-[11px]">Official Book Stream:</p>
                          <p className="font-mono font-semibold text-slate-100">
                            {formatCurrency(selectedLoan.pendingPrincipal)} × {selectedLoan.officialInterestRate}% = {formatCurrency(monthlyOfficialInterestDue)} / mo
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[11px]">Non-Accounted Operational Stream:</p>
                          <p className="font-mono font-semibold text-purple-300">
                            {formatCurrency(selectedLoan.pendingPrincipal)} × {selectedLoan.nonAccountedInterestRate}% = {formatCurrency(monthlyNonAccountedInterestDue)} / mo
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ledger' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Repayment & Transaction History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Principal Red.</th>
                            <th className="p-2.5">Official Int</th>
                            <th className="p-2.5">Non-Acc Int</th>
                            <th className="p-2.5">Penalty</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Receipt #</th>
                          </tr>
                        </thead>
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400 text-xs">
                              No repayments recorded yet for this loan account.
                            </td>
                          </tr>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="p-6 bg-slate-50 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Collection Frequency Schedule</h3>
                    <p className="text-xs text-slate-600">
                      Frequency configured: <span className="font-semibold capitalize text-slate-900">{selectedLoan.collectionFrequency}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Interest is calculated on the remaining principal balance on every collection cycle.
                    </p>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Collateral Details</h4>
                      <p className="text-slate-700">{selectedLoan.collateralDetails}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 border border-slate-200 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Guarantor 1</span>
                        <p className="font-semibold text-slate-800">{guarantor1?.name || 'None'}</p>
                        <p className="text-[11px] text-slate-500">{guarantor1?.mobile || guarantor1?.primaryPhone}</p>
                      </div>
                      <div className="p-3 border border-slate-200 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Guarantor 2</span>
                        <p className="font-semibold text-slate-800">{guarantor2?.name || 'None'}</p>
                        <p className="text-[11px] text-slate-500">{guarantor2?.mobile || guarantor2?.primaryPhone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select a loan account from the directory on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* MODALS */}
      {/* 1. Origination Modal */}
      <Modal
        isOpen={isOriginationOpen}
        onClose={() => setIsOriginationOpen(false)}
        title="New Loan Application (Origination)"
        subtitle="Rule BR-004: Onboard borrower & guarantors, set principal and dual-stream interest rates."
        maxWidth="2xl"
      >
        <form onSubmit={handleOriginationSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Borrower *</label>
              <select
                value={newBorrowerId}
                onChange={e => setNewBorrowerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                required
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({(p.profileType || 'customer').toUpperCase()} - {p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Co-Borrower (Optional)</label>
              <select
                value={newCoBorrowerId}
                onChange={e => setNewCoBorrowerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="">-- None --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Guarantor 1</label>
              <select
                value={newGuarantor1Id}
                onChange={e => setNewGuarantor1Id(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="">-- None --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Guarantor 2</label>
              <select
                value={newGuarantor2Id}
                onChange={e => setNewGuarantor2Id(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="">-- None --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Principal Amount (₹) *</label>
              <input
                type="number"
                value={newPrincipal}
                onChange={e => setNewPrincipal(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-blue-900 font-semibold mb-1">Official Rate (% / Mo) *</label>
              <input
                type="number"
                step="0.1"
                value={newOfficialRate}
                onChange={e => setNewOfficialRate(e.target.value)}
                className="w-full border border-blue-300 rounded-lg p-2 font-mono font-bold bg-blue-50/20"
                required
              />
            </div>
            <div>
              <label className="block text-purple-900 font-semibold mb-1">Non-Accounted Rate (% / Mo)</label>
              <input
                type="number"
                step="0.1"
                value={newNonAccountedRate}
                onChange={e => setNewNonAccountedRate(e.target.value)}
                className="w-full border border-purple-300 rounded-lg p-2 font-mono font-bold bg-purple-50/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Collateral & Security Description</label>
            <input
              type="text"
              value={newCollateral}
              onChange={e => setNewCollateral(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsOriginationOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Create Loan Application
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Sanction Modal */}
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
            <p className="font-bold text-slate-900">{borrower?.name} — {formatCurrency(selectedLoan?.principalAmount)}</p>
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

      {/* 3. Disbursement Modal */}
      <Modal
        isOpen={isDisbursementOpen}
        onClose={() => setIsDisbursementOpen(false)}
        title="Disburse Loan Funds"
        subtitle={`Rule BR-006: Transfer principal amount ${formatCurrency(selectedLoan?.principalAmount)} to borrower.`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <CashBankSelector
            mode={disburseMode}
            onModeChange={setDisburseMode}
            selectedBankAccountId={disburseBankId}
            onBankChange={setDisburseBankId}
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
            Disbursement will automatically record an outgoing entry in the Central Ledger and Cash/Bank book.
          </div>

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

      {/* 4. Collection Modal */}
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

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Remarks</label>
            <input
              type="text"
              placeholder="e.g. Monthly interest + part principal payment"
              value={colRemarks}
              onChange={e => setColRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCollectionOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Submit & Print Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Top-Up Modal */}
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

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Top-Up Rationale / Remarks</label>
            <input
              type="text"
              value={topUpRemarks}
              onChange={e => setTopUpRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTopUpOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
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
        confirmText="Close Loan"
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
