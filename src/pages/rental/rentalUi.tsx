import React, { useMemo, useRef } from 'react';
import { Paperclip, Pencil } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ChildProperty, ParentProperty, Profile, RentalAgreement, RentCollection, RentalDue } from '../../types';
import { ReceiptData } from '../../components/common/ReceiptModal';
import {
  dueOutstanding,
  dueDateFor,
  documentStatusOf,
  expiryStateOf,
  monthOf,
  occupancyKey,
  todayStr,
  typeOf,
  AgreementExpiryState,
} from '../../utils/rentalUtils';

export const inputCls = 'w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500';
export const filterCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500';
export const primaryBtn = 'inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const secondaryBtn = 'inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors';

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  required,
  hint,
  children,
  className = '',
}) => (
  <div className={className}>
    <label className="block text-slate-700 font-semibold mb-1 text-xs">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
  </div>
);

export const formatFileSize = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** File chooser that only records name/size (the ERP keeps document metadata in the Document Repository). */
export const FilePicker: React.FC<{
  value?: { name: string; size: string } | null;
  onChange: (file: { name: string; size: string } | null) => void;
  accept?: string;
}> = ({ value, onChange, accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx' }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center space-x-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          onChange(f ? { name: f.name, size: formatFileSize(f.size) } : null);
        }}
      />
      <button type="button" onClick={() => ref.current?.click()} className={secondaryBtn}>
        <Paperclip className="w-3.5 h-3.5" />
        <span>{value ? 'Replace file' : 'Choose file'}</span>
      </button>
      {value ? (
        <span className="text-xs text-slate-600 truncate">
          {value.name} <span className="text-slate-400">({value.size})</span>
          <button
            type="button"
            className="ml-2 text-rose-600 hover:underline"
            onClick={() => {
              if (ref.current) ref.current.value = '';
              onChange(null);
            }}
          >
            remove
          </button>
        </span>
      ) : (
        <span className="text-xs text-slate-400">No file selected</span>
      )}
    </div>
  );
};

const BADGE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const Pill: React.FC<{ tone: keyof typeof BADGE; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${BADGE[tone]}`}>
    {children}
  </span>
);

export const DocStatusPill: React.FC<{ agreement?: RentalAgreement }> = ({ agreement }) => {
  if (!agreement) return <span className="text-slate-400">—</span>;
  return documentStatusOf(agreement) === 'uploaded' ? <Pill tone="green">Uploaded</Pill> : <Pill tone="amber">Pending Upload</Pill>;
};

export const ExpiryPill: React.FC<{ state: AgreementExpiryState }> = ({ state }) => {
  if (state === 'expired') return <Pill tone="rose">Expired</Pill>;
  if (state === 'expiring_soon') return <Pill tone="amber">Expiring Soon</Pill>;
  if (state === 'valid') return <Pill tone="green">Valid</Pill>;
  return <span className="text-slate-400">—</span>;
};

export const OccupancyPill: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'occupied') return <Pill tone="green">Occupied</Pill>;
  if (status === 'maintenance') return <Pill tone="amber">Under Maintenance</Pill>;
  return <Pill tone="slate">Vacant</Pill>;
};

export const CollectionStatusPill: React.FC<{ status: 'fully_paid' | 'partially_paid' | 'unpaid' | 'none' }> = ({ status }) => {
  if (status === 'fully_paid') return <Pill tone="green">Fully Paid</Pill>;
  if (status === 'partially_paid') return <Pill tone="amber">Partially Paid</Pill>;
  if (status === 'unpaid') return <Pill tone="rose">Unpaid</Pill>;
  return <span className="text-slate-400">—</span>;
};

export const TypePill: React.FC<{ type?: 'rental' | 'lease' }> = ({ type }) =>
  !type ? <span className="text-slate-400">—</span> : type === 'lease' ? <Pill tone="purple">Lease</Pill> : <Pill tone="blue">Rental</Pill>;

export const typeLabel = (t?: 'rental' | 'lease') => (!t ? '—' : t === 'lease' ? 'Lease' : 'Rental');

/** Hand-off for "Allocate" buttons on the Property screen to the Tenant & Agreement screen. */
const ALLOCATE_KEY = 'pbms_rental_pending_allocation';
export const setPendingAllocation = (childId: string) => {
  try { sessionStorage.setItem(ALLOCATE_KEY, childId); } catch { /* storage unavailable */ }
};
export const takePendingAllocation = (): string | null => {
  try {
    const v = sessionStorage.getItem(ALLOCATE_KEY);
    if (v) sessionStorage.removeItem(ALLOCATE_KEY);
    return v;
  } catch {
    return null;
  }
};

/** Shared derived data so every submodule reads occupancy/collection facts the same way. */
export const useRentalData = () => {
  const erp = useERP();
  const { parentProperties, childProperties, rentalAgreements, rentalDues, rentCollections, profiles } = erp;

  return useMemo(() => {
    const parentById = new Map<string, ParentProperty>(parentProperties.map(p => [p.id, p]));
    const childById = new Map<string, ChildProperty>(childProperties.map(c => [c.id, c]));
    const profileById = new Map<string, Profile>(profiles.map(p => [p.id, p]));
    const agreementById = new Map<string, RentalAgreement>(rentalAgreements.map(a => [a.id, a]));
    const activeByChild = new Map<string, RentalAgreement>();
    rentalAgreements.forEach(a => {
      if (a.status === 'active') activeByChild.set(a.childPropertyId, a);
    });

    const duesByOccupancy = new Map<string, RentalDue[]>();
    rentalDues.forEach(d => {
      const list = duesByOccupancy.get(d.occupancyId) || [];
      list.push(d);
      duesByOccupancy.set(d.occupancyId, list);
    });
    duesByOccupancy.forEach(list => list.sort((a, b) => a.month.localeCompare(b.month)));

    const paymentsByOccupancy = new Map<string, RentCollection[]>();
    rentCollections.forEach(c => {
      const occ = c.occupancyId || agreementById.get(c.agreementId)?.occupancyId || c.agreementId;
      const list = paymentsByOccupancy.get(occ) || [];
      list.push(c);
      paymentsByOccupancy.set(occ, list);
    });

    const parentOf = (childId: string) => {
      const child = childById.get(childId);
      return child?.parentPropertyId ? parentById.get(child.parentPropertyId) : undefined;
    };

    const occupancyOutstanding = (occ: string) =>
      (duesByOccupancy.get(occ) || []).reduce((s, d) => s + dueOutstanding(d), 0);

    const lastPaymentDate = (occ: string) =>
      (paymentsByOccupancy.get(occ) || []).reduce<string>((latest, c) => (c.date > latest ? c.date : latest), '');

    /** Earliest unpaid due date; otherwise the next month's schedule date. */
    const nextDueDate = (agreement?: RentalAgreement) => {
      if (!agreement || agreement.status !== 'active') return '';
      const occ = occupancyKey(agreement);
      const open = (duesByOccupancy.get(occ) || []).find(d => dueOutstanding(d) > 0);
      if (open) return open.dueDate;
      const [y, m] = monthOf(todayStr()).split('-').map(Number);
      const next = new Date(y, m, 1);
      return dueDateFor(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`, agreement.dueDayOfMonth);
    };

    return {
      parentById,
      childById,
      profileById,
      agreementById,
      activeByChild,
      duesByOccupancy,
      paymentsByOccupancy,
      parentOf,
      occupancyOutstanding,
      lastPaymentDate,
      nextDueDate,
      expiryStateOf,
      typeOf,
    };
  }, [parentProperties, childProperties, rentalAgreements, rentalDues, rentCollections, profiles]);
};

export const receiptDataFor = (
  c: RentCollection,
  tenantName: string,
  profileId: string | undefined,
  unitLabel: string,
  bankName?: string
): ReceiptData => ({
  receiptNumber: c.receiptNumber,
  date: c.date,
  customerName: tenantName,
  profileId,
  moduleName: `Rental Collection — ${unitLabel}`,
  sourceRecordId: c.agreementId,
  totalAmount: c.totalAmount,
  paymentMode: c.paymentMode,
  bankName,
  collectedBy: c.collectedBy,
  allocations: [
    ...(c.allocations && c.allocations.length > 0
      ? c.allocations.flatMap(a => [
          ...(a.rent > 0 ? [{ label: `Rent — ${a.month}`, amount: a.rent }] : []),
          ...(a.maintenance > 0 ? [{ label: `Maintenance — ${a.month}`, amount: a.maintenance }] : []),
        ])
      : [
          ...(c.rentAmount > 0 ? [{ label: 'Rent', amount: c.rentAmount }] : []),
          ...(c.maintenanceAmount > 0 ? [{ label: 'Maintenance', amount: c.maintenanceAmount }] : []),
        ]),
  ],
  remarks: [c.transactionRef && `Ref: ${c.transactionRef}`, c.narration].filter(Boolean).join(' • ') || undefined,
});

export interface MenuAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

/** Edit-icon button that opens a small dropdown of row actions (positioned fixed so table overflow never clips it). */
export const ActionMenu: React.FC<{ actions: MenuAction[]; label?: string }> = ({ actions, label = 'Actions' }) => {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  if (actions.length === 0) return <span className="text-slate-300">—</span>;

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        onClick={e => {
          e.stopPropagation();
          if (pos) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 160) });
        }}
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {pos && (
        <div
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 160 }}
          className="z-[60] rounded-xl border border-slate-200 bg-white shadow-lg py-1"
          onClick={e => e.stopPropagation()}
        >
          {actions.map(a => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setPos(null);
                a.onClick();
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-left hover:bg-slate-50 ${a.tone === 'danger' ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {a.icon && <a.icon className="w-3.5 h-3.5" />}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const AVATAR_TONES = ['bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];

export const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const tone = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${tone}`}>{initials}</span>;
};
