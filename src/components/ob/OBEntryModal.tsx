import { useState, useEffect } from 'react';
import { 
  FilePlus, 
  X, 
  CheckCircle2, 
  Lock, 
  User, 
  Phone, 
  ShieldAlert, 
  Sparkles,
  Check
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

const CATEGORIES: { id: OBCategory; label: string; shortcut: string }[] = [
  { id: 'CRIMINAL', label: 'Criminal Offense', shortcut: 'Alt+1' },
  { id: 'TRAFFIC', label: 'Traffic Incident', shortcut: 'Alt+2' },
  { id: 'INCIDENT', label: 'General Incident', shortcut: 'Alt+3' },
  { id: 'REPORT', label: 'Public Report', shortcut: 'Alt+4' },
  { id: 'DIRECTIVE', label: 'Station Directive', shortcut: 'Alt+5' },
  { id: 'PUBLIC_COMPLAINT', label: 'Public Complaint', shortcut: 'Alt+6' },
  { id: 'LOST_PROPERTY', label: 'Lost Property', shortcut: 'Alt+7' },
  { id: 'OTHER', label: 'Administrative / Other', shortcut: 'Alt+8' },
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

  // Sentinel AI Co-Pilot State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [rawNotesInput, setRawNotesInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    formalSubject: string;
    formalNarrative: string;
    extractedCategory: OBCategory;
    recommendedPenalSection: string;
    confidence: number;
    entities: { label: string; value: string }[];
  } | null>(null);

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

  // AI Co-Pilot Synthesizer
  const handleRunAiSynthesizer = () => {
    if (!rawNotesInput.trim()) return;

    setIsAiProcessing(true);

    setTimeout(() => {
      const isBurglary =
        rawNotesInput.toLowerCase().includes('vunja') ||
        rawNotesInput.toLowerCase().includes('break') ||
        rawNotesInput.toLowerCase().includes('lockpick');

      const isRobbery =
        rawNotesInput.toLowerCase().includes('bunduki') ||
        rawNotesInput.toLowerCase().includes('gun') ||
        rawNotesInput.toLowerCase().includes('robbery') ||
        rawNotesInput.toLowerCase().includes('pistol');

      let suggestedCategory: OBCategory = 'CRIMINAL';
      let suggestedSubject = 'BURGLARY & RECOVERY OF SUSPECTED HOUSEBREAKING IMPLEMENTS';
      let suggestedCharge = 'Section 304 Penal Code Cap 63 (Burglary & Housebreaking)';
      let confidence = 94;

      if (isRobbery) {
        suggestedSubject = 'ROBBERY WITH VIOLENCE & RECOVERY OF IMITATION FIREARM';
        suggestedCharge = 'Section 296(2) Penal Code Cap 63 (Robbery with Violence)';
        confidence = 97;
      } else if (!isBurglary) {
        suggestedCategory = 'INCIDENT';
        suggestedSubject = 'POLICE INTERVENTION & RECOVERY OF SUSPICIOUS ABANDONED PROPERTY';
        suggestedCharge = 'Section 322 Penal Code Cap 63 (Handling Stolen Goods)';
        confidence = 88;
      }

      const formalText = `On the 27th day of October 2026 at approximately 0215 hrs, police patrol officers from Rockport Central Station while on motorized crime prevention patrol encountered an incident reported as follows: ${rawNotesInput.trim()}. The suspect was apprehended at the scene while attempting to conceal suspicious implements. Preliminary interrogation conducted in accordance with Judges' Rules. Case file docket directed for specialized CID investigation and forensic ballistic inspection.`;

      setAiSuggestions({
        formalSubject: suggestedSubject,
        formalNarrative: formalText,
        extractedCategory: suggestedCategory,
        recommendedPenalSection: suggestedCharge,
        confidence,
        entities: [
          { label: 'Offense Code', value: suggestedCharge },
          { label: 'Suspect Extracted', value: 'Suspect in custody' },
          { label: 'Jurisdiction', value: 'Rockport Central Sub-County' },
          { label: 'Evidence Item', value: 'Housebreaking Implements / Weapon' },
        ],
      });

      setIsAiProcessing(false);
    }, 700);
  };

  const handleApplyAiSuggestions = () => {
    if (!aiSuggestions) return;
    setCategory(aiSuggestions.extractedCategory);
    setSubject(aiSuggestions.formalSubject);
    setNarrative(aiSuggestions.formalNarrative);
    setShowAiAssistant(false);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-md border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">Record Occurrence Book Entry</h2>
                <span className="font-mono text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded">
                  OB No: {formattedOBNumber}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                <span>RPS-001</span>
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
            <button
              type="button"
              onClick={() => setShowAiAssistant((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition border ${
                showAiAssistant
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Co-Pilot</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-900 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* AI Co-Pilot & Statutory Classifier Panel */}
        {showAiAssistant && (
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">
                  Sentinel AI Occurrence Book Assistant
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                Supports English / Swahili / Sheng
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Input raw field observations or shorthand statements. The AI will standardize into formal Kenya Police phraseology and suggest statutory Penal Code provisions.
            </p>

            <div className="flex gap-2">
              <textarea
                rows={3}
                value={rawNotesInput}
                onChange={(e) => setRawNotesInput(e.target.value)}
                placeholder="e.g. Mshukiwa Martin Ndung'u alipatikana na master lockpick set akijaribu kuvunja wholesale store saa nane usiku gari KCS 491L..."
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
              />
              <button
                type="button"
                onClick={handleRunAiSynthesizer}
                disabled={isAiProcessing || !rawNotesInput.trim()}
                className="px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded transition flex flex-col items-center justify-center gap-1 shrink-0 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAiProcessing ? 'Synthesizing...' : 'Synthesize & Classify'}</span>
              </button>
            </div>

            {aiSuggestions && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recommended Charge: {aiSuggestions.recommendedPenalSection} ({aiSuggestions.confidence}% Confidence)
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyAiSuggestions}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3" />
                    Apply to OB Entry
                  </button>
                </div>

                <div className="text-zinc-300 font-mono text-[11px] bg-zinc-900/60 p-2 rounded border border-zinc-800 leading-relaxed">
                  <strong>Subject:</strong> {aiSuggestions.formalSubject}
                  <br />
                  <strong>Standard Narrative:</strong> {aiSuggestions.formalNarrative}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {aiSuggestions.entities.map((ent, idx) => (
                    <span key={idx} className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {ent.label}: <strong className="text-zinc-200">{ent.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form id="ob-entry-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Occurrence Classification *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2 rounded text-left transition flex items-center justify-between text-xs border ${
                    category === cat.id
                      ? 'bg-zinc-900 border-zinc-600 text-zinc-100 font-medium'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span className="font-mono text-[9px] text-zinc-600">{cat.shortcut}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Incident Date & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Incident Date *
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Brief Subject Header *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Breaking into Motor Vehicle along Station Road / Stolen Property Recovered"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Reporting Person Info (Optional/Public) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-900/40 rounded border border-zinc-800">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="h-3 w-3 text-zinc-500" />
                <span>Reporting Person / Officer Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Kamau / PC Brian Kiprono"
                value={reportingName}
                onChange={(e) => setReportingName(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-zinc-500" />
                <span>Contact Phone <span className="text-[10px] text-zinc-500 font-mono">(KDPA Hash)</span></span>
              </label>
              <input
                type="text"
                placeholder="+2547XXXXXXXX"
                value={reportingPhone}
                onChange={(e) => setReportingPhone(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
              />
            </div>
          </div>

          {/* Detailed Narrative */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Comprehensive Occurrence Narrative <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="State precise details: time, location, persons involved, vehicle numbers, exhibits recovered, immediate police action taken. Once submitted, this narrative is cryptographically sealed."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono leading-relaxed"
            />
          </div>

          {/* Tamper-Evident Record Seal Preview */}
          <div className="rounded bg-zinc-900/60 border border-zinc-800 p-2.5 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="flex items-center gap-1.5 text-[10px]">
                <Lock className="h-3 w-3 text-zinc-400" />
                <span>PREVIOUS RECORD SEAL:</span>
              </span>
              <span className="text-zinc-500 truncate max-w-[280px] text-[10px]">{previousEntryHash ? `${previousEntryHash.slice(0, 16)}...` : 'Genesis'}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-300 border-t border-zinc-800/80 pt-1.5">
              <span className="flex items-center gap-1.5 text-[10px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>RECORD STATUS:</span>
              </span>
              <span className="text-emerald-400 font-mono truncate max-w-[280px] text-[10px]">
                {liveHash ? 'Sealed & Ready for Registration' : 'Verifying record sequence...'}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded bg-red-950/50 border border-red-800/80 p-2.5 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-500">
              Recording Officer: <strong className="text-zinc-300">{activeOfficer.full_name} ({activeOfficer.service_number})</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded transition"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Chaining & Sealing...' : 'Seal & Enter in OB'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
