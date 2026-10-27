import { useState } from 'react';
import { FileText, X, Plus, Clock, User, Check, Lock } from 'lucide-react';
import type { CaseRecord, CaseNote, CaseNoteType, Officer } from '@/types';

interface CaseNotesDrawerProps {
  caseRecord: CaseRecord;
  notes: CaseNote[];
  activeOfficer: Officer;
  onClose: () => void;
  onAddNote: (newNote: CaseNote) => void;
}

const NOTE_TYPES: { id: CaseNoteType; label: string; desc: string }[] = [
  { id: 'INVESTIGATION_UPDATE', label: 'Investigation Progress', desc: 'Standard investigative updates and findings' },
  { id: 'INTERVIEW_SUMMARY', label: 'Interrogation / Witness Interview', desc: 'Summary of statements taken from suspects or witnesses' },
  { id: 'SCENE_REPORT', label: 'Crime Scene Examination', desc: 'Physical scene assessment and forensic collection notes' },
  { id: 'DIRECTIVE', label: 'Supervisory Directive', desc: 'Direct instructions from OCS or Supervising IO' },
  { id: 'COURT_UPDATE', label: 'Court Proceedings & Plea', desc: 'Hearing outcome, bail terms set by magistrate, or mention dates' },
];

export function CaseNotesDrawer({
  caseRecord,
  notes,
  activeOfficer,
  onClose,
  onAddNote,
}: CaseNotesDrawerProps) {
  const [noteType, setNoteType] = useState<CaseNoteType>('INVESTIGATION_UPDATE');
  const [content, setContent] = useState('');
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const caseNotes = notes.filter((n) => n.case_id === caseRecord.id);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newNote: CaseNote = {
      id: crypto.randomUUID(),
      case_id: caseRecord.id,
      author_id: activeOfficer.id,
      author_name: activeOfficer.full_name,
      author_service_no: activeOfficer.service_number,
      note_type: noteType,
      content: content.trim(),
      is_privileged: isPrivileged,
      created_at: new Date().toISOString(),
    };

    onAddNote(newNote);
    setContent('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs">
      <div className="h-full w-full max-w-xl bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                  {caseRecord.case_number}
                </span>
                <span className="text-xs font-mono text-slate-400">OB: {caseRecord.ob_number}</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">{caseRecord.title}</h2>
              <p className="text-xs text-slate-400 font-mono">
                Assigned IO: {caseRecord.assigned_io_name || 'Unassigned'} ({caseRecord.assigned_io_service_no || 'N/A'})
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Investigation Diary ({caseNotes.length} Notes)</span>
            </h3>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{isAdding ? 'Cancel' : 'Add Case Note'}</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAdd} className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Note Classification</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {NOTE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Diary Narrative <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record contemporaneous investigation details, witness statements, or crime scene observations..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder-slate-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivileged}
                    onChange={(e) => setIsPrivileged(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                  />
                  <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
                    <Lock className="h-3 w-3" /> Privileged Case Material (IO/OCS Only)
                  </span>
                </label>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Seal Note</span>
                </button>
              </div>
            </form>
          )}

          {/* Notes list */}
          <div className="space-y-3">
            {caseNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-slate-800 bg-slate-900/30">
                No investigation diary entries recorded yet. Add notes to track progress.
              </div>
            ) : (
              caseNotes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-lg border p-3.5 space-y-2 ${
                    note.is_privileged
                      ? 'border-amber-700/60 bg-amber-950/15'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-400 uppercase">
                        {note.note_type.replace('_', ' ')}
                      </span>
                      {note.is_privileged && (
                        <span className="font-mono text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800">
                          PRIVILEGED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>Officer: <strong className="text-slate-300">{note.author_name} ({note.author_service_no})</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Close Diary
          </button>
        </div>
      </div>
    </div>
  );
}
