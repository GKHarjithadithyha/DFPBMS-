import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Eye, Paperclip, Search, UserSearch } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Pill, filterCls, inputCls, secondaryBtn, useRentalData } from './rentalUi';
import { occupancyKey } from '../../utils/rentalUtils';
import {
  HISTORY_TXN_TYPES,
  HistoryTxn,
  HistoryTxnType,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_RECORDS,
  MaintenanceRecord,
  PAST_OCCUPANCIES,
  buildPastTransactions,
} from './propertyHistoryData';

type Navigate = (tabId: string, subTabId?: string) => void;
type TabId = 'overview' | 'occupancy' | 'transactions' | 'maintenance';

interface OccRow {
  id: string;
  childId: string;
  tenantId: string;
  tenant: string;
  moveIn: string;
  moveOut: string;
  rent: number;
  deposit: number;
  status: 'Current' | 'Vacated';
}

const STATUS_TONE = { occupied: 'green', vacant: 'slate', maintenance: 'amber' } as const;
const STATUS_TEXT = { occupied: 'Occupied', vacant: 'Vacant', maintenance: 'Under Maintenance' } as const;
const MAINT_TONE = { Completed: 'green', 'In Progress': 'amber', Scheduled: 'blue' } as const;
const TXN_TONE: Record<HistoryTxnType, 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate'> = {
  'Rent Collection': 'green',
  'Maintenance Collection': 'blue',
  'Security Deposit': 'purple',
  'Deposit Refund': 'amber',
  Penalty: 'rose',
  'Repair Expense': 'rose',
  Adjustment: 'slate',
};
const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '—');

export const PropertyHistory: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const { parentProperties, childProperties, rentalAgreements, rentalSettlements, rentCollections, expenses } = useERP();
  const data = useRentalData();

  const [parentId, setParentId] = useState(parentProperties[0]?.id || '');
  const [unitId, setUnitId] = useState('');
  const [tab, setTab] = useState<TabId>('overview');
  const [query, setQuery] = useState('');

  const nameOf = (profileId?: string) => (profileId ? data.profileById.get(profileId)?.name || profileId : '—');
  const viewProfile = (profileId: string) => onNavigate?.('profiles', profileId);

  /* ---- Occupancies per unit: live agreements grouped into tenancies + earlier tenancies ---- */
  const occByChild = useMemo(() => {
    const map = new Map<string, OccRow[]>();
    const push = (r: OccRow) => map.set(r.childId, [...(map.get(r.childId) || []), r]);

    const groups = new Map<string, typeof rentalAgreements>();
    rentalAgreements.forEach(a => groups.set(occupancyKey(a), [...(groups.get(occupancyKey(a)) || []), a]));
    groups.forEach((list, occ) => {
      const sorted = [...list].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const current = sorted.some(a => a.status === 'active');
      const settlement = rentalSettlements.find(s => s.occupancyId === occ || sorted.some(a => a.id === s.agreementId));
      push({
        id: occ,
        childId: last.childPropertyId,
        tenantId: last.tenantProfileId,
        tenant: nameOf(last.tenantProfileId),
        moveIn: first.occupancyStartDate || first.startDate,
        moveOut: current ? '' : settlement?.vacatingDate || last.endDate,
        rent: last.occupancyType === 'lease' ? 0 : last.rentAmount,
        deposit: (last.securityDeposit || 0) + (last.advanceAmount || 0),
        status: current ? 'Current' : 'Vacated',
      });
    });
    PAST_OCCUPANCIES.forEach(o =>
      push({
        id: o.id, childId: o.childPropertyId, tenantId: o.tenantProfileId, tenant: nameOf(o.tenantProfileId),
        moveIn: o.moveIn, moveOut: o.moveOut, rent: o.rent, deposit: o.deposit, status: 'Vacated',
      })
    );
    map.forEach((rows, k) => map.set(k, rows.sort((a, b) => b.moveIn.localeCompare(a.moveIn))));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalAgreements, rentalSettlements, data.profileById]);

  /* ---- Transactions per unit: existing ERP records, shown read-only, plus earlier tenancies ---- */
  const txnsByChild = useMemo(() => {
    const map = new Map<string, HistoryTxn[]>();
    const push = (t: HistoryTxn) => map.set(t.childPropertyId, [...(map.get(t.childPropertyId) || []), t]);
    const modeText = (mode: string) => (mode === 'cash' ? 'Cash' : mode === 'bank' ? 'Bank' : mode);

    buildPastTransactions().forEach(push);

    rentCollections.forEach(c => {
      const mode = c.splits && c.splits.length > 1 ? c.splits.map(s => s.method).join(' + ') : modeText(c.paymentMode);
      const months = c.forMonthYear || '';
      if (c.rentAmount > 0) push({ id: `${c.id}-R`, childPropertyId: c.childPropertyId, tenantProfileId: c.tenantProfileId, date: c.date, description: `Rent${months ? ` — ${months}` : ''}`, type: 'Rent Collection', amount: c.rentAmount, mode, reference: c.receiptNumber });
      if (c.maintenanceAmount > 0) push({ id: `${c.id}-M`, childPropertyId: c.childPropertyId, tenantProfileId: c.tenantProfileId, date: c.date, description: `Maintenance${months ? ` — ${months}` : ''}`, type: 'Maintenance Collection', amount: c.maintenanceAmount, mode, reference: c.receiptNumber });
    });

    const seen = new Set<string>();
    rentalAgreements.forEach(a => {
      const occ = occupancyKey(a);
      if (seen.has(occ)) return;
      seen.add(occ);
      const first = rentalAgreements.filter(x => occupancyKey(x) === occ).sort((x, y) => x.startDate.localeCompare(y.startDate))[0];
      const held = (first.securityDeposit || 0) + (first.advanceAmount || 0);
      if (held > 0) {
        push({ id: `${occ}-DEP`, childPropertyId: first.childPropertyId, tenantProfileId: first.tenantProfileId, date: first.occupancyStartDate || first.startDate, description: 'Refundable security deposit received', type: 'Security Deposit', amount: held, mode: first.depositPaymentMode ? modeText(first.depositPaymentMode) : '—', reference: first.id });
      }
    });

    rentalSettlements.forEach(s => {
      if (s.deductions > 0) push({ id: `${s.id}-DED`, childPropertyId: s.childPropertyId, tenantProfileId: s.tenantProfileId, date: s.vacatingDate, description: `Deposit deduction — ${s.deductionDescription || 'exit adjustment'}`, type: 'Adjustment', amount: s.deductions, mode: 'Adjusted', reference: s.id });
      s.payments.forEach((p, i) =>
        push({
          id: `${s.id}-P${i}`, childPropertyId: s.childPropertyId, tenantProfileId: s.tenantProfileId, date: p.date,
          description: p.direction === 'payment' ? 'Security deposit refunded on exit' : 'Exit dues received from tenant',
          type: p.direction === 'payment' ? 'Deposit Refund' : 'Adjustment', amount: p.amount, outflow: p.direction === 'payment',
          mode: modeText(p.mode), reference: p.reference || s.id,
        })
      );
    });

    expenses.filter(e => e.childPropertyId).forEach(e =>
      push({ id: e.id, childPropertyId: e.childPropertyId!, date: e.date, description: e.description || e.remarks || e.categoryName || 'Repair expense', type: 'Repair Expense', amount: e.amount, outflow: true, mode: modeText(e.paymentMode), reference: e.invoiceNumber || e.transactionRef || e.id })
    );

    map.forEach((rows, k) => map.set(k, rows.sort((a, b) => b.date.localeCompare(a.date))));
    return map;
  }, [rentCollections, rentalAgreements, rentalSettlements, expenses]);

  /* ---- Selection ---- */
  const parent = data.parentById.get(parentId);
  const units = childProperties.filter(c => c.parentPropertyId === parentId);
  const unit = childProperties.find(c => c.id === unitId);
  const q = query.trim().toLowerCase();

  const unitMatches = (c: (typeof childProperties)[number]) => {
    const tenant = nameOf(c.currentTenantProfileId).toLowerCase();
    const prop = (data.parentOf(c.id)?.name || '').toLowerCase();
    return [c.unitNumber, c.floor, c.propertyType || '', tenant, prop].some(v => v.toLowerCase().includes(q));
  };
  // Searching looks across every property; otherwise the list is the selected property's units.
  const listed = q ? childProperties.filter(unitMatches) : units;

  const previousTenants = units.reduce((s, c) => s + (occByChild.get(c.id) || []).filter(o => o.status === 'Vacated').length, 0);

  const openUnit = (id: string) => {
    const c = childProperties.find(x => x.id === id);
    if (c?.parentPropertyId) setParentId(c.parentPropertyId);
    setUnitId(id);
    setTab('overview');
  };

  const maint = unit ? MAINTENANCE_RECORDS.filter(m => m.childPropertyId === unit.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const occ = unit ? occByChild.get(unit.id) || [] : [];
  const txns = unit ? txnsByChild.get(unit.id) || [] : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Property History"
        subtitle="Occupants, rental transactions and maintenance records for every building and unit. Tenant details stay in the Master Profile."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Property History' }]}
      />

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={parentId} onChange={e => { setParentId(e.target.value); setUnitId(''); setQuery(''); }} className={filterCls} aria-label="Property">
          {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={unitId} onChange={e => { setUnitId(e.target.value); setTab('overview'); }} className={filterCls} aria-label="Flat / unit">
          <option value="">All units in this property</option>
          {units.map(c => <option key={c.id} value={c.id}>{c.unitNumber}</option>)}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search property, unit, floor or tenant..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Property summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Units" value={units.length} subtitle={parent?.name || ''} />
        <StatCard title="Occupied Units" value={units.filter(c => c.status === 'occupied').length} />
        <StatCard title="Vacant Units" value={units.filter(c => c.status === 'vacant').length} />
        <StatCard title="Previous Tenants" value={previousTenants} subtitle="Vacated tenancies" />
      </div>

      {!unit || q ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-600">
            {q ? `Search results (${listed.length})` : `Units — ${parent?.name || ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50/60">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Unit Number</th>
                  {q && <th className="text-left font-semibold px-3 py-2">Property</th>}
                  <th className="text-left font-semibold px-3 py-2">Floor</th>
                  <th className="text-left font-semibold px-3 py-2">Unit Type</th>
                  <th className="text-left font-semibold px-3 py-2">Occupancy Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listed.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No units match.</td></tr>}
                {listed.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => { setQuery(''); openUnit(c.id); }}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{c.unitNumber}</td>
                    {q && <td className="px-3 text-slate-600">{data.parentOf(c.id)?.name || '—'}</td>}
                    <td className="px-3 text-slate-600">{c.floor || '—'}</td>
                    <td className="px-3 text-slate-600">{cap(c.propertyType)}</td>
                    <td className="px-3"><Pill tone={STATUS_TONE[c.status]}>{STATUS_TEXT[c.status]}</Pill></td>
                    <td className="px-3 text-right text-emerald-700 font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1"><span>Open history</span><ChevronRight className="w-3.5 h-3.5" /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button type="button" onClick={() => setUnitId('')} className={`${secondaryBtn} !px-2.5`} aria-label="Back to all units"><ArrowLeft className="w-4 h-4" /></button>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">{unit.unitNumber}</h3>
                <p className="text-xs text-slate-500">{data.parentOf(unit.id)?.name} · {unit.floor || '—'}</p>
              </div>
              <Pill tone={STATUS_TONE[unit.status]}>{STATUS_TEXT[unit.status]}</Pill>
            </div>
            <Tabs
              variant="pills"
              activeTab={tab}
              onChange={t => setTab(t as TabId)}
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'occupancy', label: 'Occupancy History', count: occ.length },
                { id: 'transactions', label: 'Transaction History', count: txns.length },
                { id: 'maintenance', label: 'Maintenance History', count: maint.length },
              ]}
            />
          </div>

          {tab === 'overview' && <OverviewTab unitId={unit.id} nameOf={nameOf} viewProfile={viewProfile} lastVacated={occ.find(o => o.status === 'Vacated')} />}
          {tab === 'occupancy' && <OccupancyTab rows={occ} onView={viewProfile} />}
          {tab === 'transactions' && <TransactionTab key={unit.id} txns={txns} nameOf={nameOf} />}
          {tab === 'maintenance' && <MaintenanceTab key={unit.id} records={maint} />}
        </div>
      )}
    </div>
  );

  function OverviewTab({ unitId: id, nameOf: nameFor, viewProfile: view, lastVacated }: { unitId: string; nameOf: (p?: string) => string; viewProfile: (p: string) => void; lastVacated?: OccRow }) {
    const child = data.childById.get(id)!;
    const agr = data.activeByChild.get(id);
    const KV = (k: string, v: React.ReactNode) => (
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</dt>
        <dd className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{v || '—'}</dd>
      </div>
    );
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          {KV('Property', data.parentOf(id)?.name)}
          {KV('Unit Number', child.unitNumber)}
          {KV('Floor', child.floor)}
          {KV('Occupancy Status', <Pill tone={STATUS_TONE[child.status]}>{STATUS_TEXT[child.status]}</Pill>)}
          {KV('Current Tenant', agr ? (
            <span className="inline-flex items-center space-x-2">
              <span>{nameFor(agr.tenantProfileId)}</span>
              <button type="button" onClick={() => view(agr.tenantProfileId)} className="text-[11px] font-semibold text-emerald-700 hover:underline">View Profile</button>
            </span>
          ) : 'Vacant')}
          {KV('Monthly Rent', agr ? (agr.occupancyType === 'lease' ? 'Lease' : formatCurrency(agr.rentAmount)) : `${formatCurrency(child.rentAmount)} (listed)`)}
          {KV('Occupancy Start', agr ? formatDate(agr.occupancyStartDate || agr.startDate) : '')}
          {KV('Agreement Expiry', agr ? formatDate(agr.endDate) : '')}
        </dl>
        {!agr && lastVacated && (
          <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Last tenant <b className="text-slate-700">{lastVacated.tenant}</b> moved out on {formatDate(lastVacated.moveOut)}.
          </p>
        )}
      </div>
    );
  }
};

/* ------------------------------------------------------------------ */
/* Occupancy history                                                   */
/* ------------------------------------------------------------------ */
const OccupancyTab: React.FC<{ rows: OccRow[]; onView: (profileId: string) => void }> = ({ rows, onView }) => {
  const columns: Column<OccRow>[] = [
    { header: 'Tenant Name', accessor: 'tenant', sortable: true, render: (_v, r) => <span className="font-semibold text-slate-900">{r.tenant}</span> },
    { header: 'Move-in Date', accessor: 'moveIn', sortable: true, render: (_v, r) => <span className="whitespace-nowrap">{formatDate(r.moveIn)}</span> },
    { header: 'Move-out Date', accessor: 'moveOut', sortable: true, render: (_v, r) => <span className="whitespace-nowrap">{r.moveOut ? formatDate(r.moveOut) : '—'}</span> },
    { header: 'Monthly Rent', accessor: 'rent', className: 'text-right', render: (_v, r) => <span className="font-mono">{r.rent ? formatCurrency(r.rent) : '—'}</span> },
    { header: 'Security Deposit', accessor: 'deposit', className: 'text-right', render: (_v, r) => <span className="font-mono">{formatCurrency(r.deposit)}</span> },
    { header: 'Status', accessor: 'status', render: (_v, r) => <Pill tone={r.status === 'Current' ? 'green' : 'slate'}>{r.status}</Pill> },
    {
      header: 'Action',
      className: 'text-right',
      render: (_v, r) => (
        <button type="button" onClick={() => onView(r.tenantId)} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold whitespace-nowrap">
          <UserSearch className="w-3 h-3" /><span>View Profile</span>
        </button>
      ),
    },
  ];
  return (
    <DataTable data={rows} columns={columns} keyExtractor={r => r.id} compact searchPlaceholder="Search tenant..." exportFileName="occupancy_history" emptyTitle="No occupancy history" emptySubtitle="This unit has not been allocated yet." />
  );
};

/* ------------------------------------------------------------------ */
/* Transaction history                                                 */
/* ------------------------------------------------------------------ */
const TransactionTab: React.FC<{ txns: HistoryTxn[]; nameOf: (p?: string) => string }> = ({ txns, nameOf }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('all');
  const [tenant, setTenant] = useState('all');

  const tenants = [...new Set(txns.map(t => t.tenantProfileId).filter(Boolean) as string[])];
  const rows = txns
    .filter(t => (!from || t.date >= from) && (!to || t.date <= to) && (type === 'all' || t.type === type) && (tenant === 'all' || t.tenantProfileId === tenant))
    .map(t => ({ ...t, tenant: nameOf(t.tenantProfileId) }));

  const columns: Column<(typeof rows)[number]>[] = [
    { header: 'Date', accessor: 'date', sortable: true, render: (_v, r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { header: 'Tenant', accessor: 'tenant', render: (_v, r) => <span className="whitespace-nowrap">{r.tenant}</span> },
    { header: 'Transaction Description', accessor: 'description' },
    { header: 'Transaction Type', accessor: 'type', render: (_v, r) => <Pill tone={TXN_TONE[r.type]}>{r.type}</Pill> },
    {
      header: 'Amount', accessor: 'amount', sortable: true, className: 'text-right',
      render: (_v, r) => <span className={`font-mono tabular-nums whitespace-nowrap ${r.outflow ? 'text-rose-600' : 'text-slate-900'}`}>{r.outflow ? '− ' : ''}{formatCurrency(r.amount)}</span>,
    },
    { header: 'Payment Mode', accessor: 'mode' },
    { header: 'Reference Number', accessor: 'reference', render: (_v, r) => <span className="font-mono text-slate-500">{r.reference}</span> },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      keyExtractor={r => r.id}
      compact
      printable
      searchPlaceholder="Search description or reference..."
      exportFileName="unit_transactions"
      printTitle="Unit Transaction History"
      emptyTitle="No transactions match"
      filterComponent={
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={filterCls} aria-label="From date" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={filterCls} aria-label="To date" />
          <select value={type} onChange={e => setType(e.target.value)} className={filterCls} aria-label="Transaction type">
            <option value="all">All types</option>
            {HISTORY_TXN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={tenant} onChange={e => setTenant(e.target.value)} className={filterCls} aria-label="Tenant">
            <option value="all">All tenants</option>
            {tenants.map(id => <option key={id} value={id}>{nameOf(id)}</option>)}
          </select>
        </div>
      }
    />
  );
};

/* ------------------------------------------------------------------ */
/* Maintenance history                                                 */
/* ------------------------------------------------------------------ */
const MaintenanceTab: React.FC<{ records: MaintenanceRecord[] }> = ({ records }) => {
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState<MaintenanceRecord | null>(null);
  const rows = records.filter(r => category === 'all' || r.category === category);

  const columns: Column<MaintenanceRecord>[] = [
    { header: 'Date', accessor: 'date', sortable: true, render: (_v, r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { header: 'Maintenance Category', accessor: 'category', sortable: true },
    { header: 'Description', accessor: 'description' },
    { header: 'Vendor', accessor: 'vendor' },
    { header: 'Cost', accessor: 'cost', sortable: true, className: 'text-right', render: (_v, r) => <span className="font-mono tabular-nums">{formatCurrency(r.cost)}</span> },
    { header: 'Status', accessor: 'status', render: (_v, r) => <Pill tone={MAINT_TONE[r.status]}>{r.status}</Pill> },
    {
      header: 'Action', className: 'text-right',
      render: (_v, r) => (
        <button type="button" onClick={() => setOpen(r)} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold">
          <Eye className="w-3 h-3" /><span>View</span>
        </button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={r => r.id}
        compact
        searchPlaceholder="Search description or vendor..."
        exportFileName="unit_maintenance"
        emptyTitle="No maintenance records"
        emptySubtitle="Nothing has been recorded for this unit."
        filterComponent={
          <select value={category} onChange={e => setCategory(e.target.value)} className={filterCls} aria-label="Category">
            <option value="all">All categories</option>
            {MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        }
      />

      <Modal isOpen={Boolean(open)} onClose={() => setOpen(null)} title={open ? `${open.category} — ${formatDate(open.date)}` : ''} subtitle={open?.id} maxWidth="lg">
        {open && (
          <div className="space-y-4 text-xs">
            <p className="text-sm text-slate-800">{open.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {([['Vendor', open.vendor], ['Cost', formatCurrency(open.cost)], ['Status', open.status], ['Date', formatDate(open.date)]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{k}</div>
                  <div className="mt-0.5 font-semibold text-slate-900">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Remarks</div>
              <p className="text-slate-700">{open.remarks || 'No remarks recorded.'}</p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Attachments</div>
              {open.attachments.length === 0 ? (
                <p className="text-slate-400">No attachments.</p>
              ) : (
                <ul className="space-y-1">
                  {open.attachments.map(a => (
                    <li key={a} className={`${inputCls} flex items-center space-x-2 bg-slate-50`}>
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
