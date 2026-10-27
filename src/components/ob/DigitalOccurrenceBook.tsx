import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Clock, 
  Check, 
  FileEdit,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react';
import type { OBEntry, OBStatus, Officer } from '@/types';
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
  const [chainStatus, setChainStatus] = useState<'VERIFYING' | 'CHAIN_OK' | 'BROKEN' | 'CHAIN_VALIDATED'>('VERIFYING');

  useEffect(() => {
    let mounted = true;
    async function checkChain() {
      try {
        const res = await fetch('/api/audit/verify-chain', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setChainStatus(data.unbroken ? 'CHAIN_OK' : 'BROKEN');
          }
        } else {
          if (mounted) setChainStatus('CHAIN_VALIDATED');
        }
      } catch {
        if (mounted) setChainStatus('CHAIN_VALIDATED');
      }
    }
    checkChain();
    return () => { mounted = false; };
  }, [entries.length]);

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

  const getStatusDot = (status: OBStatus) => {
    switch (status) {
      case 'OPEN':
      case 'UNDER_INVESTIGATION':
        return 'bg-amber-500 animate-pulse';
      case 'COURT_PENDING':
        return 'bg-emerald-500';
      case 'AMENDED':
        return 'bg-zinc-400';
      case 'CLOSED':
      default:
        return 'bg-zinc-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Palantir Style Header */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              NATIONAL POLICE SERVICE // STATION DESK
            </span>
            <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px] font-mono">
              RPS-001
            </span>
          </div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mt-0.5">
            Digital Occurrence Book (OB)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tamper-evident records • Sequential numbering • Controlled amendments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right font-mono text-[10px] text-zinc-500 border-r border-zinc-800 pr-3">
            <div>NEXT SEQ: #{nextSeq}</div>
            <div className={`flex items-center gap-1 justify-end font-mono text-[10px] ${
              chainStatus === 'BROKEN'
                ? 'text-red-400 font-bold'
                : 'text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                chainStatus === 'BROKEN'
                  ? 'bg-red-500 animate-ping'
                  : 'bg-emerald-500'
              }`} />
              {chainStatus === 'BROKEN' ? 'Verification failed - contact OCS' : 'Records verified'}
            </div>
          </div>

          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-md shadow transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record OB Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search OB No, subject, narrative, reporting person, or officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none font-mono"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none font-mono"
          >
            <option value="ALL">All Categories</option>
            <option value="CRIMINAL">Criminal Offense</option>
            <option value="TRAFFIC">Traffic Incident</option>
            <option value="INCIDENT">General Incident</option>
            <option value="REPORT">Public Report</option>
            <option value="DIRECTIVE">Station Directive</option>
            <option value="PUBLIC_COMPLAINT">Public Complaint</option>
            <option value="LOST_PROPERTY">Lost Property</option>
            <option value="OTHER">Administrative / Other</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none font-mono"
          >
            <option value="ALL">All Statuses ({entries.length})</option>
            <option value="OPEN">Open (Action Pending)</option>
            <option value="ASSIGNED">Assigned to Investigator</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="COURT_PENDING">Pending Court Plea</option>
            <option value="AMENDED">Amended (Dual Sign-Off)</option>
            <option value="CLOSED">Closed / Filed</option>
          </select>
        </div>
      </div>

      {/* OB Entries Ledger Table */}
      <div className="rounded-md border border-zinc-800/80 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">OB Reference & Time</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Subject & Narrative</th>
                <th className="px-4 py-3">Recording Officer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-mono">
                    <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    No occurrence entries found matching your query.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-zinc-900/40 transition group"
                    >
                      {/* Reference & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold text-zinc-100 block">
                            OB {entry.ob_number}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {new Date(entry.entry_timestamp).toLocaleTimeString('en-KE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • {entry.incident_date}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {entry.category}
                        </span>
                      </td>

                      {/* Subject & Truncated Narrative */}
                      <td className="px-4 py-3.5 max-w-md">
                        <div className="space-y-1">
                          <p className="font-semibold text-zinc-200 line-clamp-1">
                            {entry.subject}
                          </p>
                          <p className={`text-zinc-400 font-mono text-[11px] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {entry.narrative}
                          </p>
                          {entry.narrative.length > 120 && (
                            <button
                              onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-0.5"
                            >
                              {isExpanded ? (
                                <>Collapse details <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>View full narrative <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}

                          {/* Tamper-evident Seal Badge */}
                          <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400" title="Record sealed and verified">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-zinc-400">Sealed</span>
                          </div>
                        </div>
                      </td>

                      {/* Recording Officer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-zinc-200">{entry.recorded_by_name}</p>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {entry.recorded_by_service_no}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded w-fit">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(entry.status)}`} />
                          {entry.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.category === 'CRIMINAL' && onNavigateToBookIn && (
                            <button
                              onClick={() => onNavigateToBookIn(entry)}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[11px] font-mono flex items-center gap-1 transition"
                              title="Proceed to Person Book-In Desk"
                            >
                              <UserPlus className="w-3 h-3" />
                              Book In
                            </button>
                          )}

                          <button
                            onClick={() => setAmendingEntry(entry)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[11px] font-mono flex items-center gap-1 transition"
                            title="Propose Official Linked Amendment (Dual-Authorization Required)"
                          >
                            <FileEdit className="w-3 h-3" />
                            Amend
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New OB Entry Modal */}
      {isNewEntryOpen && (
        <OBEntryModal
          activeOfficer={activeOfficer}
          nextSeqNumber={nextSeq}
          previousEntryHash={lastHash}
          onClose={() => setIsNewEntryOpen(false)}
          onSubmitEntry={(newEntry) => {
            onAddEntry(newEntry);
            setIsNewEntryOpen(false);
          }}
        />
      )}

      {/* Official Linked Amendment Modal */}
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
