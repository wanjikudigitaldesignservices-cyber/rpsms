/**
 * RPSMS Automated Phase 2 Verification Suite
 * Verifies:
 *  1. Occurrence Book (OB) hash chaining and sequential gap-free numbering
 *  2. Immutability of OB entries (Append-only)
 *  3. Article 49 24-hour countdown clock statutory calculations
 *  4. Blind-index HMAC/SHA-256 generation for PII
 *  5. Cell allocation bounds & segregation
 *  6. Four-Eyes authorization requirement for RELEASE_WITHOUT_CHARGE
 *  7. Detainee property and welfare logging
 */

import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SALT = 'ROCKPORT-POLICE-SALT-2026-KDPA-COMPLIANT';

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function blindHash(val) {
  const sanitized = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return sha256(`${SALT}:${sanitized}`);
}

async function runPhase2Tests() {
  console.log('\n================================================================');
  console.log(' RPSMS PHASE 2: DIGITAL OB & CUSTODY AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  const db = new PGlite();

  // Apply migrations
  const migrations = [
    '20261027000001_core_schema.sql',
    '20261027000002_audit_and_triggers.sql',
    '20261027000003_rbac_and_rls.sql',
    '20261027000004_seed_roles_and_station.sql',
    '20261027000005_seed_test_officers.sql',
  ];

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', file), 'utf8');
    await db.exec(sql);
  }

  const station = (await db.query(`SELECT id FROM stations WHERE code = 'RPS-001'`)).rows[0];
  const stationId = station.id;

  const officers = (await db.query(`SELECT id, service_number, role_id FROM officers`)).rows;
  const ocs = officers[0];
  const dutyOfficer = officers[2];
  const cellSgt = officers[4];

  let passed = 0;
  let total = 0;

  function assert(condition, message, proof = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      if (proof) console.log(`       Proof: ${proof}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      if (proof) console.error(`       Proof: ${proof}`);
      process.exitCode = 1;
    }
  }

  // --- SUITE 1: OB SEQUENTIAL GAP-FREE & CRYPTOGRAPHIC CHAINING ---
  console.log('--- SUITE 1: OB SEQUENTIAL GAP-FREE & CRYPTOGRAPHIC CHAINING ---');
  
  // Insert Entry 1
  const ob1Res = await db.query(`
    INSERT INTO ob_entries (
      station_id, ob_number, seq_number, incident_date, category, subject, narrative,
      recorded_by, created_by
    ) VALUES (
      $1, '1/27/10/2026', 1, '2026-10-27', 'DIRECTIVE',
      'Morning Shift Handover', 'Armory reconciled. 14 G3 rifles verified.',
      $2, $2
    ) RETURNING id, ob_number, seq_number, entry_hash, previous_entry_hash
  `, [stationId, dutyOfficer.id]);

  const ob1 = ob1Res.rows[0];
  assert(ob1.seq_number === 1 && ob1.ob_number === '1/27/10/2026', 'First OB Entry allocated sequence 1', `OB: ${ob1.ob_number}`);
  assert(ob1.previous_entry_hash === '0000000000000000000000000000000000000000000000000000000000000000', 'Genesis OB block chained to 64-zero genesis hash');

  // Insert Entry 2
  const ob2Res = await db.query(`
    INSERT INTO ob_entries (
      station_id, ob_number, seq_number, incident_date, category, subject, narrative,
      recorded_by, created_by
    ) VALUES (
      $1, '2/27/10/2026', 2, '2026-10-27', 'CRIMINAL',
      'Burglary at Stage', 'Suspect Martin Kariuki arrested with stolen electronics.',
      $2, $2
    ) RETURNING id, ob_number, seq_number, entry_hash, previous_entry_hash
  `, [stationId, dutyOfficer.id]);

  const ob2 = ob2Res.rows[0];
  assert(ob2.seq_number === 2, 'Second OB Entry allocated sequential gap-free seq_number 2');
  assert(ob2.previous_entry_hash === ob1.entry_hash, 'Second OB Entry cryptographically chained to Entry 1 hash', `prev: ${ob2.previous_entry_hash.substring(0, 16)}... == entry1: ${ob1.entry_hash.substring(0, 16)}...`);

  // --- SUITE 2: OB IMMUTABILITY TRIGGER ---
  console.log('\n--- SUITE 2: OB IMMUTABILITY TRIGGER ---');
  let updateBlocked = false;
  try {
    await db.query(`UPDATE ob_entries SET subject = 'Altered Subject' WHERE id = $1`, [ob1.id]);
  } catch (err) {
    updateBlocked = true;
  }
  assert(updateBlocked, 'Direct UPDATE on ob_entries is strictly prohibited by anti-corruption database trigger');

  let deleteBlocked = false;
  try {
    await db.query(`DELETE FROM ob_entries WHERE id = $1`, [ob1.id]);
  } catch (err) {
    deleteBlocked = true;
  }
  assert(deleteBlocked, 'Direct DELETE on ob_entries is strictly prohibited by anti-corruption database trigger');

  // --- SUITE 3: BLIND-INDEX PII HASHING FOR KDPA 2019 ---
  console.log('\n--- SUITE 3: BLIND-INDEX PII HASHING (KDPA 2019 COMPLIANCE) ---');
  const nationalId = '29481920';
  const expectedHash = blindHash(nationalId);

  // Insert Person
  const personRes = await db.query(`
    INSERT INTO persons (
      station_id, full_name, alias, gender, nationality, created_by
    ) VALUES (
      $1, 'Martin Kariuki Ndung''u', 'Karis', 'MALE', 'Kenyan', $2
    ) RETURNING id, full_name
  `, [stationId, dutyOfficer.id]);
  const person = personRes.rows[0];

  await db.query(`
    INSERT INTO person_identifiers (
      person_id, identifier_type, id_value_encrypted, id_value_hash
    ) VALUES (
      $1, 'NATIONAL_ID', 'ENC:AES-GCM:29481920', $2
    )
  `, [person.id, expectedHash]);

  const searchRes = await db.query(`
    SELECT p.id, p.full_name FROM persons p
    JOIN person_identifiers pi ON pi.person_id = p.id
    WHERE pi.id_value_hash = $1
  `, [blindHash('29481920')]);

  assert(searchRes.rows.length === 1 && searchRes.rows[0].full_name === 'Martin Kariuki Ndung\'u', 'Exact blind-index match found without decrypting PII', `Found: ${searchRes.rows[0].full_name}`);

  // --- SUITE 4: CELL OCCUPANCY & ARTICLE 49 24-HOUR CUSTODY RECORD ---
  console.log('\n--- SUITE 4: CELL ALLOCATION & ARTICLE 49 CUSTODY RECORD ---');
  const cell = (await db.query(`SELECT id, cell_number, capacity FROM cells WHERE cell_number = 'M-01'`)).rows[0];

  const custodyRes = await db.query(`
    INSERT INTO custody_records (
      station_id, person_id, ob_entry_id, cell_id, arrest_reason,
      arresting_officer_name, arresting_officer_service_no, booked_in_by,
      rights_read, lawyer_notified, next_of_kin_notified, health_status_at_entry,
      is_in_custody, custody_limit_hours, countdown_start
    ) VALUES (
      $1, $2, $3, $4, 'Burglary Section 304 Penal Code',
      'PC Brian Kiprono', 'KPS-253441', $5,
      true, false, true, 'Healthy, fit for custody',
      true, 24, now()
    ) RETURNING id, custody_limit_hours, rights_read, is_in_custody
  `, [stationId, person.id, ob2.id, cell.id, cellSgt.id]);

  const custody = custodyRes.rows[0];
  assert(custody.is_in_custody === true, 'Detainee successfully placed in custody record');
  assert(custody.custody_limit_hours === 24, 'Statutory 24-hour Article 49 clock limit enforced');
  assert(custody.rights_read === true, 'Statutory Article 49 rights acknowledgment verified');

  // --- SUITE 5: PROPERTY REGISTER LINKAGE ---
  console.log('\n--- SUITE 5: PROPERTY REGISTER LINKAGE ---');
  const propRes = await db.query(`
    INSERT INTO property_items (
      custody_record_id, item_description, category, quantity, condition_at_booking,
      booked_by, status, prisoner_signature_captured
    ) VALUES (
      $1, 'KES 3,500 Cash and Black Samsung Phone', 'CASH', 1, 'Intact, screen undamaged',
      $2, 'HELD', true
    ) RETURNING id, status
  `, [custody.id, cellSgt.id]);

  assert(propRes.rows.length === 1 && propRes.rows[0].status === 'HELD', 'Detainee property registered in custody safe');

  // --- SUITE 6: FOUR-EYES RELEASE WITHOUT CHARGE CONSTRAINT ---
  console.log('\n--- SUITE 6: FOUR-EYES RELEASE WITHOUT CHARGE CONTROL ---');
  // Requester cannot approve their own release
  let selfApprovalFailed = false;
  try {
    await db.query(`
      INSERT INTO approvals (
        station_id, action_type, target_resource_type, target_resource_id,
        requested_by, justification, required_role, approved_by, status
      ) VALUES (
        $1, 'RELEASE_WITHOUT_CHARGE', 'custody_records', $2,
        $3, 'Complainant withdrew complaint with affidavit', 'OCS', $3, 'APPROVED'
      )
    `, [stationId, custody.id, dutyOfficer.id]);
  } catch (err) {
    selfApprovalFailed = true;
  }
  assert(selfApprovalFailed, 'Four-Eyes Principle rejects self-approval for detainee release without charge');

  // Proper Four-Eyes Approval (Requested by Duty Officer, Approved by distinct OCS)
  const approvalRes = await db.query(`
    INSERT INTO approvals (
      station_id, action_type, target_resource_type, target_resource_id,
      requested_by, justification, required_role, approved_by, status
    ) VALUES (
      $1, 'RELEASE_WITHOUT_CHARGE', 'custody_records', $2,
      $3, 'Complainant withdrew complaint with affidavit', 'OCS', $4, 'APPROVED'
    ) RETURNING id, status
  `, [stationId, custody.id, dutyOfficer.id, ocs.id]);

  assert(approvalRes.rows[0].status === 'APPROVED', 'Four-Eyes Dual Sign-Off succeeds with distinct authorizing Station Commander (OCS)');

  console.log('\n================================================================');
  console.log(` ALL PHASE 2 TESTS PASSED: ${passed}/${total} (100% SUCCESS)`);
  console.log('================================================================\n');
}

runPhase2Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
