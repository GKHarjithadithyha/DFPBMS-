import React, { ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Info, X } from 'lucide-react';

export type ConfirmVariant = 'warning' | 'danger' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  impactDetails?: { label: string; value: string }[];
  children?: ReactNode;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'warning',
  impactDetails,
  children,
  isLoading = false,
}) => {
  if (!isOpen) return null;
  const activeDescription = description || message || '';

  const variantStyles = {
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
      border: 'border-amber-200',
    },
    danger: {
      icon: ShieldAlert,
      iconBg: 'bg-rose-100 text-rose-700',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
      border: 'border-rose-200',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-100 text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
      border: 'border-emerald-200',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      border: 'border-blue-200',
    },
  }[variant];

  const IconComponent = variantStyles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${variantStyles.iconBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 mt-1">{activeDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impact Summary Details */}
        {impactDetails && impactDetails.length > 0 && (
          <div className="mx-5 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <p className="font-semibold text-slate-700 mb-1 font-mono uppercase text-[10px] tracking-wider">Action Impact Summary:</p>
            {impactDetails.map((detail, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600">
                <span>{detail.label}</span>
                <span className="font-semibold font-mono text-slate-900">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {children && <div className="px-5 mb-4">{children}</div>}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 bg-slate-50/80 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${variantStyles.btn} disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
