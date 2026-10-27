-- Migration: 20261027000005_seed_test_officers.sql
-- Rockport Police Station Management System (RPSMS) - Seed Realistic Test Officers
-- All records are clearly marked test data for automated verification and evaluation.

INSERT INTO officers (
    id,
    station_id,
    service_number,
    national_id_hash,
    national_id_encrypted,
    full_name,
    rank,
    role_id,
    phone_encrypted,
    phone_hash,
    email,
    status,
    mfa_enabled,
    current_session_token,
    last_login_at
)
VALUES
-- 1. OCS (Super Admin)
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-238914',
    encode(sha256('11223344'::bytea), 'hex'),
    'ENC:ID:11223344:TEST',
    'SSP Kipchoge Mwangi',
    'Senior Superintendent of Police',
    'OCS',
    'ENC:TEL:+254711000001:TEST',
    encode(sha256('+254711000001'::bytea), 'hex'),
    'ocs.mwangi@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_ocs_active_2026',
    now() - INTERVAL '10 minutes'
),
-- 2. Deputy OCS
(
    '00000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-241002',
    encode(sha256('22334455'::bytea), 'hex'),
    'ENC:ID:22334455:TEST',
    'CI Amina Hassan',
    'Chief Inspector',
    'DEPUTY_OCS',
    'ENC:TEL:+254711000002:TEST',
    encode(sha256('+254711000002'::bytea), 'hex'),
    'deputy.hassan@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_deputy_active_2026',
    now() - INTERVAL '25 minutes'
),
-- 3. Duty Officer / OB Clerk
(
    '00000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-245980',
    encode(sha256('33445566'::bytea), 'hex'),
    'ENC:ID:33445566:TEST',
    'IP David Otieno',
    'Inspector',
    'DUTY_OFFICER_OB_CLERK',
    'ENC:TEL:+254711000003:TEST',
    encode(sha256('+254711000003'::bytea), 'hex'),
    'duty.otieno@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_duty_active_2026',
    now() - INTERVAL '40 minutes'
),
-- 4. Investigating Officer (IO)
(
    '00000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-250123',
    encode(sha256('44556677'::bytea), 'hex'),
    'ENC:ID:44556677:TEST',
    'Cpl Grace Wambui',
    'Corporal',
    'INVESTIGATING_OFFICER',
    'ENC:TEL:+254711000004:TEST',
    encode(sha256('+254711000004'::bytea), 'hex'),
    'io.wambui@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_io_active_2026',
    now() - INTERVAL '1 hour'
),
-- 5. Cell Sergeant
(
    '00000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-248765',
    encode(sha256('55667788'::bytea), 'hex'),
    'ENC:ID:55667788:TEST',
    'Sgt James Mutua',
    'Sergeant',
    'CELL_SERGEANT',
    'ENC:TEL:+254711000005:TEST',
    encode(sha256('+254711000005'::bytea), 'hex'),
    'cells.mutua@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_cell_active_2026',
    now() - INTERVAL '2 hours'
),
-- 6. Records Clerk
(
    '00000000-0000-0000-0000-000000000006'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'KPS-253441',
    encode(sha256('66778899'::bytea), 'hex'),
    'ENC:ID:66778899:TEST',
    'PC Brian Kiprono',
    'Constable',
    'RECORDS_CLERK',
    'ENC:TEL:+254711000006:TEST',
    encode(sha256('+254711000006'::bytea), 'hex'),
    'records.kiprono@rockportpolice.go.ke',
    'ACTIVE',
    true,
    'sess_token_records_active_2026',
    now() - INTERVAL '3 hours'
),
-- 7. Auditor (External Oversight)
(
    '00000000-0000-0000-0000-000000000007'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'AUD-990142',
    encode(sha256('77889900'::bytea), 'hex'),
    'ENC:ID:77889900:TEST',
    'Auditor Leah Nyambura',
    'Superintendent of Police',
    'AUDITOR',
    'ENC:TEL:+254711000007:TEST',
    encode(sha256('+254711000007'::bytea), 'hex'),
    'auditor.nyambura@oversight.go.ke',
    'ACTIVE',
    true,
    'sess_token_auditor_active_2026',
    now() - INTERVAL '4 hours'
),
-- 8. Admin Super-Owner (LQD Creatives Break-Glass)
(
    '00000000-0000-0000-0000-000000000008'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'TECH-000001',
    encode(sha256('88990011'::bytea), 'hex'),
    'ENC:ID:88990011:TEST',
    'LQD Break-Glass Engineer',
    'Inspector General',
    'ADMIN_SUPER_OWNER',
    'ENC:TEL:+254711000008:TEST',
    encode(sha256('+254711000008'::bytea), 'hex'),
    'support@lqdcreatives.com',
    'ACTIVE',
    true,
    'sess_token_super_active_2026',
    now() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    service_number = EXCLUDED.service_number,
    status = EXCLUDED.status;

-- INITIAL AUDIT LOG EVENT: STATION INITIALIZATION
INSERT INTO audit_log (
    station_id,
    action_type,
    table_name,
    record_id,
    actor_id,
    actor_service_number,
    actor_role,
    ip_address,
    user_agent,
    new_data,
    justification
)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'STATION_GENESIS_INITIALIZED',
    'stations',
    'a0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'KPS-238914',
    'OCS',
    '127.0.0.1',
    'RPSMS Security Genesis Provisioner',
    '{"station_name": "Rockport Police Station", "code": "RPS-001", "genesis_version": "1.0.0"}'::jsonb,
    'Initial commission of Rockport Police Station Management System'
);
