import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, UserCheck, CalendarClock, AlertTriangle, FileWarning, Handshake, RefreshCw, LogOut, Upload, CheckCircle2, FileText, Bell, Building2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { DepositChannel, DepositReceiptSelector, DueDatePicker, RentEscalationSection, addMonthsTo } from './AllocationFinancials';
import { dueDateFor } from '../../utils/rentalUtils';
import { RefundStatusPill, SettlementPanel, bankRefunded, cashRefunded } from './SettlementPanel';
import { PaymentMode, RentalAgreement, RentalSettlement, OccupancyType } from '../../types';
import {
  Field,
  FilePicker,
  inputCls,
  filterCls,
  primaryBtn,
  secondaryBtn,
  useRentalData,
  TypePill,
  ExpiryPill,
  DocStatusPill,
  Pill,
  ActionMenu,
  Avatar,
  typeLabel,
  takePendingAllocation,
} from './rentalUi';
import {
  daysUntil,
  documentStatusOf,
  dueOutstanding,
  expiryStateOf,
  occupancyKey,
  todayStr,
  typeOf,
} from '../../utils/rentalUtils';

type PickedFile = { name: string; size: string } | null;

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const addYear = (date: string) => addDays(`${Number(date.slice(0, 4)) + 1}${date.slice(4)}`, -1);

const settlementTargetOf = (s: RentalSettlement) =>
  s.refundableAmount > 0 ? { amount: s.refundableAmount, direction: 'refund' as const } : { amount: s.payableByTenant, direction: 'receipt' as const };

const settlementPill = (status: RentalSettlement['status']) =>
  status === 'settled' ? <Pill tone="green">Settled</Pill> : status === 'partially_settled' ? <Pill tone="amber">Partially Settled</Pill> : <Pill tone="rose">Pending</Pill>;

interface AgreementRow {
  id: string;
  parentName: string;
  unit: string;
  tenant: string;
  type: string;
  terms: string;
  period: string;
  expiry: string;
  document: string;
  status: string;
  agreement: RentalAgreement;
}

interface Props {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const TenantAgreementManagement: React.FC<Props> = () => {
  const {
    profiles,
    parentProperties,
    childProperties,
    rentalAgreements,
    rentalSettlements,
    rentalDues,
    allocateTenant,
    renewAgreement,
    uploadAgreementDocument,
    exitOccupancy,
    confirmHandover,
    recordSettlementPayment,
  } = useERP();
  const data = useRentalData();

  const [tab, setTab] = useState<'agreements' | 'reminders' | 'settlements'>('agreements');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'current' | 'history' | 'all'>('current');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [presetChild, setPresetChild] = useState<string>('');
  const [renewing, setRenewing] = useState<RentalAgreement | null>(null);
  const [uploading, setUploading] = useState<RentalAgreement | null>(null);
  const [exiting, setExiting] = useState<RentalAgreement | null>(null);
  const [settlementId, setSettlementId] = useState<string | null>(null);

  useEffect(() => {
    const pending = takePendingAllocation();
    if (pending) {
      setPresetChild(pending);
      setWizardOpen(true);
    }
  }, []);

  const active = rentalAgreements.filter(a => a.status === 'active');
  const expiring = active.filter(a => expiryStateOf(a) === 'expiring_soon');
  const expired = active.filter(a => expiryStateOf(a) === 'expired');
  const pendingUpload = active.filter(a => documentStatusOf(a) === 'pending_upload');
  const openSettlements = rentalSettlements.filter(s => s.status !== 'settled' || !s.handoverConfirmed);

  const rows = useMemo<AgreementRow[]>(
    () =>
      [...rentalAgreements]
        .filter(a => propertyFilter === 'all' || data.parentOf(a.childPropertyId)?.id === propertyFilter)
        .filter(a => (statusFilter === 'all' ? true : statusFilter === 'current' ? a.status === 'active' : a.status !== 'active'))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map(a => {
          const child = data.childById.get(a.childPropertyId);
          const type = typeOf(a);
          return {
            id: a.id,
            parentName: data.parentOf(a.childPropertyId)?.name || '—',
            unit: child?.unitNumber || a.childPropertyId,
            tenant: data.profileById.get(a.tenantProfileId)?.name || a.tenantProfileId,
            type: typeLabel(type),
            terms:
              type === 'lease'
                ? `Lease ${formatCurrency(a.leaseAmount)} + Maint ${formatCurrency(a.maintenanceAmount)}/mo`
                : `Rent ${formatCurrency(a.rentAmount)} + Maint ${formatCurrency(a.maintenanceAmount)}/mo`,
            period: `${formatDate(a.startDate)} → ${formatDate(a.endDate)}`,
            expiry: a.endDate,
            document: documentStatusOf(a) === 'uploaded' ? 'Uploaded' : 'Pending Upload',
            status: a.status,
            agreement: a,
          };
        }),
    [rentalAgreements, statusFilter, propertyFilter, data]
  );

  const statusPill = (a: RentalAgreement) => {
    if (a.status === 'active') return <Pill tone="green">Active</Pill>;
    if (a.status === 'renewed') return <Pill tone="blue">Renewed</Pill>;
    if (a.status === 'closed' || a.status === 'terminated') return <Pill tone="slate">Closed</Pill>;
    return <Pill tone="slate">{a.status}</Pill>;
  };

  const columns: Column<AgreementRow>[] = [
    {
      header: 'Agreement',
      accessor: 'id',
      sortable: true,
      render: (_v, r) => (
        <div className="space-y-1 whitespace-nowrap">
          <span className="font-mono font-bold text-slate-900">{r.id}</span>
          <div className="flex items-center gap-1">
            <TypePill type={typeOf(r.agreement)} />
            {r.agreement.previousAgreementId && <span className="text-[10px] text-slate-400">↻ {r.agreement.previousAgreementId}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Property / Unit',
      accessor: 'unit',
      sortable: true,
      render: (_v, r) => (
        <div className="flex items-center gap-2.5 min-w-[11rem] max-w-[15rem]">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate" title={r.unit}>{r.unit}</span>
            <span className="block text-[11px] text-slate-500 truncate" title={r.parentName}>{r.parentName}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Tenant',
      accessor: 'tenant',
      sortable: true,
      render: (_v, r) => (
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <Avatar name={r.tenant} />
          <div>
            <span className="font-semibold text-slate-900 block">{r.tenant}</span>
            <span className="block text-[11px] text-slate-500">{data.profileById.get(r.agreement.tenantProfileId)?.mobile || ''}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Financial Terms',
      accessor: 'terms',
      render: (_v, r) => {
        const lease = typeOf(r.agreement) === 'lease';
        return (
          <div className="font-mono text-[11px] whitespace-nowrap leading-tight">
            <span className="block text-slate-900 font-semibold">
              {formatCurrency(lease ? r.agreement.leaseAmount : r.agreement.rentAmount)}
              <span className="text-slate-400 font-sans font-normal"> {lease ? 'lease' : '/mo rent'}</span>
            </span>
            <span className="block text-slate-500">
              + {formatCurrency(r.agreement.maintenanceAmount)}
              <span className="font-sans"> maint./mo</span>
            </span>
          </div>
        );
      },
    },
    {
      header: 'Period & Expiry',
      accessor: 'expiry',
      sortable: true,
      render: (_v, r) => {
        const state = expiryStateOf(r.agreement);
        const d = daysUntil(r.agreement.endDate);
        return (
          <div className="space-y-1 whitespace-nowrap">
            <span className="block text-[11px] text-slate-700">{formatDate(r.agreement.startDate)} → {formatDate(r.agreement.endDate)}</span>
            {state !== 'n/a' ? (
              <div className="flex items-center gap-1.5">
                <ExpiryPill state={state} />
                <span className="text-[10px] text-slate-400">{d >= 0 ? `${d}d left` : `${-d}d over`}</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Document / Status',
      accessor: 'document',
      render: (_v, r) => (
        <div className="flex flex-col items-start gap-1">
          <DocStatusPill agreement={r.agreement} />
          {statusPill(r.agreement)}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (_v, r) => (
        <ActionMenu
          actions={
            r.agreement.status !== 'active'
              ? []
              : [
                  ...(documentStatusOf(r.agreement) === 'pending_upload'
                    ? [{ label: 'Upload', icon: Upload, onClick: () => setUploading(r.agreement) }]
                    : []),
                  { label: 'Renew', icon: RefreshCw, onClick: () => setRenewing(r.agreement) },
                  { label: 'Exit', icon: LogOut, tone: 'danger' as const, onClick: () => setExiting(r.agreement) },
                ]
          }
        />
      ),
    },
  ];

  const settlementRows = rentalSettlements.map(s => ({
    ...s,
    unit: data.childById.get(s.childPropertyId)?.unitNumber || s.childPropertyId,
    tenant: data.profileById.get(s.tenantProfileId)?.name || s.tenantProfileId,
    outcome: s.refundableAmount > 0 ? `Refund ${s.refundableAmount}` : `Payable ${s.payableByTenant}`,
  }));

  const settlementColumns: Column<(typeof settlementRows)[number]>[] = [
    { header: 'Settlement', accessor: 'id', sortable: true, render: (_v, r) => <span className="font-mono font-bold">{r.id}</span> },
    { header: 'Unit', accessor: 'unit', render: (_v, r) => <span className="font-semibold">{r.unit}</span> },
    { header: 'Tenant', accessor: 'tenant' },
    { header: 'Vacating', accessor: 'vacatingDate', sortable: true, render: (_v, r) => formatDate(r.vacatingDate) },
    {
      header: 'Outcome',
      accessor: 'outcome',
      render: (_v, r) => {
        const t = settlementTargetOf(r);
        return (
          <div>
            <span className={`font-mono font-bold ${t.direction === 'refund' ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(t.amount)}</span>
            <span className="block text-[10px] text-slate-500">{t.direction === 'refund' ? 'Refundable to tenant' : t.amount > 0 ? 'Payable by tenant' : 'Nil'}</span>
          </div>
        );
      },
    },
    { header: 'Cash / Bank Refunded', accessor: 'settledAmount', render: (_v, r) => (
        <div className="font-mono text-[11px] leading-tight whitespace-nowrap">
          <span className="block">Cash {formatCurrency(cashRefunded(r))}</span>
          <span className="block text-slate-500">Bank {formatCurrency(bankRefunded(r))}</span>
        </div>
      ) },
    { header: 'Remaining', accessor: 'refundableAmount', render: (_v, r) => {
        const t = settlementTargetOf(r);
        const left = Math.max(0, t.amount - r.settledAmount);
        return <span className={`font-mono ${left > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700'}`}>{formatCurrency(left)}</span>;
      } },
    { header: 'Status', accessor: 'status', render: (_v, r) => <RefundStatusPill settlement={r} /> },
    { header: 'Handover', accessor: 'handoverConfirmed', render: (_v, r) => (r.handoverConfirmed ? <Pill tone="green">Confirmed</Pill> : <Pill tone="amber">Awaiting</Pill>) },
    {
      header: 'Actions',
      render: (_v, r) => (
        <button type="button" onClick={() => setSettlementId(r.id)} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold">
          Open
        </button>
      ),
    },
  ];

  const reminderList = [...expired, ...expiring].sort((a, b) => a.endDate.localeCompare(b.endDate));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant & Agreement Management"
        subtitle="Allocate tenants, manage agreements and documents, renew or extend tenancies, and close occupancies with settlement."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Tenant & Agreement' }]}
        actions={
          <button
            type="button"
            onClick={() => {
              setPresetChild('');
              setWizardOpen(true);
            }}
            className={primaryBtn}
          >
            <UserPlus className="w-4 h-4" />
            <span>Allocate Tenant</span>
          </button>
        }
      />

      {notice && (
        <div className={`flex items-start justify-between rounded-xl border px-4 py-3 text-xs ${notice.tone === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Active Occupancies" value={active.length} icon={UserCheck} variant="emerald" />
        <StatCard title="Expiring Soon" value={expiring.length} subtitle="Within 60 days" icon={CalendarClock} variant="amber" />
        <StatCard title="Expired" value={expired.length} subtitle="Renew or close" icon={AlertTriangle} variant="rose" />
        <StatCard title="Pending Upload" value={pendingUpload.length} subtitle="Agreement not uploaded" icon={FileWarning} variant="amber" />
        <StatCard title="Open Settlements" value={openSettlements.length} icon={Handshake} variant="blue" />
      </div>

      <Tabs
        activeTab={tab}
        onChange={t => setTab(t as typeof tab)}
        tabs={[
          { id: 'agreements', label: 'Agreements', count: rentalAgreements.length, icon: FileText },
          { id: 'reminders', label: 'Expiry Reminders', count: reminderList.length, icon: Bell },
          { id: 'settlements', label: 'Exit & Settlements', count: rentalSettlements.length, icon: Handshake },
        ]}
      />

      {tab === 'agreements' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Agreements</h3>
            <p className="text-xs text-slate-500">Manage rental and lease agreements, view document status and track expiry dates.</p>
          </div>
        <DataTable
          data={rows}
          columns={columns}
          keyExtractor={r => r.id}
          searchPlaceholder="Search agreement, unit, tenant..."
          exportFileName="rental_agreements"
          printable
          compact
          printTitle="Rental Agreements Register"
          filterComponent={
            <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className={filterCls} aria-label="Agreement view">
              <option value="current">Current agreements</option>
              <option value="history">Renewed / closed (history)</option>
              <option value="all">All agreements</option>
            </select>
            <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className={filterCls} aria-label="Property">
              <option value="all">All properties</option>
              {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            </div>
          }
          emptyTitle="No agreements"
          emptySubtitle="Use Allocate Tenant to create the first allocation."
        />
        </div>
      )}

      {tab === 'reminders' && (
        <div className="space-y-3">
          {reminderList.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              No agreements are expiring within 60 days.
            </div>
          )}
          {reminderList.map(a => {
            const d = daysUntil(a.endDate);
            const child = data.childById.get(a.childPropertyId);
            return (
              <div key={a.id} className={`bg-white rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${d < 0 ? 'border-rose-200' : 'border-amber-200'}`}>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900 text-sm">{child?.unitNumber}</span>
                    <ExpiryPill state={expiryStateOf(a)} />
                    <TypePill type={typeOf(a)} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {data.profileById.get(a.tenantProfileId)?.name} • {data.parentOf(a.childPropertyId)?.name} • {a.id}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${d < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                    {d < 0 ? `Expired ${-d} days ago on ${formatDate(a.endDate)}` : `Expires in ${d} days on ${formatDate(a.endDate)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRenewing(a)} className={primaryBtn}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Renew / Extend</span>
                  </button>
                  <button type="button" onClick={() => setExiting(a)} className={secondaryBtn}>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'settlements' && (
        <DataTable
          data={settlementRows}
          columns={settlementColumns}
          keyExtractor={r => r.id}
          searchPlaceholder="Search settlement, unit, tenant..."
          exportFileName="rental_settlements"
          printable
          compact
          printTitle="Rental Exit Settlements"
          emptyTitle="No settlements yet"
          emptySubtitle="Use Exit on an active agreement to close an occupancy."
        />
      )}

      {wizardOpen && (
        <AllocationWizard
          presetChildId={presetChild}
          onClose={() => setWizardOpen(false)}
          onDone={text => {
            setWizardOpen(false);
            setNotice({ tone: 'ok', text });
          }}
          allocate={allocateTenant}
        />
      )}

      {renewing && (
        <RenewModal
          agreement={renewing}
          onClose={() => setRenewing(null)}
          onSubmit={(input) => {
            const res = renewAgreement(renewing.id, input);
            if (res.ok) {
              setRenewing(null);
              setNotice({ tone: 'ok', text: `Agreement renewed as ${res.id}. The previous agreement is retained in history and future dues now follow the new terms.` });
            }
            return res;
          }}
        />
      )}

      {uploading && (
        <UploadModal
          agreement={uploading}
          onClose={() => setUploading(null)}
          onSubmit={file => {
            uploadAgreementDocument(uploading.id, file.name, file.size);
            setUploading(null);
            setNotice({ tone: 'ok', text: `Agreement document uploaded for ${uploading.id}.` });
          }}
        />
      )}

      {exiting && (
        <ExitModal
          agreement={exiting}
          onClose={() => setExiting(null)}
          onSubmit={input => {
            const res = exitOccupancy(exiting.id, input);
            if (res.ok) {
              setExiting(null);
              setTab('settlements');
              if (res.id) setSettlementId(res.id); // go straight to Process Refund / Final Settlement
              setNotice({
                tone: 'ok',
                text: input.handoverConfirmed
                  ? `Settlement ${res.id} saved. Occupancy closed and the unit is now vacant.`
                  : `Settlement ${res.id} saved. The unit stays occupied until handover is confirmed.`,
              });
            }
            return res;
          }}
        />
      )}

      {settlementId && (
        <SettlementPanel
          settlementId={settlementId}
          onClose={() => setSettlementId(null)}
          onConfirmHandover={() => {
            const res = confirmHandover(settlementId);
            if (res.ok) setNotice({ tone: 'ok', text: `Handover confirmed for ${settlementId}. Occupancy closed and unit marked vacant.` });
            else setNotice({ tone: 'err', text: res.message || 'Could not confirm handover.' });
            return res;
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Allocation wizard                                                   */
/* ------------------------------------------------------------------ */
const STEPS = ['Property & Unit', 'Tenant', 'Occupancy & Financials', 'Agreement', 'Review & Confirm'];

const AllocationWizard: React.FC<{
  presetChildId: string;
  onClose: () => void;
  onDone: (message: string) => void;
  allocate: ReturnType<typeof useERP>['allocateTenant'];
}> = ({ presetChildId, onClose, onDone, allocate }) => {
  const { parentProperties, childProperties, profiles } = useERP();
  const data = useRentalData();
  const presetChild = childProperties.find(c => c.id === presetChildId && c.status === 'vacant');

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [parentId, setParentId] = useState(presetChild?.parentPropertyId || '');
  const [childId, setChildId] = useState(presetChild?.id || '');
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [occupants, setOccupants] = useState(1);
  const [type, setType] = useState<OccupancyType>('rental');
  const [rent, setRent] = useState(0);
  const [leaseAmount, setLeaseAmount] = useState(0);
  const [leaseTerms, setLeaseTerms] = useState('');
  const [maintenance, setMaintenance] = useState(presetChild?.maintenanceAmount ?? 0);
  const [deposit, setDeposit] = useState(0);
  // The picked due date; its day-of-month is the recurring payment day.
  const [dueDate, setDueDate] = useState(() => dueDateFor(todayStr().slice(0, 7), 5));
  const dueDay = Number(dueDate.slice(8, 10));
  const [duration, setDuration] = useState(12);
  const [escOn, setEscOn] = useState(true);
  const [escPct, setEscPct] = useState('5');
  const [agreementDate, setAgreementDate] = useState('');
  const [commencement, setCommencement] = useState('');
  const [expiry, setExpiry] = useState('');
  const [doc, setDoc] = useState<PickedFile>(null);
  const [recordDeposit, setRecordDeposit] = useState(true);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [bankId, setBankId] = useState('');
  const [channel, setChannel] = useState<DepositChannel>('cash');
  const [cashPart, setCashPart] = useState('');

  const eligibleUnits = childProperties.filter(c => c.parentPropertyId === parentId && c.status === 'vacant');
  const child = childProperties.find(c => c.id === childId);
  const tenant = profiles.find(p => p.id === tenantId);
  const commenceEff = commencement || startDate;
  const expiryEff = expiry || (commenceEff ? addDays(addMonthsTo(commenceEff, Math.max(1, duration || 12)), -1) : '');
  const agreementEff = agreementDate || commenceEff;

  const tenantOptions = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return profiles
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.mobile || '').includes(q))
      .sort((a, b) => Number(b.profileType === 'tenant') - Number(a.profileType === 'tenant') || a.name.localeCompare(b.name));
  }, [profiles, tenantSearch]);

  const validate = (s: number): string => {
    if (s === 1) {
      if (!parentId) return 'Select the parent property.';
      if (!childId) return 'Select a vacant child property.';
    }
    if (s === 2 && !tenantId) return 'Select a tenant from the Master Profile.';
    if (s === 3) {
      if (!startDate) return 'Enter the occupancy start date.';
      if (occupants < 1) return 'Number of occupants must be at least 1.';
      if (type === 'rental' && !(rent > 0)) return 'Enter the monthly rent.';
      if (type === 'lease' && !(leaseAmount > 0)) return 'Enter the lease amount.';
      if (!(duration >= 1)) return 'Enter the rental duration in months.';
      if (!dueDate) return 'Select the monthly payment due date.';
    }
    if (s === 5 && recordDeposit && deposit > 0) {
      if (channel !== 'cash' && !bankId) return 'Select the bank account that received the deposit.';
      if (channel === 'both' && !(Number(cashPart) > 0 && Number(cashPart) < deposit)) return 'For a split receipt, enter a cash amount greater than 0 and less than the deposit.';
    }
    if (s === 4 && (!commenceEff || !expiryEff || expiryEff <= commenceEff)) return 'Expiry date must be after the commencement date.';
    return '';
  };

  const next = () => {
    const msg = validate(step);
    setError(msg);
    if (!msg) setStep(step + 1);
  };

  const confirm = () => {
    for (let s = 1; s <= 5; s++) {
      const msg = validate(s);
      if (msg) {
        setError(msg);
        setStep(s);
        return;
      }
    }
    const res = allocate({
      childPropertyId: childId,
      tenantProfileId: tenantId,
      occupancyType: type,
      occupancyStartDate: startDate,
      occupants,
      rentAmount: type === 'rental' ? rent : 0,
      leaseAmount: type === 'lease' ? leaseAmount : undefined,
      leaseTerms: type === 'lease' ? leaseTerms : undefined,
      maintenanceAmount: maintenance,
      securityDeposit: deposit,
      advanceAmount: 0, // the security deposit covers what used to be entered separately as an advance
      dueDayOfMonth: dueDay,
      agreementDate: agreementEff,
      startDate: commenceEff,
      endDate: expiryEff,
      documentName: doc?.name,
      documentSize: doc?.size,
      recordDeposit,
      paymentMode: channel === 'cash' ? 'cash' : 'bank',
      bankAccountId: channel === 'cash' ? undefined : bankId || undefined,
      depositCashAmount: channel === 'both' ? Number(cashPart) : channel === 'cash' ? deposit : 0,
    });
    if (!res.ok) {
      setError(res.message || 'Allocation failed.');
      return;
    }
    onDone(
      `${child?.unitNumber} allocated to ${tenant?.name} (${res.id}). ${doc ? 'Agreement document uploaded.' : 'Agreement document is Pending Upload — upload it later from the agreements list.'}`
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Allocate Tenant"
      subtitle={`Step ${step} of ${STEPS.length} — ${STEPS[step - 1]}`}
      maxWidth="3xl"
      footer={
        <>
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(step - 1); }} className={secondaryBtn}>Back</button>
          )}
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          {step < STEPS.length ? (
            <button type="button" onClick={next} className={primaryBtn}>Next</button>
          ) : (
            <button type="button" onClick={confirm} className={primaryBtn}>Confirm Allocation</button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-1 mb-5">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${i + 1 <= step ? 'bg-emerald-500' : 'bg-slate-200'}`} title={s} />
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Parent Property" required>
            <select
              value={parentId}
              onChange={e => { setParentId(e.target.value); setChildId(''); }}
              className={inputCls}
            >
              <option value="">— Select parent property —</option>
              {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Vacant Child Property" required hint="Only vacant units are eligible; occupied and under-maintenance units are hidden.">
            <select
              value={childId}
              onChange={e => {
                setChildId(e.target.value);
                const c = childProperties.find(x => x.id === e.target.value);
                if (c) setMaintenance(c.maintenanceAmount || 0);
              }}
              className={inputCls}
              disabled={!parentId}
            >
              <option value="">{parentId && eligibleUnits.length === 0 ? 'No vacant units' : '— Select unit —'}</option>
              {eligibleUnits.map(c => <option key={c.id} value={c.id}>{c.unitNumber} ({c.floor || 'n/a'})</option>)}
            </select>
          </Field>
          {child && (
            <div className="col-span-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">
              <span className="font-semibold text-slate-800">{child.unitNumber}</span> • {child.id} • Floor: {child.floor || '—'} • Standard maintenance {formatCurrency(child.maintenanceAmount)}/mo
              {child.description ? <span className="block mt-1">{child.description}</span> : null}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Field label="Tenant (Master Profile)" required>
              <input value={tenantSearch} onChange={e => setTenantSearch(e.target.value)} placeholder="Search name, ID or mobile" className={inputCls} />
            </Field>
            <select size={8} value={tenantId} onChange={e => setTenantId(e.target.value)} className={`${inputCls} h-44`} aria-label="Tenant list">
              {tenantOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.id}{p.profileType === 'tenant' ? ' (Tenant)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-1.5">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Auto-populated details</h4>
            {tenant ? (
              <>
                <p><span className="text-slate-500">Name:</span> <b>{tenant.name}</b></p>
                <p><span className="text-slate-500">Profile ID:</span> <span className="font-mono">{tenant.id}</span></p>
                <p><span className="text-slate-500">Mobile:</span> {tenant.mobile || '—'}</p>
                <p><span className="text-slate-500">Email:</span> {tenant.email || '—'}</p>
                <p><span className="text-slate-500">Address:</span> {tenant.address || '—'}</p>
                <p><span className="text-slate-500">Aadhaar:</span> {tenant.aadhaar || '—'}</p>
                <p><span className="text-slate-500">PAN:</span> {tenant.pan || '—'}</p>
              </>
            ) : (
              <p className="text-slate-400">Select a profile to see the tenant details. New tenants are created once in the Master Profile directory.</p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Occupancy Start Date" required>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Number of Occupants" required>
              <input type="number" min={1} value={occupants} onChange={e => setOccupants(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Accommodation Type" required>
              <div className="grid grid-cols-2 gap-2">
                {(['rental', 'lease'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2.5 rounded-lg border text-xs font-semibold ${type === t ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' : 'border-slate-300 bg-white text-slate-600'}`}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Rental Duration (months)" required hint="Sets the default agreement expiry.">
              <input type="number" min={1} max={600} value={duration || ''} onChange={e => setDuration(Number(e.target.value))} className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Occupancy Ends">
              <input readOnly value={startDate ? formatDate(addDays(addMonthsTo(startDate, Math.max(1, duration || 12)), -1)) : '—'} className={`${inputCls} bg-slate-50 text-slate-700`} />
            </Field>
            <div className="hidden sm:block" />
            {type === 'rental' ? (
              <Field label="Monthly Rent (₹)" required>
                <input type="number" min={0} value={rent} onChange={e => setRent(Number(e.target.value))} className={`${inputCls} font-mono`} />
              </Field>
            ) : (
              <Field label="Lease Amount (₹)" required>
                <input type="number" min={0} value={leaseAmount} onChange={e => setLeaseAmount(Number(e.target.value))} className={`${inputCls} font-mono`} />
              </Field>
            )}
            <Field label="Monthly Maintenance (₹)" required>
              <input type="number" min={0} value={maintenance} onChange={e => setMaintenance(Number(e.target.value))} className={`${inputCls} font-mono`} />
            </Field>
            <Field label={type === 'lease' ? 'Security Deposit / Refundable Amount (₹)' : 'Security Deposit (₹)'}>
              <input type="number" min={0} value={deposit} onChange={e => setDeposit(Number(e.target.value))} className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Payment Due Date" required hint="Pick a date; its day becomes the monthly due day.">
              <DueDatePicker value={dueDate} onChange={setDueDate} startDate={startDate} today={todayStr()} />
            </Field>
          </div>

          {type === 'rental' && duration >= 12 && (
            <RentEscalationSection
              enabled={escOn}
              onToggle={setEscOn}
              percent={escPct}
              onPercent={setEscPct}
              baseRent={rent}
              startDate={startDate}
              durationMonths={duration}
              today={todayStr()}
            />
          )}

          {type === 'lease' && (
            <Field label="Lease Payment Terms / Settlement Terms" hint="Applied when the occupancy is closed.">
              <textarea rows={2} value={leaseTerms} onChange={e => setLeaseTerms(e.target.value)} className={inputCls} placeholder="e.g. Lease amount paid upfront; refundable amount returned within 30 days of handover" />
            </Field>
          )}

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {type === 'rental'
              ? 'Rental occupants are billed rent + maintenance every month, starting from the occupancy start month.'
              : 'Lease occupants are billed monthly maintenance only. No monthly rent is generated.'}
          </p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Agreement Date">
              <input type="date" value={agreementEff} onChange={e => setAgreementDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Commencement Date" required>
              <input type="date" value={commenceEff} onChange={e => setCommencement(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Expiry Date" required>
              <input type="date" value={expiryEff} onChange={e => setExpiry(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Agreement Document" hint="Optional now — if unavailable the allocation proceeds and the document shows Pending Upload.">
            <FilePicker value={doc} onChange={setDoc} />
          </Field>
          <div className="text-xs">
            Document status: {doc ? <Pill tone="green">Uploaded</Pill> : <Pill tone="amber">Pending Upload</Pill>}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p><span className="text-slate-500">Property:</span> <b>{data.parentById.get(parentId)?.name}</b></p>
            <p><span className="text-slate-500">Unit:</span> <b>{child?.unitNumber}</b></p>
            <p><span className="text-slate-500">Tenant:</span> <b>{tenant?.name}</b> ({tenant?.id})</p>
            <p><span className="text-slate-500">Occupants:</span> {occupants}</p>
            <p><span className="text-slate-500">Type:</span> <b>{typeLabel(type)}</b></p>
            <p><span className="text-slate-500">Start:</span> {formatDate(startDate)}</p>
            {type === 'rental' ? (
              <p><span className="text-slate-500">Monthly rent:</span> <b>{formatCurrency(rent)}</b></p>
            ) : (
              <p><span className="text-slate-500">Lease amount:</span> <b>{formatCurrency(leaseAmount)}</b></p>
            )}
            <p><span className="text-slate-500">Monthly maintenance:</span> <b>{formatCurrency(maintenance)}</b></p>
            <p><span className="text-slate-500">Security deposit:</span> {formatCurrency(deposit)}</p>
            <p><span className="text-slate-500">Agreement period:</span> {formatDate(commenceEff)} → {formatDate(expiryEff)}</p>
            <p><span className="text-slate-500">Document:</span> {doc ? doc.name : 'Pending Upload'}</p>
          </div>

          {deposit > 0 && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <label className="flex items-center space-x-2 font-semibold text-slate-700">
                <input type="checkbox" checked={recordDeposit} onChange={e => setRecordDeposit(e.target.checked)} />
                <span>Record the {formatCurrency(deposit)} security deposit receipt in the Cash / Bank Book now</span>
              </label>
              <p className="text-[11px] text-slate-500">Posted as a refundable deposit, kept separate from rental income.</p>
              {recordDeposit && (
                <DepositReceiptSelector
                  total={deposit}
                  channel={channel}
                  onChannel={setChannel}
                  cashAmount={cashPart}
                  onCashAmount={setCashPart}
                  bankAccountId={bankId}
                  onBankAccount={setBankId}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Renewal                                                             */
/* ------------------------------------------------------------------ */
const RenewModal: React.FC<{
  agreement: RentalAgreement;
  onClose: () => void;
  onSubmit: (input: Parameters<ReturnType<typeof useERP>['renewAgreement']>[1]) => { ok: boolean; message?: string };
}> = ({ agreement, onClose, onSubmit }) => {
  const data = useRentalData();
  const lease = typeOf(agreement) === 'lease';
  const child = data.childById.get(agreement.childPropertyId);
  const defaultStart = addDays(agreement.endDate, 1);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(addYear(defaultStart));
  const [agreementDate, setAgreementDate] = useState(todayStr());
  const [rent, setRent] = useState(agreement.rentAmount);
  const [leaseAmount, setLeaseAmount] = useState(agreement.leaseAmount || 0);
  const [leaseTerms, setLeaseTerms] = useState(agreement.leaseTerms || '');
  const [maintenance, setMaintenance] = useState(agreement.maintenanceAmount);
  const [deposit, setDeposit] = useState(agreement.securityDeposit);
  const [dueDay, setDueDay] = useState(agreement.dueDayOfMonth || 5);
  const [doc, setDoc] = useState<PickedFile>(null);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSubmit({
      agreementDate,
      startDate,
      endDate,
      rentAmount: lease ? 0 : rent,
      leaseAmount: lease ? leaseAmount : undefined,
      leaseTerms: lease ? leaseTerms : undefined,
      maintenanceAmount: maintenance,
      securityDeposit: deposit,
      dueDayOfMonth: dueDay,
      documentName: doc?.name,
      documentSize: doc?.size,
    });
    if (!res.ok) setError(res.message || 'Renewal failed.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Renew / Extend — ${child?.unitNumber || ''}`}
      subtitle={`${data.profileById.get(agreement.tenantProfileId)?.name} • current agreement ${agreement.id} (${formatDate(agreement.startDate)} → ${formatDate(agreement.endDate)})`}
      maxWidth="3xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}
        <div className="grid grid-cols-3 gap-4">
          <Field label="New Agreement Date"><input type="date" value={agreementDate} onChange={e => setAgreementDate(e.target.value)} className={inputCls} /></Field>
          <Field label="New Commencement Date" required><input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></Field>
          <Field label="New Expiry Date" required><input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {lease ? (
            <Field label="Lease Amount (₹)" required><input required type="number" min={0} value={leaseAmount} onChange={e => setLeaseAmount(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
          ) : (
            <Field label="Monthly Rent (₹)" required><input required type="number" min={0} value={rent} onChange={e => setRent(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
          )}
          <Field label="Monthly Maintenance (₹)" required><input required type="number" min={0} value={maintenance} onChange={e => setMaintenance(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
          <Field label={lease ? 'Security Deposit / Refundable (₹)' : 'Security Deposit (₹)'}><input type="number" min={0} value={deposit} onChange={e => setDeposit(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
          <Field label="Payment Due Day"><input type="number" min={1} max={28} value={dueDay} onChange={e => setDueDay(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
        </div>
        {lease && (
          <Field label="Lease Payment / Settlement Terms"><textarea rows={2} value={leaseTerms} onChange={e => setLeaseTerms(e.target.value)} className={inputCls} /></Field>
        )}
        <Field label="New Agreement Document" hint="Optional — shows Pending Upload until provided.">
          <FilePicker value={doc} onChange={setDoc} />
        </Field>
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          The tenant and unit stay linked. The current agreement is kept in history as “Renewed”. Monthly dues are not re-created: unpaid dues from the new commencement month take the new amounts, while paid or part-paid dues keep what was billed.
        </p>
        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" className={primaryBtn}>Renew Agreement</button>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Document upload                                                     */
/* ------------------------------------------------------------------ */
const UploadModal: React.FC<{ agreement: RentalAgreement; onClose: () => void; onSubmit: (file: { name: string; size: string }) => void }> = ({
  agreement,
  onClose,
  onSubmit,
}) => {
  const [file, setFile] = useState<PickedFile>(null);
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Upload Agreement Document"
      subtitle={`Agreement ${agreement.id}`}
      maxWidth="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="button" disabled={!file} onClick={() => file && onSubmit(file)} className={primaryBtn}>
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </>
      }
    >
      <Field label="Agreement Document" required>
        <FilePicker value={file} onChange={setFile} />
      </Field>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Exit & settlement                                                   */
/* ------------------------------------------------------------------ */
const ExitModal: React.FC<{
  agreement: RentalAgreement;
  onClose: () => void;
  onSubmit: (input: Parameters<ReturnType<typeof useERP>['exitOccupancy']>[1]) => { ok: boolean; message?: string };
}> = ({ agreement, onClose, onSubmit }) => {
  const data = useRentalData();
  const lease = typeOf(agreement) === 'lease';
  const child = data.childById.get(agreement.childPropertyId);
  const dues = (data.duesByOccupancy.get(occupancyKey(agreement)) || []).filter(d => !d.closedInSettlement);
  const pendingRent = dues.reduce((s, d) => s + Math.max(0, d.rentDue - d.rentPaid), 0);
  const pendingMaint = dues.reduce((s, d) => s + Math.max(0, d.maintenanceDue - d.maintenancePaid), 0);
  const deposit = (agreement.securityDeposit || 0) + (agreement.advanceAmount || 0);

  const [vacatingDate, setVacatingDate] = useState(todayStr());
  const [otherDues, setOtherDues] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [deductionDescription, setDeductionDescription] = useState('');
  const [handover, setHandover] = useState(false);
  const { bankAccounts } = useERP();
  const [channel, setChannel] = useState<'cash' | 'bank' | 'both'>('cash');
  const [cashAmt, setCashAmt] = useState('');
  const [bankAmt, setBankAmt] = useState('');
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || '');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');

  const net = deposit - pendingRent - pendingMaint - otherDues - deductions;
  const refundable = Math.max(0, net);
  const payable = Math.max(0, -net);
  const target = refundable > 0 ? refundable : payable;
  const cashN = channel === 'bank' ? 0 : Number(cashAmt) || 0;
  const bankN = channel === 'cash' ? 0 : Number(bankAmt) || 0;
  const payNow = cashN + bankN;
  const pickChannel = (c: 'cash' | 'bank' | 'both') => {
    const typed = Number(cashAmt) || Number(bankAmt) || 0;
    if (c === 'cash') { setCashAmt(typed ? String(typed) : ''); setBankAmt(''); }
    if (c === 'bank') { setBankAmt(typed ? String(typed) : ''); setCashAmt(''); }
    setChannel(c);
    setError('');
  };
  const status =target <= 0 ? 'Settled' : payNow >= target ? 'Settled' : payNow > 0 ? 'Partially Settled' : 'Pending';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payNow > target) return setError(`Cash + bank (${formatCurrency(payNow)}) exceeds the amount due of ${formatCurrency(target)}.`);
    if (bankN > 0 && !bankId) return setError('Select the bank account for the bank amount.');
    const res = onSubmit({
      vacatingDate,
      otherDues,
      deductions,
      deductionDescription,
      handoverConfirmed: handover,
      paymentMode: bankN > 0 ? 'bank' : 'cash',
      bankAccountId: bankN > 0 ? bankId : undefined,
      initialPayment: payNow,
      initialCashAmount: cashN,
      initialReference: utr,
    });
    if (!res.ok) setError(res.message || 'Could not save the settlement.');
  };

  const Line: React.FC<{ k: string; v: number; sign?: '+' | '-'; bold?: boolean }> = ({ k, v, sign, bold }) => (
    <div className={`flex justify-between py-1 ${bold ? 'font-bold border-t border-slate-300 mt-1 pt-2' : ''}`}>
      <span className="text-slate-600">{sign ? `${sign} ` : ''}{k}</span>
      <span className="font-mono">{formatCurrency(v)}</span>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Exit / Close Occupancy — ${child?.unitNumber || ''}`}
      subtitle={`${data.profileById.get(agreement.tenantProfileId)?.name} • ${typeLabel(typeOf(agreement))} • ${agreement.id}`}
      maxWidth="4xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Field label="Vacating Date" required><input required type="date" value={vacatingDate} onChange={e => setVacatingDate(e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Other Outstanding Dues (₹)"><input type="number" min={0} value={otherDues} onChange={e => setOtherDues(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
              <Field label="Deductions (₹)"><input type="number" min={0} value={deductions} onChange={e => setDeductions(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
            </div>
            <Field label="Deduction Description" required={deductions > 0} hint="Mandatory whenever a deduction is applied.">
              <textarea rows={2} value={deductionDescription} onChange={e => setDeductionDescription(e.target.value)} className={inputCls} placeholder="e.g. Wall repainting and door damage" />
            </Field>
            {lease && (
              <div className="text-xs bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-900">
                <b>Agreed lease settlement terms</b>
                <p className="mt-1">{agreement.leaseTerms || 'No terms recorded on the agreement.'}</p>
                <p className="mt-1 text-purple-700">Lease amount {formatCurrency(agreement.leaseAmount)}. Only maintenance dues and refundable amount are settled here; no monthly rent applies.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-2">Settlement Calculation</h4>
              <Line k={lease ? 'Refundable deposit / amount' : 'Refundable security deposit + advance'} v={deposit} />
              {!lease && <Line k="Pending rent" v={pendingRent} sign="-" />}
              <Line k="Pending maintenance" v={pendingMaint} sign="-" />
              <Line k="Other outstanding dues" v={otherDues} sign="-" />
              <Line k="Deductions" v={deductions} sign="-" />
              <Line k="Refundable amount (to tenant)" v={refundable} bold />
              <Line k="Amount payable by tenant" v={payable} bold />
              <p className="mt-2 text-[11px] text-slate-500">Deposits are a liability and are kept separate from rental income.</p>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                {refundable > 0 ? 'Refund paid now' : 'Received from tenant now'} — Cash / Bank / Both
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([['cash', 'Cash'], ['bank', 'Bank'], ['both', 'Cash + Bank']] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => pickChannel(id)}
                    className={`rounded-lg border p-2 text-[11px] font-semibold ${channel === id ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {channel !== 'bank' && (
                  <Field label="Cash amount (₹)"><input type="number" min={0} value={cashAmt} onChange={e => { setCashAmt(e.target.value); setError(''); }} className={`${inputCls} font-mono`} placeholder="0" /></Field>
                )}
                {channel !== 'cash' && (
                  <Field label="Bank amount (₹)"><input type="number" min={0} value={bankAmt} onChange={e => { setBankAmt(e.target.value); setError(''); }} className={`${inputCls} font-mono`} placeholder="0" /></Field>
                )}
              </div>
              {bankN > 0 && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <Field label="Bank account" required>
                    <select value={bankId} onChange={e => setBankId(e.target.value)} className={inputCls}>
                      <option value="">— Select bank account —</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — A/c {b.accountNumber}</option>)}
                    </select>
                  </Field>
                  <Field label="UTR / transaction reference"><input value={utr} onChange={e => setUtr(e.target.value)} className={`${inputCls} font-mono`} /></Field>
                </div>
              )}
              <div className="text-xs space-y-1 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <div className="flex justify-between"><span className="text-slate-500">Paid now</span><b className="font-mono">{formatCurrency(payNow)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Remaining</span><b className={`font-mono ${payNow > target ? 'text-rose-600' : ''}`}>{formatCurrency(Math.max(0, target - payNow))}</b></div>
                {payNow > target && <p className="text-[11px] text-rose-600">Cash + bank exceeds the amount due.</p>}
                <p className="text-[10px] text-slate-400">Leave both empty to settle later. More payments can be added from the settlement afterwards.</p>
              </div>
              <div className="text-xs flex items-center justify-between">
                <span className="text-slate-500">Settlement status</span>
                <b>{status}</b>
              </div>
            </div>

            <label className="flex items-start space-x-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={handover} onChange={e => setHandover(e.target.checked)} />
              <span>
                Handover confirmed — close the occupancy and mark the unit vacant
                <span className="block font-normal text-[11px] text-slate-500">Leave unchecked to save the settlement now; the unit stays occupied until handover is confirmed.</span>
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" className={primaryBtn}>{handover ? 'Save Settlement & Close Occupancy' : 'Save Settlement'}</button>
        </div>
      </form>
    </Modal>
  );
};
