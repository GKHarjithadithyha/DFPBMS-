import React from 'react';
import { useERP } from '../context/ERPContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  CreditCard,
  Users2,
  Building,
  TrendingUp,
  AlertTriangle,
  Receipt,
  PlusCircle,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tabId: string, recordId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    userRole,
    profiles,
    loans,
    chitGroups,
    childProperties,
    investments,
    receivables,
    payables,
    totalCashBalance,
    totalBankBalance,
    centralLedger,
  } = useERP();

  // Metrics Calculations
  const activeLoans = loans.filter(l => l.status === 'active');
  const closedLoans = loans.filter(l => l.status === 'closed');
  const npaLoans = loans.filter(l => l.status === 'npa' || l.isNpa);
  const pendingApprovalLoans = loans.filter(l => l.status === 'pending_approval');

  const totalOutstandingLoanPrincipal = activeLoans.reduce((sum, l) => sum + l.pendingPrincipal, 0);
  const totalPrincipalCollected = loans.reduce((sum, l) => sum + l.totalPrincipalCollected, 0);
  const totalOfficialInterestCollected = loans.reduce((sum, l) => sum + l.totalOfficialInterestCollected, 0);
  const totalNonAccountedInterestCollected = loans.reduce((sum, l) => sum + l.totalNonAccountedInterestCollected, 0);

  // Ageing Buckets calculation for overdue items
  const ageingBuckets = {
    b1_30: 125000,
    b31_60: 85000,
    b61_90: 45000,
    b90_plus: 250000, // NPA loans
  };

  const occupiedProperties = childProperties.filter(p => p.status === 'occupied').length;
  const vacantProperties = childProperties.filter(p => p.status === 'vacant').length;
  const activeChitMembers = chitGroups.reduce((sum, g) => sum + g.enrolledMembersCount, 0);

  const overdueReceivablesTotal = receivables
    .filter(r => r.status === 'overdue')
    .reduce((sum, r) => sum + r.balanceOutstanding, 0);

  const recentTransactions = centralLedger.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Executive Management Dashboard"
        subtitle="Consolidated real-time operational overview across all 6 business lines and Central Financial Core."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ● Active Enterprise System
          </span>
        }
        actions={
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Loan Origination</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('expense')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>
        }
      />

      {/* Top Banner: Central Financial Engine Live Position */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('cash_book')}
          className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            <span>Central Cash Book</span>
            <Wallet className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="mt-3 text-3xl font-bold font-sans tracking-tight">
            {formatCurrency(totalCashBalance)}
          </div>
          <p className="mt-2 text-xs text-emerald-100/80">
            Available physical cash balance in vault. Updated live by collections & expenses.
          </p>
        </div>

        <div
          onClick={() => onNavigate('bank_book')}
          className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <span>Central Bank Accounts</span>
            <Landmark className="w-4 h-4 text-blue-300" />
          </div>
          <div className="mt-3 text-3xl font-bold font-sans tracking-tight">
            {formatCurrency(totalBankBalance)}
          </div>
          <p className="mt-2 text-xs text-blue-100/80">
            Reconciled multi-account total across HDFC, SBI, and ICICI bank accounts.
          </p>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-2xl p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between text-purple-200 text-xs font-semibold uppercase tracking-wider">
            <span>Dual Stream Tracking</span>
            <span className="text-[10px] bg-purple-600/60 px-2 py-0.5 rounded font-mono">PARALLEL</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-sm">
            <span className="text-purple-200">Accounted Interest:</span>
            <span className="font-bold text-white font-mono">{formatCurrency(totalOfficialInterestCollected)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-sm">
            <span className="text-purple-200">Non-Accounted Interest:</span>
            <span className="font-bold text-purple-100 font-mono">{formatCurrency(totalNonAccountedInterestCollected)}</span>
          </div>
          <p className="mt-2 text-[11px] text-purple-200/80 border-t border-purple-500/40 pt-1.5">
            Strictly separated end-to-end per Rule BR-005. Never merged into one figure.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Active Loans"
          value={activeLoans.length}
          subtitle={`Principal: ${formatCurrency(totalOutstandingLoanPrincipal)}`}
          icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
          onClick={() => onNavigate('finance')}
        />
        <StatCard
          title="Profiles Master"
          value={profiles.length}
          subtitle="Single shared identity"
          icon={<Users2 className="w-4 h-4 text-indigo-600" />}
          onClick={() => onNavigate('profiles')}
        />
        <StatCard
          title="Rental Occupancy"
          value={`${occupiedProperties}/${childProperties.length}`}
          subtitle={`${vacantProperties} units vacant`}
          icon={<Building className="w-4 h-4 text-blue-600" />}
          onClick={() => onNavigate('rental')}
        />
        <StatCard
          title="Chit Members"
          value={activeChitMembers}
          subtitle={`${chitGroups.length} active groups`}
          icon={<Users2 className="w-4 h-4 text-amber-600" />}
          onClick={() => onNavigate('chit')}
        />
        <StatCard
          title="NPA Accounts"
          value={npaLoans.length}
          subtitle=">90 days overdue"
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          badge={formatCurrency(npaLoans.reduce((sum, l) => sum + l.pendingPrincipal, 0))}
          onClick={() => onNavigate('finance')}
        />
        <StatCard
          title="Investments"
          value={investments.filter(i => i.status === 'active').length}
          subtitle={`Assets: ${formatCurrency(investments.filter(i => i.status === 'active').reduce((s, i) => s + i.amount, 0))}`}
          icon={<TrendingUp className="w-4 h-4 text-teal-600" />}
          onClick={() => onNavigate('investment')}
        />
      </div>

      {/* Overdue Ageing & Approvals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Ageing Analysis */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Outstanding Ageing Analysis (Days Overdue)</h3>
              <p className="text-xs text-slate-500">Customer-wise and bucket breakdown across loan and receivable books</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
              Total Overdue: {formatCurrency(ageingBuckets.b1_30 + ageingBuckets.b31_60 + ageingBuckets.b61_90 + ageingBuckets.b90_plus)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                1 – 30 Days
              </span>
              <span className="text-lg font-bold text-slate-900 font-sans block mt-1">
                {formatCurrency(ageingBuckets.b1_30)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Standard Follow-up</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                31 – 60 Days
              </span>
              <span className="text-lg font-bold text-amber-900 font-sans block mt-1">
                {formatCurrency(ageingBuckets.b31_60)}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">Telegram Alert Sent</span>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700 block">
                61 – 90 Days
              </span>
              <span className="text-lg font-bold text-orange-900 font-sans block mt-1">
                {formatCurrency(ageingBuckets.b61_90)}
              </span>
              <span className="text-[11px] text-orange-700 font-medium">Escalation Notice</span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
                90+ Days (NPA)
              </span>
              <span className="text-lg font-bold text-rose-900 font-sans block mt-1">
                {formatCurrency(ageingBuckets.b90_plus)}
              </span>
              <span className="text-[11px] text-rose-700 font-medium">Legal / Collateral Action</span>
            </div>
          </div>

          {/* Pending Approvals Quick Queue */}
          {pendingApprovalLoans.length > 0 && (
            <div className="mt-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  !
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {pendingApprovalLoans.length} Loan Application(s) Awaiting Administrator Sanction
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    {pendingApprovalLoans.map(l => `${l.id} (₹${l.principalAmount.toLocaleString('en-IN')})`).join(', ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('finance')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                Review & Sanction
              </button>
            </div>
          )}
        </div>

        {/* Collections Breakdown Box */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Collections Summary</h3>
            <p className="text-xs text-slate-500">Cumulative split across principal & dual-stream interest</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-600">Principal Collected:</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {formatCurrency(totalPrincipalCollected)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                <span className="text-xs text-blue-900 font-medium">Official Interest (Accounted):</span>
                <span className="text-xs font-bold text-blue-800 font-mono">
                  {formatCurrency(totalOfficialInterestCollected)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                <span className="text-xs text-purple-900 font-medium">Operational Interest (Non-Accounted):</span>
                <span className="text-xs font-bold text-purple-800 font-mono">
                  {formatCurrency(totalNonAccountedInterestCollected)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">All-Time Net Inflow</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {formatCurrency(totalPrincipalCollected + totalOfficialInterestCollected + totalNonAccountedInterestCollected)}
            </span>
          </div>
        </div>
      </div>

      {/* Live Transaction Ledger Feed */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Central Ledger Movements</h3>
            <p className="text-xs text-slate-500">Unified posting stream directly from the Central Transaction Engine</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('central_ledger')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            View Full Central Ledger →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => onNavigate('central_ledger')}
              className="p-3.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors text-xs"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.direction === 'receipt'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {tx.direction === 'receipt' ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900">{tx.partyName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                      {tx.sourceModule}
                    </span>
                    <StatusBadge status={tx.classification} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tx.description}</p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`font-bold font-mono text-sm block ${
                    tx.direction === 'receipt' ? 'text-emerald-700' : 'text-slate-900'
                  }`}
                >
                  {tx.direction === 'receipt' ? '+' : '-'} {formatCurrency(tx.amount)}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {tx.mode} {tx.bankName ? `(${tx.bankName})` : ''} • {formatDate(tx.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
