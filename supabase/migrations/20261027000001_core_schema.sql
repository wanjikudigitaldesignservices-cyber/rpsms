-- Migration: 20261027000001_core_schema.sql
-- Rockport Police Station Management System (RPSMS) - Full Normalized Schema
-- Standards: UUID PKs, FK constraints, CHECK constraints, Indexes on FKs & search cols,
-- Soft-deletes, created_at/updated_at/created_by, PII encrypted + blind-index hash columns.

-- Native PostgreSQL 13+ includes gen_random_uuid() and sha256() in core


-- 1. STATIONS
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    county TEXT NOT NULL,
    sub_county TEXT NOT NULL,
    division TEXT NOT NULL,
    station_type TEXT NOT NULL DEFAULT 'Police Station' CHECK (station_type IN ('Police Station', 'Police Post', 'Patrol Base')),
    ob_prefix TEXT NOT NULL DEFAULT 'OB',
    daily_ob_reset BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    address TEXT,
    settings JSONB NOT NULL DEFAULT '{"max_custody_hours": 24, "alert_12h_enabled": true, "alert_20h_enabled": true}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 2. ROLES (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. OFFICERS (PROFILES)
CREATE TABLE IF NOT EXISTS officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    service_number TEXT NOT NULL UNIQUE,
    national_id_hash TEXT NOT NULL UNIQUE,
    national_id_encrypted TEXT NOT NULL,
    full_name TEXT NOT NULL,
    rank TEXT NOT NULL CHECK (rank IN (
        'Inspector General',
        'Senior Assistant Inspector General',
        'Assistant Inspector General',
        'Senior Superintendent of Police',
        'Superintendent of Police',
        'Assistant Superintendent of Police',
        'Chief Inspector',
        'Inspector',
        'Senior Sergeant',
        'Sergeant',
        'Corporal',
        'Constable'
    )),
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    phone_encrypted TEXT NOT NULL,
    phone_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_INVITE', 'ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'RETIRED')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret_encrypted TEXT,
    webauthn_credential_id TEXT,
    current_session_token TEXT,
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 4. OFFICER INVITES
CREATE TABLE IF NOT EXISTS officer_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    service_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    rank TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    invite_token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 5. OCCURRENCE BOOK (OB ENTRIES)
CREATE TABLE IF NOT EXISTS ob_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    ob_number TEXT NOT NULL UNIQUE,
    seq_number INTEGER NOT NULL,
    incident_date DATE NOT NULL,
    entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    category TEXT NOT NULL CHECK (category IN (
        'CRIMINAL', 'TRAFFIC', 'INCIDENT', 'REPORT', 'DIRECTIVE', 'PUBLIC_COMPLAINT', 'LOST_PROPERTY', 'OTHER'
    )),
    subject TEXT NOT NULL,
    narrative TEXT NOT NULL,
    recorded_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    reporting_person_name TEXT,
    reporting_person_phone_hash TEXT,
    previous_entry_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'AMENDED', 'UNDER_INVESTIGATION', 'CLOSED', 'COURT_PENDING')),
    is_amended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 6. OB AMENDMENTS
CREATE TABLE IF NOT EXISTS ob_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ob_entry_id UUID NOT NULL REFERENCES ob_entries(id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    amendment_ob_number TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    amendment_narrative TEXT NOT NULL,
    proposed_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approval_notes TEXT,
    previous_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    CONSTRAINT check_ob_amendment_four_eyes CHECK (proposed_by != approved_by)
);

-- 7. PERSONS (BROUGHT-IN / ARRESTED / REPORTED PERSONS)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    alias TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth DATE,
    nationality TEXT NOT NULL DEFAULT 'Kenyan',
    physical_address TEXT,
    distinguishing_marks TEXT,
    risk_level TEXT NOT NULL DEFAULT 'NORMAL' CHECK (risk_level IN ('LOW', 'NORMAL', 'HIGH', 'ESCAPE_RISK', 'MEDICAL_ATTENTION')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 8. PERSON IDENTIFIERS (ENCRYPTED + BLIND INDEX)
CREATE TABLE IF NOT EXISTS person_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('NATIONAL_ID', 'PASSPORT', 'PHONE_NUMBER', 'ALIEN_ID', 'MILITARY_ID')),
    id_value_encrypted TEXT NOT NULL,
    id_value_hash TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. MUGSHOTS
CREATE TABLE IF NOT EXISTS mugshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    view_angle TEXT NOT NULL CHECK (view_angle IN ('FRONT', 'LEFT', 'RIGHT', 'DISTINGUISHING_MARK')),
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    exif_stripped BOOLEAN NOT NULL DEFAULT true,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    taken_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 10. NEXT OF KIN
CREATE TABLE IF NOT EXISTS next_of_kin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_encrypted TEXT NOT NULL,
    phone_hash TEXT NOT NULL,
    physical_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. CELLS
CREATE TABLE IF NOT EXISTS cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    cell_number TEXT NOT NULL,
    cell_type TEXT NOT NULL CHECK (cell_type IN ('MALE', 'FEMALE', 'JUVENILE_MALE', 'JUVENILE_FEMALE', 'ISOLATION', 'HOLDING')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (station_id, cell_number)
);

-- 12. CUSTODY RECORDS (24-HOUR CLOCK, ARTICLE 49 RIGHTS)
CREATE TABLE IF NOT EXISTS custody_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
    ob_entry_id UUID NOT NULL REFERENCES ob_entries(id) ON DELETE RESTRICT,
    cell_id UUID REFERENCES cells(id) ON DELETE RESTRICT,
    book_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    arrest_reason TEXT NOT NULL,
    arresting_officer_name TEXT NOT NULL,
    arresting_officer_service_no TEXT NOT NULL,
    booked_in_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    rights_read BOOLEAN NOT NULL DEFAULT true,
    lawyer_notified BOOLEAN NOT NULL DEFAULT false,
    next_of_kin_notified BOOLEAN NOT NULL DEFAULT false,
    health_status_at_entry TEXT,
    is_in_custody BOOLEAN NOT NULL DEFAULT true,
    custody_limit_hours INTEGER NOT NULL DEFAULT 24,
    countdown_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    alert_12h_sent BOOLEAN NOT NULL DEFAULT false,
    alert_20h_sent BOOLEAN NOT NULL DEFAULT false,
    breach_flagged BOOLEAN NOT NULL DEFAULT false,
    exit_time TIMESTAMPTZ,
    exit_reason TEXT CHECK (exit_reason IN (
        'RELEASED_WITHOUT_CHARGE', 'POLICE_BAIL', 'COURT_BAIL', 'CHARGED_TO_COURT', 'TRANSFERRED', 'HOSPITAL', 'DECEASED'
    )),
    exit_authorized_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    exit_approval_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. PROPERTY REGISTER
CREATE TABLE IF NOT EXISTS property_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custody_record_id UUID NOT NULL REFERENCES custody_records(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('VALUABLES', 'CASH', 'PHONE', 'BELT_SHOELACES', 'MEDICATION', 'CLOTHING', 'OTHER')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    condition_at_booking TEXT NOT NULL,
    photo_path TEXT,
    booked_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RETURNED', 'FORFEITED', 'TRANSFERRED_TO_COURT', 'UNRETURNED_FLAGGED')),
    return_time TIMESTAMPTZ,
    returned_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    prisoner_signature_captured BOOLEAN NOT NULL DEFAULT false,
    unreturned_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. WELFARE LOGS
CREATE TABLE IF NOT EXISTS welfare_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custody_record_id UUID NOT NULL REFERENCES custody_records(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL CHECK (log_type IN ('MEAL', 'MEDICAL_CHECK', 'MEDICATION_ADMINISTERED', 'LAWYER_VISIT', 'PHYSICAL_INSPECTION', 'COURT_PREPARATION')),
    details TEXT NOT NULL,
    conducted_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    external_party_name TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. VISITOR LOGS
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custody_record_id UUID NOT NULL REFERENCES custody_records(id) ON DELETE CASCADE,
    visitor_name TEXT NOT NULL,
    visitor_id_hash TEXT NOT NULL,
    visitor_id_encrypted TEXT NOT NULL,
    relationship TEXT NOT NULL,
    purpose TEXT NOT NULL,
    time_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_out TIMESTAMPTZ,
    logged_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 16. CASES
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    ob_entry_id UUID NOT NULL REFERENCES ob_entries(id) ON DELETE RESTRICT,
    case_number TEXT NOT NULL UNIQUE,
    crime_category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'ASSIGNED', 'INVESTIGATION', 'FILE_CLOSED_PENDING_APPROVAL', 'CLOSED_NO_FURTHER_ACTION', 'COURT_PROCEEDINGS', 'RESOLVED_CONVICTION', 'RESOLVED_ACQUITTAL'
    )),
    assigned_io_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ,
    assignment_method TEXT CHECK (assignment_method IN ('RANDOM_FAIR', 'OCS_OVERRIDE')),
    ocs_override_reason TEXT,
    court_date DATE,
    court_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 17. CASE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('PRIMARY_IO', 'ASSISTING_OFFICER', 'SUPERVISING_OFFICER')),
    assignment_mode TEXT NOT NULL CHECK (assignment_mode IN ('RANDOM_FAIR', 'OCS_DIRECT')),
    reason TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. CASE NOTES
CREATE TABLE IF NOT EXISTS case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    note_type TEXT NOT NULL CHECK (note_type IN ('INVESTIGATION_UPDATE', 'INTERVIEW_SUMMARY', 'SCENE_REPORT', 'DIRECTIVE', 'COURT_UPDATE')),
    content TEXT NOT NULL,
    is_privileged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. EVIDENCE ITEMS
CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
    exhibit_number TEXT NOT NULL UNIQUE,
    qr_code_identifier TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('FIREARM', 'NARCOTICS', 'DIGITAL', 'CLOTHING', 'DOCUMENT', 'BIOLOGICAL', 'CURRENCY', 'OTHER')),
    storage_location TEXT NOT NULL,
    initial_photo_path TEXT NOT NULL,
    current_custodian_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'IN_STORE' CHECK (status IN ('IN_STORE', 'IN_ANALYSIS', 'IN_COURT', 'DISPOSAL_PENDING_APPROVAL', 'DISPOSED', 'RELEASED_TO_OWNER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 20. EVIDENCE TRANSFERS (CHAIN OF CUSTODY)
CREATE TABLE IF NOT EXISTS evidence_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
    transferred_from_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    transferred_to_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    transfer_reason TEXT NOT NULL,
    photo_verification_path TEXT NOT NULL,
    transfer_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    CONSTRAINT check_evidence_transfer_officer CHECK (transferred_from_id != transferred_to_id)
);

-- 21. BAIL RECORDS
CREATE TABLE IF NOT EXISTS bail_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custody_record_id UUID NOT NULL REFERENCES custody_records(id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    bail_type TEXT NOT NULL CHECK (bail_type IN ('POLICE_BAIL', 'COURT_BAIL', 'BOND')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    is_free_bail_notice_acknowledged BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REFUNDED', 'FORFEITED', 'WAIVER_REQUESTED', 'WAIVED')),
    receipt_number TEXT UNIQUE,
    waiver_reason TEXT,
    waiver_approved_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    waiver_approval_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 22. PAYMENTS (CASHLESS INTASEND / M-PESA)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bail_record_id UUID REFERENCES bail_records(id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    payment_category TEXT NOT NULL CHECK (payment_category IN ('CASHLESS_BAIL', 'POLICE_FINE', 'ABSTRACT_FEE', 'OTHER')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payer_phone TEXT NOT NULL,
    payer_name TEXT NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'INTASEND' CHECK (gateway IN ('INTASEND', 'MPESA_DIRECT')),
    transaction_reference TEXT NOT NULL UNIQUE,
    mpesa_receipt_number TEXT UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
    official_account_dest TEXT NOT NULL,
    raw_gateway_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 23. COMPLAINTS (PUBLIC PORTAL & OVERSIGHT)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    tracking_code TEXT NOT NULL UNIQUE,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    complainant_name TEXT,
    complainant_phone_encrypted TEXT,
    complainant_phone_hash TEXT,
    complaint_type TEXT NOT NULL CHECK (complaint_type IN ('OFFICER_MISCONDUCT', 'BRIBE_SOLICITATION', 'UNLAWFUL_DETENTION', 'SERVICE_DELAY', 'PROPERTY_DAMAGE', 'OTHER')),
    against_officer_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    is_against_ocs BOOLEAN NOT NULL DEFAULT false, -- Hidden from OCS view
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ESCALATED_TO_AUDITOR', 'RESOLVED', 'DISMISSED')),
    resolution_summary TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. COMPLAINT UPDATES
CREATE TABLE IF NOT EXISTS complaint_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. DUTY ROSTER
CREATE TABLE IF NOT EXISTS duty_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('MORNING', 'AFTERNOON', 'NIGHT', 'SPECIAL_DUTY', 'OFF_DUTY')),
    post_assigned TEXT NOT NULL,
    attendance_status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (attendance_status IN ('SCHEDULED', 'PRESENT', 'ABSENT', 'ON_LEAVE', 'SICK')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    handover_note TEXT,
    handover_acknowledged_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    handover_acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT
);

-- 26. ARMS REGISTER
CREATE TABLE IF NOT EXISTS arms_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    weapon_type TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    rounds_capacity INTEGER NOT NULL CHECK (rounds_capacity >= 0),
    condition TEXT NOT NULL DEFAULT 'SERVICEABLE' CHECK (condition IN ('SERVICEABLE', 'NEEDS_MAINTENANCE', 'UNSERVICEABLE')),
    status TEXT NOT NULL DEFAULT 'IN_ARMORY' CHECK (status IN ('IN_ARMORY', 'ISSUED', 'MAINTENANCE', 'BALLISTICS_TESTING')),
    issued_to_officer_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    issued_at TIMESTAMPTZ,
    issued_rounds INTEGER NOT NULL DEFAULT 0 CHECK (issued_rounds >= 0),
    returned_rounds INTEGER NOT NULL DEFAULT 0 CHECK (returned_rounds >= 0),
    returned_at TIMESTAMPTZ,
    armorer_on_duty_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    shift_end_reconciled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 27. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    registration_number TEXT NOT NULL UNIQUE,
    vehicle_model TEXT NOT NULL,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('PATROL_PICKUP', 'STATION_CAR', 'PRISONER_VAN', 'MOTORCYCLE')),
    current_mileage INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('DIESEL', 'PETROL')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PATROL', 'MAINTENANCE', 'OUT_OF_SERVICE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 28. FUEL LOGS
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    fuel_litres NUMERIC(8, 2) NOT NULL CHECK (fuel_litres > 0),
    cost_kes NUMERIC(10, 2) NOT NULL CHECK (cost_kes > 0),
    mileage_at_fueling INTEGER NOT NULL CHECK (mileage_at_fueling >= 0),
    fuel_station TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    receipt_photo_path TEXT,
    consumption_anomaly_flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 29. APPROVALS (FOUR-EYES ANTI-CORRUPTION ENGINE)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'RELEASE_WITHOUT_CHARGE', 'BAIL_WAIVER', 'OB_AMENDMENT', 'EVIDENCE_DISPOSAL', 'ROLE_CHANGE', 'FLAG_RESOLUTION'
    )),
    target_resource_type TEXT NOT NULL,
    target_resource_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    justification TEXT NOT NULL,
    required_role TEXT NOT NULL DEFAULT 'OCS' CHECK (required_role IN ('OCS', 'DEPUTY_OCS', 'AUDITOR')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    audit_log_id UUID,
    CONSTRAINT check_four_eyes_approval CHECK (requested_by != approved_by)
);

-- 30. ANOMALY FLAGS
CREATE TABLE IF NOT EXISTS anomaly_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    flag_type TEXT NOT NULL CHECK (flag_type IN (
        'RELEASE_WITHOUT_REASON',
        'REPEAT_BOOK_AND_RELEASE',
        'UNUSUAL_RELEASE_RATE',
        'OB_NUMBERING_GAP',
        'AFTER_HOURS_ACCESS',
        'BULK_VIEW_EXPORT',
        'CUSTODY_24H_BREACH',
        'EVIDENCE_TRANSFER_NO_PHOTO',
        'FUEL_USE_OUTLIER'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details JSONB NOT NULL,
    related_officer_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    related_resource_id UUID,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES officers(id) ON DELETE RESTRICT,
    written_resolution TEXT, -- Mandatory: cannot close flag without written resolution
    resolution_approval_id UUID REFERENCES approvals(id) ON DELETE RESTRICT
);

-- 31. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 32. AUDIT LOG (HASH-CHAINED, IMMUTABLE)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    seq_number BIGINT NOT NULL,
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    actor_id UUID REFERENCES officers(id) ON DELETE RESTRICT,
    actor_service_number TEXT,
    actor_role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    old_data JSONB,
    new_data JSONB,
    justification TEXT,
    previous_log_hash TEXT NOT NULL,
    log_hash TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 33. ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 34. FIRST RUN SETUP TOKENS (One-time token for initial OCS seeding, permanently invalidated)
CREATE TABLE IF NOT EXISTS station_setup_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    token_hash TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    used_by_email TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES ON EVERY FOREIGN KEY AND SEARCH COLUMN
CREATE INDEX IF NOT EXISTS idx_officers_station ON officers(station_id);
CREATE INDEX IF NOT EXISTS idx_officers_service_number ON officers(service_number);
CREATE INDEX IF NOT EXISTS idx_officers_role ON officers(role_id);
CREATE INDEX IF NOT EXISTS idx_officers_status ON officers(status);
CREATE INDEX IF NOT EXISTS idx_officers_phone_hash ON officers(phone_hash);
CREATE INDEX IF NOT EXISTS idx_officers_national_id_hash ON officers(national_id_hash);

CREATE INDEX IF NOT EXISTS idx_officer_invites_station ON officer_invites(station_id);
CREATE INDEX IF NOT EXISTS idx_officer_invites_token ON officer_invites(invite_token_hash);
CREATE INDEX IF NOT EXISTS idx_officer_invites_role ON officer_invites(role_id);

CREATE INDEX IF NOT EXISTS idx_ob_entries_station ON ob_entries(station_id);
CREATE INDEX IF NOT EXISTS idx_ob_entries_number ON ob_entries(ob_number);
CREATE INDEX IF NOT EXISTS idx_ob_entries_date ON ob_entries(incident_date);
CREATE INDEX IF NOT EXISTS idx_ob_entries_status ON ob_entries(status);
CREATE INDEX IF NOT EXISTS idx_ob_entries_recorded_by ON ob_entries(recorded_by);
CREATE INDEX IF NOT EXISTS idx_ob_entries_hash ON ob_entries(entry_hash);

CREATE INDEX IF NOT EXISTS idx_ob_amendments_entry ON ob_amendments(ob_entry_id);
CREATE INDEX IF NOT EXISTS idx_ob_amendments_station ON ob_amendments(station_id);

CREATE INDEX IF NOT EXISTS idx_persons_station ON persons(station_id);
CREATE INDEX IF NOT EXISTS idx_persons_full_name ON persons(full_name);
CREATE INDEX IF NOT EXISTS idx_person_identifiers_hash ON person_identifiers(id_value_hash);
CREATE INDEX IF NOT EXISTS idx_person_identifiers_person ON person_identifiers(person_id);

CREATE INDEX IF NOT EXISTS idx_mugshots_person ON mugshots(person_id);
CREATE INDEX IF NOT EXISTS idx_mugshots_station ON mugshots(station_id);

CREATE INDEX IF NOT EXISTS idx_custody_records_person ON custody_records(person_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_station ON custody_records(station_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_cell ON custody_records(cell_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_custody ON custody_records(is_in_custody);
CREATE INDEX IF NOT EXISTS idx_custody_records_start ON custody_records(countdown_start);

CREATE INDEX IF NOT EXISTS idx_property_custody ON property_items(custody_record_id);
CREATE INDEX IF NOT EXISTS idx_welfare_custody ON welfare_logs(custody_record_id);
CREATE INDEX IF NOT EXISTS idx_visitors_custody ON visitor_logs(custody_record_id);

CREATE INDEX IF NOT EXISTS idx_cases_station ON cases(station_id);
CREATE INDEX IF NOT EXISTS idx_cases_ob_entry ON cases(ob_entry_id);
CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_io ON cases(assigned_io_id);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_items(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_qr ON evidence_items(qr_code_identifier);
CREATE INDEX IF NOT EXISTS idx_evidence_exhibit ON evidence_items(exhibit_number);
CREATE INDEX IF NOT EXISTS idx_evidence_transfers ON evidence_transfers(evidence_id);

CREATE INDEX IF NOT EXISTS idx_bail_custody ON bail_records(custody_record_id);
CREATE INDEX IF NOT EXISTS idx_bail_station ON bail_records(station_id);

CREATE INDEX IF NOT EXISTS idx_payments_bail ON payments(bail_record_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON payments(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_complaints_station ON complaints(station_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tracking ON complaints(tracking_code);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(against_officer_id);

CREATE INDEX IF NOT EXISTS idx_duty_roster_station_date ON duty_roster(station_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_arms_register_serial ON arms_register(serial_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_approvals_station ON approvals(station_id);
CREATE INDEX IF NOT EXISTS idx_approvals_target ON approvals(target_resource_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_station ON anomaly_flags(station_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_status ON anomaly_flags(status);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_severity ON anomaly_flags(severity);

CREATE INDEX IF NOT EXISTS idx_notifications_officer ON notifications(officer_id, is_read);

CREATE INDEX IF NOT EXISTS idx_audit_log_station ON audit_log(station_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_seq ON audit_log(station_id, seq_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
