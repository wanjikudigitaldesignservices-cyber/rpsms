import { useState } from 'react';
import { Check, Clock, UserCheck, ShieldAlert } from 'lucide-react';
import type { ApprovalRequest } from '@/types';

interface Props {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string, notes: string) => void;
  onReject: (approvalId: string, reason: string) => void;
  activeOfficerId: string;
  activeRole: string;
}

export const ApprovalsInbox: React.FC<Props> = ({
  approvals,
  onApprove,
  onReject,
  activeOfficerId,
  activeRole,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const handleConfirm = () => {
    if (!selectedApproval || !actionType) return;
    setError(null);

    // CRITICAL FOUR-EYES ANTI-CORRUPTION RULE:
    if (selectedApproval.requested_by === activeOfficerId) {
      setError('FOUR-EYES SECURITY VIOLATION: You are the requester of this sensitive action. Self-approval is strictly forbidden by database constraint.');
      return;
    }

    if (!['OCS', 'DEPUTY_OCS'].includes(activeRole)) {
      setError('Forbidden: Only Station Command (OCS or Deputy OCS) can grant authorization.');
      return;
    }

    if (actionType === 'APPROVE') {
      onApprove(selectedApproval.id, notes.trim());
    } else {
      if (notes.trim().length < 8) {
        setError('A written rejection justification is required (min 8 characters).');
        return;
      }
      onReject(selectedApproval.id, notes.trim());
    }

    setSelectedApproval(null);
    setActionType(null);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Anti-Corruption Four-Eyes Approvals Queue</h3>
            <p className="text-xs text-slate-400">
              Mandatory dual-officer sign-off on sensitive operations (role changes, amendments, discharges). Requester can never approve self.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Dual-Authorization Requests ({pendingApprovals.length})
          </h4>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-500 text-xs">
            No pending approvals in queue. Station command operational integrity verified.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingApprovals.map((req) => {
              const isRequester = req.requested_by === activeOfficerId;
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-950 border border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        {req.action_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        Target Resource: <span className="font-mono text-slate-200">{req.target_resource_type}</span>
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      Requested: {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-slate-300 font-medium">
                      Initiating Officer: <span className="text-slate-100 font-bold">{req.requester_name}</span> ({req.requester_service_number})
                    </div>
                    <div className="text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80 italic font-sans">
                      &quot;{req.justification}&quot;
                    </div>
                  </div>

                  {/* Anti-Corruption Self-Approval Guard Notice */}
                  {isRequester ? (
                    <div className="flex items-center gap-2 rounded bg-amber-950/40 border border-amber-800/50 p-2.5 text-xs text-amber-300">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        <strong>Four-Eyes Protocol Active:</strong> You initiated this request. A distinct second officer (e.g. Deputy OCS or OCS) must inspect and approve.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Distinct officer verified. Authorized to approve.
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedApproval(req);
                            setActionType('REJECT');
                          }}
                          className="rounded border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/60 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApproval(req);
                            setActionType('APPROVE');
                          }}
                          className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Approve Request
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved History */}
      {resolvedApprovals.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recently Resolved Approvals ({resolvedApprovals.length})
          </h4>
          <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800 bg-slate-900">
            {resolvedApprovals.map((req) => (
              <div key={req.id} className="p-3 text-xs flex items-center justify-between gap-4 font-mono">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${
                    req.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-slate-200 font-sans font-semibold">{req.action_type}</span>
                  <span className="text-slate-500 ml-2">by {req.approver_name || 'Authorized Second Officer'}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(req.approved_at || req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      {selectedApproval && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase">
              {actionType === 'APPROVE' ? 'Grant Second-Officer Authorization' : 'Reject Authorization Request'}
            </h3>

            {error && (
              <div className="rounded border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                {actionType === 'APPROVE' ? 'Approval Notes (Optional)' : 'Mandatory Reason for Rejection *'}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter formal sign-off comments..."
                className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedApproval(null);
                  setActionType(null);
                  setError(null);
                }}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                Confirm Sign-Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
