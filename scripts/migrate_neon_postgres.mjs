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

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Applying ${files.length} migrations to Neon PostgreSQL...`);

  for (const file of files) {
    process.stdout.write(`  -> Applying ${file}... `);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await client.query(sql);
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

  const station = await client.query('SELECT code, name FROM stations LIMIT 1;');
  console.log('Station in Neon:', station.rows[0]);

  await client.end();
  console.log('\n=== Neon PostgreSQL Migration Succeeded 100% ===');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
