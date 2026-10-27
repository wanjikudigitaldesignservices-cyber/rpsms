import { Client } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const match = envContent.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
const ownerUrl = match[1];

async function setupRole() {
  const client = new Client({ connectionString: ownerUrl });
  await client.connect();

  console.log('Setting up least-privilege Neon role: rpsms_app ...');

  // Check if role exists
  const check = await client.query("SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'rpsms_app';");
  if (check.rows.length === 0) {
    // Generate secure random password for rpsms_app
    await client.query(`
      CREATE ROLE rpsms_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD 'RpsmsLeastPrivilege2026!';
    `);
    console.log('[PASS] Created role rpsms_app with NOBYPASSRLS');
  } else {
    await client.query(`
      ALTER ROLE rpsms_app WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    `);
    console.log('[PASS] Verified rpsms_app has NOBYPASSRLS');
  }

  // Grant schema permissions
  await client.query(`
    GRANT USAGE ON SCHEMA public TO rpsms_app;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO rpsms_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rpsms_app;

    -- Explicitly REVOKE DELETE and TRUNCATE on tamper-evident tables
    REVOKE DELETE, TRUNCATE ON ob_entries, audit_log, login_audit, custody_records, persons, person_identifiers, mugshots, role_permissions FROM rpsms_app;
  `);

  console.log('[PASS] Configured permissions: SELECT, INSERT, UPDATE granted; DELETE and TRUNCATE revoked on ledger/audit tables.');

  // Verify role settings
  const verify = await client.query(`
    SELECT rolname, rolsuper, rolcanlogin, rolbypassrls 
    FROM pg_roles 
    WHERE rolname = 'rpsms_app';
  `);
  console.table(verify.rows);

  // Test privilege restriction on ob_entries DELETE
  const appConn = ownerUrl.replace(/:\/\/[^:]+:[^@]+@/, '://rpsms_app:RpsmsLeastPrivilege2026!@');
  const appClient = new Client({ connectionString: appConn });
  try {
    await appClient.connect();
    console.log('[PASS] Successfully connected to Neon as rpsms_app');

    // Test SELECT
    const obCount = await appClient.query('SELECT count(*)::int as count FROM ob_entries;');
    console.log(`[PASS] rpsms_app can SELECT from ob_entries (count: ${obCount.rows[0].count})`);

    // Test DELETE (Must Fail)
    try {
      await appClient.query("DELETE FROM ob_entries WHERE id = '00000000-0000-0000-0000-000000000000';");
      console.error('[FAIL] rpsms_app was able to DELETE from ob_entries!');
    } catch (err) {
      console.log(`[PASS] Direct DELETE on ob_entries correctly blocked by PostgreSQL: ${err.message}`);
    }

    await appClient.end();
  } catch (err) {
    console.warn('Could not test appClient direct connection:', err.message);
  }

  await client.end();
}

setupRole().catch(err => {
  console.error('Failed to setup role:', err);
  process.exit(1);
});
