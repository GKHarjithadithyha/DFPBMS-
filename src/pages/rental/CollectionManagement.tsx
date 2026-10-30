import React, { useMemo, useState } from 'react';
import { IndianRupee, AlertCircle, Wallet, Home, Wrench, Plus, Receipt as ReceiptIcon } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { PaymentMode, RentCollection, RentalDue } from '../../types';
import {
  Field,
  inputCls,
  filterCls,
  primaryBtn,
  secondaryBtn,
  useRentalData,
  CollectionStatusPill,
  TypePill,
  receiptDataFor,
  typeLabel,
} from './rentalUi';
import { dueCollected, dueOutstanding, dueStatusOf, dueTotal, monthLabel, occupancyKey, todayStr } from '../../utils/rentalUtils';

interface DueRow {
  id: string;
  parentId: string;
  parentName: string;
  childId: string;
  unit: string;
  tenantId: string;
  tenant: string;
  contact: string;
  accommodation: string;
  typeKey: 'rental' | 'lease';
  month: string;
  monthText: string;
  prevRent: number;
  prevRentDueDate: string;
  currentRent: number;
  maintenance: number;
  previousOutstanding: number;
  totalDue: number;
  collected: number;
  balance: number;
  lastPayment: string;
  nextDue: string;
  status: 'fully_paid' | 'partially_paid' | 'unpaid';
  modes: string[];
  due: RentalDue;
  canCollect: boolean;
}

interface PaymentRow extends RentCollection {
  parentId: string;
  parentName: string;
  unit: string;
  tenant: string;
  accommodation: string;
  typeKey: string;
  monthText: string;
}

export const CollectionManagement: React.FC = () => {
  const { parentProperties, childProperties, rentalDues, rentCollections, collectRentalPayment, bankAccounts } = useERP();
  const data = useRentalData();

  const [tab, setTab] = useState<'dues' | 'payments'>('dues');
  const [fParent, setFParent] = useState('all');
  const [fChild, setFChild] = useState('all');
  const [fTenant, setFTenant] = useState('all');
  const [fMonth, setFMonth] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fType, setFType] = useState('all');
  const [fMode, setFMode] = useState('all');
  const [fStatus, setFStatus] = useState('all');

  const [collectChild, setCollectChild] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);

  const paymentsByDue = useMemo(() => {
    const m = new Map<string, RentCollection[]>();
    rentCollections.forEach(c => c.allocations?.forEach(a => m.set(a.dueId, [...(m.get(a.dueId) || []), c])));
    return m;
  }, [rentCollections]);

  const dueRows = useMemo<DueRow[]>(() => {
    const rows: DueRow[] = [];
    data.duesByOccupancy.forEach(dues => {
      dues.forEach((d, idx) => {
        const earlier = dues.slice(0, idx);
        const prevOpen = earlier.filter(e => dueOutstanding(e) > 0);
        const prevRentOpen = prevOpen.filter(e => e.rentDue - e.rentPaid > 0 && !e.closedInSettlement);
        const child = data.childById.get(d.childPropertyId);
        const tenant = data.profileById.get(d.tenantProfileId);
        const payments = paymentsByDue.get(d.id) || [];
        const previousOutstanding = prevOpen.reduce((s, e) => s + dueOutstanding(e), 0);
        const active = data.activeByChild.get(d.childPropertyId);
        const last = payments.reduce((l, p) => (p.date > l ? p.date : l), '');
        rows.push({
          id: d.id,
          parentId: child?.parentPropertyId || '',
          parentName: data.parentOf(d.childPropertyId)?.name || '—',
          childId: d.childPropertyId,
          unit: child?.unitNumber || d.childPropertyId,
          tenantId: d.tenantProfileId,
          tenant: tenant?.name || d.tenantProfileId,
          contact: tenant?.mobile || '',
          accommodation: typeLabel(d.occupancyType),
          typeKey: d.occupancyType,
          month: d.month,
          monthText: monthLabel(d.month),
          prevRent: prevRentOpen.reduce((s, e) => s + Math.max(0, e.rentDue - e.rentPaid), 0),
          prevRentDueDate: prevRentOpen[0]?.dueDate || '',
          currentRent: d.rentDue,
          maintenance: d.maintenanceDue,
          previousOutstanding,
          totalDue: dueTotal(d) + previousOutstanding,
          collected: dueCollected(d),
          balance: dueOutstanding(d) + previousOutstanding,
          lastPayment: last,
          nextDue: dueOutstanding(d) > 0 ? d.dueDate : '',
          status: dueStatusOf(d),
          modes: [...new Set(payments.map(p => p.paymentMode))],
          due: d,
          canCollect: Boolean(active && occupancyKey(active) === d.occupancyId) && dueOutstanding(d) > 0,
        });
      });
    });
    return rows.sort((a, b) => b.month.localeCompare(a.month) || a.unit.localeCompare(b.unit));
  }, [data, paymentsByDue]);

  const paymentRows = useMemo<PaymentRow[]>(
    () =>
      rentCollections.map(c => {
        const child = data.childById.get(c.childPropertyId);
        const agr = data.agreementById.get(c.agreementId);
        const type = agr ? data.typeOf(agr) : 'rental';
        return {
          ...c,
          parentId: child?.parentPropertyId || '',
          parentName: data.parentOf(c.childPropertyId)?.name || '—',
          unit: child?.unitNumber || c.childPropertyId,
          tenant: data.profileById.get(c.tenantProfileId)?.name || c.tenantProfileId,
          accommodation: typeLabel(type),
          typeKey: type,
          monthText: c.forMonthYear || '',
        };
      }),
    [rentCollections, data]
  );

  const tenantOptions = useMemo(() => {
    const m = new Map<string, string>();
    dueRows.forEach(r => m.set(r.tenantId, r.tenant));
    return [...m.entries()];
  }, [dueRows]);

  const unitOptions = childProperties.filter(c => fParent === 'all' || c.parentPropertyId === fParent);

  const dueFiltered = dueRows.filter(r => {
    if (fParent !== 'all' && r.parentId !== fParent) return false;
    if (fChild !== 'all' && r.childId !== fChild) return false;
    if (fTenant !== 'all' && r.tenantId !== fTenant) return false;
    if (fMonth && r.month !== fMonth) return false;
    if (fType !== 'all' && r.typeKey !== fType) return false;
    if (fMode !== 'all' && !r.modes.includes(fMode)) return false;
    if (fStatus !== 'all' && r.status !== fStatus) return false;
    if ((fFrom || fTo) && (!r.lastPayment || (fFrom && r.lastPayment < fFrom) || (fTo && r.lastPayment > fTo))) return false;
    return true;
  });

  const payFiltered = paymentRows.filter(r => {
    if (fParent !== 'all' && r.parentId !== fParent) return false;
    if (fChild !== 'all' && r.childPropertyId !== fChild) return false;
    if (fTenant !== 'all' && r.tenantProfileId !== fTenant) return false;
    if (fMonth && !(r.allocations || []).some(a => a.month === fMonth)) return false;
    if (fType !== 'all' && r.typeKey !== fType) return false;
    if (fMode !== 'all' && r.paymentMode !== fMode) return false;
    if (fFrom && r.date < fFrom) return false;
    if (fTo && r.date > fTo) return false;
    return true;
  });

  // Summary is computed from the filtered monthly dues (each month's own charge, so carried-forward balances are not double counted).
  const own = dueFiltered.map(r => r.due);
  const summary = {
    totalDue: own.reduce((s, d) => s + dueTotal(d), 0),
    collected: own.reduce((s, d) => s + dueCollected(d), 0),
    outstanding: own.reduce((s, d) => s + dueOutstanding(d), 0),
    rent: own.reduce((s, d) => s + d.rentPaid, 0),
    maint: own.reduce((s, d) => s + d.maintenancePaid, 0),
  };

  const showReceipt = (c: RentCollection) => {
    const bank = c.bankAccountId ? bankAccounts.find(b => b.id === c.bankAccountId)?.bankName : undefined;
    const child = data.childById.get(c.childPropertyId);
    setReceipt(
      receiptDataFor(c, data.profileById.get(c.tenantProfileId)?.name || 'Tenant', c.tenantProfileId, `${child?.unitNumber || ''} (${data.parentOf(c.childPropertyId)?.name || ''})`, bank)
    );
  };

  // Open the receipt as soon as the freshly saved collection shows up in state.
  React.useEffect(() => {
    if (!pendingReceipt) return;
    const rec = rentCollections.find(c => c.receiptNumber === pendingReceipt);
    if (rec) {
      showReceipt(rec);
      setPendingReceipt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReceipt, rentCollections]);

  const mono = 'font-mono whitespace-nowrap';
  const dueColumns: Column<DueRow>[] = [
    {
      header: 'Property / Unit',
      accessor: 'unit',
      sortable: true,
      render: (_v, r) => (
        <div className="min-w-[8rem] max-w-[11rem]">
          <span className="font-semibold text-slate-900 block truncate" title={r.unit}>{r.unit}</span>
          <span className="block text-[10px] text-slate-500 truncate" title={r.parentName}>{r.parentName}</span>
        </div>
      ),
    },
    {
      header: 'Tenant',
      accessor: 'tenant',
      sortable: true,
      render: (_v, r) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold">{r.tenant}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <TypePill type={r.typeKey} />
            <span>{r.contact}</span>
          </div>
        </div>
      ),
    },
    { header: 'Month', accessor: 'month', sortable: true, render: (_v, r) => <span className="whitespace-nowrap font-medium">{r.monthText}</span> },
    {
      header: 'Rent',
      accessor: 'currentRent',
      render: (_v, r) =>
        r.typeKey === 'lease' ? (
          <span className="text-slate-400">n/a</span>
        ) : (
          <div className="whitespace-nowrap leading-tight">
            <span className={`${mono} block`}>{formatCurrency(r.currentRent)}</span>
            {r.prevRent > 0 && <span className="block text-[10px] text-rose-600">prev {formatCurrency(r.prevRent)} • {formatDate(r.prevRentDueDate)}</span>}
          </div>
        ),
    },
    { header: 'Maint.', accessor: 'maintenance', render: (_v, r) => <span className={mono}>{formatCurrency(r.maintenance)}</span> },
    { header: 'Prev. O/S', accessor: 'previousOutstanding', render: (_v, r) => <span className={`${mono} ${r.previousOutstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(r.previousOutstanding)}</span> },
    { header: 'Total Due', accessor: 'totalDue', sortable: true, render: (_v, r) => <span className={`${mono} font-semibold`}>{formatCurrency(r.totalDue)}</span> },
    { header: 'Collected', accessor: 'collected', render: (_v, r) => <span className={`${mono} text-emerald-700`}>{formatCurrency(r.collected)}</span> },
    { header: 'Balance', accessor: 'balance', sortable: true, render: (_v, r) => <span className={`${mono} font-bold ${r.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatCurrency(r.balance)}</span> },
    {
      header: 'Last / Next',
      accessor: 'lastPayment',
      render: (_v, r) => (
        <div className="whitespace-nowrap text-[11px] leading-tight">
          <span className="block text-slate-700">{r.lastPayment ? formatDate(r.lastPayment) : '—'}</span>
          <span className="block text-slate-400">{r.nextDue ? `due ${formatDate(r.nextDue)}` : '—'}</span>
        </div>
      ),
    },
    { header: 'Status', accessor: 'status', render: (_v, r) => <CollectionStatusPill status={r.status} /> },
    {
      header: 'Actions',
      render: (_v, r) => (
        <div className="flex gap-1 whitespace-nowrap">
          {r.canCollect && (
            <button type="button" onClick={() => setCollectChild(r.childId)} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold">Collect</button>
          )}
          {(paymentsByDue.get(r.id) || []).length > 0 && (
            <button type="button" onClick={() => setTab('payments')} className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold">History</button>
          )}
        </div>
      ),
    },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    { header: 'Receipt #', accessor: 'receiptNumber', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-emerald-700">{r.receiptNumber}</span> },
    { header: 'Date', accessor: 'date', sortable: true, render: (_v, r) => formatDate(r.date) },
    { header: 'Unit', accessor: 'unit', render: (_v, r) => <div><span className="font-semibold">{r.unit}</span><span className="block text-[10px] text-slate-500">{r.parentName}</span></div> },
    { header: 'Tenant', accessor: 'tenant' },
    { header: 'Months', accessor: 'monthText', render: (_v, r) => <span className="text-[11px]">{r.monthText || '—'}</span> },
    { header: 'Rent', accessor: 'rentAmount', render: (_v, r) => <span className="font-mono">{formatCurrency(r.rentAmount)}</span> },
    { header: 'Maintenance', accessor: 'maintenanceAmount', render: (_v, r) => <span className="font-mono">{formatCurrency(r.maintenanceAmount)}</span> },
    { header: 'Total', accessor: 'totalAmount', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-emerald-700">{formatCurrency(r.totalAmount)}</span> },
    {
      header: 'Mode / Book',
      accessor: 'paymentMode',
      render: (_v, r) => (
        <span className="uppercase text-[11px]">
          {r.paymentMode === 'cash' ? 'Cash Book' : `Bank Book${r.bankAccountId ? ` (${r.bankAccountId})` : ''}`}
        </span>
      ),
    },
    { header: 'Reference', accessor: 'transactionRef', render: (_v, r) => r.transactionRef || '—' },
    {
      header: 'Receipt',
      render: (_v, r) => (
        <button type="button" onClick={() => showReceipt(r)} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center space-x-1">
          <ReceiptIcon className="w-3 h-3" />
          <span>View</span>
        </button>
      ),
    },
  ];

  const filters = (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select value={fParent} onChange={e => { setFParent(e.target.value); setFChild('all'); }} className={filterCls} aria-label="Parent property">
          <option value="all">All parent properties</option>
          {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={fChild} onChange={e => setFChild(e.target.value)} className={filterCls} aria-label="Child property">
          <option value="all">All child properties</option>
          {unitOptions.map(c => <option key={c.id} value={c.id}>{c.unitNumber}</option>)}
        </select>
        <select value={fTenant} onChange={e => setFTenant(e.target.value)} className={filterCls} aria-label="Tenant">
          <option value="all">All tenants</option>
          {tenantOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <span className="shrink-0">Month</span>
          <input type="month" value={fMonth} onChange={e => setFMonth(e.target.value)} className={`${filterCls} w-full`} />
        </label>
        <select value={fType} onChange={e => setFType(e.target.value)} className={filterCls} aria-label="Accommodation type">
          <option value="all">Rental &amp; Lease</option>
          <option value="rental">Rental</option>
          <option value="lease">Lease</option>
        </select>
        <select value={fMode} onChange={e => setFMode(e.target.value)} className={filterCls} aria-label="Payment mode">
          <option value="all">All payment modes</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={filterCls} aria-label="Collection status" disabled={tab === 'payments'}>
          <option value="all">All collection status</option>
          <option value="fully_paid">Fully Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <span className="shrink-0">Collected</span>
          <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} className={`${filterCls} w-full`} aria-label="Collection date from" />
          <span>–</span>
          <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} className={`${filterCls} w-full`} aria-label="Collection date to" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Management"
        subtitle="Monthly rent and maintenance dues, partial payments, outstanding balances, receipts and payment history."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Collection Management' }]}
        actions={
          <button type="button" onClick={() => setCollectChild('')} className={primaryBtn}>
            <Plus className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Due" value={formatCurrency(summary.totalDue)} subtitle="Rent + maintenance billed" icon={Wallet} variant="blue" />
        <StatCard title="Total Collected" value={formatCurrency(summary.collected)} icon={IndianRupee} variant="emerald" />
        <StatCard title="Outstanding" value={formatCurrency(summary.outstanding)} icon={AlertCircle} variant="rose" />
        <StatCard title="Rental Collections" value={formatCurrency(summary.rent)} icon={Home} variant="purple" />
        <StatCard title="Maintenance Collections" value={formatCurrency(summary.maint)} icon={Wrench} variant="amber" />
      </div>

      <Tabs
        variant="pills"
        activeTab={tab}
        onChange={t => setTab(t as typeof tab)}
        tabs={[
          { id: 'dues', label: 'Monthly Dues', count: dueFiltered.length },
          { id: 'payments', label: 'Payment History & Receipts', count: payFiltered.length },
        ]}
      />

      {filters}

      {tab === 'dues' ? (
        <DataTable
          data={dueFiltered}
          columns={dueColumns}
          keyExtractor={r => r.id}
          searchPlaceholder="Search unit, tenant, month..."
          exportFileName="rental_collections"
          printable
          compact
          printTitle="Rental Collection Register"
          emptyTitle="No dues to show"
          emptySubtitle="Dues appear once a tenant is allocated; they are generated monthly."
        />
      ) : (
        <DataTable
          data={payFiltered}
          columns={paymentColumns}
          keyExtractor={r => r.id}
          searchPlaceholder="Search receipt, unit, tenant..."
          exportFileName="rental_payments"
          printable
          compact
          printTitle="Rental Payment History"
          emptyTitle="No payments recorded"
        />
      )}

      {collectChild !== null && (
        <CollectModal
          presetChildId={collectChild}
          onClose={() => setCollectChild(null)}
          onSaved={receiptNumber => {
            setCollectChild(null);
            setPendingReceipt(receiptNumber);
          }}
          collect={collectRentalPayment}
        />
      )}

      <ReceiptModal isOpen={Boolean(receipt)} onClose={() => setReceipt(null)} data={receipt} title="Rental Payment Receipt" />
    </div>
  );
};

const CollectModal: React.FC<{
  presetChildId: string;
  onClose: () => void;
  onSaved: (receiptNumber: string) => void;
  collect: ReturnType<typeof useERP>['collectRentalPayment'];
}> = ({ presetChildId, onClose, onSaved, collect }) => {
  const data = useRentalData();
  const occupied = [...data.activeByChild.keys()];

  const [childId, setChildId] = useState(presetChildId || occupied[0] || '');
  const [amount, setAmount] = useState(0);
  const [touched, setTouched] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [bankId, setBankId] = useState('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [error, setError] = useState('');

  const agr = data.activeByChild.get(childId);
  const dues = agr ? (data.duesByOccupancy.get(agr.occupancyId || agr.id) || []).filter(d => dueOutstanding(d) > 0) : [];
  const outstanding = dues.reduce((s, d) => s + dueOutstanding(d), 0);
  const effectiveAmount = touched ? amount : outstanding;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = collect({
      childPropertyId: childId,
      amount: effectiveAmount,
      date,
      mode,
      bankAccountId: mode === 'bank' ? bankId || undefined : undefined,
      transactionRef: reference || undefined,
      narration: narration || undefined,
    });
    if (!res.ok) {
      setError(res.message || 'Could not save the collection.');
      return;
    }
    onSaved(res.id || '');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Collect Rent / Maintenance"
      subtitle="Payments are applied to the oldest outstanding dues first. Partial payments are allowed."
      maxWidth="3xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Occupied Unit" required>
            <select
              required
              value={childId}
              onChange={e => { setChildId(e.target.value); setTouched(false); }}
              className={inputCls}
            >
              <option value="">— Select unit —</option>
              {occupied.map(id => {
                const c = data.childById.get(id);
                const a = data.activeByChild.get(id);
                return <option key={id} value={id}>{c?.unitNumber} — {data.profileById.get(a?.tenantProfileId || '')?.name}</option>;
              })}
            </select>
          </Field>
          <Field label="Collection Date" required>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {agr && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">{data.profileById.get(agr.tenantProfileId)?.name} • {typeLabel(data.typeOf(agr))}</span>
              <span className="font-mono font-bold text-rose-600">Outstanding {formatCurrency(outstanding)}</span>
            </div>
            {dues.length === 0 ? (
              <p className="text-slate-500">No outstanding dues for this occupancy.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-6">
                {dues.map(d => (
                  <li key={d.id} className="flex justify-between text-slate-600">
                    <span>{monthLabel(d.month)}</span>
                    <span className="font-mono">{formatCurrency(dueOutstanding(d))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Field label="Collection Amount (₹)" required hint="Enter less than the outstanding amount for a partial payment.">
          <input
            required
            type="number"
            min={1}
            max={outstanding || undefined}
            value={effectiveAmount}
            onChange={e => { setTouched(true); setAmount(Number(e.target.value)); }}
            className={`${inputCls} font-mono`}
          />
        </Field>

        <CashBankSelector mode={mode} onModeChange={setMode} bankAccountId={bankId} onBankAccountChange={setBankId} label="Payment Mode & Cash / Bank Book" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Transaction Reference"><input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} placeholder="UTR / cheque no." /></Field>
          <Field label="Narration / Description"><input value={narration} onChange={e => setNarration(e.target.value)} className={inputCls} /></Field>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={!agr || outstanding === 0} className={primaryBtn}>Save Collection &amp; Generate Receipt</button>
        </div>
      </form>
    </Modal>
  );
};
