import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { Users, Award, Plus, Coins, History } from 'lucide-react';

interface ChitOverviewPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const ChitOverviewPage: React.FC<ChitOverviewPageProps> = ({ onNavigate }) => {
  const { chitGroups, chitSchemes, chitMembers, auctionRecords, createChitGroup } = useERP();

  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [schemeId, setSchemeId] = useState(chitSchemes[0]?.id || '');
  const [startMonthYear, setStartMonthYear] = useState('2026-04');

  const activeGroups = chitGroups.filter(g => g.status === 'active' || g.status === 'in_progress');
  const formingGroups = chitGroups.filter(g => g.status === 'pending_approval' || g.status === 'forming');
  const totalPool = chitGroups.reduce((acc, g) => acc + (g.poolSize || (g.monthlyInstallment * g.durationMonths)), 0);

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChitGroup({ schemeId, groupName, startMonthYear });
    setIsNewGroupModalOpen(false);
    setGroupName('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chit Fund Overview & Portfolio Metrics"
        subtitle="Executive summary of active chit groups, subscriber enrollments, pool volume, and dividend disbursements."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Overview' }]}
        actions={
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Group</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Chit Pool Size"
          value={formatCurrency(totalPool)}
          subtitle="Combined subscription capital"
          icon={Coins}
          variant="emerald"
        />
        <StatCard
          title="Active Groups"
          value={activeGroups.length}
          subtitle={`${formingGroups.length} forming groups`}
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="Enrolled Members"
          value={chitMembers.length}
          subtitle="Active tickets on roll"
          icon={Award}
          variant="purple"
        />
        <StatCard
          title="Auctions Conducted"
          value={auctionRecords.length}
          subtitle="Completed monthly biddings"
          icon={History}
          variant="amber"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Active Chit Groups Summary
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Group ID</th>
                <th className="p-3">Group Name</th>
                <th className="p-3">Total Pool</th>
                <th className="p-3">Monthly Subscription</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {chitGroups.slice(0, 10).map(g => (
                <tr key={g.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-mono font-bold text-slate-900">{g.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{g.groupName || g.schemeName}</td>
                  <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(g.poolSize || (g.monthlyInstallment * g.durationMonths))}</td>
                  <td className="p-3 font-mono">{formatCurrency(g.monthlyInstallment)}</td>
                  <td className="p-3"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for New Group */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Create New Chit Group"
      >
        <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Identifier Name</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. CG-5L-2026-B"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Chit Scheme Master</label>
            <select
              value={schemeId}
              onChange={e => setSchemeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {chitSchemes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.schemeName} ({formatCurrency(s.totalPoolValue)} Pool • {s.durationMonths} Months)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Month/Year</label>
            <input
              type="month"
              value={startMonthYear}
              onChange={e => setStartMonthYear(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
