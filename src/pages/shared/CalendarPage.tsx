import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users2,
  Building,
  TrendingUp,
  Scale,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  module: 'finance' | 'chit' | 'rental' | 'investment' | 'receivables' | 'payables';
  amount?: number;
  partyName?: string;
  status: string;
}

export const CalendarPage: React.FC = () => {
  const {
    loans,
    chitGroups,
    rentalAgreements,
    investments,
    receivables,
    payables,
    profiles,
  } = useERP();

  // Current Month State
  const [currentDate, setCurrentDate] = useState(new Date('2026-04-01'));
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-10');

  // Aggregate Cross-Module Events
  const events: CalendarEvent[] = [];

  // 1. Finance: Active loans next EMI dates
  loans.filter(l => l.status === 'active' && l.nextDueDate).forEach(l => {
    const p = profiles.find(pr => pr.id === l.borrowerProfileId);
    events.push({
      id: `loan-${l.id}`,
      title: `Loan EMI Due: ${l.id}`,
      date: l.nextDueDate!,
      module: 'finance',
      amount: l.monthlyEmi || 15000,
      partyName: p?.fullName || l.borrowerProfileId,
      status: 'pending',
    });
  });

  // 2. Chit Fund: Next Auction dates
  chitGroups.filter(g => g.status === 'in_progress').forEach(g => {
    events.push({
      id: `chit-${g.id}`,
      title: `Chit Auction: ${g.groupName}`,
      date: g.nextAuctionDate || '2026-05-01',
      module: 'chit',
      amount: g.poolSize,
      partyName: `${g.maxMembers} Subscribers`,
      status: 'scheduled',
    });
  });

  // 3. Rental: Rent dues & lease expiries
  rentalAgreements.filter(a => a.status === 'active').forEach(a => {
    const p = profiles.find(pr => pr.id === a.tenantProfileId);
    events.push({
      id: `rent-${a.id}`,
      title: `Rent Due: ${a.childPropertyId}`,
      date: '2026-04-05', // 5th of current month
      module: 'rental',
      amount: (a.monthlyRent || a.rentAmount || 0) + (a.monthlyMaintenance || a.maintenanceAmount || 0),
      partyName: p?.fullName,
      status: 'pending',
    });

    if (a.endDate) {
      events.push({
        id: `lease-exp-${a.id}`,
        title: `Lease Expiry: ${a.childPropertyId}`,
        date: a.endDate,
        module: 'rental',
        partyName: p?.fullName,
        status: 'notice',
      });
    }
  });

  // 4. Investments: Maturities
  investments.filter(i => i.status === 'active' && i.maturityDate).forEach(i => {
    events.push({
      id: `inv-${i.id}`,
      title: `Maturity: ${i.investmentName}`,
      date: i.maturityDate!,
      module: 'investment',
      amount: i.expectedMaturityAmount || i.principalAmount,
      partyName: i.institutionName,
      status: 'maturing',
    });
  });

  // 5. Receivables dues
  receivables.filter(r => r.status !== 'paid').forEach(r => {
    events.push({
      id: `rec-${r.id}`,
      title: `Receivable Due: ${r.partyName}`,
      date: r.dueDate,
      module: 'receivables',
      amount: r.balanceOutstanding,
      partyName: r.partyName,
      status: 'due',
    });
  });

  // 6. Payables dues
  payables.filter(p => p.status !== 'paid').forEach(p => {
    events.push({
      id: `pay-${p.id}`,
      title: `Payable Due: ${p.partyName}`,
      date: p.dueDate,
      module: 'payables',
      amount: p.balanceOutstanding,
      partyName: p.partyName,
      status: 'due',
    });
  });

  // Filtered Events
  const filteredEvents = events.filter(e => {
    if (selectedModule !== 'all' && e.module !== selectedModule) return false;
    return true;
  });

  // Days in month calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Module color map
  const getModuleBadge = (mod: CalendarEvent['module']) => {
    switch (mod) {
      case 'finance':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'chit':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'rental':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'investment':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'receivables':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'payables':
        return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  const selectedDateEvents = filteredEvents.filter(e => e.date === selectedDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared Calendar & Schedules"
        subtitle="Cross-module schedule of loan EMIs, chit auctions, rental collections, and investment maturities."
        breadcrumbs={[
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Shared Platform Services' },
          { label: 'Calendar' },
        ]}
      />

      {/* Module Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2">Filter Modules:</span>
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'finance', label: 'Lending EMIs' },
            { id: 'chit', label: 'Chit Auctions' },
            { id: 'rental', label: 'Rental Dues' },
            { id: 'investment', label: 'Maturities' },
            { id: 'receivables', label: 'Receivables' },
            { id: 'payables', label: 'Payables' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedModule === m.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-900 px-2 font-mono">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid & Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Month Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-500 text-xs py-2.5 border-b border-slate-100 uppercase tracking-wider font-mono">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-xl border border-dashed border-slate-100" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter(e => e.date === dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-24 p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Tiny Event Pills */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className={`text-[9px] truncate px-1 py-0.5 rounded font-medium border ${getModuleBadge(ev.module)}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-mono pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider block">
              Schedule Details
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {formatDate(selectedDate)}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {selectedDateEvents.length} event(s) scheduled for this date
            </span>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-300" />
              No financial due dates or auctions on this date.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDateEvents.map(ev => (
                <div
                  key={ev.id}
                  className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border font-mono ${getModuleBadge(ev.module)}`}>
                      {ev.module}
                    </span>
                    {ev.amount && (
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {formatCurrency(ev.amount)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {ev.title}
                  </h4>
                  {ev.partyName && (
                    <p className="text-[11px] text-slate-500">
                      Party: <span className="font-semibold text-slate-800">{ev.partyName}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
