export type RoleName =
  | 'OCS'
  | 'DEPUTY_OCS'
  | 'DUTY_OFFICER_OB_CLERK'
  | 'INVESTIGATING_OFFICER'
  | 'CELL_SERGEANT'
  | 'RECORDS_CLERK'
  | 'AUDITOR'
  | 'ADMIN_SUPER_OWNER';

export type OfficerStatus = 'ACTIVE' | 'SUSPENDED' | 'ON_LEAVE' | 'RETIRED' | 'PENDING_INVITE';

export interface Officer {
  id: string;
  station_id: string;
  service_number: string;
  full_name: string;
  role_id: string;
  role_name: RoleName;
  rank: string;
  phone_number?: string;
  email: string;
  status: OfficerStatus;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  name: RoleName;
  description: string;
  level: number;
  permissions: {
    can_onboard_officers: boolean;
    can_suspend_officers: boolean;
    can_create_ob: boolean;
    can_manage_cells: boolean;
    can_view_audit_log: boolean;
    can_four_eyes_approve: boolean;
    can_manage_evidence: boolean;
    can_access_cases: 'ALL' | 'ASSIGNED_ONLY' | 'NONE';
  };
}

export interface AuditLogEntry {
  id: string;
  station_id: string;
  seq_number: number;
  action_type: string;
  table_name?: string;
  record_id?: string;
  actor_id?: string;
  actor_service_number?: string;
  actor_role?: RoleName;
  ip_address: string;
  new_data?: any;
  previous_log_hash: string;
  log_hash: string;
  recorded_at: string;
  justification?: string;
}

export interface ApprovalRequest {
  id: string;
  station_id: string;
  action_type: 'ROLE_CHANGE' | 'RELEASE_WITHOUT_CHARGE' | 'BAIL_WAIVER' | 'OB_AMENDMENT' | 'EVIDENCE_DISPOSAL' | 'FLAG_RESOLUTION';
  target_resource_type: string;
  target_resource_id: string;
  requested_by: string;
  requester_name: string;
  requester_service_number: string;
  requested_at: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approver_name?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface StationSettingsData {
  id: string;
  code: string;
  name: string;
  county: string;
  sub_county: string;
  division: string;
  phone: string;
  email: string;
  custody_clock_limit_hours: number;
  custody_warning_threshold_1: number; // 12h
  custody_warning_threshold_2: number; // 20h
  ob_number_daily_reset: boolean;
  cashless_bail_account: string;
  require_mandatory_mfa: boolean;
  session_timeout_minutes: number;
}
