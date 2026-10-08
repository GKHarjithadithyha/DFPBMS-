import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LoanNPAPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const LoanNPAPage: React.FC<LoanNPAPageProps> = ({ onNavigate }) => {
  const { loans, getProfileById } = useERP();

  const npaLoans = loans.filter(l => l.status === 'npa');
  const totalNPAAmount = npaLoans.reduce((acc, l) => acc + l.pendingPrincipal, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Non-Performing Assets (NPA) Watchlist & Recovery"
        subtitle="Track over-due loan accounts, defaulted interest payments, collateral security enforcement, and recovery status."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Finance' }, { label: 'NPA Watchlist' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Outstanding NPA Principal"
          value={formatCurrency(totalNPAAmount)}
          subtitle={`${npaLoans.length} accounts classified as NPA`}
          icon={AlertTriangle}
          variant="rose"
        />
        <StatCard
          title="NPA Account Count"
          value={npaLoans.length}
          subtitle="Non-performing debt accounts"
          icon={ShieldAlert}
          variant="amber"
        />
        <StatCard
          title="Collateral Coverage"
          value="100%"
          subtitle="Promissory notes & title deeds held"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">NPA Classified Accounts Register</h3>
            <p className="text-xs text-slate-500">Defaulted accounts with active recovery legal notices and collateral holds</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-mono">
            {npaLoans.length} Defaulted
          </span>
        </div>

        {npaLoans.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Non-Performing Assets</p>
            <p className="text-[11px] text-slate-400 mt-1">All active loan accounts are currently regular with zero NPA defaults.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Loan ID</th>
                  <th className="p-3">Borrower</th>
                  <th className="p-3">Pending Principal</th>
                  <th className="p-3">Guarantors</th>
                  <th className="p-3">Collateral Details</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {npaLoans.map((l) => {
                  const borrower = getProfileById(l.profileId);
                  const g1 = l.guarantor1ProfileId ? getProfileById(l.guarantor1ProfileId) : null;
                  const g2 = l.guarantor2ProfileId ? getProfileById(l.guarantor2ProfileId) : null;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{borrower?.name || 'Borrower'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{borrower?.mobile || borrower?.primaryPhone}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(l.pendingPrincipal)}</td>
                      <td className="p-3 text-[11px] text-slate-600">
                        {g1 && <div>• {g1.name}</div>}
                        {g2 && <div>• {g2.name}</div>}
                        {!g1 && !g2 && <span className="text-slate-400">None</span>}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">{l.collateralDetails}</td>
                      <td className="p-3"><StatusBadge status={l.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
