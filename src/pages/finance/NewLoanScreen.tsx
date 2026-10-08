import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  User,
  FileText,
  Calendar,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Lock,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  Plus,
  X,
  Shield,
  Car,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { PaymentMode, Profile, CollateralItem, CollectionScheduleItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { PrintableLoanApplicationModal } from '../../components/finance/PrintableLoanApplicationModal';
import { CollateralModal } from '../../components/finance/CollateralModal';
import { CollectionScheduleTable } from '../../components/finance/CollectionScheduleTable';

interface NewLoanScreenProps {
  onCancel?: () => void;
  onSuccess?: (loanId: string) => void;
  onClose?: () => void;
}

export const NewLoanScreen: React.FC<NewLoanScreenProps> = ({ onCancel, onSuccess, onClose }) => {
  const handleBack = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };
  const { profiles, createLoanApplication, bankAccounts, masterData } = useERP();

  // Selected Parties
  const [borrowerId, setBorrowerId] = useState<string>(profiles[0]?.id || '');
  const [coBorrowerId, setCoBorrowerId] = useState<string>('');
  const [guarantor1Id, setGuarantor1Id] = useState<string>('');
  const [guarantor2Id, setGuarantor2Id] = useState<string>('');

  // Loan Facility & Collateral Fields (Employee Enters)
  const [natureOfFacilities, setNatureOfFacilities] = useState<string>('Term Loan / Secured Credit Facility');
  
  // Amount Applied For and Deducted Amount
  const [principal, setPrincipal] = useState<string>('500000');
  const [deductedAmount, setDeductedAmount] = useState<string>('50000');

  const [purposeOfLoan, setPurposeOfLoan] = useState<string>('Commercial Inventory & Shop Expansion');
  const [repaymentTerms, setRepaymentTerms] = useState<string>('Monthly interest collection on pending principal balance.');
  const [sourcesOfRepayment, setSourcesOfRepayment] = useState<string>('Business Trading Turnover & Commercial Revenues');

  // Structured Collateral Items
  const [collateralItems, setCollateralItems] = useState<CollateralItem[]>([
    {
      id: 'col-1',
      type: 'gold',
      netWeight: '100',
      grossWeight: '120',
      carat: '22K',
    },
    {
      id: 'col-2',
      type: 'vehicle',
      brand: 'Hyundai',
      model: 'Creta',
      possession: 'with',
      rcBookFileName: 'RC_BOOK_KA01AB1234.pdf',
    },
  ]);
  const [isCollateralModalOpen, setIsCollateralModalOpen] = useState(false);

  // Interest Rates & Collection Frequency
  const [officialRate, setOfficialRate] = useState<string>(String(masterData.defaultOfficialInterestRate || 12.0));
  const [nonAccountedRate, setNonAccountedRate] = useState<string>(String(masterData.defaultNonAccountedInterestRate || 6.0));
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const [firstCollectionDate, setFirstCollectionDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Manual Penalty (₹)
  const [manualPenalty, setManualPenalty] = useState<string>('0');

  // Place & Date
  const [applicationPlace, setApplicationPlace] = useState<string>('Bangalore');
  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [mode, setMode] = useState<PaymentMode>('bank');
  const [bankId, setBankId] = useState<string>(bankAccounts[0]?.id || 'BA-01');

  // Print Modal & Submit State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collection Schedule State
  const [schedule, setSchedule] = useState<CollectionScheduleItem[]>([]);

  // Derived Selected Profile Objects
  const selectedBorrower = profiles.find(p => p.id === borrowerId);
  const selectedCoBorrower = profiles.find(p => p.id === coBorrowerId);
  const selectedGuarantor1 = profiles.find(p => p.id === guarantor1Id);
  const selectedGuarantor2 = profiles.find(p => p.id === guarantor2Id);

  // Derived Net Principal
  const netPrincipal = Math.max(0, (Number(principal) || 0) - (Number(deductedAmount) || 0));

  // Helper to serialize collateral items into a readable summary string
  const formatCollateralText = (items: CollateralItem[]) => {
    if (items.length === 0) return 'No collateral pledged';
    return items
      .map(c => {
        if (c.type === 'gold') {
          return `Gold (Net: ${c.netWeight}g, Gross: ${c.grossWeight}g, ${c.carat})`;
        } else if (c.type === 'vehicle') {
          return `Vehicle: ${c.brand} ${c.model} (${c.possession === 'with' ? 'With Possession' : 'Without Possession'}${
            c.rcBookFileName ? `, RC: ${c.rcBookFileName}` : ''
          })`;
        } else {
          return `Other Asset: ${c.assetTitle} (₹${formatCurrency(Number(c.assetValue) || 0)}${
            c.documentFileName ? `, Doc: ${c.documentFileName}` : ''
          })`;
        }
      })
      .join('; ');
  };

  // Helper to calculate overdue days dynamically
  const getOverdueDays = (dueDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - due.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  // Dynamic Collection Schedule Generator
  useEffect(() => {
    const officialRateNum = Number(officialRate) || 0;
    const operationalRateNum = Number(nonAccountedRate) || 0;
    const numCycles = frequency === 'monthly' ? 12 : frequency === 'weekly' ? 10 : 15;
    const basePrincipal = netPrincipal;
    const principalPerCycle = numCycles > 0 ? Math.round(basePrincipal / numCycles) : 0;

    // Dual Stream Interest Calculations per Cycle
    let cycleOfficialInterest = 0;
    let cycleOperationalInterest = 0;

    if (frequency === 'monthly') {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRateNum / 100)) / 12);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRateNum / 100)) / 12);
    } else if (frequency === 'weekly') {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRateNum / 100)) / 52);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRateNum / 100)) / 52);
    } else {
      cycleOfficialInterest = Math.round((basePrincipal * (officialRateNum / 100)) / 365);
      cycleOperationalInterest = Math.round((basePrincipal * (operationalRateNum / 100)) / 365);
    }

    const cycleTotalInterest = cycleOfficialInterest + cycleOperationalInterest;
    const pen = Number(manualPenalty) || 0;
    const startDate = firstCollectionDate ? new Date(firstCollectionDate) : new Date();

    const newSchedule: CollectionScheduleItem[] = [];

    for (let i = 1; i <= numCycles; i++) {
      const d = new Date(startDate);
      if (frequency === 'monthly') {
        d.setMonth(d.getMonth() + (i - 1));
      } else if (frequency === 'weekly') {
        d.setDate(d.getDate() + (i - 1) * 7);
      } else {
        d.setDate(d.getDate() + (i - 1));
      }

      const dueDateStr = d.toISOString().slice(0, 10);
      const overdueDays = getOverdueDays(dueDateStr);

      // Principal for the cycle (adjust last cycle for rounding)
      const isLast = i === numCycles;
      const cyclePrin = isLast
        ? Math.max(0, basePrincipal - principalPerCycle * (numCycles - 1))
        : principalPerCycle;

      // Assign manual penalty to the first/current installment
      const cyclePenalty = i === 1 ? pen : 0;
      const totalDue = Math.round(cyclePrin + cycleTotalInterest + cyclePenalty);

      let status: CollectionScheduleItem['status'] = 'PENDING';
      if (overdueDays > 0) {
        status = 'OVERDUE';
      }

      newSchedule.push({
        installmentNumber: i,
        dueDate: dueDateStr,
        principal: cyclePrin,
        interest: cycleTotalInterest,
        officialInterest: cycleOfficialInterest,
        operationalInterest: cycleOperationalInterest,
        penalty: cyclePenalty,
        totalDue,
        amountPaid: 0,
        balance: totalDue,
        status,
        overdueDays,
      });
    }

    setSchedule(newSchedule);
  }, [
    principal,
    deductedAmount,
    officialRate,
    nonAccountedRate,
    frequency,
    firstCollectionDate,
    manualPenalty,
  ]);

  const handleAddCollateral = (item: CollateralItem) => {
    setCollateralItems(prev => [...prev, item]);
  };

  const handleRemoveCollateral = (id: string) => {
    setCollateralItems(prev => prev.filter(c => c.id !== id));
  };

  const handleSubmit = (status: 'pending_approval' | 'draft') => {
    if (!borrowerId) {
      alert('Please select a valid Borrower Profile.');
      return;
    }
    const amountNum = Number(principal);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid Principal Amount Applied For.');
      return;
    }

    setIsSubmitting(true);

    const deductedNum = Number(deductedAmount) || 0;
    const penNum = Number(manualPenalty) || 0;
    const collateralText = formatCollateralText(collateralItems);

    const created = createLoanApplication({
      profileId: borrowerId,
      coBorrowerProfileId: coBorrowerId || undefined,
      guarantor1ProfileId: guarantor1Id || undefined,
      guarantor2ProfileId: guarantor2Id || undefined,
      natureOfFacilities,
      principalAmount: amountNum,
      deductedAmount: deductedNum,
      manualPenalty: penNum,
      pendingPrincipal: Math.max(0, amountNum - deductedNum),
      purposeOfLoan,
      repaymentTerms,
      sourcesOfRepayment,
      collateralDetails: collateralText,
      collateralItems,
      collectionFrequency: frequency,
      firstCollectionDate,
      officialInterestRate: Number(officialRate),
      nonAccountedInterestRate: Number(nonAccountedRate),
      applicationPlace,
      applicationDate,
      status: status === 'draft' ? 'pending_approval' : 'pending_approval',
    });

    setIsSubmitting(false);
    if (onSuccess) {
      onSuccess(created.id);
    } else {
      handleBack();
    }
  };

  // Helper component to render auto-filled profile details card
  const AutoFilledProfileCard: React.FC<{ title: string; profile?: Profile }> = ({ title, profile }) => {
    if (!profile) return null;

    return (
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2.5 relative">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>AUTO-FILLED FROM PROFILE MASTER</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Full Name:</span>
            <span className="font-bold text-slate-900">{profile.name}</span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Father's / Husband's Name:</span>
            <span className="font-medium text-slate-800">{profile.fatherName || profile.husbandName || '—'}</span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Age / Date of Birth:</span>
            <span className="font-mono text-slate-800">{profile.age ? `${profile.age} Yrs` : profile.dob || '—'}</span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Occupation / Business:</span>
            <span className="font-medium text-slate-800">{profile.occupation || '—'}</span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Mobile & Phone:</span>
            <span className="font-mono text-slate-800">
              {profile.mobile} {profile.phone ? ` / ${profile.phone}` : ''}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">E-mail ID:</span>
            <span className="font-medium text-slate-800">{profile.email || '—'}</span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-500 font-semibold block text-[11px]">Residential Address:</span>
            <span className="text-slate-800">{profile.address || profile.residentialAddress}</span>
          </div>

          {profile.officeAddress && (
            <div className="sm:col-span-2">
              <span className="text-slate-500 font-semibold block text-[11px]">Office / Business Address:</span>
              <span className="text-slate-800">{profile.officeAddress}</span>
            </div>
          )}

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Annual Income:</span>
            <span className="font-mono font-bold text-emerald-700">
              {profile.annualIncome ? formatCurrency(profile.annualIncome) : '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block text-[11px]">Aadhaar / PAN:</span>
            <span className="font-mono text-slate-800">
              {profile.aadhaar} / {profile.pan}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      <PageHeader
        title="New Loan Application"
        subtitle="Select Borrower, Co-Borrower and Guarantor from Profile Master to auto-fill personal details. Employee enters loan-specific terms."
        breadcrumbs={[
          { label: 'Business Modules' },
          { label: 'Finance (Lending)', onClick: handleBack },
          { label: 'New Loan Application' },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Application (A4 PDF)</span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Loans</span>
            </button>
          </div>
        }
      />

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* SECTION 1: PROFILE SELECTION & AUTO-FILLED CARDS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">
                  1. Select Parties (Profile Master Auto-Fill)
                </h2>
                <p className="text-xs text-slate-500">
                  Selected profile particulars will automatically populate in the paper/digital application
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-mono">
              PROFILE MASTER POOL
            </span>
          </div>

          {/* Profile Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Borrower Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Primary Borrower (Profile) *
              </label>
              <select
                value={borrowerId}
                onChange={e => setBorrowerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) — {p.mobile}
                  </option>
                ))}
              </select>
            </div>

            {/* Co-Borrower Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Co-Borrower (Optional Profile)
              </label>
              <select
                value={coBorrowerId}
                onChange={e => setCoBorrowerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">None / Single Borrower</option>
                {profiles
                  .filter(p => p.id !== borrowerId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
              </select>
            </div>

            {/* Guarantor Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Guarantor (Optional Profile)
              </label>
              <select
                value={guarantor1Id}
                onChange={e => setGuarantor1Id(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">None / No Guarantor</option>
                {profiles
                  .filter(p => p.id !== borrowerId && p.id !== coBorrowerId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Auto-Filled Read-Only Profile Cards */}
          <div className="space-y-4 pt-2">
            <AutoFilledProfileCard title="Borrower Particulars" profile={selectedBorrower} />
            {selectedCoBorrower && (
              <AutoFilledProfileCard title="Co-Borrower Particulars" profile={selectedCoBorrower} />
            )}
            {selectedGuarantor1 && (
              <AutoFilledProfileCard title="Guarantor Particulars" profile={selectedGuarantor1} />
            )}
          </div>
        </div>

        {/* SECTION 2: LOAN FACILITY & COLLATERAL */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">
                  2. Loan Facility & Collateral
                </h2>
                <p className="text-xs text-slate-500">
                  Enter credit facilities, requested amount, repayment terms, and collateral securities
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-mono">
              EMPLOYEE ENTERED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nature of Facilities */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nature of Facilities *
              </label>
              <input
                type="text"
                value={natureOfFacilities}
                onChange={e => setNatureOfFacilities(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Term Loan / Secured Gold & Property Credit"
                required
              />
            </div>

            {/* Amount Applied For (₹) and Deducted Amount (₹) side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount Applied For (₹) *
                </label>
                <input
                  type="number"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 500000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deducted Amount (₹)
                </label>
                <input
                  type="number"
                  value={deductedAmount}
                  onChange={e => setDeductedAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 50000"
                />
              </div>
            </div>

            {/* Purpose of Loan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Purpose of Loan *
              </label>
              <input
                type="text"
                value={purposeOfLoan}
                onChange={e => setPurposeOfLoan(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Working Capital / Inventory Expansion"
                required
              />
            </div>

            {/* Sources of Repayment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sources of Repayment *
              </label>
              <input
                type="text"
                value={sourcesOfRepayment}
                onChange={e => setSourcesOfRepayment(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Retail Business Trading Cash Flows"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Terms of Repayment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Terms of Repayment *
              </label>
              <textarea
                rows={3}
                value={repaymentTerms}
                onChange={e => setRepaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                placeholder="Terms of repayment..."
                required
              />
            </div>

            {/* Structured Securities / Collateral Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Securities / Collateral Details *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCollateralModalOpen(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Collateral</span>
                </button>
              </div>

              {/* Collateral Summary Cards */}
              <div className="space-y-2">
                {collateralItems.length === 0 ? (
                  <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-center">
                    <p className="text-xs text-slate-500">No collateral added yet.</p>
                    <button
                      type="button"
                      onClick={() => setIsCollateralModalOpen(true)}
                      className="mt-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      + Add Collateral
                    </button>
                  </div>
                ) : (
                  collateralItems.map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between text-xs space-x-2"
                    >
                      <div className="space-y-0.5">
                        {item.type === 'gold' && (
                          <>
                            <div className="flex items-center space-x-1.5">
                              <Shield className="w-3.5 h-3.5 text-amber-600" />
                              <span className="font-bold text-slate-900">Gold</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono">
                                22K/Carat
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              Net: <strong>{item.netWeight}g</strong> | Gross: <strong>{item.grossWeight}g</strong> | Carat: <strong>{item.carat}</strong>
                            </p>
                          </>
                        )}

                        {item.type === 'vehicle' && (
                          <>
                            <div className="flex items-center space-x-1.5">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-bold text-slate-900">Vehicle</span>
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono">
                                {item.possession === 'with' ? 'With Possession' : 'Without Possession'}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              <strong>{item.brand} {item.model}</strong>
                              {item.rcBookFileName && (
                                <span className="ml-2 font-mono text-emerald-700">
                                  RC: {item.rcBookFileName} ✓
                                </span>
                              )}
                            </p>
                          </>
                        )}

                        {item.type === 'other' && (
                          <>
                            <div className="flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              <span className="font-bold text-slate-900">Other Asset</span>
                              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono">
                                Property/Asset
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              <strong>{item.assetTitle}</strong> | Value: <strong>₹{formatCurrency(Number(item.assetValue) || 0)}</strong>
                              {item.documentFileName && (
                                <span className="ml-2 font-mono text-emerald-700">
                                  Doc: {item.documentFileName} ✓
                                </span>
                              )}
                            </p>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCollateral(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="Remove Collateral"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Dual Stream Interest Rates & Schedule & Manual Penalty */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Interest (% p.a.)
              </label>
              <input
                type="number"
                step="0.5"
                value={officialRate}
                onChange={e => setOfficialRate(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-xs font-bold font-mono text-blue-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Interest (% p.a.)
              </label>
              <input
                type="number"
                step="0.5"
                value={nonAccountedRate}
                onChange={e => setNonAccountedRate(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold font-mono text-amber-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Collection Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="monthly">Monthly Collection</option>
                <option value="weekly">Weekly Collection</option>
                <option value="daily">Daily Collection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Due Date
              </label>
              <input
                type="date"
                value={firstCollectionDate}
                onChange={e => setFirstCollectionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penalty (₹)
              </label>
              <input
                type="number"
                value={manualPenalty}
                onChange={e => setManualPenalty(e.target.value)}
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-bold font-mono text-rose-900 focus:bg-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Application Place & Date Defaults */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Place
              </label>
              <input
                type="text"
                value={applicationPlace}
                onChange={e => setApplicationPlace(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Date
              </label>
              <input
                type="date"
                value={applicationDate}
                onChange={e => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: COLLECTION SCHEDULE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">
                  3. Collection Schedule
                </h2>
                <p className="text-xs text-slate-500">
                  Calculated installment schedule based on principal, interest rate stream, frequency, and manual penalty
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                Net Principal: <strong>{formatCurrency(netPrincipal)}</strong>
              </span>
              {Number(manualPenalty) > 0 && (
                <span className="font-mono bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-700 font-bold">
                  Penalty: +{formatCurrency(Number(manualPenalty))}
                </span>
              )}
            </div>
          </div>

          {/* Collection Schedule Table with Dynamic Overdue Tooltip */}
          <CollectionScheduleTable
            schedule={schedule}
            onUpdateSchedule={setSchedule}
          />
        </div>

        {/* SECTION 4: Disbursement Setup & Mode */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans">
                4. Disbursement Mode Setup
              </h2>
              <p className="text-xs text-slate-500">
                Configure central bank or vault account for payout upon sanction
              </p>
            </div>
          </div>

          <CashBankSelector
            mode={mode}
            selectedBankAccountId={bankId}
            onModeChange={setMode}
            onBankChange={setBankId}
          />
        </div>

        {/* Action Footer Bar */}
        <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Bookmark className="w-4 h-4 text-slate-500" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Application</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('pending_approval')}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Collateral Modal */}
      <CollateralModal
        isOpen={isCollateralModalOpen}
        onClose={() => setIsCollateralModalOpen(false)}
        onAdd={handleAddCollateral}
      />

      {/* Printable Loan Application Modal */}
      <PrintableLoanApplicationModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        loan={{
          id: `LN-2026-DRAFT`,
          principalAmount: Number(principal) || 500000,
          deductedAmount: Number(deductedAmount) || 0,
          manualPenalty: Number(manualPenalty) || 0,
          natureOfFacilities,
          purposeOfLoan,
          repaymentTerms,
          sourcesOfRepayment,
          collateralDetails: formatCollateralText(collateralItems),
          collateralItems,
          officialInterestRate: Number(officialRate),
          nonAccountedInterestRate: Number(nonAccountedRate),
        }}
        borrower={selectedBorrower}
        coBorrower={selectedCoBorrower}
        guarantor1={selectedGuarantor1}
        guarantor2={selectedGuarantor2}
        applicationPlace={applicationPlace}
        applicationDate={applicationDate}
      />
    </div>
  );
};
