-- MIGRATION: 20261027000007_session_token_hashing_and_server_lock.sql
-- Description: Token hashing at rest, server-side session lock status, and permission matrix table

-- 1. EXTEND SESSIONS TABLE FOR TOKEN HASHING AT REST & SERVER LOCK
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS token_hash TEXT,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- Backfill token_hash for any existing test sessions
UPDATE sessions 
SET token_hash = encode(sha256(id::bytea), 'hex') 
WHERE token_hash IS NULL;

-- 2. CREATE ROLE PERMISSIONS TABLE AS SINGLE SOURCE OF TRUTH
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(role_id, permission)
);

-- Seed comprehensive RBAC permissions into database
INSERT INTO role_permissions (role_id, permission, description) VALUES
-- OCS (Super Admin)
('OCS', 'officers:create', 'Create and provision officer accounts'),
('OCS', 'officers:disable', 'Suspend or terminate officer accounts'),
('OCS', 'officers:reset_password', 'Reset officer passwords'),
('OCS', 'officers:read_all', 'View full station officer roster and details'),
('OCS', 'ob:read', 'Read all Occurrence Book records'),
('OCS', 'ob:create', 'Create new Occurrence Book records'),
('OCS', 'ob:soft_delete', 'Authorize soft deletion of Occurrence Book entries'),
('OCS', 'audit:read', 'Access full cryptographic audit log'),
('OCS', 'audit:verify_chain', 'Execute SHA-256 chain verification'),
('OCS', 'approvals:manage', 'Approve station operational workflows'),
('OCS', 'pii:reveal', 'Statutory unmasking of protected PII'),

-- DEPUTY_OCS
('DEPUTY_OCS', 'ob:read', 'Read Occurrence Book entries'),
('DEPUTY_OCS', 'ob:create', 'Create Occurrence Book entries'),
('DEPUTY_OCS', 'approvals:manage', 'Approve operational requests (excluding officer onboarding)'),
('DEPUTY_OCS', 'audit:read', 'View station audit logs'),

-- DUTY_OFFICER_OB_CLERK
('DUTY_OFFICER_OB_CLERK', 'ob:read', 'Read Occurrence Book entries'),
('DUTY_OFFICER_OB_CLERK', 'ob:create', 'Create new digital OB records'),
('DUTY_OFFICER_OB_CLERK', 'custody:book_in', 'Book in brought-in persons'),
('DUTY_OFFICER_OB_CLERK', 'mugshots:capture', 'Capture detainee 3-point mugshots'),
('DUTY_OFFICER_OB_CLERK', 'property:intake', 'Record seized personal property'),

-- INVESTIGATING_OFFICER
('INVESTIGATING_OFFICER', 'cases:read_assigned', 'Read assigned case files'),
('INVESTIGATING_OFFICER', 'cases:update_notes', 'Record case investigation notes'),
('INVESTIGATING_OFFICER', 'evidence:read', 'Read case exhibit chain of custody'),
('INVESTIGATING_OFFICER', 'ob:read', 'Read Occurrence Book entries'),

-- CELL_SERGEANT
('CELL_SERGEANT', 'custody:read', 'Monitor 24-hour custody clock and cells'),
('CELL_SERGEANT', 'custody:cell_allocate', 'Allocate detainees to cells'),
('CELL_SERGEANT', 'welfare:log', 'Record custodial welfare inspections'),
('CELL_SERGEANT', 'visitors:log', 'Record detainee visitor logs'),

-- RECORDS_CLERK
('RECORDS_CLERK', 'ob:read', 'Search and query Occurrence Book entries'),
('RECORDS_CLERK', 'reports:export', 'Generate official police abstract extracts'),

-- AUDITOR
('AUDITOR', 'audit:read', 'Independent inspection of cryptographic audit logs'),
('AUDITOR', 'audit:verify_chain', 'Verify ledger hash chain integrity'),
('AUDITOR', 'complaints:read', 'Inspect public complaints and OCS oversight flags'),

-- ADMIN_SUPER_OWNER
('ADMIN_SUPER_OWNER', 'system:health', 'Inspect cloud infrastructure and database telemetry')
ON CONFLICT (role_id, permission) DO NOTHING;
