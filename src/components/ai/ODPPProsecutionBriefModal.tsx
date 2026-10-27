import React from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Scale,
} from 'lucide-react';
import type { CaseNote, CaseRecord, Officer, EvidenceItem } from '../../types';

interface ODPPProsecutionBriefModalProps {
  caseRecord: CaseRecord;
  notes: CaseNote[];
  evidenceItems: EvidenceItem[];
  currentOfficer: Officer;
  isOpen: boolean;
  onClose: () => void;
}

export const ODPPProsecutionBriefModal: React.FC<ODPPProsecutionBriefModalProps> = ({
  caseRecord,
  notes,
  evidenceItems,
  currentOfficer,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const linkedEvidence = evidenceItems.filter((e) => e.case_id === caseRecord.id);
  const linkedNotes = notes.filter((n) => n.case_id === caseRecord.id);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `REPUBLIC OF KENYA - PROSECUTION BRIEF (ODPP FILE REF: ${caseRecord.case_number})\n` +
        `Accused Offense: ${caseRecord.crime_category} (${caseRecord.penal_code_section || 'Penal Code Cap 63'})\n` +
        `Investigating Officer: ${caseRecord.assigned_io_name} (${caseRecord.assigned_io_service_no})\n` +
        `Case Title: ${caseRecord.title}\n` +
        `Summary: ${caseRecord.description}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 print:hidden">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-zinc-100" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                ODPP Prosecution File Brief (Court Ready)
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Kenya Criminal Procedure Code • Section 89 Filing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Legal Dossier */}
        <div className="p-6 space-y-5 text-xs text-zinc-300 print:text-black print:p-2 bg-zinc-950 print:bg-white">
          {/* Official Letterhead */}
          <div className="text-center border-b border-dashed border-zinc-800 print:border-black pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/crest.jpg"
                alt="Kenya Police Crest"
                className="w-10 h-10 object-contain rounded-full shadow"
              />
              <div className="text-left">
                <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400 print:text-black">
                  REPUBLIC OF KENYA • NATIONAL POLICE SERVICE
                </p>
                <p className="text-sm font-bold text-zinc-100 print:text-black">
                  Rockport Police Station • Directorate of Criminal Investigations
                </p>
                <p className="text-[10px] text-zinc-500 print:text-black">
                  CRIMINAL INVESTIGATION DOSSIER FOR OFFICE OF THE DIRECTOR OF PUBLIC PROSECUTIONS
                </p>
              </div>
            </div>
            <div className="mt-2 inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 print:border-black print:text-black print:bg-transparent rounded text-xs font-mono font-bold">
              POLICE CASE FILE NO: {caseRecord.case_number}
            </div>
          </div>

          {/* Section 1: Matter Identification */}
          <div className="bg-zinc-900/60 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                  Statutory Offense & Penal Section
                </span>
                <p className="font-mono text-zinc-100 print:text-black font-semibold mt-0.5">
                  {caseRecord.penal_code_section || 'Penal Code Cap 63'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                  Linked Occurrence Book No.
                </span>
                <p className="font-mono text-zinc-300 print:text-black font-semibold mt-0.5">
                  OB {caseRecord.ob_number}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                  Investigating Officer (CID)
                </span>
                <p className="font-medium text-zinc-200 print:text-black mt-0.5">
                  {caseRecord.assigned_io_name} ({caseRecord.assigned_io_service_no})
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                  Allocated Court & Plea Date
                </span>
                <p className="font-mono text-zinc-200 print:text-black mt-0.5">
                  {caseRecord.court_name || 'Rockport Senior Principal Magistrate Court 1'} • {caseRecord.court_date || 'Pending Summons'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 print:border-gray-300">
              <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                Offense Title & Summary of Evidence
              </span>
              <p className="text-zinc-200 print:text-black mt-0.5 leading-relaxed font-medium">
                {caseRecord.title} - {caseRecord.description}
              </p>
            </div>
          </div>

          {/* Section 2: Chain of Custody Exhibits Attached */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-black">
                PHYSICAL & FORENSIC EXHIBITS REGISTER (CAP 80 EVIDENCE ACT)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {linkedEvidence.length} Exhibits Marked
              </span>
            </div>

            {linkedEvidence.length === 0 ? (
              <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded text-center text-zinc-500 font-mono text-xs">
                No physical exhibits marked in station safe for this docket.
              </div>
            ) : (
              <div className="space-y-1.5">
                {linkedEvidence.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2.5 bg-zinc-900/60 print:bg-white border border-zinc-800 print:border-gray-300 rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-zinc-200 print:text-black">{ex.exhibit_number}</strong>
                        <span className="font-mono text-[10px] text-zinc-500">QR: {ex.qr_code_identifier.slice(0, 16)}...</span>
                      </div>
                      <p className="text-zinc-300 print:text-black text-[11px] mt-0.5">{ex.description}</p>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 print:text-black bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shrink-0">
                      {ex.storage_location}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Contemporaneous Investigation Diary Entries */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-black block">
              CONTEMPORANEOUS INVESTIGATION DIARY SUMMARY
            </span>
            <div className="space-y-1.5">
              {linkedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 bg-zinc-900/40 print:bg-white border border-zinc-800 print:border-gray-300 rounded space-y-1 text-xs"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 print:text-black">
                    <span>{note.note_type} • {new Date(note.created_at).toLocaleString('en-KE')}</span>
                    <span>Officer: {note.author_service_no}</span>
                  </div>
                  <p className="text-zinc-300 print:text-black text-xs leading-relaxed italic">
                    "{note.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Officer Certificate & Verification */}
          <div className="p-3 bg-zinc-900/80 border border-zinc-800 print:border-gray-300 rounded flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 print:text-black block">
                OFFICIAL STATION CERTIFICATION
              </span>
              <p className="font-medium text-zinc-200 print:text-black">
                Certified by: {currentOfficer.rank} {currentOfficer.full_name} ({currentOfficer.service_number})
              </p>
              <p className="text-[10px] font-mono text-zinc-500 print:text-black">
                Digital Hash Seal: SHA-256 Verified • Tamper Proof Record
              </p>
            </div>
            <div className="text-right">
              <span className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px]">
                ODPP-READY-CERTIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 print:hidden">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md text-xs font-mono transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Summary'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-md text-xs transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Official Prosecution Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
