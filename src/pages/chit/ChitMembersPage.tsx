import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { PaymentMode } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Users, Receipt } from 'lucide-react';

interface ChitMembersPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const ChitMembersPage: React.FC<ChitMembersPageProps> = () => {
  const { chitMembers, chitGroups, getProfileById, collectChitInstallment } = useERP();

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState(10000);
  const [installmentPenalty, setInstallmentPenalty] = useState(0);
  const [installmentMode, setInstallmentMode] = useState<PaymentMode>('cash');
  const [installmentBankId, setInstallmentBankId] = useState('BA-01');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  const handleOpenInstallmentModal = (memberId: string, amount: number) => {
    setSelectedMemberId(memberId);
    setInstallmentAmount(amount);
    setIsInstallmentModalOpen(true);
  };

  const handleInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    const recNum = collectChitInstallment(selectedMemberId, installmentAmount, installmentPenalty, installmentMode, installmentBankId);
    setIsInstallmentModalOpen(false);
    setReceiptNumber(recNum);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chit Members & Subscriber Roll"
        subtitle="Individual subscriber tickets across active chit groups, installment collections, and dividend credits."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Members Roll' }]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Enrolled Subscribers Directory</h3>
            <p className="text-xs text-slate-500">Collect monthly chit subscriptions and issue official receipts</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
            {chitMembers.length} Active Tickets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Ticket ID</th>
                <th className="p-3">Subscriber</th>
                <th className="p-3">Chit Group</th>
                <th className="p-3">Ticket No</th>
                <th className="p-3">Monthly Due</th>
                <th className="p-3">Prize Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {chitMembers.map(m => {
                const profile = getProfileById(m.profileId);
                const group = chitGroups.find(g => g.id === m.chitGroupId);

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{m.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{profile?.name || 'Subscriber'}</td>
                    <td className="p-3 font-mono">{group?.groupName || m.chitGroupId}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">#{m.ticketNumber}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(group?.monthlyInstallment || 10000)}</td>
                    <td className="p-3">
                      {m.hasWonAuction ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                          Prize Winner (Month {m.wonAuctionMonth})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          Non-Prized
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenInstallmentModal(m.id, group?.monthlyInstallment || 10000)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        Collect Subscription
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        title="Collect Chit Subscription Payment"
      >
        <form onSubmit={handleInstallmentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Subscription Amount (₹)</label>
            <input
              type="number"
              value={installmentAmount}
              onChange={e => setInstallmentAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-700 mb-1">Late Fee / Penalty (₹)</label>
            <input
              type="number"
              value={installmentPenalty}
              onChange={e => setInstallmentPenalty(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-rose-200 rounded-xl font-mono focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <CashBankSelector
            mode={installmentMode}
            bankAccountId={installmentBankId}
            onModeChange={setInstallmentMode}
            onBankAccountChange={setInstallmentBankId}
            label="Receiving Cash/Bank Account"
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInstallmentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Submit & Print Receipt
            </button>
          </div>
        </form>
      </Modal>

      {receiptNumber && (
        <ReceiptModal
          data={{
            receiptNumber,
            date: new Date().toISOString().slice(0, 10),
            customerName: 'Chit Subscriber',
            moduleName: 'Chit Fund Module',
            sourceRecordId: selectedMemberId,
            totalAmount: installmentAmount + installmentPenalty,
            paymentMode: installmentMode.toUpperCase(),
            collectedBy: 'Administrator',
            allocations: [
              { label: 'Monthly Subscription', amount: installmentAmount },
              { label: 'Late Fee / Penalty', amount: installmentPenalty },
            ].filter(a => a.amount > 0),
          }}
          onClose={() => setReceiptNumber(null)}
        />
      )}
    </div>
  );
};
