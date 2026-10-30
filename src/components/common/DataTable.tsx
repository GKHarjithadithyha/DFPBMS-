import React, { useState, useMemo, ReactNode } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Inbox, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  render?: (value: any, item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  actions?: ReactNode;
  filterComponent?: ReactNode;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  exportFileName?: string;
  /** Adds a Print button that prints the currently filtered rows. */
  printable?: boolean;
  /** Tighter rows/headers for dense registers (opt-in; default look is unchanged). */
  compact?: boolean;
  printTitle?: string;
  keyExtractor?: (item: T) => string;
  keyField?: string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFilter,
  actions,
  filterComponent,
  onRowClick,
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your search terms or filter criteria.',
  exportFileName = 'export',
  printable = false,
  compact = false,
  printTitle,
  keyExtractor,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    if (searchFilter) {
      return data.filter(item => searchFilter(item, searchQuery));
    }
    const q = searchQuery.toLowerCase();
    return data.filter(item => {
      return Object.values(item as any).some(val =>
        String(val).toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery, searchFilter]);

  // Sort
  const sortedData = useMemo(() => {
    if (sortColumnIndex === null) return filteredData;
    const col = columns[sortColumnIndex];
    if (!col || !col.accessor) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[col.accessor!];
      const bVal = (b as any)[col.accessor!];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const compare = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [filteredData, sortColumnIndex, sortDirection, columns]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (index: number) => {
    if (!columns[index].sortable) return;
    if (sortColumnIndex === index) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumnIndex(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumnIndex(index);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const headers = columns.map(c => `"${c.header}"`).join(',');
    const rows = sortedData.map(item => {
      return columns.map(col => {
        let val = '';
        if (col.accessor) val = String((item as any)[col.accessor] || '');
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFileName}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const head = columns.map(c => `<th>${esc(c.header)}</th>`).join('');
    const body = sortedData
      .map(item => `<tr>${columns.map(c => `<td>${c.accessor ? esc((item as any)[c.accessor]) : ''}</td>`).join('')}</tr>`)
      .join('');
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    w.document.write(`<html><head><title>${esc(printTitle || exportFileName)}</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:16px;color:#0f172a}
      h2{font-size:15px;margin:0 0 4px}p{margin:0 0 12px;color:#64748b}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px}</style></head><body>
      <h2>${esc(printTitle || exportFileName)}</h2><p>Printed ${new Date().toLocaleString('en-GB')} • ${sortedData.length} records</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center flex-1 space-x-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans"
            />
          </div>
          {filterComponent}
        </div>

        <div className="flex items-center space-x-2">
          {actions}
          {printable && (
            <button
              type="button"
              onClick={handlePrint}
              title="Print"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Export CSV"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className={`${compact ? 'py-2 px-2.5 whitespace-nowrap' : 'py-3 px-4'} ${col.sortable ? 'cursor-pointer hover:bg-slate-100/60' : ''} ${col.className || ''}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {col.sortable && sortColumnIndex === idx && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-emerald-600" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIdx) => {
                const rowKey = keyExtractor ? keyExtractor(item) : String(item.id || rowIdx);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const val = col.accessor ? (item as any)[col.accessor] : undefined;
                      return (
                        <td key={colIdx} className={`${compact ? 'py-2 px-2.5 text-xs align-middle' : 'py-3 px-4'} text-slate-700 ${col.className || ''}`}>
                          {col.render
                            ? col.render(val ?? item, item)
                            : col.accessor
                            ? String((item as any)[col.accessor] ?? '—')
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
        <div className="flex items-center space-x-2">
          <span>Showing {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-slate-200 rounded px-2 py-0.5 bg-white text-slate-700"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-0.5 font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
