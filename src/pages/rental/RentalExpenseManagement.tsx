import React, { useMemo, useState } from 'react';
import { Plus, IndianRupee, Building2, Home, Tags } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { PaymentMode, ExpenseRecord } from '../../types';
import { Field, FilePicker, inputCls, filterCls, primaryBtn, secondaryBtn, useRentalData, Pill } from './rentalUi';
import { RENTAL_EXPENSE_CATEGORIES, rentalExpenseCategoryId, todayStr } from '../../utils/rentalUtils';

interface ExpenseRow extends ExpenseRecord {
  parentName: string;
  scope: string;
  category: string;
}

const Breakdown: React.FC<{ title: string; items: { label: string; value: number }[] }> = ({ title, items }) => {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No expenses in this selection.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(i => (
            <li key={i.label} className="text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-slate-700 truncate pr-2">{i.label}</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(i.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const group = (rows: ExpenseRow[], key: (r: ExpenseRow) => string) => {
  const m = new Map<string, number>();
  rows.forEach(r => m.set(key(r), (m.get(key(r)) || 0) + r.amount));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

export const RentalExpenseManagement: React.FC = () => {
  const { expenses, parentProperties, childProperties, recordExpense, uploadDocument } = useERP();
  const data = useRentalData();

  const [fParent, setFParent] = useState('all');
  const [fChild, setFChild] = useState('all');
  const [fCategory, setFCategory] = useState('all');
  const [fMode, setFMode] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [open, setOpen] = useState(false);

  const rows = useMemo<ExpenseRow[]>(
    () =>
      expenses
        .filter(e => e.parentPropertyId)
        .map(e => ({
          ...e,
          parentName: data.parentById.get(e.parentPropertyId!)?.name || e.parentPropertyId!,
          scope: e.childPropertyId ? data.childById.get(e.childPropertyId)?.unitNumber || e.childPropertyId : 'Common / Building',
          category: e.categoryName || '—',
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, data]
  );

  const filtered = rows.filter(r => {
    if (fParent !== 'all' && r.parentPropertyId !== fParent) return false;
    if (fChild !== 'all' && r.childPropertyId !== fChild) return false;
    if (fCategory !== 'all' && r.categoryId !== fCategory) return false;
    if (fMode !== 'all' && r.paymentMode !== fMode) return false;
    if (fFrom && r.date < fFrom) return false;
    if (fTo && r.date > fTo) return false;
    return true;
  });

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const commonTotal = filtered.filter(r => !r.childPropertyId).reduce((s, r) => s + r.amount, 0);
  const unitTotal = total - commonTotal;
  const unitOptions = childProperties.filter(c => fParent === 'all' || c.parentPropertyId === fParent);

  const columns: Column<ExpenseRow>[] = [
    { header: 'Expense ID', accessor: 'id', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-slate-900">{r.id}</span> },
    { header: 'Date', accessor: 'date', sortable: true, render: (_v, r) => formatDate(r.date) },
    { header: 'Parent Property', accessor: 'parentName', sortable: true },
    {
      header: 'Child / Scope',
      accessor: 'scope',
      render: (_v, r) => (r.childPropertyId ? <span className="font-semibold">{r.scope}</span> : <Pill tone="slate">Common / Building</Pill>),
    },
    { header: 'Category', accessor: 'category', sortable: true },
    {
      header: 'Purpose',
      accessor: 'description',
      render: (_v, r) => <span className="text-[11px] block max-w-[14rem] truncate" title={r.description}>{r.description || r.remarks || '—'}</span>,
    },
    { header: 'Paid To', accessor: 'paidTo', render: (_v, r) => r.paidTo || '—' },
    {
      header: 'Mode / Book',
      accessor: 'paymentMode',
      render: (_v, r) => <span className="uppercase text-[11px]">{r.paymentMode === 'cash' ? 'Cash Book' : `Bank Book${r.bankAccountId ? ` (${r.bankAccountId})` : ''}`}</span>,
    },
    { header: 'Reference', accessor: 'transactionRef', render: (_v, r) => r.transactionRef || '—' },
    { header: 'Document', accessor: 'supportingDocName', render: (_v, r) => (r.supportingDocName ? <Pill tone="green">{r.supportingDocName.length > 16 ? `${r.supportingDocName.slice(0, 14)}…` : r.supportingDocName}</Pill> : <span className="text-slate-400">—</span>) },
    { header: 'Amount', accessor: 'amount', sortable: true, render: (_v, r) => <span className="font-mono font-bold text-rose-600">{formatCurrency(r.amount)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        subtitle="Record and review parent-property and child-unit expenses, posted to the Cash Book or Bank Book."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Expense Management' }]}
        actions={
          <button type="button" onClick={() => setOpen(true)} disabled={parentProperties.length === 0} className={primaryBtn}>
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Expenses" value={formatCurrency(total)} subtitle={`${filtered.length} entries`} icon={IndianRupee} variant="rose" />
        <StatCard title="Parent / Common Area" value={formatCurrency(commonTotal)} icon={Building2} variant="purple" />
        <StatCard title="Child Unit Expenses" value={formatCurrency(unitTotal)} icon={Home} variant="blue" />
        <StatCard title="Categories Used" value={new Set(filtered.map(r => r.categoryId)).size} icon={Tags} variant="amber" />
      </div>

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
          <select value={fCategory} onChange={e => setFCategory(e.target.value)} className={filterCls} aria-label="Category">
            <option value="all">All categories</option>
            {RENTAL_EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={fMode} onChange={e => setFMode(e.target.value)} className={filterCls} aria-label="Payment mode">
            <option value="all">Cash &amp; Bank</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
            <span className="shrink-0">From</span>
            <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} className={`${filterCls} w-full`} />
          </label>
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-500">
            <span className="shrink-0">To</span>
            <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} className={`${filterCls} w-full`} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Breakdown title="By Parent Property" items={group(filtered, r => r.parentName)} />
        <Breakdown title="By Child Property" items={group(filtered.filter(r => r.childPropertyId), r => `${r.scope} (${r.parentName})`)} />
        <Breakdown title="By Category" items={group(filtered, r => r.category)} />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={r => r.id}
        searchPlaceholder="Search expense, payee, purpose..."
        exportFileName="rental_property_expenses"
        printable
        compact
        printTitle="Rental Property Expenses"
        emptyTitle="No property expenses recorded"
        emptySubtitle="Use Add Expense to record a parent or child property expense."
      />

      {open && (
        <ExpenseModal
          onClose={() => setOpen(false)}
          onSave={input => {
            const id = recordExpense(input.record);
            if (input.doc) {
              uploadDocument({
                entityType: 'expense',
                entityId: id,
                docType: 'Property Expense Document',
                title: `Expense ${id}`,
                fileName: input.doc.name,
                fileSize: input.doc.size,
                module: 'Rental',
              });
            }
            setOpen(false);
          }}
        />
      )}
    </div>
  );
};

const ExpenseModal: React.FC<{
  onClose: () => void;
  onSave: (input: { record: Omit<ExpenseRecord, 'id' | 'postedAt' | 'enteredBy'>; doc: { name: string; size: string } | null }) => void;
}> = ({ onClose, onSave }) => {
  const { parentProperties, childProperties } = useERP();

  const [date, setDate] = useState(todayStr());
  const [parentId, setParentId] = useState(parentProperties[0]?.id || '');
  const [childId, setChildId] = useState('');
  const [category, setCategory] = useState<string>(RENTAL_EXPENSE_CATEGORIES[0].name);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [bankId, setBankId] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [reference, setReference] = useState('');
  const [doc, setDoc] = useState<{ name: string; size: string } | null>(null);
  const [error, setError] = useState('');

  const units = childProperties.filter(c => c.parentPropertyId === parentId);
  const isOther = category === 'Other';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(amount > 0)) return setError('Enter the amount paid.');
    if (!description.trim()) return setError(isOther ? 'A description is required when the category is Other.' : 'Enter the purpose / description.');
    if (mode === 'bank' && !bankId) return setError('Select the bank account used for payment.');
    onSave({
      record: {
        categoryId: rentalExpenseCategoryId(category),
        categoryName: category,
        amount,
        date,
        paymentMode: mode,
        bankAccountId: mode === 'bank' ? bankId : undefined,
        description: description.trim(),
        remarks: description.trim(),
        payeeName: paidTo.trim() || undefined,
        paidTo: paidTo.trim() || undefined,
        transactionRef: reference.trim() || undefined,
        supportingDocName: doc?.name,
        parentPropertyId: parentId,
        childPropertyId: childId || undefined,
        isRecurring: false,
        classification: 'accounted',
      },
      doc,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add Property Expense"
      subtitle="The Expense ID is generated automatically. Leave the child property empty for common building expenses."
      maxWidth="3xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Expense Date" required><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Parent Property" required>
            <select required value={parentId} onChange={e => { setParentId(e.target.value); setChildId(''); }} className={inputCls}>
              {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Child Property" hint="Unit-specific expenses only; empty = common / building.">
            <select value={childId} onChange={e => setChildId(e.target.value)} className={inputCls}>
              <option value="">Common / whole building</option>
              {units.map(c => <option key={c.id} value={c.id}>{c.unitNumber}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Expense Category" required>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {RENTAL_EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Amount Paid (₹)" required><input required type="number" min={1} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className={`${inputCls} font-mono`} /></Field>
          <Field label="Paid To"><input value={paidTo} onChange={e => setPaidTo(e.target.value)} className={inputCls} placeholder="Vendor / authority" /></Field>
        </div>

        <Field label={isOther ? 'Description / Purpose (required for Other)' : 'Description / Purpose'} required>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
        </Field>

        <CashBankSelector mode={mode} onModeChange={setMode} bankAccountId={bankId} onBankAccountChange={setBankId} label="Payment Mode & Cash / Bank Book" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Transaction Reference"><input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} /></Field>
          <Field label="Supporting Document"><FilePicker value={doc} onChange={setDoc} /></Field>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" className={primaryBtn}>Save Expense</button>
        </div>
      </form>
    </Modal>
  );
};
