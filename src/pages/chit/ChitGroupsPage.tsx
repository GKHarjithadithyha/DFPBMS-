import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Users, Clock, Coins, Plus, UserPlus, CheckCircle2, ShieldCheck, Layers, Award } from 'lucide-react';

interface ChitGroupsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const ChitGroupsPage: React.FC<ChitGroupsPageProps> = () => {
  const { chitGroups, chitSchemes, chitMembers, profiles, createChitGroup, enrollChitMember } = useERP();

  // Selected Group for Detailed Workspace View
  const [selectedGroupId, setSelectedGroupId] = useState<string>(chitGroups[0]?.id || '');

  // Modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Form: Create Group
  const [groupName, setGroupName] = useState('');
  const [schemeId, setSchemeId] = useState(chitSchemes[0]?.id || '');
  const [startMonthYear, setStartMonthYear] = useState('2026-04');
  const [searchTerm, setSearchTerm] = useState('');

  // Form: Enroll Member
  const [enrollProfileId, setEnrollProfileId] = useState<string>('');

  const activeGroups = chitGroups.filter(g => g.status === 'active' || g.status === 'in_progress');
  const formingGroups = chitGroups.filter(g => g.status === 'pending_approval' || g.status === 'forming');
  const totalPool = chitGroups.reduce((acc, g) => acc + (g.poolSize || (g.monthlyInstallment * g.durationMonths)), 0);

  const filteredGroups = chitGroups.filter(g => {
    const gName = g.groupName || g.schemeName || '';
    if (searchTerm && !gName.toLowerCase().includes(searchTerm.toLowerCase()) && !g.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selectedGroup = chitGroups.find(g => g.id === selectedGroupId) || chitGroups[0];
  const selectedScheme = chitSchemes.find(s => s.id === selectedGroup?.schemeId);

  // Filter members belonging to selected group
  const groupMembers = selectedGroup
    ? chitMembers.filter(m => m.groupId === selectedGroup.id || m.chitGroupId === selectedGroup.id)
    : [];

  const maxCapacity = selectedGroup?.memberCapacity || selectedGroup?.maxMembers || selectedScheme?.maxSubscribers || selectedScheme?.maxMembers || 20;

  // Available profiles to enroll (not already in this group)
  const availableProfiles = profiles.filter(p => !groupMembers.some(m => m.profileId === p.id));

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createChitGroup({ schemeId, groupName, startMonthYear });
    setIsNewGroupModalOpen(false);
    setGroupName('');
    if (created?.id) setSelectedGroupId(created.id);
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !enrollProfileId) return;
    const success = enrollChitMember(selectedGroup.id, enrollProfileId);
    if (success !== false) {
      setIsEnrollModalOpen(false);
      setEnrollProfileId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Chit Groups Workspace"
        subtitle="Manage active chit groups, subscriber enrollments, member rosters, monthly progression, and biddings."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Active Groups' }]}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Groups"
          value={activeGroups.length}
          subtitle="Running monthly cycles"
          icon={Users}
          variant="emerald"
        />
        <StatCard
          title="Forming Groups"
          value={formingGroups.length}
          subtitle="Enrolling subscribers"
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="Total Pool Capital"
          value={formatCurrency(totalPool)}
          subtitle="Combined group value"
          icon={Coins}
          variant="purple"
        />
      </div>

      {/* Chit Groups Selection Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">All Chit Groups Register</h3>
            <p className="text-xs text-slate-500">Click any group row to view its enrolled member roster & details below.</p>
          </div>
          <input
            type="text"
            placeholder="Search group name or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="p-3">Group ID</th>
                <th className="p-3">Group Name</th>
                <th className="p-3">Total Pool</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Monthly Subscription</th>
                <th className="p-3">Enrolled Members</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredGroups.map(g => {
                const isSelected = selectedGroupId === g.id;
                const mCount = chitMembers.filter(m => m.groupId === g.id || m.chitGroupId === g.id).length;

                return (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-slate-900">{g.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{g.groupName || g.schemeName}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(g.poolSize || (g.monthlyInstallment * g.durationMonths))}</td>
                    <td className="p-3 font-mono">{g.durationMonths} Months</td>
                    <td className="p-3 font-mono">{formatCurrency(g.monthlyInstallment)}</td>
                    <td className="p-3 font-mono font-semibold text-slate-800">
                      {mCount} / {g.memberCapacity || g.maxMembers || 20} Subscribers
                    </td>
                    <td className="p-3"><StatusBadge status={g.status} /></td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroupId(g.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Active View' : 'Select Group'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SELECTED CHIT GROUP MEMBER & PROFILE WORKSPACE */}
      {selectedGroup && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-150">
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedGroup.groupName || selectedGroup.schemeName}
                    </h3>
                    <span className="font-mono text-xs font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
                      {selectedGroup.id}
                    </span>
                    <StatusBadge status={selectedGroup.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Pool: <span className="font-bold text-emerald-700">{formatCurrency(selectedGroup.poolSize || (selectedGroup.monthlyInstallment * selectedGroup.durationMonths))}</span> • Monthly: <span className="font-bold text-slate-800">{formatCurrency(selectedGroup.monthlyInstallment)}</span> • Tenure: {selectedGroup.durationMonths} Months
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right text-xs font-mono pr-2 border-r border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Enrolled Roster</span>
                <span className="font-bold text-slate-900 text-sm">
                  {groupMembers.length} / {maxCapacity} Members
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEnrollProfileId(availableProfiles[0]?.id || '');
                  setIsEnrollModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Enroll Subscriber</span>
              </button>
            </div>
          </div>

          {/* Enrolled Members Roster Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Enrolled Subscribers Roster ({groupMembers.length})
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {groupMembers.filter(m => m.hasWonAuction || m.isPrized).length} Prized / {groupMembers.filter(m => !(m.hasWonAuction || m.isPrized)).length} Non-Prized
              </span>
            </div>

            {groupMembers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">No subscribers currently enrolled in this group.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEnrollProfileId(availableProfiles[0]?.id || '');
                    setIsEnrollModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enroll First Member</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="p-3">Ticket #</th>
                      <th className="p-3">Subscriber Profile</th>
                      <th className="p-3">Contact Mobile</th>
                      <th className="p-3">KYC Status</th>
                      <th className="p-3">Enrollment Date</th>
                      <th className="p-3">Total Paid</th>
                      <th className="p-3">Pending Due</th>
                      <th className="p-3">Auction Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                    {groupMembers.map((m, idx) => {
                      const profile = profiles.find(p => p.id === m.profileId);
                      const memberName = profile?.fullName || profile?.name || `Subscriber ${m.profileId}`;
                      const phone = profile?.primaryPhone || profile?.mobile || '—';
                      const isPrized = m.hasWonAuction || m.isPrized;

                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-purple-900">
                            #{m.ticketNumber || String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{memberName}</span>
                            <span className="font-mono text-[10px] text-slate-400">{m.profileId}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-800">{phone}</td>
                          <td className="p-3">
                            {(profile?.isKycVerified || m.isKycVerified) ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                Pending KYC
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{formatDate(m.joinDate)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(m.totalPaid || 0)}</td>
                          <td className="p-3 font-mono font-bold text-rose-700">
                            {formatCurrency(m.pendingDue || m.pendingDues || 0)}
                          </td>
                          <td className="p-3">
                            {isPrized ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                                <Award className="w-3 h-3 text-purple-600" />
                                <span>Prized Winner</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                Non-Prized
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW GROUP MODAL */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Create New Chit Group"
      >
        <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Identifier Name</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. CG-5L-2026-B"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Chit Scheme Master</label>
            <select
              value={schemeId}
              onChange={e => setSchemeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(false)}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>

      {/* ENROLL MEMBER MODAL */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Enroll Subscriber in ${selectedGroup?.id || ''}`}
        subtitle="Select customer profile from Profile Master directory."
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Customer Profile *</label>
            {availableProfiles.length === 0 ? (
              <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                All existing profiles in Profile Master are already enrolled in this group. Create a new profile in Profile Master first to enroll.
              </p>
            ) : (
              <select
                required
                value={enrollProfileId}
                onChange={e => setEnrollProfileId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
              >
                {availableProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName || p.name} ({p.id}) — {p.mobile || p.primaryPhone} ({p.profileType})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableProfiles.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              Confirm Member Enrollment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
