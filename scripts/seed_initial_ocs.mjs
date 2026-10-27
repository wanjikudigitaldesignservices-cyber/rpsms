import { Client } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local if available for connection string
let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
    const match = envContent.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/) || envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
    if (match) connectionString = match[1];
  } catch {}
}

if (!connectionString) {
  console.error('ERROR: Missing DATABASE_URL');
  process.exit(1);
}

const serviceNumber = (process.env.INITIAL_OCS_SERVICE_NUMBER || 'KPS-238914').trim().toUpperCase();
const initialPassword = process.env.INITIAL_OCS_PASSWORD;
const fullName = process.env.INITIAL_OCS_NAME || 'SSP Kipchoge Mwangi';
const email = (process.env.INITIAL_OCS_EMAIL || 'ocs.rockport@police.go.ke').trim().toLowerCase();

if (!initialPassword) {
  console.error('ERROR: INITIAL_OCS_PASSWORD environment variable is required.');
  console.error('Usage: INITIAL_OCS_PASSWORD="<secure-temp-pass>" node scripts/seed_initial_ocs.mjs');
  process.exit(1);
}

if (initialPassword.length < 12) {
  console.error('ERROR: INITIAL_OCS_PASSWORD must be at least 12 characters long.');
  process.exit(1);
}

async function seedOcs() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log(`Hashing password with bcrypt cost 12 for OCS ${serviceNumber}...`);
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(initialPassword, salt);

  // Check if OCS exists
  const check = await client.query('SELECT id FROM officers WHERE service_number = $1 OR role_id = $2;', [serviceNumber, 'OCS']);

  if (check.rows.length > 0) {
    const ocsId = check.rows[0].id;
    await client.query(`
      UPDATE officers
      SET password_hash = $1,
          must_change_password = true,
          failed_login_attempts = 0,
          locked_until = null,
          status = 'ACTIVE',
          updated_at = now()
      WHERE id = $2;
    `, [passwordHash, ocsId]);
    console.log(`[PASS] Updated existing OCS account (${serviceNumber}) with initial credentials and forced password change.`);
  } else {
    // Fetch default station
    const station = await client.query('SELECT id FROM stations LIMIT 1;');
    const stationId = station.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    await client.query(`
      INSERT INTO officers (
        station_id, service_number, full_name, rank, role_id, email, password_hash, must_change_password, status
      ) VALUES (
        $1, $2, $3, 'Senior Superintendent of Police', 'OCS', $4, $5, true, 'ACTIVE'
      );
    `, [stationId, serviceNumber, fullName, email, passwordHash]);
    console.log(`[PASS] Created initial OCS account (${serviceNumber}) with forced password change.`);
  }

  await client.end();
}

seedOcs().catch(err => {
  console.error('Failed to seed OCS:', err.message);
  process.exit(1);
});
