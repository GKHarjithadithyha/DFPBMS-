import {
  RentalAgreement,
  RentalDue,
  OccupancyType,
  AgreementDocumentStatus,
  ExpenseCategory,
} from '../types';

/** Agreements expiring within this many days are flagged as "Expiring Soon". */
export const EXPIRY_WARNING_DAYS = 60;

export const RENTAL_EXPENSE_CATEGORY_NAMES = [
  'Electricity',
  'Repairs',
  'Water Bill',
  'Plumbing',
  'Painting',
  'Cleaning',
  'Common-Area Maintenance',
  'Property Tax',
  'Other',
] as const;

export const rentalExpenseCategoryId = (name: string) =>
  `EXP-CAT-RNT-${name.toUpperCase().replace(/[^A-Z]+/g, '-')}`;

export const RENTAL_EXPENSE_CATEGORIES: ExpenseCategory[] = RENTAL_EXPENSE_CATEGORY_NAMES.map(name => ({
  id: rentalExpenseCategoryId(name),
  name,
  isSystemDefault: true,
  createdAt: '2026-01-01',
}));

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthOf = (date: string) => date.slice(0, 7);

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const dueDateFor = (month: string, dueDay = 5) => {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(Math.max(dueDay, 1), lastDay)).padStart(2, '0')}`;
};

export const occupancyKey = (a: Pick<RentalAgreement, 'id' | 'occupancyId'>) => a.occupancyId || a.id;
export const typeOf = (a: Pick<RentalAgreement, 'occupancyType'>): OccupancyType => a.occupancyType || 'rental';

export const documentStatusOf = (a: RentalAgreement): AgreementDocumentStatus =>
  a.documentStatus || (a.agreementDocumentName || a.agreementDocumentUrl ? 'uploaded' : 'pending_upload');

export const daysUntil = (date: string) => {
  const target = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(`${todayStr()}T00:00:00`).getTime();
  return Math.round((target - today) / 86400000);
};

export type AgreementExpiryState = 'valid' | 'expiring_soon' | 'expired' | 'n/a';

/** Expiry state is derived from the end date; the stored status only records lifecycle (active/renewed/closed). */
export const expiryStateOf = (a?: RentalAgreement): AgreementExpiryState => {
  if (!a || a.status !== 'active') return 'n/a';
  const d = daysUntil(a.endDate);
  if (d < 0) return 'expired';
  if (d <= EXPIRY_WARNING_DAYS) return 'expiring_soon';
  return 'valid';
};

export const dueTotal = (d: RentalDue) => d.rentDue + d.maintenanceDue;
export const dueCollected = (d: RentalDue) => d.rentPaid + d.maintenancePaid;
/** Amount still owed on a due; dues carried into a settlement no longer count as collectible. */
export const dueOutstanding = (d: RentalDue) => (d.closedInSettlement ? 0 : Math.max(0, dueTotal(d) - dueCollected(d)));

export type CollectionStatus = 'fully_paid' | 'partially_paid' | 'unpaid';
export const dueStatusOf = (d: RentalDue): CollectionStatus => {
  if (dueOutstanding(d) === 0) return 'fully_paid';
  return dueCollected(d) > 0 ? 'partially_paid' : 'unpaid';
};

export const dueId = (occupancy: string, month: string) => `DUE-${occupancy}-${month}`;

/**
 * Idempotent due generation: one due per (occupancy, month) from the billing start month up to
 * the current month. Existing dues are never touched, so renewals and reloads cannot duplicate them.
 * Rental -> rent + maintenance. Lease -> maintenance only (no monthly rent is ever generated).
 */
export const buildMissingDues = (agreements: RentalAgreement[], dues: RentalDue[]): RentalDue[] => {
  const existing = new Set(dues.map(d => d.id));
  const currentMonth = monthOf(todayStr());
  const created: RentalDue[] = [];

  agreements
    .filter(a => a.status === 'active')
    .forEach(a => {
      const occ = occupancyKey(a);
      const type = typeOf(a);
      let month = a.billingStartMonth || currentMonth;
      let guard = 0;
      while (month <= currentMonth && guard++ < 600) {
        const id = dueId(occ, month);
        if (!existing.has(id)) {
          existing.add(id);
          created.push({
            id,
            occupancyId: occ,
            agreementId: a.id,
            childPropertyId: a.childPropertyId,
            tenantProfileId: a.tenantProfileId,
            occupancyType: type,
            month,
            dueDate: dueDateFor(month, a.dueDayOfMonth),
            rentDue: type === 'rental' && a.collectionType !== 'maintenance_only' ? a.rentAmount : 0,
            maintenanceDue: a.collectionType === 'rent_only' && type === 'rental' ? 0 : a.maintenanceAmount,
            rentPaid: 0,
            maintenancePaid: 0,
          });
        }
        month = addMonths(month, 1);
      }
    });

  return created;
};

/** Allocates a payment oldest-due-first (rent before maintenance within a due). */
export const allocatePayment = (dues: RentalDue[], amount: number) => {
  let remaining = amount;
  const allocations: { dueId: string; month: string; rent: number; maintenance: number }[] = [];
  const next = dues.map(d => ({ ...d }));

  [...next]
    .sort((a, b) => a.month.localeCompare(b.month))
    .forEach(d => {
      if (remaining <= 0 || d.closedInSettlement) return;
      const rent = Math.min(remaining, Math.max(0, d.rentDue - d.rentPaid));
      remaining -= rent;
      const maintenance = Math.min(remaining, Math.max(0, d.maintenanceDue - d.maintenancePaid));
      remaining -= maintenance;
      if (rent + maintenance > 0) {
        d.rentPaid += rent;
        d.maintenancePaid += maintenance;
        allocations.push({ dueId: d.id, month: d.month, rent, maintenance });
      }
    });

  return { next, allocations, unallocated: remaining };
};
