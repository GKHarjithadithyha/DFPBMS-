import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  FileCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { DocumentItem } from '../../types';

export const DocumentRepositoryPage: React.FC = () => {
  const { documents, uploadDocument, deleteDocument, userRole } = useERP();

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);

  // Form State: Upload
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [entityType, setEntityType] = useState<DocumentItem['entityType']>('profile');
  const [entityId, setEntityId] = useState('');

  // Filter & Search
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter(d => {
    if (filterType !== 'all' && d.entityType !== filterType) return false;
    if (
      searchTerm &&
      !(d.title || d.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(d.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(d.entityId || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadDocument({
      title,
      fileName: fileName.endsWith(`.${fileType}`) ? fileName : `${fileName}.${fileType}`,
      fileType,
      fileSize: `${Math.floor(Math.random() * 800 + 200)} KB`,
      entityType,
      entityId: entityId || 'P000125',
      fileUrl: '#',
    });
    setIsUploadModalOpen(false);
    setTitle('');
    setFileName('');
    setEntityId('');
  };

  const handleDelete = (docId: string) => {
    if (userRole !== 'admin') {
      alert('Permission Denied: Document deletion is restricted to Administrators (Rule BR-010).');
      return;
    }
    if (confirm('Are you sure you want to permanently delete this document?')) {
      deleteDocument(docId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Repository"
        subtitle="Centralized document storage for KYC files, mortgage deeds, signed agreements, and collateral receipts."
        breadcrumbs={[
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Shared Platform Services' },
          { label: 'Documents' },
        ]}
        actions={
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={documents.length.toString()}
          subtitle="Indexed secure digital records"
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="KYC & Identity Files"
          value={documents.filter(d => d.entityType === 'profile').length.toString()}
          subtitle="Aadhaar, PAN & Voter cards"
          icon={FileCheck}
          variant="success"
        />
        <StatCard
          title="Loan Mortgage Deeds"
          value={documents.filter(d => d.entityType === 'loan').length.toString()}
          subtitle="Signed legal security docs"
          icon={FileCode}
          variant="warning"
        />
        <StatCard
          title="RBAC Security Rule"
          value={userRole === 'admin' ? 'Admin Access' : 'Employee Access'}
          subtitle={userRole === 'admin' ? 'Full delete & upload privilege' : 'Upload only (Deletion restricted)'}
          icon={ShieldCheck}
          variant="default"
        />
      </div>

      {/* Repository Explorer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Filter Entity:</span>
            {(['all', 'profile', 'loan', 'property', 'chit_member', 'expense'] as const).map(et => (
              <button
                key={et}
                onClick={() => setFilterType(et)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterType === et
                    ? 'bg-slate-900 text-white dark:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {et.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search file name, title..."
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Documents Table */}
        <DataTable
          data={filteredDocs}
          keyField="id"
          columns={[
            {
              header: 'Document Title',
              accessor: 'title',
              sortable: true,
              render: (_, row) => (
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 uppercase font-mono">
                    {row.fileType}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {row.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {row.fileName} • {row.fileSize}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              header: 'Entity Linked',
              accessor: 'entityType',
              sortable: true,
              render: (_, row) => (
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {row.entityType}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 ml-2">
                    {row.entityId}
                  </span>
                </div>
              ),
            },
            {
              header: 'Uploaded On',
              accessor: 'uploadedAt',
              sortable: true,
              render: (_, row) => (
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {formatDate(row.uploadedAt)}
                </span>
              ),
            },
            {
              header: 'Uploaded By',
              accessor: 'uploadedBy',
              render: (_, row) => (
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {row.uploadedBy}
                </span>
              ),
            },
            {
              header: 'Actions',
              accessor: 'id',
              render: (_, row) => (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setViewingDoc(row)}
                    title="View Document"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => alert(`Simulated downloading ${row.fileName}`)}
                    title="Download File"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {userRole === 'admin' ? (
                    <button
                      onClick={() => handleDelete(row.id)}
                      title="Delete Document (Admin Only)"
                      className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 text-slate-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      title="Admin-only action (BR-010)"
                      className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 opacity-40" />
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL: UPLOAD DOCUMENT */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document into Repository"
        subtitle="Attach legal, KYC, or payment files to any PBMS entity."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Document Display Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Borrower Aadhaar Card Verified"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                File Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. aadhaar_front.pdf"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Format
              </label>
              <select
                value={fileType}
                onChange={e => setFileType(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="pdf">PDF Document</option>
                <option value="jpg">JPEG Image</option>
                <option value="png">PNG Image</option>
                <option value="docx">Word Document</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Entity Association *
              </label>
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value as DocumentItem['entityType'])}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="profile">Customer Profile (KYC)</option>
                <option value="loan">Loan Mortgage / Agreement</option>
                <option value="property">Real Estate Property Deed</option>
                <option value="chit_member">Chit Subscription Passbook</option>
                <option value="expense">Expense Voucher / Tax Invoice</option>
                <option value="general">General PBMS Asset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Entity ID / Reference # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. P000125 or LN-2026-001"
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Upload & Index
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW DOCUMENT PREVIEW */}
      <Modal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.title || 'Document Viewer'}
        subtitle={`${viewingDoc?.fileName} (${viewingDoc?.fileSize})`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <FileText className="w-12 h-12 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {viewingDoc?.title}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Encrypted BLOB Storage • SHA-256 Verified
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Linked to {viewingDoc?.entityType.toUpperCase()} Ref #{viewingDoc?.entityId}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => setViewingDoc(null)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
