-- Migration: 20261027000002_audit_and_triggers.sql
-- Rockport Police Station Management System (RPSMS) - Audit Chain, Immutability & OB Logic

-- 1. PREVENT UPDATE OR DELETE ON AUDIT_LOG
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: The audit_log table is strictly immutable. UPDATE and DELETE are prohibited by Anti-Corruption controls.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_log;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- 2. HASH-CHAINING TRIGGER ON AUDIT_LOG
CREATE OR REPLACE FUNCTION chain_audit_log_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_last_seq BIGINT;
    v_last_hash TEXT;
    v_genesis_hash CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
BEGIN
    -- Lock latest entry for this station to enforce gap-free ordering
    SELECT seq_number, log_hash INTO v_last_seq, v_last_hash
    FROM audit_log
    WHERE station_id = NEW.station_id
    ORDER BY seq_number DESC
    LIMIT 1
    FOR UPDATE;

    IF v_last_seq IS NULL THEN
        NEW.seq_number := 1;
        NEW.previous_log_hash := v_genesis_hash;
    ELSE
        NEW.seq_number := v_last_seq + 1;
        NEW.previous_log_hash := v_last_hash;
    END IF;

    IF NEW.recorded_at IS NULL THEN
        NEW.recorded_at := now();
    END IF;

    -- Compute SHA-256 hash chain
    NEW.log_hash := encode(
        sha256(
            concat_ws(
                ':',
                NEW.station_id::text,
                NEW.seq_number::text,
                NEW.action_type,
                coalesce(NEW.table_name, ''),
                coalesce(NEW.record_id::text, ''),
                coalesce(NEW.actor_id::text, ''),
                coalesce(NEW.actor_service_number, ''),
                NEW.recorded_at::text,
                NEW.previous_log_hash,
                coalesce(NEW.new_data::text, '')
            )::bytea
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_chain_audit_log_entry ON audit_log;
CREATE TRIGGER trg_chain_audit_log_entry
BEFORE INSERT ON audit_log
FOR EACH ROW
EXECUTE FUNCTION chain_audit_log_entry();

-- 3. AUDIT LOG CHAIN INTEGRITY VERIFICATION FUNCTION
CREATE OR REPLACE FUNCTION verify_audit_log_chain(p_station_id UUID)
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    v_expected_prev TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_computed_hash TEXT;
    v_total_records INTEGER := 0;
    v_broken_seq BIGINT := NULL;
    v_broken_details TEXT := NULL;
BEGIN
    FOR r IN
        SELECT *
        FROM audit_log
        WHERE station_id = p_station_id
        ORDER BY seq_number ASC
    LOOP
        v_total_records := v_total_records + 1;

        -- Verify previous hash pointer
        IF r.previous_log_hash <> v_expected_prev THEN
            v_broken_seq := r.seq_number;
            v_broken_details := format(
                'Chain broken at seq %s: previous_log_hash %s does not match expected %s',
                r.seq_number, r.previous_log_hash, v_expected_prev
            );
            RETURN jsonb_build_object(
                'is_valid', false,
                'total_records', v_total_records,
                'broken_at_seq', v_broken_seq,
                'details', v_broken_details
            );
        END IF;

        -- Recompute entry hash
        v_computed_hash := encode(
            sha256(
                concat_ws(
                    ':',
                    r.station_id::text,
                    r.seq_number::text,
                    r.action_type,
                    coalesce(r.table_name, ''),
                    coalesce(r.record_id::text, ''),
                    coalesce(r.actor_id::text, ''),
                    coalesce(r.actor_service_number, ''),
                    r.recorded_at::text,
                    r.previous_log_hash,
                    coalesce(r.new_data::text, '')
                )::bytea
            ),
            'hex'
        );

        IF r.log_hash <> v_computed_hash THEN
            v_broken_seq := r.seq_number;
            v_broken_details := format(
                'Tampering detected at seq %s: stored hash %s != calculated hash %s',
                r.seq_number, r.log_hash, v_computed_hash
            );
            RETURN jsonb_build_object(
                'is_valid', false,
                'total_records', v_total_records,
                'broken_at_seq', v_broken_seq,
                'details', v_broken_details
            );
        END IF;

        v_expected_prev := r.log_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'is_valid', true,
        'total_records', v_total_records,
        'broken_at_seq', NULL,
        'details', 'Audit log integrity verified. All entries are cryptographically chained.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PREVENT UPDATE OR DELETE ON OB_ENTRIES (IMMUTABILITY RULE)
CREATE OR REPLACE FUNCTION prevent_ob_entry_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: Digital OB entries are append-only. Modification and deletion are strictly prohibited. File an OB Amendment instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ob_entry_modification ON ob_entries;
CREATE TRIGGER trg_prevent_ob_entry_modification
BEFORE UPDATE OR DELETE ON ob_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ob_entry_modification();

-- 5. GAP-FREE OB NUMBER GENERATOR & SHA-256 HASH CHAINING
CREATE OR REPLACE FUNCTION chain_ob_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_last_seq INTEGER;
    v_last_hash TEXT;
    v_genesis_hash CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_date_str TEXT;
BEGIN
    IF NEW.incident_date IS NULL THEN
        NEW.incident_date := CURRENT_DATE;
    END IF;

    IF NEW.created_by IS NULL THEN
        NEW.created_by := NEW.recorded_by;
    END IF;

    -- Format date for OB number {seq}/{DD}/{MM}/{YYYY}
    v_date_str := to_char(NEW.incident_date, 'DD/MM/YYYY');

    -- Concurrency-safe lock for station daily sequence
    SELECT seq_number, entry_hash INTO v_last_seq, v_last_hash
    FROM ob_entries
    WHERE station_id = NEW.station_id
      AND incident_date = NEW.incident_date
    ORDER BY seq_number DESC
    LIMIT 1
    FOR UPDATE;

    IF v_last_seq IS NULL THEN
        NEW.seq_number := 1;
        NEW.previous_entry_hash := v_genesis_hash;
    ELSE
        NEW.seq_number := v_last_seq + 1;
        NEW.previous_entry_hash := v_last_hash;
    END IF;

    NEW.ob_number := format('%s/%s', NEW.seq_number, v_date_str);

    IF NEW.entry_timestamp IS NULL THEN
        NEW.entry_timestamp := now();
    END IF;

    -- Compute SHA-256 entry hash
    NEW.entry_hash := encode(
        sha256(
            concat_ws(
                ':',
                NEW.station_id::text,
                NEW.ob_number,
                NEW.seq_number::text,
                NEW.incident_date::text,
                NEW.category,
                NEW.recorded_by::text,
                NEW.previous_entry_hash,
                NEW.narrative
            )::bytea
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_chain_ob_entry ON ob_entries;
CREATE TRIGGER trg_chain_ob_entry
BEFORE INSERT ON ob_entries
FOR EACH ROW
EXECUTE FUNCTION chain_ob_entry();
