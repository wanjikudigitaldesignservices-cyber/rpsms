import React, { useState } from 'react';
import type {
  CaseRecord,
  EvidenceItem,
  EvidenceStatus,
  EvidenceTransfer,
  Officer,
} from '../../types';
import {
  Package,
  Search,
  Filter,
  Plus,
  QrCode,
  ArrowRightLeft,
  Trash2,
  History,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { EvidenceQRModal } from './EvidenceQRModal';
import { AddEvidenceModal } from './AddEvidenceModal';
import { EvidenceTransferModal } from './EvidenceTransferModal';

interface EvidenceRegistryProps {
  evidenceItems: EvidenceItem[];
  transfers: EvidenceTransfer[];
  cases: CaseRecord[];
  activeOfficers: Officer[];
  currentOfficer: Officer;
  onAddEvidence: (newEvidence: EvidenceItem) => void;
  onTransferEvidence: (
    transfer: EvidenceTransfer,
    updatedStatus: EvidenceStatus,
    newLocation?: string
  ) => void;
  onRequestDisposal: (evidenceId: string, courtOrderRef: string, reason: string) => void;
}

export const EvidenceRegistry: React.FC<EvidenceRegistryProps> = ({
  evidenceItems,
  transfers,
  cases,
  activeOfficers,
  currentOfficer,
  onAddEvidence,
  onTransferEvidence,
  onRequestDisposal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [qrItem, setQrItem] = useState<EvidenceItem | null>(null);
  const [transferItem, setTransferItem] = useState<EvidenceItem | null>(null);
  const [historyItem, setHistoryItem] = useState<EvidenceItem | null>(null);

  // Disposal Modal state
  const [disposalItem, setDisposalItem] = useState<EvidenceItem | null>(null);
  const [courtOrderRef, setCourtOrderRef] = useState('');
  const [disposalReason, setDisposalReason] = useState('');

  // Filtered evidence items
  const filteredItems = evidenceItems.filter((item) => {
    const matchesSearch =
      item.exhibit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.qr_code_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.current_custodian_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'ALL' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const inStoreCount = evidenceItems.filter((i) => i.status === 'IN_STORE').length;
  const inAnalysisCount = evidenceItems.filter((i) => i.status === 'IN_ANALYSIS').length;
  const inCourtCount = evidenceItems.filter((i) => i.status === 'IN_COURT').length;

  const handleDisposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalItem || !courtOrderRef.trim() || !disposalReason.trim()) return;

    onRequestDisposal(disposalItem.id, courtOrderRef.trim(), disposalReason.trim());
    setDisposalItem(null);
    setCourtOrderRef('');
    setDisposalReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Logged Exhibits
            </p>
            <p className="text-2xl font-black text-white mt-1">
              {evidenceItems.length}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              In Station Safe / Store
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {inStoreCount}
            </p>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
            <MapPin className="w-6 h-6 text-slate-300" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              At Forensics / Analysis
            </p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {inAnalysisCount}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Produced In Court
            </p>
            <p className="text-2xl font-black text-cyan-400 mt-1">
              {inCourtCount}
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <CheckCircle2 className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Log Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exhibit #, case #, custodian, QR..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              <option value="FIREARM">Firearm</option>
              <option value="NARCOTICS">Narcotics</option>
              <option value="DIGITAL">Digital</option>
              <option value="CLOTHING">Clothing</option>
              <option value="DOCUMENT">Document</option>
              <option value="BIOLOGICAL">Biological</option>
              <option value="CURRENCY">Currency</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STORE">In Store</option>
              <option value="IN_ANALYSIS">In Analysis</option>
              <option value="IN_COURT">In Court</option>
              <option value="DISPOSAL_PENDING_APPROVAL">Disposal Pending</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Exhibit
        </button>
      </div>

      {/* Exhibits Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Exhibit Ref & QR</th>
                <th className="px-4 py-3">Linked Case</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description & Storage</th>
                <th className="px-4 py-3">Current Custodian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No exhibit records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Exhibit Ref */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQrItem(item)}
                          className="p-1.5 bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-600 rounded-lg transition"
                          title="View Official QR Tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <div>
                          <p className="font-mono font-bold text-white text-xs">
                            {item.exhibit_number}
                          </p>
                          <span className="font-mono text-[10px] text-slate-500">
                            {item.qr_code_identifier.slice(0, 18)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Linked Case */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-amber-300 bg-amber-950/30 border border-amber-900/50 px-2 py-0.5 rounded">
                        {item.case_number}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-md">
                        {item.category}
                      </span>
                    </td>

                    {/* Description & Storage */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{item.storage_location}</span>
                      </div>
                    </td>

                    {/* Custodian */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-semibold text-white">
                        {item.current_custodian_name}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.current_custodian_service_no}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          item.status === 'IN_STORE'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : item.status === 'IN_ANALYSIS'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : item.status === 'IN_COURT'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                            : item.status === 'DISPOSAL_PENDING_APPROVAL'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryItem(item)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
                          title="View Chain of Custody History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setTransferItem(item)}
                          disabled={item.status === 'DISPOSED'}
                          className="px-2.5 py-1 text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg flex items-center gap-1 transition disabled:opacity-40"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Transfer
                        </button>

                        <button
                          onClick={() => setDisposalItem(item)}
                          disabled={
                            item.status === 'DISPOSAL_PENDING_APPROVAL' ||
                            item.status === 'DISPOSED'
                          }
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 rounded-lg transition disabled:opacity-30"
                          title="Request Exhibit Disposal (Requires Court Order)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custody Chain History Drawer */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Chain of Custody Ledger: {historyItem.exhibit_number}
                </h3>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Exhibit Summary */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                <p className="font-semibold text-slate-200">{historyItem.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Current: <strong>{historyItem.current_custodian_name}</strong></span>
                  <span className="font-mono text-emerald-400">{historyItem.storage_location}</span>
                </div>
              </div>

              {/* Transfers Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Custody Transfer Log (Kenya Evidence Act Compliance)
                </h4>

                {transfers.filter((t) => t.evidence_id === historyItem.id).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">
                    No transfers logged. Item remains with original booking officer.
                  </div>
                ) : (
                  transfers
                    .filter((t) => t.evidence_id === historyItem.id)
                    .map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 relative pl-6"
                      >
                        <div className="absolute left-2.5 top-4 w-2 h-2 rounded-full bg-emerald-400" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400 text-[10px]">
                            Transfer #{idx + 1} • {new Date(t.transfer_timestamp).toLocaleString('en-KE')}
                          </span>
                          <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                            Dual-Acknowledged
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 flex items-center gap-2">
                          <span className="font-semibold text-amber-300">
                            {t.transferred_from_name} ({t.transferred_from_service_no})
                          </span>
                          <span className="text-slate-500">➔</span>
                          <span className="font-semibold text-emerald-300">
                            {t.transferred_to_name} ({t.transferred_to_service_no})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 italic">
                          "{t.transfer_reason}"
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Request Modal (Four-Eyes Enforcement) */}
      {disposalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Exhibit Disposal Request
                </h3>
              </div>
              <button
                onClick={() => setDisposalItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisposalSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-300 rounded-xl text-xs space-y-1">
                <p className="font-bold">MANDATORY FOUR-EYES LEGAL CONTROL:</p>
                <p className="text-[11px] text-red-300/80">
                  Exhibit destruction or forfeiture requires an official Court Order under Section 389A of the Criminal Procedure Code. This request will be submitted to OCS for dual authorization.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Court Order Reference Number *
                </label>
                <input
                  type="text"
                  required
                  value={courtOrderRef}
                  onChange={(e) => setCourtOrderRef(e.target.value)}
                  placeholder="e.g. CR-MISC-ORDER/2026/892"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Destruction / Disposal Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  placeholder="e.g. Court ordered destruction of expired chemical solvent in presence of resident magistrate and public health officer."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisposalItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/30 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Route for OCS Dual-Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrItem && (
        <EvidenceQRModal
          evidence={qrItem}
          isOpen={true}
          onClose={() => setQrItem(null)}
        />
      )}

      {/* Add Evidence Modal */}
      {isAddOpen && (
        <AddEvidenceModal
          cases={cases}
          activeOfficers={activeOfficers}
          currentOfficer={currentOfficer}
          isOpen={true}
          onClose={() => setIsAddOpen(false)}
          onSubmit={onAddEvidence}
        />
      )}

      {/* Transfer Modal */}
      {transferItem && (
        <EvidenceTransferModal
          evidence={transferItem}
          activeOfficers={activeOfficers}
          currentOfficer={currentOfficer}
          isOpen={true}
          onClose={() => setTransferItem(null)}
          onSubmit={onTransferEvidence}
        />
      )}
    </div>
  );
};
