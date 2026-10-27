import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSecurityTestSuite() {
  console.log('================================================================');
  console.log(' RPSMS ZERO-TRUST SECURITY & RLS AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  const db = new PGlite();

  // 1. Run all migrations
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await db.exec(sql);
  }

  const STATION_ID = 'a0000000-0000-0000-0000-000000000001';
  const OCS_ID = '00000000-0000-0000-0000-000000000001';
  const DEPUTY_ID = '00000000-0000-0000-0000-000000000002';
  const DUTY_OFFICER_ID = '00000000-0000-0000-0000-000000000003';
  const IO_ID = '00000000-0000-0000-0000-000000000004';
  const CELL_SGT_ID = '00000000-0000-0000-0000-000000000005';
  const RECORDS_CLERK_ID = '00000000-0000-0000-0000-000000000006';
  const AUDITOR_ID = '00000000-0000-0000-0000-000000000007';

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, proofDetails = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
      if (proofDetails) console.log(`       Proof: ${proofDetails}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (proofDetails) console.error(`       Details: ${proofDetails}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // Helper to set officer context
  const officerRoleMap = {
    [OCS_ID]: { role: 'OCS', station: STATION_ID },
    [DEPUTY_ID]: { role: 'DEPUTY_OCS', station: STATION_ID },
    [DUTY_OFFICER_ID]: { role: 'DUTY_OFFICER_OB_CLERK', station: STATION_ID },
    [IO_ID]: { role: 'INVESTIGATING_OFFICER', station: STATION_ID },
    [CELL_SGT_ID]: { role: 'CELL_SERGEANT', station: STATION_ID },
    [RECORDS_CLERK_ID]: { role: 'RECORDS_CLERK', station: STATION_ID },
    [AUDITOR_ID]: { role: 'AUDITOR', station: STATION_ID },
  };

  async function asOfficer(officerId) {
    const meta = officerRoleMap[officerId] || { role: 'NONE', station: STATION_ID };
    await db.exec(`
      SET ROLE authenticated;
      SET app.current_officer_id = '${officerId}';
      SET app.current_officer_role = '${meta.role}';
      SET app.current_officer_station = '${meta.station}';
    `);
  }

  async function asAnonymous() {
    await db.exec(`
      SET ROLE anon;
      SET app.current_officer_id = '';
      SET app.current_officer_role = 'NONE';
      SET app.current_officer_station = '';
    `);
  }

  // TEST 1: Default Deny on Anonymous Access
  console.log('\n--- SUITE 1: ZERO TRUST DEFAULT-DENY FOR ANONYMOUS USERS ---');
  await asAnonymous();
  const anonOfficers = await db.query(`SELECT count(*)::int as count FROM officers;`);
  assert(anonOfficers.rows[0].count === 0, 'Anonymous caller cannot read officers table (RLS blocked)', `Returned ${anonOfficers.rows[0].count} rows`);

  const anonOB = await db.query(`SELECT count(*)::int as count FROM ob_entries;`);
  assert(anonOB.rows[0].count === 0, 'Anonymous caller cannot read Occurrence Book entries (RLS blocked)', `Returned ${anonOB.rows[0].count} rows`);

  // TEST 2: Officer Separation & Privacy
  console.log('\n--- SUITE 2: OFFICER PROFILE READ ISOLATION (OFFICER CANNOT READ ANOTHER OFFICER) ---');
  await asOfficer(RECORDS_CLERK_ID);
  const clerkView = await db.query(`SELECT id, full_name, service_number FROM officers;`);
  assert(
    clerkView.rows.length === 1 && clerkView.rows[0].id === RECORDS_CLERK_ID,
    'Records Clerk querying officers sees ONLY their own profile',
    `Found ${clerkView.rows.length} officer: ${clerkView.rows[0].full_name} (${clerkView.rows[0].service_number})`
  );

  await asOfficer(IO_ID);
  const ioView = await db.query(`SELECT id, full_name FROM officers;`);
  assert(
    ioView.rows.length === 1 && ioView.rows[0].id === IO_ID,
    'Investigating Officer querying officers sees ONLY their own profile',
    `Found ${ioView.rows.length} officer: ${ioView.rows[0].full_name}`
  );

  // But OCS can view all station officers:
  await asOfficer(OCS_ID);
  const ocsView = await db.query(`SELECT count(*)::int as count FROM officers;`);
  assert(
    ocsView.rows[0].count === 8,
    'OCS has station oversight and can see all station officers',
    `Found ${ocsView.rows[0].count} station officers`
  );

  // And External Auditor can view all station officers:
  await asOfficer(AUDITOR_ID);
  const auditorView = await db.query(`SELECT count(*)::int as count FROM officers;`);
  assert(
    auditorView.rows[0].count === 8,
    'Auditor has oversight and can see all officers',
    `Found ${auditorView.rows[0].count} station officers`
  );

  // TEST 3: Duty Officer creating OB entry and Gap-Free Numbering
  console.log('\n--- SUITE 3: OCCURRENCE BOOK APPEND-ONLY & GAP-FREE NUMBERING ---');
  await asOfficer(DUTY_OFFICER_ID);

  const obInsert1 = await db.query(`
    INSERT INTO ob_entries (
      station_id, category, subject, narrative, recorded_by, created_by
    ) VALUES (
      '${STATION_ID}', 'CRIMINAL', 'Robbery Report at Sector 4', 'Reported armed mugging near market square.', '${DUTY_OFFICER_ID}', '${DUTY_OFFICER_ID}'
    ) RETURNING ob_number, seq_number, entry_hash, previous_entry_hash;
  `);

  const ob1 = obInsert1.rows[0];
  assert(
    ob1.seq_number === 1 && ob1.ob_number.startsWith('1/'),
    'First OB entry allocated seq_number 1 with formatted OB number',
    `OB Number: ${ob1.ob_number}, Hash: ${ob1.entry_hash.substring(0, 16)}...`
  );

  const obInsert2 = await db.query(`
    INSERT INTO ob_entries (
      station_id, category, subject, narrative, recorded_by, created_by
    ) VALUES (
      '${STATION_ID}', 'TRAFFIC', 'Accident on North Avenue', 'Minor collision between saloon car and pickup.', '${DUTY_OFFICER_ID}', '${DUTY_OFFICER_ID}'
    ) RETURNING ob_number, seq_number, entry_hash, previous_entry_hash;
  `);

  const ob2 = obInsert2.rows[0];
  assert(
    ob2.seq_number === 2 && ob2.ob_number.startsWith('2/'),
    'Second OB entry allocated sequential gap-free seq_number 2',
    `OB Number: ${ob2.ob_number}`
  );
  assert(
    ob2.previous_entry_hash === ob1.entry_hash,
    'Second OB entry is cryptographically SHA-256 chained to first entry',
    `prev: ${ob2.previous_entry_hash.substring(0, 16)}... == curr: ${ob1.entry_hash.substring(0, 16)}...`
  );

  // TEST 4: IMMUTABILITY RULE: No edit or delete of OB Entries
  console.log('\n--- SUITE 4: OB ENTRIES IMMUTABILITY (NO EDIT, NO DELETE) ---');
  // 4a. Officer context: RLS default-deny blocks any row modification
  const rlsUpdateAttempt = await db.query(`UPDATE ob_entries SET narrative = 'Tampered' WHERE ob_number = '${ob1.ob_number}';`);
  assert(
    rlsUpdateAttempt.affectedRows === 0,
    'RLS Defense: Authenticated officer has zero update privileges on ob_entries',
    `Affected rows: ${rlsUpdateAttempt.affectedRows}`
  );

  // 4b. Trigger Defense: Even if RLS is bypassed by DB superuser, trigger strictly rejects UPDATE
  await db.exec('RESET ROLE;');
  let obEditError = null;
  try {
    await db.query(`UPDATE ob_entries SET narrative = 'Tampered narrative' WHERE ob_number = '${ob1.ob_number}';`);
  } catch (err) {
    obEditError = err.message;
  }
  assert(
    obEditError !== null && obEditError.includes('Digital OB entries are append-only'),
    'Trigger Defense: Direct UPDATE on ob_entries is strictly rejected by database trigger',
    `Rejected with error: ${obEditError}`
  );

  let obDeleteError = null;
  try {
    await db.query(`DELETE FROM ob_entries WHERE ob_number = '${ob1.ob_number}';`);
  } catch (err) {
    obDeleteError = err.message;
  }
  assert(
    obDeleteError !== null && obDeleteError.includes('Digital OB entries are append-only'),
    'Trigger Defense: Direct DELETE on ob_entries is strictly rejected by database trigger',
    `Rejected with error: ${obDeleteError}`
  );

  // TEST 5: AUDIT LOG IMMUTABILITY & HASH CHAINING
  console.log('\n--- SUITE 5: AUDIT LOG IMMUTABILITY & HASH CHAIN INTEGRITY ---');
  await asOfficer(OCS_ID);
  await db.query(`
    INSERT INTO audit_log (
      station_id, action_type, table_name, actor_id, actor_service_number, actor_role, ip_address, new_data, justification
    ) VALUES (
      '${STATION_ID}', 'ROLE_PERMISSION_AUDIT', 'roles', '${OCS_ID}', 'KPS-238914', 'OCS', '10.0.0.1', '{"check": "periodic"}'::jsonb, 'Routine system audit'
    );
  `);

  // 5a. Officer context: RLS default-deny blocks audit log update
  const auditRlsUpdate = await db.query(`UPDATE audit_log SET justification = 'Corrupted' WHERE seq_number = 1;`);
  assert(
    auditRlsUpdate.affectedRows === 0,
    'RLS Defense: Officers have zero update privileges on audit_log',
    `Affected rows: ${auditRlsUpdate.affectedRows}`
  );

  // 5b. Trigger Defense: Even database superuser cannot modify audit log
  await db.exec('RESET ROLE;');
  let auditUpdateError = null;
  try {
    await db.query(`UPDATE audit_log SET justification = 'Corrupted justification' WHERE seq_number = 1;`);
  } catch (err) {
    auditUpdateError = err.message;
  }
  assert(
    auditUpdateError !== null && auditUpdateError.includes('audit_log table is strictly immutable'),
    'Trigger Defense: Direct UPDATE on audit_log is strictly prohibited by anti-corruption trigger',
    `Rejected with: ${auditUpdateError}`
  );

  const chainResult = await db.query(`SELECT verify_audit_log_chain('${STATION_ID}'::uuid) as report;`);
  const report = chainResult.rows[0].report;
  assert(
    report.is_valid === true && report.total_records >= 2,
    'Cryptographic SHA-256 chain verification validates all audit records',
    `Total verified: ${report.total_records}, broken_at_seq: ${report.broken_at_seq}`
  );

  // TEST 6: FOUR-EYES APPROVAL RULE ENFORCEMENT
  console.log('\n--- SUITE 6: ANTI-CORRUPTION FOUR-EYES PRINCIPLE ---');
  await asOfficer(OCS_ID);
  const approvalReq = await db.query(`
    INSERT INTO approvals (
      station_id, action_type, target_resource_type, target_resource_id, requested_by, justification
    ) VALUES (
      '${STATION_ID}', 'ROLE_CHANGE', 'officers', '${DUTY_OFFICER_ID}', '${OCS_ID}', 'Promotion to Senior Sergeant'
    ) RETURNING id;
  `);
  const approvalId = approvalReq.rows[0].id;

  // 6a: Under RLS, requester cannot update or approve their own sensitive action (0 rows affected)
  const selfApprovalRes = await db.query(`
    UPDATE approvals
    SET status = 'APPROVED', approved_by = '${OCS_ID}', approved_at = now()
    WHERE id = '${approvalId}';
  `);
  assert(
    selfApprovalRes.affectedRows === 0,
    'Four-Eyes Principle (RLS): Requester cannot update or approve their own sensitive action',
    `Affected rows: ${selfApprovalRes.affectedRows}`
  );

  // 6b: Under database CHECK constraint, requested_by != approved_by even if RLS bypassed
  await db.exec('RESET ROLE;');
  let selfApprovalError = null;
  try {
    await db.query(`
      UPDATE approvals
      SET status = 'APPROVED', approved_by = '${OCS_ID}', approved_at = now()
      WHERE id = '${approvalId}';
    `);
  } catch (err) {
    selfApprovalError = err.message;
  }
  assert(
    selfApprovalError !== null && selfApprovalError.includes('check_four_eyes_approval'),
    'Four-Eyes Principle (Constraint): Database CHECK constraint strictly rejects requested_by == approved_by',
    `Blocked attempt with constraint error: ${selfApprovalError}`
  );

  // But Deputy OCS CAN approve it (second officer)
  await asOfficer(DEPUTY_ID);
  await db.query(`
    UPDATE approvals
    SET status = 'APPROVED', approved_by = '${DEPUTY_ID}', approved_at = now()
    WHERE id = '${approvalId}';
  `);
  const approvedCheck = await db.query(`SELECT status, approved_by FROM approvals WHERE id = '${approvalId}';`);
  assert(
    approvedCheck.rows[0].status === 'APPROVED' && approvedCheck.rows[0].approved_by === DEPUTY_ID,
    'Four-Eyes approval succeeds when approved by distinct authorized second officer (Deputy OCS)',
    `Status: ${approvedCheck.rows[0].status}, Approved by Deputy OCS`
  );

  // TEST 7: COMPLAINTS AGAINST OCS ROUTING & OVERSIGHT
  console.log('\n--- SUITE 7: COMPLAINTS AGAINST OCS HIDDEN FROM OCS, VISIBLE TO AUDITOR ---');
  // Public submits anonymous complaint against OCS
  await asAnonymous();
  await db.query(`
    INSERT INTO complaints (
      station_id, tracking_code, is_anonymous, complaint_type, against_officer_id, is_against_ocs, description
    ) VALUES (
      '${STATION_ID}', 'RPS-CMP-000099', true, 'OFFICER_MISCONDUCT', '${OCS_ID}', true, 'Allegation of station command interference.'
    );
  `);

  // OCS queries complaints - must NOT see this complaint!
  await asOfficer(OCS_ID);
  const ocsComplaints = await db.query(`SELECT tracking_code FROM complaints WHERE tracking_code = 'RPS-CMP-000099';`);
  assert(
    ocsComplaints.rows.length === 0,
    'Complaints against OCS are strictly filtered out and HIDDEN from OCS view',
    `OCS complaint query returned: ${ocsComplaints.rows.length} rows (Filtered)`
  );

  // External Auditor queries complaints - MUST see this complaint!
  await asOfficer(AUDITOR_ID);
  const auditorComplaints = await db.query(`SELECT tracking_code, description FROM complaints WHERE tracking_code = 'RPS-CMP-000099';`);
  assert(
    auditorComplaints.rows.length === 1,
    'External Auditor CAN inspect complaints filed against the OCS',
    `Auditor retrieved tracking code: ${auditorComplaints.rows[0].tracking_code}`
  );

  // TEST 8: ONE-TIME SETUP TOKEN CONSUMPTION & PERMANENT LOCKOUT
  console.log('\n--- SUITE 8: ONE-TIME OCS SETUP TOKEN SECURITY ---');
  await asAnonymous();
  const tokenQuery = await db.query(`
    SELECT id, token_hash, is_used FROM station_setup_tokens WHERE station_id = '${STATION_ID}';
  `);
  assert(
    tokenQuery.rows.length === 1 && tokenQuery.rows[0].is_used === false,
    'Initial one-time OCS setup token is valid and unconsumed prior to first-run setup'
  );

  // First-run backend Edge Function consumes token with service-role privileges
  await db.exec('RESET ROLE;');
  await db.query(`
    UPDATE station_setup_tokens
    SET is_used = true, used_at = now(), used_by_email = 'ocs.mwangi@rockportpolice.go.ke'
    WHERE id = '${tokenQuery.rows[0].id}';
  `);

  // Verify token is permanently locked and invisible to any public/anonymous callers
  await asAnonymous();
  const consumedQuery = await db.query(`
    SELECT is_used FROM station_setup_tokens WHERE id = '${tokenQuery.rows[0].id}';
  `);
  assert(
    consumedQuery.rows.length === 0,
    'Consumed setup token is permanently locked out and invisible to public callers (Replay immune)',
    `Returned ${consumedQuery.rows.length} rows`
  );

  await db.close();

  console.log('\n================================================================');
  console.log(` ALL SECURITY & RLS TESTS PASSED: ${passedTests}/${totalTests} (100% SUCCESS)`);
  console.log('================================================================\n');
}

runSecurityTestSuite().catch(err => {
  console.error('Security test suite failed:', err);
  process.exit(1);
});
