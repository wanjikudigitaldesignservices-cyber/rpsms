import { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, CheckCircle2, Lock } from 'lucide-react';
import type { OBEntry, Officer } from '@/types';
import { calculateOBEntryHash, formatOBNumber } from '@/lib/crypto';

interface OBAmendmentModalProps {
  entry: OBEntry;
  activeOfficer: Officer;
  nextSeqNumber: number;
  onClose: () => void;
  onSubmitAmendment: (params: {
    obEntryId: string;
    amendmentObNumber: string;
    reason: string;
    amendmentNarrative: string;
    entryHash: string;
  }) => void;
}

export function OBAmendmentModal({
  entry,
  activeOfficer,
  nextSeqNumber,
  onClose,
  onSubmitAmendment,
}: OBAmendmentModalProps) {
  const [reason, setReason] = useState('');
  const [amendmentNarrative, setAmendmentNarrative] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amendmentObNumber = `${formatOBNumber(nextSeqNumber)} (AMEND to ${entry.ob_number})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory formal justification is required under Kenya Police regulations.');
      return;
    }
    if (!amendmentNarrative.trim()) {
      setError('Please provide the specific amendment narrative.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entryHash = await calculateOBEntryHash({
        stationCode: 'RPS-001',
        obNumber: amendmentObNumber,
        seqNumber: nextSeqNumber,
        incidentDate: new Date().toISOString().split('T')[0],
        category: entry.category,
        subject: `AMENDMENT: ${entry.subject}`,
        narrative: `${reason} | ${amendmentNarrative}`,
        recordedByServiceNo: activeOfficer.service_number,
        previousEntryHash: entry.entry_hash,
      });

      onSubmitAmendment({
        obEntryId: entry.id,
        amendmentObNumber,
        reason,
        amendmentNarrative,
        entryHash,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit amendment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-amber-600/40 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Formal OB Amendment Notice</span>
                <span className="text-xs font-mono font-normal bg-amber-950/70 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                  Dual-Control Required
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kenya Police Act & Anti-Corruption Regulations • Append-Only Ledger Safeguard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Anti-Corruption Notice */}
        <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-3.5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong>IMMUTABILITY SAFEGUARD:</strong> Original Occurrence Book entries are permanently immutable and cannot be deleted or modified in-place. This action files an append-only amendment linked cryptographically to OB No. <strong className="font-mono text-white">{entry.ob_number}</strong>. It will be routed to the <strong>OCS or Deputy OCS</strong> for mandatory Four-Eyes authorization.
          </div>
        </div>

        {/* Original Entry Summary (Read-Only) */}
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-mono">ORIGINAL OB ENTRY: <strong className="text-amber-400">{entry.ob_number}</strong></span>
            <span className="text-slate-400">Recorded: {new Date(entry.entry_timestamp).toLocaleString()}</span>
          </div>
          <div className="text-sm font-semibold text-slate-200">{entry.subject}</div>
          <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded border border-slate-800 font-mono leading-relaxed">
            {entry.narrative}
          </p>
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>Verification Seal:</span>
            <span className="text-slate-400 truncate">{entry.entry_hash.slice(0, 16)}...</span>
          </div>
        </div>

        {/* Amendment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Amendment Reference
            </label>
            <input
              type="text"
              readOnly
              value={amendmentObNumber}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-amber-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Statutory Justification / Reason for Amendment <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Additional witness statement presented, clarification on suspect alias, vehicle plate correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Amendment Narrative Details <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="State the additional or corrected facts in detail. Will be permanently appended to the digital occurrence register."
              value={amendmentNarrative}
              onChange={(e) => setAmendmentNarrative(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden font-mono"
            />
          </div>

          <div className="rounded bg-slate-900 p-3 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Proposing Officer: <strong className="text-slate-200">{activeOfficer.full_name} ({activeOfficer.service_number})</strong></span>
            <span>Target Approver: <strong className="text-amber-400">Station OCS / Deputy OCS</strong></span>
          </div>

          {error && (
            <div className="rounded bg-red-950/50 border border-red-800/80 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Chaining & Submitting...' : 'Submit Amendment Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
