-- Migration: 20261027000004_seed_roles_and_station.sql
-- Rockport Police Station Management System (RPSMS) - Initial Seed Data

-- 1. SEED ROLES
INSERT INTO roles (id, name, description, permissions)
VALUES
('OCS', 'Officer Commanding Station', 'Super Admin: Onboards/suspends officers, assigns roles, approves sensitive actions, views risk dashboard', '["*"]'::jsonb),
('DEPUTY_OCS', 'Deputy OCS', 'Second-in-Command: All OCS privileges except officer onboarding and station configuration', '["ob:read", "ob:write", "ob:amend", "custody:read", "custody:write", "cases:read", "cases:write", "approvals:read", "approvals:write", "flags:read"]'::jsonb),
('DUTY_OFFICER_OB_CLERK', 'Duty Officer / OB Clerk', 'Front-desk operations: Creates OB entries, books in brought-in persons, captures mugshots and property', '["ob:read", "ob:write", "persons:read", "persons:write", "custody:read", "custody:write", "property:write"]'::jsonb),
('INVESTIGATING_OFFICER', 'Investigating Officer (IO)', 'Case management: Investigates assigned cases, logs case notes, manages exhibit chain of custody', '["cases:read_assigned", "cases:write_notes", "evidence:read", "evidence:transfer", "ob:read"]'::jsonb),
('CELL_SERGEANT', 'Cell Sergeant', 'Custody oversight: Cell allocation, 24-hour clock monitoring, property register, welfare & visitor logs', '["custody:read", "custody:write", "cells:read", "cells:write", "property:read", "property:write", "welfare:read", "welfare:write"]'::jsonb),
('RECORDS_CLERK', 'Records Clerk', 'Records & Archival: Search, query and generate official report printouts; zero edit rights', '["ob:read", "cases:read", "reports:read", "reports:export"]'::jsonb),
('AUDITOR', 'Auditor (External Oversight)', 'Anti-Corruption Oversight: Read-only access to immutable audit log, anomaly flags, complaints and compliance reports', '["audit:read", "flags:read", "flags:investigate", "complaints:read_all", "reports:read"]'::jsonb),
('ADMIN_SUPER_OWNER', 'Admin Super-Owner (LQD Creatives)', 'Technical break-glass platform administrator: Technical maintenance only; case data access denied', '["system:metrics", "system:health"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- 2. SEED ROCKPORT POLICE STATION
INSERT INTO stations (
    id, name, code, county, sub_county, division, station_type, ob_prefix, daily_ob_reset, phone, email, address
)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Rockport Police Station',
    'RPS-001',
    'Rockport Central',
    'Rockport Metro Sub-County',
    'Rockport Urban Division',
    'Police Station',
    'OB',
    true,
    '+254 20 890 1000',
    'records@rockportpolice.go.ke',
    'Command Headquarters, Station Road, Rockport'
)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED CELLS FOR ROCKPORT POLICE STATION
INSERT INTO cells (station_id, cell_number, cell_type, capacity, status)
VALUES
('a0000000-0000-0000-0000-000000000001'::uuid, 'M-01', 'MALE', 12, 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001'::uuid, 'M-02', 'MALE', 12, 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001'::uuid, 'F-01', 'FEMALE', 10, 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001'::uuid, 'J-01', 'JUVENILE_MALE', 6, 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001'::uuid, 'ISO-01', 'ISOLATION', 2, 'ACTIVE')
ON CONFLICT (station_id, cell_number) DO NOTHING;

-- 4. SEED ONE-TIME SECURE SETUP TOKEN FOR INITIAL OCS REGISTRATION
-- Token phrase: ROCKPORT-OCS-INITIAL-SETUP-SECRET-2026
INSERT INTO station_setup_tokens (
    station_id, token_hash, is_used, expires_at
)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    encode(sha256('ROCKPORT-OCS-INITIAL-SETUP-SECRET-2026'::bytea), 'hex'),
    false,
    now() + INTERVAL '30 days'
)
ON CONFLICT (token_hash) DO NOTHING;
