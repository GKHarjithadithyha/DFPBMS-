import React, { useState } from 'react';
import {
  Building2,
  Home,
  FileCheck,
  DollarSign,
  Plus,
  KeyRound,
  ShieldCheck,
  Receipt,
  UserCheck,
  Building,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CashBankSelector } from '../../components/common/CashBankSelector';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { ParentProperty, ChildProperty, RentalAgreement, PaymentMode } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface RentalManagementPageProps {
  initialSubTab?: string;
  onNavigate?: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
}

export const RentalManagementPage: React.FC<RentalManagementPageProps> = ({ initialSubTab }) => {
  const {
    parentProperties,
    childProperties,
    rentalAgreements,
    rentCollections,
    profiles,
    createParentProperty,
    updateParentProperty,
    deleteParentProperty,
    createProperty,
    updateChildProperty,
    deleteChildProperty,
    createRentalAgreement,
    updateRentalAgreement,
    reviseRent,
    renewLease,
    collectRent,
    closeLease,
  } = useERP();

  // Modals
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);
  const [isEditParentModalOpen, setIsEditParentModalOpen] = useState(false);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [isNewAgreementModalOpen, setIsNewAgreementModalOpen] = useState(false);
  const [isEditAgreementModalOpen, setIsEditAgreementModalOpen] = useState(false);
  const [isReviseRentModalOpen, setIsReviseRentModalOpen] = useState(false);
  const [isRenewLeaseModalOpen, setIsRenewLeaseModalOpen] = useState(false);
  const [isCollectRentModalOpen, setIsCollectRentModalOpen] = useState(false);
  const [isCloseLeaseModalOpen, setIsCloseLeaseModalOpen] = useState(false);

  // Selected entities
  const [selectedParent, setSelectedParent] = useState<ParentProperty | null>(parentProperties[0] || null);
  const [selectedChild, setSelectedChild] = useState<ChildProperty | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);

  // Form: Parent Property
  const [parentName, setParentName] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentType, setParentType] = useState<'commercial' | 'residential' | 'mixed'>('commercial');
  const [parentOwnership, setParentOwnership] = useState('Dhavanam Group (100% Direct)');

  // Form: Child Unit
  const [parentPropId, setParentPropId] = useState(parentProperties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('Ground Floor');
  const [squareFeet, setSquareFeet] = useState(850);
  const [standardRent, setStandardRent] = useState(25000);
  const [standardMaintenance, setStandardMaintenance] = useState(3000);
  const [unitType, setUnitType] = useState<'commercial' | 'residential'>('commercial');

  // Form: Agreement
  const [agreeChildPropertyId, setAgreeChildPropertyId] = useState('');
  const [agreeTenantProfileId, setAgreeTenantProfileId] = useState('');
  const [agreeMonthlyRent, setAgreeMonthlyRent] = useState(25000);
  const [agreeMonthlyMaintenance, setAgreeMonthlyMaintenance] = useState(3000);
  const [agreeSecurityDeposit, setAgreeSecurityDeposit] = useState(150000);
  const [agreeCollectionType, setAgreeCollectionType] = useState<'rent_only' | 'maintenance_only' | 'combined'>('combined');
  const [agreeEscalationPercentage, setAgreeEscalationPercentage] = useState(5);
  const [agreeDueDayOfMonth, setAgreeDueDayOfMonth] = useState(5);
  const [agreeStartDate, setAgreeStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [agreeEndDate, setAgreeEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Form: Revise Rent
  const [newRentAmount, setNewRentAmount] = useState(28000);
  const [newMaintAmount, setNewMaintAmount] = useState(3500);

  // Form: Renew Lease
  const [newEndDate, setNewEndDate] = useState(
    new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [renewRentAmount, setRenewRentAmount] = useState(28000);

  // Form: Collect Rent
  const [collectAgreementId, setCollectAgreementId] = useState('');
  const [rentAmount, setRentAmount] = useState(25000);
  const [maintAmount, setMaintAmount] = useState(3000);
  const [rentPaymentMode, setRentPaymentMode] = useState<PaymentMode>('bank');
  const [rentBankAccountId, setRentBankAccountId] = useState('BA-01');

  // Receipt Modal
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  // Stats
  const totalUnits = childProperties.length;
  const occupiedUnits = childProperties.filter(u => u.status === 'occupied').length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = rentalAgreements
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + (a.rentAmount || a.monthlyRent || 0) + (a.maintenanceAmount || a.monthlyMaintenance || 0), 0);

  // Handlers: Parent Property
  const handleAddParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createParentProperty({
      name: parentName,
      address: parentAddress,
      propertyType: parentType,
      ownership: parentOwnership,
    });
    setIsAddParentModalOpen(false);
    setParentName('');
    setParentAddress('');
    setSelectedParent(created);
  };

  const handleEditParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;
    updateParentProperty(selectedParent.id, {
      name: parentName,
      address: parentAddress,
      propertyType: parentType,
      ownership: parentOwnership,
    });
    setIsEditParentModalOpen(false);
  };

  const handleDeleteParent = (parent: ParentProperty) => {
    deleteParentProperty(parent.id);
  };

  // Handlers: Unit
  const handleCreateUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProperty({
      parentPropertyId: parentPropId,
      unitNumber,
      floor,
      squareFeet: Number(squareFeet),
      standardRent: Number(standardRent),
      standardMaintenance: Number(standardMaintenance),
      propertyType: unitType,
      status: 'vacant',
    });
    setIsNewUnitModalOpen(false);
    setUnitNumber('');
  };

  const handleEditUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    updateChildProperty(selectedChild.id, {
      unitNumber,
      floor,
      squareFeet: Number(squareFeet),
      standardRent: Number(standardRent),
      rentAmount: Number(standardRent),
      standardMaintenance: Number(standardMaintenance),
      maintenanceAmount: Number(standardMaintenance),
      propertyType: unitType,
    });
    setIsEditUnitModalOpen(false);
  };

  const handleDeleteUnit = (unit: ChildProperty) => {
    deleteChildProperty(unit.id);
  };

  // Dynamic selection for New Agreement
  const handleUnitSelectForAgreement = (unitId: string) => {
    setAgreeChildPropertyId(unitId);
    const unit = childProperties.find(u => u.id === unitId);
    if (unit) {
      setAgreeMonthlyRent(unit.rentAmount || unit.standardRent || 25000);
      setAgreeMonthlyMaintenance(unit.maintenanceAmount || unit.standardMaintenance || 3000);
      setAgreeSecurityDeposit((unit.rentAmount || unit.standardRent || 25000) * 6);
    }
  };

  const handleCreateAgreementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeChildPropertyId || !agreeTenantProfileId) return;
    createRentalAgreement({
      childPropertyId: agreeChildPropertyId,
      tenantProfileId: agreeTenantProfileId,
      rentAmount: Number(agreeMonthlyRent),
      maintenanceAmount: Number(agreeMonthlyMaintenance),
      securityDeposit: Number(agreeSecurityDeposit),
      collectionType: agreeCollectionType,
      escalationPercentage: Number(agreeEscalationPercentage),
      dueDayOfMonth: Number(agreeDueDayOfMonth),
      startDate: agreeStartDate,
      endDate: agreeEndDate,
    });
    setIsNewAgreementModalOpen(false);
  };

  const handleEditAgreementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    updateRentalAgreement(selectedAgreement.id, {
      rentAmount: Number(agreeMonthlyRent),
      maintenanceAmount: Number(agreeMonthlyMaintenance),
      securityDeposit: Number(agreeSecurityDeposit),
      collectionType: agreeCollectionType,
      escalationPercentage: Number(agreeEscalationPercentage),
      dueDayOfMonth: Number(agreeDueDayOfMonth),
      startDate: agreeStartDate,
      endDate: agreeEndDate,
    });
    setIsEditAgreementModalOpen(false);
  };

  const handleReviseRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    reviseRent(selectedAgreement.id, Number(newRentAmount), Number(newMaintAmount));
    setIsReviseRentModalOpen(false);
  };

  const handleRenewLeaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    renewLease(selectedAgreement.id, newEndDate, Number(renewRentAmount));
    setIsRenewLeaseModalOpen(false);
  };

  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectAgreementId) return;
    const recNum = collectRent(
      collectAgreementId,
      Number(rentAmount),
      Number(maintAmount),
      rentPaymentMode,
      rentBankAccountId
    );
    setIsCollectRentModalOpen(false);
    setReceiptNumber(recNum);
  };

  const handleConfirmCloseLease = () => {
    if (!selectedAgreement) return;
    closeLease(selectedAgreement.id);
    setIsCloseLeaseModalOpen(false);
  };

  const activeSubView = initialSubTab || 'rental_overview';

  const renderContent = () => {
    // 1. RENTAL OVERVIEW SCREEN
    if (activeSubView === 'rental_overview' || activeSubView === 'overview') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Rental Portfolio Executive Overview"
            subtitle="Executive summary of real estate assets, parent complexes, portfolio occupancy rates, and expected lease revenues."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Overview' }]}
            actions={
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setParentName('');
                    setParentAddress('');
                    setIsAddParentModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Parent Property</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewUnitModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Child Unit</span>
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Parent Properties"
              value={parentProperties.length}
              subtitle="Master real estate complexes"
              icon={Building2}
              variant="purple"
            />
            <StatCard
              title="Total Child Units"
              value={totalUnits}
              subtitle={`${occupiedUnits} Occupied • ${vacantUnits} Vacant`}
              icon={Home}
              variant="emerald"
            />
            <StatCard
              title="Portfolio Occupancy"
              value={`${occupancyRate}%`}
              subtitle="Active tenant utilization"
              icon={UserCheck}
              variant="blue"
            />
            <StatCard
              title="Monthly Rent Revenue"
              value={formatCurrency(monthlyRevenue)}
              subtitle="Expected monthly cash flow"
              icon={DollarSign}
              variant="rose"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parent Properties Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Parent Properties Summary</h3>
                <span className="text-xs font-mono font-bold text-purple-700">{parentProperties.length} Assets</span>
              </div>
              <div className="space-y-3">
                {parentProperties.map(parent => {
                  const unitsUnder = childProperties.filter(c => c.parentPropertyId === parent.id);
                  const occupiedUnder = unitsUnder.filter(u => u.status === 'occupied').length;
                  return (
                    <div key={parent.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold block">{parent.id}</span>
                        <span className="font-bold text-slate-900 text-sm">{parent.name}</span>
                        <span className="text-[11px] text-slate-500 block">{parent.address}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 block text-xs">{occupiedUnder} / {unitsUnder.length} Occupied</span>
                        <span className="text-[10px] text-slate-400 capitalize">{parent.propertyType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Lease Agreements Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Active Tenant Leases Summary</h3>
                <span className="text-xs font-mono font-bold text-emerald-700">{rentalAgreements.filter(a => a.status === 'active').length} Active</span>
              </div>
              <div className="space-y-3">
                {rentalAgreements.map(agree => {
                  const tenant = profiles.find(p => p.id === agree.tenantProfileId);
                  const unit = childProperties.find(c => c.id === agree.childPropertyId);

                  return (
                    <div key={agree.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold block">{agree.id}</span>
                        <span className="font-bold text-slate-900">{tenant?.name || agree.tenantProfileId}</span>
                        <span className="text-[11px] text-slate-500 block">Unit {unit?.unitNumber} ({unit?.parentPropertyName})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 block">{formatCurrency(agree.rentAmount)}/mo</span>
                        <StatusBadge status={agree.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. PARENT PROPERTIES MANAGEMENT WORKSPACE
    if (activeSubView === 'rental_parents' || activeSubView === 'parent_properties' || activeSubView === 'parents') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Parent Property & Unit Hierarchy Workspace"
            subtitle="Manage two-level Parent Property → Child Property/Unit hierarchy, tenant agreements, and rent revisions."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Parent Hierarchy' }]}
            actions={
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setParentName('');
                    setParentAddress('');
                    setIsAddParentModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Parent Property</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewUnitModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Child Unit</span>
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Parent Properties"
              value={parentProperties.length}
              subtitle="Master real estate complexes"
              icon={Building2}
              variant="purple"
            />
            <StatCard
              title="Total Child Units"
              value={totalUnits}
              subtitle={`${occupiedUnits} Occupied • ${vacantUnits} Vacant`}
              icon={Home}
              variant="emerald"
            />
            <StatCard
              title="Portfolio Occupancy"
              value={`${occupancyRate}%`}
              subtitle="Active tenant utilization"
              icon={UserCheck}
              variant="blue"
            />
            <StatCard
              title="Monthly Rent Revenue"
              value={formatCurrency(monthlyRevenue)}
              subtitle="Expected monthly cash flow"
              icon={DollarSign}
              variant="rose"
            />
          </div>

          {/* PARENT PROPERTIES MASTER DIRECTORY */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Parent Properties Directory</h3>
                <p className="text-xs text-slate-500">Master commercial complexes defining parent asset ownership and child unit roll-ups.</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{parentProperties.length} Parent Assets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {parentProperties.map(parent => {
                const isSelected = selectedParent?.id === parent.id;
                const unitsUnderParent = childProperties.filter(c => c.parentPropertyId === parent.id);

                return (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParent(parent)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/30 ring-2 ring-purple-600/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                        PARENT PROPERTY
                      </span>
                      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParent(parent);
                            setParentName(parent.name);
                            setParentAddress(parent.address);
                            setParentType(parent.propertyType);
                            setParentOwnership(parent.ownership);
                            setIsEditParentModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-purple-700 hover:bg-slate-100"
                          title="Edit Parent Property"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParent(parent)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Parent Property"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-xs font-bold text-slate-400">{parent.id}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{parent.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{parent.address}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-sans block">Total Units</span>
                        <span className="font-bold text-slate-800">{unitsUnderParent.length} Child Units</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-sans block">Occupancy</span>
                        <span className="font-bold text-emerald-700">
                          {unitsUnderParent.filter(u => u.status === 'occupied').length} / {unitsUnderParent.length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TWO-LEVEL PARENT → CHILD TREE VIEW WORKSPACE */}
          {selectedParent && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Units under Parent: {selectedParent.name}
                      </h3>
                      <span className="font-mono text-xs px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded">
                        {selectedParent.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Hierarchy: <span className="font-bold text-slate-800">{selectedParent.name}</span> ──► Child Units ({childProperties.filter(c => c.parentPropertyId === selectedParent.id).length})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParentPropId(selectedParent.id);
                    setIsNewUnitModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Unit to {selectedParent.id}</span>
                </button>
              </div>

              {/* Child Units List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="p-3">Parent Property</th>
                      <th className="p-3">Child Unit ID & Name</th>
                      <th className="p-3">Floor & Type</th>
                      <th className="p-3">Standard Rent</th>
                      <th className="p-3">Maintenance Fee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                    {childProperties
                      .filter(c => c.parentPropertyId === selectedParent.id)
                      .map(unit => {
                        const activeAgr = rentalAgreements.find(a => a.childPropertyId === unit.id && a.status === 'active');
                        const tenantName = activeAgr ? profiles.find(p => p.id === activeAgr.tenantProfileId)?.name : null;

                        return (
                          <tr key={unit.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-semibold text-slate-800">
                              <span className="text-xs text-purple-700 font-bold block">{selectedParent.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{selectedParent.id}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-slate-900 block">{unit.unitNumber}</span>
                              <span className="font-mono text-[10px] text-slate-400">{unit.id}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-slate-800 block">{unit.floor}</span>
                              <span className="text-[10px] text-slate-500 capitalize">{unit.propertyType || 'commercial'}</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {formatCurrency(unit.rentAmount || unit.standardRent || 25000)}
                            </td>
                            <td className="p-3 font-mono text-slate-700">
                              {formatCurrency(unit.maintenanceAmount || unit.standardMaintenance || 3000)}
                            </td>
                            <td className="p-3">
                              <StatusBadge status={unit.status} />
                              {tenantName && <span className="text-[10px] text-slate-500 block mt-0.5">Tenant: {tenantName}</span>}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedChild(unit);
                                  setUnitNumber(unit.unitNumber);
                                  setFloor(unit.floor);
                                  setSquareFeet(unit.squareFeet || 850);
                                  setStandardRent(unit.rentAmount || unit.standardRent || 25000);
                                  setStandardMaintenance(unit.maintenanceAmount || unit.standardMaintenance || 3000);
                                  setUnitType(unit.propertyType || 'commercial');
                                  setIsEditUnitModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                                title="Edit Unit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(unit)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Unit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. RENTAL AGREEMENTS & LEASE MANAGEMENT SCREEN
    if (activeSubView === 'rental_agreements' || activeSubView === 'lease_management') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Rental Lease Agreements Directory"
            subtitle="Create and manage active tenant lease agreements, rent revisions, renewals, and lease terminations."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Lease Agreements' }]}
            actions={
              <button
                type="button"
                onClick={() => {
                  const firstVacant = childProperties.find(u => u.status === 'vacant');
                  if (firstVacant) handleUnitSelectForAgreement(firstVacant.id);
                  setIsNewAgreementModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Lease Agreement</span>
              </button>
            }
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Master Lease Agreements Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Agreement ID</th>
                    <th className="p-3">Tenant Profile</th>
                    <th className="p-3">Property Unit</th>
                    <th className="p-3">Monthly Rent</th>
                    <th className="p-3">Maintenance</th>
                    <th className="p-3">Security Deposit</th>
                    <th className="p-3">Tenure Period</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {rentalAgreements.map(a => {
                    const tenant = profiles.find(p => p.id === a.tenantProfileId);
                    const unit = childProperties.find(c => c.id === a.childPropertyId);

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{a.id}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{tenant?.name || a.tenantProfileId}</span>
                          <span className="font-mono text-[10px] text-slate-400">{a.tenantProfileId}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{unit?.unitNumber || a.childPropertyId}</span>
                          <span className="text-[10px] text-slate-500">{unit?.parentPropertyName}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(a.rentAmount)}</td>
                        <td className="p-3 font-mono text-slate-700">{formatCurrency(a.maintenanceAmount)}</td>
                        <td className="p-3 font-mono text-slate-700">{formatCurrency(a.securityDeposit)}</td>
                        <td className="p-3 font-mono text-slate-600 text-[11px]">
                          {formatDate(a.startDate)} ──► {formatDate(a.endDate)}
                        </td>
                        <td className="p-3"><StatusBadge status={a.status} /></td>
                        <td className="p-3 text-right space-x-1">
                          {a.status === 'active' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAgreement(a);
                                  setNewRentAmount(a.rentAmount);
                                  setNewMaintAmount(a.maintenanceAmount);
                                  setIsReviseRentModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-semibold"
                                title="Revise Rent"
                              >
                                Revise Rent
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAgreement(a);
                                  setRenewRentAmount(a.rentAmount);
                                  setIsRenewLeaseModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold"
                                title="Renew Lease"
                              >
                                Renew
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAgreement(a);
                                  setIsCloseLeaseModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold"
                                title="Close Lease"
                              >
                                Terminate
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 3. CHILD UNITS & PROPERTIES DEDICATED SCREEN
    if (activeSubView === 'rental_units' || activeSubView === 'units') {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Child Units & Properties Directory"
            subtitle="Dedicated workspace for managing individual rental units, floor positions, standard rents, maintenance fees, and tenant occupancy."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Child Units' }]}
            actions={
              <button
                type="button"
                onClick={() => setIsNewUnitModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Child Unit</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Child Units"
              value={totalUnits}
              subtitle="Master unit register"
              icon={Home}
              variant="emerald"
            />
            <StatCard
              title="Occupied Units"
              value={occupiedUnits}
              subtitle="Active tenant leases"
              icon={UserCheck}
              variant="purple"
            />
            <StatCard
              title="Vacant Units"
              value={vacantUnits}
              subtitle="Available for tenancy"
              icon={Building}
              variant="amber"
            />
            <StatCard
              title="Total Monthly Standard Rent"
              value={formatCurrency(childProperties.reduce((sum, u) => sum + (u.rentAmount || u.standardRent || 0), 0))}
              subtitle="Base property yield"
              icon={DollarSign}
              variant="blue"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Master Property Units Register ({childProperties.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Unit Number</th>
                    <th className="p-3">Parent Property</th>
                    <th className="p-3">Floor</th>
                    <th className="p-3">Square Feet</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Standard Rent</th>
                    <th className="p-3">Maintenance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {childProperties.map(unit => {
                    const activeAgreement = rentalAgreements.find(
                      a => a.childPropertyId === unit.id && a.status === 'active'
                    );
                    const tenantName = activeAgreement
                      ? profiles.find(p => p.id === activeAgreement.tenantProfileId)?.name || activeAgreement.tenantProfileId
                      : undefined;

                    return (
                      <tr key={unit.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{unit.unitNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{unit.parentPropertyName || unit.parentPropertyId}</td>
                        <td className="p-3 text-slate-600">{unit.floor}</td>
                        <td className="p-3 font-mono text-slate-600">{unit.squareFeet ? `${unit.squareFeet} sq ft` : 'N/A'}</td>
                        <td className="p-3 capitalize">{unit.propertyType}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(unit.rentAmount || unit.standardRent || 25000)}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {formatCurrency(unit.maintenanceAmount || unit.standardMaintenance || 3000)}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={unit.status} />
                          {tenantName && <span className="text-[10px] text-slate-500 block mt-0.5">Tenant: {tenantName}</span>}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChild(unit);
                              setUnitNumber(unit.unitNumber);
                              setFloor(unit.floor);
                              setSquareFeet(unit.squareFeet || 850);
                              setStandardRent(unit.rentAmount || unit.standardRent || 25000);
                              setStandardMaintenance(unit.maintenanceAmount || unit.standardMaintenance || 3000);
                              setUnitType(unit.propertyType || 'commercial');
                              setIsEditUnitModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                            title="Edit Unit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(unit)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {unit.status === 'vacant' && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUnitSelectForAgreement(unit.id);
                                setIsNewAgreementModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold ml-1"
                            >
                              + Lease
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // 4. RENT COLLECTIONS REGISTER DEDICATED SCREEN
    if (activeSubView === 'rental_collections' || activeSubView === 'collections') {
      const totalCollectedSum = rentCollections.reduce((sum, c) => sum + (c.totalAmount || (c.rentAmount + c.maintenanceAmount) || 0), 0);

      return (
        <div className="space-y-6">
          <PageHeader
            title="Rent Collections Register"
            subtitle="Dedicated workspace for tracking rent payment receipts, collections history, and cash/bank book postings."
            breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Rent Collections' }]}
            actions={
              <button
                type="button"
                onClick={() => {
                  const activeAgreement = rentalAgreements.find(a => a.status === 'active');
                  if (activeAgreement) {
                    setCollectAgreementId(activeAgreement.id);
                    setRentAmount(activeAgreement.rentAmount);
                    setMaintAmount(activeAgreement.maintenanceAmount);
                  }
                  setIsCollectRentModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Collect Rent</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Rent Collected"
              value={formatCurrency(totalCollectedSum)}
              subtitle={`${rentCollections.length} Collection Vouchers`}
              icon={DollarSign}
              variant="emerald"
            />
            <StatCard
              title="Active Lease Revenue"
              value={formatCurrency(monthlyRevenue)}
              subtitle="Monthly recurring expectations"
              icon={Receipt}
              variant="blue"
            />
            <StatCard
              title="Active Tenants"
              value={rentalAgreements.filter(a => a.status === 'active').length}
              subtitle="Current collection accounts"
              icon={UserCheck}
              variant="purple"
            />
            <StatCard
              title="Occupancy Utilization"
              value={`${occupancyRate}%`}
              subtitle={`${occupiedUnits} / ${totalUnits} units occupied`}
              icon={Home}
              variant="amber"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Master Rent Collections & Voucher Log
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Receipt #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Tenant Profile</th>
                    <th className="p-3">Property Unit</th>
                    <th className="p-3">Rent Collected</th>
                    <th className="p-3">Maintenance</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                  {rentCollections.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        No rent collections recorded yet. Click "+ Collect Rent" above to record a rent payment.
                      </td>
                    </tr>
                  ) : (
                    rentCollections.map(col => {
                      const agreement = rentalAgreements.find(a => a.id === col.agreementId);
                      const tenant = profiles.find(p => p.id === (col.tenantProfileId || agreement?.tenantProfileId));
                      const unit = childProperties.find(c => c.id === (col.childPropertyId || agreement?.childPropertyId));
                      const totalVal = col.totalAmount || (col.rentAmount + col.maintenanceAmount);

                      return (
                        <tr key={col.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-emerald-700">{col.receiptNumber || col.id}</td>
                          <td className="p-3 font-mono text-slate-600">{formatDate(col.date || col.collectionDate)}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {tenant?.name || col.tenantProfileId || 'Verified Tenant'}
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {unit?.unitNumber || 'Unit Property'} ({unit?.parentPropertyName || 'Property Complex'})
                          </td>
                          <td className="p-3 font-mono text-slate-800">{formatCurrency(col.rentAmount)}</td>
                          <td className="p-3 font-mono text-slate-600">{formatCurrency(col.maintenanceAmount)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(totalVal)}</td>
                          <td className="p-3 font-mono uppercase text-slate-700">
                            {col.paymentMode} {col.bankAccountId ? `(${col.bankAccountId})` : ''}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                              CONFIRMED
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptNumber(col.receiptNumber || col.id)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Default fallback to Rental Overview
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rental Portfolio Executive Overview"
          subtitle="Executive summary of real estate assets, parent complexes, portfolio occupancy rates, and expected lease revenues."
          breadcrumbs={[{ label: 'Business Modules' }, { label: 'Rental' }, { label: 'Overview' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Parent Properties"
            value={parentProperties.length}
            subtitle="Master real estate complexes"
            icon={Building2}
            variant="purple"
          />
          <StatCard
            title="Total Child Units"
            value={totalUnits}
            subtitle={`${occupiedUnits} Occupied • ${vacantUnits} Vacant`}
            icon={Home}
            variant="emerald"
          />
          <StatCard
            title="Portfolio Occupancy"
            value={`${occupancyRate}%`}
            subtitle="Active tenant utilization"
            icon={UserCheck}
            variant="blue"
          />
          <StatCard
            title="Monthly Rent Revenue"
            value={formatCurrency(monthlyRevenue)}
            subtitle="Expected monthly cash flow"
            icon={DollarSign}
            variant="rose"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* 1. ADD PARENT PROPERTY MODAL */}
      <Modal
        isOpen={isAddParentModalOpen}
        onClose={() => setIsAddParentModalOpen(false)}
        title="Add Parent Property Asset"
        subtitle="Create a master commercial/residential property complex."
      >
        <form onSubmit={handleAddParentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Parent Property Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dhavanam Trade Tower"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Address / Location *</label>
            <input
              type="text"
              required
              placeholder="Full physical address..."
              value={parentAddress}
              onChange={e => setParentAddress(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Property Type</label>
              <select
                value={parentType}
                onChange={e => setParentType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
              >
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="mixed">Mixed Commercial/Residential</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ownership Entity</label>
              <input
                type="text"
                value={parentOwnership}
                onChange={e => setParentOwnership(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddParentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Save Parent Asset
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PARENT PROPERTY MODAL */}
      <Modal
        isOpen={isEditParentModalOpen}
        onClose={() => setIsEditParentModalOpen(false)}
        title={`Edit Parent Property — ${selectedParent?.id || ''}`}
      >
        <form onSubmit={handleEditParentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Parent Property Name *</label>
            <input
              type="text"
              required
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Address / Location *</label>
            <input
              type="text"
              required
              value={parentAddress}
              onChange={e => setParentAddress(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditParentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Update Parent Property
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. ADD CHILD UNIT MODAL */}
      <Modal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        title="Add Child Unit / Property"
        subtitle="Attach a rental unit under a selected Parent Property."
      >
        <form onSubmit={handleCreateUnitSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Parent Property *</label>
            <select
              required
              value={parentPropId}
              onChange={e => setParentPropId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
            >
              {parentProperties.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Unit Number / Identifier *</label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 302"
                value={unitNumber}
                onChange={e => setUnitNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Floor Level</label>
              <input
                type="text"
                placeholder="e.g. 3rd Floor"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Standard Rent (₹) *</label>
              <input
                type="number"
                required
                value={standardRent}
                onChange={e => setStandardRent(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Maintenance (₹) *</label>
              <input
                type="number"
                required
                value={standardMaintenance}
                onChange={e => setStandardMaintenance(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Square Feet</label>
              <input
                type="number"
                value={squareFeet}
                onChange={e => setSquareFeet(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewUnitModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Save Child Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CHILD UNIT MODAL */}
      <Modal
        isOpen={isEditUnitModalOpen}
        onClose={() => setIsEditUnitModalOpen(false)}
        title={`Edit Child Unit — ${selectedChild?.unitNumber || ''}`}
      >
        <form onSubmit={handleEditUnitSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Unit Number *</label>
              <input
                type="text"
                required
                value={unitNumber}
                onChange={e => setUnitNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Floor Level</label>
              <input
                type="text"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Standard Rent (₹)</label>
              <input
                type="number"
                value={standardRent}
                onChange={e => setStandardRent(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Maintenance Fee (₹)</label>
              <input
                type="number"
                value={standardMaintenance}
                onChange={e => setStandardMaintenance(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditUnitModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Update Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. NEW LEASE AGREEMENT MODAL */}
      <Modal
        isOpen={isNewAgreementModalOpen}
        onClose={() => setIsNewAgreementModalOpen(false)}
        title="Create New Lease Agreement"
        subtitle="Assign tenant to vacant child property unit and set rent terms."
      >
        <form onSubmit={handleCreateAgreementSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Vacant Child Property Unit *</label>
            <select
              required
              value={agreeChildPropertyId}
              onChange={e => handleUnitSelectForAgreement(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
            >
              <option value="">-- Select Vacant Unit --</option>
              {childProperties.filter(u => u.status === 'vacant').map(u => (
                <option key={u.id} value={u.id}>
                  {u.unitNumber} ({u.parentPropertyName}) — Rent: ₹{u.rentAmount || u.standardRent}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Tenant Profile *</label>
            <select
              required
              value={agreeTenantProfileId}
              onChange={e => setAgreeTenantProfileId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
            >
              <option value="">-- Select Tenant Profile --</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName || p.name} ({p.id}) — {p.mobile}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Monthly Rent (₹) *</label>
              <input
                type="number"
                required
                value={agreeMonthlyRent}
                onChange={e => setAgreeMonthlyRent(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Maintenance (₹) *</label>
              <input
                type="number"
                required
                value={agreeMonthlyMaintenance}
                onChange={e => setAgreeMonthlyMaintenance(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Security Deposit (₹) *</label>
              <input
                type="number"
                required
                value={agreeSecurityDeposit}
                onChange={e => setAgreeSecurityDeposit(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Collection Type</label>
              <select
                value={agreeCollectionType}
                onChange={e => setAgreeCollectionType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-semibold"
              >
                <option value="combined">Combined Rent & Maintenance</option>
                <option value="rent_only">Rent Only</option>
                <option value="maintenance_only">Maintenance Only</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Annual Escalation (%)</label>
              <input
                type="number"
                value={agreeEscalationPercentage}
                onChange={e => setAgreeEscalationPercentage(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Lease Start Date *</label>
              <input
                type="date"
                required
                value={agreeStartDate}
                onChange={e => setAgreeStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Lease End Date *</label>
              <input
                type="date"
                required
                value={agreeEndDate}
                onChange={e => setAgreeEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewAgreementModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Generate Lease Agreement
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. REVISE RENT MODAL */}
      <Modal
        isOpen={isReviseRentModalOpen}
        onClose={() => setIsReviseRentModalOpen(false)}
        title={`Rent Revision — Lease ${selectedAgreement?.id || ''}`}
        subtitle="Adjust monthly rent and maintenance terms."
      >
        <form onSubmit={handleReviseRentSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 block">Current Terms:</span>
            <span className="font-mono text-slate-600 block">Rent: ₹{selectedAgreement?.rentAmount.toLocaleString('en-IN')} | Maintenance: ₹{selectedAgreement?.maintenanceAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Revised Monthly Rent (₹) *</label>
              <input
                type="number"
                required
                value={newRentAmount}
                onChange={e => setNewRentAmount(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Revised Maintenance (₹)</label>
              <input
                type="number"
                value={newMaintAmount}
                onChange={e => setNewMaintAmount(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReviseRentModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
            >
              Confirm Rent Revision
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. RENEW LEASE MODAL */}
      <Modal
        isOpen={isRenewLeaseModalOpen}
        onClose={() => setIsRenewLeaseModalOpen(false)}
        title={`Renew Lease — Agreement ${selectedAgreement?.id || ''}`}
        subtitle="Extend lease tenure period and update rent."
      >
        <form onSubmit={handleRenewLeaseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Extended Lease End Date *</label>
            <input
              type="date"
              required
              value={newEndDate}
              onChange={e => setNewEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Monthly Rent for Renewed Tenure (₹)</label>
            <input
              type="number"
              value={renewRentAmount}
              onChange={e => setRenewRentAmount(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-emerald-700 font-bold"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRenewLeaseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Execute Lease Renewal
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. CLOSE LEASE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isCloseLeaseModalOpen}
        onClose={() => setIsCloseLeaseModalOpen(false)}
        onConfirm={handleConfirmCloseLease}
        title="Terminate Lease Agreement"
        message={`Are you sure you want to terminate Lease Agreement ${selectedAgreement?.id}? The unit will automatically be restored to VACANT status and available for new tenancy.`}
        confirmText="Terminate Lease & Restock Unit to Vacant"
        variant="danger"
      />

      {/* RECEIPT MODAL */}
      {receiptNumber && (
        <ReceiptModal
          isOpen={true}
          onClose={() => setReceiptNumber(null)}
          receiptNumber={receiptNumber}
          title="Rent Collection Voucher"
        />
      )}
    </div>
  );
};
