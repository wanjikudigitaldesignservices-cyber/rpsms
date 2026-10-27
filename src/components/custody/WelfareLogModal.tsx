import { useState } from 'react';
import { HeartPulse, X, Plus, Clock, Check } from 'lucide-react';
import type { WelfareLog, CustodyRecord, Officer } from '@/types';

interface WelfareLogModalProps {
  custodyRecord: CustodyRecord;
  welfareLogs: WelfareLog[];
  activeOfficer: Officer;
  onClose: () => void;
  onAddWelfareLog: (newLog: WelfareLog) => void;
}

const LOG_TYPES: { id: WelfareLog['log_type']; label: string; desc: string }[] = [
  { id: 'MEAL', label: 'Nutritional Meal Served', desc: 'Breakfast, lunch, or dinner with clean drinking water' },
  { id: 'MEDICAL_CHECK', label: 'Medical Triage / Doctor Examination', desc: 'Nurse/doctor physical and vital signs evaluation' },
  { id: 'MEDICATION_ADMINISTERED', label: 'Prescribed Medication', desc: 'Supervised administration of detainee medical doses' },
  { id: 'LAWYER_VISIT', label: 'Legal Counsel Consultation', desc: 'Private advocate consultation under Article 49 rights' },
  { id: 'PHYSICAL_INSPECTION', label: 'Routine Cell Inspection', desc: 'Physical check of cell condition and detainee well-being' },
  { id: 'COURT_PREPARATION', label: 'Court Production Prep', desc: 'Preparation and hygiene check prior to court escort' },
];

export function WelfareLogModal({
  custodyRecord,
  welfareLogs,
  activeOfficer,
  onClose,
  onAddWelfareLog,
}: WelfareLogModalProps) {
  const [logType, setLogType] = useState<WelfareLog['log_type']>('MEAL');
  const [details, setDetails] = useState('');
  const [externalParty, setExternalParty] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const logsForRecord = welfareLogs.filter(
    (w) => w.custody_record_id === custodyRecord.id
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    const newLog: WelfareLog = {
      id: crypto.randomUUID(),
      custody_record_id: custodyRecord.id,
      log_type: logType,
      details: details.trim(),
      conducted_by_service_no: activeOfficer.service_number,
      external_party_name: externalParty.trim() || undefined,
      logged_at: new Date().toISOString(),
    };

    onAddWelfareLog(newLog);
    setDetails('');
    setExternalParty('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-400">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Detainee Welfare & Medical Log</span>
                <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-emerald-400 px-2 py-0.5 rounded">
                  {logsForRecord.length} Entries Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detainee: <strong className="text-slate-200">{custodyRecord.person.full_name}</strong> • Cell: {custodyRecord.cell_number}
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

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Mandatory human rights compliance tracking for meals, medication, health, and legal visits.
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 text-xs transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{isAdding ? 'Cancel' : 'Log Welfare Event'}</span>
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Type</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as any)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {LOG_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  External Professional / Advocate Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Omondi (MOH) / Advocate Charles Komen"
                  value={externalParty}
                  onChange={(e) => setExternalParty(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Observation Details & Notes <span className="text-red-400">*</span></label>
              <textarea
                required
                rows={3}
                placeholder="State specific items provided, medical observations made, or nature of counsel consultation."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder-slate-500 font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
              >
                <Check className="h-4 w-4" />
                <span>Record Welfare Entry</span>
              </button>
            </div>
          </form>
        )}

        {/* Welfare Log Feed */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800">
          {logsForRecord.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No welfare events logged yet. Record meals, medication, or medical triage checks above.
            </div>
          ) : (
            logsForRecord.map((log) => (
              <div key={log.id} className="p-3.5 space-y-1.5 hover:bg-slate-900/40">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded text-[11px]">
                      {log.log_type.replace('_', ' ')}
                    </span>
                    {log.external_party_name && (
                      <span className="text-slate-300 text-[11px]">
                        With: <strong className="text-white">{log.external_party_name}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.logged_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {log.details}
                </p>

                <div className="text-[10px] font-mono text-slate-500">
                  Conducted by Officer: <span className="text-amber-400">{log.conducted_by_service_no}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Close Welfare Log
          </button>
        </div>
      </div>
    </div>
  );
}
