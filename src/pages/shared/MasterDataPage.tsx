import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Landmark,
  Percent,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const MasterDataPage: React.FC = () => {
  const {
    masterData,
    updateMasterData,
    bankAccounts,
    userRole,
    resetAllData,
    sendTelegramSimulatedAlert,
  } = useERP();

  // Local Form state for settings
  const [officialRate, setOfficialRate] = useState(masterData.defaultOfficialInterestRate);
  const [nonAccountedRate, setNonAccountedRate] = useState(masterData.defaultNonAccountedInterestRate);
  const [penaltyRate, setPenaltyRate] = useState(masterData.overduePenaltyRatePercent);
  const [foremanComm, setForemanComm] = useState(masterData.chitForemanCommissionPercent);

  const [telegramBotToken, setTelegramBotToken] = useState(masterData.telegramBotToken || 'bot7294821940:AAH...');
  const [telegramChatId, setTelegramChatId] = useState(masterData.telegramChatId || '984501234');

  const [isSaved, setIsSaved] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // If user is Employee, show Access Denied
  if (userRole !== 'admin') {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Administrator Privilege Required
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Settings & Master Data configuration is restricted to Administrator role according to Rule BR-001. Please switch your active role in the top navigation bar to view or edit this console.
        </p>
      </div>
    );
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateMasterData({
      defaultOfficialInterestRate: Number(officialRate),
      defaultNonAccountedInterestRate: Number(nonAccountedRate),
      overduePenaltyRatePercent: Number(penaltyRate),
      chitForemanCommissionPercent: Number(foremanComm),
      telegramBotToken,
      telegramChatId,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestTelegram = () => {
    sendTelegramSimulatedAlert(
      'Settings Update Notification',
      `Master Data rates verified & dispatched to Telegram Chat #${telegramChatId}`,
      'master_data'
    );
    alert(`Simulated Telegram message dispatched to Chat #${telegramChatId}`);
  };

  const handleConfirmReset = () => {
    resetAllData();
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Master Data"
        subtitle="Global system parameters, interest calculation rules, bank account ledgers, and communication gateways."
        breadcrumbs={[
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Shared Platform Services' },
          { label: 'Settings' },
        ]}
      />

      {isSaved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System configurations successfully updated and sealed into Master Data registry!</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Financial Lending & Chit Parameters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Percent className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Default Financial Rates & Operational Penalties
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Official Lending Rate (% / mo) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={officialRate}
                onChange={e => setOfficialRate(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Accounted stream interest</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Non-Accounted Lending Rate (% / mo) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={nonAccountedRate}
                onChange={e => setNonAccountedRate(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Parallel stream interest</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Overdue Late Penalty (% / mo) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={penaltyRate}
                onChange={e => setPenaltyRate(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Accrued automatically post-grace</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Chit Foreman Commission (%) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={foremanComm}
                onChange={e => setForemanComm(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Deducted from auction discount</span>
            </div>
          </div>
        </div>

        {/* Section 2: Connected Bank Accounts Registry */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Authorized Company Bank Accounts
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map(b => (
              <div
                key={b.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                    {b.bankName}
                  </span>
                  <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                    {b.accountType}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500">
                  A/C: {b.accountNumber}
                  <br />
                  IFSC: {b.ifscCode}
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400 text-[11px]">Live Ledger Balance</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(b.currentBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Telegram Gateway Configuration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Telegram Notifications Bot Integration
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTestTelegram}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold"
            >
              Dispatch Test Ping
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                value={telegramBotToken}
                onChange={e => setTelegramBotToken(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Administrator Chat ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data to Initial State</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            Save All Configurations
          </button>
        </div>
      </form>

      {/* RESET CONFIRMATION MODAL */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset All PBMS Data to Default"
        subtitle="Clears local modifications and restores fresh Dhavanam Finance demo entities."
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Are you sure you want to reset all mock databases? All created loans, chits, receipts, and ledger items will revert to the factory dataset.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
