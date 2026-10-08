import React, { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { NotificationPanel } from '../common/NotificationPanel';

interface AppShellProps {
  currentTab: string;
  activeSubTab?: string;
  onSelectTab: (tabId: string, subTabId?: string, openInNewTab?: boolean) => void;
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  activeSubTab,
  onSelectTab,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleGlobalNavigate = (module: string, recordId?: string) => {
    onSelectTab(module);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        activeSubTab={activeSubTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          activeSubTab={activeSubTab}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleGlobalNavigate}
      />

      {/* Telegram Notification Drawer */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};
