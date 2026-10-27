import { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  CheckSquare, 
  FileText, 
  Settings, 
  KeyRound, 
  ShieldCheck, 
  Clock, 
  UserPlus
} from 'lucide-react';
import type { Officer, AuditLogEntry, ApprovalRequest, StationSettingsData, RoleName } from '@/types';
import { OfficerList } from '@/components/admin/OfficerList';
import { OfficerOnboardingModal } from '@/components/admin/OfficerOnboardingModal';
import { RolesPermissionsView } from '@/components/admin/RolesPermissionsView';
import { StationSettings } from '@/components/admin/StationSettings';
import { LiveAuditLogViewer } from '@/components/admin/LiveAuditLogViewer';
import { ApprovalsInbox } from '@/components/admin/ApprovalsInbox';
import { FirstRunSetup } from '@/components/admin/FirstRunSetup';
import { MfaSetupModal } from '@/components/admin/MfaSetupModal';

const INITIAL_STATION: StationSettingsData = {
  id: 'a0000000-0000-0000-0000-000000000001',
  code: 'RPS-001',
  name: 'Rockport Police Station',
  county: 'Rockport County',
  sub_county: 'Central Sub-County',
  division: 'Rockport Central Division',
  phone: '+25420790100',
  email: 'inquiries@rockportpolice.go.ke',
  custody_clock_limit_hours: 24,
  custody_warning_threshold_1: 12,
  custody_warning_threshold_2: 20,
  ob_number_daily_reset: true,
  cashless_bail_account: 'PAYBILL-522123',
  require_mandatory_mfa: true,
  session_timeout_minutes: 15,
};

const INITIAL_OFFICERS: Officer[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-238914',
    full_name: 'Senior Supt. Joseph Mwangi',
    role_id: 'r0000000-0000-0000-0000-000000000001',
    role_name: 'OCS',
    rank: 'Senior Superintendent of Police',
    email: 'ocs.mwangi@rockportpolice.go.ke',
    phone_number: '+254711000001',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-241088',
    full_name: 'Chief Insp. David Otieno',
    role_id: 'r0000000-0000-0000-0000-000000000002',
    role_name: 'DEPUTY_OCS',
    rank: 'Chief Inspector',
    email: 'deputy.otieno@rockportpolice.go.ke',
    phone_number: '+254711000002',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-248901',
    full_name: 'Sgt. Peter Kamau',
    role_id: 'r0000000-0000-0000-0000-000000000003',
    role_name: 'DUTY_OFFICER_OB_CLERK',
    rank: 'Sergeant',
    email: 'duty.kamau@rockportpolice.go.ke',
    phone_number: '+254711000003',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-250122',
    full_name: 'Cpl. Grace Wambui',
    role_id: 'r0000000-0000-0000-0000-000000000004',
    role_name: 'INVESTIGATING_OFFICER',
    rank: 'Corporal',
    email: 'io.wambui@rockportpolice.go.ke',
    phone_number: '+254711000004',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-244519',
    full_name: 'Sgt. Hassan Abdi',
    role_id: 'r0000000-0000-0000-0000-000000000005',
    role_name: 'CELL_SERGEANT',
    rank: 'Sergeant',
    email: 'cell.abdi@rockportpolice.go.ke',
    phone_number: '+254711000005',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    station_id: INITIAL_STATION.id,
    service_number: 'KPS-253441',
    full_name: 'PC Brian Kiprono',
    role_id: 'r0000000-0000-0000-0000-000000000006',
    role_name: 'RECORDS_CLERK',
    rank: 'Police Constable',
    email: 'records.kiprono@rockportpolice.go.ke',
    phone_number: '+254711000006',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    station_id: INITIAL_STATION.id,
    service_number: 'IPOA-00412',
    full_name: 'Mercy Chebet',
    role_id: 'r0000000-0000-0000-0000-000000000007',
    role_name: 'AUDITOR',
    rank: 'Senior Oversight Inspector',
    email: 'auditor.chebet@ipoa.go.ke',
    phone_number: '+254711000007',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    station_id: INITIAL_STATION.id,
    service_number: 'LQD-TECH-01',
    full_name: 'Antigravity Engineer (Break-Glass)',
    role_id: 'r0000000-0000-0000-0000-000000000008',
    role_name: 'ADMIN_SUPER_OWNER',
    rank: 'Technical Lead',
    email: 'ops@lqdcreatives.com',
    phone_number: '+254711000008',
    status: 'ACTIVE',
    is_active: true,
    mfa_enabled: true,
    last_login_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    created_at: '2026-10-27T00:00:00Z',
  },
];

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    station_id: INITIAL_STATION.id,
    seq_number: 1,
    action_type: 'STATION_GENESIS',
    table_name: 'stations',
    actor_service_number: 'SYSTEM',
    actor_role: 'ADMIN_SUPER_OWNER',
    ip_address: '127.0.0.1',
    previous_log_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    log_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    recorded_at: '2026-10-27T00:00:00Z',
    justification: 'Station genesis initialization for Rockport Police Station (RPS-001)',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    station_id: INITIAL_STATION.id,
    seq_number: 2,
    action_type: 'OCS_BOOTSTRAP',
    table_name: 'officers',
    actor_service_number: 'KPS-238914',
    actor_role: 'OCS',
    ip_address: '10.0.0.1',
    previous_log_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    log_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    recorded_at: '2026-10-27T00:05:00Z',
    justification: 'One-time setup secret redeemed. Station Commander account activated.',
  },
];

const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: 'app-000001',
    station_id: INITIAL_STATION.id,
    action_type: 'ROLE_CHANGE',
    target_resource_type: 'officers',
    target_resource_id: '00000000-0000-0000-0000-000000000003',
    requested_by: '00000000-0000-0000-0000-000000000001',
    requester_name: 'Senior Supt. Joseph Mwangi',
    requester_service_number: 'KPS-238914',
    requested_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    justification: 'Promotion of Sgt. Peter Kamau to Senior Duty Watch Commander.',
    status: 'PENDING',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<'OFFICERS' | 'APPROVALS' | 'AUDIT' | 'ROLES' | 'SETTINGS' | 'SETUP'>('OFFICERS');
  const [officers, setOfficers] = useState<Officer[]>(INITIAL_OFFICERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [stationSettings, setStationSettings] = useState<StationSettingsData>(INITIAL_STATION);
  const [isSetupComplete, setIsSetupComplete] = useState(true); // Default true since seeded
  
  // Active session state (Default OCS)
  const [activeOfficerId, setActiveOfficerId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const activeOfficer = officers.find((o) => o.id === activeOfficerId) || officers[0];
  const activeRole: RoleName = activeOfficer.role_name;

  // Modals
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMfaOpen, setIsMfaOpen] = useState(false);

  // Live session timeout countdown (15 min)
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resetSessionTimer = () => setSecondsRemaining(15 * 60);

  // Helper to chain a new audit log record
  const appendAuditLog = (action: string, justification: string, tableName?: string, recordId?: string) => {
    const lastLog = auditLogs[auditLogs.length - 1];
    const newSeq = auditLogs.length + 1;
    const prevHash = lastLog ? lastLog.log_hash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Quick client-side mock hash for display
    const raw = `${newSeq}:${action}:${activeOfficer.service_number}:${prevHash}:${justification}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0') + 'a7f920bc4d81e35a9012';

    const newLog: AuditLogEntry = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      seq_number: newSeq,
      action_type: action,
      table_name: tableName,
      record_id: recordId,
      actor_id: activeOfficer.id,
      actor_service_number: activeOfficer.service_number,
      actor_role: activeOfficer.role_name,
      ip_address: '10.0.0.12',
      previous_log_hash: prevHash,
      log_hash: hex,
      recorded_at: new Date().toISOString(),
      justification,
    };

    setAuditLogs((prev) => [...prev, newLog]);
  };

  // Actions
  const handleOnboardOfficer = (newOfficer: Officer) => {
    setOfficers((prev) => [newOfficer, ...prev]);
    appendAuditLog(
      'OFFICER_INVITED',
      `OCS generated 48h onboarding invite for ${newOfficer.full_name} (${newOfficer.service_number})`,
      'officers',
      newOfficer.id
    );
  };

  const handleSuspendOfficer = (officerId: string, reason: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, status: 'SUSPENDED', is_active: false } : o))
    );
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'OFFICER_SUSPENDED',
      `Suspension ordered for ${target?.full_name} (${target?.service_number}): ${reason}`,
      'officers',
      officerId
    );
  };

  const handleReactivateOfficer = (officerId: string, reason: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, status: 'ACTIVE', is_active: true } : o))
    );
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'OFFICER_REACTIVATED',
      `Reactivation authorized for ${target?.full_name} (${target?.service_number}): ${reason}`,
      'officers',
      officerId
    );
  };

  const handleRevokeSession = (officerId: string, reason: string) => {
    const target = officers.find((o) => o.id === officerId);
    appendAuditLog(
      'SESSION_REVOKED',
      `Remote terminal session invalidated for ${target?.full_name} (${target?.service_number}): ${reason}`,
      'officers',
      officerId
    );
  };

  const handleRequestRoleChange = (officerId: string) => {
    const target = officers.find((o) => o.id === officerId);
    const newReq: ApprovalRequest = {
      id: crypto.randomUUID(),
      station_id: stationSettings.id,
      action_type: 'ROLE_CHANGE',
      target_resource_type: 'officers',
      target_resource_id: officerId,
      requested_by: activeOfficer.id,
      requester_name: activeOfficer.full_name,
      requester_service_number: activeOfficer.service_number,
      requested_at: new Date().toISOString(),
      justification: `Requested role escalation review for ${target?.full_name} (${target?.service_number})`,
      status: 'PENDING',
    };
    setApprovals((prev) => [newReq, ...prev]);
    appendAuditLog(
      'APPROVAL_REQUESTED',
      `Role change request submitted for ${target?.service_number}`,
      'approvals',
      newReq.id
    );
    setActiveTab('APPROVALS');
  };

  const handleApproveApproval = (approvalId: string, notes: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'APPROVED',
              approved_by: activeOfficer.id,
              approver_name: activeOfficer.full_name,
              approved_at: new Date().toISOString(),
            }
          : a
      )
    );
    appendAuditLog(
      'ROLE_CHANGED',
      `Four-eyes approval granted by ${activeOfficer.service_number}. Notes: ${notes || 'Verified compliant'}`,
      'approvals',
      approvalId
    );
  };

  const handleRejectApproval = (approvalId: string, reason: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'REJECTED',
              approved_by: activeOfficer.id,
              approver_name: activeOfficer.full_name,
              approved_at: new Date().toISOString(),
              rejection_reason: reason,
            }
          : a
      )
    );
    appendAuditLog(
      'APPROVAL_REJECTED',
      `Four-eyes authorization declined by ${activeOfficer.service_number}: ${reason}`,
      'approvals',
      approvalId
    );
  };

  const handleSaveSettings = (updated: StationSettingsData, justification: string) => {
    setStationSettings(updated);
    appendAuditLog('STATION_CONFIG_UPDATED', justification, 'stations', updated.id);
  };

  const handleCompleteSetup = (token: string, ocsEmail: string): boolean => {
    if (token === 'ROCKPORT-OCS-INITIAL-SETUP-SECRET-2026') {
      setIsSetupComplete(true);
      appendAuditLog(
        'OCS_BOOTSTRAP',
        `First-run setup token successfully redeemed for ${ocsEmail}. Setup route permanently locked.`,
        'station_setup_tokens'
      );
      return true;
    }
    return false;
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Institutional Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Station Identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">
                  Rockport Police Station
                </h1>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded">
                  RPS-001
                </span>
                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 px-1.5 py-0.2 text-[10px] font-mono rounded">
                  KENYA POLICE SERVICE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Occurrence Book Management & Anti-Corruption Security Core
              </p>
            </div>
          </div>

          {/* Right Session Controls & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Live Session Timer */}
            <div 
              onClick={resetSessionTimer} 
              title="Click to reset 15-minute activity timer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 cursor-pointer hover:border-slate-700"
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Session: <strong className={secondsRemaining < 180 ? 'text-red-400' : 'text-emerald-400'}>{formatCountdown(secondsRemaining)}</strong></span>
            </div>

            {/* Active Officer Identity Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-200">{activeOfficer.full_name}</div>
                <div className="text-[10px] font-mono text-amber-400 flex items-center justify-end gap-1">
                  <span>{activeOfficer.service_number}</span>
                  <span className="text-slate-500">•</span>
                  <span>{activeOfficer.role_name}</span>
                </div>
              </div>

              {/* Role Switcher for verification */}
              <select
                value={activeOfficerId}
                onChange={(e) => {
                  setActiveOfficerId(e.target.value);
                  resetSessionTimer();
                }}
                title="Switch active logged-in officer profile (To verify RLS & permissions)"
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:border-amber-500 focus:outline-hidden"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.role_name}: {o.full_name.split(' ')[0]} ({o.service_number})
                  </option>
                ))}
              </select>
            </div>

            {/* MFA Setup Trigger */}
            <button
              onClick={() => setIsMfaOpen(true)}
              className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 p-1.5 text-slate-300 hover:text-white transition-colors"
              title="Configure Mandatory TOTP MFA"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('OFFICERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'OFFICERS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Officers & Staff ({officers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors relative ${
                activeTab === 'APPROVALS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Four-Eyes Approvals</span>
              {pendingApprovalsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'APPROVALS' ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-amber-500 text-slate-950 font-bold'
                }`}>
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Immutable Audit Log</span>
            </button>

            <button
              onClick={() => setActiveTab('ROLES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'ROLES'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>RBAC Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'SETTINGS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Station Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('SETUP')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                activeTab === 'SETUP'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>First-Run Bootstrap</span>
            </button>
          </nav>

          {/* Quick Header Actions */}
          {activeTab === 'OFFICERS' && activeRole === 'OCS' && (
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-2 rounded bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 transition-colors shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Onboard Officer (Invite)</span>
            </button>
          )}
        </div>

        {/* View Switcher based on Active Tab */}
        <main>
          {activeTab === 'OFFICERS' && (
            <OfficerList
              officers={officers}
              onSuspend={handleSuspendOfficer}
              onReactivate={handleReactivateOfficer}
              onRevokeSession={handleRevokeSession}
              onRequestRoleChange={handleRequestRoleChange}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'APPROVALS' && (
            <ApprovalsInbox
              approvals={approvals}
              onApprove={handleApproveApproval}
              onReject={handleRejectApproval}
              activeOfficerId={activeOfficer.id}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'AUDIT' && (
            <LiveAuditLogViewer
              auditLogs={auditLogs}
              stationId={stationSettings.id}
            />
          )}

          {activeTab === 'ROLES' && <RolesPermissionsView />}

          {activeTab === 'SETTINGS' && (
            <StationSettings
              settings={stationSettings}
              onSave={handleSaveSettings}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'SETUP' && (
            <FirstRunSetup
              isSetupComplete={isSetupComplete}
              onCompleteSetup={handleCompleteSetup}
            />
          )}
        </main>
      </div>

      {/* Onboarding Modal */}
      <OfficerOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOnboard={handleOnboardOfficer}
        stationId={stationSettings.id}
      />

      {/* MFA Modal */}
      <MfaSetupModal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        onMfaActivated={() => {
          setOfficers((prev) =>
            prev.map((o) => (o.id === activeOfficer.id ? { ...o, mfa_enabled: true } : o))
          );
          appendAuditLog(
            'MFA_ACTIVATED',
            `Mandatory TOTP MFA activated for officer ${activeOfficer.service_number}`,
            'officers',
            activeOfficer.id
          );
        }}
        serviceNumber={activeOfficer.service_number}
      />
    </div>
  );
}

export default App;
