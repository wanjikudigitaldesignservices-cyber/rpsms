import { Client } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!match) {
  console.error('No database URL found');
  process.exit(1);
}
const url = match[1];

async function runAudit() {
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log('=== CURRENT USER & ROLES PRIVILEGES ===');
  const roles = await client.query(`
    SELECT rolname, rolsuper, rolcanlogin, rolbypassrls 
    FROM pg_roles 
    WHERE rolname IN (current_user, 'neondb_owner', 'authenticated', 'anon')
    ORDER BY rolname;
  `);
  console.table(roles.rows);

  console.log('\n=== RLS ON PUBLIC TABLES (pg_class) ===');
  const rlsTables = await client.query(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity 
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid=c.relnamespace 
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relname;
  `);
  console.log(`Total public tables: ${rlsTables.rowCount}`);
  console.log(`Tables with RLS enabled: ${rlsTables.rows.filter(r => r.relrowsecurity).length}`);
  console.log('Tables WITHOUT RLS:', rlsTables.rows.filter(r => !r.relrowsecurity).map(r => r.relname).join(', '));
  console.log('Tables WITH RLS (sample 10):', rlsTables.rows.filter(r => r.relrowsecurity).map(r => r.relname).slice(0, 10).join(', '));

  console.log('\n=== ROW LEVEL SECURITY POLICIES (pg_policies) ===');
  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual 
    FROM pg_policies 
    ORDER BY tablename, policyname;
  `);
  console.log(`Total Policies Found: ${policies.rowCount}`);
  console.log('Sample Policies:');
  policies.rows.slice(0, 5).forEach(p => {
    console.log(` - [${p.tablename}] ${p.policyname} (${p.cmd}) => ${p.qual}`);
  });

  console.log('\n=== USER / ROLE / PERMISSION / SECURITY TABLES ===');
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('officers', 'roles', 'permissions', 'role_permissions', 'users', 'sessions', 'login_audit')
    ORDER BY table_name;
  `);
  console.table(tables.rows);

  await client.end();
}

runAudit().catch(err => {
  console.error('Audit query error:', err.message);
  process.exit(1);
});
