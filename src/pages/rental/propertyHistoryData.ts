/**
 * Mock history for the Property History screen: tenancies that ended before the ERP's current
 * agreements, their historical transactions, and unit maintenance records. It is read-only and
 * is merged with the live ERP agreements, collections, settlements and expenses at display time.
 * Tenants are referenced by Master Profile id only; no personal details are stored here.
 */

export type HistoryTxnType =
  | 'Rent Collection'
  | 'Maintenance Collection'
  | 'Security Deposit'
  | 'Deposit Refund'
  | 'Penalty'
  | 'Repair Expense'
  | 'Adjustment';

export const HISTORY_TXN_TYPES: HistoryTxnType[] = [
  'Rent Collection',
  'Maintenance Collection',
  'Security Deposit',
  'Deposit Refund',
  'Penalty',
  'Repair Expense',
  'Adjustment',
];

export interface PastOccupancy {
  id: string;
  childPropertyId: string;
  tenantProfileId: string;
  moveIn: string;
  moveOut: string;
  rent: number;
  maintenance: number;
  deposit: number;
  /** Amount withheld from the deposit at exit. */
  deduction: number;
  deductionNote?: string;
}

export interface HistoryTxn {
  id: string;
  childPropertyId: string;
  tenantProfileId?: string;
  date: string;
  description: string;
  type: HistoryTxnType;
  amount: number;
  /** Money leaving the business (refunds, repair costs). */
  outflow?: boolean;
  mode: string;
  reference: string;
}

export const PAST_OCCUPANCIES: PastOccupancy[] = [
  { id: 'OCC-H-01', childPropertyId: 'PROP-C-01', tenantProfileId: 'P000104', moveIn: '2022-05-01', moveOut: '2025-03-15', rent: 30000, maintenance: 2500, deposit: 150000, deduction: 8000, deductionNote: 'Shutter repair and repainting' },
  { id: 'OCC-H-02', childPropertyId: 'PROP-C-01', tenantProfileId: 'P000105', moveIn: '2020-02-01', moveOut: '2022-04-10', rent: 24000, maintenance: 2000, deposit: 120000, deduction: 0 },
  { id: 'OCC-H-03', childPropertyId: 'PROP-C-02', tenantProfileId: 'P000106', moveIn: '2023-01-10', moveOut: '2025-05-20', rent: 38000, maintenance: 3500, deposit: 250000, deduction: 12000, deductionNote: 'AC provision damage' },
  { id: 'OCC-H-04', childPropertyId: 'PROP-C-03', tenantProfileId: 'P000105', moveIn: '2024-03-01', moveOut: '2026-09-23', rent: 40000, maintenance: 3500, deposit: 240000, deduction: 5000, deductionNote: 'Cleaning and key replacement' },
  { id: 'OCC-H-05', childPropertyId: 'PROP-C-03', tenantProfileId: 'P000104', moveIn: '2022-06-15', moveOut: '2024-02-15', rent: 34000, maintenance: 3000, deposit: 200000, deduction: 0 },
  { id: 'OCC-H-06', childPropertyId: 'PROP-C-04', tenantProfileId: 'P000106', moveIn: '2023-06-01', moveOut: '2025-07-10', rent: 24000, maintenance: 2200, deposit: 120000, deduction: 3000, deductionNote: 'Kitchen fittings' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m0: number, d: number) => {
  const dt = new Date(y, m0, d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

/** Receipt-style reference that stays the same between renders. */
let seq = 0;
const ref = (prefix: string) => `${prefix}${String(100200 + ++seq * 37).slice(-6)}`;

/** Monthly rent / maintenance receipts, the deposit, a late penalty and the exit settlement for each past tenancy. */
export const buildPastTransactions = (): HistoryTxn[] => {
  seq = 0;
  const out: HistoryTxn[] = [];
  PAST_OCCUPANCIES.forEach(o => {
    const base = { childPropertyId: o.childPropertyId, tenantProfileId: o.tenantProfileId };
    const cashDeposit = o.deposit <= 150000;
    out.push({
      ...base, id: `${o.id}-DEP`, date: o.moveIn, description: 'Refundable security deposit received', type: 'Security Deposit',
      amount: o.deposit, mode: cashDeposit ? 'Cash' : 'Bank', reference: ref('DF-REC-'),
    });

    const [sy, sm] = o.moveIn.split('-').map(Number);
    const [ey, em] = o.moveOut.split('-').map(Number);
    const months = (ey - sy) * 12 + (em - sm) + 1;
    for (let i = 0; i < months; i++) {
      const dt = new Date(sy, sm - 1 + i, 1);
      const y = dt.getFullYear();
      const m0 = dt.getMonth();
      const label = dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const day = i % 9 === 6 ? 14 : 5 + (i % 3); // the odd late payment
      const date = iso(y, m0, day);
      if (date < o.moveIn || date > o.moveOut) continue;
      const mode = i % 4 === 0 ? 'Cash' : 'Bank';
      const receipt = ref('DF-REC-');
      out.push({ ...base, id: `${o.id}-R${i}`, date, description: `Rent for ${label}`, type: 'Rent Collection', amount: o.rent, mode, reference: receipt });
      out.push({ ...base, id: `${o.id}-M${i}`, date, description: `Maintenance for ${label}`, type: 'Maintenance Collection', amount: o.maintenance, mode, reference: receipt });
      if (i % 9 === 6) {
        out.push({ ...base, id: `${o.id}-P${i}`, date, description: `Late payment penalty — ${label}`, type: 'Penalty', amount: 500, mode, reference: receipt });
      }
    }

    const exit = new Date(ey, em - 1, Number(o.moveOut.slice(8)) + 5);
    const exitDate = iso(exit.getFullYear(), exit.getMonth(), exit.getDate());
    if (o.deduction > 0) {
      out.push({
        ...base, id: `${o.id}-ADJ`, date: o.moveOut, description: `Deposit deduction — ${o.deductionNote || 'exit adjustment'}`, type: 'Adjustment',
        amount: o.deduction, mode: 'Adjusted', reference: `SET-H-${o.id.slice(-2)}`,
      });
    }
    out.push({
      ...base, id: `${o.id}-REF`, date: exitDate, description: 'Security deposit refunded on exit', type: 'Deposit Refund',
      amount: o.deposit - o.deduction, outflow: true, mode: 'Bank', reference: ref('DF-PAY-'),
    });
  });
  return out;
};

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */
export type MaintenanceCategory = 'Plumbing' | 'Electrical' | 'Painting' | 'Renovation' | 'Cleaning' | 'General Repairs';
export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = ['Plumbing', 'Electrical', 'Painting', 'Renovation', 'Cleaning', 'General Repairs'];
export type MaintenanceStatus = 'Completed' | 'In Progress' | 'Scheduled';

export interface MaintenanceRecord {
  id: string;
  childPropertyId: string;
  date: string;
  category: MaintenanceCategory;
  description: string;
  vendor: string;
  cost: number;
  status: MaintenanceStatus;
  remarks: string;
  attachments: string[];
}

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'MNT-001', childPropertyId: 'PROP-C-01', date: '2025-03-28', category: 'Painting', description: 'Full repaint of shop interior and shutter', vendor: 'Sri Murugan Painters', cost: 18500, status: 'Completed', remarks: 'Done between tenancies. Two coats, grey shutter.', attachments: ['painting-invoice-0328.pdf', 'after-photos.zip'] },
  { id: 'MNT-002', childPropertyId: 'PROP-C-01', date: '2025-03-20', category: 'General Repairs', description: 'Rolling shutter spring and lock replaced', vendor: 'Balaji Hardware & Fabrication', cost: 8000, status: 'Completed', remarks: 'Cost deducted from the outgoing tenant\'s deposit.', attachments: ['shutter-bill.pdf'] },
  { id: 'MNT-003', childPropertyId: 'PROP-C-01', date: '2026-02-12', category: 'Electrical', description: 'Main distribution board and meter wiring', vendor: 'Ravi Electricals', cost: 6400, status: 'Completed', remarks: 'Replaced worn MCBs. Safety certificate issued.', attachments: ['electrical-certificate.pdf'] },
  { id: 'MNT-004', childPropertyId: 'PROP-C-02', date: '2025-06-02', category: 'General Repairs', description: 'AC provision piping and wall repair', vendor: 'CoolTech Services', cost: 12000, status: 'Completed', remarks: 'Damage recovered from the previous tenant.', attachments: ['ac-repair-estimate.pdf', 'ac-repair-bill.pdf'] },
  { id: 'MNT-005', childPropertyId: 'PROP-C-02', date: '2026-05-18', category: 'Plumbing', description: 'Washroom tap and flush tank replacement', vendor: 'Ganesh Plumbing Works', cost: 3200, status: 'Completed', remarks: 'Raised by the tenant; no leakage since.', attachments: [] },
  { id: 'MNT-006', childPropertyId: 'PROP-C-03', date: '2026-09-28', category: 'Cleaning', description: 'Deep clean after vacating and key replacement', vendor: 'BrightHome Cleaners', cost: 5000, status: 'Completed', remarks: 'Unit ready for re-letting.', attachments: ['cleaning-receipt.jpg'] },
  { id: 'MNT-007', childPropertyId: 'PROP-C-03', date: '2026-10-15', category: 'Painting', description: 'Touch-up painting of partition and ceiling', vendor: 'Sri Murugan Painters', cost: 22000, status: 'In Progress', remarks: 'Second coat pending. Expected completion this week.', attachments: ['painting-quote.pdf'] },
  { id: 'MNT-008', childPropertyId: 'PROP-C-03', date: '2026-11-20', category: 'Electrical', description: 'LED light panel upgrade, 12 fittings', vendor: 'Ravi Electricals', cost: 14400, status: 'Scheduled', remarks: 'Scheduled before the next viewing round.', attachments: [] },
  { id: 'MNT-009', childPropertyId: 'PROP-C-03', date: '2024-02-24', category: 'Renovation', description: 'Partition wall and false ceiling re-work', vendor: 'Karthik Interiors', cost: 96000, status: 'Completed', remarks: 'Major refit before the 2024 tenancy.', attachments: ['renovation-contract.pdf', 'bill-1.pdf', 'bill-2.pdf'] },
  { id: 'MNT-010', childPropertyId: 'PROP-C-04', date: '2025-07-22', category: 'Renovation', description: 'Modular kitchen fittings replaced', vendor: 'Karthik Interiors', cost: 38500, status: 'Completed', remarks: 'Chimney and hob replaced as part of the refit.', attachments: ['kitchen-invoice.pdf'] },
  { id: 'MNT-011', childPropertyId: 'PROP-C-04', date: '2025-07-30', category: 'Cleaning', description: 'Post-renovation cleaning', vendor: 'BrightHome Cleaners', cost: 3500, status: 'Completed', remarks: '', attachments: [] },
  { id: 'MNT-012', childPropertyId: 'PROP-C-04', date: '2026-08-09', category: 'Plumbing', description: 'Balcony drain unblocking and waterproofing', vendor: 'Ganesh Plumbing Works', cost: 4800, status: 'Completed', remarks: 'Seepage into the flat below resolved.', attachments: ['waterproofing-bill.pdf'] },
];
