import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { Layers, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { ChitScheme } from '../../types';

interface ChitSchemesPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const ChitSchemesPage: React.FC<ChitSchemesPageProps> = () => {
  const { chitSchemes, chitGroups, createChitScheme, updateChitScheme, deleteChitScheme } = useERP();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<ChitScheme | null>(null);

  // Form States
  const [schemeName, setSchemeName] = useState('');
  const [totalPoolValue, setTotalPoolValue] = useState<number>(500000);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(10000);
  const [durationMonths, setDurationMonths] = useState<number>(20);
  const [maxSubscribers, setMaxSubscribers] = useState<number>(20);
  const [foremanCommissionPercent, setForemanCommissionPercent] = useState<number>(5);
  const [description, setDescription] = useState('');
  const [isDividendType, setIsDividendType] = useState(true);

  const resetForm = () => {
    setSchemeName('');
    setTotalPoolValue(500000);
    setMonthlyInstallment(10000);
    setDurationMonths(20);
    setMaxSubscribers(20);
    setForemanCommissionPercent(5);
    setDescription('');
    setIsDividendType(true);
    setSelectedScheme(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (scheme: ChitScheme) => {
    setSelectedScheme(scheme);
    setSchemeName(scheme.schemeName || scheme.name);
    setTotalPoolValue(scheme.totalPoolValue || scheme.poolSize || 500000);
    setMonthlyInstallment(scheme.monthlyInstallment || scheme.monthlyBaseInstallment || 10000);
    setDurationMonths(scheme.durationMonths || 20);
    setMaxSubscribers(scheme.maxSubscribers || scheme.maxMembers || 20);
    setForemanCommissionPercent(scheme.foremanCommissionPercent || scheme.commissionPercent || 5);
    setDescription(scheme.description || '');
    setIsDividendType(scheme.isDividendType ?? true);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemeName.trim()) return;
    createChitScheme({
      name: schemeName.trim(),
      schemeName: schemeName.trim(),
      totalPoolValue: Number(totalPoolValue),
      monthlyInstallment: Number(monthlyInstallment),
      durationMonths: Number(durationMonths),
      maxSubscribers: Number(maxSubscribers),
      foremanCommissionPercent: Number(foremanCommissionPercent),
      description,
      isDividendType,
    });
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme) return;
    updateChitScheme(selectedScheme.id, {
      name: schemeName.trim(),
      schemeName: schemeName.trim(),
      totalPoolValue: Number(totalPoolValue),
      monthlyInstallment: Number(monthlyInstallment),
      durationMonths: Number(durationMonths),
      maxSubscribers: Number(maxSubscribers),
      foremanCommissionPercent: Number(foremanCommissionPercent),
      description,
      isDividendType,
    });
    setIsEditModalOpen(false);
    resetForm();
  };

  const handleDelete = (scheme: ChitScheme) => {
    const hasGroup = chitGroups.some(g => g.schemeId === scheme.id);
    if (hasGroup) {
      alert(`Cannot delete scheme "${scheme.schemeName || scheme.name}": There are existing Chit Groups associated with this scheme.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete the scheme "${scheme.schemeName || scheme.name}" (${scheme.id})?`)) {
      deleteChitScheme(scheme.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chit Schemes Master Directory"
        subtitle="Standardized scheme blueprints defining pool size, tenure, monthly subscription, and foreman commission rules."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Schemes Master' }]}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Scheme</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chitSchemes.map(s => {
          const hasStartedGroup = chitGroups.some(
            g => g.schemeId === s.id && (g.status === 'active' || g.status === 'in_progress' || g.status === 'completed')
          );

          return (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-400">{s.id}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                    title="Edit Scheme"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Scheme"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{s.schemeName || s.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{s.durationMonths} Months Tenure • {s.description}</p>
                {hasStartedGroup && (
                  <span className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Active Groups Running</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Pool Value:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(s.totalPoolValue || s.poolSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Monthly Subscription:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(s.monthlyInstallment || s.monthlyBaseInstallment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Max Subscribers:</span>
                  <span className="font-bold text-slate-900">{s.maxSubscribers || s.maxMembers} Members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Foreman Commission:</span>
                  <span className="font-bold text-purple-700">{s.foremanCommissionPercent || s.commissionPercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD SCHEME MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Chit Scheme Master"
        subtitle="Define pool capital, duration, subscription amount, and foreman commission rules."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Scheme Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 5 Lakhs Premium 20 Months Scheme"
              value={schemeName}
              onChange={e => setSchemeName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Total Pool Value (₹) *</label>
              <input
                type="number"
                required
                value={totalPoolValue}
                onChange={e => setTotalPoolValue(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Monthly Subscription (₹) *</label>
              <input
                type="number"
                required
                value={monthlyInstallment}
                onChange={e => setMonthlyInstallment(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tenure (Months) *</label>
              <input
                type="number"
                required
                value={durationMonths}
                onChange={e => setDurationMonths(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Max Members *</label>
              <input
                type="number"
                required
                value={maxSubscribers}
                onChange={e => setMaxSubscribers(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Foreman Comm. (%) *</label>
              <input
                type="number"
                required
                step="0.5"
                value={foremanCommissionPercent}
                onChange={e => setForemanCommissionPercent(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono text-purple-700 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Scheme Description</label>
            <input
              type="text"
              placeholder="e.g. Standard monthly dividend scheme with competitive foreman fees."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Save Scheme Master
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT SCHEME MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Scheme Master — ${selectedScheme?.id || ''}`}
        subtitle="Update scheme parameters or details."
      >
        {selectedScheme && (() => {
          const hasStartedGroup = chitGroups.some(
            g => g.schemeId === selectedScheme.id && (g.status === 'active' || g.status === 'in_progress' || g.status === 'completed')
          );

          return (
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {hasStartedGroup && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Financial Parameters Locked</span>
                    <span>An active group is currently running under this scheme. Core financial parameters (Pool Value, Subscription, Tenure, Commission) cannot be modified after a group has started.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scheme Name *</label>
                <input
                  type="text"
                  required
                  value={schemeName}
                  onChange={e => setSchemeName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Pool Value (₹) *</label>
                  <input
                    type="number"
                    required
                    disabled={hasStartedGroup}
                    value={totalPoolValue}
                    onChange={e => setTotalPoolValue(Number(e.target.value))}
                    className={`w-full border border-slate-300 rounded-lg p-2 font-mono font-bold ${hasStartedGroup ? 'bg-slate-100 text-slate-500' : 'text-emerald-700'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Subscription (₹) *</label>
                  <input
                    type="number"
                    required
                    disabled={hasStartedGroup}
                    value={monthlyInstallment}
                    onChange={e => setMonthlyInstallment(Number(e.target.value))}
                    className={`w-full border border-slate-300 rounded-lg p-2 font-mono font-bold ${hasStartedGroup ? 'bg-slate-100 text-slate-500' : 'text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tenure (Months) *</label>
                  <input
                    type="number"
                    required
                    disabled={hasStartedGroup}
                    value={durationMonths}
                    onChange={e => setDurationMonths(Number(e.target.value))}
                    className={`w-full border border-slate-300 rounded-lg p-2 font-mono ${hasStartedGroup ? 'bg-slate-100 text-slate-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Members *</label>
                  <input
                    type="number"
                    required
                    disabled={hasStartedGroup}
                    value={maxSubscribers}
                    onChange={e => setMaxSubscribers(Number(e.target.value))}
                    className={`w-full border border-slate-300 rounded-lg p-2 font-mono ${hasStartedGroup ? 'bg-slate-100 text-slate-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Foreman Comm. (%) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    disabled={hasStartedGroup}
                    value={foremanCommissionPercent}
                    onChange={e => setForemanCommissionPercent(Number(e.target.value))}
                    className={`w-full border border-slate-300 rounded-lg p-2 font-mono font-bold ${hasStartedGroup ? 'bg-slate-100 text-slate-500' : 'text-purple-700'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scheme Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Save Scheme Changes
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
};
