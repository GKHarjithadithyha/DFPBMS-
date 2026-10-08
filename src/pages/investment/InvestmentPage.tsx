import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Landmark,
  Clock,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
  Archive,
  Calendar,
  FileText,
  DollarSign,
  PlusCircle,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { InvestmentRecord, InvestmentType, PaymentMode } from '../../types';

interface CustomFieldInput {
  label: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'yes_no';
}

interface InvestmentPageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
}

export const InvestmentPage: React.FC<InvestmentPageProps> = ({ initialSubTab }) => {
  const {
    investments,
    recordInvestment,
    payInvestmentInstalment,
    closeInvestment,
  } = useERP();

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isInstalmentModalOpen, setIsInstalmentModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentRecord | null>(null);

  // Form: New Investment (Required Fields)
  const [name, setName] = useState('');
  const [companyOrOrg, setCompanyOrOrg] = useState('');
  const [investmentType, setInvestmentType] = useState<InvestmentType>('fixed_deposit');
  const [amount, setAmount] = useState<number>(500000);
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Corporate Reserve / Debt');
  const [platform, setPlatform] = useState('Direct AMC / Banking');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  // Form: Recurring Choice
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'monthly' | 'quarterly' | 'half_yearly' | 'annual'>('monthly');
  const [recurringInstalmentAmount, setRecurringInstalmentAmount] = useState<number>(25000);
  const [nextInstalmentDate, setNextInstalmentDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [maturityDate, setMaturityDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [expectedMaturityAmount, setExpectedMaturityAmount] = useState<number>(545000);

  // Form: Dynamic Client-Defined Custom Fields
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'dropdown' | 'yes_no'>('text');

  // Form: Payment Channel
  const [initialPaymentMode, setInitialPaymentMode] = useState<PaymentMode>('bank');
  const [initialBankId, setInitialBankId] = useState('BA-01');

  // Form: Pay Instalment
  const [instalmentAmount, setInstalmentAmount] = useState<number>(10000);
  const [instalmentMode, setInstalmentMode] = useState<PaymentMode>('bank');
  const [instalmentBankId, setInstalmentBankId] = useState('BA-01');

  // Stats
  const activeInvestments = investments.filter(i => i.status === 'active');
  const maturedInvestments = investments.filter(i => i.status === 'matured' || i.status === 'closed');
  const totalPrincipal = investments.reduce((sum, i) => sum + (i.amount || i.principalAmount || 0), 0);
  const totalExpectedMaturity = investments.reduce((sum, i) => sum + (i.expectedMaturityAmount || i.amount || i.principalAmount || 0), 0);

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    setCustomFields(prev => [
      ...prev,
      { label: newFieldLabel.trim(), value: newFieldValue, type: newFieldType },
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateInvestmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordInvestment({
      name,
      companyOrOrg,
      institutionName: companyOrOrg,
      investmentType,
      amount: Number(amount),
      principalAmount: Number(amount),
      investmentDate,
      startDate: investmentDate,
      category,
      platform,
      referenceNumber,
      accountOrFolioNumber: referenceNumber,
      remarks,
      documentUrl,
      certificateUrl: documentUrl,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      recurringInstalmentAmount: isRecurring ? Number(recurringInstalmentAmount) : undefined,
      nextInstalmentDate: isRecurring ? nextInstalmentDate : undefined,
      maturityDate,
      expectedMaturityAmount: Number(expectedMaturityAmount),
      status: 'active',
      paymentMode: initialPaymentMode,
      bankAccountId: initialPaymentMode === 'bank' ? initialBankId : undefined,
      customFields,
    });
    setIsNewModalOpen(false);
    setName('');
    setCompanyOrOrg('');
    setReferenceNumber('');
    setRemarks('');
    setCustomFields([]);
  };

  const handlePayInstalmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;
    payInvestmentInstalment(selectedInvestment.id, Number(instalmentAmount), instalmentMode, instalmentBankId);
    setIsInstalmentModalOpen(false);
  };

  const handleCloseInvestmentSubmit = () => {
    if (!selectedInvestment) return;
    const finalVal = selectedInvestment.expectedMaturityAmount || selectedInvestment.amount || selectedInvestment.principalAmount || 0;
    closeInvestment(selectedInvestment.id, finalVal, 'bank', 'BA-01');
    setIsCloseModalOpen(false);
  };

  const activeSubView = initialSubTab || 'investment_overview';

  const renderContent = () => {
    // 1. INVESTMENT OVERVIEW SCREEN
    if (activeSubView === 'investment_overview' || activeSubView === 'overview') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Investment Portfolio Overview"
            subtitle="Executive dashboard of corporate investments, recurring instalments, maturity tracking, and client-defined fields."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Overview' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Custom Investment Entry</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Invested Capital"
              value={formatCurrency(totalPrincipal)}
              subtitle={`${investments.length} Portfolio Instruments`}
              icon={TrendingUp}
              variant="emerald"
            />
            <StatCard
              title="Expected Maturity Return"
              value={formatCurrency(totalExpectedMaturity)}
              subtitle="Projected portfolio yield"
              icon={ArrowUpRight}
              variant="blue"
            />
            <StatCard
              title="Active Investments"
              value={activeInvestments.length}
              subtitle={`${investments.filter(i => i.isRecurring).length} Recurring SIPs`}
              icon={CheckCircle2}
              variant="purple"
            />
            <StatCard
              title="Closed / Matured"
              value={maturedInvestments.length}
              subtitle="Completed investment lifecycles"
              icon={Archive}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Master Investment Portfolio Register
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {investments.map(i => {
                const invName = i.name || i.investmentName || 'Investment';
                const org = i.companyOrOrg || i.institutionName || 'Organization';
                const ref = i.referenceNumber || i.accountOrFolioNumber || i.id;

                return (
                  <div key={i.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        {i.investmentType.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        {i.isRecurring ? (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
                            RECURRING ({i.recurrenceFrequency || 'Monthly'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                            NON-RECURRING
                          </span>
                        )}
                        <StatusBadge status={i.status} />
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-xs font-bold text-slate-400">{ref}</span>
                      <h4 className="font-bold text-slate-900 text-base">{invName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{org} • Category: {i.category || 'General'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 bg-slate-50 rounded-xl">
                      <div>
                        <span className="text-slate-400 text-[10px] font-sans uppercase block">Invested Principal</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(i.amount || i.principalAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-sans uppercase block">Expected Maturity</span>
                        <span className="font-bold text-blue-900">{formatCurrency(i.expectedMaturityAmount || i.amount || 0)}</span>
                      </div>
                    </div>

                    {/* Client-Defined Custom Fields View */}
                    {i.customFields && i.customFields.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Custom Defined Fields</span>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {i.customFields.map((cf, idx) => (
                            <div key={idx} className="p-1.5 bg-purple-50/50 rounded border border-purple-100 text-[11px]">
                              <span className="text-purple-800 font-semibold block">{cf.label}:</span>
                              <span className="text-slate-800 font-mono">{cf.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Date: {formatDate(i.investmentDate || i.startDate)}
                      </span>

                      {i.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          {i.isRecurring && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvestment(i);
                                setInstalmentAmount(i.recurringInstalmentAmount || 10000);
                                setIsInstalmentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold"
                            >
                              Pay Instalment
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvestment(i);
                              setIsCloseModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                          >
                            Mature & Settle
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 2. INVESTMENT REGISTER SCREEN
    if (activeSubView === 'investment_register' || activeSubView === 'register') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Master Investment Register"
            subtitle="Complete directory of corporate investment instruments, active holdings, recurring deposits, and yield allocations."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Investment Register' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Custom Investment Entry</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Invested Capital"
              value={formatCurrency(totalPrincipal)}
              subtitle={`${investments.length} Holdings`}
              icon={TrendingUp}
              variant="emerald"
            />
            <StatCard
              title="Expected Maturity Return"
              value={formatCurrency(totalExpectedMaturity)}
              subtitle="Projected portfolio yield"
              icon={ArrowUpRight}
              variant="blue"
            />
            <StatCard
              title="Active Holdings"
              value={activeInvestments.length}
              subtitle="Current earning assets"
              icon={CheckCircle2}
              variant="purple"
            />
            <StatCard
              title="Closed / Matured"
              value={maturedInvestments.length}
              subtitle="Redeemed instruments"
              icon={Archive}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Investment Directory Table ({investments.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Ref / Folio #</th>
                    <th className="p-3">Investment Name</th>
                    <th className="p-3">Company / Org</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Structure</th>
                    <th className="p-3">Invested Amount</th>
                    <th className="p-3">Expected Maturity</th>
                    <th className="p-3">Maturity Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {investments.map(i => {
                    const invName = i.name || i.investmentName || 'Investment';
                    const org = i.companyOrOrg || i.institutionName || 'Organization';
                    const ref = i.referenceNumber || i.accountOrFolioNumber || i.id;

                    return (
                      <tr key={i.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{ref}</td>
                        <td className="p-3 font-bold text-slate-900">{invName}</td>
                        <td className="p-3 text-slate-600">{org}</td>
                        <td className="p-3 uppercase font-semibold text-emerald-800 text-[11px]">
                          {i.investmentType.replace('_', ' ')}
                        </td>
                        <td className="p-3">
                          {i.isRecurring ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
                              RECURRING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                              NON-RECURRING
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(i.amount || i.principalAmount || 0)}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-900">
                          {formatCurrency(i.expectedMaturityAmount || i.amount || 0)}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(i.maturityDate)}</td>
                        <td className="p-3"><StatusBadge status={i.status} /></td>
                        <td className="p-3 text-right space-x-1">
                          {i.status === 'active' && (
                            <>
                              {i.isRecurring && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvestment(i);
                                    setInstalmentAmount(i.recurringInstalmentAmount || 10000);
                                    setIsInstalmentModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold"
                                >
                                  Instalment
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvestment(i);
                                  setIsCloseModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold"
                              >
                                Settle
                              </button>
                            </>
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

    // 3. INVESTMENT DETAILS & CUSTOM FIELDS SCREEN
    if (activeSubView === 'investment_details' || activeSubView === 'details') {
      const totalCustomFields = investments.reduce((sum, i) => sum + (i.customFields?.length || 0), 0);

      return (
        <div className="space-y-6">
          <PageHeader
            title="Investment Details & Custom Fields Register"
            subtitle="Dedicated workspace detailing individual corporate investment instruments, custom client-defined fields, supporting documentation links, and platform channels."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Investment Details' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Custom Investment Entry</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Holdings"
              value={investments.length}
              subtitle="Registered investment instruments"
              icon={TrendingUp}
              variant="emerald"
            />
            <StatCard
              title="Custom Fields Defined"
              value={totalCustomFields}
              subtitle="Dynamic client attributes"
              icon={PieChart}
              variant="purple"
            />
            <StatCard
              title="Document Certificates"
              value={investments.filter(i => i.documentUrl).length}
              subtitle="Supporting documents attached"
              icon={FileText}
              variant="blue"
            />
            <StatCard
              title="Active Holdings"
              value={activeInvestments.length}
              subtitle="Earning portfolio yield"
              icon={CheckCircle2}
              variant="amber"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {investments.map(i => {
              const invName = i.name || i.investmentName || 'Investment';
              const org = i.companyOrOrg || i.institutionName || 'Organization';
              const ref = i.referenceNumber || i.accountOrFolioNumber || i.id;

              return (
                <div key={i.id} className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider font-mono">
                      {i.investmentType.replace('_', ' ')}
                    </span>
                    <StatusBadge status={i.status} />
                  </div>

                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block">{ref}</span>
                    <h4 className="font-bold text-slate-900 text-lg">{invName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{org} • Category: {i.category || 'General'}</p>
                    {i.platform && <p className="text-xs text-slate-400">Platform / Channel: {i.platform}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] font-sans uppercase block font-semibold">Invested Principal</span>
                      <span className="font-bold text-emerald-700 text-sm">{formatCurrency(i.amount || i.principalAmount || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-sans uppercase block font-semibold">Expected Return</span>
                      <span className="font-bold text-blue-900 text-sm">{formatCurrency(i.expectedMaturityAmount || i.amount || 0)}</span>
                    </div>
                  </div>

                  {/* Supporting Document Link */}
                  {i.documentUrl && (
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs flex items-center justify-between">
                      <span className="text-blue-900 font-medium">Supporting Certificate:</span>
                      <a
                        href={i.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline font-mono text-[11px] font-bold"
                      >
                        View Certificate Document ↗
                      </a>
                    </div>
                  )}

                  {/* Custom Client-Defined Fields */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-purple-800 font-mono uppercase tracking-wider block">
                      Client-Defined Custom Attributes ({i.customFields?.length || 0})
                    </span>
                    {i.customFields && i.customFields.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {i.customFields.map((cf, idx) => (
                          <div key={idx} className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                            <span className="text-purple-900 font-bold block text-[11px]">{cf.label}:</span>
                            <span className="text-slate-900 font-mono font-semibold">{cf.value}</span>
                            <span className="text-[9px] text-purple-600 block uppercase font-mono mt-0.5">[{cf.type}]</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No custom fields defined for this record.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. INVESTMENT MATURITY SCREEN
    if (activeSubView === 'investment_maturity' || activeSubView === 'maturity') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Investment Maturity Schedule & Payout Register"
            subtitle="Dedicated workspace tracking investment maturity dates, expected maturity payouts, accrued yields, and upcoming maturity schedules."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Maturity Schedule' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Expected Maturity Return"
              value={formatCurrency(totalExpectedMaturity)}
              subtitle="Projected portfolio redemption"
              icon={ArrowUpRight}
              variant="emerald"
            />
            <StatCard
              title="Total Invested Capital"
              value={formatCurrency(totalPrincipal)}
              subtitle="Principal capital base"
              icon={TrendingUp}
              variant="blue"
            />
            <StatCard
              title="Active Maturing Instruments"
              value={activeInvestments.length}
              subtitle="Earning holdings"
              icon={Clock}
              variant="purple"
            />
            <StatCard
              title="Matured Holdings"
              value={maturedInvestments.length}
              subtitle="Ready for settlement"
              icon={CheckCircle2}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Maturity Schedule Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Folio / Ref #</th>
                    <th className="p-3">Investment Instrument</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Investment Date</th>
                    <th className="p-3">Maturity Date</th>
                    <th className="p-3">Invested Principal</th>
                    <th className="p-3">Expected Return</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {investments.map(i => {
                    const invName = i.name || i.investmentName || 'Investment';
                    const org = i.companyOrOrg || i.institutionName || 'Organization';
                    const ref = i.referenceNumber || i.accountOrFolioNumber || i.id;

                    return (
                      <tr key={i.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{ref}</td>
                        <td className="p-3 font-bold text-slate-900">{invName}</td>
                        <td className="p-3 text-slate-600">{org}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(i.investmentDate || i.startDate)}</td>
                        <td className="p-3 font-mono font-bold text-purple-900">{formatDate(i.maturityDate)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(i.amount || i.principalAmount || 0)}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-900">
                          {formatCurrency(i.expectedMaturityAmount || i.amount || 0)}
                        </td>
                        <td className="p-3"><StatusBadge status={i.status} /></td>
                        <td className="p-3 text-right">
                          {i.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvestment(i);
                                setIsCloseModalOpen(true);
                              }}
                              className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                            >
                              Mature & Settle
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

    // 5. INVESTMENT CLOSURE SCREEN
    if (activeSubView === 'investment_closure' || activeSubView === 'closure') {
      const closedList = investments.filter(i => i.status === 'closed' || i.status === 'matured');

      return (
        <div className="space-y-6">
          <PageHeader
            title="Investment Closure & Redemption Register"
            subtitle="Dedicated workspace for closed, matured, and redeemed investment instruments with audit settlement records and Central Ledger CTE postings."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Closure Register' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Closed / Matured"
              value={closedList.length}
              subtitle="Redeemed instruments"
              icon={Archive}
              variant="amber"
            />
            <StatCard
              title="Total Capital Redeemed"
              value={formatCurrency(closedList.reduce((sum, i) => sum + (i.expectedMaturityAmount || i.amount || 0), 0))}
              subtitle="Settled capital inflow"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="CTE Settlement Channel"
              value="Cash & Bank Book"
              subtitle="Central ledger validated"
              icon={Landmark}
              variant="blue"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Master Redemption & Closure Audit Log ({closedList.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Folio / Ref #</th>
                    <th className="p-3">Investment Name</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Invested Principal</th>
                    <th className="p-3">Final Redeemed Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {closedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No closed investments currently. Active investments will be listed here upon maturity settlement.
                      </td>
                    </tr>
                  ) : (
                    closedList.map(i => {
                      const invName = i.name || i.investmentName || 'Investment';
                      const org = i.companyOrOrg || i.institutionName || 'Organization';
                      const ref = i.referenceNumber || i.accountOrFolioNumber || i.id;

                      return (
                        <tr key={i.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-900">{ref}</td>
                          <td className="p-3 font-bold text-slate-900">{invName}</td>
                          <td className="p-3 text-slate-600">{org}</td>
                          <td className="p-3 uppercase font-semibold text-emerald-800 text-[11px]">
                            {i.investmentType.replace('_', ' ')}
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {formatCurrency(i.amount || i.principalAmount || 0)}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {formatCurrency(i.expectedMaturityAmount || i.amount || 0)}
                          </td>
                          <td className="p-3"><StatusBadge status={i.status} /></td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                              SETTLED VIA CTE
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Default fallback to Investment Overview
    return (
      <div className="space-y-6">
        <PageHeader
          title="Investment Portfolio Overview"
          subtitle="Executive dashboard of corporate investments, recurring instalments, maturity tracking, and client-defined fields."
          breadcrumbs={[{ label: 'Business Modules' }, { label: 'Investments' }, { label: 'Overview' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Invested Capital"
            value={formatCurrency(totalPrincipal)}
            subtitle={`${investments.length} Portfolio Instruments`}
            icon={TrendingUp}
            variant="emerald"
          />
          <StatCard
            title="Expected Maturity Return"
            value={formatCurrency(totalExpectedMaturity)}
            subtitle="Projected portfolio yield"
            icon={ArrowUpRight}
            variant="blue"
          />
          <StatCard
            title="Active Investments"
            value={activeInvestments.length}
            subtitle={`${investments.filter(i => i.isRecurring).length} Recurring SIPs`}
            icon={CheckCircle2}
            variant="purple"
          />
          <StatCard
            title="Closed / Matured"
            value={maturedInvestments.length}
            subtitle="Completed investment lifecycles"
            icon={Archive}
            variant="amber"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* FULLY CUSTOMIZABLE NEW INVESTMENT MODAL */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Custom Investment Entry"
        subtitle="Record corporate investment with recurring options and client-defined custom fields."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInvestmentSubmit} className="space-y-4 text-xs">
          {/* A. Required Investment Information */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
              A. Investment Particulars
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Investment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Fixed Deposit Scheme"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC AMC / Reliance Power"
                  value={companyOrOrg}
                  onChange={e => setCompanyOrOrg(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Investment Type *</label>
                <select
                  value={investmentType}
                  onChange={e => setInvestmentType(e.target.value as InvestmentType)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
                >
                  <option value="fixed_deposit">Fixed Deposit (FD)</option>
                  <option value="shares">Equity Shares</option>
                  <option value="bond">Government / Corporate Bond</option>
                  <option value="mutual_funds">Mutual Funds</option>
                  <option value="recurring_deposit">Recurring Deposit (RD)</option>
                  <option value="land_property">Land & Commercial Property</option>
                  <option value="other">Other Yield Asset</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Investment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Investment Date *</label>
                <input
                  type="date"
                  required
                  value={investmentDate}
                  onChange={e => setInvestmentDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Treasury / High Yield"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Platform / Channel</label>
                <input
                  type="text"
                  placeholder="e.g. Zerodha / Direct AMC"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reference / Folio #</label>
                <input
                  type="text"
                  placeholder="e.g. FOLIO-88910"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Supporting Document URL / Link</label>
                <input
                  type="text"
                  placeholder="e.g. https://docs.dhavanam.com/fd_certificate.pdf"
                  value={documentUrl}
                  onChange={e => setDocumentUrl(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expected Maturity Amount (₹)</label>
                <input
                  type="number"
                  value={expectedMaturityAmount}
                  onChange={e => setExpectedMaturityAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-blue-900 font-bold"
                />
              </div>
            </div>
          </div>

          {/* B. Recurring vs Non-Recurring Choice */}
          <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider font-mono">
                B. Investment Recurrence Structure
              </h4>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center space-x-1.5 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="recurringChoice"
                    checked={!isRecurring}
                    onChange={() => setIsRecurring(false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Non-Recurring (Lump Sum)</span>
                </label>
                <label className="inline-flex items-center space-x-1.5 cursor-pointer font-bold text-purple-900">
                  <input
                    type="radio"
                    name="recurringChoice"
                    checked={isRecurring}
                    onChange={() => setIsRecurring(true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Recurring (SIP / Instalments)</span>
                </label>
              </div>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-purple-200/80 animate-in fade-in duration-150">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recurrence Frequency</label>
                  <select
                    value={recurrenceFrequency}
                    onChange={e => setRecurrenceFrequency(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half-Yearly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recurring Instalment Amount (₹)</label>
                  <input
                    type="number"
                    value={recurringInstalmentAmount}
                    onChange={e => setRecurringInstalmentAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-purple-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Next Instalment Due Date</label>
                  <input
                    type="date"
                    value={nextInstalmentDate}
                    onChange={e => setNextInstalmentDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* C. Additional Client-Defined Custom Fields */}
          <div className="space-y-3 p-3 bg-emerald-50/40 rounded-xl border border-emerald-200">
            <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider font-mono">
              C. Client-Defined Additional Custom Fields
            </h4>
            <p className="text-[11px] text-slate-600">Add dynamic custom fields defined by your organization (e.g. Lock-in Period, ISIN Code, Demat Account ID, Tax Exemption Category).</p>

            {customFields.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-emerald-200 text-xs">
                    <span className="font-bold text-slate-800">{field.label}: <span className="font-mono text-slate-600">{field.value}</span> ({field.type})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                placeholder="Field Label (e.g. Lock-in Years)"
                value={newFieldLabel}
                onChange={e => setNewFieldLabel(e.target.value)}
                className="col-span-1 border border-slate-300 rounded-lg p-2 bg-white text-xs"
              />
              <select
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value as any)}
                className="col-span-1 border border-slate-300 rounded-lg p-2 bg-white text-xs"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="dropdown">Dropdown</option>
                <option value="yes_no">Yes / No</option>
              </select>
              <input
                type="text"
                placeholder="Field Value"
                value={newFieldValue}
                onChange={e => setNewFieldValue(e.target.value)}
                className="col-span-1 border border-slate-300 rounded-lg p-2 bg-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddCustomField}
                className="col-span-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs inline-flex items-center justify-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Field</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Channel & Bank Account</label>
            <CashBankSelector
              mode={initialPaymentMode}
              onModeChange={setInitialPaymentMode}
              selectedBankAccountId={initialBankId}
              onBankChange={setInitialBankId}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Submit & Post Custom Investment
            </button>
          </div>
        </form>
      </Modal>

      {/* PAY INSTALMENT MODAL */}
      <Modal
        isOpen={isInstalmentModalOpen}
        onClose={() => setIsInstalmentModalOpen(false)}
        title={`Pay Recurring Instalment — ${selectedInvestment?.name || ''}`}
      >
        <form onSubmit={handlePayInstalmentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Instalment Amount (₹) *</label>
            <input
              type="number"
              required
              value={instalmentAmount}
              onChange={e => setInstalmentAmount(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-purple-900 font-bold"
            />
          </div>

          <CashBankSelector
            mode={instalmentMode}
            onModeChange={setInstalmentMode}
            selectedBankAccountId={instalmentBankId}
            onBankChange={setInstalmentBankId}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInstalmentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Post Recurring Instalment
            </button>
          </div>
        </form>
      </Modal>

      {/* CLOSE / MATURE INVESTMENT MODAL */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={`Mature & Settle Investment — ${selectedInvestment?.name || ''}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Settling this investment will receive final maturity proceeds of <strong className="font-mono text-emerald-800">{formatCurrency(selectedInvestment?.expectedMaturityAmount || selectedInvestment?.amount || 0)}</strong> directly into the Central Bank Book.
          </p>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCloseInvestmentSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Confirm Maturity Settlement
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
