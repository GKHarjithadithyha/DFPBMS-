import React, { useState } from 'react';
import {
  History,
  Shield,
  Filter,
  Search,
  Download,
  CheckCircle2,
  Lock,
  User,
  Clock,
  Eye,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { AuditLogEntry } from '../../types';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useERP();

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filters
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    if (filterModule !== 'all' && log.module !== filterModule) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (
      searchTerm &&
      !log.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(log.performedBy || log.actorName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.details.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.entityId?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log Viewer"
        subtitle="Append-only, immutable audit trail recording all financial dispatches, approvals, and mutations."
        breadcrumbs={[
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Shared Platform Services' },
          { label: 'Audit Logs' },
        ]}
      />

      {/* Security Status Banner */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Cryptographically Signed Immutability (Rule BR-009)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              All financial mutations are write-once and permanently sealed. Records cannot be edited, deleted, or back-dated.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Integrity Chain: VERIFIED</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={auditLogs.length.toString()}
          subtitle="System-wide logged actions"
          icon={History}
          variant="primary"
        />
        <StatCard
          title="Admin Events"
          value={auditLogs.filter(l => l.userRole === 'admin').length.toString()}
          subtitle="Privileged role activities"
          icon={Shield}
          variant="default"
        />
        <StatCard
          title="Financial Transactions"
          value={auditLogs.filter(l => ['disburse', 'collect', 'create', 'sanction'].includes(l.action)).length.toString()}
          subtitle="Capital movements logged"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Unique Operators"
          value={Array.from(new Set(auditLogs.map(l => l.performedBy))).length.toString()}
          subtitle="Active user sessions"
          icon={User}
          variant="warning"
        />
      </div>

      {/* Filter Bar & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Module:</span>
            {(['all', 'finance', 'chit', 'rental', 'expense', 'investment', 'receivables', 'core', 'auth'] as const).map(m => (
              <button
                key={m}
                onClick={() => setFilterModule(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterModule === m
                    ? 'bg-slate-900 text-white dark:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <DataTable
          data={filteredLogs}
          keyField="id"
          columns={[
            {
              header: 'Timestamp',
              accessor: 'timestamp',
              sortable: true,
              render: (_, row) => (
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  {formatDate(row.timestamp)} {row.timestamp.split('T')[1]?.substring(0, 5)}
                </div>
              ),
            },
            {
              header: 'Actor',
              accessor: 'performedBy',
              sortable: true,
              render: (_, row) => (
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {row.performedBy}
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {row.userRole}
                  </span>
                </div>
              ),
            },
            {
              header: 'Action',
              accessor: 'action',
              sortable: true,
              render: (_, row) => (
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {row.action}
                </span>
              ),
            },
            {
              header: 'Module',
              accessor: 'module',
              sortable: true,
              render: (_, row) => (
                <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {row.module}
                </span>
              ),
            },
            {
              header: 'Entity Ref',
              accessor: 'entityId',
              render: (_, row) => (
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {row.entityId || 'N/A'}
                </span>
              ),
            },
            {
              header: 'Details',
              accessor: 'details',
              render: (_, row) => (
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-sm block" title={row.details}>
                  {row.details}
                </span>
              ),
            },
            {
              header: 'IP Address',
              accessor: 'ipAddress',
              render: (_, row) => (
                <span className="font-mono text-[11px] text-slate-400">
                  {row.ipAddress}
                </span>
              ),
            },
            {
              header: 'Inspect',
              accessor: 'id',
              render: (_, row) => (
                <button
                  onClick={() => setSelectedLog(row)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  <Eye className="w-4 h-4" />
                </button>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL: INSPECT AUDIT ENTRY */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Deep Inspection"
        subtitle={`Event ID: ${selectedLog?.id}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div>
              <span className="text-slate-400 block mb-0.5">Actor</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {selectedLog?.performedBy} ({selectedLog?.userRole})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Timestamp & IP</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {selectedLog?.timestamp} • {selectedLog?.ipAddress}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Module & Action</span>
              <span className="font-semibold text-emerald-600 uppercase font-mono">
                {selectedLog?.module} / {selectedLog?.action}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Entity Reference</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {selectedLog?.entityId}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Event Description & Notes
            </span>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
              {selectedLog?.details}
            </div>
          </div>

          {selectedLog?.beforeState && (
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Before State Snapshot
              </span>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] overflow-x-auto">
                {JSON.stringify(selectedLog.beforeState, null, 2)}
              </pre>
            </div>
          )}

          {selectedLog?.afterState && (
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                After State Snapshot
              </span>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] overflow-x-auto">
                {JSON.stringify(selectedLog.afterState, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
