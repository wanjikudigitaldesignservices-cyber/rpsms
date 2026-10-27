import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
const sql = neon(match[1]);

const tables = await sql`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name IN ('sessions', 'login_audit')
  ORDER BY table_name;
`;
console.log('Confirmed tables in production DB:', tables);

const cols = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'officers' AND column_name IN ('password_hash', 'must_change_password', 'failed_login_attempts', 'locked_until')
  ORDER BY column_name;
`;
console.log('Confirmed officers security columns in production DB:', cols);
