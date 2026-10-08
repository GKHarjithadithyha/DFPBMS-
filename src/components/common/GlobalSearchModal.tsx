import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, CreditCard, Users2, Building, Receipt, ArrowRight, X } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, recordId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const { profiles, loans, chitGroups, childProperties, centralLedger } = useERP();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedProfiles = profiles
      .filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.mobile.includes(q))
      .slice(0, 4)
      .map(p => ({
        type: 'Profile',
        title: p.name,
        subtitle: `${p.id} • ${p.mobile} • ${p.address}`,
        icon: <User className="w-4 h-4 text-indigo-500" />,
        action: () => { onNavigate('profiles', p.id); onClose(); },
      }));

    const matchedLoans = loans
      .filter(l => l.id.toLowerCase().includes(q) || l.collateralDetails.toLowerCase().includes(q))
      .slice(0, 4)
      .map(l => ({
        type: 'Loan',
        title: `${l.id} (${l.status.toUpperCase()})`,
        subtitle: `Principal: ${formatCurrency(l.principalAmount)} • Bal: ${formatCurrency(l.pendingPrincipal)}`,
        icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
        action: () => { onNavigate('finance', l.id); onClose(); },
      }));

    const matchedChit = chitGroups
      .filter(g => g.id.toLowerCase().includes(q) || g.schemeName.toLowerCase().includes(q))
      .slice(0, 3)
      .map(g => ({
        type: 'Chit Group',
        title: `${g.id} — ${g.schemeName}`,
        subtitle: `Cycle ${g.currentCycle}/${g.durationMonths} • Monthly: ${formatCurrency(g.currentInstallmentAmount)}`,
        icon: <Users2 className="w-4 h-4 text-amber-500" />,
        action: () => { onNavigate('chit', g.id); onClose(); },
      }));

    const matchedProperties = childProperties
      .filter(p => p.unitNumber.toLowerCase().includes(q) || (p.parentPropertyName && p.parentPropertyName.toLowerCase().includes(q)))
      .slice(0, 3)
      .map(p => ({
        type: 'Rental Property',
        title: p.unitNumber,
        subtitle: `${p.parentPropertyName || 'Standalone'} • Rent: ${formatCurrency(p.rentAmount)} • ${p.status.toUpperCase()}`,
        icon: <Building className="w-4 h-4 text-blue-500" />,
        action: () => { onNavigate('rental', p.id); onClose(); },
      }));

    const matchedTransactions = centralLedger
      .filter(t => t.id.toLowerCase().includes(q) || t.partyName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .slice(0, 4)
      .map(t => ({
        type: 'Transaction',
        title: `${t.id} — ${t.partyName}`,
        subtitle: `${t.direction.toUpperCase()} ${formatCurrency(t.amount)} via ${t.mode.toUpperCase()} (${t.classification})`,
        icon: <Receipt className="w-4 h-4 text-slate-500" />,
        action: () => { onNavigate('ledger', t.id); onClose(); },
      }));

    return [
      ...matchedProfiles,
      ...matchedLoans,
      ...matchedChit,
      ...matchedProperties,
      ...matchedTransactions,
    ];
  }, [query, profiles, loans, chitGroups, childProperties, centralLedger, onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative mx-auto max-w-2xl transform divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all animate-in zoom-in-95 duration-150">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search profiles, loan IDs, chit groups, units, transactions... (Type 'Rajesh', 'LN', 'Shop', 'CG')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full border-0 bg-transparent pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {query.trim() && (
          <div className="max-h-96 overflow-y-auto p-2">
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={res.action}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        {res.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                            {res.type}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {res.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{res.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center text-sm text-slate-500">
                No matching results found for &ldquo;{query}&rdquo;.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center bg-slate-50 px-4 py-2.5 text-xs text-slate-500 justify-between">
          <div className="flex space-x-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">ESC</kbd> to exit</span>
            <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">↓</kbd> to navigate</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">PBMS Global Search</span>
        </div>
      </div>
    </div>
  );
};
