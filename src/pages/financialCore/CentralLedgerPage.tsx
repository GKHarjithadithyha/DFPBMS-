import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CentralLedgerEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BookOpen, Filter, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const CentralLedgerPage: React.FC = () => {
  const { centralLedger } = useERP();
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filtered = centralLedger.filter(entry => {
    if (streamFilter !== 'all' && entry.classification !== streamFilter) return false;
    if (moduleFilter !== 'all' && entry.sourceModule !== moduleFilter) return false;
    return true;
  });

  const accountedTotal = centralLedger
    .filter(e => e.classification === 'accounted')
    .reduce((sum, e) => sum + (e.direction === 'receipt' ? e.amount : -e.amount), 0);

  const nonAccountedTotal = centralLedger
    .filter(e => e.classification === 'non_accounted')
    .reduce((sum, e) => sum + (e.direction === 'receipt' ? e.amount : -e.amount), 0);

  const columns: Column<CentralLedgerEntry>[] = [
    {
      header: 'Voucher ID',
      accessor: 'id',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-slate-900',
    },
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (e) => formatDate(e.date),
    },
    {
      header: 'Party / Record Reference',
      render: (e) => (
        <div>
          <span className="font-semibold text-slate-900 block">{e.partyName}</span>
          <span className="text-[11px] text-slate-400 font-mono">{e.sourceRecordId}</span>
        </div>
      ),
    },
    {
      header: 'Module Source',
      sortable: true,
      accessor: 'sourceModule',
      render: (e) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {e.sourceModule}
        </span>
      ),
    },
    {
      header: 'Flow & Mode',
      render: (e) => (
        <div className="flex items-center space-x-1.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
              e.direction === 'receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {e.direction}
          </span>
          <span className="text-xs text-slate-600 capitalize">
            {e.mode} {e.bankName ? `(${e.bankName})` : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Stream Classification',
      render: (e) => <StatusBadge status={e.classification} />,
    },
    {
      header: 'Amount (₹)',
      sortable: true,
      accessor: 'amount',
      className: 'text-right font-mono font-bold',
      render: (e) => (
        <span className={e.direction === 'receipt' ? 'text-emerald-700' : 'text-slate-900'}>
          {e.direction === 'receipt' ? '+' : '-'} {formatCurrency(e.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central Financial Ledger"
        subtitle="Canonical Single Source of Truth for PBMS. All module reports and financial summaries derive strictly from this ledger."
        breadcrumbs={[{ label: 'Financial Core' }, { label: 'Central Ledger' }]}
      />

      {/* Parallel Stream Tracking Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Accounted Official Stream"
          value={formatCurrency(accountedTotal)}
          subtitle="Audit-compliant formal financial ledger"
          badge="OFFICIAL"
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
          className="border-blue-200 bg-blue-50/20"
        />
        <StatCard
          title="Non-Accounted Operational Stream"
          value={formatCurrency(nonAccountedTotal)}
          subtitle="Independent operational stream (never commingled)"
          badge="OPERATIONAL"
          icon={<BookOpen className="w-5 h-5 text-purple-600" />}
          className="border-purple-200 bg-purple-50/20"
        />
        <StatCard
          title="Total Posted Vouchers"
          value={centralLedger.length}
          subtitle="Attributable, immutable transactions"
          icon={<BookOpen className="w-5 h-5 text-slate-600" />}
        />
      </div>

      {/* Filter Matrix Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Classification:
          </span>
          <button
            type="button"
            onClick={() => setStreamFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              streamFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Both Streams ({centralLedger.length})
          </button>
          <button
            type="button"
            onClick={() => setStreamFilter('accounted')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              streamFilter === 'accounted' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Accounted Only
          </button>
          <button
            type="button"
            onClick={() => setStreamFilter('non_accounted')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              streamFilter === 'non_accounted' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Non-Accounted Only
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-500">Module:</span>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-800"
          >
            <option value="all">All Modules</option>
            <option value="Finance">Finance (Lending)</option>
            <option value="Chit Fund">Chit Fund</option>
            <option value="Rental">Rental</option>
            <option value="Expense">Expense</option>
            <option value="Investment">Investment</option>
            <option value="Receivables & Payables">Receivables & Payables</option>
            <option value="General">General / Vault</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={[...filtered].reverse()}
        columns={columns}
        searchPlaceholder="Search canonical central ledger vouchers, parties, modules..."
        exportFileName="pbms_central_ledger"
      />
    </div>
  );
};
