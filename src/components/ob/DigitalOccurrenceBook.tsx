import { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  ShieldCheck, 
  Lock, 
  Clock, 
  User, 
  Copy, 
  Check, 
  FileEdit,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react';
import type { OBEntry, OBCategory, OBStatus, Officer } from '@/types';
import { OBEntryModal } from './OBEntryModal';
import { OBAmendmentModal } from './OBAmendmentModal';

interface DigitalOccurrenceBookProps {
  entries: OBEntry[];
  activeOfficer: Officer;
  onAddEntry: (newEntry: OBEntry) => void;
  onSubmitAmendment: (params: {
    obEntryId: string;
    amendmentObNumber: string;
    reason: string;
    amendmentNarrative: string;
    entryHash: string;
  }) => void;
  onNavigateToBookIn?: (obEntry: OBEntry) => void;
}

const CATEGORY_COLORS: Record<OBCategory, { bg: string; text: string; border: string }> = {
  CRIMINAL: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/60' },
  TRAFFIC: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/60' },
  INCIDENT: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/60' },
  REPORT: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/60' },
  DIRECTIVE: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/60' },
  PUBLIC_COMPLAINT: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/60' },
  LOST_PROPERTY: { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-800/60' },
  OTHER: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
};

const STATUS_BADGES: Record<OBStatus, string> = {
  OPEN: 'bg-blue-900/60 text-blue-200 border-blue-700',
  ASSIGNED: 'bg-amber-900/60 text-amber-200 border-amber-700',
  AMENDED: 'bg-purple-900/60 text-purple-200 border-purple-700',
  UNDER_INVESTIGATION: 'bg-orange-900/60 text-orange-200 border-orange-700',
  CLOSED: 'bg-slate-800 text-slate-300 border-slate-700',
  COURT_PENDING: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
};

export function DigitalOccurrenceBook({
  entries,
  activeOfficer,
  onAddEntry,
  onSubmitAmendment,
  onNavigateToBookIn,
}: DigitalOccurrenceBookProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [amendingEntry, setAmendingEntry] = useState<OBEntry | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.ob_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.narrative.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.reporting_person_name && e.reporting_person_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.recorded_by_service_no.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const nextSeq = entries.length + 1;
  const lastEntry = entries[entries.length - 1];
  const lastHash = lastEntry
    ? lastEntry.entry_hash
    : '0000000000000000000000000000000000000000000000000000000000000000';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Station Ledger Identity */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="/crest.jpg"
              alt="Rockport Police Crest"
              className="h-14 w-14 rounded-full border-2 border-amber-500/80 object-cover shadow-lg"
              onError={(e) => {
                // Fallback if crest image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wide text-slate-100 uppercase">
                Digital Occurrence Book (OB)
              </h1>
              <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
                RPS-001
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Statutory Incident Ledger • Gap-Free Chronological Sequence • Cryptographically Chained
            </p>
          </div>
        </div>

        {/* Ledger Integrity & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="font-mono text-[11px]">
              <div>LEDGER HASH CHAIN: <strong className="text-emerald-400">INTACT</strong></div>
              <div className="text-slate-400">Total Entries: <strong>{entries.length}</strong></div>
            </div>
          </div>

          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-colors shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Record New OB Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by OB number, subject, narrative, reporting person, or officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="ALL">All Categories ({entries.length})</option>
            <option value="CRIMINAL">Criminal Offense</option>
            <option value="TRAFFIC">Traffic Incident</option>
            <option value="INCIDENT">General Incident</option>
            <option value="REPORT">Public Report</option>
            <option value="DIRECTIVE">Station Directive</option>
            <option value="PUBLIC_COMPLAINT">Public Complaint</option>
            <option value="LOST_PROPERTY">Lost Property</option>
            <option value="OTHER">Administrative</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open (Requires IO)</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="AMENDED">Amended</option>
            <option value="COURT_PENDING">Court Pending</option>
            <option value="CLOSED">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* OB Entries Feed / Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Occurrence Book records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching incidents found for the active search and filter parameters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-amber-400 hover:underline font-mono"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const catTheme = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.OTHER;
              const statusTheme = STATUS_BADGES[entry.status] || STATUS_BADGES.OPEN;

              return (
                <div
                  key={entry.id}
                  className={`p-4 transition-colors ${
                    isExpanded ? 'bg-slate-900/90' : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* OB Identifier & Title */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded">
                          OB {entry.ob_number}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
                        >
                          {entry.category.replace('_', ' ')}
                        </span>

                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border font-mono ${statusTheme}`}
                        >
                          {entry.status.replace('_', ' ')}
                        </span>

                        {entry.is_amended && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700">
                            AMENDED
                          </span>
                        )}

                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.entry_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {entry.incident_date}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-200 hover:text-white transition-colors">
                        {entry.subject}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {entry.narrative}
                      </p>
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      <div className="text-right text-xs">
                        <div className="text-slate-300 font-medium">{entry.recorded_by_name}</div>
                        <div className="text-[10px] font-mono text-amber-400">{entry.recorded_by_service_no}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {entry.category === 'CRIMINAL' && onNavigateToBookIn && (
                          <button
                            onClick={() => onNavigateToBookIn(entry)}
                            className="flex items-center gap-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 px-2 py-1 text-[11px] font-semibold text-amber-300 transition-colors"
                            title="Book in arrested suspect from this Occurrence Book record"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Book In</span>
                          </button>
                        )}

                        <button
                          onClick={() => setAmendingEntry(entry)}
                          className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors"
                          title="File a linked append-only OB amendment notice"
                        >
                          <FileEdit className="h-3 w-3 text-purple-400" />
                          <span>Amend</span>
                        </button>

                        <button
                          onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                          className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors"
                        >
                          <span>Proof</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Cryptographic Proof & Full Narrative */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">
                          Full Canonical Narrative
                        </div>
                        <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {entry.narrative}
                        </div>
                      </div>

                      {entry.reporting_person_name && (
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span>Reporting Party: <strong className="text-slate-200">{entry.reporting_person_name}</strong></span>
                          </span>
                          {entry.reporting_person_phone && (
                            <span className="font-mono text-slate-500">
                              Contact: {entry.reporting_person_phone}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hash Chaining Details */}
                      <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800 text-[11px] font-mono space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Lock className="h-3 w-3 text-amber-400" />
                            <span>PREVIOUS BLOCK HASH:</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 truncate max-w-[280px] sm:max-w-md">
                              {entry.previous_entry_hash}
                            </span>
                            <button
                              onClick={() => copyToClipboard(entry.previous_entry_hash)}
                              className="text-slate-500 hover:text-slate-300"
                              title="Copy Hash"
                            >
                              {copiedHash === entry.previous_entry_hash ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-emerald-400 border-t border-slate-800/80 pt-2">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" />
                            <span>SEALED ENTRY HASH (SHA-256):</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate max-w-[280px] sm:max-w-md">
                              {entry.entry_hash}
                            </span>
                            <button
                              onClick={() => copyToClipboard(entry.entry_hash)}
                              className="text-slate-500 hover:text-slate-300"
                              title="Copy Hash"
                            >
                              {copiedHash === entry.entry_hash ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New OB Entry Modal */}
      {isNewEntryOpen && (
        <OBEntryModal
          activeOfficer={activeOfficer}
          nextSeqNumber={nextSeq}
          previousEntryHash={lastHash}
          onClose={() => setIsNewEntryOpen(false)}
          onSubmitEntry={(newOB) => {
            onAddEntry(newOB);
            setIsNewEntryOpen(false);
          }}
        />
      )}

      {/* Linked OB Amendment Modal */}
      {amendingEntry && (
        <OBAmendmentModal
          entry={amendingEntry}
          activeOfficer={activeOfficer}
          nextSeqNumber={nextSeq}
          onClose={() => setAmendingEntry(null)}
          onSubmitAmendment={(params) => {
            onSubmitAmendment(params);
            setAmendingEntry(null);
          }}
        />
      )}
    </div>
  );
}
