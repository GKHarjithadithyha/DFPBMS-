import React, { useState } from 'react';
import { CollectionScheduleItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AlertCircle, CheckCircle2, Clock, Edit3, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface CollectionScheduleTableProps {
  schedule: CollectionScheduleItem[];
  onUpdateSchedule?: (updated: CollectionScheduleItem[]) => void;
  readOnly?: boolean;
}

export const CollectionScheduleTable: React.FC<CollectionScheduleTableProps> = ({
  schedule,
  onUpdateSchedule,
  readOnly = false,
}) => {
  // State to control visible schedule rows (3 by default, expand to all)
  const [isExpanded, setIsExpanded] = useState(false);

  // State for active row editing of penalty or payment by installmentNumber
  const [editingInstallment, setEditingInstallment] = useState<number | null>(null);
  const [editPenalty, setEditPenalty] = useState<string>('0');
  const [editAmountPaid, setEditAmountPaid] = useState<string>('0');

  // Tooltip hover state
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  // Helper to dynamically calculate overdue days from due date and current date
  const getOverdueDays = (dueDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - due.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  const handleStartEdit = (installmentNumber: number) => {
    const item = schedule.find(s => s.installmentNumber === installmentNumber);
    if (!item) return;
    setEditingInstallment(installmentNumber);
    setEditPenalty(String(item.penalty || 0));
    // Pre-fill with existing payment or total due for easy editing
    setEditAmountPaid(String(item.amountPaid > 0 ? item.amountPaid : item.totalDue));
  };

  const handleSaveEdit = (installmentNumber: number) => {
    if (!onUpdateSchedule) return;

    const penaltyNum = Number(editPenalty) || 0;
    const paidNum = Number(editAmountPaid) || 0;

    const updated = schedule.map((item) => {
      if (item.installmentNumber !== installmentNumber) return item;

      const totalDue = Math.round(item.principal + item.interest + penaltyNum);
      const balance = Math.max(0, totalDue - paidNum);

      const overdueDays = getOverdueDays(item.dueDate);
      let status: CollectionScheduleItem['status'] = item.status;

      if (paidNum >= totalDue && totalDue > 0) {
        status = 'PAID';
      } else if (paidNum > 0 && paidNum < totalDue) {
        status = 'PARTIAL';
      } else if (overdueDays > 0) {
        status = 'OVERDUE';
      } else {
        status = 'PENDING';
      }

      return {
        ...item,
        penalty: penaltyNum,
        totalDue,
        amountPaid: paidNum,
        balance,
        status,
        overdueDays,
      };
    });

    onUpdateSchedule(updated);
    setEditingInstallment(null);
  };

  const handleQuickMarkPaid = (installmentNumber: number) => {
    if (!onUpdateSchedule) return;

    const updated = schedule.map((item) => {
      if (item.installmentNumber !== installmentNumber) return item;
      return {
        ...item,
        amountPaid: item.totalDue,
        balance: 0,
        status: 'PAID' as const,
      };
    });

    onUpdateSchedule(updated);
  };

  // Aggregated totals across full schedule
  const totalPrincipal = schedule.reduce((sum, item) => sum + item.principal, 0);
  const totalOfficialInterest = schedule.reduce(
    (sum, item) => sum + (item.officialInterest !== undefined ? item.officialInterest : Math.round(item.interest * 0.67)),
    0
  );
  const totalOperationalInterest = schedule.reduce(
    (sum, item) => sum + (item.operationalInterest !== undefined ? item.operationalInterest : Math.round(item.interest * 0.33)),
    0
  );
  const totalPenalty = schedule.reduce((sum, item) => sum + item.penalty, 0);
  const totalDueAmount = schedule.reduce((sum, item) => sum + item.totalDue, 0);
  const totalPaid = schedule.reduce((sum, item) => sum + item.amountPaid, 0);
  const totalBalance = schedule.reduce((sum, item) => sum + item.balance, 0);

  // Sliced list for display (3 by default)
  const visibleSchedule = isExpanded ? schedule : schedule.slice(0, 3);
  const hasMore = schedule.length > 3;

  return (
    <div className="space-y-3">
      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">#</th>
              <th className="p-3">Due Date</th>
              <th className="p-3 text-right">Principal (₹)</th>
              <th className="p-3 text-right text-blue-900">Official Int (₹)</th>
              <th className="p-3 text-right text-amber-900">Operational Int (₹)</th>
              <th className="p-3 text-right">Penalty (₹)</th>
              <th className="p-3 text-right font-bold text-slate-900">Total Due (₹)</th>
              <th className="p-3 text-right">Amount Paid (₹)</th>
              <th className="p-3 text-right font-bold text-slate-900">Balance (₹)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-slate-400">
                  No collection schedule generated yet. Enter loan details to generate schedule.
                </td>
              </tr>
            ) : (
              visibleSchedule.map((row, idx) => {
                const overdueDays = getOverdueDays(row.dueDate);
                const isPaid = row.status === 'PAID' || (row.totalDue > 0 && row.amountPaid >= row.totalDue);
                const isPartial = !isPaid && (row.status === 'PARTIAL' || (row.amountPaid > 0 && row.amountPaid < row.totalDue));
                const isOverdue = !isPaid && !isPartial && (row.status === 'OVERDUE' || overdueDays > 0);
                const isEditing = editingInstallment === row.installmentNumber;

                const offInt = row.officialInterest !== undefined ? row.officialInterest : Math.round(row.interest * 0.67);
                const opInt = row.operationalInterest !== undefined ? row.operationalInterest : Math.round(row.interest * 0.33);

                return (
                  <tr
                    key={row.installmentNumber}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isOverdue ? 'bg-rose-50/20' : isPartial ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* # */}
                    <td className="p-3 text-center font-mono font-semibold text-slate-500">
                      {row.installmentNumber}
                    </td>

                    {/* Due Date */}
                    <td className="p-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                      {row.dueDate}
                    </td>

                    {/* Principal */}
                    <td className="p-3 text-right font-mono text-slate-700">
                      {formatCurrency(row.principal)}
                    </td>

                    {/* Official Interest */}
                    <td className="p-3 text-right font-mono text-blue-700 font-medium">
                      {formatCurrency(offInt)}
                    </td>

                    {/* Operational Interest (New Column) */}
                    <td className="p-3 text-right font-mono text-amber-700 font-medium">
                      {formatCurrency(opInt)}
                    </td>

                    {/* Penalty */}
                    <td className="p-3 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPenalty}
                          onChange={e => setEditPenalty(e.target.value)}
                          className="w-20 px-1.5 py-0.5 text-right border border-rose-300 rounded bg-white text-rose-800 font-bold focus:ring-1 focus:ring-rose-500"
                        />
                      ) : row.penalty > 0 ? (
                        <span className="font-bold text-rose-700">{formatCurrency(row.penalty)}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Total Due */}
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(row.totalDue)}
                    </td>

                    {/* Amount Paid */}
                    <td className="p-3 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editAmountPaid}
                          onChange={e => setEditAmountPaid(e.target.value)}
                          className="w-24 px-1.5 py-0.5 text-right border border-emerald-300 rounded bg-white text-emerald-800 font-bold focus:ring-1 focus:ring-emerald-500"
                        />
                      ) : row.amountPaid > 0 ? (
                        <span className={`font-semibold ${isPartial ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {formatCurrency(row.amountPaid)}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="p-3 text-right font-mono font-bold">
                      {row.balance > 0 ? (
                        <span className={isOverdue ? 'text-rose-700' : isPartial ? 'text-amber-800' : 'text-slate-900'}>
                          {formatCurrency(row.balance)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">₹0</span>
                      )}
                    </td>

                    {/* Status: PAID (green), PARTIAL (yellow), OVERDUE (rose with hover tooltip), PENDING (slate) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {isPaid ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>PAID</span>
                        </span>
                      ) : isPartial ? (
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setHoveredRowIndex(idx)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                        >
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs cursor-pointer hover:bg-amber-200 transition-colors">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>PARTIAL</span>
                            {overdueDays > 0 && <Info className="w-2.5 h-2.5 text-amber-700" />}
                          </span>

                          {overdueDays > 0 && hoveredRowIndex === idx && (
                            <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-all animate-in fade-in zoom-in-95">
                              <span>Partially paid ({overdueDays} days overdue)</span>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          )}
                        </div>
                      ) : isOverdue ? (
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setHoveredRowIndex(idx)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                        >
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 cursor-pointer shadow-2xs hover:bg-rose-200 transition-colors">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>OVERDUE</span>
                            <Info className="w-2.5 h-2.5 text-rose-600" />
                          </span>

                          {/* Hover Tooltip (dynamically calculated overdue days) */}
                          {hoveredRowIndex === idx && (
                            <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-all animate-in fade-in zoom-in-95">
                              <span>{overdueDays} days overdue</span>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {readOnly ? (
                        <span className="text-[11px] text-slate-400">—</span>
                      ) : isEditing ? (
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(row.installmentNumber)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInstallment(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : isPaid ? (
                        <span className="text-[11px] text-emerald-700 font-semibold">Settled ✓</span>
                      ) : (
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(row.installmentNumber)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1"
                            title="Record payment or enter partial amount"
                          >
                            Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickMarkPaid(row.installmentNumber)}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Quick Full Settlement"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer with Summary */}
          {schedule.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-[11px] text-slate-900">
                <td colSpan={2} className="p-3 uppercase tracking-wider text-slate-700">
                  Total ({schedule.length} cycles)
                </td>
                <td className="p-3 text-right font-mono">{formatCurrency(totalPrincipal)}</td>
                <td className="p-3 text-right font-mono text-blue-800">{formatCurrency(totalOfficialInterest)}</td>
                <td className="p-3 text-right font-mono text-amber-800">{formatCurrency(totalOperationalInterest)}</td>
                <td className="p-3 text-right font-mono text-rose-800">{formatCurrency(totalPenalty)}</td>
                <td className="p-3 text-right font-mono font-black">{formatCurrency(totalDueAmount)}</td>
                <td className="p-3 text-right font-mono text-emerald-800">{formatCurrency(totalPaid)}</td>
                <td className="p-3 text-right font-mono font-black text-rose-900">{formatCurrency(totalBalance)}</td>
                <td colSpan={2} className="p-3 text-center text-slate-500 font-normal">
                  {schedule.filter(s => s.status === 'PAID').length} Paid • {schedule.filter(s => s.status === 'PARTIAL').length} Partial
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Show More / Show Less Toggle Button */}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs hover:border-slate-300"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Show Less Schedules</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Show More ({schedule.length - 3} More Schedules)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
