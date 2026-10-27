import { useState } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  UserCheck, 
  FileText, 
  Scale, 
  AlertTriangle,
  Shuffle
} from 'lucide-react';
import type { 
  CaseRecord, 
  CaseNote, 
  CaseStatus, 
  Officer, 
  OBEntry, 
  CaseAssignmentMethod 
} from '@/types';
import { CreateCaseModal } from './CreateCaseModal';
import { AssignIOModal } from './AssignIOModal';
import { CaseNotesDrawer } from './CaseNotesDrawer';

interface CaseManagementProps {
  cases: CaseRecord[];
  notes: CaseNote[];
  officers: Officer[];
  obEntries: OBEntry[];
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
}

const STATUS_BADGES: Record<CaseStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800' },
  ASSIGNED: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800' },
  INVESTIGATION: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800' },
  FILE_CLOSED_PENDING_APPROVAL: { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800' },
  CLOSED_NO_FURTHER_ACTION: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-800' },
  COURT_PROCEEDINGS: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800' },
  RESOLVED_CONVICTION: { bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-800' },
  RESOLVED_ACQUITTAL: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800' },
};

export function CaseManagement({
  cases,
  notes,
  officers,
  obEntries,
  activeOfficer,
  onCreateCase,
  onAssignIO,
  onAddNote,
  onUpdateCaseStatus,
}: CaseManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningCase, setAssigningCase] = useState<CaseRecord | null>(null);
  const [activeNotesCase, setActiveNotesCase] = useState<CaseRecord | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-wide text-slate-100 uppercase">
              CID Case Management & Fair Allocation
            </h1>
            <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
              Anti-Corruption Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Contemporaneous Investigation Diary • Statutory Penal Sections • Workload-Balanced IO Assignment
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-colors shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>+ Open New Case File</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases by Case Number, Title, IO Name, OB Number, or Penal Section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
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
      <div className="space-y-4">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/30 space-y-2">
            <Briefcase className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Case Files Found</h3>
            <p className="text-xs text-slate-500">
              No matching police case files found for the active search parameters.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const statusTheme = STATUS_BADGES[c.status] || STATUS_BADGES.NEW;
            const caseNotes = notes.filter((n) => n.case_id === c.id);

            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Case Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded">
                        {c.case_number}
                      </span>

                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${statusTheme.bg} ${statusTheme.text} ${statusTheme.border}`}>
                        {c.status.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        OB Ref: <strong className="text-slate-200">{c.ob_number}</strong>
                      </span>

                      {c.penal_code_section && (
                        <span className="text-[10px] font-mono text-amber-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                          {c.penal_code_section}
                        </span>
                      )}

                      {c.assignment_method === 'RANDOM_FAIR' && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <Shuffle className="h-3 w-3" /> Fair Assigned
                        </span>
                      )}

                      {c.assignment_method === 'OCS_OVERRIDE' && (
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-950/60 border border-orange-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> OCS Override
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white">
                      {c.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
                      {c.description}
                    </p>
                  </div>

                  {/* IO Information & Assign Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-slate-400">Investigating Officer:</div>
                      <div className="text-slate-200 font-semibold">{c.assigned_io_name || 'Unassigned'}</div>
                      <div className="text-[10px] font-mono text-amber-400">{c.assigned_io_service_no || 'Pending Allocation'}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAssigningCase(c)}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
                        title="Assign or reassign IO via fair random algorithm or OCS override"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                        <span>{c.assigned_io_id ? 'Reassign' : 'Assign IO'}</span>
                      </button>

                      <button
                        onClick={() => setActiveNotesCase(c)}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
                        title="Open contemporaneous investigation diary"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        <span>Diary ({caseNotes.length})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Court Details & Progression Footer */}
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3">
                    {c.court_name ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                        <Scale className="h-3.5 w-3.5" />
                        <span>Court: <strong>{c.court_name}</strong> {c.court_date && `(Plea: ${c.court_date})`}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">No court appearance date currently scheduled</span>
                    )}
                  </div>

                  {/* Status Progression Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Lifecycle State:</span>
                    <select
                      value={c.status}
                      onChange={(e) => onUpdateCaseStatus(c.id, e.target.value as CaseStatus)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 font-mono"
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
    </div>
  );
}
