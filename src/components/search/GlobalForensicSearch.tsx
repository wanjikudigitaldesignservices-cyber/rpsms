import { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  FileText, 
  Users, 
  Clock, 
  ShieldCheck, 
  Lock, 
  ArrowRight
} from 'lucide-react';
import type { 
  OBEntry, 
  Person, 
  CustodyRecord, 
  Officer 
} from '@/types';
import { computeBlindIndexHashSync } from '@/lib/crypto';

interface GlobalForensicSearchProps {
  obEntries: OBEntry[];
  persons: Person[];
  custodyRecords: CustodyRecord[];
  officers: Officer[];
  activeOfficer: Officer;
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: 'OB' | 'PERSON' | 'CUSTODY' | 'OFFICER', id: string) => void;
  onLogAuditSearch: (query: string, resultCount: number) => void;
}

export function GlobalForensicSearch({
  obEntries,
  persons,
  custodyRecords,
  officers,
  activeOfficer,
  isOpen,
  onClose,
  onSelectResult,
  onLogAuditSearch,
}: GlobalForensicSearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Ctrl+K to toggle search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // If already open, close; if closed, will be toggled by parent
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  const blindHash = cleanQuery ? computeBlindIndexHashSync(cleanQuery) : '';

  // Match Occurrence Book records
  const matchedOBs = cleanQuery
    ? obEntries.filter(
        (o) =>
          o.ob_number.toLowerCase().includes(cleanQuery) ||
          o.subject.toLowerCase().includes(cleanQuery) ||
          o.narrative.toLowerCase().includes(cleanQuery) ||
          (o.reporting_person_name && o.reporting_person_name.toLowerCase().includes(cleanQuery))
      )
    : [];

  // Match Persons & Detainees (including blind index hash match on National ID / Phone)
  const matchedPersons = cleanQuery
    ? persons.filter(
        (p) =>
          p.full_name.toLowerCase().includes(cleanQuery) ||
          (p.alias && p.alias.toLowerCase().includes(cleanQuery)) ||
          p.identifiers.some((id) =>
            id.id_value_masked.toLowerCase().includes(cleanQuery) ||
            (blindHash && id.id_value_hash.includes(blindHash.substring(0, 16)))
          )
      )
    : [];

  // Match Custody Records
  const matchedCustody = cleanQuery
    ? custodyRecords.filter(
        (c) =>
          c.person.full_name.toLowerCase().includes(cleanQuery) ||
          c.cell_number.toLowerCase().includes(cleanQuery) ||
          c.ob_number.toLowerCase().includes(cleanQuery) ||
          c.arrest_reason.toLowerCase().includes(cleanQuery)
      )
    : [];

  // Match Officers
  const matchedOfficers = cleanQuery
    ? officers.filter(
        (off) =>
          off.full_name.toLowerCase().includes(cleanQuery) ||
          off.service_number.toLowerCase().includes(cleanQuery) ||
          off.rank.toLowerCase().includes(cleanQuery)
      )
    : [];

  const totalResults = matchedOBs.length + matchedPersons.length + matchedCustody.length + matchedOfficers.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanQuery) {
      onLogAuditSearch(cleanQuery, totalResults);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden mt-8">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center border-b border-slate-800 px-4 py-3 bg-slate-900/80">
          <Search className="h-5 w-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Universal Forensic Search by Name, National ID, Phone, OB Number, Cell, or Service No..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 mr-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200"
          >
            ESC
          </button>
        </form>

        {/* Kenya Data Protection Act Notice */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>KDPA Section 41 Compliance: All forensic search queries are logged with officer credentials</span>
          </div>
          <span className="text-amber-400 font-semibold">{totalResults} matches</span>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {!cleanQuery ? (
            <div className="p-8 text-center space-y-2 text-xs text-slate-500">
              <Search className="h-8 w-8 text-slate-700 mx-auto" />
              <div>Type to query police station registers across all indexed fields.</div>
              <div className="text-[11px] font-mono text-slate-600">
                Supports blind-index National ID hashing, phone numbers, and Occurrence Book records.
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching records found across station files for "{query}".
            </div>
          ) : (
            <div className="space-y-4">
              {/* Occurrence Book Results */}
              {matchedOBs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Occurrence Book Records ({matchedOBs.length})</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40">
                    {matchedOBs.map((ob) => (
                      <div
                        key={ob.id}
                        onClick={() => {
                          onLogAuditSearch(cleanQuery, totalResults);
                          onSelectResult('OB', ob.id);
                        }}
                        className="p-3 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-300">OB {ob.ob_number}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {ob.category}
                            </span>
                            <span className="text-slate-500 text-[11px]">{ob.incident_date}</span>
                          </div>
                          <div className="text-slate-200 font-semibold">{ob.subject}</div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{ob.narrative}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detainees & Persons Results */}
              {matchedPersons.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Identified Persons & Detainees ({matchedPersons.length})</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40">
                    {matchedPersons.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onLogAuditSearch(cleanQuery, totalResults);
                          onSelectResult('PERSON', p.id);
                        }}
                        className="p-3 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{p.full_name}</span>
                            {p.alias && <span className="font-mono text-slate-400 text-[11px]">("{p.alias}")</span>}
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">
                              {p.risk_level}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {p.identifiers[0]?.id_value_masked || 'N/A'} • {p.gender} • Nationality: {p.nationality}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custody Records Results */}
              {matchedCustody.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Active Custody Records ({matchedCustody.length})</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40">
                    {matchedCustody.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onLogAuditSearch(cleanQuery, totalResults);
                          onSelectResult('CUSTODY', c.id);
                        }}
                        className="p-3 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{c.person.full_name}</span>
                            <span className="font-mono text-amber-400 font-bold bg-slate-800 px-1.5 py-0.2 rounded">
                              Cell {c.cell_number}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">OB: {c.ob_number}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-lg">
                            {c.arrest_reason}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Officers Results */}
              {matchedOfficers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Station Officers ({matchedOfficers.length})</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40">
                    {matchedOfficers.map((off) => (
                      <div
                        key={off.id}
                        onClick={() => {
                          onLogAuditSearch(cleanQuery, totalResults);
                          onSelectResult('OFFICER', off.id);
                        }}
                        className="p-3 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{off.full_name}</span>
                          <span className="font-mono text-amber-400 text-[11px]">{off.service_number}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {off.role_name}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
          <span>Active Searcher: <strong className="text-slate-200">{activeOfficer.full_name} ({activeOfficer.service_number})</strong></span>
          <span className="text-[11px] font-mono text-slate-500">Audited in Real-Time</span>
        </div>
      </div>
    </div>
  );
}
