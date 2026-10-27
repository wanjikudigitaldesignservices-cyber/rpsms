import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('=== RPSMS Phase 1: Database Migration Verification ===');
  const db = new PGlite();

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files in supabase/migrations/`);

  for (const file of files) {
    process.stdout.write(`Applying ${file}... `);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await db.exec(sql);
    console.log('OK');
  }

  const res = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tableNames = res.rows.map(r => r.table_name);
  console.log(`Successfully created ${tableNames.length} tables in public schema:`);
  console.log(tableNames.join(', '));

  const countOfficers = await db.query(`SELECT COUNT(*)::text as count FROM officers;`);
  console.log(`Officers seeded: ${countOfficers.rows[0].count}`);

  const roles = await db.query(`SELECT id, name FROM roles ORDER BY id;`);
  console.log(`Roles verified (${roles.rows.length}):`);
  for (const r of roles.rows) {
    console.log(` - [${r.id}] ${r.name}`);
  }

  const station = await db.query(`SELECT id, name, code, station_type FROM stations;`);
  console.log('Station verified:', station.rows[0]);

  const auditCount = await db.query(`SELECT count(*)::text as count, action_type, log_hash FROM audit_log GROUP BY action_type, log_hash;`);
  console.log('Audit log genesis verification:', auditCount.rows[0]);

  // Run chain verification function
  const auditVerification = await db.query(`SELECT verify_audit_log_chain('a0000000-0000-0000-0000-000000000001'::uuid) as result;`);
  console.log('Chain verification output:', JSON.stringify(auditVerification.rows[0].result, null, 2));

  await db.close();
  console.log('=== Migration Verification Completed Successfully ===');
}

run().catch(err => {
  console.error('Migration verification failed:', err);
  process.exit(1);
});
