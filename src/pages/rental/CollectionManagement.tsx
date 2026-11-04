import React, { useMemo, useState } from 'react';
import { Phone, IndianRupee, AlertCircle, Wallet, Home, Wrench, Plus, Receipt as ReceiptIcon, Search, Download, Printer, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, CheckCircle2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, Column } from '../../components/common/DataTable';
import { DetailDrawer } from '../../components/common/DetailDrawer';
import { ReceiptModal, ReceiptData } from '../../components/common/ReceiptModal';
import { RentCollection, RentalDue, RentalPaymentSplit } from '../../types';
import {
  Field,
  Pill,
  inputCls,
  filterCls,
  primaryBtn,
  secondaryBtn,
  useRentalData,
  TypePill,
  receiptDataFor,
  typeLabel,
} from './rentalUi';
import { dueCollected, dueOutstanding, dueTotal, monthLabel, occupancyKey, todayStr } from '../../utils/rentalUtils';

type RowStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';
type SortKey = 'default' | 'outstanding' | 'due';

interface DueRow {
  id: string;
  parentId: string;
  parentName: string;
  childId: string;
  unit: string;
  floor: string;
  tenantId: string;
  tenant: string;
  contact: string;
  typeKey: 'rental' | 'lease';
  month: string;
  monthText: string;
  currentRent: number;
  maintenance: number;
  previousOutstanding: number;
  /** Earliest month the carried-forward balance relates to. */
  previousSince: string;
  totalDue: number;
  collected: number;
  balance: number;
  lastPayment: string;
  nextDue: string;
  daysOverdue: number;
  status: RowStatus;
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

const STATUS_LABEL: Record<RowStatus, string> = { paid: 'Paid', partial: 'Partially Paid', unpaid: 'Unpaid', overdue: 'Overdue' };
const StatusPill: React.FC<{ status: RowStatus }> = ({ status }) => (
  <Pill tone={status === 'paid' ? 'green' : status === 'partial' ? 'amber' : status === 'overdue' ? 'rose' : 'slate'}>{STATUS_LABEL[status]}</Pill>
);

/** Cash, or the bank instrument(s) used, e.g. "Cash + UPI". */
const modeText = (c: Pick<RentCollection, 'paymentMode' | 'splits'>) =>
  c.splits && c.splits.length > 1 ? c.splits.map(s => s.method).join(' + ') : c.paymentMode === 'cash' ? 'Cash' : 'Bank';

const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000));

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

  const [collectDueId, setCollectDueId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ receiptNumber: string; amount: number } | null>(null);

  const paymentsByDue = useMemo(() => {
    const m = new Map<string, RentCollection[]>();
    rentCollections.forEach(c => c.allocations?.forEach(a => m.set(a.dueId, [...(m.get(a.dueId) || []), c])));
    return m;
  }, [rentCollections]);

  const today = todayStr();

  const dueRows = useMemo<DueRow[]>(() => {
    const rows: DueRow[] = [];
    data.duesByOccupancy.forEach(dues => {
      dues.forEach((d, idx) => {
        const prevOpen = dues.slice(0, idx).filter(e => dueOutstanding(e) > 0);
        const child = data.childById.get(d.childPropertyId);
        const tenant = data.profileById.get(d.tenantProfileId);
        const payments = paymentsByDue.get(d.id) || [];
        // Carried-forward balance is counted once: here as "previous", never inside this month's own charge.
        const previousOutstanding = prevOpen.reduce((s, e) => s + dueOutstanding(e), 0);
        const active = data.activeByChild.get(d.childPropertyId);
        const last = payments.reduce((l, p) => (p.date > l ? p.date : l), '');
        const own = dueOutstanding(d);
        const overdue = own > 0 && d.dueDate < today;
        rows.push({
          id: d.id,
          parentId: child?.parentPropertyId || '',
          parentName: data.parentOf(d.childPropertyId)?.name || '—',
          childId: d.childPropertyId,
          unit: child?.unitNumber || d.childPropertyId,
          floor: child?.floor || '',
          tenantId: d.tenantProfileId,
          tenant: tenant?.name || d.tenantProfileId,
          contact: tenant?.mobile || '',
          typeKey: d.occupancyType,
          month: d.month,
          monthText: monthLabel(d.month),
          currentRent: d.rentDue,
          maintenance: d.maintenanceDue,
          previousOutstanding,
          previousSince: prevOpen[0] ? monthLabel(prevOpen[0].month) : '',
          totalDue: dueTotal(d) + previousOutstanding,
          collected: dueCollected(d),
          balance: own + previousOutstanding,
          lastPayment: last,
          nextDue: own > 0 ? d.dueDate : '',
          daysOverdue: overdue ? daysBetween(d.dueDate, today) : 0,
          status: own === 0 ? 'paid' : overdue ? 'overdue' : dueCollected(d) > 0 ? 'partial' : 'unpaid',
          modes: [...new Set(payments.map(p => p.paymentMode))],
          due: d,
          canCollect: Boolean(active && occupancyKey(active) === d.occupancyId) && own > 0,
        });
      });
    });
    return rows.sort((a, b) => b.month.localeCompare(a.month) || a.unit.localeCompare(b.unit));
  }, [data, paymentsByDue, today]);

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
    const base = receiptDataFor(c, data.profileById.get(c.tenantProfileId)?.name || 'Tenant', c.tenantProfileId, `${child?.unitNumber || ''} (${data.parentOf(c.childPropertyId)?.name || ''})`, bank);
    if (c.splits && c.splits.length > 1) {
      base.paymentMode = modeText(c);
      base.bankName = undefined;
      base.remarks = [c.splits.map(s => `${s.method} ${formatCurrency(s.amount)}${s.transactionRef ? ` (${s.transactionRef})` : ''}`).join(' + '), c.narration].filter(Boolean).join(' • ');
    }
    setReceipt(base);
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

  const paymentColumns: Column<PaymentRow>[] = [
    { header: 'Receipt #', accessor: 'receiptNumber', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-emerald-700">{r.receiptNumber}</span> },
    { header: 'Date', accessor: 'date', sortable: true, render: (_v, r) => formatDate(r.date) },
    { header: 'Unit', accessor: 'unit', render: (_v, r) => <div><span className="font-semibold">{r.unit}</span><span className="block text-[10px] text-slate-500">{r.parentName}</span></div> },
    { header: 'Tenant', accessor: 'tenant' },
    { header: 'Months', accessor: 'monthText', render: (_v, r) => <span className="text-[11px]">{r.monthText || '—'}</span> },
    { header: 'Rent', accessor: 'rentAmount', className: 'text-right', render: (_v, r) => <span className="font-mono">{formatCurrency(r.rentAmount)}</span> },
    { header: 'Maintenance', accessor: 'maintenanceAmount', className: 'text-right', render: (_v, r) => <span className="font-mono">{formatCurrency(r.maintenanceAmount)}</span> },
    { header: 'Total', accessor: 'totalAmount', sortable: true, className: 'text-right', render: (_v, r) => <span className="font-mono font-bold text-emerald-700">{formatCurrency(r.totalAmount)}</span> },
    {
      header: 'Mode / Book',
      accessor: 'paymentMode',
      render: (_v, r) => (
        <span className="text-[11px]">
          {r.splits && r.splits.length > 1
            ? `${modeText(r)} (Cash + Bank Book)`
            : r.paymentMode === 'cash' ? 'Cash Book' : `Bank Book${r.bankAccountId ? ` (${r.bankAccountId})` : ''}`}
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
        <select value={fParent} onChange={e => { setFParent(e.target.value); setFChild('all'); }} className={filterCls} aria-label="Property">
          <option value="all">All properties</option>
          {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={fChild} onChange={e => setFChild(e.target.value)} className={filterCls} aria-label="Unit">
          <option value="all">All units</option>
          {unitOptions.map(c => <option key={c.id} value={c.id}>{c.unitNumber}</option>)}
        </select>
        <select value={fTenant} onChange={e => setFTenant(e.target.value)} className={filterCls} aria-label="Tenant">
          <option value="all">All tenants</option>
          {tenantOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <span className="shrink-0">Rental month</span>
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
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
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
    <div className="space-y-5">
      <PageHeader
        title="Collection Management"
        subtitle="Monthly rent and maintenance dues, partial and split payments, outstanding balances, receipts and payment history."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Collection Management' }]}
        actions={
          <button
            type="button"
            onClick={() => setCollectDueId(dueFiltered.find(r => r.canCollect)?.id || dueRows.find(r => r.canCollect)?.id || '')}
            className={primaryBtn}
          >
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

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="inline-flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Collected {formatCurrency(notice.amount)} — receipt <span className="font-mono font-bold">{notice.receiptNumber}</span> saved.</span>
          </span>
          <span className="space-x-3">
            <button type="button" className="font-semibold hover:underline" onClick={() => setPendingReceipt(notice.receiptNumber)}>View receipt</button>
            <button type="button" className="text-emerald-600 hover:underline" onClick={() => setNotice(null)}>Dismiss</button>
          </span>
        </div>
      )}

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
        <DuesRegister rows={dueFiltered} onCollect={r => setCollectDueId(r.id)} onDetails={r => setDetailsId(r.id)} onHistory={() => setTab('payments')} hasPayments={r => (paymentsByDue.get(r.id) || []).length > 0} />
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

      {collectDueId !== null && (
        <CollectDrawer
          rows={dueRows.filter(r => r.canCollect)}
          initialId={collectDueId}
          onClose={() => setCollectDueId(null)}
          onSaved={(receiptNumber, amount, openReceipt) => {
            setCollectDueId(null);
            if (openReceipt) setPendingReceipt(receiptNumber);
            else setNotice({ receiptNumber, amount });
          }}
          collect={collectRentalPayment}
        />
      )}

      {(() => {
        const r = detailsId ? dueRows.find(x => x.id === detailsId) : undefined;
        if (!r) return null;
        const child = data.childById.get(r.childId);
        const open = dueRows.filter(x => x.tenantId === r.tenantId && x.childId === r.childId && x.due.occupancyId === r.due.occupancyId && dueOutstanding(x.due) > 0);
        const KV = (k: string, v: React.ReactNode) => (
          <div className="flex justify-between py-1.5 text-xs"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v || '—'}</span></div>
        );
        return (
          <DetailDrawer isOpen onClose={() => setDetailsId(null)} title={r.tenant} subtitle={`${r.unit}${r.floor ? ` · ${r.floor}` : ''} · ${r.parentName}`} badge={<TypePill type={r.typeKey} />} size="md">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 divide-y divide-slate-100">
              {KV('Tenant profile', <span className="font-mono">{r.tenantId}</span>)}
              {KV('Contact', r.contact)}
              {KV('Property', r.parentName)}
              {KV('Unit', r.unit)}
              {KV('Floor', r.floor)}
              {KV('Agreement', <span className="font-mono">{r.due.agreementId}</span>)}
              {KV('Standard maintenance', child ? `${formatCurrency(child.maintenanceAmount)}/mo` : '')}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 divide-y divide-slate-100">
              {KV('Open months', open.length ? open.map(x => x.monthText).join(', ') : 'None')}
              {KV('Outstanding (all months)', <span className={open.length ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(open.reduce((s, x) => s + dueOutstanding(x.due), 0))}</span>)}
            </div>
            {r.canCollect && (
              <button type="button" className={`${primaryBtn} w-full justify-center`} onClick={() => { setDetailsId(null); setCollectDueId(r.id); }}>Collect Payment</button>
            )}
          </DetailDrawer>
        );
      })()}

      <ReceiptModal isOpen={Boolean(receipt)} onClose={() => setReceipt(null)} data={receipt} title="Rental Payment Receipt" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const DuesRegister: React.FC<{
  rows: DueRow[];
  onCollect: (r: DueRow) => void;
  onDetails: (r: DueRow) => void;
  onHistory: () => void;
  hasPayments: (r: DueRow) => boolean;
}> = ({ rows, onCollect, onDetails, onHistory, hasPayments }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r => [r.tenant, r.unit, r.parentName, r.monthText, r.contact].some(v => v.toLowerCase().includes(q)))
      : rows;
    if (sort === 'outstanding') return [...filtered].sort((a, b) => b.balance - a.balance);
    // Settled rows have no due date; they go to the end.
    if (sort === 'due') return [...filtered].sort((a, b) => (a.nextDue || '9999').localeCompare(b.nextDue || '9999'));
    return filtered;
  }, [rows, query, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const csvRows = () =>
    list.map(r => [r.tenant, r.unit, r.parentName, r.monthText, r.currentRent, r.maintenance, r.previousOutstanding, r.totalDue, r.collected, r.balance, r.nextDue, STATUS_LABEL[r.status]]);
  const HEAD = ['Tenant', 'Unit', 'Property', 'Rental Month', 'Monthly Rent', 'Maintenance', 'Previous Outstanding', 'Total Due', 'Collected', 'Balance', 'Next Due Date', 'Status'];

  const exportCsv = () => {
    if (!list.length) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [HEAD, ...csvRows()].map(r => r.map(esc).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `rental_collections_${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const print = () => {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    w.document.write(`<html><head><title>Rental Collection Register</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:16px;color:#0f172a}h2{font-size:15px;margin:0 0 12px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px}</style></head><body><h2>Rental Collection Register</h2>
      <table><thead><tr>${HEAD.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
      ${csvRows().map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const mono = 'font-mono whitespace-nowrap tabular-nums';
  const th = 'sticky top-0 z-20 bg-slate-50 border-b border-slate-200 py-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap';
  const stickyL = 'sticky left-0 z-10 border-r border-slate-100';
  const stickyR = 'sticky right-0 z-10 border-l border-slate-100';
  const SortBtn: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => (
    <button type="button" className="inline-flex items-center space-x-1 uppercase hover:text-slate-800" onClick={() => { setSort(sort === k ? 'default' : k); setPage(1); }}>
      <span>{children}</span>
      {sort === k && (k === 'outstanding' ? <ChevronDown className="w-3 h-3 text-emerald-600" /> : <ChevronUp className="w-3 h-3 text-emerald-600" />)}
    </button>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search tenant, property, unit or month..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <select value={sort} onChange={e => { setSort(e.target.value as SortKey); setPage(1); }} className={filterCls} aria-label="Sort register">
            <option value="default">Sort: Latest month</option>
            <option value="outstanding">Sort: Highest outstanding</option>
            <option value="due">Sort: Earliest due date</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button type="button" onClick={print} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Printer className="w-3.5 h-3.5 text-slate-500" /><span>Print</span>
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5 text-slate-500" /><span>Export</span>
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[68vh]">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${th} ${stickyL} z-30 text-left min-w-[14rem]`}>Tenant / Property</th>
              <th className={`${th} text-left`}>Rental Month</th>
              <th className={`${th} text-right`}>Monthly Rent</th>
              <th className={`${th} text-right`}>Maintenance</th>
              <th className={`${th} text-right`}>Previous Outstanding</th>
              <th className={`${th} text-right`}>Total Due</th>
              <th className={`${th} text-right`}>Collected</th>
              <th className={`${th} text-right`}><SortBtn k="outstanding">Balance</SortBtn></th>
              <th className={`${th} text-left`}><SortBtn k="due">Next Due Date</SortBtn></th>
              <th className={`${th} text-left`}>Status</th>
              <th className={`${th} ${stickyR} z-30 text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={11} className="py-12 text-center text-slate-500">No dues match the current filters.</td></tr>
            )}
            {visible.map(r => (
              <tr key={r.id} className="group hover:bg-slate-50/80">
                <td className={`${stickyL} bg-white group-hover:bg-slate-50 border-b border-slate-100 p-0 min-w-[14rem]`}>
                  <button type="button" onClick={() => onDetails(r)} className="block w-full text-left px-2.5 py-1.5 leading-snug focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset" aria-label={`Open details for ${r.tenant}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate" title={r.tenant}>{r.tenant}</span>
                      <TypePill type={r.typeKey} />
                    </span>
                    <span className="block text-[11px] text-slate-700 truncate">{r.unit}{r.floor ? ` · ${r.floor}` : ''}</span>
                    <span className="block text-[11px] text-slate-500 truncate" title={r.parentName}>{r.parentName}</span>
                    {r.contact && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono">{r.contact}</span>
                      </span>
                    )}
                  </button>
                </td>
                <td className="border-b border-slate-100 px-2.5 whitespace-nowrap font-medium text-slate-800">{r.monthText}</td>
                <td className="border-b border-slate-100 px-2.5 text-right">
                  {r.typeKey === 'lease' ? <span className="text-slate-400">n/a</span> : <span className={`${mono} text-slate-900`}>{formatCurrency(r.currentRent)}</span>}
                </td>
                <td className={`border-b border-slate-100 px-2.5 text-right ${mono} text-slate-500`}>{formatCurrency(r.maintenance)}</td>
                <td className="border-b border-slate-100 px-2.5 text-right">
                  <span className={`${mono} block ${r.previousOutstanding > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>{formatCurrency(r.previousOutstanding)}</span>
                  {r.previousOutstanding > 0 && <span className="block text-[10px] text-slate-500">since {r.previousSince}</span>}
                </td>
                <td className={`border-b border-slate-100 px-2.5 text-right ${mono} font-semibold text-slate-900`}>{formatCurrency(r.totalDue)}</td>
                <td className={`border-b border-slate-100 px-2.5 text-right ${mono} ${r.collected > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{formatCurrency(r.collected)}</td>
                <td className={`border-b border-slate-100 px-2.5 text-right ${mono} font-bold ${r.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(r.balance)}</td>
                <td className="border-b border-slate-100 px-2.5 whitespace-nowrap">
                  {r.nextDue ? (
                    <>
                      <span className="block text-slate-700">{formatDate(r.nextDue)}</span>
                      {r.daysOverdue > 0 && <span className="block text-[10px] text-rose-600">{r.daysOverdue} day{r.daysOverdue === 1 ? '' : 's'} overdue</span>}
                    </>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="border-b border-slate-100 px-2.5"><StatusPill status={r.status} /></td>
                <td className={`${stickyR} bg-white group-hover:bg-slate-50 border-b border-slate-100 px-2.5 text-right`}>
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    {r.canCollect && (
                      <button type="button" onClick={() => onCollect(r)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">Collect</button>
                    )}
                    {hasPayments(r) && (
                      <button type="button" onClick={onHistory} className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold">History</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
        <span>Showing {list.length ? (current - 1) * PAGE_SIZE + 1 : 0} to {Math.min(current * PAGE_SIZE, list.length)} of {list.length} entries</span>
        <div className="flex items-center space-x-1">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-2 font-medium text-slate-700">{current} / {pages}</span>
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Payment drawer
// ---------------------------------------------------------------------------

const METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'] as const;
type Method = typeof METHODS[number];

interface Line { key: number; method: Method; amount: string; bankAccountId: string; ref: string }

const CollectDrawer: React.FC<{
  rows: DueRow[];
  initialId: string;
  onClose: () => void;
  onSaved: (receiptNumber: string, amount: number, openReceipt: boolean) => void;
  collect: ReturnType<typeof useERP>['collectRentalPayment'];
}> = ({ rows, initialId, onClose, onSaved, collect }) => {
  const { bankAccounts } = useERP();
  const data = useRentalData();

  const [dueId, setDueId] = useState(initialId || rows[0]?.id || '');
  const row = rows.find(r => r.id === dueId);

  const defaultBank = bankAccounts[0]?.id || '';
  const blank = (key: number, amount = ''): Line => ({ key, method: 'Cash', amount, bankAccountId: defaultBank, ref: '' });
  const [lines, setLines] = useState<Line[]>(() => [blank(1, row ? String(row.balance) : '')]);
  const [date, setDate] = useState(todayStr());
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const pickRow = (id: string) => {
    setDueId(id);
    const next = rows.find(r => r.id === id);
    setLines([blank(1, next ? String(next.balance) : '')]);
    setError('');
  };

  const setLine = (key: number, patch: Partial<Line>) => { setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l))); setError(''); };
  const addLine = () => setLines(ls => [...ls, { ...blank(Math.max(...ls.map(l => l.key)) + 1), method: ls.some(l => l.method === 'Cash') ? 'UPI' : 'Cash' }]);

  const received = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balance = row?.balance ?? 0;
  const remaining = balance - received;

  const save = (withReceipt: boolean) => {
    if (!row) return;
    const active = lines.filter(l => Number(l.amount) > 0);
    if (!active.length) return setError('Enter the amount received.');
    if (received > balance) return setError(`Amount exceeds the balance of ${formatCurrency(balance)}.`);
    if (active.some(l => l.method !== 'Cash' && !l.bankAccountId)) return setError('Select the bank account for every bank amount.');

    // One leg per book: all cash together, and one leg per receiving bank account.
    const legs = new Map<string, RentalPaymentSplit>();
    active.forEach(l => {
      const isCash = l.method === 'Cash';
      const k = isCash ? 'cash' : l.bankAccountId;
      const prev = legs.get(k);
      const amount = Number(l.amount);
      legs.set(k, {
        mode: isCash ? 'cash' : 'bank',
        method: prev ? (prev.method.split(' + ').includes(l.method) ? prev.method : `${prev.method} + ${l.method}`) : l.method,
        amount: (prev?.amount || 0) + amount,
        bankAccountId: isCash ? undefined : l.bankAccountId,
        transactionRef: [prev?.transactionRef, l.ref.trim()].filter(Boolean).join(', ') || undefined,
      });
    });
    const splits = [...legs.values()];

    const res = collect({
      childPropertyId: row.childId,
      amount: received,
      date,
      mode: splits[0].mode,
      bankAccountId: splits[0].bankAccountId,
      transactionRef: splits.map(s => s.transactionRef).filter(Boolean).join(', ') || undefined,
      narration: remarks.trim() || undefined,
      splits,
    });
    if (!res.ok) return setError(res.message || 'Could not save the collection.');
    onSaved(res.id || '', received, withReceipt);
  };

  const tenant = row ? data.profileById.get(row.tenantId) : undefined;
  const KV: React.FC<{ k: string; children: React.ReactNode; strong?: boolean }> = ({ k, children, strong }) => (
    <div className={`flex items-center justify-between py-1.5 ${strong ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span>{k}</span><span className="font-mono tabular-nums">{children}</span>
    </div>
  );

  return (
    <DetailDrawer isOpen onClose={onClose} title="Collect Payment" subtitle="Payments are applied to the oldest outstanding dues first. Partial and split payments are allowed." size="md">
      {!row ? (
        <p className="text-sm text-slate-500">There are no outstanding dues to collect.</p>
      ) : (
        <form onSubmit={e => { e.preventDefault(); save(true); }} className="space-y-5 text-xs">
          <Field label="Due to collect">
            <select value={dueId} onChange={e => pickRow(e.target.value)} className={inputCls}>
              {rows.map(r => <option key={r.id} value={r.id}>{r.unit} — {r.tenant} — {r.monthText}</option>)}
            </select>
          </Field>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{row.tenant}</div>
                <div className="text-slate-500">{row.unit} · {row.parentName}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{tenant?.mobile || ''}</div>
              </div>
              <TypePill type={row.typeKey} />
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-600">
              <span>Rental agreement</span><span className="font-mono">{row.due.agreementId}</span>
            </div>
            <div className="flex justify-between text-slate-600"><span>Rental month</span><span className="font-semibold text-slate-800">{row.monthText}</span></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 divide-y divide-slate-100">
            <KV k="Monthly rent">{row.typeKey === 'lease' ? 'n/a' : formatCurrency(row.currentRent)}</KV>
            <KV k="Maintenance charges">{formatCurrency(row.maintenance)}</KV>
            <KV k={`Previous outstanding${row.previousSince ? ` (since ${row.previousSince})` : ''}`}>
              <span className={row.previousOutstanding > 0 ? 'text-amber-700' : ''}>{formatCurrency(row.previousOutstanding)}</span>
            </KV>
            <KV k="Penalty"><span className="text-slate-400">{formatCurrency(0)}</span></KV>
            <KV k="Total due" strong>{formatCurrency(row.totalDue)}</KV>
            <KV k="Previously collected"><span className="text-emerald-700">{formatCurrency(row.collected)}</span></KV>
            <KV k="Balance before this payment" strong>{formatCurrency(balance)}</KV>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Payment entry</h4>
              <button type="button" onClick={addLine} className="inline-flex items-center space-x-1 text-emerald-700 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /><span>Split payment</span>
              </button>
            </div>

            {lines.map((l, i) => (
              <div key={l.key} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span>{lines.length > 1 ? `Payment ${i + 1}` : 'Payment'}</span>
                  {lines.length > 1 && (
                    <button type="button" aria-label="Remove payment" className="text-slate-400 hover:text-rose-600" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Payment mode" required>
                    <select value={l.method} onChange={e => setLine(l.key, { method: e.target.value as Method })} className={inputCls}>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Amount received (₹)" required>
                    <input type="number" min={0} value={l.amount} onChange={e => setLine(l.key, { amount: e.target.value })} className={`${inputCls} font-mono font-bold`} />
                  </Field>
                </div>
                {l.method !== 'Cash' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Receiving bank account" required>
                      <select value={l.bankAccountId} onChange={e => setLine(l.key, { bankAccountId: e.target.value })} className={inputCls}>
                        <option value="">— Select —</option>
                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                      </select>
                    </Field>
                    <Field label="Transaction reference">
                      <input value={l.ref} onChange={e => setLine(l.key, { ref: e.target.value })} className={`${inputCls} font-mono`} placeholder={l.method === 'Cheque' ? 'Cheque no.' : 'UTR / UPI ref'} />
                    </Field>
                  </div>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Payment date" required>
                <input type="date" required value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Remarks"><input value={remarks} onChange={e => setRemarks(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 divide-y divide-slate-100">
            <KV k="Current payment"><span className="text-emerald-700 font-bold">{formatCurrency(received)}</span></KV>
            <KV k="Remaining balance" strong>
              <span className={remaining > 0 ? 'text-rose-600' : remaining < 0 ? 'text-rose-700' : 'text-emerald-700'}>{formatCurrency(Math.max(0, remaining))}</span>
            </KV>
            {remaining > 0 && received > 0 && <div className="pt-1.5 text-[10px] text-amber-700">Partial payment — {formatCurrency(remaining)} stays outstanding.</div>}
            {remaining < 0 && <div className="pt-1.5 text-[10px] text-rose-600">Amount exceeds the balance by {formatCurrency(-remaining)}.</div>}
          </div>

          {error && <div className={`rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2`}>{error}</div>}

          <div className="sticky -bottom-6 -mx-6 px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-end space-x-2">
            <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
            <button type="button" onClick={() => save(false)} className={secondaryBtn}>Save Payment</button>
            <button type="submit" className={primaryBtn}>Save &amp; Generate Receipt</button>
          </div>
        </form>
      )}
    </DetailDrawer>
  );
};
