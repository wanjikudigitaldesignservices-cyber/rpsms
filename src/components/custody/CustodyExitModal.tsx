import { useState } from 'react';
import { 
  LogOut, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert 
} from 'lucide-react';
import type { CustodyRecord, ExitReason, Officer } from '@/types';

interface CustodyExitModalProps {
  custodyRecord: CustodyRecord;
  activeOfficer: Officer;
  onClose: () => void;
  onSubmitExit: (params: {
    custodyRecordId: string;
    exitReason: ExitReason;
    notes: string;
    requiresFourEyes: boolean;
  }) => void;
}

const EXIT_REASONS: { id: ExitReason; label: string; desc: string; requiresFourEyes: boolean }[] = [
  { 
    id: 'POLICE_BAIL', 
    label: 'Police Cash Bail / Bond', 
    desc: 'Released on reasonable station bail pending summons/court',
    requiresFourEyes: false
  },
  { 
    id: 'CHARGED_TO_COURT', 
    label: 'Charged to Court', 
    desc: 'Produced before Magistrate/High Court within statutory 24h',
    requiresFourEyes: false
  },
  { 
    id: 'RELEASED_WITHOUT_CHARGE', 
    label: 'Released Without Charge', 
    desc: 'Insufficient evidence / false accusation. STRICT ANTI-CORRUPTION RULE: Requires OCS Four-Eyes Dual Sign-Off.',
    requiresFourEyes: true
  },
  { 
    id: 'TRANSFERRED', 
    label: 'Transferred to Remand / Other Station', 
    desc: 'Escorted under custody to designated custodial facility',
    requiresFourEyes: false
  },
  { 
    id: 'HOSPITAL', 
    label: 'Emergency Medical Hospitalization', 
    desc: 'Transferred to medical facility under armed police escort',
    requiresFourEyes: false
  },
];

export function CustodyExitModal({
  custodyRecord,
  activeOfficer,
  onClose,
  onSubmitExit,
}: CustodyExitModalProps) {
  const [exitReason, setExitReason] = useState<ExitReason>('POLICE_BAIL');
  const [notes, setNotes] = useState('');
  const [propertyReturnedConfirmed, setPropertyReturnedConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedReasonMeta = EXIT_REASONS.find((r) => r.id === exitReason)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Detailed exit justification and destination details are required.');
      return;
    }

    if (!propertyReturnedConfirmed) {
      setError('Detainee property return must be acknowledged or accounted for.');
      return;
    }

    onSubmitExit({
      custodyRecordId: custodyRecord.id,
      exitReason,
      notes: notes.trim(),
      requiresFourEyes: selectedReasonMeta.requiresFourEyes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <LogOut className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Authorize Custody Discharge & Exit</span>
              </h2>
              <p className="text-xs text-slate-400">
                Detainee: <strong className="text-slate-200">{custodyRecord.person.full_name}</strong> • Cell: {custodyRecord.cell_number} • OB: {custodyRecord.ob_number}
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

        {/* Four-Eyes Notice for Released Without Charge */}
        {selectedReasonMeta.requiresFourEyes && (
          <div className="rounded-lg bg-amber-950/40 border border-amber-800/80 p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <strong>FOUR-EYES ANTI-CORRUPTION RULE:</strong> Releasing an arrested detainee without formal charge requires written justification and <strong>OCS / Deputy OCS Four-Eyes Authorization</strong> to prevent bribery and unlawful releases. A pending approval request will be generated.
            </div>
          </div>
        )}

        {/* Exit Reason Selection */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Statutory Custody Exit Grounds <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {EXIT_REASONS.map((r) => {
                const isSelected = exitReason === r.id;
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exitReason"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setExitReason(r.id)}
                      className="mt-1 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>{r.label}</span>
                        {r.requiresFourEyes && (
                          <span className="text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded">
                            Four-Eyes Required
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{r.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notes and Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Specific Exit Details & Authorization Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Police Bail KES 10,000 paid via cashless Paybill. Detainee directed to report on 30/10/2026 at 0900 hrs. / Court file No. CR/449/2026."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden font-mono"
            />
          </div>

          {/* Property Return Confirmation */}
          <div className="rounded-lg bg-slate-900 p-3.5 border border-slate-800 space-y-2">
            <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={propertyReturnedConfirmed}
                onChange={(e) => setPropertyReturnedConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
              />
              <div>
                <strong>Property Handover Verification:</strong> All held personal property items ({custodyRecord.property_items_count} items) verified and returned to detainee with prisoner receipt signature captured, or flagged for exhibit custody.
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded bg-red-950/50 border border-red-800 p-3 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Authorizing Officer: <strong className="text-slate-200">{activeOfficer.full_name} ({activeOfficer.service_number})</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-colors shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Discharge</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
