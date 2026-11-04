import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { closureChecklist, groupStats } from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import { FormError, Money, Pill, Section, primaryBtn } from './chitUi';

export const FinancialKpis: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const s = useMemo(() => groupStats(data, group), [data, group]);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Expected Collections" value={inr(s.expectedToDate)} subtitle={`Instalments + penalties to month ${group.currentMonth}`} />
      <StatCard title="Actual Collections" value={inr(s.collected)} subtitle={s.expectedToDate ? `${Math.round((s.collected / s.expectedToDate) * 100)}% of expected` : '—'} />
      <StatCard title="Outstanding Dues" value={inr(Math.max(0, s.outstanding))} subtitle="Still to be collected" />
      <StatCard title="Auction Discounts" value={inr(s.discounts)} subtitle={`${s.auctionsConducted} auction${s.auctionsConducted === 1 ? '' : 's'} conducted`} />
      <StatCard title="Company Commission" value={inr(s.commission)} subtitle="On auction discounts" />
      <StatCard title="Dividends Distributed" value={inr(s.dividendsCredited)} subtitle={`of ${inr(s.distributable)} distributable`} />
      <StatCard title="Prizes Disbursed" value={inr(s.prizesDisbursed)} subtitle={`of ${inr(s.prizesDue)} awarded`} />
      <StatCard title="Remaining Liabilities" value={inr(s.liabilities)} subtitle="Prizes + dividends still owed" />
    </div>
  );
};

const Line: React.FC<{ label: string; value: number; sub?: string; strong?: boolean; tone?: 'default' | 'good' | 'bad' }> = ({ label, value, sub, strong, tone }) => (
  <div className={`flex items-start justify-between gap-3 py-2 ${strong ? 'border-t border-slate-200' : ''}`}>
    <div>
      <div className={strong ? 'font-bold text-slate-900' : 'text-slate-700'}>{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
    <Money value={value} bold={strong} tone={tone} />
  </div>
);

export const SettlementStatement: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data } = useChit();
  const s = useMemo(() => groupStats(data, group), [data, group]);
  const undistributed = s.distributable - s.dividendsCredited;
  const prizePending = s.prizesDue - s.prizesDisbursed;
  return (
    <Section title="Final Settlement Summary" subtitle={`${group.name} · ${group.id}`}>
      <div className="text-xs divide-y divide-slate-100">
        <div className="pb-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1">Received</h4>
          <Line label="Instalments & penalties collected" value={s.collected} tone="good" />
          <Line label="Outstanding dues still receivable" value={Math.max(0, s.outstanding)} tone={s.outstanding > 0 ? 'bad' : 'default'} />
        </div>
        <div className="py-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">Paid out</h4>
          <Line label="Prize amounts disbursed" value={s.prizesDisbursed} />
          <Line label="Dividends credited to members" value={s.dividendsCredited} />
        </div>
        <div className="py-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">Company</h4>
          <Line label="Commission earned" value={s.commission} sub="% of each auction discount" tone="good" />
          <Line label="Penalties levied" value={s.penaltiesLevied} sub="Included in collections once paid" />
        </div>
        <div className="pt-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">Remaining liabilities</h4>
          <Line label="Prize amounts not yet disbursed" value={prizePending} />
          <Line label="Dividends not yet credited" value={undistributed} sub={`Of which unallocated ₹${Math.max(0, s.distributable - s.dividendsAllocated).toLocaleString('en-IN')}`} />
          <Line label="Total remaining liabilities" value={s.liabilities} strong tone={s.liabilities > 0 ? 'bad' : 'good'} />
        </div>
      </div>
    </Section>
  );
};

export const ClosureChecklist: React.FC<{ group: ChitGroupRec }> = ({ group }) => {
  const { data, setClosureCheck, closeGroup } = useChit();
  const items = useMemo(() => closureChecklist(data, group), [data, group]);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = group.status === 'closed';
  const ready = items.every(i => i.passed);

  return (
    <Section
      title="Reconciliation & Closure Checklist"
      subtitle="Automatic checks come from the ledgers; the last two are operator confirmations"
      actions={
        closed ? <Pill tone="slate">Closed {group.closedOn ? formatDate(group.closedOn) : ''}</Pill> : ready ? <Pill tone="green">Ready to close</Pill> : <Pill tone="amber">Open</Pill>
      }
    >
      <ul className="divide-y divide-slate-100 text-xs">
        {items.map(i => (
          <li key={i.key} className="flex items-start gap-3 py-2.5">
            {i.manual ? (
              <input
                type="checkbox"
                aria-label={i.label}
                checked={i.passed}
                disabled={closed}
                onChange={e => setClosureCheck(group.id, i.key, e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
            ) : i.passed ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-label="Passed" />
            ) : (
              <Circle className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" aria-label="Not yet" />
            )}
            <div className="flex-1">
              <div className={`font-semibold ${i.passed ? 'text-slate-800' : 'text-slate-600'}`}>{i.label}</div>
              <div className="text-[11px] text-slate-500">{i.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        <FormError message={error} />
        <div className="flex justify-end">
          <button type="button" className={primaryBtn} disabled={closed || !ready} onClick={() => { setError(null); setConfirm(true); }}>
            <Lock className="w-4 h-4" />
            <span>{closed ? 'Group Closed' : 'Close Group'}</span>
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          const res = closeGroup(group.id);
          setConfirm(false);
          if (!res.ok) setError(res.error);
        }}
        title={`Close ${group.name}?`}
        description="The group moves to Closed and no further entries can be made against it."
        confirmText="Close Group"
        variant="warning"
      />
    </Section>
  );
};

export const GroupFinancialSummary: React.FC<{ group: ChitGroupRec }> = ({ group }) => (
  <div className="space-y-5">
    <FinancialKpis group={group} />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <SettlementStatement group={group} />
      <ClosureChecklist group={group} />
    </div>
  </div>
);
