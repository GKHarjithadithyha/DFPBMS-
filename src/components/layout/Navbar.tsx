import React from 'react';
import {
  Menu,
  Search,
  Send,
  RotateCcw,
  Shield,
  Wallet,
  Landmark,
  User,
  Check,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency } from '../../utils/formatters';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  currentTab: string;
  activeSubTab?: string;
}

const moduleNames: Record<string, { category: string; title: string }> = {
  dashboard: { category: 'Main Overview', title: 'Executive Dashboard' },
  cash_book: { category: 'Central Financial Core', title: 'Central Cash Book' },
  bank_book: { category: 'Central Financial Core', title: 'Central Bank Book' },
  central_ledger: { category: 'Central Financial Core', title: 'Central Ledger' },
  finance: { category: 'Business Modules', title: 'Finance (Lending)' },
  chit: { category: 'Business Modules', title: 'Chit Fund Management' },
  rental: { category: 'Business Modules', title: 'Rental Management' },
  expense: { category: 'Business Modules', title: 'Expense Management' },
  investment: { category: 'Business Modules', title: 'Investment Management' },
  receivables_payables: { category: 'Business Modules', title: 'Receivables & Payables' },
  profiles: { category: 'Shared Platform Services', title: 'Profile Master' },
  calendar: { category: 'Shared Platform Services', title: 'Shared Calendar' },
  documents: { category: 'Shared Platform Services', title: 'Document Repository' },
  reports: { category: 'Shared Platform Services', title: 'Reports & Money Flow' },
  audit_logs: { category: 'Shared Platform Services', title: 'Audit Log Viewer' },
  master_data: { category: 'Shared Platform Services', title: 'Settings & Master Data' },
};

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenNotifications,
  currentTab,
  activeSubTab,
}) => {
  const {
    userRole,
    setUserRole,
    userName,
    logout,
    totalCashBalance,
    totalBankBalance,
    notifications,
    resetAllData,
  } = useERP();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleResetConfirm = () => {
    if (window.confirm('Reset all PBMS mock data to default initial state?')) {
      resetAllData();
    }
  };

  const moduleInfo = moduleNames[currentTab] || { category: 'PBMS ERP', title: currentTab };

  const formatSubTabLabel = (subId?: string) => {
    if (!subId) return null;
    const parts = subId.split('_');
    const word = parts.slice(1).join(' ');
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : subId;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 sticky top-0 shadow-2xs">
      {/* Left side: Toggle & Breadcrumbs / Global Search */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Single Breadcrumb Path */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-400">{moduleInfo.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-semibold text-slate-800">{moduleInfo.title}</span>
          {activeSubTab && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] capitalize">
                {formatSubTabLabel(activeSubTab)}
              </span>
            </>
          )}
        </div>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/70 text-slate-500 rounded-xl text-xs transition-all border border-slate-200/80 w-36 sm:w-60 justify-between"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Search PBMS (⌘K)...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Center: Live Financial Core Ticker */}
      <div className="hidden xl:flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900">
          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-medium text-slate-500">Live Cash:</span>
          <span className="font-bold font-mono text-emerald-800">{formatCurrency(totalCashBalance)}</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900">
          <Landmark className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-medium text-slate-500">Bank Total:</span>
          <span className="font-bold font-mono text-blue-800">{formatCurrency(totalBankBalance)}</span>
        </div>
      </div>

      {/* Right side controls: Telegram Notifications, Role Badge & Logout */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Telegram Notifications Button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors border border-slate-200/80"
          title="Telegram Notifications"
        >
          <Send className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Role Badge (Admin only role toggle) */}
        {userRole === 'admin' ? (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setUserRole('admin')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200 flex items-center space-x-1"
            >
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setUserRole('employee')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <span>Employee</span>
            </button>
          </div>
        ) : (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Employee Role
          </span>
        )}

        {/* User Profile Info */}
        <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-200 text-xs">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left leading-tight">
            <span className="font-semibold text-slate-800 block truncate max-w-[120px]">{userName}</span>
            <span className="text-[10px] text-slate-400 capitalize">{userRole}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200/80 inline-flex items-center space-x-1"
          title="Sign Out of PBMS ERP"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
