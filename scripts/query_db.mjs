import { Client } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
const client = new Client({ connectionString: match[1] });
await client.connect();

const sql = process.argv[2] || 'SELECT count(*)::int FROM role_permissions;';
try {
  const res = await client.query(sql);
  if (res.rows && res.rows.length > 0) {
    console.table(res.rows);
  } else {
    console.log(`Executed successfully. Row count: ${res.rowCount}`);
  }
} catch (e) {
  console.error('Error executing query:', e.message);
} finally {
  await client.end();
}
