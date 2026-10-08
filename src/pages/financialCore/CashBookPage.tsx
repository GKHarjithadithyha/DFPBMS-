import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBookEntry, TransactionClassification } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Filter } from 'lucide-react';

export const CashBookPage: React.FC = () => {
  const { cashBook, totalCashBalance, postCentralTransaction, userRole } = useERP();
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Voucher form state
  const [vAmount, setVAmount] = useState('');
  const [vDirection, setVDirection] = useState<'receipt' | 'payment'>('receipt');
  const [vClassification, setVClassification] = useState<TransactionClassification>('accounted');
  const [vParty, setVParty] = useState('');
  const [vDesc, setVDesc] = useState('');

  const filteredCashBook = cashBook.filter((entry) => {
    if (filterClassification === 'all') return true;
    return entry.classification === filterClassification;
  });

  const totalReceipts = cashBook
    .filter(c => c.direction === 'receipt')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPayments = cashBook
    .filter(c => c.direction === 'payment')
    .reduce((sum, c) => sum + c.amount, 0);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(vAmount);
    if (!amountNum || amountNum <= 0 || !vParty.trim()) {
      alert('Please provide valid amount and party name.');
      return;
    }

    postCentralTransaction({
      amount: amountNum,
      direction: vDirection,
      mode: 'cash',
      classification: vClassification,
      sourceModule: 'General',
      sourceRecordId: `CASH-VOUCHER-${Date.now().toString().slice(-4)}`,
      partyName: vParty,
      description: vDesc || `Cash ${vDirection} voucher`,
    });

    setIsVoucherModalOpen(false);
    setVAmount('');
    setVParty('');
    setVDesc('');
  };

  const columns: Column<CashBookEntry>[] = [
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
      render: (c) => formatDate(c.date),
    },
    {
      header: 'Party / Account Details',
      render: (c) => (
        <div>
          <span className="font-semibold text-slate-900 block">{c.partyName}</span>
          <span className="text-[11px] text-slate-400 font-mono">{c.sourceModule} • {c.sourceRecordId}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (c) => (
        <span
          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
            c.direction === 'receipt'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {c.direction === 'receipt' ? '+ RECEIPT' : '- PAYMENT'}
        </span>
      ),
    },
    {
      header: 'Classification',
      render: (c) => <StatusBadge status={c.classification} />,
    },
    {
      header: 'Amount',
      sortable: true,
      accessor: 'amount',
      className: 'text-right font-mono font-bold',
      render: (c) => (
        <span className={c.direction === 'receipt' ? 'text-emerald-700' : 'text-slate-900'}>
          {c.direction === 'receipt' ? '+' : '-'} {formatCurrency(c.amount)}
        </span>
      ),
    },
    {
      header: 'Running Cash Balance',
      sortable: true,
      accessor: 'runningBalance',
      className: 'text-right font-mono font-bold text-slate-900',
      render: (c) => formatCurrency(c.runningBalance),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central Cash Book"
        subtitle="Mandatory Central Financial Core register. Formula: Opening Cash + Receipts - Payments = Available Cash."
        breadcrumbs={[{ label: 'Financial Core' }, { label: 'Cash Book' }]}
        actions={
          <button
            type="button"
            onClick={() => setIsVoucherModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Direct Cash Voucher</span>
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Available Cash Balance"
          value={formatCurrency(totalCashBalance)}
          subtitle="Vault balance updated live by all modules"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
          className="border-emerald-200 bg-emerald-50/20"
        />
        <StatCard
          title="Total Cash Receipts"
          value={formatCurrency(totalReceipts)}
          subtitle="Cumulative inbound cash"
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Total Cash Payments"
          value={formatCurrency(totalPayments)}
          subtitle="Cumulative cash disbursements & expenses"
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <span className="text-xs font-medium text-slate-500 mr-2 flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1" /> Classification Stream:
        </span>
        <button
          type="button"
          onClick={() => setFilterClassification('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterClassification === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Entries ({cashBook.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterClassification('accounted')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterClassification === 'accounted'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Accounted Official ({cashBook.filter(c => c.classification === 'accounted').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterClassification('non_accounted')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filterClassification === 'non_accounted'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Non-Accounted Operational ({cashBook.filter(c => c.classification === 'non_accounted').length})
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        data={[...filteredCashBook].reverse()}
        columns={columns}
        searchPlaceholder="Search cash receipts, payments, parties, module..."
        exportFileName="pbms_central_cash_book"
      />

      {/* Direct Cash Voucher Modal */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Record Cash Transaction Voucher"
        subtitle="Posts directly through Central Financial Transaction Engine"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateVoucher}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs"
            >
              Post Cash Voucher
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Direction</label>
              <select
                value={vDirection}
                onChange={e => setVDirection(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="receipt">Receipt (Inbound Cash)</option>
                <option value="payment">Payment (Outbound Cash)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Classification Stream</label>
              <select
                value={vClassification}
                onChange={e => setVClassification(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="accounted">Official (Accounted)</option>
                <option value="non_accounted">Operational (Non-Accounted)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Party / Person Name *</label>
            <input
              type="text"
              placeholder="e.g. S. Ramanathan / Cashier Counter"
              value={vParty}
              onChange={e => setVParty(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Amount (₹) *</label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={vAmount}
              onChange={e => setVAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Voucher Description / Remarks</label>
            <textarea
              rows={2}
              placeholder="Details about cash transaction purpose..."
              value={vDesc}
              onChange={e => setVDesc(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
