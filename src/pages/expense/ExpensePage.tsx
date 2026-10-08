import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Tag,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { AccountingStream, PaymentMode } from '../../types';

interface ExpensePageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
}

export const ExpensePage: React.FC<ExpensePageProps> = ({ initialSubTab }) => {
  const {
    expenses,
    expenseCategories,
    recordExpense,
    createExpenseCategory,
    userRole,
  } = useERP();

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form: Record Expense
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [amount, setAmount] = useState<number>(5000);
  const [stream, setStream] = useState<AccountingStream>('accounted');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank');
  const [bankAccountId, setBankAccountId] = useState('BA-01');
  const [payeeName, setPayeeName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Form: New Category
  const [newCategoryName, setNewCategoryName] = useState('');

  // Filters
  const [filterStream, setFilterStream] = useState<'all' | 'accounted' | 'non_accounted'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Stats calculation
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const accountedExpense = expenses
    .filter(e => (e.stream || e.classification) === 'accounted')
    .reduce((sum, e) => sum + e.amount, 0);
  const nonAccountedExpense = expenses
    .filter(e => (e.stream || e.classification) === 'non_accounted')
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
    return acc;
  }, {});

  let topCatId = '';
  let topCatAmount = 0;
  Object.entries(categoryTotals).forEach(([cat, val]) => {
    if (val > topCatAmount) {
      topCatAmount = val;
      topCatId = cat;
    }
  });
  const topCat = expenseCategories.find(c => c.id === topCatId)?.name || 'General';

  const filteredExpenses = expenses.filter(e => {
    const st = e.stream || e.classification;
    if (filterStream !== 'all' && st !== filterStream) return false;
    if (filterCategory !== 'all' && e.categoryId !== filterCategory) return false;
    return true;
  });

  const handleRecordExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || amount <= 0) return;
    recordExpense({
      categoryId,
      amount: Number(amount),
      stream,
      classification: stream,
      isRecurring: false,
      paymentMode,
      bankAccountId: paymentMode === 'bank' ? bankAccountId : undefined,
      payeeName,
      invoiceNumber,
      date: expenseDate,
      description,
    });
    setIsExpenseModalOpen(false);
    setPayeeName('');
    setInvoiceNumber('');
    setDescription('');
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createExpenseCategory(newCategoryName.trim());
    setIsCategoryModalOpen(false);
    setNewCategoryName('');
  };

  const activeSubView = initialSubTab || 'expense_overview';

  const renderContent = () => {
    // 1. EXPENSE OVERVIEW SCREEN
    if (activeSubView === 'expense_overview' || activeSubView === 'overview') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Corporate Expenses Overview"
            subtitle="Executive summary of company operational expenses, dual-stream ledger classification, and category breakdown."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Overview' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Expense</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Operational Expenses"
              value={formatCurrency(totalExpense)}
              subtitle={`${expenses.length} vouchers recorded`}
              icon={TrendingDown}
              variant="rose"
            />
            <StatCard
              title="Official Accounted Stream"
              value={formatCurrency(accountedExpense)}
              subtitle="Audited P&L voucher expenses"
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              title="Non-Accounted Stream"
              value={formatCurrency(nonAccountedExpense)}
              subtitle="Parallel operational stream"
              icon={FileSpreadsheet}
              variant="purple"
            />
            <StatCard
              title="Top Expense Category"
              value={topCat}
              subtitle={`${formatCurrency(topCatAmount)} spent`}
              icon={Tag}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Recent Expense Vouchers Summary
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Voucher Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payee Name</th>
                    <th className="p-3">Stream</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {expenses.slice(0, 8).map((e, idx) => {
                    const cat = expenseCategories.find(c => c.id === e.categoryId);
                    const st = e.stream || e.classification;
                    return (
                      <tr key={e.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-600">{e.date}</td>
                        <td className="p-3 font-semibold text-slate-900">{cat?.name || 'General'}</td>
                        <td className="p-3 font-medium text-slate-900">{e.payeeName || 'Vendor'}</td>
                        <td className="p-3">
                          {st === 'accounted' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                              Accounted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[11px]">
                              Non-Accounted
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(e.amount)}</td>
                        <td className="p-3 uppercase font-mono">{e.paymentMode}</td>
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

    // 2. EXPENSE REGISTER SCREEN
    if (activeSubView === 'expense_register') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Master Expense Register"
            subtitle="Searchable ledger of all company expense vouchers, stream classifications, and vendor payments."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Expense Register' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Record Expense</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Recorded Vouchers"
              value={expenses.length}
              subtitle="Lifetime expense entries"
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              title="Accounted Vouchers"
              value={expenses.filter(e => (e.stream || e.classification) === 'accounted').length}
              subtitle="Official ledger vouchers"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="Non-Accounted Vouchers"
              value={expenses.filter(e => (e.stream || e.classification) === 'non_accounted').length}
              subtitle="Parallel operational stream"
              icon={FileSpreadsheet}
              variant="purple"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Expense Vouchers Master Directory</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={filterStream}
                  onChange={e => setFilterStream(e.target.value as any)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50"
                >
                  <option value="all">All Streams</option>
                  <option value="accounted">Accounted Only</option>
                  <option value="non_accounted">Non-Accounted Only</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50"
                >
                  <option value="all">All Categories</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">ID / Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payee / Vendor</th>
                    <th className="p-3">Stream</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredExpenses.map((e, idx) => {
                    const cat = expenseCategories.find(c => c.id === e.categoryId);
                    const st = e.stream || e.classification;
                    return (
                      <tr key={e.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{e.invoiceNumber || e.id || `EXP-${idx + 1}`}</td>
                        <td className="p-3 font-mono text-slate-600">{e.date}</td>
                        <td className="p-3 font-semibold text-slate-900">{cat?.name || 'General'}</td>
                        <td className="p-3 font-medium text-slate-900">{e.payeeName || 'Vendor'}</td>
                        <td className="p-3">
                          {st === 'accounted' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                              Accounted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[11px]">
                              Non-Accounted
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(e.amount)}</td>
                        <td className="p-3 uppercase font-mono">{e.paymentMode}</td>
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

    // 3. EXPENSE ENTRY SCREEN
    if (activeSubView === 'expense_entry') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Expense Voucher Entry Screen"
            subtitle="Record operational company expense vouchers with dual-stream ledger classification and Cash/Bank book posting."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Expense Entry' }]}
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-3xl mx-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Record New Expense Voucher
            </h3>

            <form onSubmit={handleRecordExpenseSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expense Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Accounting Stream *</label>
                  <select
                    value={stream}
                    onChange={e => setStream(e.target.value as AccountingStream)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
                  >
                    <option value="accounted">Official Accounted Stream (P&L Audited)</option>
                    <option value="non_accounted">Non-Accounted Operational Stream</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Voucher Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-rose-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Electric Supply Co / Office Landlord"
                    value={payeeName}
                    onChange={e => setPayeeName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Invoice / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-99"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Channel & Account</label>
                <CashBankSelector
                  mode={paymentMode}
                  onModeChange={setPaymentMode}
                  selectedBankAccountId={bankAccountId}
                  onBankChange={setBankAccountId}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expense Description / Particulars</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed expense rationale..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Submit & Post Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // 4. EXPENSE CATEGORIES SCREEN
    if (activeSubView === 'expense_categories') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Expense Categories Management"
            subtitle="Organize company expenditures across standardized operating accounts."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Categories' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Category</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Categories Count"
              value={expenseCategories.length}
              subtitle="Configured expense heads"
              icon={Tag}
              variant="purple"
            />
            <StatCard
              title="Top Spent Category"
              value={topCat}
              subtitle={formatCurrency(topCatAmount)}
              icon={TrendingDown}
              variant="rose"
            />
            <StatCard
              title="Total Expense Spend"
              value={formatCurrency(totalExpense)}
              subtitle="Across all categories"
              icon={DollarSign}
              variant="emerald"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Expense Categories Register
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {expenseCategories.map(c => {
                const catSpent = expenses
                  .filter(e => e.categoryId === c.id)
                  .reduce((sum, e) => sum + e.amount, 0);
                const catCount = expenses.filter(e => e.categoryId === c.id).length;

                return (
                  <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{c.id}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                        Active Head
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">{c.name}</h4>
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">{catCount} Vouchers</span>
                      <span className="text-rose-700 font-bold">{formatCurrency(catSpent)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 5. EXPENSE DETAILS SCREEN
    if (activeSubView === 'expense_details') {
      const cashExpense = expenses
        .filter(e => e.paymentMode === 'cash')
        .reduce((sum, e) => sum + e.amount, 0);
      const bankExpense = expenses
        .filter(e => e.paymentMode === 'bank')
        .reduce((sum, e) => sum + e.amount, 0);

      const accountedVouchers = expenses.filter(e => (e.stream || e.classification) === 'accounted');
      const nonAccountedVouchers = expenses.filter(e => (e.stream || e.classification) === 'non_accounted');

      const accountedBank = accountedVouchers.filter(e => e.paymentMode === 'bank').reduce((sum, e) => sum + e.amount, 0);
      const accountedCash = accountedVouchers.filter(e => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amount, 0);

      const nonAccountedBank = nonAccountedVouchers.filter(e => e.paymentMode === 'bank').reduce((sum, e) => sum + e.amount, 0);
      const nonAccountedCash = nonAccountedVouchers.filter(e => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amount, 0);

      return (
        <div className="space-y-6">
          <PageHeader
            title="Expense Audit Details & Stream Breakdown"
            subtitle="Comprehensive dual-stream operational audit comparing Accounted (P&L) vs Non-Accounted ledgers, payment channels, and category allocations."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Audit Details' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Company Expenses"
              value={formatCurrency(totalExpense)}
              subtitle={`${expenses.length} Total Vouchers`}
              icon={TrendingDown}
              variant="rose"
            />
            <StatCard
              title="Official Accounted Stream"
              value={formatCurrency(accountedExpense)}
              subtitle={`${accountedVouchers.length} P&L Audited Vouchers`}
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              title="Non-Accounted Stream"
              value={formatCurrency(nonAccountedExpense)}
              subtitle={`${nonAccountedVouchers.length} Parallel Operational Vouchers`}
              icon={FileSpreadsheet}
              variant="purple"
            />
            <StatCard
              title="Payment Channel Split"
              value={`Bank: ${formatCurrency(bankExpense)}`}
              subtitle={`Cash: ${formatCurrency(cashExpense)}`}
              icon={DollarSign}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Dual-Stream Channel Breakdown Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                  <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider font-mono">
                    Official Accounted Stream (P&L Audited)
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                    {accountedVouchers.length} Vouchers
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-blue-900">
                  {formatCurrency(accountedExpense)}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono border-t border-blue-100">
                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block text-[10px] uppercase">Bank Disbursements</span>
                    <span className="font-bold text-blue-800">{formatCurrency(accountedBank)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block text-[10px] uppercase">Cash Disbursements</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(accountedCash)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                  <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider font-mono">
                    Non-Accounted Operational Stream
                  </h4>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                    {nonAccountedVouchers.length} Vouchers
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-purple-900">
                  {formatCurrency(nonAccountedExpense)}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono border-t border-purple-100">
                  <div className="bg-white/80 p-2 rounded border border-purple-100">
                    <span className="text-slate-500 block text-[10px] uppercase">Bank Disbursements</span>
                    <span className="font-bold text-purple-800">{formatCurrency(nonAccountedBank)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-purple-100">
                    <span className="text-slate-500 block text-[10px] uppercase">Cash Disbursements</span>
                    <span className="font-bold text-amber-800">{formatCurrency(nonAccountedCash)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category-wise Stream Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Per-Category Dual-Stream Allocation Audit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Category ID & Name</th>
                    <th className="p-3">Accounted Stream (₹)</th>
                    <th className="p-3">Non-Accounted Stream (₹)</th>
                    <th className="p-3">Combined Total Spend (₹)</th>
                    <th className="p-3">Vouchers Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
                  {expenseCategories.map(c => {
                    const catExpenses = expenses.filter(e => e.categoryId === c.id);
                    const catAccounted = catExpenses
                      .filter(e => (e.stream || e.classification) === 'accounted')
                      .reduce((sum, e) => sum + e.amount, 0);
                    const catNonAccounted = catExpenses
                      .filter(e => (e.stream || e.classification) === 'non_accounted')
                      .reduce((sum, e) => sum + e.amount, 0);
                    const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-sans font-semibold text-slate-900">
                          <span className="font-mono text-slate-400 mr-2 text-[11px]">{c.id}</span>
                          <span>{c.name}</span>
                        </td>
                        <td className="p-3 font-bold text-blue-700">{formatCurrency(catAccounted)}</td>
                        <td className="p-3 font-bold text-purple-700">{formatCurrency(catNonAccounted)}</td>
                        <td className="p-3 font-bold text-slate-900">{formatCurrency(catTotal)}</td>
                        <td className="p-3 text-slate-600 font-sans">{catExpenses.length} Vouchers</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete Expense Audit Trail Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Expense Voucher Audit Trail & Verification Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Voucher / Bill #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payee / Vendor</th>
                    <th className="p-3">Stream</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Entered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {expenses.map((e, idx) => {
                    const cat = expenseCategories.find(c => c.id === e.categoryId);
                    const st = e.stream || e.classification;
                    return (
                      <tr key={e.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{e.invoiceNumber || e.id || `EXP-${idx + 1}`}</td>
                        <td className="p-3 font-mono text-slate-600">{e.date}</td>
                        <td className="p-3 font-semibold text-slate-900">{cat?.name || 'General'}</td>
                        <td className="p-3 font-medium text-slate-900">{e.payeeName || 'Vendor'}</td>
                        <td className="p-3">
                          {st === 'accounted' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                              Accounted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[11px]">
                              Non-Accounted
                            </span>
                          )}
                        </td>
                        <td className="p-3 uppercase font-mono">{e.paymentMode}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(e.amount)}</td>
                        <td className="p-3 text-slate-600">{e.enteredBy || 'Employee'}</td>
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

    // Default fallback to Expense Overview
    return (
      <div className="space-y-6">
        <PageHeader
          title="Corporate Expenses Overview"
          subtitle="Executive summary of company operational expenses, dual-stream ledger classification, and category breakdown."
          breadcrumbs={[{ label: 'Business Modules' }, { label: 'Expenses' }, { label: 'Overview' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Operational Expenses"
            value={formatCurrency(totalExpense)}
            subtitle={`${expenses.length} vouchers recorded`}
            icon={TrendingDown}
            variant="rose"
          />
          <StatCard
            title="Official Accounted Stream"
            value={formatCurrency(accountedExpense)}
            subtitle="Audited P&L voucher expenses"
            icon={Receipt}
            variant="blue"
          />
          <StatCard
            title="Non-Accounted Stream"
            value={formatCurrency(nonAccountedExpense)}
            subtitle="Parallel operational stream"
            icon={FileSpreadsheet}
            variant="purple"
          />
          <StatCard
            title="Top Expense Category"
            value={topCat}
            subtitle={`${formatCurrency(topCatAmount)} spent`}
            icon={Tag}
            variant="amber"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* MODALS */}
      {/* 1. RECORD EXPENSE MODAL */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Expense Voucher"
        subtitle="Post company operational expense to Central Ledger."
        maxWidth="lg"
      >
        <form onSubmit={handleRecordExpenseSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expense Category *</label>
              <select
                required
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Accounting Stream *</label>
              <select
                value={stream}
                onChange={e => setStream(e.target.value as AccountingStream)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
              >
                <option value="accounted">Official Accounted Stream</option>
                <option value="non_accounted">Non-Accounted Operational Stream</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-rose-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payee / Vendor</label>
              <input
                type="text"
                placeholder="Vendor Name"
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Invoice #</label>
              <input
                type="text"
                placeholder="INV-001"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <CashBankSelector
            mode={paymentMode}
            onModeChange={setPaymentMode}
            selectedBankAccountId={bankAccountId}
            onBankChange={setBankAccountId}
          />

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description / Particulars</label>
            <input
              type="text"
              placeholder="Detailed particulars..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Post Expense Voucher
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. NEW CATEGORY MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Expense Category"
        subtitle="Create a new expense account head for accounting."
      >
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Legal & Compliance Fees"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
