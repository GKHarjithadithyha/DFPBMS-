import React, { useState } from 'react';
import { X, Shield, Car, Building2, Upload, CheckCircle2, FileText } from 'lucide-react';
import { CollateralItem, CollateralType } from '../../types';

interface CollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (collateral: CollateralItem) => void;
}

export const CollateralModal: React.FC<CollateralModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedType, setSelectedType] = useState<CollateralType>('gold');

  // Gold Form State
  const [netWeight, setNetWeight] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [carat, setCarat] = useState('22K');

  // Vehicle Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [possession, setPossession] = useState<'with' | 'without'>('with');
  const [rcBookFileName, setRcBookFileName] = useState('');

  // Other Asset Form State
  const [assetTitle, setAssetTitle] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [documentFileName, setDocumentFileName] = useState('');

  // Validation error state
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRcBookFileName(file.name);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFileName(file.name);
    }
  };

  const resetForm = () => {
    setNetWeight('');
    setGrossWeight('');
    setCarat('22K');
    setBrand('');
    setModel('');
    setPossession('with');
    setRcBookFileName('');
    setAssetTitle('');
    setAssetValue('');
    setDocumentFileName('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const id = `col-${Date.now()}`;

    if (selectedType === 'gold') {
      if (!netWeight || Number(netWeight) <= 0) {
        setError('Please enter a valid Net Weight in grams.');
        return;
      }
      if (!grossWeight || Number(grossWeight) <= 0) {
        setError('Please enter a valid Gross Weight in grams.');
        return;
      }
      onAdd({
        id,
        type: 'gold',
        netWeight,
        grossWeight,
        carat,
      });
    } else if (selectedType === 'vehicle') {
      if (!brand.trim()) {
        setError('Please enter the Vehicle Brand.');
        return;
      }
      if (!model.trim()) {
        setError('Please enter the Vehicle Model.');
        return;
      }
      onAdd({
        id,
        type: 'vehicle',
        brand: brand.trim(),
        model: model.trim(),
        possession,
        rcBookFileName: rcBookFileName || undefined,
      });
    } else if (selectedType === 'other') {
      if (!assetTitle.trim()) {
        setError('Please enter the Asset Title / Name.');
        return;
      }
      if (!assetValue || Number(assetValue) <= 0) {
        setError('Please enter a valid Asset Value in ₹.');
        return;
      }
      onAdd({
        id,
        type: 'other',
        assetTitle: assetTitle.trim(),
        assetValue,
        documentFileName: documentFileName || undefined,
      });
    }

    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Add Collateral Security</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select collateral category and input asset particulars</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Collateral Type Selector Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Collateral Type *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Option 1: Gold */}
              <button
                type="button"
                onClick={() => { setSelectedType('gold'); setError(null); }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedType === 'gold'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Shield className={`w-4 h-4 ${selectedType === 'gold' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${selectedType === 'gold' ? 'text-amber-900' : 'text-slate-800'}`}>
                    Gold
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Gold ornaments / jewellery
                </span>
              </button>

              {/* Option 2: Vehicle */}
              <button
                type="button"
                onClick={() => { setSelectedType('vehicle'); setError(null); }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedType === 'vehicle'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Car className={`w-4 h-4 ${selectedType === 'vehicle' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${selectedType === 'vehicle' ? 'text-blue-900' : 'text-slate-800'}`}>
                    Vehicle
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Vehicle collateral
                </span>
              </button>

              {/* Option 3: Other Asset */}
              <button
                type="button"
                onClick={() => { setSelectedType('other'); setError(null); }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedType === 'other'
                    ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Building2 className={`w-4 h-4 ${selectedType === 'other' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${selectedType === 'other' ? 'text-purple-900' : 'text-slate-800'}`}>
                    Other Asset
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Property / machinery / asset
                </span>
              </button>
            </div>
          </div>

          {/* Option 1: Gold Form */}
          {selectedType === 'gold' && (
            <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-200/70 space-y-3.5 animate-in fade-in duration-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Gold Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Net Weight (grams) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={netWeight}
                    onChange={e => setNetWeight(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full h-9 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Gross Weight (grams) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossWeight}
                    onChange={e => setGrossWeight(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full h-9 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Carat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={carat}
                    onChange={e => setCarat(e.target.value)}
                    className="w-full h-9 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="24K">24K (Pure Gold)</option>
                    <option value="22K">22K (Standard)</option>
                    <option value="20K">20K</option>
                    <option value="18K">18K</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Option 2: Vehicle Form */}
          {selectedType === 'vehicle' && (
            <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-200/70 space-y-3.5 animate-in fade-in duration-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Vehicle Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Hyundai, Honda, Maruti"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="e.g. Creta, City, Swift"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Possession Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Possession *
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="vehicle_possession"
                      value="with"
                      checked={possession === 'with'}
                      onChange={() => setPossession('with')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>With Possession</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="vehicle_possession"
                      value="without"
                      checked={possession === 'without'}
                      onChange={() => setPossession('without')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Without Possession</span>
                  </label>
                </div>
              </div>

              {/* RC Book Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RC Book
                </label>
                <div className="flex items-center space-x-3">
                  <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload RC Book</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleRcUpload}
                      className="hidden"
                    />
                  </label>
                  {rcBookFileName ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{rcBookFileName} ✓</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">PDF, JPG, PNG accepted</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Option 3: Other Asset Form */}
          {selectedType === 'other' && (
            <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-200/70 space-y-3.5 animate-in fade-in duration-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Other Asset Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Title / Name *
                  </label>
                  <input
                    type="text"
                    value={assetTitle}
                    onChange={e => setAssetTitle(e.target.value)}
                    placeholder="e.g. Property, Machinery, Commercial Shop"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Value (₹) *
                  </label>
                  <input
                    type="number"
                    value={assetValue}
                    onChange={e => setAssetValue(e.target.value)}
                    placeholder="e.g. 2500000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Related Document Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Related Document
                </label>
                <div className="flex items-center space-x-3">
                  <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    <span>Upload Document</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                  </label>
                  {documentFileName ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{documentFileName} ✓</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Title deed, invoice or proof</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Add Collateral</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
