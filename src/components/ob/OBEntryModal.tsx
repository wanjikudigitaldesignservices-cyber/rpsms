import { useState, useEffect } from 'react';
import { 
  FilePlus, 
  X, 
  CheckCircle2, 
  Lock, 
  Hash, 
  Calendar, 
  User, 
  Phone, 
  ShieldAlert, 
  Keyboard
} from 'lucide-react';
import type { OBCategory, OBEntry, Officer } from '@/types';
import { 
  formatOBNumber, 
  calculateOBEntryHash, 
  computeBlindIndexHash 
} from '@/lib/crypto';

interface OBEntryModalProps {
  activeOfficer: Officer;
  nextSeqNumber: number;
  previousEntryHash: string;
  onClose: () => void;
  onSubmitEntry: (newEntry: OBEntry) => void;
}

const CATEGORIES: { id: OBCategory; label: string; shortcut: string; color: string }[] = [
  { id: 'CRIMINAL', label: 'Criminal Offense', shortcut: 'Alt+1', color: 'border-red-600/50 text-red-400 bg-red-950/20' },
  { id: 'TRAFFIC', label: 'Traffic Incident', shortcut: 'Alt+2', color: 'border-amber-600/50 text-amber-400 bg-amber-950/20' },
  { id: 'INCIDENT', label: 'General Incident', shortcut: 'Alt+3', color: 'border-blue-600/50 text-blue-400 bg-blue-950/20' },
  { id: 'REPORT', label: 'Public Report', shortcut: 'Alt+4', color: 'border-purple-600/50 text-purple-400 bg-purple-950/20' },
  { id: 'DIRECTIVE', label: 'Station Directive', shortcut: 'Alt+5', color: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/20' },
  { id: 'PUBLIC_COMPLAINT', label: 'Public Complaint', shortcut: 'Alt+6', color: 'border-rose-600/50 text-rose-400 bg-rose-950/20' },
  { id: 'LOST_PROPERTY', label: 'Lost Property', shortcut: 'Alt+7', color: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/20' },
  { id: 'OTHER', label: 'Administrative / Other', shortcut: 'Alt+8', color: 'border-slate-600/50 text-slate-400 bg-slate-900/50' },
];

export function OBEntryModal({
  activeOfficer,
  nextSeqNumber,
  previousEntryHash,
  onClose,
  onSubmitEntry,
}: OBEntryModalProps) {
  const [category, setCategory] = useState<OBCategory>('CRIMINAL');
  const [subject, setSubject] = useState('');
  const [narrative, setNarrative] = useState('');
  const [reportingName, setReportingName] = useState('');
  const [reportingPhone, setReportingPhone] = useState('');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [liveHash, setLiveHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedOBNumber = formatOBNumber(nextSeqNumber);

  // Compute live hash as officer types
  useEffect(() => {
    let isCancelled = false;
    calculateOBEntryHash({
      stationCode: 'RPS-001',
      obNumber: formattedOBNumber,
      seqNumber: nextSeqNumber,
      incidentDate,
      category,
      subject: subject || 'PENDING_INPUT',
      narrative: narrative || 'PENDING_INPUT',
      recordedByServiceNo: activeOfficer.service_number,
      previousEntryHash,
    }).then((hash) => {
      if (!isCancelled) setLiveHash(hash);
    });

    return () => {
      isCancelled = true;
    };
  }, [category, subject, narrative, incidentDate, formattedOBNumber, nextSeqNumber, activeOfficer.service_number, previousEntryHash]);

  // Global Keyboard shortcuts inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const formEl = document.getElementById('ob-entry-form') as HTMLFormElement;
        formEl?.requestSubmit();
      }

      // Alt+1 through Alt+8 for category
      if (e.altKey && !isNaN(Number(e.key))) {
        const index = Number(e.key) - 1;
        if (CATEGORIES[index]) {
          e.preventDefault();
          setCategory(CATEGORIES[index].id);
        }
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a concise subject header.');
      return;
    }
    if (!narrative.trim()) {
      setError('Detailed occurrence narrative is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate blind index hash for reporting person's phone (Kenya Data Protection Act compliance)
      let phoneHash: string | undefined = undefined;
      if (reportingPhone.trim()) {
        phoneHash = await computeBlindIndexHash(reportingPhone);
      }

      const finalHash = await calculateOBEntryHash({
        stationCode: 'RPS-001',
        obNumber: formattedOBNumber,
        seqNumber: nextSeqNumber,
        incidentDate,
        category,
        subject,
        narrative,
        recordedByServiceNo: activeOfficer.service_number,
        previousEntryHash,
      });

      const newOB: OBEntry = {
        id: crypto.randomUUID(),
        station_id: activeOfficer.station_id,
        ob_number: formattedOBNumber,
        seq_number: nextSeqNumber,
        incident_date: incidentDate,
        entry_timestamp: new Date().toISOString(),
        category,
        subject,
        narrative,
        recorded_by: activeOfficer.id,
        recorded_by_name: activeOfficer.full_name,
        recorded_by_service_no: activeOfficer.service_number,
        reporting_person_name: reportingName.trim() || undefined,
        reporting_person_phone: reportingPhone.trim() || undefined,
        reporting_person_phone_hash: phoneHash,
        previous_entry_hash: previousEntryHash,
        entry_hash: finalHash,
        status: category === 'CRIMINAL' ? 'OPEN' : 'CLOSED',
        is_amended: false,
        created_at: new Date().toISOString(),
      };

      onSubmitEntry(newOB);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to cryptographically chain and record OB entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <FilePlus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Record Occurrence Book Entry</h2>
                <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
                  OB No: {formattedOBNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Station: Rockport (RPS-001)</span>
                <span>•</span>
                <span>Seq #{nextSeqNumber}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <Lock className="h-3 w-3" /> Chained to prev block
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <Keyboard className="h-3.5 w-3.5 text-amber-400" />
              <span>Ctrl+Enter to save</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form id="ob-entry-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selector with Keyboard Shortcuts */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Occurrence Category <span className="text-slate-500 font-normal">(Use hotkeys Alt+1 to Alt+8)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500 font-bold'
                        : `${cat.color} hover:border-slate-600 opacity-80 hover:opacity-100`
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                      {cat.shortcut}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident Date and Subject Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Incident Date</span>
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span>Subject / Brief Title <span className="text-red-400">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Breaking into Motor Vehicle along Station Road / Stolen Property Recovered"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Reporting Person Info (Optional/Public) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-slate-900/60 p-3.5 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Reporting Person / Officer Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Kamau / PC Brian Kiprono"
                value={reportingName}
                onChange={(e) => setReportingName(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Contact Phone <span className="text-[10px] text-emerald-400 font-mono">(Blind-Index KDPA Protected)</span></span>
              </label>
              <input
                type="text"
                placeholder="+2547XXXXXXXX"
                value={reportingPhone}
                onChange={(e) => setReportingPhone(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Detailed Narrative */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Comprehensive Occurrence Narrative <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="State precise details: time, location, persons involved, vehicle numbers, exhibits recovered, immediate police action taken. Once submitted, this narrative is cryptographically sealed."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden font-mono leading-relaxed"
            />
          </div>

          {/* Real-time Cryptographic Chain Preview */}
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>PREVIOUS BLOCK HASH:</span>
              </span>
              <span className="text-slate-500 truncate max-w-[320px]">{previousEntryHash}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400 border-t border-slate-800/80 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>COMPUTED CURRENT ENTRY HASH:</span>
              </span>
              <span className="text-emerald-300 font-bold truncate max-w-[320px]">
                {liveHash || 'Calculating SHA-256...'}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded bg-red-950/50 border border-red-800/80 p-3 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Recording Officer: <strong className="text-slate-200">{activeOfficer.full_name} ({activeOfficer.service_number})</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-colors disabled:opacity-50 shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Chaining & Sealing...' : 'Seal & Enter in OB'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
