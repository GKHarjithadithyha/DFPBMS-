import React, { useState } from 'react';
import { ArrowRight, CalendarPlus, FolderOpen, Layers, Pencil, Play, Plus, Users } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { useChit } from './chitStore';
import { addMonths, monthLabel, todayStr } from './chitCalc';
import { ChitGroupRec, ChitSchemeRec } from './chitTypes';
import {
  ActionMenu, Field, FormError, GroupStatusPill, MenuAction, Money, Pill, Section,
  inputCls, primaryBtn, secondaryBtn,
} from './chitUi';

type Navigate = (tabId: string, subTabId?: string) => void;

export const SchemesGroupsPage: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const { data, saveScheme, activateGroup, advanceMonth } = useChit();
  const [schemeModal, setSchemeModal] = useState<ChitSchemeRec | 'new' | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const run = (res: { ok: boolean; error?: string }) => setNotice(res.ok ? null : (res as { error: string }).error);

  const schemeCols: Column<ChitSchemeRec>[] = [
    { header: 'Scheme ID', accessor: 'id', sortable: true, render: (_v, s) => <span className="font-mono font-bold text-slate-900">{s.id}</span> },
    { header: 'Scheme Name', accessor: 'name', sortable: true, render: (_v, s) => <span className="font-semibold text-slate-900">{s.name}</span> },
    { header: 'Total Chit Value', accessor: 'totalValue', className: 'text-right', render: (_v, s) => <Money value={s.totalValue} bold /> },
    { header: 'Total Members', accessor: 'totalMembers', className: 'text-right', render: (_v, s) => <span className="font-mono">{s.totalMembers}</span> },
    { header: 'Duration', accessor: 'durationMonths', render: (_v, s) => <span>{s.durationMonths} months</span> },
    { header: 'Monthly Subscription', accessor: 'monthlySubscription', className: 'text-right', render: (_v, s) => <Money value={s.monthlySubscription} /> },
    { header: 'Foreman Commission', accessor: 'foremanCommissionPct', className: 'text-right', render: (_v, s) => <span className="font-mono">{s.foremanCommissionPct}%</span> },
    { header: 'Status', accessor: 'status', render: (_v, s) => (s.status === 'active' ? <Pill tone="green">Active</Pill> : <Pill tone="slate">Inactive</Pill>) },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, s) => (
        <div className="flex justify-end">
          <ActionMenu
            actions={[
              { label: 'Edit Scheme', icon: Pencil, onClick: () => setSchemeModal(s) },
              { label: s.status === 'active' ? 'Deactivate' : 'Activate', icon: Layers, onClick: () => saveScheme({ ...s, status: s.status === 'active' ? 'inactive' : 'active' }) },
            ]}
          />
        </div>
      ),
    },
  ];

  const groupCols: Column<ChitGroupRec>[] = [
    { header: 'Group ID', accessor: 'id', sortable: true, render: (_v, g) => <span className="font-mono font-bold text-slate-900">{g.id}</span> },
    {
      header: 'Group Name',
      accessor: 'name',
      sortable: true,
      render: (_v, g) => (
        <button type="button" className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline text-left" onClick={() => onNavigate?.('chit', `group:${g.id}`)}>
          {g.name}
        </button>
      ),
    },
    { header: 'Scheme', accessor: 'schemeId', render: (_v, g) => <span className="text-slate-600">{data.schemes.find(s => s.id === g.schemeId)?.name || g.schemeId}</span> },
    { header: 'Start Date', accessor: 'startDate', render: (_v, g) => <span className="whitespace-nowrap">{formatDate(g.startDate)}</span> },
    { header: 'End Date', accessor: 'endDate', render: (_v, g) => <span className="whitespace-nowrap">{formatDate(g.endDate)}</span> },
    {
      header: 'Total Members',
      render: (_v, g) => {
        const n = data.allocations.filter(a => a.groupId === g.id).length;
        return <span className="font-mono">{n}<span className="text-slate-400"> / {g.totalMembers}</span></span>;
      },
    },
    { header: 'Monthly Collection', accessor: 'monthlyCollection', className: 'text-right', render: (_v, g) => <Money value={g.monthlyCollection * g.totalMembers} /> },
    { header: 'Current Month', accessor: 'currentMonth', render: (_v, g) => <span className="whitespace-nowrap">{g.currentMonth} of {g.durationMonths} <span className="text-slate-400">· {monthLabel(g, g.currentMonth)}</span></span> },
    { header: 'Status', accessor: 'status', render: (_v, g) => <GroupStatusPill status={g.status} /> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, g) => {
        const actions: MenuAction[] = [
          { label: 'Open Workspace', icon: FolderOpen, onClick: () => onNavigate?.('chit', `group:${g.id}`) },
          { label: 'Allocate Members', icon: Users, onClick: () => { try { sessionStorage.setItem('pbms_chit_selected_group', g.id); } catch { /* ignore */ } onNavigate?.('chit', 'chit_allocation'); } },
        ];
        if (g.status === 'forming') actions.push({ label: 'Activate Group', icon: Play, onClick: () => run(activateGroup(g.id)) });
        if (g.status === 'active' && g.currentMonth < g.durationMonths) actions.push({ label: 'Move to Next Month', icon: ArrowRight, onClick: () => run(advanceMonth(g.id)) });
        return <div className="flex justify-end"><ActionMenu actions={actions} /></div>;
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Schemes & Groups"
        subtitle="Scheme configuration and the chit groups run from those schemes."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Schemes & Groups' }]}
        actions={
          <>
            <button type="button" className={secondaryBtn} onClick={() => setSchemeModal('new')}>
              <Plus className="w-4 h-4" /><span>New Scheme</span>
            </button>
            <button type="button" className={primaryBtn} onClick={() => setGroupModal(true)}>
              <CalendarPlus className="w-4 h-4" /><span>Create Group</span>
            </button>
          </>
        }
      />
      <FormError message={notice} />

      <Section title="Chit Groups" subtitle="Each group snapshots its scheme at creation, so later scheme edits never change a running group.">
        <DataTable
          data={data.groups}
          columns={groupCols}
          keyExtractor={g => g.id}
          compact
          printable
          searchPlaceholder="Search group ID or name..."
          exportFileName="chit_groups"
          printTitle="Chit Groups Register"
          emptyTitle="No chit groups"
          emptySubtitle="Use Create Group to start one from an active scheme."
        />
      </Section>

      <Section title="Scheme Configuration">
        <DataTable
          data={data.schemes}
          columns={schemeCols}
          keyExtractor={s => s.id}
          compact
          searchPlaceholder="Search scheme..."
          exportFileName="chit_schemes"
          emptyTitle="No schemes configured"
        />
      </Section>

      {schemeModal && <SchemeModal scheme={schemeModal === 'new' ? null : schemeModal} onClose={() => setSchemeModal(null)} />}
      {groupModal && <GroupModal onClose={() => setGroupModal(false)} onCreated={id => { setGroupModal(false); onNavigate?.('chit', `group:${id}`); }} />}
    </div>
  );
};

const SchemeModal: React.FC<{ scheme: ChitSchemeRec | null; onClose: () => void }> = ({ scheme, onClose }) => {
  const { saveScheme } = useChit();
  const [name, setName] = useState(scheme?.name || '');
  const [members, setMembers] = useState(String(scheme?.totalMembers ?? 10));
  const [duration, setDuration] = useState(String(scheme?.durationMonths ?? 10));
  const [sub, setSub] = useState(String(scheme?.monthlySubscription ?? ''));
  const [pct, setPct] = useState(String(scheme?.foremanCommissionPct ?? 5));
  const [status, setStatus] = useState<ChitSchemeRec['status']>(scheme?.status || 'active');
  const [error, setError] = useState<string | null>(null);

  const total = (Number(members) || 0) * (Number(sub) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(members), d = Number(duration), s = Number(sub), c = Number(pct);
    if (!name.trim()) return setError('Enter a scheme name.');
    if (!Number.isInteger(m) || m < 2) return setError('A scheme needs at least 2 members.');
    if (!Number.isInteger(d) || d < 1) return setError('Duration must be at least 1 month.');
    if (!(s > 0)) return setError('Enter the monthly subscription.');
    if (c < 0 || c > 100) return setError('Commission must be between 0 and 100%.');
    saveScheme({ id: scheme?.id, name: name.trim(), totalMembers: m, durationMonths: d, monthlySubscription: s, totalValue: m * s, foremanCommissionPct: c, status });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={scheme ? `Edit Scheme — ${scheme.id}` : 'New Scheme'} subtitle={scheme ? 'Changes apply to groups created afterwards' : undefined} maxWidth="lg">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <Field label="Scheme name" required><input autoFocus value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Dhavanam Monthly Chit ₹1L" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Total members" required><input type="number" min={2} value={members} onChange={e => setMembers(e.target.value)} className={inputCls} /></Field>
          <Field label="Duration (months)" required><input type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)} className={inputCls} /></Field>
          <Field label="Monthly subscription (₹)" required><input type="number" min={1} value={sub} onChange={e => setSub(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Total chit value" hint="Members × monthly subscription"><input readOnly value={total ? `₹${total.toLocaleString('en-IN')}` : '—'} className={`${inputCls} bg-slate-50 font-mono font-bold`} /></Field>
          <Field label="Foreman commission %"><input type="number" min={0} max={100} step="0.5" value={pct} onChange={e => setPct(e.target.value)} className={inputCls} /></Field>
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value as ChitSchemeRec['status'])} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>{scheme ? 'Save Scheme' : 'Create Scheme'}</button>
        </div>
      </form>
    </Modal>
  );
};

const GroupModal: React.FC<{ onClose: () => void; onCreated: (id: string) => void }> = ({ onClose, onCreated }) => {
  const { data, createGroup } = useChit();
  const active = data.schemes.filter(s => s.status === 'active');
  const [name, setName] = useState('');
  const [schemeId, setSchemeId] = useState(active[0]?.id || '');
  const [startDate, setStartDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  const scheme = active.find(s => s.id === schemeId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createGroup({ name, schemeId, startDate });
    if (res.ok) onCreated(res.value.id);
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Chit Group" subtitle="Start a group from an existing scheme" maxWidth="lg">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <Field label="Group name" required><input autoFocus value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Monthly Chit — Group C" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Scheme" required>
            <select value={schemeId} onChange={e => setSchemeId(e.target.value)} className={inputCls}>
              {active.length === 0 && <option value="">No active schemes</option>}
              {active.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
            </select>
          </Field>
          <Field label="Start date" required><input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></Field>
        </div>
        {scheme && (
          <dl className="grid grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            {[
              ['Chit value', `₹${scheme.totalValue.toLocaleString('en-IN')}`],
              ['Members', String(scheme.totalMembers)],
              ['Monthly / member', `₹${scheme.monthlySubscription.toLocaleString('en-IN')}`],
              ['Ends', startDate ? formatDate(addMonths(startDate, scheme.durationMonths - 1)) : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <FormError message={error} />
        <div className="flex justify-end space-x-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={!scheme}>Create Group</button>
        </div>
      </form>
    </Modal>
  );
};
