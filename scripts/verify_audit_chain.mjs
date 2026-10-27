import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuditChainVerification() {
  console.log('================================================================');
  console.log(' AUDIT LOG CRYPTOGRAPHIC SHA-256 HASH CHAIN VERIFICATION');
  console.log('================================================================\n');

  const db = new PGlite();
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await db.exec(sql);
  }

  const STATION_ID = 'a0000000-0000-0000-0000-000000000001';

  // Execute database verification RPC
  const result = await db.query(`SELECT verify_audit_log_chain('${STATION_ID}'::uuid) as report;`);
  const report = result.rows[0].report;

  console.log('Station ID:       ', STATION_ID);
  console.log('Ledger Status:    ', report.is_valid ? 'CRYPTOGRAPHICALLY INTACT [VALID]' : 'TAMPERED / CORRUPTED [INVALID]');
  console.log('Total Block Count:', report.total_records);
  console.log('Broken At Seq:    ', report.broken_at_seq ?? 'None');
  console.log('Audit Summary:    ', report.details);
  console.log('\n================================================================');

  if (!report.is_valid) {
    throw new Error('Audit log chain verification failed: Tampering detected');
  }

  await db.close();
}

runAuditChainVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
