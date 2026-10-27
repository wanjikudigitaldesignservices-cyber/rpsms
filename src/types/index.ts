export type RoleName =
  | 'OCS'
  | 'DEPUTY_OCS'
  | 'DUTY_OFFICER_OB_CLERK'
  | 'INVESTIGATING_OFFICER'
  | 'CELL_SERGEANT'
  | 'RECORDS_CLERK'
  | 'AUDITOR'
  | 'DPP'
  | 'ODPP_PROSECUTOR'
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

/* =========================================================================
   PHASE 2 TYPES: OB, CUSTODY, PERSONS, MUGSHOTS, CELLS, PROPERTY, WELFARE
   ========================================================================= */

export type OBCategory =
  | 'CRIMINAL'
  | 'TRAFFIC'
  | 'INCIDENT'
  | 'REPORT'
  | 'DIRECTIVE'
  | 'PUBLIC_COMPLAINT'
  | 'LOST_PROPERTY'
  | 'OTHER';

export type OBStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'AMENDED'
  | 'UNDER_INVESTIGATION'
  | 'CLOSED'
  | 'COURT_PENDING';

export interface OBAmendment {
  id: string;
  ob_entry_id: string;
  station_id: string;
  amendment_ob_number: string;
  reason: string;
  amendment_narrative: string;
  proposed_by: string;
  proposer_name: string;
  proposer_service_no: string;
  approved_by?: string;
  approver_name?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approval_notes?: string;
  previous_hash: string;
  entry_hash: string;
  created_at: string;
  approved_at?: string;
}

export interface OBEntry {
  id: string;
  station_id: string;
  ob_number: string;
  seq_number: number;
  incident_date: string;
  entry_timestamp: string;
  category: OBCategory;
  subject: string;
  narrative: string;
  recorded_by: string;
  recorded_by_name: string;
  recorded_by_service_no: string;
  reporting_person_name?: string;
  reporting_person_phone?: string;
  reporting_person_phone_hash?: string;
  previous_entry_hash: string;
  entry_hash: string;
  status: OBStatus;
  is_amended: boolean;
  amendments?: OBAmendment[];
  created_at: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type RiskLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'ESCAPE_RISK' | 'MEDICAL_ATTENTION';
export type IdentifierType = 'NATIONAL_ID' | 'PASSPORT' | 'PHONE_NUMBER' | 'ALIEN_ID' | 'MILITARY_ID';

export interface PersonIdentifier {
  id: string;
  person_id: string;
  identifier_type: IdentifierType;
  id_value_masked: string;
  id_value_hash: string; // blind index SHA-256
  is_primary: boolean;
  created_at: string;
}

export interface Mugshot {
  id: string;
  person_id: string;
  station_id: string;
  view_angle: 'FRONT' | 'LEFT' | 'RIGHT' | 'DISTINGUISHING_MARK';
  image_data_url: string;
  sha256_hash: string;
  exif_stripped: boolean;
  taken_at: string;
  taken_by_service_no: string;
}

export interface NextOfKin {
  id: string;
  person_id: string;
  name: string;
  relationship: string;
  phone: string;
  physical_address?: string;
}

export interface Person {
  id: string;
  station_id: string;
  full_name: string;
  alias?: string;
  gender: Gender;
  date_of_birth?: string;
  nationality: string;
  physical_address?: string;
  distinguishing_marks?: string;
  risk_level: RiskLevel;
  identifiers: PersonIdentifier[];
  mugshots: Mugshot[];
  next_of_kin?: NextOfKin[];
  created_at: string;
  prior_arrests_count?: number;
  prior_charges?: string[];
}

export type CellType = 'MALE' | 'FEMALE' | 'JUVENILE_MALE' | 'JUVENILE_FEMALE' | 'ISOLATION' | 'HOLDING';

export interface Cell {
  id: string;
  station_id: string;
  cell_number: string;
  cell_name: string;
  cell_type: CellType;
  capacity: number;
  current_occupants: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
}

export type ExitReason =
  | 'RELEASED_WITHOUT_CHARGE'
  | 'POLICE_BAIL'
  | 'COURT_BAIL'
  | 'CHARGED_TO_COURT'
  | 'TRANSFERRED'
  | 'HOSPITAL'
  | 'DECEASED';

export interface CustodyRecord {
  id: string;
  station_id: string;
  person_id: string;
  person: Person;
  ob_entry_id: string;
  ob_number: string;
  cell_id: string;
  cell_number: string;
  book_in_time: string;
  arrest_reason: string;
  arresting_officer_name: string;
  arresting_officer_service_no: string;
  booked_in_by: string;
  booked_in_by_service_no: string;
  rights_read: boolean;
  lawyer_notified: boolean;
  next_of_kin_notified: boolean;
  health_status_at_entry: string;
  is_in_custody: boolean;
  custody_limit_hours: number;
  countdown_start: string;
  alert_12h_sent: boolean;
  alert_20h_sent: boolean;
  breach_flagged: boolean;
  exit_time?: string;
  exit_reason?: ExitReason;
  exit_notes?: string;
  exit_authorized_by?: string;
  exit_authorized_by_service_no?: string;
  exit_approval_id?: string;
  property_items_count: number;
  welfare_logs_count: number;
}

export interface PropertyItem {
  id: string;
  custody_record_id: string;
  item_description: string;
  category: 'VALUABLES' | 'CASH' | 'PHONE' | 'BELT_SHOELACES' | 'MEDICATION' | 'CLOTHING' | 'OTHER';
  quantity: number;
  condition_at_booking: string;
  photo_path?: string;
  booked_by_service_no: string;
  status: 'HELD' | 'RETURNED' | 'FORFEITED' | 'TRANSFERRED_TO_COURT' | 'UNRETURNED_FLAGGED';
  return_time?: string;
  returned_by_service_no?: string;
  prisoner_signature_captured: boolean;
  unreturned_reason?: string;
  created_at: string;
}

export interface WelfareLog {
  id: string;
  custody_record_id: string;
  log_type: 'MEAL' | 'MEDICAL_CHECK' | 'MEDICATION_ADMINISTERED' | 'LAWYER_VISIT' | 'PHYSICAL_INSPECTION' | 'COURT_PREPARATION';
  details: string;
  conducted_by_service_no: string;
  external_party_name?: string;
  logged_at: string;
}

export interface VisitorLog {
  id: string;
  custody_record_id: string;
  visitor_name: string;
  relationship: string;
  purpose: string;
  time_in: string;
  time_out?: string;
  logged_by_service_no: string;
}

/* =========================================================================
   PHASE 3 TYPES: CASES, EVIDENCE, CASHLESS BAIL, ARMORY & PATROL FLEET
   ========================================================================= */

export type CaseStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'INVESTIGATION'
  | 'FILE_CLOSED_PENDING_APPROVAL'
  | 'CLOSED_NO_FURTHER_ACTION'
  | 'COURT_PROCEEDINGS'
  | 'RESOLVED_CONVICTION'
  | 'RESOLVED_ACQUITTAL';

export type CaseAssignmentMethod = 'RANDOM_FAIR' | 'OCS_OVERRIDE';

export interface CaseRecord {
  id: string;
  station_id: string;
  ob_entry_id: string;
  ob_number: string;
  case_number: string;
  crime_category: string;
  penal_code_section?: string;
  title: string;
  description: string;
  status: CaseStatus;
  assigned_io_id?: string;
  assigned_io_name?: string;
  assigned_io_service_no?: string;
  assigned_at?: string;
  assignment_method: CaseAssignmentMethod;
  ocs_override_reason?: string;
  court_date?: string;
  court_name?: string;
  created_at: string;
  evidence_count: number;
  notes_count: number;
}

export type CaseNoteType =
  | 'INVESTIGATION_UPDATE'
  | 'INTERVIEW_SUMMARY'
  | 'SCENE_REPORT'
  | 'DIRECTIVE'
  | 'COURT_UPDATE';

export interface CaseNote {
  id: string;
  case_id: string;
  author_id: string;
  author_name: string;
  author_service_no: string;
  note_type: CaseNoteType;
  content: string;
  is_privileged: boolean;
  created_at: string;
}

export type EvidenceCategory =
  | 'FIREARM'
  | 'NARCOTICS'
  | 'DIGITAL'
  | 'CLOTHING'
  | 'DOCUMENT'
  | 'BIOLOGICAL'
  | 'CURRENCY'
  | 'OTHER';

export type EvidenceStatus =
  | 'IN_STORE'
  | 'IN_ANALYSIS'
  | 'IN_COURT'
  | 'DISPOSAL_PENDING_APPROVAL'
  | 'DISPOSED'
  | 'RELEASED_TO_OWNER';

export interface EvidenceItem {
  id: string;
  station_id: string;
  case_id: string;
  case_number: string;
  exhibit_number: string;
  qr_code_identifier: string;
  description: string;
  category: EvidenceCategory;
  storage_location: string;
  current_custodian_id: string;
  current_custodian_name: string;
  current_custodian_service_no: string;
  status: EvidenceStatus;
  initial_photo_path?: string;
  disposal_approval_id?: string;
  court_order_ref?: string;
  created_at: string;
  transfers_count: number;
}

export interface EvidenceTransfer {
  id: string;
  evidence_id: string;
  transferred_from_id: string;
  transferred_from_name: string;
  transferred_from_service_no: string;
  transferred_to_id: string;
  transferred_to_name: string;
  transferred_to_service_no: string;
  transfer_reason: string;
  transfer_timestamp: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

export type BailType = 'POLICE_BAIL' | 'COURT_BAIL' | 'BOND';
export type BailStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FORFEITED' | 'WAIVER_REQUESTED' | 'WAIVED';

export interface BailRecord {
  id: string;
  custody_record_id: string;
  station_id: string;
  detainee_name: string;
  ob_number: string;
  bail_type: BailType;
  amount: number;
  is_free_bail_notice_acknowledged: boolean;
  status: BailStatus;
  receipt_number?: string;
  waiver_reason?: string;
  waiver_approved_by?: string;
  waiver_approval_id?: string;
  created_at: string;
  paid_at?: string;
}

export interface CashlessPayment {
  id: string;
  bail_record_id: string;
  station_id: string;
  amount: number;
  payer_phone: string;
  payer_name: string;
  gateway: 'INTASEND' | 'MPESA_DIRECT';
  transaction_reference: string;
  mpesa_receipt_number: string;
  idempotency_key: string;
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED';
  official_account_dest: string;
  created_at: string;
  completed_at?: string;
}

export type WeaponCondition = 'SERVICEABLE' | 'NEEDS_MAINTENANCE' | 'UNSERVICEABLE';
export type WeaponStatus = 'IN_ARMORY' | 'ISSUED' | 'MAINTENANCE' | 'BALLISTICS_TESTING';

export interface ArmoryWeapon {
  id: string;
  station_id: string;
  weapon_type: string;
  serial_number: string;
  rounds_capacity: number;
  condition: WeaponCondition;
  status: WeaponStatus;
  issued_to_officer_id?: string;
  issued_to_officer_name?: string;
  issued_to_service_no?: string;
  issued_at?: string;
  issued_rounds: number;
  returned_rounds: number;
  returned_at?: string;
  armorer_service_no?: string;
  shift_end_reconciled: boolean;
  discrepancy_flagged: boolean;
}

export type VehicleStatus = 'ACTIVE' | 'PATROL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface PatrolVehicle {
  id: string;
  station_id: string;
  registration_number: string;
  vehicle_model: string;
  vehicle_type: 'PATROL_PICKUP' | 'STATION_CAR' | 'PRISONER_VAN' | 'MOTORCYCLE';
  current_mileage: number;
  fuel_type: 'DIESEL' | 'PETROL';
  status: VehicleStatus;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  vehicle_reg: string;
  officer_service_no: string;
  fuel_litres: number;
  cost_kes: number;
  mileage_at_fueling: number;
  fuel_station: string;
  receipt_number: string;
  consumption_anomaly_flagged: boolean;
  logged_at: string;
}

/* =========================================================================
   SENTINEL AI & PALANTIR-STYLE LINK INTELLIGENCE TYPES
   ========================================================================= */

export type NavigationModule =
  | 'OB_ENTRIES'
  | 'BOOK_IN'
  | 'CUSTODY'
  | 'CASES'
  | 'AI_GRAPH'
  | 'EVIDENCE'
  | 'BAIL'
  | 'LOGISTICS'
  | 'OFFICERS'
  | 'APPROVALS'
  | 'AUDIT'
  | 'ROLES'
  | 'SETTINGS'
  | 'SETUP';

export interface EntityLinkNode {
  id: string;
  label: string;
  type: 'SUSPECT' | 'CASE' | 'PHONE' | 'VEHICLE' | 'EXHIBIT' | 'LOCATION';
  metadata: Record<string, string>;
  riskLevel?: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
}

export interface EntityLinkEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  confidence: number;
}

export interface SyndicateCluster {
  id: string;
  syndicateName: string;
  modusOperandi: string;
  primaryArea: string;
  casesCount: number;
  linkedSuspectsCount: number;
  confidenceScore: number;
  threatLevel: 'TIER_1_CRITICAL' | 'TIER_2_ELEVATED' | 'MONITORED';
  nodes: EntityLinkNode[];
  edges: EntityLinkEdge[];
}

export interface StatutoryRecommendation {
  penalSection: string;
  offenseTitle: string;
  statute: string;
  confidence: number;
  rationale: string;
}

export interface OCSHandoverBrief {
  generatedAt: string;
  generatingOfficerServiceNo: string;
  totalOBEntries12h: number;
  detaineesUnder24hRisk: number;
  pendingFourEyesApprovals: number;
  armoryDeficitsCount: number;
  auditChainIntegrity: '100% VERIFIED' | 'TAMPER_ALERT';
  summaryNarrative: string;
  actionItems: string[];
}
