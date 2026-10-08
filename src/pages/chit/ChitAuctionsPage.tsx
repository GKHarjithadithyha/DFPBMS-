import React from 'react';
import { useERP } from '../../context/ERPContext';
import { PageHeader } from '../../components/common/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Award } from 'lucide-react';

interface ChitAuctionsPageProps {
  onNavigate?: (tabId: string, subTabId?: string) => void;
}

export const ChitAuctionsPage: React.FC<ChitAuctionsPageProps> = () => {
  const { auctionRecords, getProfileById, chitGroups } = useERP();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auction & Dividend Distribution Log"
        subtitle="Completed monthly auction records, bid discount amounts, foreman commission, and subscriber dividend credits."
        breadcrumbs={[{ label: 'Business Modules' }, { label: 'Chit Fund' }, { label: 'Auction & Prize Records' }]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Auction Biddings Log</h3>
            <p className="text-xs text-slate-500">Live auction records from Central Transaction Engine</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            {auctionRecords.length} Auctions Recorded
          </span>
        </div>

        {auctionRecords.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Auction Records Found</p>
            <p className="text-[11px] text-slate-400 mt-1">Monthly auctions will appear here as they are conducted.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3">Auction ID</th>
                  <th className="p-3">Chit Group</th>
                  <th className="p-3">Month #</th>
                  <th className="p-3">Prize Winner</th>
                  <th className="p-3">Winning Bid Prize</th>
                  <th className="p-3">Dividend / Member</th>
                  <th className="p-3">Auction Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {auctionRecords.map(a => {
                  const winner = getProfileById(a.winnerProfileId);
                  const group = chitGroups.find(g => g.id === a.chitGroupId);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">{a.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{group?.groupName || a.chitGroupId}</td>
                      <td className="p-3 font-mono font-bold">Month #{a.auctionMonth}</td>
                      <td className="p-3 font-semibold text-emerald-800">{winner?.name || 'Winner Subscriber'}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(a.bidAmount || a.prizeAmount || 0)}</td>
                      <td className="p-3 font-mono text-purple-700">{formatCurrency(a.dividendPerMember || 0)}</td>
                      <td className="p-3 text-slate-500">{formatDate(a.auctionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
