import { useState } from 'react';
import { Briefcase, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { OBEntry, CaseRecord, Officer } from '@/types';

interface CreateCaseModalProps {
  obEntries: OBEntry[];
  activeOfficer: Officer;
  nextCaseSeq: number;
  onClose: () => void;
  onCreateCase: (newCase: CaseRecord) => void;
}

const CRIME_CATEGORIES = [
  { id: 'BURGLARY_AND_HOUSEBREAKING', label: 'Burglary & Housebreaking', section: 'Section 304 Penal Code' },
  { id: 'ROBBERY_WITH_VIOLENCE', label: 'Robbery with Violence (Capital)', section: 'Section 296(2) Penal Code' },
  { id: 'THEFT_FROM_PERSON', label: 'Theft / Stealing', section: 'Section 275 Penal Code' },
  { id: 'TRAFFIC_OFFENSE', label: 'Dangerous Driving & Traffic Violation', section: 'Section 47 Traffic Act' },
  { id: 'ASSAULT_OCCASIONING_GRIEVOUS_HARM', label: 'Assault / Grievous Harm', section: 'Section 234 Penal Code' },
  { id: 'NARCOTICS_POSSESSION', label: 'Narcotics & Psychotropic Substances', section: 'Section 3 Narcotics Act' },
  { id: 'ECONOMIC_CRIME_AND_FRAUD', label: 'Fraud / Obtaining by False Pretences', section: 'Section 313 Penal Code' },
  { id: 'CYBERCRIME_AND_ELECTRONIC_FRAUD', label: 'Cyber Harassment & Financial Fraud', section: 'Section 14 CMCA Act 2018' },
  { id: 'ARSON', label: 'Arson / Wilful Property Destruction', section: 'Section 332 Penal Code' },
  { id: 'OTHER_PENAL_OFFENSE', label: 'Other Statutory Offense', section: 'Penal Code of Kenya' },
];

export function CreateCaseModal({
  obEntries,
  activeOfficer,
  nextCaseSeq,
  onClose,
  onCreateCase,
}: CreateCaseModalProps) {
  const [selectedOBId, setSelectedOBId] = useState(obEntries[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState(CRIME_CATEGORIES[0].id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const year = new Date().getFullYear();
  const formattedCaseNumber = `RPS-001/CR/${year}/${nextCaseSeq.toString().padStart(4, '0')}`;
  const categoryMeta = CRIME_CATEGORIES.find((c) => c.id === selectedCategory)!;
  const selectedOB = obEntries.find((o) => o.id === selectedOBId) || obEntries[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Case title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Investigation summary is required.');
      return;
    }

    const newCase: CaseRecord = {
      id: crypto.randomUUID(),
      station_id: activeOfficer.station_id,
      ob_entry_id: selectedOB.id,
      ob_number: selectedOB.ob_number,
      case_number: formattedCaseNumber,
      crime_category: selectedCategory,
      penal_code_section: categoryMeta.section,
      title: title.trim(),
      description: description.trim(),
      status: 'NEW',
      assignment_method: 'RANDOM_FAIR',
      created_at: new Date().toISOString(),
      evidence_count: 0,
      notes_count: 0,
    };

    onCreateCase(newCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Open Formal Police Case File</h2>
                <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                  {formattedCaseNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rockport Police Station (RPS-001) • Criminal Investigation Department (CID)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Originating Occurrence Book (OB) Entry Reference <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedOBId}
              onChange={(e) => {
                setSelectedOBId(e.target.value);
                const found = obEntries.find((o) => o.id === e.target.value);
                if (found && !title) setTitle(found.subject);
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 font-mono"
            >
              {obEntries.map((ob) => (
                <option key={ob.id} value={ob.id}>
                  OB {ob.ob_number} • [{ob.category}] {ob.subject}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Statutory Crime Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
              >
                {CRIME_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Penal Code Statutory Section
              </label>
              <input
                type="text"
                readOnly
                value={categoryMeta.section}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-amber-400 font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Case Title / Charge Header <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Investigation into Commercial Burglary at Rockport Depot"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preliminary Investigative Scope & Summary <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Outline the initial investigative actions, evidence seized, suspect statements, and direction for the assigned Investigating Officer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden font-mono"
            />
          </div>

          {error && (
            <div className="rounded bg-red-950/50 border border-red-800 p-3 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              Opening Officer: <strong className="text-slate-200">{activeOfficer.full_name} ({activeOfficer.service_number})</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-colors shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Create & Register Case File</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
