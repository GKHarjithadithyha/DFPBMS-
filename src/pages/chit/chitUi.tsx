import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Profile } from '../../types';
import { useChit } from './chitStore';
import { ChitAllocation, ChitGroupRec, PrizeStatus } from './chitTypes';
import { LedgerStatus } from './chitCalc';
import { Pill, filterCls } from '../rental/rentalUi';

export { Field, inputCls, filterCls, primaryBtn, secondaryBtn, Pill, ActionMenu, Avatar } from '../rental/rentalUi';
export type { MenuAction } from '../rental/rentalUi';

export const Section: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`bg-white rounded-xl border border-slate-200 shadow-xs ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center flex-wrap gap-2">{actions}</div>}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

export const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="flex items-start space-x-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  ) : null;

export const Money: React.FC<{ value: number; tone?: 'default' | 'good' | 'bad' | 'muted'; bold?: boolean }> = ({
  value,
  tone = 'default',
  bold,
}) => {
  const cls = { default: 'text-slate-800', good: 'text-emerald-700', bad: 'text-rose-600', muted: 'text-slate-400' }[tone];
  return (
    <span className={`font-mono tabular-nums ${cls} ${bold ? 'font-bold' : ''}`}>
      ₹{Math.round(value).toLocaleString('en-IN')}
    </span>
  );
};

export const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-slate-400 py-6 text-center">{children}</p>
);

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

export const GroupStatusPill: React.FC<{ status: ChitGroupRec['status'] }> = ({ status }) =>
  status === 'active' ? <Pill tone="green">Active</Pill> : status === 'forming' ? <Pill tone="amber">Forming</Pill> : <Pill tone="slate">Closed</Pill>;

export const AuctionStatusPill: React.FC<{ status: 'not_conducted' | 'conducted' | 'postponed' }> = ({ status }) =>
  status === 'conducted' ? <Pill tone="green">Conducted</Pill> : status === 'postponed' ? <Pill tone="amber">Postponed</Pill> : <Pill tone="slate">Not Conducted</Pill>;

export const LedgerStatusPill: React.FC<{ status: LedgerStatus }> = ({ status }) => {
  if (status === 'paid') return <Pill tone="green">Paid</Pill>;
  if (status === 'partial') return <Pill tone="amber">Partially Paid</Pill>;
  if (status === 'overdue') return <Pill tone="rose">Overdue</Pill>;
  return <Pill tone="slate">Pending</Pill>;
};

export const PRIZE_LABEL: Record<PrizeStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  disbursed: 'Disbursed',
};

export const PrizeStatusPill: React.FC<{ status: PrizeStatus }> = ({ status }) => (
  <Pill tone={status === 'pending' ? 'amber' : status === 'verified' ? 'blue' : 'green'}>{PRIZE_LABEL[status]}</Pill>
);

// ---------------------------------------------------------------------------
// Group + member helpers
// ---------------------------------------------------------------------------

export const GroupSelect: React.FC<{
  value: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const { data } = useChit();
  return (
    <select
      aria-label="Chit group"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${filterCls} font-semibold ${className}`}
    >
      {data.groups.map(g => (
        <option key={g.id} value={g.id}>
          {g.id} — {g.name}
        </option>
      ))}
    </select>
  );
};

const GROUP_KEY = 'pbms_chit_selected_group';

/** Selected group id that survives the group list changing and is shared across the Chit sections. */
export const useGroupChoice = (preferred?: string) => {
  const { data } = useChit();
  const [picked, setPicked] = useState(() => {
    if (preferred) return preferred;
    try { return sessionStorage.getItem(GROUP_KEY) || ''; } catch { return ''; }
  });
  const fallback = (data.groups.find(g => g.status === 'active') || data.groups[0])?.id || '';
  const groupId = data.groups.some(g => g.id === picked) ? picked : fallback;
  const group = data.groups.find(g => g.id === groupId);
  const setGroupId = (id: string) => {
    setPicked(id);
    try { sessionStorage.setItem(GROUP_KEY, id); } catch { /* storage unavailable */ }
  };
  return { groupId, group, setGroupId };
};

export interface MemberInfo {
  allocation: ChitAllocation;
  profile?: Profile;
  name: string;
}

export const useMemberLookup = () => {
  const { data } = useChit();
  const { profiles } = useERP();
  return useMemo(() => {
    const profileById = new Map(profiles.map(p => [p.id, p]));
    const allocById = new Map(data.allocations.map(a => [a.id, a]));
    const info = (allocationId?: string): MemberInfo | undefined => {
      const allocation = allocationId ? allocById.get(allocationId) : undefined;
      if (!allocation) return undefined;
      const profile = profileById.get(allocation.profileId);
      return { allocation, profile, name: profile?.name || allocation.profileId };
    };
    return { profileById, info, nameOf: (id?: string) => info(id)?.name || '—' };
  }, [data.allocations, profiles]);
};

export const ticketLabel = (n?: number) => (n ? `#${n}` : '—');

