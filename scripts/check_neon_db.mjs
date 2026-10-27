import { Client } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = (env.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || env.match(/DATABASE_URL="?([^"\r\n]+)"?/))[1];

async function check() {
  const client = new Client({ connectionString: url });
  await client.connect();
  const roles = await client.query('SELECT rolname FROM pg_roles;');
  console.log('Roles:', roles.rows.map(r => r.rolname));
  await client.end();
}

check().catch(console.error);
