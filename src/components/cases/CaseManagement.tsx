import { useState } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  UserCheck, 
  FileText, 
  Scale, 
  AlertTriangle,
  Share2,
} from 'lucide-react';
import type { 
  CaseRecord, 
  CaseNote, 
  CaseStatus, 
  Officer, 
  OBEntry, 
  CaseAssignmentMethod,
  EvidenceItem 
} from '@/types';
import { CreateCaseModal } from './CreateCaseModal';
import { AssignIOModal } from './AssignIOModal';
import { CaseNotesDrawer } from './CaseNotesDrawer';
import { ODPPProsecutionBriefModal } from '../ai/ODPPProsecutionBriefModal';

interface CaseManagementProps {
  cases: CaseRecord[];
  notes: CaseNote[];
  officers: Officer[];
  obEntries: OBEntry[];
  evidenceItems?: EvidenceItem[];
  activeOfficer: Officer;
  onCreateCase: (newCase: CaseRecord) => void;
  onAssignIO: (params: {
    caseId: string;
    ioId: string;
    ioName: string;
    ioServiceNo: string;
    method: CaseAssignmentMethod;
    overrideReason?: string;
  }) => void;
  onAddNote: (newNote: CaseNote) => void;
  onUpdateCaseStatus: (caseId: string, newStatus: CaseStatus) => void;
  onNavigateToGraph?: () => void;
}

export function CaseManagement({
  cases,
  notes,
  officers,
  obEntries,
  evidenceItems = [],
  activeOfficer,
  onCreateCase,
  onAssignIO,
  onAddNote,
  onUpdateCaseStatus,
  onNavigateToGraph,
}: CaseManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningCase, setAssigningCase] = useState<CaseRecord | null>(null);
  const [activeNotesCase, setActiveNotesCase] = useState<CaseRecord | null>(null);
  const [odppBriefCase, setOdppBriefCase] = useState<CaseRecord | null>(null);

  // Available Investigating Officers
  const availableIOs = officers.filter(
    (o) => o.role_name === 'INVESTIGATING_OFFICER' || o.role_name === 'DEPUTY_OCS' || o.role_name === 'OCS'
  );

  // Count active cases per IO
  const activeCaseCountByIO: Record<string, number> = {};
  cases.forEach((c) => {
    if (c.assigned_io_id && c.status !== 'CLOSED_NO_FURTHER_ACTION' && c.status !== 'RESOLVED_CONVICTION') {
      activeCaseCountByIO[c.assigned_io_id] = (activeCaseCountByIO[c.assigned_io_id] || 0) + 1;
    }
  });

  const nextSeq = cases.length + 1;

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ob_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assigned_io_name && c.assigned_io_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusDot = (status: CaseStatus) => {
    switch (status) {
      case 'COURT_PROCEEDINGS':
      case 'RESOLVED_CONVICTION':
        return 'bg-emerald-500';
      case 'INVESTIGATION':
      case 'ASSIGNED':
        return 'bg-zinc-400';
      case 'NEW':
      case 'FILE_CLOSED_PENDING_APPROVAL':
        return 'bg-amber-500 animate-pulse';
      case 'RESOLVED_ACQUITTAL':
      case 'CLOSED_NO_FURTHER_ACTION':
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
              CID INVESTIGATIONS // DOCKET REGISTRY
            </span>
            <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px] font-mono">
              CAP 75 CRIMINAL PROCEDURE
            </span>
          </div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mt-0.5">
            Case Files & Workload-Balanced Allocation
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Contemporaneous investigation diary, anti-corruption IO allocation, and ODPP-ready court dossiers.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-md shadow transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Open New Case File</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by Case Number, Title, IO Name, OB Number, or Penal Section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none font-mono"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none font-mono"
          >
            <option value="ALL">All Case Statuses ({cases.length})</option>
            <option value="NEW">New (Unassigned)</option>
            <option value="ASSIGNED">Assigned to IO</option>
            <option value="INVESTIGATION">Active Investigation</option>
            <option value="COURT_PROCEEDINGS">Court Proceedings Active</option>
            <option value="RESOLVED_CONVICTION">Resolved (Conviction)</option>
            <option value="RESOLVED_ACQUITTAL">Resolved (Acquittal)</option>
            <option value="CLOSED_NO_FURTHER_ACTION">Closed (No Further Action)</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center rounded-md border border-zinc-800 bg-zinc-950 space-y-2">
            <Briefcase className="h-8 w-8 text-zinc-600 mx-auto" />
            <h3 className="text-xs font-semibold text-zinc-300">No Case Files Found</h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              No matching police case files found for the active query parameters.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const caseNotes = notes.filter((n) => n.case_id === c.id);
            const hasSyndicateMatch = c.case_number.includes('0014');

            return (
              <div
                key={c.id}
                className="rounded-md border border-zinc-800/80 bg-zinc-950 p-4 space-y-3.5 hover:border-zinc-700 transition"
              >
                {/* Case Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-100 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        {c.case_number}
                      </span>

                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)}`} />
                        {c.status.replace(/_/g, ' ')}
                      </span>

                      <span className="text-xs font-mono text-zinc-400">
                        OB: <strong className="text-zinc-200">{c.ob_number}</strong>
                      </span>

                      {c.penal_code_section && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {c.penal_code_section}
                        </span>
                      )}

                      {c.assignment_method === 'RANDOM_FAIR' && (
                        <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Fair Assigned
                        </span>
                      )}

                      {c.assignment_method === 'OCS_OVERRIDE' && (
                        <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" /> OCS Override
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100">
                      {c.title}
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {c.description}
                    </p>
                  </div>

                  {/* IO Information & Assign Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-mono">Investigating Officer</div>
                      <div className="text-zinc-200 font-medium">{c.assigned_io_name || 'Unassigned'}</div>
                      <div className="text-[10px] font-mono text-zinc-400">{c.assigned_io_service_no || 'Pending Allocation'}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAssigningCase(c)}
                        className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:text-white transition"
                        title="Assign IO via fair random algorithm or OCS override"
                      >
                        <UserCheck className="h-3 w-3 text-zinc-400" />
                        <span>{c.assigned_io_id ? 'Reassign' : 'Assign IO'}</span>
                      </button>

                      <button
                        onClick={() => setActiveNotesCase(c)}
                        className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:text-white transition"
                        title="Open contemporaneous investigation diary"
                      >
                        <FileText className="h-3 w-3 text-zinc-400" />
                        <span>Diary ({caseNotes.length})</span>
                      </button>

                      <button
                        onClick={() => setOdppBriefCase(c)}
                        className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:text-white transition"
                        title="Generate structured court-ready brief for ODPP"
                      >
                        <Scale className="h-3 w-3 text-zinc-400" />
                        <span>ODPP Brief</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cross-Case Intelligence Link Alert Banner */}
                {hasSyndicateMatch && (
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-zinc-300 font-mono">
                        LINK DETECTED: Suspect phone prefix & master lock-pick MO correlates with Case RPS-001/CR/2026/0008 (Kawangware Syndicate • 89% match)
                      </span>
                    </div>
                    {onNavigateToGraph && (
                      <button
                        onClick={onNavigateToGraph}
                        className="text-[10px] font-mono text-zinc-400 hover:text-zinc-100 flex items-center gap-1 shrink-0 ml-2"
                      >
                        Inspect in AI Graph →
                      </button>
                    )}
                  </div>
                )}

                {/* Court Details & Progression Footer */}
                <div className="rounded bg-zinc-900/40 p-2.5 border border-zinc-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3">
                    {c.court_name ? (
                      <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
                        <Scale className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Court: <strong>{c.court_name}</strong> {c.court_date && `(Plea: ${c.court_date})`}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px] font-mono">No court appearance date currently scheduled</span>
                    )}
                  </div>

                  {/* Status Progression Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500">Lifecycle State:</span>
                    <select
                      value={c.status}
                      onChange={(e) => onUpdateCaseStatus(c.id, e.target.value as CaseStatus)}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                    >
                      <option value="NEW">NEW</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="INVESTIGATION">INVESTIGATION</option>
                      <option value="COURT_PROCEEDINGS">COURT PROCEEDINGS</option>
                      <option value="FILE_CLOSED_PENDING_APPROVAL">CLOSED (PENDING APPROVAL)</option>
                      <option value="RESOLVED_CONVICTION">RESOLVED (CONVICTION)</option>
                      <option value="RESOLVED_ACQUITTAL">RESOLVED (ACQUITTAL)</option>
                      <option value="CLOSED_NO_FURTHER_ACTION">CLOSED (NO ACTION)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Case Modal */}
      {isCreateOpen && (
        <CreateCaseModal
          obEntries={obEntries}
          activeOfficer={activeOfficer}
          nextCaseSeq={nextSeq}
          onClose={() => setIsCreateOpen(false)}
          onCreateCase={(newCase) => {
            onCreateCase(newCase);
            setIsCreateOpen(false);
          }}
        />
      )}

      {/* Fair Assign IO Modal */}
      {assigningCase && (
        <AssignIOModal
          caseRecord={assigningCase}
          availableIOs={availableIOs}
          activeOfficer={activeOfficer}
          activeCaseCountByIO={activeCaseCountByIO}
          onClose={() => setAssigningCase(null)}
          onAssignIO={(params) => {
            onAssignIO(params);
            setAssigningCase(null);
          }}
        />
      )}

      {/* Case Notes Diary Drawer */}
      {activeNotesCase && (
        <CaseNotesDrawer
          caseRecord={activeNotesCase}
          notes={notes}
          activeOfficer={activeOfficer}
          onClose={() => setActiveNotesCase(null)}
          onAddNote={onAddNote}
        />
      )}

      {/* ODPP Court Ready Dossier Brief Modal */}
      {odppBriefCase && (
        <ODPPProsecutionBriefModal
          caseRecord={odppBriefCase}
          notes={notes}
          evidenceItems={evidenceItems}
          currentOfficer={activeOfficer}
          isOpen={true}
          onClose={() => setOdppBriefCase(null)}
        />
      )}
    </div>
  );
}
