import React, { useState } from 'react';
import { X, Eye, Lock } from 'lucide-react';
import type { Officer } from '../../types';

interface PIIRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetField: string;
  targetSubject: string;
  currentOfficer: Officer;
  onConfirmReveal: (reason: string, notes: string) => void;
}

const REASONS = [
  { id: 'CRIMINAL_INVESTIGATION', label: 'Active Criminal Investigation (Cap 75)' },
  { id: 'COURT_SUBPOENA', label: 'Court Subpoena / Judicial Order' },
  { id: 'ARREST_VERIFICATION', label: 'Custody Book-In Verification' },
  { id: 'OCS_SUPERVISORY_AUDIT', label: 'OCS Supervisory Compliance Audit' },
  { id: 'WITNESS_PROTECTION', label: 'Witness Protection Agency Referral' },
];

export const PIIRevealModal: React.FC<PIIRevealModalProps> = ({
  isOpen,
  onClose,
  targetField,
  targetSubject,
  currentOfficer,
  onConfirmReveal,
}) => {
  const [selectedReason, setSelectedReason] = useState(REASONS[0].id);
  const [justificationNotes, setJustificationNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationNotes.trim() || justificationNotes.length < 5) {
      setError('A concise official justification is mandatory for unmasking protected PII.');
      return;
    }

    onConfirmReveal(selectedReason, justificationNotes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-md p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">
              <Lock className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Justification Required to Unmask PII
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                KDPA 2019 Sec 41 • Immutable Audit Enforcement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Callout */}
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-md text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Protected Data:</span>
            <span className="font-mono text-zinc-300 font-semibold">{targetField}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Subject:</span>
            <span className="text-zinc-200">{targetSubject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Requesting Officer:</span>
            <span className="font-mono text-zinc-400">
              {currentOfficer.service_number} ({currentOfficer.role_name})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2 bg-red-950/60 border border-red-900/60 text-red-300 rounded text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Statutory Access Purpose *
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              {REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Specific Justification Notes *
            </label>
            <textarea
              rows={3}
              value={justificationNotes}
              onChange={(e) => setJustificationNotes(e.target.value)}
              placeholder="e.g. Cross-referencing against recovered mobile serial in robbery docket RPS-001/CR/2026/0014"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-md shadow transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Log & Reveal PII
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
