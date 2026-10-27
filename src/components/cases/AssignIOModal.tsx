import { useState } from 'react';
import { X, Shuffle, AlertTriangle, ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';
import type { CaseRecord, Officer, CaseAssignmentMethod } from '@/types';

interface AssignIOModalProps {
  caseRecord: CaseRecord;
  availableIOs: Officer[];
  activeOfficer: Officer;
  activeCaseCountByIO: Record<string, number>;
  onClose: () => void;
  onAssignIO: (params: {
    caseId: string;
    ioId: string;
    ioName: string;
    ioServiceNo: string;
    method: CaseAssignmentMethod;
    overrideReason?: string;
  }) => void;
}

export function AssignIOModal({
  caseRecord,
  availableIOs,
  activeOfficer: _activeOfficer,
  activeCaseCountByIO,
  onClose,
  onAssignIO,
}: AssignIOModalProps) {
  const [selectedIOId, setSelectedIOId] = useState<string>('');
  const [isOverrideMode, setIsOverrideMode] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fair random algorithm: finds IOs with the lowest active caseload
  const handleFairRandomAssignment = () => {
    if (availableIOs.length === 0) {
      setError('No active investigating officers available in station roster.');
      return;
    }

    // Sort by caseload ascending
    const sorted = [...availableIOs].sort((a, b) => {
      const countA = activeCaseCountByIO[a.id] || 0;
      const countB = activeCaseCountByIO[b.id] || 0;
      return countA - countB;
    });

    // Lowest caseload count
    const minCount = activeCaseCountByIO[sorted[0].id] || 0;
    const candidates = sorted.filter((io) => (activeCaseCountByIO[io.id] || 0) === minCount);

    // Pick random candidate among lowest
    const pickedIO = candidates[Math.floor(Math.random() * candidates.length)];

    onAssignIO({
      caseId: caseRecord.id,
      ioId: pickedIO.id,
      ioName: pickedIO.full_name,
      ioServiceNo: pickedIO.service_number,
      method: 'RANDOM_FAIR',
    });

    onClose();
  };

  const handleManualOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIOId) {
      setError('Please select an Investigating Officer.');
      return;
    }
    if (!overrideReason.trim()) {
      setError('Mandatory written justification required when overriding fair assignment algorithm.');
      return;
    }

    const targetIO = availableIOs.find((io) => io.id === selectedIOId)!;

    onAssignIO({
      caseId: caseRecord.id,
      ioId: targetIO.id,
      ioName: targetIO.full_name,
      ioServiceNo: targetIO.service_number,
      method: 'OCS_OVERRIDE',
      overrideReason: overrideReason.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-400">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Investigating Officer (IO) Case Assignment</span>
              </h2>
              <p className="text-xs text-slate-400">
                Case: <strong className="text-white">{caseRecord.case_number}</strong> • Anti-Corruption Fair Caseload Engine
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

        {/* Anti-Corruption Notice */}
        <div className="rounded-lg bg-emerald-950/20 border border-emerald-800/60 p-4 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>ANTI-CORRUPTION WORKLOAD-BALANCED ASSIGNMENT</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            To prevent cherry-picking lucrative cases or corrupt routing, the system allocates cases through a workload-aware fair algorithm. Manual OCS override is permitted under strict audit logging and mandatory written justification.
          </p>
        </div>

        {/* Active IO Caseload Table */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Current Station Investigating Officers Caseload:
          </label>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono">
                <tr>
                  <th className="p-2.5">Officer</th>
                  <th className="p-2.5">Service No</th>
                  <th className="p-2.5 text-right">Active Caseload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {availableIOs.map((io) => {
                  const count = activeCaseCountByIO[io.id] || 0;
                  return (
                    <tr key={io.id} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-sans font-medium text-slate-200">{io.full_name}</td>
                      <td className="p-2.5 text-amber-400">{io.service_number}</td>
                      <td className="p-2.5 text-right font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          count > 3 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {count} Cases
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOverrideMode(false)}
            className={`flex-1 p-3 rounded-lg border text-left text-xs transition-all ${
              !isOverrideMode
                ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 font-bold'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span>Fair Random Assignment (Recommended)</span>
              <Shuffle className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-[11px] font-normal text-slate-400">
              Balances load by picking lowest active caseload IO automatically.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsOverrideMode(true)}
            className={`flex-1 p-3 rounded-lg border text-left text-xs transition-all ${
              isOverrideMode
                ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 font-bold'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span>OCS Direct Override</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-[11px] font-normal text-slate-400">
              Station Commander manual allocation with required justification.
            </div>
          </button>
        </div>

        {/* Manual Override Form */}
        {isOverrideMode && (
          <form onSubmit={handleManualOverride} className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Specific IO <span className="text-red-400">*</span></label>
              <select
                required
                value={selectedIOId}
                onChange={(e) => setSelectedIOId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              >
                <option value="">-- Choose Investigating Officer --</option>
                {availableIOs.map((io) => (
                  <option key={io.id} value={io.id}>
                    {io.full_name} ({io.service_number}) • {activeCaseCountByIO[io.id] || 0} active cases
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Override Justification <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="State formal operational justification (e.g. Specialized ballistic qualification required, prior subject relationship disqualification)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm OCS Override Assignment</span>
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="rounded bg-red-950/50 border border-red-800 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Action Button for Fair Random Mode */}
        {!isOverrideMode && (
          <div className="flex justify-end pt-3 border-t border-slate-800 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFairRandomAssignment}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 text-xs transition-colors shadow-lg"
            >
              <Shuffle className="h-4 w-4" />
              <span>Execute Fair Random Assignment</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
