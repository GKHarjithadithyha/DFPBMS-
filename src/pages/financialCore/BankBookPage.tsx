import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BankBookEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Landmark, ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2 } from 'lucide-react';

export const BankBookPage: React.FC = () => {
  const { bankAccounts, bankBook } = useERP();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(bankAccounts[0]?.id || '');

  const activeAccount = bankAccounts.find(b => b.id === selectedAccountId) || bankAccounts[0];

  const filteredEntries = bankBook.filter(entry => {
    if (!selectedAccountId) return true;
    return entry.bankAccountId === selectedAccountId;
  });

  const totalReceipts = filteredEntries
    .filter(e => e.direction === 'receipt')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPayments = filteredEntries
    .filter(e => e.direction === 'payment')
    .reduce((sum, e) => sum + e.amount, 0);

  const columns: Column<BankBookEntry>[] = [
    {
      header: 'Entry ID',
      accessor: 'id',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-slate-900',
    },
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (b) => formatDate(b.date),
    },
    {
      header: 'Party / Beneficiary',
      render: (b) => (
        <div>
          <span className="font-semibold text-slate-900 block">{b.partyName}</span>
          <span className="text-[11px] text-slate-400 font-mono">{b.sourceModule} • {b.sourceRecordId}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (b) => (
        <span
          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
            b.direction === 'receipt'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {b.direction === 'receipt' ? '+ CREDIT' : '- DEBIT'}
        </span>
      ),
    },
    {
      header: 'Classification',
      render: (b) => <StatusBadge status={b.classification} />,
    },
    {
      header: 'Amount',
      sortable: true,
      accessor: 'amount',
      className: 'text-right font-mono font-bold',
      render: (b) => (
        <span className={b.direction === 'receipt' ? 'text-emerald-700' : 'text-slate-900'}>
          {b.direction === 'receipt' ? '+' : '-'} {formatCurrency(b.amount)}
        </span>
      ),
    },
    {
      header: 'Running Balance',
      sortable: true,
      accessor: 'runningBalance',
      className: 'text-right font-mono font-bold text-slate-900',
      render: (b) => formatCurrency(b.runningBalance),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central Bank Book (Multi-Account)"
        subtitle="Independent ledger per bank account. Updated automatically by all module disbursements, collections, and expense payments."
        breadcrumbs={[{ label: 'Financial Core' }, { label: 'Bank Book' }]}
      />

      {/* Bank Account Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {bankAccounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700 truncate">{acc.bankName}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">A/c: {acc.accountNumber}</p>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                {formatCurrency(acc.currentBalance)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Account Overview */}
      {activeAccount && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">{activeAccount.bankName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  {activeAccount.accountType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Account No: {activeAccount.accountNumber} • IFSC: {activeAccount.ifsc}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">Current Reconciled Balance</span>
              <p className="text-2xl font-bold font-mono text-blue-900 mt-0.5">
                {formatCurrency(activeAccount.currentBalance)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
              <span className="text-emerald-800 font-medium">Total Inbound Credits:</span>
              <span className="font-bold font-mono text-emerald-900 text-sm">+{formatCurrency(totalReceipts)}</span>
            </div>
            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100 flex items-center justify-between">
              <span className="text-rose-800 font-medium">Total Outbound Debits:</span>
              <span className="font-bold font-mono text-rose-900 text-sm">-{formatCurrency(totalPayments)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Account Transactions DataTable */}
      <DataTable
        data={[...filteredEntries].reverse()}
        columns={columns}
        searchPlaceholder={`Search transactions in ${activeAccount?.bankName}...`}
        exportFileName={`bank_book_${activeAccount?.accountNumber}`}
      />
    </div>
  );
};
