import React, { ReactNode } from 'react';

interface StandalonePageLayoutProps {
  children: ReactNode;
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const StandalonePageLayout: React.FC<StandalonePageLayoutProps> = ({ children, onNavigate }) => {
  const handleReturnToMain = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      window.location.hash = 'dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Minimal Standalone Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
              DF
            </div>
            <div>
              <h1 className="font-bold text-xs text-slate-900 tracking-tight leading-tight">
                DHAVANAM FINANCE
              </h1>
              <p className="text-[10px] text-emerald-700 font-mono tracking-wider font-semibold uppercase">
                PBMS Enterprise ERP • Dedicated Module View
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReturnToMain}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>← Return to Main ERP Workspace</span>
          </button>
        </div>
      </header>

      {/* Main Standalone Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
