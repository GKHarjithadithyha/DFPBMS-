import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { nextTicket } from './chitCalc';
import { ChitGroupRec } from './chitTypes';
import { Avatar, FormError, Money, Pill, ActionMenu, MenuAction, primaryBtn, secondaryBtn, inputCls, useMemberLookup } from './chitUi';

interface Props {
  group: ChitGroupRec;
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

interface Row {
  id: string;
  ticket: number;
  name: string;
  profileId: string;
  contribution: number;
  status: string;
  statusTone: 'green' | 'amber' | 'purple' | 'slate';
  removable: boolean;
}

export const MemberAllocationView: React.FC<Props> = ({ group, onNavigate }) => {
  const { data, allocateMembers, removeAllocation } = useChit();
  const { profiles } = useERP();
  const lookup = useMemberLookup();

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const allocations = data.allocations.filter(a => a.groupId === group.id);
  const slotsLeft = group.totalMembers - allocations.length;
  const pct = Math.round((allocations.length / group.totalMembers) * 100);

  const rows: Row[] = useMemo(
    () =>
      allocations
        .slice()
        .sort((a, b) => a.ticketNumber - b.ticketNumber)
        .map(a => {
          const won = data.auctions.find(x => x.groupId === group.id && x.winnerAllocationId === a.id);
          let status = group.status === 'forming' ? 'Allocated' : 'Active';
          let statusTone: Row['statusTone'] = group.status === 'forming' ? 'amber' : 'green';
          if (won) { status = `Prize won · M${won.month}`; statusTone = 'purple'; }
          if (group.status === 'closed') { status = 'Closed'; statusTone = 'slate'; }
          return {
            id: a.id,
            ticket: a.ticketNumber,
            name: lookup.nameOf(a.id),
            profileId: a.profileId,
            contribution: a.monthlyContribution,
            status,
            statusTone,
            removable: !won,
          };
        }),
    [allocations, data.auctions, group.id, group.status, lookup]
  );

  const columns: Column<Row>[] = [
    { header: 'Ticket No.', accessor: 'ticket', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-slate-900">#{r.ticket}</span> },
    {
      header: 'Member Name',
      accessor: 'name',
      sortable: true,
      render: (_v, r) => (
        <div className="flex items-center space-x-2.5">
          <Avatar name={r.name} />
          <span className="font-semibold text-slate-900">{r.name}</span>
        </div>
      ),
    },
    { header: 'Master Profile ID', accessor: 'profileId', render: (_v, r) => <span className="font-mono text-slate-600">{r.profileId}</span> },
    { header: 'Monthly Contribution', accessor: 'contribution', className: 'text-right', render: (_v, r) => <Money value={r.contribution} /> },
    { header: 'Allocation Status', accessor: 'status', render: (_v, r) => <Pill tone={r.statusTone}>{r.status}</Pill> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => {
        const actions: MenuAction[] = [
          { label: 'View Profile', icon: UserCheck, onClick: () => setViewProfileId(r.profileId) },
        ];
        if (group.status !== 'closed' && r.removable) {
          actions.push({ label: 'Remove Ticket', icon: Trash2, tone: 'danger', onClick: () => { setRemoveError(null); setRemoveId(r.id); } });
        }
        return <div className="flex justify-end"><ActionMenu actions={actions} /></div>;
      },
    },
  ];


  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Group capacity</span>
            <span className="text-sm font-bold text-slate-900">
              {allocations.length} <span className="text-slate-400 font-medium">of {group.totalMembers} tickets allocated</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={allocations.length} aria-valuemax={group.totalMembers}>
            <div className={`h-2 rounded-full ${slotsLeft === 0 ? 'bg-emerald-600' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft > 1 ? 's' : ''} open` : 'Group is fully allocated'} · members come from the Profile Master
          </p>
        </div>
        <button
          type="button"
          className={primaryBtn}
          disabled={slotsLeft === 0 || group.status === 'closed'}
          onClick={() => setAllocateOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          <span>Allocate Members</span>
        </button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        printable
        searchPlaceholder="Search member, profile ID, ticket..."
        exportFileName={`chit_${group.id}_allocation`}
        printTitle={`${group.name} — Member Allocation`}
        emptyTitle="No members allocated yet"
        emptySubtitle="Use Allocate Members to pick existing Master Profile records for this group."
      />

      {allocateOpen && <AllocateModal group={group} onClose={() => setAllocateOpen(false)} />}

      {viewProfileId && <MemberProfileModal profileId={viewProfileId} onClose={() => setViewProfileId(null)} onNavigate={onNavigate} />}

      <ConfirmDialog
        isOpen={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          const res = removeAllocation(removeId!);
          if (res.ok) setRemoveId(null);
          else setRemoveError(res.error);
        }}
        title="Remove this ticket?"
        description="The ticket is released so it can be allocated to another member. Tickets with ledger activity cannot be removed."
        confirmText="Remove Ticket"
        variant="danger"
      >
        <FormError message={removeError} />
      </ConfirmDialog>
    </div>
  );
};

const AllocateModal: React.FC<{ group: ChitGroupRec; onClose: () => void }> = ({ group, onClose }) => {
  const { data, allocateMembers } = useChit();
  const { profiles } = useERP();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const inGroup = new Set(data.allocations.filter(a => a.groupId === group.id).map(a => a.profileId));
  const slotsLeft = group.totalMembers - inGroup.size;

  const available = profiles.filter(p => !inGroup.has(p.id));
  const q = query.trim().toLowerCase();
  const shown = q
    ? available.filter(p => `${p.name} ${p.id} ${p.mobile} ${p.occupation || ''}`.toLowerCase().includes(q))
    : available;

  /** Default ticket for a picked member: the lowest number not used in the group or by an earlier pick. */
  const defaultTicket = (profileId: string, selection: string[]) => {
    const earlier = selection
      .slice(0, selection.indexOf(profileId))
      .map(id => Number(tickets[id]) || 0);
    return nextTicket(data, group, earlier);
  };

  const toggle = (id: string) => {
    setError(null);
    if (picked.includes(id)) {
      setPicked(picked.filter(x => x !== id));
      return;
    }
    if (picked.length >= slotsLeft) {
      setError(`Only ${slotsLeft} slot${slotsLeft > 1 ? 's' : ''} left in this group.`);
      return;
    }
    const selection = [...picked, id];
    setPicked(selection);
    setTickets(t => ({ ...t, [id]: String(defaultTicket(id, selection) || '') }));
  };

  const submit = () => {
    const res = allocateMembers(
      group.id,
      picked.map(id => ({ profileId: id, ticketNumber: Number(tickets[id]) }))
    );
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Allocate Members — ${group.name}`}
      subtitle={`Select existing Master Profile records · ${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} open · ₹${group.monthlyCollection.toLocaleString('en-IN')} per month each`}
      maxWidth="2xl"
      footer={
        <>
          <span className="mr-auto text-xs text-slate-500">{picked.length} selected</span>
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={primaryBtn} disabled={picked.length === 0} onClick={submit}>
            Allocate {picked.length > 0 ? picked.length : ''} Member{picked.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, profile ID, mobile, occupation..."
            className={`${inputCls} pl-9`}
          />
        </div>

        <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">No matching profiles available.</li>}
          {shown.map(p => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id}>
                <label className={`flex items-center space-x-3 px-3 py-2 cursor-pointer text-xs ${on ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="accent-emerald-600 w-4 h-4" />
                  <Avatar name={p.name} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-slate-900 truncate">{p.name}</span>
                    <span className="block text-slate-500 truncate">{p.mobile} · {p.occupation || 'Occupation not recorded'}</span>
                  </span>
                  <span className="font-mono text-slate-500">{p.id}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {picked.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Ticket numbers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {picked.map(id => {
                const p = profiles.find(x => x.id === id);
                return (
                  <div key={id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <span className="truncate pr-2 font-semibold text-slate-800">{p?.name || id}</span>
                    <label className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-slate-500">Ticket #</span>
                      <input
                        type="number"
                        min={1}
                        max={group.totalMembers}
                        value={tickets[id] ?? ''}
                        onChange={e => setTickets(t => ({ ...t, [id]: e.target.value }))}
                        className="w-16 border border-slate-300 rounded-md p-1.5 text-xs font-mono text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <FormError message={error} />
      </div>
    </Modal>
  );
};

/** Read-only view of a Master Profile record, with a jump to the Profile Master. */
export const MemberProfileModal: React.FC<{
  profileId: string;
  onClose: () => void;
  onNavigate?: (tabId: string, subTabId?: string) => void;
}> = ({ profileId, onClose, onNavigate }) => {
  const { profiles } = useERP();
  const profile = profiles.find(p => p.id === profileId);
  return (
    <Modal isOpen onClose={onClose} title="Member Profile" subtitle="Read-only view of the Master Profile record" maxWidth="lg">
      {profile ? (
        <div className="space-y-4 text-xs">
          <div className="flex items-center space-x-3">
            <Avatar name={profile.name} />
            <div>
              <div className="text-sm font-bold text-slate-900">{profile.name}</div>
              <div className="font-mono text-slate-500">{profile.id}</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Mobile', profile.mobile],
              ['Occupation', profile.occupation],
              ['Address', profile.address],
              ['Member since', formatDate(profile.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className={k === 'Address' ? 'col-span-2' : ''}>
                <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">{k}</dt>
                <dd className="text-slate-800 mt-0.5">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end pt-1">
            <button type="button" className={secondaryBtn} onClick={() => { onClose(); onNavigate?.('profiles'); }}>
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Profile Master</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">This Master Profile record could not be found.</p>
      )}
    </Modal>
  );
};
