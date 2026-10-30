import React, { useState } from 'react';
import { Building2, Home, KeyRound, Plus, Pencil, Trash2, History, ChevronDown, ChevronRight, UserCheck, Wrench } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ParentProperty, ChildProperty } from '../../types';
import {
  Field,
  inputCls,
  primaryBtn,
  secondaryBtn,
  useRentalData,
  OccupancyPill,
  TypePill,
  Pill,
  setPendingAllocation,
} from './rentalUi';

interface Props {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const PropertyManagement: React.FC<Props> = ({ onNavigate }) => {
  const {
    parentProperties,
    childProperties,
    rentalAgreements,
    rentalSettlements,
    createParentProperty,
    updateParentProperty,
    deleteParentProperty,
    createProperty,
    updateChildProperty,
    deleteChildProperty,
  } = useERP();
  const data = useRentalData();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [parentModal, setParentModal] = useState<{ mode: 'add' | 'edit'; parent?: ParentProperty } | null>(null);
  const [childModal, setChildModal] = useState<{ mode: 'add' | 'edit'; child?: ChildProperty; parentId?: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<ChildProperty | null>(null);

  // Parent form
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<ParentProperty['propertyType']>('commercial');
  const [pAddress, setPAddress] = useState('');
  const [pOwnership, setPOwnership] = useState('');
  const [pDescription, setPDescription] = useState('');

  // Child form
  const [cParent, setCParent] = useState('');
  const [cUnit, setCUnit] = useState('');
  const [cFloor, setCFloor] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cMaintenance, setCMaintenance] = useState(0);
  const [cStatus, setCStatus] = useState<'vacant' | 'maintenance'>('vacant');

  const occupied = childProperties.filter(c => c.status === 'occupied').length;
  const vacant = childProperties.filter(c => c.status === 'vacant').length;
  const maintenance = childProperties.filter(c => c.status === 'maintenance').length;

  const openParent = (mode: 'add' | 'edit', parent?: ParentProperty) => {
    setPName(parent?.name || '');
    setPType(parent?.propertyType || 'commercial');
    setPAddress(parent?.address || '');
    setPOwnership(parent?.ownership || '');
    setPDescription(parent?.description || '');
    setParentModal({ mode, parent });
  };

  const submitParent = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: pName.trim(), propertyType: pType, address: pAddress.trim(), ownership: pOwnership.trim(), description: pDescription.trim() };
    if (parentModal?.mode === 'edit' && parentModal.parent) updateParentProperty(parentModal.parent.id, payload);
    else createParentProperty(payload);
    setParentModal(null);
  };

  const openChild = (mode: 'add' | 'edit', child?: ChildProperty, parentId?: string) => {
    setCParent(child?.parentPropertyId || parentId || parentProperties[0]?.id || '');
    setCUnit(child?.unitNumber || '');
    setCFloor(child?.floor || '');
    setCDescription(child?.description || '');
    setCMaintenance(child?.maintenanceAmount ?? 0);
    setCStatus(child?.status === 'maintenance' ? 'maintenance' : 'vacant');
    setChildModal({ mode, child, parentId });
  };

  const submitChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (childModal?.mode === 'edit' && childModal.child) {
      const c = childModal.child;
      updateChildProperty(c.id, {
        unitNumber: cUnit.trim(),
        floor: cFloor.trim(),
        description: cDescription.trim(),
        maintenanceAmount: Number(cMaintenance),
        // An occupied unit's status is driven by its allocation, never edited by hand.
        ...(c.status === 'occupied' ? {} : { status: cStatus }),
      });
    } else {
      createProperty({
        parentPropertyId: cParent,
        unitNumber: cUnit.trim(),
        floor: cFloor.trim(),
        description: cDescription.trim(),
        maintenanceAmount: Number(cMaintenance),
        status: cStatus,
      });
    }
    setChildModal(null);
  };

  const deleteChild = (c: ChildProperty) => {
    if (window.confirm(`Delete unit ${c.unitNumber}? Occupancy history for this unit is kept in the agreements register.`)) {
      deleteChildProperty(c.id);
    }
  };

  const historyRows = historyFor
    ? rentalAgreements.filter(a => a.childPropertyId === historyFor.id).sort((a, b) => b.startDate.localeCompare(a.startDate))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Management"
        subtitle="Create parent properties and their child units in one place, track occupancy and allocate eligible vacant units."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental Management' }, { label: 'Property Management' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button type="button" onClick={() => openParent('add')} className={primaryBtn.replace('bg-emerald-600 hover:bg-emerald-700', 'bg-purple-600 hover:bg-purple-700')}>
              <Plus className="w-4 h-4" />
              <span>Add Parent Property</span>
            </button>
            <button type="button" onClick={() => openChild('add')} disabled={parentProperties.length === 0} className={primaryBtn}>
              <Plus className="w-4 h-4" />
              <span>Add Child Property</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Parent Properties" value={parentProperties.length} icon={Building2} variant="purple" />
        <StatCard title="Child Properties" value={childProperties.length} icon={Home} variant="emerald" />
        <StatCard title="Occupied" value={occupied} icon={UserCheck} variant="blue" />
        <StatCard title="Vacant" value={vacant} icon={KeyRound} variant="amber" />
        <StatCard title="Under Maintenance" value={maintenance} icon={Wrench} variant="rose" />
      </div>

      {parentProperties.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No parent properties yet. Add a parent property, then create its child units.
        </div>
      )}

      {parentProperties.map(parent => {
        const units = childProperties.filter(c => c.parentPropertyId === parent.id);
        const occ = units.filter(u => u.status === 'occupied').length;
        const isCollapsed = collapsed[parent.id];
        return (
          <section key={parent.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50/70 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setCollapsed(prev => ({ ...prev, [parent.id]: !prev[parent.id] }))}
                className="flex items-start space-x-2 text-left"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4 mt-1 text-slate-400" /> : <ChevronDown className="w-4 h-4 mt-1 text-slate-400" />}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{parent.name}</h3>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">{parent.id}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{parent.propertyType}</span>
                  </div>
                  <p className="text-xs text-slate-500">{parent.address}</p>
                  <p className="text-[11px] text-slate-400">Ownership: {parent.ownership || '—'}{parent.description ? ` • ${parent.description}` : ''}</p>
                </div>
              </button>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-mono font-bold text-emerald-700">{occ} / {units.length} occupied</span>
                <button type="button" onClick={() => openChild('add', undefined, parent.id)} className={secondaryBtn}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Unit</span>
                </button>
                <button type="button" title="Edit parent property" onClick={() => openParent('edit', parent)} className="p-2 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-slate-100">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Delete parent property"
                  onClick={() => {
                    if (window.confirm(`Delete parent property ${parent.name}?`)) deleteParentProperty(parent.id);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/40">
                      <th className="p-3">Child ID</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Floor</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Maintenance / mo</th>
                      <th className="p-3">Occupancy</th>
                      <th className="p-3">Current Tenant</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {units.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">No child properties under this parent yet.</td>
                      </tr>
                    )}
                    {units.map(unit => {
                      const agr = data.activeByChild.get(unit.id);
                      const tenant = agr ? data.profileById.get(agr.tenantProfileId) : undefined;
                      return (
                        <tr key={unit.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono text-[11px] text-slate-500">{unit.id}</td>
                          <td className="p-3 font-semibold text-slate-900">{unit.unitNumber}</td>
                          <td className="p-3">{unit.floor || '—'}</td>
                          <td className="p-3 max-w-[16rem] truncate" title={unit.description}>{unit.description || '—'}</td>
                          <td className="p-3 font-mono">{formatCurrency(unit.maintenanceAmount)}</td>
                          <td className="p-3"><OccupancyPill status={unit.status} /></td>
                          <td className="p-3">
                            {agr ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800 block">{tenant?.name || agr.tenantProfileId}</span>
                                <span className="text-[10px] text-slate-500 block">{tenant?.mobile}</span>
                                <TypePill type={data.typeOf(agr)} />
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-1">
                            {unit.status === 'vacant' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingAllocation(unit.id);
                                  onNavigate?.('rental', 'rental_tenants');
                                }}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold"
                              >
                                Allocate
                              </button>
                            )}
                            <button type="button" title="Occupancy history" onClick={() => setHistoryFor(unit)} className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-slate-100">
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" title="Edit unit" onClick={() => openChild('edit', unit)} className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" title="Delete unit" onClick={() => deleteChild(unit)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {/* Parent property modal */}
      <Modal
        isOpen={Boolean(parentModal)}
        onClose={() => setParentModal(null)}
        title={parentModal?.mode === 'edit' ? `Edit Parent Property — ${parentModal.parent?.id}` : 'Add Parent Property'}
        subtitle={parentModal?.mode === 'add' ? 'The Parent Property ID is generated automatically.' : undefined}
      >
        <form onSubmit={submitParent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Property Name" required>
              <input required value={pName} onChange={e => setPName(e.target.value)} className={inputCls} placeholder="e.g. Dhavanam Trade Tower" />
            </Field>
            <Field label="Property Type" required>
              <select value={pType} onChange={e => setPType(e.target.value as ParentProperty['propertyType'])} className={inputCls}>
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="mixed">Mixed Commercial / Residential</option>
              </select>
            </Field>
          </div>
          <Field label="Property Address" required>
            <input required value={pAddress} onChange={e => setPAddress(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fixed Ownership Details" required>
            <input required value={pOwnership} onChange={e => setPOwnership(e.target.value)} className={inputCls} placeholder="Owner / entity and share" />
          </Field>
          <Field label="Property Description">
            <textarea rows={2} value={pDescription} onChange={e => setPDescription(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setParentModal(null)} className={secondaryBtn}>Cancel</button>
            <button type="submit" className={primaryBtn}>{parentModal?.mode === 'edit' ? 'Update Property' : 'Save Property'}</button>
          </div>
        </form>
      </Modal>

      {/* Child property modal */}
      <Modal
        isOpen={Boolean(childModal)}
        onClose={() => setChildModal(null)}
        title={childModal?.mode === 'edit' ? `Edit Child Property — ${childModal.child?.id}` : 'Add Child Property'}
        subtitle={childModal?.mode === 'add' ? 'The Child Property ID is generated automatically. Add as many units as the parent needs.' : undefined}
      >
        <form onSubmit={submitChild} className="space-y-4">
          <Field label="Parent Property" required>
            <select
              required
              value={cParent}
              onChange={e => setCParent(e.target.value)}
              disabled={childModal?.mode === 'edit'}
              className={`${inputCls} disabled:bg-slate-50`}
            >
              {parentProperties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Name / Number" required>
              <input required value={cUnit} onChange={e => setCUnit(e.target.value)} className={inputCls} placeholder="e.g. Shop G-3" />
            </Field>
            <Field label="Floor">
              <input value={cFloor} onChange={e => setCFloor(e.target.value)} className={inputCls} placeholder="e.g. Ground" />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={2} value={cDescription} onChange={e => setCDescription(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Maintenance Amount (₹)" required>
              <input required type="number" min={0} value={cMaintenance} onChange={e => setCMaintenance(Number(e.target.value))} className={`${inputCls} font-mono`} />
            </Field>
            <Field
              label="Occupancy Status"
              hint={childModal?.child?.status === 'occupied' ? 'Occupied status changes only through tenant allocation / exit.' : 'Occupied is set automatically when a tenant is allocated.'}
            >
              {childModal?.child?.status === 'occupied' ? (
                <div className="pt-1"><OccupancyPill status="occupied" /></div>
              ) : (
                <select value={cStatus} onChange={e => setCStatus(e.target.value as 'vacant' | 'maintenance')} className={inputCls}>
                  <option value="vacant">Vacant</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              )}
            </Field>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setChildModal(null)} className={secondaryBtn}>Cancel</button>
            <button type="submit" className={primaryBtn}>{childModal?.mode === 'edit' ? 'Update Unit' : 'Save Unit'}</button>
          </div>
        </form>
      </Modal>

      {/* Occupancy history modal */}
      <Modal
        isOpen={Boolean(historyFor)}
        onClose={() => setHistoryFor(null)}
        title={`Occupancy History — ${historyFor?.unitNumber || ''}`}
        subtitle="Every allocation, renewal and exit for this unit is preserved."
        maxWidth="3xl"
      >
        {historyRows.length === 0 ? (
          <p className="text-xs text-slate-500">This unit has never been allocated.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Agreement</th>
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Period</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyRows.map(h => {
                const settlement = rentalSettlements.find(s => s.agreementId === h.id);
                return (
                  <tr key={h.id}>
                    <td className="py-2 pr-3 font-mono">
                      {h.id}
                      {h.previousAgreementId && <span className="block text-[10px] text-slate-400">renews {h.previousAgreementId}</span>}
                    </td>
                    <td className="py-2 pr-3 font-semibold">{data.profileById.get(h.tenantProfileId)?.name || h.tenantProfileId}</td>
                    <td className="py-2 pr-3"><TypePill type={data.typeOf(h)} /></td>
                    <td className="py-2 pr-3">{formatDate(h.startDate)} → {formatDate(h.endDate)}</td>
                    <td className="py-2 pr-3"><Pill tone={h.status === 'active' ? 'green' : 'slate'}>{h.status === 'active' ? 'Current' : h.status[0].toUpperCase() + h.status.slice(1)}</Pill></td>
                    <td className="py-2">{settlement ? `${settlement.id} (${settlement.status.replace('_', ' ')})` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
};
