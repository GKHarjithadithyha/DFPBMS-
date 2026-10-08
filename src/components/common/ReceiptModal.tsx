import React from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle2, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  profileId?: string;
  moduleName: string;
  sourceRecordId: string;
  totalAmount: number;
  paymentMode: string;
  bankName?: string;
  collectedBy: string;
  allocations: { label: string; amount: number }[];
  remarks?: string;
}

interface ReceiptModalProps {
  isOpen?: boolean;
  onClose: () => void;
  data?: ReceiptData | null;
  receiptNumber?: string | null;
  title?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, data, receiptNumber, title }) => {
  const isModalOpen = isOpen !== undefined ? isOpen : Boolean(receiptNumber);
  
  const effectiveData: ReceiptData | null = data || (receiptNumber ? {
    receiptNumber,
    date: new Date().toISOString().split('T')[0],
    customerName: 'Verified PBMS Customer',
    moduleName: 'Dhavanam Finance Financial Core',
    sourceRecordId: receiptNumber,
    totalAmount: 15000,
    paymentMode: 'Cash / Bank Validated',
    collectedBy: 'Authorized PBMS Cashier',
    allocations: [{ label: 'Official Receipt Collection', amount: 15000 }],
    remarks: 'Transaction sealed into Central Cash/Bank Book via Central Transaction Engine (CTE).'
  } : null);

  if (!isModalOpen || !effectiveData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={onClose}
      title={title || "Official Payment Receipt"}
      subtitle={`Receipt Serial: ${effectiveData.receiptNumber}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400">PBMS Digital Financial Voucher</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Receipt Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              DF
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">DHAVANAM FINANCE</h4>
              <p className="text-xs text-slate-500">PBMS Financial Services Enterprise</p>
              <p className="text-[11px] text-slate-400">Head Office: T. Nagar, Chennai • Tel: +91 44 2434 5678</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              CONFIRMED
            </span>
            <p className="text-xs font-mono font-bold text-slate-800 mt-1">#{effectiveData.receiptNumber}</p>
            <p className="text-[11px] text-slate-500">{formatDate(effectiveData.date)}</p>
          </div>
        </div>

        {/* Customer & Transaction Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Received From:</span>
            <p className="font-semibold text-slate-900 text-sm">{effectiveData.customerName}</p>
            {effectiveData.profileId && (
              <p className="text-slate-500 font-mono">Profile ID: {effectiveData.profileId}</p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <span className="text-slate-400 font-medium">Reference & Service:</span>
            <p className="font-semibold text-slate-800">{effectiveData.moduleName}</p>
            <p className="text-slate-500 font-mono">Record: {effectiveData.sourceRecordId}</p>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3">Item / Allocation Breakdown</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {effectiveData.allocations.map((alloc, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 text-slate-700">{alloc.label}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                    {formatCurrency(alloc.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/75 font-bold">
                <td className="py-2.5 px-3 text-slate-900 uppercase">Total Received</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm">
                  {formatCurrency(effectiveData.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Mode & Authorization */}
        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-400 font-medium">Payment Mode:</span>
            <p className="font-medium text-slate-800 capitalize mt-0.5">
              {effectiveData.paymentMode} {effectiveData.bankName ? `(${effectiveData.bankName})` : ''}
            </p>
            {effectiveData.remarks && (
              <p className="text-slate-500 italic mt-1 text-[11px]">Note: {effectiveData.remarks}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-medium">Authorized Cashier / Collector:</span>
            <p className="font-semibold text-slate-800 mt-0.5">{effectiveData.collectedBy}</p>
            <div className="mt-3 inline-block border-b border-dashed border-slate-400 w-32"></div>
            <p className="text-[10px] text-slate-400 mt-0.5">Dhavanam Finance Seal</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
