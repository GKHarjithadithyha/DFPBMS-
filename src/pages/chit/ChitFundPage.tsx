import React, { useState } from 'react';
import {
  Users,
  Award,
  Plus,
  Coins,
  History,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { ChitGroup, PaymentMode } from '../../types';

interface ChitFundPageProps {
  initialSubTab?: string;
}

export const ChitFundPage: React.FC<ChitFundPageProps> = ({ initialSubTab }) => {
  const {
    chitGroups,
    chitSchemes,
    chitMembers,
    auctionRecords,
    profiles,
    createChitGroup,
    enrollChitMember,
    collectChitInstallment,
    recordAuctionWinner,
  } = useERP();

  // Modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChitGroup | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Form states: New Group
  const [groupName, setGroupName] = useState('');
  const [schemeId, setSchemeId] = useState(chitSchemes[0]?.id || '');
  const [startMonthYear, setStartMonthYear] = useState('2026-04');

  // Form states: Enroll Member
  const [enrollProfileId, setEnrollProfileId] = useState('');

  // Form states: Conduct Auction
  const [auctionWinnerProfileId, setAuctionWinnerProfileId] = useState('');
  const [bidPrize, setBidPrize] = useState(420000);
  const [auctionPaymentMode, setAuctionPaymentMode] = useState<PaymentMode>('bank');
  const [auctionBankId, setAuctionBankId] = useState('BA-01');

  // Form states: Collect Installment
  const [installmentAmount, setInstallmentAmount] = useState(10000);
  const [installmentPenalty, setInstallmentPenalty] = useState(0);
  const [installmentMode, setInstallmentMode] = useState<PaymentMode>('cash');
  const [installmentBankId, setInstallmentBankId] = useState('BA-01');

  // Receipt Modal
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  // Filter & Search
  const [filterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const activeGroups = chitGroups.filter(g => g.status === 'active' || g.status === 'in_progress');
  const formingGroups = chitGroups.filter(g => g.status === 'pending_approval' || g.status === 'forming');
  const totalPool = chitGroups.reduce((acc, g) => acc + (g.poolSize || (g.monthlyInstallment * g.durationMonths)), 0);
  const totalMembers = chitMembers.length;

  const filteredGroups = chitGroups.filter(g => {
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    const gName = g.groupName || g.schemeName || '';
    if (searchTerm && !gName.toLowerCase().includes(searchTerm.toLowerCase()) && !g.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChitGroup({
      schemeId,
      groupName,
      startMonthYear,
    });
    setIsNewGroupModalOpen(false);
    setGroupName('');
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !enrollProfileId) return;
    enrollChitMember(selectedGroup.id, enrollProfileId);
    setIsEnrollModalOpen(false);
    setEnrollProfileId('');
  };

  const handleAuctionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !auctionWinnerProfileId) return;
    recordAuctionWinner(selectedGroup.id, auctionWinnerProfileId, bidPrize, auctionPaymentMode, auctionBankId);
    setIsAuctionModalOpen(false);
    setAuctionWinnerProfileId('');
  };

  const handleInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    const recNum = collectChitInstallment(selectedMemberId, installmentAmount, installmentPenalty, installmentMode, installmentBankId);
    setIsInstallmentModalOpen(false);
    setReceiptNumber(recNum);
  };

  const activeSubView = initialSubTab || 'chit_overview';

  const renderContent = () => {
    // 1. CHIT OVERVIEW SCREEN
    if (activeSubView === 'chit_overview') {
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
              value={totalMembers}
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
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {chitGroups.slice(0, 8).map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{g.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{g.groupName || g.schemeName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(g.poolSize || (g.monthlyInstallment * g.durationMonths))}</td>
                      <td className="p-3 font-mono">{formatCurrency(g.monthlyInstallment)}</td>
                      <td className="p-3"><StatusBadge status={g.status} /></td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup(g);
                            setIsAuctionModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        >
                          Conduct Auction
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 2. ACTIVE GROUPS SCREEN
    if (activeSubView === 'chit_groups') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Active Chit Groups Workspace"
            subtitle="Manage chit groups, enroll subscribers, track monthly progression, and trigger auction auctions."
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">All Chit Groups Register</h3>
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
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredGroups.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{g.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{g.groupName || g.schemeName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(g.poolSize || (g.monthlyInstallment * g.durationMonths))}</td>
                      <td className="p-3 font-mono">{g.durationMonths} Months</td>
                      <td className="p-3 font-mono">{formatCurrency(g.monthlyInstallment)}</td>
                      <td className="p-3"><StatusBadge status={g.status} /></td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup(g);
                            setIsEnrollModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg"
                        >
                          + Enroll
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup(g);
                            setIsAuctionModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        >
                          Auction
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 3. SCHEMES MASTER SCREEN
    if (activeSubView === 'chit_schemes') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Chit Schemes Master Directory"
            subtitle="Pre-configured chit schemes with standardized pool sizes, tenure months, foreman commission %, and dividend rules."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Schemes Master' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Configured Schemes"
              value={chitSchemes.length}
              subtitle="Standard templates"
              icon={Layers}
              variant="blue"
            />
            <StatCard
              title="Foreman Commission Rate"
              value="5.0%"
              subtitle="Regulatory capped rate"
              icon={Award}
              variant="emerald"
            />
            <StatCard
              title="Max Scheme Value"
              value={formatCurrency(Math.max(...chitSchemes.map(s => s.poolSize || 0), 2500000))}
              subtitle="Highest scheme cap"
              icon={Coins}
              variant="purple"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Standard Chit Schemes Catalogue
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Scheme ID</th>
                    <th className="p-3">Scheme Name</th>
                    <th className="p-3">Total Chit Pool</th>
                    <th className="p-3">Tenure (Months)</th>
                    <th className="p-3">Monthly Subscription</th>
                    <th className="p-3">Foreman Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {chitSchemes.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(s.poolSize || 500000)}</td>
                      <td className="p-3 font-mono">{s.durationMonths || 20} Months</td>
                      <td className="p-3 font-mono font-semibold">{formatCurrency(s.monthlyBaseInstallment || 25000)}</td>
                      <td className="p-3 font-mono text-purple-700 font-bold">{s.commissionPercent || 5}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 4. MEMBERS ROLL SCREEN
    if (activeSubView === 'chit_members') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Chit Subscriber & Member Directory"
            subtitle="Track enrolled subscribers across chit groups, ticket assignments, payment history, and prize status."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Members Roll' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Enrolled Subscribers"
              value={totalMembers}
              subtitle="Active member tickets"
              icon={Users}
              variant="emerald"
            />
            <StatCard
              title="Prized Members"
              value={chitMembers.filter(m => m.isPrized || m.hasWonAuction).length}
              subtitle="Already won auction prize"
              icon={Award}
              variant="purple"
            />
            <StatCard
              title="Non-Prized Members"
              value={chitMembers.filter(m => !m.isPrized && !m.hasWonAuction).length}
              subtitle="Eligible for future bidding"
              icon={CheckCircle2}
              variant="blue"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Subscriber Roll Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Ticket #</th>
                    <th className="p-3">Subscriber Name</th>
                    <th className="p-3">Group ID</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3">Prized Status</th>
                    <th className="p-3 text-right">Collect Installment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {chitMembers.map(m => {
                    const p = profiles.find(pr => pr.id === m.profileId);
                    const grp = chitGroups.find(g => g.id === m.groupId);
                    const isWinner = m.isPrized || m.hasWonAuction;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">Ticket #{m.ticketNumber || 1}</td>
                        <td className="p-3 font-semibold text-slate-900">{p?.name || m.profileId}</td>
                        <td className="p-3 font-mono text-slate-600">{m.groupId}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(m.totalPaid || 0)}</td>
                        <td className="p-3">
                          {isWinner ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[11px]">
                              Prized Winner
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-semibold text-[11px]">
                              Non-Prized
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (grp) setSelectedGroup(grp);
                              setSelectedMemberId(m.id);
                              setInstallmentAmount(grp?.monthlyInstallment || 10000);
                              setIsInstallmentModalOpen(true);
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                          >
                            Collect Installment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 5. AUCTION & PRIZE RECORDS SCREEN
    if (activeSubView === 'chit_auctions') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Auction Bidding & Dividend Distribution Records"
            subtitle="Audit trail of monthly auction bidding results, winning discount prizes, and member dividend payouts."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Auctions' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Auctions Conducted"
              value={auctionRecords.length}
              subtitle="Completed bidding cycles"
              icon={History}
              variant="purple"
            />
            <StatCard
              title="Cumulative Dividend Distributed"
              value={formatCurrency(auctionRecords.reduce((acc, a) => acc + (a.dividendPerMember || 0), 0))}
              subtitle="Passed to non-prized members"
              icon={Coins}
              variant="emerald"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Auction & Dividend Audit Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Auction ID</th>
                    <th className="p-3">Group ID</th>
                    <th className="p-3">Winner Subscriber</th>
                    <th className="p-3">Winning Bid Prize</th>
                    <th className="p-3">Dividend Per Member</th>
                    <th className="p-3">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {auctionRecords.map((a, idx) => {
                    const p = profiles.find(pr => pr.id === a.winnerProfileId);
                    const prizeVal = a.bidPrizeAmount || a.bidAmount || 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">AUC-{idx + 101}</td>
                        <td className="p-3 font-mono text-slate-600">{a.groupId}</td>
                        <td className="p-3 font-semibold text-slate-900">{p?.name || a.winnerName || a.winnerProfileId}</td>
                        <td className="p-3 font-mono font-bold text-purple-700">{formatCurrency(prizeVal)}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(a.dividendPerMember || 0)}</td>
                        <td className="p-3 uppercase font-mono">{a.disbursementMode || 'bank'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* MODALS */}
      {/* 1. NEW GROUP MODAL */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Create New Chit Group"
        subtitle="Initialize a new chit group based on pre-configured schemes."
      >
        <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Group Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. DHAVANAM-5L-GRP-04"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Chit Scheme *</label>
            <select
              value={schemeId}
              onChange={e => setSchemeId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              {chitSchemes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.poolSize || 500000)} ({s.durationMonths || 20} Months)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Commencement Month & Year</label>
            <input
              type="month"
              value={startMonthYear}
              onChange={e => setStartMonthYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. ENROLL MEMBER MODAL */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Enroll Subscriber in ${selectedGroup?.groupName || ''}`}
        subtitle="Assign a subscriber ticket slot to this active chit group."
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Customer Profile *</label>
            <select
              required
              value={enrollProfileId}
              onChange={e => setEnrollProfileId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">-- Select Member --</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.mobile || p.primaryPhone})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Confirm Enrollment
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. CONDUCT AUCTION MODAL */}
      <Modal
        isOpen={isAuctionModalOpen}
        onClose={() => setIsAuctionModalOpen(false)}
        title={`Conduct Monthly Auction — ${selectedGroup?.groupName || ''}`}
        subtitle="Rule BR-016: Declare winning prize bid, deduct foreman commission, and distribute member dividend."
        maxWidth="lg"
      >
        <form onSubmit={handleAuctionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Winning Member *</label>
            <select
              required
              value={auctionWinnerProfileId}
              onChange={e => setAuctionWinnerProfileId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">-- Choose Member --</option>
              {chitMembers
                .filter(m => m.groupId === selectedGroup?.id && !m.isPrized && !m.hasWonAuction)
                .map(m => {
                  const p = profiles.find(pr => pr.id === m.profileId);
                  return (
                    <option key={m.id} value={m.profileId}>
                      Ticket #{m.ticketNumber || 1}: {p?.name || m.profileId}
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Winning Prize Bid Amount (₹) *</label>
            <input
              type="number"
              required
              value={bidPrize}
              onChange={e => setBidPrize(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
            />
          </div>

          <CashBankSelector
            mode={auctionPaymentMode}
            onModeChange={setAuctionPaymentMode}
            selectedBankAccountId={auctionBankId}
            onBankChange={setAuctionBankId}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAuctionModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Disburse Prize & Distribute Dividend
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. COLLECT INSTALLMENT MODAL */}
      <Modal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        title="Collect Chit Monthly Installment"
        subtitle="Post installment payment and generate official receipt."
      >
        <form onSubmit={handleInstallmentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Installment Amount (₹) *</label>
            <input
              type="number"
              required
              value={installmentAmount}
              onChange={e => setInstallmentAmount(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Late Fee / Penalty (₹)</label>
            <input
              type="number"
              value={installmentPenalty}
              onChange={e => setInstallmentPenalty(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono"
            />
          </div>

          <CashBankSelector
            mode={installmentMode}
            onModeChange={setInstallmentMode}
            selectedBankAccountId={installmentBankId}
            onBankChange={setInstallmentBankId}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsInstallmentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Collect & Generate Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={Boolean(receiptNumber)}
        onClose={() => setReceiptNumber(null)}
        receiptNumber={receiptNumber}
      />
    </div>
  );
};
