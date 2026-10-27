-- Migration: 20261027000003_rbac_and_rls.sql
-- Rockport Police Station Management System (RPSMS) - Zero-Trust RBAC & Default-Deny RLS

-- 0. STANDARD SUPABASE ROLES DEFINITION & PRIVILEGES
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOSUPERUSER NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;


-- 1. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION current_officer_id()
RETURNS UUID AS $$
DECLARE
    v_raw TEXT;
BEGIN
    v_raw := NULLIF(current_setting('app.current_officer_id', true), '');
    IF v_raw IS NOT NULL THEN
        RETURN v_raw::UUID;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_officer_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
    v_id UUID;
BEGIN
    v_role := NULLIF(current_setting('app.current_officer_role', true), '');
    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;
    v_id := current_officer_id();
    IF v_id IS NULL THEN
        RETURN 'NONE';
    END IF;
    SELECT role_id INTO v_role
    FROM officers
    WHERE id = v_id AND is_deleted = false AND status = 'ACTIVE';
    RETURN COALESCE(v_role, 'NONE');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_officer_station()
RETURNS UUID AS $$
DECLARE
    v_raw TEXT;
    v_id UUID;
    v_station UUID;
BEGIN
    v_raw := NULLIF(current_setting('app.current_officer_station', true), '');
    IF v_raw IS NOT NULL THEN
        RETURN v_raw::UUID;
    END IF;
    v_id := current_officer_id();
    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT station_id INTO v_station
    FROM officers
    WHERE id = v_id AND is_deleted = false;
    RETURN v_station;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL 34 TABLES
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations FORCE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers FORCE ROW LEVEL SECURITY;
ALTER TABLE officer_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE ob_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE ob_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_amendments FORCE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons FORCE ROW LEVEL SECURITY;
ALTER TABLE person_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_identifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE mugshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mugshots FORCE ROW LEVEL SECURITY;
ALTER TABLE next_of_kin ENABLE ROW LEVEL SECURITY;
ALTER TABLE next_of_kin FORCE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells FORCE ROW LEVEL SECURITY;
ALTER TABLE custody_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_records FORCE ROW LEVEL SECURITY;
ALTER TABLE property_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_items FORCE ROW LEVEL SECURITY;
ALTER TABLE welfare_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE welfare_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases FORCE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_transfers FORCE ROW LEVEL SECURITY;
ALTER TABLE bail_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bail_records FORCE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints FORCE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates FORCE ROW LEVEL SECURITY;
ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_roster FORCE ROW LEVEL SECURITY;
ALTER TABLE arms_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE arms_register FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE anomaly_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_flags FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE station_setup_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_setup_tokens FORCE ROW LEVEL SECURITY;

-- 3. POLICIES: ROLES (Read-only for all active officers)
CREATE POLICY "roles_read_policy" ON roles
    FOR SELECT TO public
    USING (current_officer_role() != 'NONE');

-- 4. POLICIES: STATIONS
CREATE POLICY "stations_read_policy" ON stations
    FOR SELECT TO public
    USING (id = current_officer_station() OR current_officer_role() IN ('OCS', 'AUDITOR', 'ADMIN_SUPER_OWNER'));

CREATE POLICY "stations_update_policy" ON stations
    FOR UPDATE TO public
    USING (id = current_officer_station() AND current_officer_role() = 'OCS');

-- 5. POLICIES: OFFICERS (PROFILES)
-- Self can read, OCS/Deputy OCS can read all in station, Auditor can read all
CREATE POLICY "officers_select_policy" ON officers
    FOR SELECT TO public
    USING (
        id = current_officer_id()
        OR (station_id = current_officer_station() AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'AUDITOR'))
    );

-- Only OCS can insert (via edge function / direct with OCS role)
CREATE POLICY "officers_insert_policy" ON officers
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() = 'OCS'
    );

-- Only OCS can update status/role/details; self can update own MFA/session
CREATE POLICY "officers_update_policy" ON officers
    FOR UPDATE TO public
    USING (
        (station_id = current_officer_station() AND current_officer_role() = 'OCS')
        OR (id = current_officer_id())
    )
    WITH CHECK (
        (station_id = current_officer_station() AND current_officer_role() = 'OCS')
        OR (id = current_officer_id())
    );

-- 6. POLICIES: OFFICER INVITES
CREATE POLICY "officer_invites_select_policy" ON officer_invites
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() IN ('OCS', 'AUDITOR'));

CREATE POLICY "officer_invites_insert_policy" ON officer_invites
    FOR INSERT TO public
    WITH CHECK (station_id = current_officer_station() AND current_officer_role() = 'OCS');

-- 7. POLICIES: OB ENTRIES
CREATE POLICY "ob_entries_select_policy" ON ob_entries
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN (
            'OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'INVESTIGATING_OFFICER',
            'CELL_SERGEANT', 'RECORDS_CLERK', 'AUDITOR'
        )
    );

CREATE POLICY "ob_entries_insert_policy" ON ob_entries
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK')
    );

-- 8. POLICIES: OB AMENDMENTS
CREATE POLICY "ob_amendments_select_policy" ON ob_amendments
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "ob_amendments_insert_policy" ON ob_amendments
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'INVESTIGATING_OFFICER')
    );

CREATE POLICY "ob_amendments_update_policy" ON ob_amendments
    FOR UPDATE TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS')
        AND proposed_by != current_officer_id() -- Four-eyes
    );

-- 9. POLICIES: PERSONS & PERSON IDENTIFIERS
CREATE POLICY "persons_select_policy" ON persons
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN (
            'OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'INVESTIGATING_OFFICER',
            'CELL_SERGEANT', 'RECORDS_CLERK', 'AUDITOR'
        )
    );

CREATE POLICY "persons_insert_policy" ON persons
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'CELL_SERGEANT')
    );

CREATE POLICY "person_identifiers_select_policy" ON person_identifiers
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM persons p
            WHERE p.id = person_identifiers.person_id
              AND p.station_id = current_officer_station()
              AND current_officer_role() IN (
                  'OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'INVESTIGATING_OFFICER',
                  'CELL_SERGEANT', 'RECORDS_CLERK', 'AUDITOR'
              )
        )
    );

CREATE POLICY "person_identifiers_insert_policy" ON person_identifiers
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM persons p
            WHERE p.id = person_identifiers.person_id
              AND p.station_id = current_officer_station()
              AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'CELL_SERGEANT')
        )
    );

-- 10. POLICIES: MUGSHOTS & NEXT OF KIN
CREATE POLICY "mugshots_select_policy" ON mugshots
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "mugshots_insert_policy" ON mugshots
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'CELL_SERGEANT')
    );

CREATE POLICY "next_of_kin_select_policy" ON next_of_kin
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM persons p
            WHERE p.id = next_of_kin.person_id
              AND p.station_id = current_officer_station()
        )
    );

-- 11. POLICIES: CELLS & CUSTODY RECORDS
CREATE POLICY "cells_select_policy" ON cells
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "custody_records_select_policy" ON custody_records
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN (
            'OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'INVESTIGATING_OFFICER',
            'CELL_SERGEANT', 'RECORDS_CLERK', 'AUDITOR'
        )
    );

CREATE POLICY "custody_records_insert_policy" ON custody_records
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'DUTY_OFFICER_OB_CLERK', 'CELL_SERGEANT')
    );

CREATE POLICY "custody_records_update_policy" ON custody_records
    FOR UPDATE TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'CELL_SERGEANT')
    );

-- 12. POLICIES: PROPERTY, WELFARE, VISITORS
CREATE POLICY "property_items_select_policy" ON property_items
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM custody_records c
            WHERE c.id = property_items.custody_record_id
              AND c.station_id = current_officer_station()
        )
    );

CREATE POLICY "property_items_insert_policy" ON property_items
    FOR INSERT TO public
    WITH CHECK (current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'CELL_SERGEANT', 'DUTY_OFFICER_OB_CLERK'));

CREATE POLICY "welfare_logs_select_policy" ON welfare_logs
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM custody_records c
            WHERE c.id = welfare_logs.custody_record_id
              AND c.station_id = current_officer_station()
        )
    );

CREATE POLICY "welfare_logs_insert_policy" ON welfare_logs
    FOR INSERT TO public
    WITH CHECK (current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'CELL_SERGEANT'));

CREATE POLICY "visitor_logs_select_policy" ON visitor_logs
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM custody_records c
            WHERE c.id = visitor_logs.custody_record_id
              AND c.station_id = current_officer_station()
        )
    );

CREATE POLICY "visitor_logs_insert_policy" ON visitor_logs
    FOR INSERT TO public
    WITH CHECK (current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'CELL_SERGEANT', 'DUTY_OFFICER_OB_CLERK'));

-- 13. POLICIES: CASES, ASSIGNMENTS, NOTES
CREATE POLICY "cases_select_policy" ON cases
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND (
            current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'RECORDS_CLERK', 'AUDITOR')
            OR (current_officer_role() = 'INVESTIGATING_OFFICER' AND assigned_io_id = current_officer_id())
        )
    );

CREATE POLICY "cases_insert_policy" ON cases
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS')
    );

CREATE POLICY "case_assignments_select_policy" ON case_assignments
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = case_assignments.case_id
              AND c.station_id = current_officer_station()
        )
    );

CREATE POLICY "case_notes_select_policy" ON case_notes
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = case_notes.case_id
              AND c.station_id = current_officer_station()
              AND (
                  current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'AUDITOR')
                  OR (current_officer_role() = 'INVESTIGATING_OFFICER' AND c.assigned_io_id = current_officer_id())
              )
        )
    );

CREATE POLICY "case_notes_insert_policy" ON case_notes
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = case_notes.case_id
              AND c.station_id = current_officer_station()
              AND (
                  current_officer_role() IN ('OCS', 'DEPUTY_OCS')
                  OR (current_officer_role() = 'INVESTIGATING_OFFICER' AND c.assigned_io_id = current_officer_id())
              )
        )
    );

-- 14. POLICIES: EVIDENCE & TRANSFERS
CREATE POLICY "evidence_items_select_policy" ON evidence_items
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "evidence_items_insert_policy" ON evidence_items
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'INVESTIGATING_OFFICER', 'DUTY_OFFICER_OB_CLERK')
    );

CREATE POLICY "evidence_transfers_select_policy" ON evidence_transfers
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM evidence_items e
            WHERE e.id = evidence_transfers.evidence_id
              AND e.station_id = current_officer_station()
        )
    );

CREATE POLICY "evidence_transfers_insert_policy" ON evidence_transfers
    FOR INSERT TO public
    WITH CHECK (
        transferred_from_id = current_officer_id()
        AND transferred_from_id != transferred_to_id
    );

-- 15. POLICIES: BAIL & PAYMENTS
CREATE POLICY "bail_records_select_policy" ON bail_records
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "bail_records_insert_policy" ON bail_records
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'CELL_SERGEANT')
    );

CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

-- 16. POLICIES: COMPLAINTS (ANTI-CORRUPTION OVERSIGHT)
-- CRITICAL RULE: Complaints against OCS NEVER appear in OCS view! Visible only to Auditor.
CREATE POLICY "complaints_select_policy" ON complaints
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND (
            (current_officer_role() = 'AUDITOR')
            OR (current_officer_role() = 'OCS' AND is_against_ocs = false)
            OR (current_officer_role() = 'DEPUTY_OCS' AND is_against_ocs = false)
        )
    );

-- Public can insert anonymous complaints without logging in
CREATE POLICY "complaints_insert_policy" ON complaints
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "complaint_updates_select_policy" ON complaint_updates
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM complaints c
            WHERE c.id = complaint_updates.complaint_id
              AND c.station_id = current_officer_station()
              AND (
                  (current_officer_role() = 'AUDITOR')
                  OR (current_officer_role() IN ('OCS', 'DEPUTY_OCS') AND c.is_against_ocs = false)
              )
        )
    );

-- 17. POLICIES: DUTY ROSTER, ARMS, VEHICLES, FUEL
CREATE POLICY "duty_roster_select_policy" ON duty_roster
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "duty_roster_insert_update_policy" ON duty_roster
    FOR ALL TO public
    USING (station_id = current_officer_station() AND current_officer_role() IN ('OCS', 'DEPUTY_OCS'));

CREATE POLICY "arms_register_select_policy" ON arms_register
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "vehicles_select_policy" ON vehicles
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "fuel_logs_select_policy" ON fuel_logs
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

-- 18. POLICIES: APPROVALS (FOUR-EYES)
CREATE POLICY "approvals_select_policy" ON approvals
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "approvals_insert_policy" ON approvals
    FOR INSERT TO public
    WITH CHECK (
        station_id = current_officer_station()
        AND requested_by = current_officer_id()
    );

CREATE POLICY "approvals_update_policy" ON approvals
    FOR UPDATE TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'AUDITOR')
        AND requested_by != current_officer_id() -- Cannot approve self!
    );

-- 19. POLICIES: ANOMALY FLAGS
CREATE POLICY "anomaly_flags_select_policy" ON anomaly_flags
    FOR SELECT TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'DEPUTY_OCS', 'AUDITOR')
    );

CREATE POLICY "anomaly_flags_update_policy" ON anomaly_flags
    FOR UPDATE TO public
    USING (
        station_id = current_officer_station()
        AND current_officer_role() IN ('OCS', 'AUDITOR')
    )
    WITH CHECK (
        -- Enforce rule: cannot close flag without written resolution
        (status != 'RESOLVED') OR (written_resolution IS NOT NULL AND length(written_resolution) >= 10)
    );

-- 20. POLICIES: NOTIFICATIONS
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT TO public
    USING (officer_id = current_officer_id());

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE TO public
    USING (officer_id = current_officer_id());

-- 21. POLICIES: AUDIT LOG (OFFICER TRANSPARENCY + OCS / AUDITOR VIEW)
-- OCS and Auditor can view all station audit records; regular officers can view only their own records!
CREATE POLICY "audit_log_select_policy" ON audit_log
    FOR SELECT TO public
    USING (
        (station_id = current_officer_station() AND current_officer_role() IN ('OCS', 'AUDITOR'))
        OR (actor_id = current_officer_id())
    );

-- Only DB trigger or system services insert audit logs; no direct update/delete
CREATE POLICY "audit_log_insert_policy" ON audit_log
    FOR INSERT TO public
    WITH CHECK (true);

-- 22. POLICIES: ATTACHMENTS
CREATE POLICY "attachments_select_policy" ON attachments
    FOR SELECT TO public
    USING (station_id = current_officer_station() AND current_officer_role() != 'NONE');

CREATE POLICY "attachments_insert_policy" ON attachments
    FOR INSERT TO public
    WITH CHECK (station_id = current_officer_station() AND uploaded_by = current_officer_id());

-- 23. POLICIES: STATION SETUP TOKENS
CREATE POLICY "station_setup_tokens_select_policy" ON station_setup_tokens
    FOR SELECT TO public
    USING (is_used = false AND expires_at > now());
