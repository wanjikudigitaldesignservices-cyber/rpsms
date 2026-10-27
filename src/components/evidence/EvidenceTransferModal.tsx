import React, { useState } from 'react';
import type { EvidenceItem, EvidenceStatus, EvidenceTransfer, Officer } from '../../types';
import { X, Shield, ArrowRightLeft, AlertCircle } from 'lucide-react';

interface EvidenceTransferModalProps {
  evidence: EvidenceItem;
  activeOfficers: Officer[];
  currentOfficer: Officer;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transfer: EvidenceTransfer, updatedStatus: EvidenceStatus, newLocation?: string) => void;
}

export const EvidenceTransferModal: React.FC<EvidenceTransferModalProps> = ({
  evidence,
  activeOfficers,
  currentOfficer: _currentOfficer,
  isOpen,
  onClose,
  onSubmit,
}) => {
  // Available recipients: exclude current custodian
  const candidateRecipients = activeOfficers.filter(
    (o) => o.id !== evidence.current_custodian_id
  );

  const [toOfficerId, setToOfficerId] = useState<string>(candidateRecipients[0]?.id || '');
  const [transferReason, setTransferReason] = useState('');
  const [newStatus, setNewStatus] = useState<EvidenceStatus>('IN_ANALYSIS');
  const [newLocation, setNewLocation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferReason.trim()) {
      setError('Please provide an official justification for this chain of custody handover.');
      return;
    }
    if (!acknowledged) {
      setError('Custody handover requires formal acknowledgment of physical item verification.');
      return;
    }

    const recipient = activeOfficers.find((o) => o.id === toOfficerId);
    if (!recipient) {
      setError('Please select a valid recipient officer.');
      return;
    }

    const transfer: EvidenceTransfer = {
      id: `trans-${Date.now()}`,
      evidence_id: evidence.id,
      transferred_from_id: evidence.current_custodian_id,
      transferred_from_name: evidence.current_custodian_name,
      transferred_from_service_no: evidence.current_custodian_service_no,
      transferred_to_id: recipient.id,
      transferred_to_name: `${recipient.rank} ${recipient.full_name}`,
      transferred_to_service_no: recipient.service_number,
      transfer_reason: transferReason.trim(),
      transfer_timestamp: new Date().toISOString(),
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    };

    onSubmit(transfer, newStatus, newLocation.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Transfer Chain of Custody
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Exhibit Info Banner */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-amber-300">{evidence.exhibit_number}</span>
              <span className="text-slate-400 font-mono">{evidence.case_number}</span>
            </div>
            <p className="text-slate-300 font-medium line-clamp-1">{evidence.description}</p>
            <div className="text-[11px] text-slate-500 pt-1">
              Current Custodian: <strong className="text-slate-300">{evidence.current_custodian_name} ({evidence.current_custodian_service_no})</strong>
            </div>
          </div>

          {/* Recipient Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Receiving Officer (New Custodian) *
            </label>
            <select
              value={toOfficerId}
              onChange={(e) => setToOfficerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {candidateRecipients.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rank} {o.full_name} ({o.service_number}) - {o.role_name}
                </option>
              ))}
            </select>
          </div>

          {/* New Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                New Exhibit Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as EvidenceStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="IN_ANALYSIS">IN_ANALYSIS (Forensics/Lab)</option>
                <option value="IN_COURT">IN_COURT (Court Exhibition)</option>
                <option value="IN_STORE">IN_STORE (Exhibit Store)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                New Location / Transit
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. DCI Forensic Lab Room 4"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Official Transfer Purpose & Instructions *
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Handover for forensic ballistic comparison against cartridge cases from OB 12/10/2026."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Dual control verification acknowledgment */}
          <label className="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
            />
            <span className="text-xs text-slate-300 leading-snug">
              <strong className="text-white block mb-0.5">Dual-Signature Custody Acknowledgment</strong>
              I certify that this exhibit is being handed over in accordance with the Kenya Evidence Act (Cap 80), with unbroken seals and verified serial tags.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-lg shadow-amber-900/40 flex items-center gap-2 transition"
            >
              <Shield className="w-4 h-4" />
              Sign & Record Custody Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
