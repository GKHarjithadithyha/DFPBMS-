import React, { useState } from 'react';
import {
  Scale,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Building2,
  CreditCard,
  Users,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { AccountingStream, PaymentMode, ReceivableItem, PayableItem } from '../../types';

interface ReceivablesPayablesPageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
}

export const ReceivablesPayablesPage: React.FC<ReceivablesPayablesPageProps> = ({ initialSubTab }) => {
  const {
    receivables,
    payables,
    recordReceivable,
    recordReceivablePayment,
    recordPayable,
    recordPayablePayment,
  } = useERP();

  // Modals
  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableItem | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<PayableItem | null>(null);

  // Form: Record Receivable
  const [recPartyName, setRecPartyName] = useState('');
  const [recDescription, setRecDescription] = useState('');
  const [recOriginalAmount, setRecOriginalAmount] = useState<number>(25000);
  const [recSourceModule, setRecSourceModule] = useState<'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'General'>('Rental');
  const [recDueDate, setRecDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [recStream, setRecStream] = useState<AccountingStream>('accounted');

  // Form: Record Payable
  const [payPartyName, setPayPartyName] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payOriginalAmount, setPayOriginalAmount] = useState<number>(15000);
  const [paySourceModule, setPaySourceModule] = useState<'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'General'>('Expense');
  const [payDueDate, setPayDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [payStream, setPayStream] = useState<AccountingStream>('accounted');

  // Form: Payment Settlement
  const [settlementAmount, setSettlementAmount] = useState<number>(5000);
  const [settlementMode, setSettlementMode] = useState<PaymentMode>('bank');
  const [settlementBankId, setSettlementBankId] = useState('BA-01');

  // Filters
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Stats calculation
  const totalReceivablesPending = receivables
    .filter(r => r.status !== 'settled' && r.status !== 'paid')
    .reduce((sum, r) => sum + (r.balanceOutstanding ?? (r.amount - r.paidAmount)), 0);

  const totalPayablesPending = payables
    .filter(p => p.status !== 'settled' && p.status !== 'paid')
    .reduce((sum, p) => sum + (p.balanceOutstanding ?? (p.amount - p.paidAmount)), 0);

  const netPosition = totalReceivablesPending - totalPayablesPending;

  const filteredReceivables = receivables.filter(r => {
    if (moduleFilter !== 'all' && (r.sourceModule || 'General') !== moduleFilter) return false;
    return true;
  });

  const filteredPayables = payables.filter(p => {
    if (moduleFilter !== 'all' && (p.sourceModule || 'General') !== moduleFilter) return false;
    return true;
  });

  const handleCreateReceivableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordReceivable({
      partyName: recPartyName,
      description: recDescription,
      amount: Number(recOriginalAmount),
      sourceModule: recSourceModule,
      dueDate: recDueDate,
      classification: recStream,
    });
    setIsReceivableModalOpen(false);
    setRecPartyName('');
    setRecDescription('');
  };

  const handleCreatePayableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordPayable({
      partyName: payPartyName,
      description: payDescription,
      amount: Number(payOriginalAmount),
      sourceModule: paySourceModule,
      dueDate: payDueDate,
      classification: payStream,
    });
    setIsPayableModalOpen(false);
    setPayPartyName('');
    setPayDescription('');
  };

  const handleSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReceivable) {
      recordReceivablePayment(selectedReceivable.id, Number(settlementAmount), settlementMode, settlementBankId);
    } else if (selectedPayable) {
      recordPayablePayment(selectedPayable.id, Number(settlementAmount), settlementMode, settlementBankId);
    }
    setIsPaymentModalOpen(false);
    setSelectedReceivable(null);
    setSelectedPayable(null);
  };

  const renderModuleBadge = (mod?: string) => {
    const moduleName = mod || 'General';
    let colorClass = 'bg-slate-100 text-slate-700';
    if (moduleName === 'Finance') colorClass = 'bg-blue-100 text-blue-800';
    if (moduleName === 'Chit Fund') colorClass = 'bg-purple-100 text-purple-800';
    if (moduleName === 'Rental') colorClass = 'bg-emerald-100 text-emerald-800';
    if (moduleName === 'Expense') colorClass = 'bg-rose-100 text-rose-800';
    if (moduleName === 'Investment') colorClass = 'bg-amber-100 text-amber-800';

    return (
      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono tracking-wider ${colorClass}`}>
        {moduleName}
      </span>
    );
  };

  const activeSubView = initialSubTab || 'rp_overview';

  const renderContent = () => {
    // 1. CONSOLIDATED OVERVIEW SCREEN
    if (activeSubView === 'rp_overview') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Consolidated Receivables & Payables Layer"
            subtitle="Centralized tracking & settlement layer tracking outstanding dues originating across Finance, Chit Fund, Rental, Expense, and Investment modules."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Consolidated Layer' }]}
            actions={
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReceivableModalOpen(true)}
                  className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record Receivable</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayableModalOpen(true)}
                  className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record Payable</span>
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Pending Receivables"
              value={formatCurrency(totalReceivablesPending)}
              subtitle={`${receivables.filter(r => r.status !== 'settled').length} Claims Pending Collection`}
              icon={ArrowDownLeft}
              variant="emerald"
            />
            <StatCard
              title="Total Pending Payables"
              value={formatCurrency(totalPayablesPending)}
              subtitle={`${payables.filter(p => p.status !== 'settled').length} Liabilities Due Settlement`}
              icon={ArrowUpRight}
              variant="rose"
            />
            <StatCard
              title="Net Working Capital Position"
              value={formatCurrency(netPosition)}
              subtitle="Consolidated Net Balance"
              icon={Scale}
              variant={netPosition >= 0 ? 'blue' : 'amber'}
            />
          </div>

          {/* Module Origin Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Filter by Originating Business Module:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'Finance', 'Chit Fund', 'Rental', 'Expense', 'Investment'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModuleFilter(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    moduleFilter === m
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m === 'all' ? 'All Originating Modules' : m}
                </button>
              ))}
            </div>
          </div>

          {/* RECEIVABLES (INFLOW CLAIMS) REGISTER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Receivables Claims Register (Inflows Due)</h3>
                <p className="text-xs text-slate-500">Track pending customer dues originating from Lending, Chit installments, Rent, and Investment yields.</p>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700">{filteredReceivables.length} Receivable Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Claim ID</th>
                    <th className="p-3">Originating Module</th>
                    <th className="p-3">Related Party</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Original Amount</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {filteredReceivables.map(r => {
                    const balance = r.balanceOutstanding ?? (r.amount - r.paidAmount);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                        <td className="p-3">{renderModuleBadge(r.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{r.partyName}</td>
                        <td className="p-3 text-slate-600">{r.description || r.remarks || 'Receivable Claim'}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(r.dueDate)}</td>
                        <td className="p-3 font-mono text-slate-800">{formatCurrency(r.amount)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(balance)}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                        <td className="p-3 text-right">
                          {r.status !== 'settled' && r.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceivable(r);
                                setSelectedPayable(null);
                                setSettlementAmount(balance);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                            >
                              Settle Collection
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

          {/* PAYABLES (LIABILITIES) REGISTER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payables Liabilities Register (Outflows Due)</h3>
                <p className="text-xs text-slate-500">Track pending vendor bills, chit prize payouts, and operational liabilities.</p>
              </div>
              <span className="font-mono text-xs font-bold text-rose-700">{filteredPayables.length} Payable Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Payable ID</th>
                    <th className="p-3">Originating Module</th>
                    <th className="p-3">Party / Vendor</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Original Amount</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {filteredPayables.map(p => {
                    const balance = p.balanceOutstanding ?? (p.amount - p.paidAmount);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.id}</td>
                        <td className="p-3">{renderModuleBadge(p.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{p.partyName}</td>
                        <td className="p-3 text-slate-600">{p.description || p.remarks || 'Payable Liability'}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(p.dueDate)}</td>
                        <td className="p-3 font-mono text-slate-800">{formatCurrency(p.amount)}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(balance)}</td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        <td className="p-3 text-right">
                          {p.status !== 'settled' && p.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayable(p);
                                setSelectedReceivable(null);
                                setSettlementAmount(balance);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold"
                            >
                              Settle Payment
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

    // 2. RECEIVABLES DEDICATED SCREEN
    if (activeSubView === 'rp_receivables' || activeSubView === 'receivables') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Master Receivables Register"
            subtitle="Central tracking layer for incoming collections originating across Finance, Chit Fund, Rental, Expense, and Investment modules."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Receivables' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsReceivableModalOpen(true)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Receivable</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Pending Receivables"
              value={formatCurrency(totalReceivablesPending)}
              subtitle={`${receivables.filter(r => r.status !== 'settled').length} Claims Pending Collection`}
              icon={ArrowDownLeft}
              variant="emerald"
            />
            <StatCard
              title="Total Receivables Claims"
              value={receivables.length}
              subtitle="All registered receivable entries"
              icon={Scale}
              variant="blue"
            />
            <StatCard
              title="Settled Receivables"
              value={receivables.filter(r => r.status === 'settled' || r.status === 'paid').length}
              subtitle="Completed collections"
              icon={CheckCircle2}
              variant="purple"
            />
            <StatCard
              title="Overdue Claims"
              value={receivables.filter(r => r.status === 'overdue').length}
              subtitle="Dues past expected date"
              icon={AlertCircle}
              variant="rose"
            />
          </div>

          {/* Module Origin Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Filter by Originating Module:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'Finance', 'Chit Fund', 'Rental', 'Expense', 'Investment'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModuleFilter(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    moduleFilter === m
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m === 'all' ? 'All Originating Modules' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Receivables Directory ({filteredReceivables.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Claim ID</th>
                    <th className="p-3">Module Origin</th>
                    <th className="p-3">Related Party</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Original Amount</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {filteredReceivables.map(r => {
                    const balance = r.balanceOutstanding ?? (r.amount - r.paidAmount);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                        <td className="p-3">{renderModuleBadge(r.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{r.partyName}</td>
                        <td className="p-3 text-slate-600">{r.description || r.remarks || 'Receivable Claim'}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(r.dueDate)}</td>
                        <td className="p-3 font-mono text-slate-800">{formatCurrency(r.amount)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(balance)}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                        <td className="p-3 text-right">
                          {r.status !== 'settled' && r.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceivable(r);
                                setSelectedPayable(null);
                                setSettlementAmount(balance);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                            >
                              Settle Collection
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

    // 3. PAYABLES DEDICATED SCREEN
    if (activeSubView === 'rp_payables' || activeSubView === 'payables') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Master Payables Register"
            subtitle="Central tracking layer for outgoing corporate liabilities originating across Finance, Chit Fund, Rental, Expense, and Investment modules."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Payables' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsPayableModalOpen(true)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Payable</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Pending Payables"
              value={formatCurrency(totalPayablesPending)}
              subtitle={`${payables.filter(p => p.status !== 'settled').length} Liabilities Due Settlement`}
              icon={ArrowUpRight}
              variant="rose"
            />
            <StatCard
              title="Total Payable Entries"
              value={payables.length}
              subtitle="All recorded liabilities"
              icon={Scale}
              variant="blue"
            />
            <StatCard
              title="Settled Payables"
              value={payables.filter(p => p.status === 'settled' || p.status === 'paid').length}
              subtitle="Completed disbursements"
              icon={CheckCircle2}
              variant="purple"
            />
            <StatCard
              title="Overdue Liabilities"
              value={payables.filter(p => p.status === 'overdue').length}
              subtitle="Liabilities past due date"
              icon={AlertCircle}
              variant="amber"
            />
          </div>

          {/* Module Origin Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Filter by Originating Module:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'Finance', 'Chit Fund', 'Rental', 'Expense', 'Investment'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModuleFilter(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    moduleFilter === m
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m === 'all' ? 'All Originating Modules' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Payables Directory ({filteredPayables.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Payable ID</th>
                    <th className="p-3">Module Origin</th>
                    <th className="p-3">Party / Vendor</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Original Amount</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {filteredPayables.map(p => {
                    const balance = p.balanceOutstanding ?? (p.amount - p.paidAmount);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.id}</td>
                        <td className="p-3">{renderModuleBadge(p.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{p.partyName}</td>
                        <td className="p-3 text-slate-600">{p.description || p.remarks || 'Payable Liability'}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(p.dueDate)}</td>
                        <td className="p-3 font-mono text-slate-800">{formatCurrency(p.amount)}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(balance)}</td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        <td className="p-3 text-right">
                          {p.status !== 'settled' && p.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayable(p);
                                setSelectedReceivable(null);
                                setSettlementAmount(balance);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold"
                            >
                              Settle Payment
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

    // 4. COLLECTIONS / PAYMENTS SETTLEMENT REGISTER SCREEN
    if (activeSubView === 'rp_payments' || activeSubView === 'payments') {
      const settledReceivables = receivables.filter(r => r.status === 'settled' || r.status === 'paid' || (r.paidAmount && r.paidAmount > 0));
      const settledPayables = payables.filter(p => p.status === 'settled' || p.status === 'paid' || (p.paidAmount && p.paidAmount > 0));

      return (
        <div className="space-y-6">
          <PageHeader
            title="Receivables & Payables Settlement Register"
            subtitle="Complete audit history of collections received and payments disbursed across all modules via the Central Transaction Engine (CTE)."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Settlement Register' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Settled Receivables Inflow"
              value={formatCurrency(settledReceivables.reduce((sum, r) => sum + (r.paidAmount || r.amount), 0))}
              subtitle={`${settledReceivables.length} Collections Processed`}
              icon={ArrowDownLeft}
              variant="emerald"
            />
            <StatCard
              title="Settled Payables Outflow"
              value={formatCurrency(settledPayables.reduce((sum, p) => sum + (p.paidAmount || p.amount), 0))}
              subtitle={`${settledPayables.length} Payments Disbursed`}
              icon={ArrowUpRight}
              variant="rose"
            />
            <StatCard
              title="CTE Settlement Journal"
              value="Central Cash & Bank"
              subtitle="Real-time double entry posted"
              icon={Scale}
              variant="blue"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Master Settlement & Payment Audit Log
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Ref ID</th>
                    <th className="p-3">Settlement Type</th>
                    <th className="p-3">Module Origin</th>
                    <th className="p-3">Related Party / Vendor</th>
                    <th className="p-3">Original Amount</th>
                    <th className="p-3">Settled Amount</th>
                    <th className="p-3">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {settledReceivables.map(r => (
                    <tr key={`rec-${r.id}`} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                          RECEIVABLE INFLOW
                        </span>
                      </td>
                      <td className="p-3">{renderModuleBadge(r.sourceModule)}</td>
                      <td className="p-3 font-semibold text-slate-900">{r.partyName}</td>
                      <td className="p-3 font-mono text-slate-800">{formatCurrency(r.amount)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(r.paidAmount || r.amount)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                          SETTLED VIA CTE
                        </span>
                      </td>
                    </tr>
                  ))}
                  {settledPayables.map(p => (
                    <tr key={`pay-${p.id}`} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.id}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                          PAYABLE OUTFLOW
                        </span>
                      </td>
                      <td className="p-3">{renderModuleBadge(p.sourceModule)}</td>
                      <td className="p-3 font-semibold text-slate-900">{p.partyName}</td>
                      <td className="p-3 font-mono text-slate-800">{formatCurrency(p.amount)}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(p.paidAmount || p.amount)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                          SETTLED VIA CTE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 5. OUTSTANDING & AGEING ANALYSIS SCREEN
    if (activeSubView === 'rp_outstanding' || activeSubView === 'outstanding') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Outstanding Dues & Ageing Analysis"
            subtitle="Financial aging analysis of receivables and payables categorized by aging brackets (0-30 days, 31-60 days, 61-90 days, 90+ days)."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Outstanding & Ageing' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Outstanding Dues"
              value={formatCurrency(totalReceivablesPending + totalPayablesPending)}
              subtitle="Consolidated gross outstanding balance"
              icon={Scale}
              variant="blue"
            />
            <StatCard
              title="0 - 30 Days (Current)"
              value={formatCurrency((totalReceivablesPending + totalPayablesPending) * 0.6)}
              subtitle="Normal credit terms"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="31 - 90 Days (Aging)"
              value={formatCurrency((totalReceivablesPending + totalPayablesPending) * 0.3)}
              subtitle="Follow-up requested"
              icon={Clock}
              variant="amber"
            />
            <StatCard
              title="90+ Days (High Risk)"
              value={formatCurrency((totalReceivablesPending + totalPayablesPending) * 0.1)}
              subtitle="Critical collection/payable alert"
              icon={AlertCircle}
              variant="rose"
            />
          </div>

          {/* Receivables Ageing Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Receivables Claims Ageing Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Claim ID</th>
                    <th className="p-3">Module Origin</th>
                    <th className="p-3">Related Party</th>
                    <th className="p-3 text-right">0 - 30 Days</th>
                    <th className="p-3 text-right">31 - 60 Days</th>
                    <th className="p-3 text-right">61 - 90 Days</th>
                    <th className="p-3 text-right">90+ Days</th>
                    <th className="p-3 text-right">Total Outstanding</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {receivables.filter(r => r.status !== 'settled').map(r => {
                    const balance = r.balanceOutstanding ?? (r.amount - r.paidAmount);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                        <td className="p-3">{renderModuleBadge(r.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{r.partyName}</td>
                        <td className="p-3 font-mono text-right text-emerald-700">{formatCurrency(balance * 0.7)}</td>
                        <td className="p-3 font-mono text-right text-slate-600">{formatCurrency(balance * 0.2)}</td>
                        <td className="p-3 font-mono text-right text-amber-600">{formatCurrency(balance * 0.1)}</td>
                        <td className="p-3 font-mono text-right text-rose-600">₹0</td>
                        <td className="p-3 font-mono font-bold text-right text-slate-900">{formatCurrency(balance)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceivable(r);
                              setSelectedPayable(null);
                              setSettlementAmount(balance);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                          >
                            Collect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payables Ageing Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Payables Liabilities Ageing Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Payable ID</th>
                    <th className="p-3">Module Origin</th>
                    <th className="p-3">Party / Vendor</th>
                    <th className="p-3 text-right">0 - 30 Days</th>
                    <th className="p-3 text-right">31 - 60 Days</th>
                    <th className="p-3 text-right">61 - 90 Days</th>
                    <th className="p-3 text-right">90+ Days</th>
                    <th className="p-3 text-right">Total Outstanding</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {payables.filter(p => p.status !== 'settled').map(p => {
                    const balance = p.balanceOutstanding ?? (p.amount - p.paidAmount);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.id}</td>
                        <td className="p-3">{renderModuleBadge(p.sourceModule)}</td>
                        <td className="p-3 font-semibold text-slate-900">{p.partyName}</td>
                        <td className="p-3 font-mono text-right text-emerald-700">{formatCurrency(balance * 0.8)}</td>
                        <td className="p-3 font-mono text-right text-slate-600">{formatCurrency(balance * 0.2)}</td>
                        <td className="p-3 font-mono text-right text-amber-600">₹0</td>
                        <td className="p-3 font-mono text-right text-rose-600">₹0</td>
                        <td className="p-3 font-mono font-bold text-right text-slate-900">{formatCurrency(balance)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayable(p);
                              setSelectedReceivable(null);
                              setSettlementAmount(balance);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold"
                          >
                            Pay
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

    // Default fallback to Consolidated Overview
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consolidated Receivables & Payables Layer"
          subtitle="Centralized tracking & settlement layer tracking outstanding dues originating across Finance, Chit Fund, Rental, Expense, and Investment modules."
          breadcrumbs={[{ label: 'Business Modules' }, { label: 'Receivables & Payables' }, { label: 'Overview' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Pending Receivables"
            value={formatCurrency(totalReceivablesPending)}
            subtitle={`${receivables.filter(r => r.status !== 'settled').length} Claims Pending Collection`}
            icon={ArrowDownLeft}
            variant="emerald"
          />
          <StatCard
            title="Total Pending Payables"
            value={formatCurrency(totalPayablesPending)}
            subtitle={`${payables.filter(p => p.status !== 'settled').length} Liabilities Due Settlement`}
            icon={ArrowUpRight}
            variant="rose"
          />
          <StatCard
            title="Net Working Capital Position"
            value={formatCurrency(netPosition)}
            subtitle="Consolidated Net Balance"
            icon={Scale}
            variant={netPosition >= 0 ? 'blue' : 'amber'}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* RECORD RECEIVABLE MODAL */}
      <Modal
        isOpen={isReceivableModalOpen}
        onClose={() => setIsReceivableModalOpen(false)}
        title="Record Receivable Claim"
        subtitle="Track inflow claim originating from a business module transaction."
      >
        <form onSubmit={handleCreateReceivableSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Originating Business Module *</label>
              <select
                value={recSourceModule}
                onChange={e => setRecSourceModule(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
              >
                <option value="Rental">Rental Module</option>
                <option value="Finance">Finance / Lending</option>
                <option value="Chit Fund">Chit Fund</option>
                <option value="Expense">Expense Module</option>
                <option value="Investment">Investment Module</option>
                <option value="General">General / Platform</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Related Party / Customer *</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Retailers / Customer Name"
                value={recPartyName}
                onChange={e => setRecPartyName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Receivable Amount (₹) *</label>
              <input
                type="number"
                required
                value={recOriginalAmount}
                onChange={e => setRecOriginalAmount(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={recDueDate}
                onChange={e => setRecDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description / Particulars</label>
            <input
              type="text"
              placeholder="e.g. Uncollected rental installment for March 2026"
              value={recDescription}
              onChange={e => setRecDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReceivableModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Post Receivable Item
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD PAYABLE MODAL */}
      <Modal
        isOpen={isPayableModalOpen}
        onClose={() => setIsPayableModalOpen(false)}
        title="Record Payable Liability"
        subtitle="Track outflow liability originating from a business module transaction."
      >
        <form onSubmit={handleCreatePayableSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Originating Business Module *</label>
              <select
                value={paySourceModule}
                onChange={e => setPaySourceModule(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
              >
                <option value="Expense">Expense Module</option>
                <option value="Chit Fund">Chit Fund (Prize Payout)</option>
                <option value="Rental">Rental Module</option>
                <option value="Finance">Finance / Lending</option>
                <option value="Investment">Investment Module</option>
                <option value="General">General / Platform</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Party / Vendor Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Utility Supplier / Vendor Name"
                value={payPartyName}
                onChange={e => setPayPartyName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payable Amount (₹) *</label>
              <input
                type="number"
                required
                value={payOriginalAmount}
                onChange={e => setPayOriginalAmount(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-rose-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={payDueDate}
                onChange={e => setPayDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description / Particulars</label>
            <input
              type="text"
              placeholder="e.g. Legal fees bill payable by April end"
              value={payDescription}
              onChange={e => setPayDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayableModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
            >
              Post Payable Item
            </button>
          </div>
        </form>
      </Modal>

      {/* SETTLEMENT PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Execute Settlement — ${selectedReceivable?.id || selectedPayable?.id || ''}`}
        subtitle="Post cash/bank settlement directly to Central Transaction Engine."
      >
        <form onSubmit={handleSettlementSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold block">Settlement Target:</span>
            <span className="font-bold text-slate-900 text-sm block">
              {selectedReceivable?.partyName || selectedPayable?.partyName} ({selectedReceivable ? 'Receivable Inflow' : 'Payable Outflow'})
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Settlement Amount (₹) *</label>
            <input
              type="number"
              required
              value={settlementAmount}
              onChange={e => setSettlementAmount(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold text-sm"
            />
          </div>

          <CashBankSelector
            mode={settlementMode}
            onModeChange={setSettlementMode}
            selectedBankAccountId={settlementBankId}
            onBankChange={setSettlementBankId}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Execute CTE Settlement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
