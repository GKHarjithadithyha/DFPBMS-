import React from 'react';
import { PaymentMode } from '../../types';
import { useERP } from '../../context/ERPContext';
import { Landmark, Banknote } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CashBankSelectorProps {
  mode?: PaymentMode;
  selectedMode?: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  bankAccountId?: string;
  selectedBankAccountId?: string;
  selectedBankId?: string;
  onBankAccountChange?: (bankId: string) => void;
  onBankChange?: (bankId: string) => void;
  required?: boolean;
  label?: string;
}

export const CashBankSelector: React.FC<CashBankSelectorProps> = ({
  mode,
  selectedMode,
  onModeChange,
  bankAccountId,
  selectedBankAccountId,
  selectedBankId,
  onBankAccountChange,
  onBankChange,
  required = true,
  label = 'Payment Mode & Account',
}) => {
  const { bankAccounts, totalCashBalance } = useERP();
  const activeMode = mode || selectedMode || 'cash';
  const activeBankId = bankAccountId || selectedBankAccountId || selectedBankId || bankAccounts[0]?.id || 'BA-01';
  const handleBankSelect = (id: string) => {
    if (onBankAccountChange) onBankAccountChange(id);
    if (onBankChange) onBankChange(id);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {/* Mode Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onModeChange('cash')}
          className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
            activeMode === 'cash'
              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${activeMode === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Banknote className="w-4 h-4" />
            </div>
            <span className="font-semibold">Central Cash Book</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Avail: {formatCurrency(totalCashBalance)}</span>
        </button>

        <button
          type="button"
          onClick={() => onModeChange('bank')}
          className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
            activeMode === 'bank'
              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${activeMode === 'bank' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-semibold">Bank Transfer / A/c</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">{bankAccounts.length} Accounts</span>
        </button>
      </div>

      {/* Bank Account Selection (Mandatory if Bank selected per Rule BR-008) */}
      {activeMode === 'bank' && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Select Active Bank Account <span className="text-rose-500">*</span></span>
            <span className="text-[11px] text-slate-400">Updates Bank Book automatically</span>
          </div>
          <select
            value={activeBankId || ''}
            onChange={(e) => handleBankSelect(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            required={activeMode === 'bank'}
          >
            <option value="">— Select Bank Account —</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} — A/c: {b.accountNumber} (Bal: {formatCurrency(b.currentBalance)})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
