import { Client } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);

if (!dbUrlMatch) {
  console.error('ERROR: Could not find DATABASE_URL or DATABASE_URL_UNPOOLED in .env.local');
  process.exit(1);
}

const connectionString = dbUrlMatch[1];
console.log('Connecting to Neon PostgreSQL at:', connectionString.replace(/:[^:@]+@/, ':****@'));

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to Neon PostgreSQL successfully!');

  // Ensure schema_migrations table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Check if initial 5 migrations are recorded; if not, mark them applied since tables exist
  const existingMigrations = await client.query('SELECT version FROM schema_migrations;');
  const appliedSet = new Set(existingMigrations.rows.map(r => r.version));

  // If table check shows core tables already exist, mark initial migrations as applied
  const tablesCheck = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'officers';");
  if (tablesCheck.rows.length > 0 && !appliedSet.has('20261027000001_core_schema.sql')) {
    const priorMigrations = [
      '20261027000001_core_schema.sql',
      '20261027000002_audit_and_triggers.sql',
      '20261027000003_rbac_and_rls.sql',
      '20261027000004_seed_roles_and_station.sql',
      '20261027000005_seed_test_officers.sql'
    ];
    for (const m of priorMigrations) {
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING;', [m]);
      appliedSet.add(m);
    }
  }

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Checking ${files.length} migrations...`);

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  -> Skipping ${file} (already applied)`);
      continue;
    }

    process.stdout.write(`  -> Applying ${file}... `);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
      console.log('DONE');
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      throw err;
    }
  }

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tables = res.rows.map(r => r.table_name);
  console.log(`\nVerified ${tables.length} tables in Neon PostgreSQL public schema:`);
  console.log(tables.join(', '));

  const officers = await client.query('SELECT count(*)::text as count FROM officers;');
  console.log(`Officers seeded in Neon: ${officers.rows[0].count}`);

  const roles = await client.query('SELECT count(*)::text as count FROM roles;');
  console.log(`Roles seeded in Neon: ${roles.rows[0].count}`);

  await client.end();
  console.log('\n=== Neon PostgreSQL Migration Succeeded 100% ===');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
