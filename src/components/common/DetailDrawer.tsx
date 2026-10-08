import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  children,
  size = 'lg',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div
            className={`pointer-events-auto w-screen ${sizeClasses} bg-white shadow-2xl flex flex-col border-l border-slate-200`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between shrink-0">
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">{title}</h2>
                  {badge && <div>{badge}</div>}
                </div>
                {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {actions}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
