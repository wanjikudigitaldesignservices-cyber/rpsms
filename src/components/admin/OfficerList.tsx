import { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  UserX, 
  UserCheck, 
  LogOut, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import type { Officer } from '@/types';

interface Props {
  officers: Officer[];
  onSuspend: (officerId: string, reason: string) => void;
  onReactivate: (officerId: string, reason: string) => void;
  onRevokeSession: (officerId: string, reason: string) => void;
  onRequestRoleChange: (officerId: string) => void;
  activeRole: string;
}

export const OfficerList: React.FC<Props> = ({
  officers,
  onSuspend,
  onReactivate,
  onRevokeSession,
  onRequestRoleChange,
  activeRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'REACTIVATE' | 'REVOKE' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredOfficers = officers.filter(
    (o) =>
      o.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.service_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleActionConfirm = () => {
    if (!selectedOfficer || !actionType) return;
    if (reason.trim().length < 8) {
      setError('A written disciplinary or administrative justification is mandatory (min 8 characters).');
      return;
    }

    if (actionType === 'SUSPEND') {
      onSuspend(selectedOfficer.id, reason.trim());
    } else if (actionType === 'REACTIVATE') {
      onReactivate(selectedOfficer.id, reason.trim());
    } else if (actionType === 'REVOKE') {
      onRevokeSession(selectedOfficer.id, reason.trim());
    }

    setSelectedOfficer(null);
    setActionType(null);
    setReason('');
    setError(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OCS':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/50';
      case 'DEPUTY_OCS':
        return 'bg-blue-950/80 text-blue-300 border-blue-600/50';
      case 'AUDITOR':
        return 'bg-purple-950/80 text-purple-300 border-purple-600/50';
      case 'DUTY_OFFICER_OB_CLERK':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';
      case 'INVESTIGATING_OFFICER':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50';
      case 'CELL_SERGEANT':
        return 'bg-orange-950/80 text-orange-300 border-orange-600/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, KPS number, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>Total Officers: <span className="font-semibold text-slate-100">{officers.length}</span></div>
          <div>Active: <span className="font-semibold text-emerald-400">{officers.filter((o) => o.status === 'ACTIVE').length}</span></div>
          <div>Suspended: <span className="font-semibold text-rose-400">{officers.filter((o) => o.status === 'SUSPENDED').length}</span></div>
        </div>
      </div>

      {/* Dense Institutional Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Service Number</th>
              <th className="py-3 px-4">Officer Details</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">System Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Security / MFA</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Station Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filteredOfficers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                  No officers found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredOfficers.map((officer) => (
                <tr key={officer.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-amber-400 tracking-wide">
                    {officer.service_number}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="font-medium text-slate-100">{officer.full_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{officer.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans">
                    {officer.rank}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeColor(officer.role_name)}`}>
                      {officer.role_name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {officer.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-600/40 px-2 py-0.5 text-[10px] text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE
                      </span>
                    )}
                    {officer.status === 'SUSPENDED' && (
                      <span className="inline-flex items-center gap-1 rounded bg-red-950/60 border border-red-600/40 px-2 py-0.5 text-[10px] text-red-400">
                        <ShieldAlert className="h-3 w-3" />
                        SUSPENDED
                      </span>
                    )}
                    {officer.status === 'PENDING_INVITE' && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 text-[10px] text-amber-400">
                        <Clock className="h-3 w-3" />
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {officer.mfa_enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        TOTP Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        MFA Required
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-400 font-sans">
                    {officer.last_login_at
                      ? new Date(officer.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today'
                      : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-sans">
                      {activeRole === 'OCS' && (
                        <>
                          {officer.status === 'ACTIVE' ? (
                            <button
                              title="Suspend Officer"
                              onClick={() => {
                                setSelectedOfficer(officer);
                                setActionType('SUSPEND');
                              }}
                              className="rounded border border-red-800/60 bg-red-950/40 p-1 text-red-400 hover:bg-red-900/60 transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              title="Reactivate Officer"
                              onClick={() => {
                                setSelectedOfficer(officer);
                                setActionType('REACTIVATE');
                              }}
                              className="rounded border border-emerald-800/60 bg-emerald-950/40 p-1 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            title="Revoke Active Session"
                            onClick={() => {
                              setSelectedOfficer(officer);
                              setActionType('REVOKE');
                            }}
                            className="rounded border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </button>

                          <button
                            title="Request Role Change (Four-Eyes)"
                            onClick={() => onRequestRoleChange(officer.id)}
                            className="rounded border border-amber-800/50 bg-amber-950/40 p-1 text-amber-400 hover:bg-amber-900/60 transition-colors"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Disciplinary / Administrative Action Confirmation Modal */}
      {selectedOfficer && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded ${actionType === 'SUSPEND' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  {actionType === 'SUSPEND' && 'Suspend Officer Privileges'}
                  {actionType === 'REACTIVATE' && 'Reactivate Officer Account'}
                  {actionType === 'REVOKE' && 'Revoke Remote Session'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target: <span className="text-slate-200 font-semibold">{selectedOfficer.full_name} ({selectedOfficer.service_number})</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Mandatory Written Justification <span className="text-amber-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify administrative order or disciplinary incident reference number..."
                className="w-full rounded border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                This statement is permanently cryptographically chained in the station audit log.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedOfficer(null);
                  setActionType(null);
                  setError(null);
                }}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white transition-colors ${
                  actionType === 'SUSPEND' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm & Log Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
