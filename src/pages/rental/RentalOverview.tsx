import React, { useMemo, useState } from 'react';
import {
  Building2,
  Home,
  KeyRound,
  UserCheck,
  IndianRupee,
  AlertCircle,
  Wrench,
  CalendarClock,
  FileWarning,
  Receipt,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { DetailDrawer } from '../../components/common/DetailDrawer';
import {
  filterCls,
  useRentalData,
  OccupancyPill,
  TypePill,
  ExpiryPill,
  DocStatusPill,
  CollectionStatusPill,
  typeLabel,
  Pill,
} from './rentalUi';
import {
  dueCollected,
  dueOutstanding,
  documentStatusOf,
  expiryStateOf,
  occupancyKey,
  AgreementExpiryState,
} from '../../utils/rentalUtils';

interface OverviewRow {
  id: string;
  parentId: string;
  parentName: string;
  childName: string;
  tenantId: string;
  tenantName: string;
  typeKey: 'rental' | 'lease' | '';
  accommodation: string;
  occupancy: string;
  lastPayment: string;
  nextDue: string;
  expiry: string;
  expiryState: AgreementExpiryState;
  docStatus: string;
  collection: 'fully_paid' | 'partially_paid' | 'unpaid' | 'none';
  outstanding: number;
}

interface Props {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const RentalOverview: React.FC<Props> = ({ onNavigate }) => {
  const { parentProperties, childProperties, rentalAgreements, rentalDues, rentCollections, expenses } = useERP();
  const data = useRentalData();

  const [fProperty, setFProperty] = useState('all');
  const [fTenant, setFTenant] = useState('all');
  const [fOccupancy, setFOccupancy] = useState('all');
  const [fType, setFType] = useState('all');
  const [fCollection, setFCollection] = useState('all');
  const [fAgreement, setFAgreement] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo<OverviewRow[]>(
    () =>
      childProperties.map(c => {
        const agr = data.activeByChild.get(c.id);
        const parent = data.parentOf(c.id);
        const tenant = agr ? data.profileById.get(agr.tenantProfileId) : undefined;
        const occ = agr ? occupancyKey(agr) : '';
        const dues = agr ? data.duesByOccupancy.get(occ) || [] : [];
        const outstanding = dues.reduce((s, d) => s + dueOutstanding(d), 0);
        const open = dues.filter(d => dueOutstanding(d) > 0);
        let collection: OverviewRow['collection'] = 'none';
        if (agr && dues.length > 0) {
          collection = outstanding === 0 ? 'fully_paid' : open.some(d => dueCollected(d) > 0) ? 'partially_paid' : 'unpaid';
        }
        return {
          id: c.id,
          parentId: parent?.id || '',
          parentName: parent?.name || c.parentPropertyName || '—',
          childName: c.unitNumber,
          tenantId: agr?.tenantProfileId || '',
          tenantName: tenant?.name || '',
          typeKey: agr ? data.typeOf(agr) : '',
          accommodation: agr ? typeLabel(data.typeOf(agr)) : '',
          occupancy: c.status,
          lastPayment: agr ? data.lastPaymentDate(occ) : '',
          nextDue: data.nextDueDate(agr),
          expiry: agr?.endDate || '',
          expiryState: expiryStateOf(agr),
          docStatus: agr ? (documentStatusOf(agr) === 'uploaded' ? 'Uploaded' : 'Pending Upload') : '',
          collection,
          outstanding,
        };
      }),
    [childProperties, data]
  );

  const filtered = rows.filter(r => {
    if (fProperty !== 'all' && r.parentId !== fProperty) return false;
    if (fTenant !== 'all' && r.tenantId !== fTenant) return false;
    if (fOccupancy !== 'all' && r.occupancy !== fOccupancy) return false;
    if (fType !== 'all' && r.typeKey !== fType) return false;
    if (fCollection !== 'all' && r.collection !== fCollection) return false;
    if (fAgreement !== 'all' && r.expiryState !== fAgreement) return false;
    if (fFrom && (!r.lastPayment || r.lastPayment < fFrom)) return false;
    if (fTo && (!r.lastPayment || r.lastPayment > fTo)) return false;
    return true;
  });

  const tenants = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach(r => r.tenantId && seen.set(r.tenantId, r.tenantName));
    return [...seen.entries()];
  }, [rows]);

  // Summary cards
  const activeAgreements = rentalAgreements.filter(a => a.status === 'active');
  const expiringSoon = activeAgreements.filter(a => expiryStateOf(a) === 'expiring_soon').length;
  const expired = activeAgreements.filter(a => expiryStateOf(a) === 'expired').length;
  const pendingUpload = activeAgreements.filter(a => documentStatusOf(a) === 'pending_upload').length;
  const totalCollections = rentCollections.reduce((s, c) => s + c.totalAmount, 0);
  const maintenanceCollections = rentCollections.reduce((s, c) => s + c.maintenanceAmount, 0);
  const outstandingTotal = rentalDues.reduce((s, d) => s + dueOutstanding(d), 0);
  const propertyExpenses = expenses.filter(e => e.parentPropertyId).reduce((s, e) => s + e.amount, 0);
  const occupied = childProperties.filter(c => c.status === 'occupied').length;
  const vacant = childProperties.filter(c => c.status === 'vacant').length;
  const underMaintenance = childProperties.length - occupied - vacant;

  const columns: Column<OverviewRow>[] = [
    {
      header: 'Parent Property',
      accessor: 'parentName',
      sortable: true,
      render: (_v, r) => <span className="font-semibold text-slate-800">{r.parentName}</span>,
    },
    {
      header: 'Child Property',
      accessor: 'childName',
      sortable: true,
      render: (_v, r) => (
        <div>
          <span className="font-semibold text-slate-900">{r.childName}</span>
          <span className="block font-mono text-[10px] text-slate-400">{r.id}</span>
        </div>
      ),
    },
    { header: 'Tenant', accessor: 'tenantName', sortable: true, render: (_v, r) => r.tenantName || <span className="text-slate-400">—</span> },
    { header: 'Accommodation', accessor: 'accommodation', render: (_v, r) => <TypePill type={r.typeKey || undefined} /> },
    { header: 'Occupancy', accessor: 'occupancy', sortable: true, render: (_v, r) => <OccupancyPill status={r.occupancy} /> },
    {
      header: 'Last Payment',
      accessor: 'lastPayment',
      sortable: true,
      render: (_v, r) => (r.lastPayment ? formatDate(r.lastPayment) : <span className="text-slate-400">—</span>),
    },
    {
      header: 'Next Due',
      accessor: 'nextDue',
      sortable: true,
      render: (_v, r) => (r.nextDue ? formatDate(r.nextDue) : <span className="text-slate-400">—</span>),
    },
    {
      header: 'Agreement Expiry',
      accessor: 'expiry',
      sortable: true,
      render: (_v, r) =>
        r.expiry ? (
          <div className="space-y-0.5">
            <span className="block text-xs">{formatDate(r.expiry)}</span>
            <ExpiryPill state={r.expiryState} />
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: 'Documents',
      accessor: 'docStatus',
      render: (_v, r) => (r.docStatus ? <DocStatusPill agreement={data.activeByChild.get(r.id)} /> : <span className="text-slate-400">—</span>),
    },
    {
      header: 'Collection',
      accessor: 'outstanding',
      sortable: true,
      render: (_v, r) => (
        <div className="space-y-0.5">
          <CollectionStatusPill status={r.collection} />
          {r.outstanding > 0 && <span className="block font-mono text-[11px] text-rose-600">{formatCurrency(r.outstanding)} due</span>}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (_v, r) => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setSelectedId(r.id);
          }}
          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
        >
          View
        </button>
      ),
    },
  ];

  const resetFilters = () => {
    setFProperty('all');
    setFTenant('all');
    setFOccupancy('all');
    setFType('all');
    setFCollection('all');
    setFAgreement('all');
    setFFrom('');
    setFTo('');
  };

  // Detail drawer
  const selectedChild = selectedId ? data.childById.get(selectedId) : undefined;
  const selectedAgreement = selectedId ? data.activeByChild.get(selectedId) : undefined;
  const selectedParent = selectedId ? data.parentOf(selectedId) : undefined;
  const selectedTenant = selectedAgreement ? data.profileById.get(selectedAgreement.tenantProfileId) : undefined;
  const selectedOcc = selectedAgreement ? occupancyKey(selectedAgreement) : '';
  const selectedDues = selectedOcc ? data.duesByOccupancy.get(selectedOcc) || [] : [];
  const history = selectedId
    ? rentalAgreements.filter(a => a.childPropertyId === selectedId).sort((a, b) => b.startDate.localeCompare(a.startDate))
    : [];

  const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800 text-right">{v || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental Overview Dashboard"
        subtitle="Portfolio summary across parent properties, units, tenancies, collections, agreements and property expenses."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Overview Dashboard' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Parent Properties" value={parentProperties.length} subtitle="Master complexes" icon={Building2} variant="purple" onClick={() => onNavigate?.('rental', 'rental_properties')} />
        <StatCard title="Child Properties" value={childProperties.length} subtitle="All units" icon={Home} variant="emerald" onClick={() => onNavigate?.('rental', 'rental_properties')} />
        <StatCard title="Vacant Units" value={vacant} subtitle={underMaintenance > 0 ? `${underMaintenance} under maintenance` : 'Available to allocate'} icon={KeyRound} variant="amber" />
        <StatCard title="Occupied Units" value={occupied} subtitle="Active tenancies" icon={UserCheck} variant="blue" />
        <StatCard title="Total Collections" value={formatCurrency(totalCollections)} subtitle={`${rentCollections.length} receipts`} icon={IndianRupee} variant="emerald" onClick={() => onNavigate?.('rental', 'rental_collections')} />
        <StatCard title="Outstanding Amount" value={formatCurrency(outstandingTotal)} subtitle="Rent + maintenance due" icon={AlertCircle} variant="rose" onClick={() => onNavigate?.('rental', 'rental_collections')} />
        <StatCard title="Maintenance Collections" value={formatCurrency(maintenanceCollections)} subtitle="Collected to date" icon={Wrench} variant="blue" />
        <StatCard title="Agreements Expiring Soon" value={expiringSoon} subtitle={expired > 0 ? `${expired} already expired` : 'Within 60 days'} icon={CalendarClock} variant="amber" onClick={() => onNavigate?.('rental', 'rental_tenants')} />
        <StatCard title="Agreements Pending Upload" value={pendingUpload} subtitle="Document not yet uploaded" icon={FileWarning} variant="rose" onClick={() => onNavigate?.('rental', 'rental_tenants')} />
        <StatCard title="Total Property Expenses" value={formatCurrency(propertyExpenses)} subtitle="Parent + child expenses" icon={Receipt} variant="purple" onClick={() => onNavigate?.('rental', 'rental_expenses')} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Property Overview</h3>
          <button type="button" onClick={resetFilters} className="text-xs text-emerald-700 font-semibold hover:underline">
            Reset filters
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={fProperty} onChange={e => setFProperty(e.target.value)} className={filterCls} aria-label="Property">
            <option value="all">All properties</option>
            {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={fTenant} onChange={e => setFTenant(e.target.value)} className={filterCls} aria-label="Tenant">
            <option value="all">All tenants</option>
            {tenants.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={fOccupancy} onChange={e => setFOccupancy(e.target.value)} className={filterCls} aria-label="Occupancy">
            <option value="all">All occupancy</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
          <select value={fType} onChange={e => setFType(e.target.value)} className={filterCls} aria-label="Rental or lease">
            <option value="all">Rental &amp; Lease</option>
            <option value="rental">Rental</option>
            <option value="lease">Lease</option>
          </select>
          <select value={fCollection} onChange={e => setFCollection(e.target.value)} className={filterCls} aria-label="Collection status">
            <option value="all">All collection status</option>
            <option value="fully_paid">Fully Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select value={fAgreement} onChange={e => setFAgreement(e.target.value)} className={filterCls} aria-label="Agreement status">
            <option value="all">All agreement status</option>
            <option value="valid">Valid</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
            <span className="shrink-0">Last paid from</span>
            <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} className={`${filterCls} w-full`} />
          </label>
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
            <span className="shrink-0">to</span>
            <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} className={`${filterCls} w-full`} />
          </label>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={r => r.id}
        onRowClick={r => setSelectedId(r.id)}
        searchPlaceholder="Search property, unit, tenant..."
        exportFileName="rental_property_overview"
        printable
        compact
        printTitle="Rental Property Overview"
        emptyTitle="No properties match the filters"
      />

      <DetailDrawer
        isOpen={Boolean(selectedChild)}
        onClose={() => setSelectedId(null)}
        title={selectedChild?.unitNumber || ''}
        subtitle={`${selectedParent?.name || ''} • ${selectedChild?.id || ''}`}
        badge={selectedChild && <OccupancyPill status={selectedChild.status} />}
      >
        {selectedChild && (
          <>
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Property</h4>
              <Row k="Parent property" v={selectedParent?.name} />
              <Row k="Address" v={selectedParent?.address} />
              <Row k="Ownership" v={selectedParent?.ownership} />
              <Row k="Floor" v={selectedChild.floor} />
              <Row k="Description" v={selectedChild.description} />
              <Row k="Monthly maintenance" v={formatCurrency(selectedChild.maintenanceAmount)} />
            </section>

            {selectedAgreement ? (
              <>
                <section className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Tenant</h4>
                  <Row k="Name" v={selectedTenant?.name} />
                  <Row k="Profile ID" v={<span className="font-mono">{selectedTenant?.id}</span>} />
                  <Row k="Mobile" v={selectedTenant?.mobile} />
                  <Row k="Email" v={selectedTenant?.email} />
                  <Row k="Occupants" v={selectedAgreement.occupants} />
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Agreement &amp; Terms</h4>
                  <Row k="Agreement" v={<span className="font-mono">{selectedAgreement.id}</span>} />
                  <Row k="Accommodation" v={<TypePill type={data.typeOf(selectedAgreement)} />} />
                  <Row k="Period" v={`${formatDate(selectedAgreement.startDate)} → ${formatDate(selectedAgreement.endDate)}`} />
                  <Row k="Expiry" v={<ExpiryPill state={expiryStateOf(selectedAgreement)} />} />
                  <Row k="Document" v={<DocStatusPill agreement={selectedAgreement} />} />
                  {data.typeOf(selectedAgreement) === 'rental' ? (
                    <Row k="Monthly rent" v={formatCurrency(selectedAgreement.rentAmount)} />
                  ) : (
                    <Row k="Lease amount" v={formatCurrency(selectedAgreement.leaseAmount)} />
                  )}
                  <Row k="Monthly maintenance" v={formatCurrency(selectedAgreement.maintenanceAmount)} />
                  <Row k="Security deposit" v={formatCurrency(selectedAgreement.securityDeposit)} />
                  {selectedAgreement.advanceAmount ? <Row k="Advance" v={formatCurrency(selectedAgreement.advanceAmount)} /> : null}
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Collections</h4>
                  <Row k="Outstanding" v={<span className="font-mono text-rose-600">{formatCurrency(selectedDues.reduce((s, d) => s + dueOutstanding(d), 0))}</span>} />
                  <Row k="Total collected" v={<span className="font-mono">{formatCurrency(selectedDues.reduce((s, d) => s + dueCollected(d), 0))}</span>} />
                  <Row k="Last payment" v={data.lastPaymentDate(selectedOcc) ? formatDate(data.lastPaymentDate(selectedOcc)) : ''} />
                  <Row k="Next due" v={formatDate(data.nextDueDate(selectedAgreement))} />
                </section>
              </>
            ) : (
              <section className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
                This unit has no active tenancy.
              </section>
            )}

            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Occupancy History</h4>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">No allocations recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map(h => (
                    <li key={h.id} className="flex items-center justify-between text-xs border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                      <div>
                        <span className="font-semibold text-slate-800">{data.profileById.get(h.tenantProfileId)?.name || h.tenantProfileId}</span>
                        <span className="block text-[11px] text-slate-500">
                          {h.id} • {formatDate(h.startDate)} → {formatDate(h.endDate)}
                        </span>
                      </div>
                      <Pill tone={h.status === 'active' ? 'green' : 'slate'}>{h.status === 'active' ? 'Current' : h.status[0].toUpperCase() + h.status.slice(1)}</Pill>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onNavigate?.('rental', 'rental_tenants')} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                Tenant &amp; Agreement
              </button>
              <button type="button" onClick={() => onNavigate?.('rental', 'rental_collections')} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold">
                Collections
              </button>
              <button type="button" onClick={() => onNavigate?.('rental', 'rental_expenses')} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold">
                Expenses
              </button>
            </div>
          </>
        )}
      </DetailDrawer>
    </div>
  );
};
