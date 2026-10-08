import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileText,
  Search,
  CheckCircle2,
  PieChart,
  DollarSign,
  Building2,
  Users,
  CreditCard,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';

type ReportCategory = 'finance' | 'chit' | 'rental' | 'expense' | 'investment' | 'rp' | 'cross_module';

export const ReportsPage: React.FC = () => {
  const {
    cashBook,
    bankBook,
    centralLedger,
    loans,
    chitGroups,
    chitMembers,
    auctionRecords,
    parentProperties,
    childProperties,
    rentalAgreements,
    rentCollections,
    expenses,
    expenseCategories,
    investments,
    receivables,
    payables,
    getProfileById,
    profiles,
  } = useERP();

  // Category & Selected Report State
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('finance');
  const [selectedReportName, setSelectedReportName] = useState<string>('Loan Creation Report');

  // Filters
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [streamFilter, setStreamFilter] = useState<'all' | 'accounted' | 'non_accounted'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Report catalogues
  const reportCatalogues: Record<ReportCategory, { categoryLabel: string; reportNames: string[] }> = {
    finance: {
      categoryLabel: 'Finance (Lending) Reports',
      reportNames: [
        'Loan Creation Report',
        'Loan Closure Report',
        'Loan Outstanding Report',
        'NPA Report',
        'Interest Collection Report',
        'Principal Collection Report',
        'Top-Up Loan Report',
        'Customer Ledger Report',
        'Collection Summary',
        'Cash Collection Report',
        'Bank Collection Report',
        'Active Loan Report',
        'Closed Loan Report',
        'Loan Maturity Report',
      ],
    },
    chit: {
      categoryLabel: 'Chit Fund Reports',
      reportNames: [
        'Chit Collection Report',
        'Member Ledger Report',
        'Outstanding/Due Report',
        'Penalty Report',
        'Prize/Auction Winner Report',
        'Scheme and Group Performance Report',
        'Member Payment History and Prize History',
        'Scheme Closure and Settlement Report',
      ],
    },
    rental: {
      categoryLabel: 'Rental Management Reports',
      reportNames: [
        'Occupancy Report',
        'Rent Collection Report',
        'Overdue Report',
        'Maintenance Report',
        'Lease Expiry Report',
        'Parent-Property Summary / Child-Property Detail Report',
        'Tenant Ledger Report',
      ],
    },
    expense: {
      categoryLabel: 'Corporate Expense Reports',
      reportNames: [
        'Expense Summary Report',
        'Category-wise Expense Report',
        'Monthly Expense Report',
        'Cash and Bank Expense Reports',
      ],
    },
    investment: {
      categoryLabel: 'Investment Portfolio Reports',
      reportNames: [
        'Active Investments Report',
        'Recurring Investment Due Report',
        'Upcoming Maturity Report',
        'Closed Investments Report',
        'Investment History & Summary',
      ],
    },
    rp: {
      categoryLabel: 'Receivables & Payables Reports',
      reportNames: [
        'Receivables Report with Ageing',
        'Payables Report with Ageing',
        'Party-wise Outstanding Report',
      ],
    },
    cross_module: {
      categoryLabel: 'Cross-Module Financial Reports',
      reportNames: ['Money Flow Report'],
    },
  };

  const handleCategoryChange = (cat: ReportCategory) => {
    setActiveCategory(cat);
    setSelectedReportName(reportCatalogues[cat].reportNames[0]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvRows: string[] = [];
    let fileName = `PBMS_${selectedReportName.replace(/\s+/g, '_')}_Report.csv`;

    csvRows.push(`"Report Title: ${selectedReportName}"`);
    csvRows.push(`"Generated Date: ${new Date().toLocaleDateString('en-GB')}"`);
    csvRows.push('');

    if (activeCategory === 'finance') {
      csvRows.push('"Loan ID","Borrower Name","Principal (₹)","Pending Principal (₹)","Official Interest Rate","Non-Accounted Interest Rate","Status"');
      loans.forEach(l => {
        const borrower = getProfileById(l.profileId)?.name || 'Borrower';
        csvRows.push(`"${l.id}","${borrower}",${l.principalAmount},${l.pendingPrincipal},"${l.officialInterestRate}%","${l.nonAccountedInterestRate}%","${l.status}"`);
      });
    } else if (activeCategory === 'chit') {
      csvRows.push('"Group ID","Winner / Member","Month #","Bid Prize (₹)","Foreman Commission (₹)","Dividend/Member (₹)"');
      auctionRecords.forEach(a => {
        const winner = getProfileById(a.winnerProfileId)?.name || 'Member';
        csvRows.push(`"${a.groupId}","${winner}",${a.monthNumber},${a.bidAmount},${a.foremanCommission},${a.dividendPerMember}`);
      });
    } else if (activeCategory === 'rental') {
      csvRows.push('"Agreement ID","Child Property Unit","Tenant Name","Monthly Rent (₹)","Maintenance (₹)","Start Date","End Date","Status"');
      rentalAgreements.forEach(a => {
        const tenant = getProfileById(a.tenantProfileId)?.name || 'Tenant';
        const unit = childProperties.find(c => c.id === a.childPropertyId)?.unitNumber || a.childPropertyId;
        csvRows.push(`"${a.id}","${unit}","${tenant}",${a.rentAmount},${a.maintenanceAmount},"${a.startDate}","${a.endDate}","${a.status}"`);
      });
    } else if (activeCategory === 'expense') {
      csvRows.push('"Voucher ID","Date","Category","Payee","Classification","Payment Mode","Amount (₹)"');
      expenses.forEach(e => {
        const cat = expenseCategories.find(c => c.id === e.categoryId)?.name || 'General';
        csvRows.push(`"${e.id}","${e.date}","${cat}","${e.payeeName || 'Vendor'}","${e.classification || e.stream || ''}","${e.paymentMode}",${e.amount}`);
      });
    } else if (activeCategory === 'investment') {
      csvRows.push('"Investment Name","Company/Org","Type","Principal Amount (₹)","Expected Return (₹)","Status"');
      investments.forEach(i => {
        csvRows.push(`"${i.name}","${i.companyOrOrg || ''}","${i.investmentType}",${i.amount},${i.expectedMaturityAmount || i.amount},"${i.status}"`);
      });
    } else if (activeCategory === 'rp') {
      csvRows.push('"Item ID","Party Name","Originating Module","Amount (₹)","Outstanding Balance (₹)","Due Date","Status"');
      receivables.forEach(r => {
        csvRows.push(`"${r.id}","${r.partyName}","${r.sourceModule || 'General'}",${r.amount},${r.balanceOutstanding ?? r.amount},"${r.dueDate}","${r.status}"`);
      });
    } else {
      csvRows.push('"Transaction ID","Date","Source Module","Party Name","Direction","Amount (₹)","Description"');
      centralLedger.forEach(cl => {
        csvRows.push(`"${cl.id}","${cl.date}","${cl.sourceModule}","${cl.partyName}","${cl.direction}",${cl.amount},"${cl.description}"`);
      });
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Financial Reports Suite"
        subtitle="Read-only authoritative financial reports catalogue across Finance, Chit Fund, Rental, Expense, Investment, and Money Flow."
        breadcrumbs={[{ label: 'Shared Services' }, { label: 'Reports Catalogue' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.csv)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        }
      />

      {/* Module Category Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-wrap gap-2">
        {(Object.keys(reportCatalogues) as ReportCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {reportCatalogues[cat].categoryLabel}
          </button>
        ))}
      </div>

      {/* Specific Report Name Selector & Filter Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Select Specific PBMS Report:
            </label>
            <select
              value={selectedReportName}
              onChange={e => setSelectedReportName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
            >
              {reportCatalogues[activeCategory].reportNames.map(rName => (
                <option key={rName} value={rName}>{rName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* REPORT CONTENT DISPLAY CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
              READ-ONLY REPORT
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">{selectedReportName}</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Filter Period: {startDate} ──► {endDate}
          </span>
        </div>

        {/* Dynamic Read-Only Report Data Tables */}
        <div className="overflow-x-auto">
          {activeCategory === 'finance' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Loan ID</th>
                  <th className="p-3">Borrower Profile</th>
                  <th className="p-3">Principal Amount</th>
                  <th className="p-3">Pending Principal</th>
                  <th className="p-3">Official Rate</th>
                  <th className="p-3">Non-Accounted Rate</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {loans.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{l.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{getProfileById(l.profileId)?.name || 'Borrower'}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{formatCurrency(l.principalAmount)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(l.pendingPrincipal)}</td>
                    <td className="p-3 font-mono text-blue-700 font-bold">{l.officialInterestRate}%</td>
                    <td className="p-3 font-mono text-purple-700 font-bold">{l.nonAccountedInterestRate}%</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeCategory === 'chit' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Group ID</th>
                  <th className="p-3">Prize / Auction Winner</th>
                  <th className="p-3">Cycle Month</th>
                  <th className="p-3">Bid Prize Amount</th>
                  <th className="p-3">Foreman Commission</th>
                  <th className="p-3">Dividend / Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {auctionRecords.map((a, idx) => (
                  <tr key={a.id || idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{a.groupId}</td>
                    <td className="p-3 font-semibold text-slate-900">{getProfileById(a.winnerProfileId)?.name || 'Member'}</td>
                    <td className="p-3 font-mono">Month #{a.monthNumber}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">{formatCurrency(a.bidAmount)}</td>
                    <td className="p-3 font-mono text-slate-700">{formatCurrency(a.foremanCommission)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(a.dividendPerMember)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeCategory === 'rental' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Lease Agreement</th>
                  <th className="p-3">Child Unit Number</th>
                  <th className="p-3">Tenant Profile</th>
                  <th className="p-3">Monthly Rent</th>
                  <th className="p-3">Maintenance Fee</th>
                  <th className="p-3">Lease Period</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {rentalAgreements.map(a => {
                  const tenant = getProfileById(a.tenantProfileId)?.name || 'Tenant';
                  const unit = childProperties.find(c => c.id === a.childPropertyId)?.unitNumber || a.childPropertyId;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{a.id}</td>
                      <td className="p-3 font-bold text-purple-800">{unit}</td>
                      <td className="p-3 font-semibold text-slate-900">{tenant}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(a.rentAmount)}</td>
                      <td className="p-3 font-mono text-slate-700">{formatCurrency(a.maintenanceAmount)}</td>
                      <td className="p-3 font-mono text-slate-600">{formatDate(a.startDate)} ──► {formatDate(a.endDate)}</td>
                      <td className="p-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeCategory === 'expense' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category Head</th>
                  <th className="p-3">Payee Vendor</th>
                  <th className="p-3">Stream</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Voucher Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {expenses.map((e, idx) => {
                  const cat = expenseCategories.find(c => c.id === e.categoryId)?.name || 'General';

                  return (
                    <tr key={e.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{e.invoiceNumber || e.id}</td>
                      <td className="p-3 font-mono text-slate-600">{e.date}</td>
                      <td className="p-3 font-semibold text-slate-900">{cat}</td>
                      <td className="p-3 text-slate-800">{e.payeeName || 'Vendor'}</td>
                      <td className="p-3 uppercase font-mono text-[10px] font-bold text-purple-800">{e.classification || e.stream}</td>
                      <td className="p-3 uppercase font-mono">{e.paymentMode}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{formatCurrency(e.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeCategory === 'investment' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Investment Asset</th>
                  <th className="p-3">Institution / Org</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Invested Principal</th>
                  <th className="p-3">Expected Maturity Return</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {investments.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{i.name}</td>
                    <td className="p-3 text-slate-800">{i.companyOrOrg || i.institutionName}</td>
                    <td className="p-3 uppercase font-mono text-[10px] font-bold text-purple-800">{i.investmentType}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(i.amount)}</td>
                    <td className="p-3 font-mono font-bold text-blue-900">{formatCurrency(i.expectedMaturityAmount || i.amount)}</td>
                    <td className="p-3"><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeCategory === 'rp' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Item ID</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Originating Module</th>
                  <th className="p-3">Original Amount</th>
                  <th className="p-3">Outstanding Balance</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {receivables.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.partyName}</td>
                    <td className="p-3 uppercase font-mono text-[10px] font-bold text-emerald-800">{r.sourceModule || 'General'}</td>
                    <td className="p-3 font-mono text-slate-800">{formatCurrency(r.amount)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(r.balanceOutstanding ?? r.amount)}</td>
                    <td className="p-3 font-mono text-slate-600">{formatDate(r.dueDate)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeCategory === 'cross_module' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Source Module</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Description Particulars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {centralLedger.map(cl => (
                  <tr key={cl.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-900">{cl.id}</td>
                    <td className="p-3 font-mono text-slate-600">{cl.date}</td>
                    <td className="p-3 uppercase font-mono text-[10px] font-bold text-purple-800">{cl.sourceModule}</td>
                    <td className="p-3 font-semibold text-slate-900">{cl.partyName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${cl.direction === 'receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {cl.direction}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(cl.amount)}</td>
                    <td className="p-3 text-slate-600">{cl.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
