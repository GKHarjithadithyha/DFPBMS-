import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '_');

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (normalized) {
    case 'active':
    case 'occupied':
    case 'settled':
    case 'verified':
    case 'paid':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
      break;

    case 'pending_approval':
    case 'open':
    case 'partially_paid':
    case 'draft':
    case 'closing':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10';
      break;

    case 'npa':
    case 'overdue':
    case 'terminated':
    case 'rejected':
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10';
      break;

    case 'closed':
    case 'vacant':
    case 'expired':
    case 'inactive':
      bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
      break;

    case 'accounted':
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/10';
      break;

    case 'non_accounted':
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/10';
      break;

    default:
      bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  let label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  if (normalized === 'npa') label = 'NPA';
  if (normalized === 'non_accounted') label = 'Non-Accounted';
  if (normalized === 'pending_approval') label = 'Pending Approval';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bgClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {label}
    </span>
  );
};
