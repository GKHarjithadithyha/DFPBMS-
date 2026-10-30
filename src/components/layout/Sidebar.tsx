import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  BookOpen,
  CreditCard,
  Users2,
  Building,
  Receipt,
  TrendingUp,
  Scale,
  UserCheck,
  Calendar,
  FileText,
  BarChart3,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency } from '../../utils/formatters';

interface SidebarProps {
  currentTab: string;
  activeSubTab?: string;
  onSelectTab: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface SubNavItem {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  subItems?: SubNavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeSubTab,
  onSelectTab,
  isCollapsed,
}) => {
  const { userRole, userName, logout, totalCashBalance, totalBankBalance, loans, chitGroups } = useERP();

  const pendingLoansCount = loans.filter(l => l.status === 'pending_approval').length;
  const formingChitCount = chitGroups.filter(g => g.status === 'forming' || g.status === 'pending_approval').length;

  // Multiple modules can be expanded independently
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    finance: true,
    chit: false,
    rental: false,
    expense: false,
    investment: false,
    receivables_payables: false,
  });

  React.useEffect(() => {
    if (currentTab) {
      setExpandedModules(prev => ({
        ...prev,
        [currentTab]: true,
      }));
    }
  }, [currentTab]);

  const toggleExpandModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const navSections: NavSection[] = [
    {
      label: 'Main Overview',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Central Financial Core',
      items: [
        { id: 'cash_book', label: 'Central Cash Book', icon: Wallet, badge: formatCurrency(totalCashBalance) },
        { id: 'bank_book', label: 'Central Bank Book', icon: Landmark, badge: formatCurrency(totalBankBalance) },
        { id: 'central_ledger', label: 'Central Ledger', icon: BookOpen },
      ],
    },
    {
      label: 'Business Modules',
      items: [
        {
          id: 'finance',
          label: 'Finance (Lending)',
          icon: CreditCard,
          badge: pendingLoansCount > 0 ? `${pendingLoansCount} Pending` : undefined,
          subItems: [
            { id: 'finance_overview', label: 'Overview' },
            { id: 'finance_applications', label: 'Loan Applications' },
            { id: 'finance_register', label: 'Loan Register' },
            { id: 'finance_disbursement', label: 'Disbursement' },
            { id: 'finance_collections', label: 'Collections' },
            { id: 'finance_topup', label: 'Top-Up' },
            { id: 'finance_npa', label: 'NPA' },
            { id: 'finance_closure', label: 'Loan Closure' },
          ],
        },
        {
          id: 'chit',
          label: 'Chit Fund Management',
          icon: Users2,
          badge: formingChitCount > 0 ? `${formingChitCount} Pending` : undefined,
          subItems: [
            { id: 'chit_overview', label: 'Overview' },
            { id: 'chit_groups', label: 'Active Groups' },
            { id: 'chit_schemes', label: 'Schemes Master' },
            { id: 'chit_members', label: 'Members Roll' },
            { id: 'chit_auctions', label: 'Auction & Prize Records' },
          ],
        },
        {
          id: 'rental',
          label: 'Rental Management',
          icon: Building,
          subItems: [
            { id: 'rental_overview', label: 'Overview Dashboard' },
            { id: 'rental_properties', label: 'Property Management' },
            { id: 'rental_tenants', label: 'Tenant & Agreement Management' },
            { id: 'rental_collections', label: 'Collection Management' },
            { id: 'rental_expenses', label: 'Expense Management' },
          ],
        },
        {
          id: 'expense',
          label: 'Expenses',
          icon: Receipt,
          subItems: [
            { id: 'expense_overview', label: 'Overview' },
            { id: 'expense_register', label: 'Expense Register' },
            { id: 'expense_entry', label: 'Expense Entry' },
            { id: 'expense_categories', label: 'Categories' },
            { id: 'expense_details', label: 'Expense Details' },
          ],
        },
        {
          id: 'investment',
          label: 'Investments',
          icon: TrendingUp,
          subItems: [
            { id: 'investment_overview', label: 'Overview' },
            { id: 'investment_register', label: 'Investment Register' },
            { id: 'investment_details', label: 'Investment Details' },
            { id: 'investment_maturity', label: 'Maturity' },
            { id: 'investment_closure', label: 'Closure' },
          ],
        },
        {
          id: 'receivables_payables',
          label: 'Receivables & Payables',
          icon: Scale,
          subItems: [
            { id: 'rp_overview', label: 'Overview' },
            { id: 'rp_receivables', label: 'Receivables' },
            { id: 'rp_payables', label: 'Payables' },
            { id: 'rp_payments', label: 'Collections / Payments' },
            { id: 'rp_outstanding', label: 'Outstanding & Ageing' },
          ],
        },
      ],
    },
    {
      label: 'Shared Platform Services',
      items: [
        { id: 'profiles', label: 'Profile Master', icon: UserCheck },
        { id: 'calendar', label: 'Shared Calendar', icon: Calendar },
        { id: 'documents', label: 'Document Repository', icon: FileText },
        { id: 'reports', label: 'Reports & Money Flow', icon: BarChart3 },
        { id: 'audit_logs', label: 'Audit Log Viewer', icon: History },
        { id: 'master_data', label: 'Settings & Master Data', icon: Settings, adminOnly: true },
      ],
    },
  ];

  return (
    <aside
      className={`bg-white text-slate-700 flex flex-col shrink-0 border-r border-slate-200/90 shadow-2xs transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 tracking-wider">
          DF
        </div>
        {!isCollapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-tight truncate">
              DHAVANAM FINANCE
            </h1>
            <p className="text-[10px] text-emerald-700 font-mono tracking-wider font-semibold uppercase">
              PBMS Enterprise ERP
            </p>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly && userRole !== 'admin') return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx}>
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  {section.label}
                </h3>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActiveModule = currentTab === item.id;
                  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                  const isExpanded = expandedModules[item.id] ?? false;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (hasSubItems && !isCollapsed) {
                            toggleExpandModule(item.id, e);
                            onSelectTab(item.id, item.subItems![0].id);
                          } else if (hasSubItems && isCollapsed) {
                            onSelectTab(item.id, item.subItems![0].id);
                          } else {
                            onSelectTab(item.id);
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all group ${
                          isActiveModule
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActiveModule ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />

                        {!isCollapsed && (
                          <div className="ml-2.5 flex-1 flex items-center justify-between text-left truncate">
                            <span className="truncate">{item.label}</span>
                            <div className="flex items-center space-x-1">
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-semibold">
                                  {item.badge}
                                </span>
                              )}
                              {hasSubItems && (
                                <span className="p-0.5 text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>

                      {/* Submenu with vertical guide line */}
                      {!isCollapsed && hasSubItems && isExpanded && (
                        <div className="ml-5 pl-2.5 border-l border-slate-200 space-y-0.5 my-0.5">
                          {item.subItems!.map((sub) => {
                            const isSubActive = isActiveModule && activeSubTab === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => onSelectTab(item.id, sub.id)}
                                className={`w-full text-left px-2.5 py-1 rounded-md text-[11px] transition-all truncate block ${
                                  isSubActive
                                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/80 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${userRole === 'admin' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate leading-none">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                  {userRole} Account
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="flex justify-center w-full text-slate-400 hover:text-rose-600"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
