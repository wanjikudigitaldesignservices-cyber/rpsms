import { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  UserPlus, 
  Package, 
  HeartPulse, 
  LogOut, 
  Search, 
  Lock, 
  ShieldCheck
} from 'lucide-react';
import type { 
  CustodyRecord, 
  Cell, 
  PropertyItem, 
  WelfareLog, 
  Officer, 
  ExitReason
} from '@/types';
import { CustodyExitModal } from './CustodyExitModal';
import { PropertyRegisterModal } from './PropertyRegisterModal';
import { WelfareLogModal } from './WelfareLogModal';

interface CustodyManagementProps {
  custodyRecords: CustodyRecord[];
  cells: Cell[];
  propertyItems: PropertyItem[];
  welfareLogs: WelfareLog[];
  activeOfficer: Officer;
  onNavigateToBookIn: () => void;
  onCompleteExit: (params: {
    custodyRecordId: string;
    exitReason: ExitReason;
    notes: string;
    requiresFourEyes: boolean;
  }) => void;
  onAddPropertyItem: (newItem: PropertyItem) => void;
  onReturnPropertyItem: (itemId: string, unreturnedReason?: string) => void;
  onAddWelfareLog: (newLog: WelfareLog) => void;
}

export function CustodyManagement({
  custodyRecords,
  cells,
  propertyItems,
  welfareLogs,
  activeOfficer,
  onNavigateToBookIn,
  onCompleteExit,
  onAddPropertyItem,
  onReturnPropertyItem,
  onAddWelfareLog,
}: CustodyManagementProps) {
  // Live ticking clock state
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'IN_CUSTODY' | 'DISCHARGED' | 'ALL'>('IN_CUSTODY');

  // Modals state
  const [activeExitRecord, setActiveExitRecord] = useState<CustodyRecord | null>(null);
  const [activePropertyRecord, setActivePropertyRecord] = useState<CustodyRecord | null>(null);
  const [activeWelfareRecord, setActiveWelfareRecord] = useState<CustodyRecord | null>(null);
  const [selectedDetaineePhoto, setSelectedDetaineePhoto] = useState<string | null>(null);

  // Ticking timer update every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered custody records
  const filteredRecords = custodyRecords.filter((rec) => {
    const matchesSearch =
      rec.person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.person.alias && rec.person.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.ob_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.cell_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.arrest_reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCell = selectedCellFilter === 'ALL' || rec.cell_number === selectedCellFilter;
    const matchesRisk = selectedRiskFilter === 'ALL' || rec.person.risk_level === selectedRiskFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'IN_CUSTODY' && rec.is_in_custody) ||
      (statusFilter === 'DISCHARGED' && !rec.is_in_custody);

    return matchesSearch && matchesCell && matchesRisk && matchesStatus;
  });

  const activeInCustody = custodyRecords.filter((c) => c.is_in_custody);

  // Calculate stats for top summary
  let countNormal = 0;
  let countAmber = 0;
  let countRedAlert = 0;
  let countBreach = 0;

  activeInCustody.forEach((rec) => {
    const startMs = new Date(rec.countdown_start).getTime();
    const elapsedSecs = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const totalSecs = (rec.custody_limit_hours || 24) * 3600;
    const remainingSecs = totalSecs - elapsedSecs;

    if (remainingSecs <= 0) countBreach++;
    else if (remainingSecs <= 4 * 3600) countRedAlert++;
    else if (remainingSecs <= 12 * 3600) countAmber++;
    else countNormal++;
  });

  return (
    <div className="space-y-6">
      {/* Custody Overview & Statutory Article 49 Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-wide text-slate-100 uppercase">
              Custody & Statutory 24-Hour Clock
            </h1>
            <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
              Article 49(1)(f)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Rockport Station Cell Roster • Real-Time Article 49 Constitutional Compliance Engine
          </p>
        </div>

        <button
          onClick={onNavigateToBookIn}
          className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-colors shadow-lg"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Book In New Detainee</span>
        </button>
      </div>

      {/* Statutory 24-Hour Threshold Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Nominal Tier */}
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-semibold uppercase tracking-wider">Nominal (&lt;12h)</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-300">{countNormal}</div>
          <div className="text-[11px] text-slate-400">Within initial legal period</div>
        </div>

        {/* 12h Amber Alert */}
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="font-semibold uppercase tracking-wider">Warning (12h - 20h)</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300">{countAmber}</div>
          <div className="text-[11px] text-slate-400">Prepare Bail or Court Charge</div>
        </div>

        {/* 20h Critical Red Alert */}
        <div className="rounded-xl border border-orange-800/60 bg-orange-950/30 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-orange-400">
            <span className="font-semibold uppercase tracking-wider">Urgent (&gt;20h)</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black font-mono text-orange-300 animate-pulse">{countRedAlert}</div>
          <div className="text-[11px] text-orange-200/80">Statutory Limit Imminent (&lt;4h)</div>
        </div>

        {/* 24h Critical Breach Flag */}
        <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="font-semibold uppercase tracking-wider">Article 49 Breach (&gt;24h)</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black font-mono text-red-300 animate-pulse">{countBreach}</div>
          <div className="text-[11px] text-red-300/90 font-bold">Unlawful Detention Flagged</div>
        </div>
      </div>

      {/* Station Cell Roster Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span>Station Cell Allocation & Live Capacity</span>
          </h3>
          <span className="font-mono text-slate-400">
            Total Cell Capacity: {cells.reduce((a, b) => a + b.capacity, 0)} • Currently Held: {activeInCustody.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {cells.map((cell) => {
            const occupantsInCell = activeInCustody.filter((c) => c.cell_number === cell.cell_number).length;
            const pct = Math.min(100, Math.round((occupantsInCell / cell.capacity) * 100));
            const isFull = occupantsInCell >= cell.capacity;

            return (
              <div
                key={cell.id}
                className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">{cell.cell_number}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {cell.cell_type}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate">{cell.cell_name}</div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Held:</span>
                    <span className={isFull ? 'text-red-400 font-bold' : 'text-slate-200'}>
                      {occupantsInCell}/{cell.capacity}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search detainees by name, alias, OB number, cell, or offense..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedCellFilter}
            onChange={(e) => setSelectedCellFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="ALL">All Cells</option>
            {cells.map((c) => (
              <option key={c.id} value={c.cell_number}>
                Cell {c.cell_number}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="NORMAL">Normal</option>
            <option value="ESCAPE_RISK">Escape Risk</option>
            <option value="MEDICAL_ATTENTION">Medical</option>
            <option value="HIGH">High Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="IN_CUSTODY">In Custody ({activeInCustody.length})</option>
            <option value="DISCHARGED">Discharged / Released</option>
            <option value="ALL">All Custody History</option>
          </select>
        </div>
      </div>

      {/* Detainee Custody Cards Feed */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/30 space-y-2">
            <Users className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Detainees Found</h3>
            <p className="text-xs text-slate-500">
              No matching custody records match your current filter parameters.
            </p>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            // Live countdown calculations
            const startMs = new Date(rec.countdown_start).getTime();
            const elapsedSecs = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
            const totalSecs = (rec.custody_limit_hours || 24) * 3600;
            const remainingSecs = totalSecs - elapsedSecs;

            const isExpired = remainingSecs <= 0;
            const isRedAlert = !isExpired && remainingSecs <= 4 * 3600;
            const isAmberAlert = !isExpired && !isRedAlert && remainingSecs <= 12 * 3600;

            // Formatted countdown strings
            const formatTime = (secs: number) => {
              const abs = Math.abs(secs);
              const h = Math.floor(abs / 3600);
              const m = Math.floor((abs % 3600) / 60);
              const s = abs % 60;
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };

            const progressPct = Math.min(100, (elapsedSecs / totalSecs) * 100);

            // Detainee mugshot preview
            const frontMugshot = rec.person.mugshots?.find((m) => m.view_angle === 'FRONT') || rec.person.mugshots?.[0];

            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-5 transition-all space-y-4 ${
                  !rec.is_in_custody
                    ? 'border-slate-800 bg-slate-900/30 opacity-75'
                    : isExpired
                    ? 'border-red-600/80 bg-red-950/25 shadow-lg shadow-red-950/40 ring-1 ring-red-500'
                    : isRedAlert
                    ? 'border-orange-600/80 bg-orange-950/20 shadow-md shadow-orange-950/30'
                    : isAmberAlert
                    ? 'border-amber-600/60 bg-amber-950/15'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {/* Detainee Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Photo & Identity */}
                  <div className="flex items-start gap-4">
                    {/* Mugshot thumbnail or avatar */}
                    <div className="relative shrink-0">
                      {frontMugshot ? (
                        <img
                          src={frontMugshot.image_data_url}
                          alt={rec.person.full_name}
                          onClick={() => setSelectedDetaineePhoto(frontMugshot.image_data_url)}
                          className="h-16 w-14 rounded-lg object-cover border border-slate-700 cursor-pointer shadow-md"
                        />
                      ) : (
                        <div className="h-16 w-14 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500">
                          <Users className="h-6 w-6" />
                          <span className="text-[9px] mt-1 font-mono">NO PHOTO</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {rec.person.full_name}
                        </h3>

                        {rec.person.alias && (
                          <span className="text-xs text-slate-400 font-mono">
                            ("{rec.person.alias}")
                          </span>
                        )}

                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400">
                          Cell {rec.cell_number}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rec.person.risk_level === 'ESCAPE_RISK'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : rec.person.risk_level === 'MEDICAL_ATTENTION'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {rec.person.risk_level.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span>OB Ref: <strong className="text-amber-400 font-mono">{rec.ob_number}</strong></span>
                        <span>•</span>
                        <span>Arresting: {rec.arresting_officer_name} ({rec.arresting_officer_service_no})</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        <strong>Reason:</strong> {rec.arrest_reason}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2 shrink-0">
                    {rec.is_in_custody ? (
                      <button
                        onClick={() => setActiveExitRecord(rec)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-700/80 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors shadow-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Authorize Discharge</span>
                      </button>
                    ) : (
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        DISCHARGED ({rec.exit_reason})
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivePropertyRecord(rec)}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
                        title="View detainee property register"
                      >
                        <Package className="h-3.5 w-3.5 text-amber-400" />
                        <span>Property ({rec.property_items_count})</span>
                      </button>

                      <button
                        onClick={() => setActiveWelfareRecord(rec)}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
                        title="View detainee welfare & medical log"
                      >
                        <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Welfare ({rec.welfare_logs_count})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statutory 24-Hour Countdown Clock Bar (If in custody) */}
                {rec.is_in_custody && (
                  <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${isExpired ? 'text-red-400 animate-pulse' : isRedAlert ? 'text-orange-400' : 'text-amber-400'}`} />
                        <span className="font-bold text-slate-300 uppercase tracking-wide">
                          Statutory 24h Clock:
                        </span>
                        {isExpired ? (
                          <span className="font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800 animate-pulse">
                            BREACH EXCEEDED (+{formatTime(remainingSecs)})
                          </span>
                        ) : isRedAlert ? (
                          <span className="font-mono font-bold text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-800 animate-pulse">
                            CRITICAL REMAINING: {formatTime(remainingSecs)}
                          </span>
                        ) : (
                          <span className={`font-mono font-bold ${isAmberAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                            REMAINING: {formatTime(remainingSecs)}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-400">
                        Elapsed: <strong>{formatTime(elapsedSecs)}</strong> / 24:00:00 • Booked: {new Date(rec.book_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Visual Countdown Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isExpired
                            ? 'bg-red-500 animate-pulse'
                            : isRedAlert
                            ? 'bg-orange-500'
                            : isAmberAlert
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Statutory Legal Guidance Notice */}
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      {isExpired ? (
                        <span className="text-red-400 font-bold flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>UNLAWFUL DETENTION: Article 49(1)(f) 24-hour limit breached. Immediate production before court or bail mandatory.</span>
                        </span>
                      ) : isRedAlert ? (
                        <span className="text-orange-400 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>URGENT: Less than 4 hours remaining. Present detainee to court registrar or process cash bail immediately.</span>
                        </span>
                      ) : isAmberAlert ? (
                        <span className="text-amber-400">
                          12-hour statutory threshold reached. Investigating officer must finalize charge sheet or recommend station bail.
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Nominal detention period. Rights read and next of kin notification confirmed.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Discharge / Exit Modal */}
      {activeExitRecord && (
        <CustodyExitModal
          custodyRecord={activeExitRecord}
          activeOfficer={activeOfficer}
          onClose={() => setActiveExitRecord(null)}
          onSubmitExit={(params) => {
            onCompleteExit(params);
            setActiveExitRecord(null);
          }}
        />
      )}

      {/* Property Register Modal */}
      {activePropertyRecord && (
        <PropertyRegisterModal
          custodyRecord={activePropertyRecord}
          propertyItems={propertyItems}
          activeOfficer={activeOfficer}
          onClose={() => setActivePropertyRecord(null)}
          onAddPropertyItem={onAddPropertyItem}
          onReturnPropertyItem={onReturnPropertyItem}
        />
      )}

      {/* Welfare Log Modal */}
      {activeWelfareRecord && (
        <WelfareLogModal
          custodyRecord={activeWelfareRecord}
          welfareLogs={welfareLogs}
          activeOfficer={activeOfficer}
          onClose={() => setActiveWelfareRecord(null)}
          onAddWelfareLog={onAddWelfareLog}
        />
      )}

      {/* Full Photo Preview Modal */}
      {selectedDetaineePhoto && (
        <div 
          onClick={() => setSelectedDetaineePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-lg overflow-hidden border border-slate-700 bg-black">
            <img
              src={selectedDetaineePhoto}
              alt="Mugshot Full Resolution"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-2 bg-black/80 px-2.5 py-1 text-xs font-mono text-emerald-400 rounded border border-emerald-800">
              WATERMARKED • EXIF STRIPPED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
