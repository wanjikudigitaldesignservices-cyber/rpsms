-- MIGRATION: 20261027000006_auth_sessions_and_security_hardening.sql
-- Description: Fort-Knox Zero-Trust Authentication, Sessions, Rate Limiting, Audit Immutability, Soft Deletes

-- 1. EXTEND OFFICERS FOR SECURE SERVER AUTHENTICATION
ALTER TABLE officers
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS totp_secret TEXT;

-- 2. SERVER-SIDE SESSION STORE
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    idle_expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    csrf_token TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_officer_id ON sessions(officer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at, idle_expires_at);

-- 3. LOGIN ATTEMPTS AND RATE LIMIT AUDIT
CREATE TABLE IF NOT EXISTS login_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED_CREDENTIALS', 'LOCKED', 'TOTP_REQUIRED', 'FAILED_TOTP'
    failure_reason TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_ip_time ON login_audit(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_srv_time ON login_audit(service_number, attempted_at DESC);

-- 4. OCCURRENCE BOOK SOFT-DELETE INTEGRITY (ANTI-CORRUPTION)
ALTER TABLE ob_entries
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES officers(id),
    ADD COLUMN IF NOT EXISTS delete_reason TEXT,
    ADD COLUMN IF NOT EXISTS ocs_approved_delete BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS ocs_approved_by UUID REFERENCES officers(id);

-- Enforce hard-delete prohibition on OB entries via trigger
CREATE OR REPLACE FUNCTION prevent_hard_delete_ob()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CORRUPTION PREVENTION: Hard deletion of Occurrence Book records is strictly prohibited by law enforcement standards. Use soft deletion with mandatory OCS approval.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_ob ON ob_entries;
CREATE TRIGGER trg_prevent_hard_delete_ob
BEFORE DELETE ON ob_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_hard_delete_ob();

-- 5. AUDIT LOG IMMUTABILITY TRIGGER (APPEND-ONLY ENFORCEMENT)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: Audit log is append-only. UPDATE, DELETE, or TRUNCATE operations are forbidden by Zero-Trust policy.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_log;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- 6. GRANT LEAST PRIVILEGE PERMISSIONS TO AUTHENTICATED ROLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        
        -- Revoke dangerous operations from application role
        REVOKE DELETE, TRUNCATE ON ob_entries, audit_log, persons, officers, mugshots FROM authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        -- Anon should have zero table access
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    END IF;
END $$;
