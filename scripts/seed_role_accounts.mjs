import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
    const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/) || envContent.match(/DATABASE_URL_UNPOOLED="?([^"\r\n]+)"?/);
    if (match) connectionString = match[1];
  } catch {}
}

if (!connectionString) {
  console.error('ERROR: Missing DATABASE_URL');
  process.exit(1);
}

const DEFAULT_PASSWORD = process.env.DEFAULT_STATION_PASSWORD || 'Station@2026!';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

async function seedAllRoles() {
  const sql = neon(connectionString);

  console.log(`Hashing password "${DEFAULT_PASSWORD}" with bcrypt (cost 12)...`);
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  // 1. Get or create station
  const stationRows = await sql`SELECT id FROM stations LIMIT 1;`;
  const stationId = stationRows[0]?.id || '00000000-0000-0000-0000-000000000001';

  // 2. Add DPP / ODPP_PROSECUTOR role to roles table if not exists
  console.log('Ensuring roles table has all roles including DPP / ODPP...');
  await sql`
    INSERT INTO roles (id, name, description, permissions)
    VALUES 
      ('DPP', 'Director of Public Prosecutions (ODPP Liaison)', 'State prosecution review: Accesses court-ready prosecution dossiers, evidence chain-of-custody, case files and charge sheets', '["cases:read", "evidence:read", "odpp:review", "reports:read", "ob:read"]'::jsonb),
      ('ODPP_PROSECUTOR', 'Office of Director of Public Prosecutions', 'State prosecution counsel oversight and court docket preparations', '["cases:read", "evidence:read", "odpp:review", "reports:read", "ob:read"]'::jsonb)
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions;
  `;

  // 3. Define target accounts for all roles
  const accounts = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      service_number: 'KPS-238914',
      national_id_hash: 'nid_hash_ocs_001',
      national_id_encrypted: 'nid_enc_ocs_001',
      full_name: 'SSP Kipchoge Mwangi',
      rank: 'Senior Superintendent of Police',
      role_id: 'OCS',
      email: 'ocs.mwangi@rockportpolice.go.ke',
      phone_hash: 'p_hash_ocs_001',
      phone_encrypted: 'p_enc_ocs_001',
      mfa_enabled: true
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      service_number: 'KPS-241088',
      national_id_hash: 'nid_hash_deputy_002',
      national_id_encrypted: 'nid_enc_deputy_002',
      full_name: 'Chief Insp David Otieno',
      rank: 'Chief Inspector',
      role_id: 'DEPUTY_OCS',
      email: 'deputy.otieno@rockportpolice.go.ke',
      phone_hash: 'p_hash_deputy_002',
      phone_encrypted: 'p_enc_deputy_002',
      mfa_enabled: true
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      service_number: 'KPS-245980',
      national_id_hash: 'nid_hash_duty_003',
      national_id_encrypted: 'nid_enc_duty_003',
      full_name: 'IP David Otieno',
      rank: 'Inspector',
      role_id: 'DUTY_OFFICER_OB_CLERK',
      email: 'duty.otieno@rockportpolice.go.ke',
      phone_hash: 'p_hash_duty_003',
      phone_encrypted: 'p_enc_duty_003',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000013',
      service_number: 'KPS-248901',
      national_id_hash: 'nid_hash_duty_kamau',
      national_id_encrypted: 'nid_enc_duty_kamau',
      full_name: 'Sgt Peter Kamau',
      rank: 'Sergeant',
      role_id: 'DUTY_OFFICER_OB_CLERK',
      email: 'duty.kamau@rockportpolice.go.ke',
      phone_hash: 'p_hash_duty_kamau',
      phone_encrypted: 'p_enc_duty_kamau',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      service_number: 'KPS-250122',
      national_id_hash: 'nid_hash_io_004',
      national_id_encrypted: 'nid_enc_io_004',
      full_name: 'Cpl Grace Wambui',
      rank: 'Corporal',
      role_id: 'INVESTIGATING_OFFICER',
      email: 'io.wambui@rockportpolice.go.ke',
      phone_hash: 'p_hash_io_004',
      phone_encrypted: 'p_enc_io_004',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      service_number: 'KPS-248765',
      national_id_hash: 'nid_hash_cells_005',
      national_id_encrypted: 'nid_enc_cells_005',
      full_name: 'Sgt James Mutua',
      rank: 'Sergeant',
      role_id: 'CELL_SERGEANT',
      email: 'cells.mutua@rockportpolice.go.ke',
      phone_hash: 'p_hash_cells_005',
      phone_encrypted: 'p_enc_cells_005',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      service_number: 'KPS-253441',
      national_id_hash: 'nid_hash_rec_006',
      national_id_encrypted: 'nid_enc_rec_006',
      full_name: 'PC Brian Kiprono',
      rank: 'Constable',
      role_id: 'RECORDS_CLERK',
      email: 'records.kiprono@rockportpolice.go.ke',
      phone_hash: 'p_hash_rec_006',
      phone_encrypted: 'p_enc_rec_006',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000007',
      service_number: 'IPOA-00412',
      national_id_hash: 'nid_hash_ipoa_007',
      national_id_encrypted: 'nid_enc_ipoa_007',
      full_name: 'Mercy Chebet (IPOA)',
      rank: 'Superintendent of Police',
      role_id: 'AUDITOR',
      email: 'auditor.chebet@ipoa.go.ke',
      phone_hash: 'p_hash_ipoa_007',
      phone_encrypted: 'p_enc_ipoa_007',
      mfa_enabled: true
    },
    {
      id: '00000000-0000-0000-0000-000000000017',
      service_number: 'AUD-990142',
      national_id_hash: 'nid_hash_aud_008',
      national_id_encrypted: 'nid_enc_aud_008',
      full_name: 'Auditor Leah Nyambura',
      rank: 'Superintendent of Police',
      role_id: 'AUDITOR',
      email: 'auditor.nyambura@oversight.go.ke',
      phone_hash: 'p_hash_aud_008',
      phone_encrypted: 'p_enc_aud_008',
      mfa_enabled: true
    },
    {
      id: '00000000-0000-0000-0000-000000000018',
      service_number: 'ODPP-88219',
      national_id_hash: 'nid_hash_dpp_009',
      national_id_encrypted: 'nid_enc_dpp_009',
      full_name: 'SC Anthony Wakoli (ODPP)',
      rank: 'Superintendent of Police',
      role_id: 'DPP',
      email: 'prosecutions.wakoli@odpp.go.ke',
      phone_hash: 'p_hash_dpp_009',
      phone_encrypted: 'p_enc_dpp_009',
      mfa_enabled: false
    },
    {
      id: '00000000-0000-0000-0000-000000000008',
      service_number: 'TECH-000001',
      national_id_hash: 'nid_hash_tech_010',
      national_id_encrypted: 'nid_enc_tech_010',
      full_name: 'LQD Break-Glass Engineer',
      rank: 'Inspector General',
      role_id: 'ADMIN_SUPER_OWNER',
      email: 'support@lqdcreatives.com',
      phone_hash: 'p_hash_tech_010',
      phone_encrypted: 'p_enc_tech_010',
      mfa_enabled: false
    }
  ];

  console.log(`Upserting ${accounts.length} role-based accounts with password_hash...`);

  for (const acc of accounts) {
    const existing = await sql`SELECT id FROM officers WHERE id = ${acc.id}::uuid OR service_number = ${acc.service_number} OR email = ${acc.email} LIMIT 1;`;

    if (existing.length > 0) {
      await sql`
        UPDATE officers
        SET password_hash = ${passwordHash},
            role_id = ${acc.role_id},
            full_name = ${acc.full_name},
            rank = ${acc.rank},
            email = ${acc.email},
            status = 'ACTIVE',
            is_deleted = false,
            failed_login_attempts = 0,
            locked_until = NULL,
            must_change_password = false,
            totp_secret = ${TOTP_SECRET},
            mfa_enabled = ${acc.mfa_enabled},
            updated_at = now()
        WHERE id = ${existing[0].id};
      `;
      console.log(`[PASS] Updated role credentials for ${acc.role_id} (${acc.service_number} - ${acc.full_name})`);
    } else {
      await sql`
        INSERT INTO officers (
          id, station_id, service_number, national_id_hash, national_id_encrypted,
          full_name, rank, role_id, phone_encrypted, phone_hash, email,
          status, mfa_enabled, totp_secret, password_hash, must_change_password, failed_login_attempts
        ) VALUES (
          ${acc.id}, ${stationId}, ${acc.service_number}, ${acc.national_id_hash}, ${acc.national_id_encrypted},
          ${acc.full_name}, ${acc.rank}, ${acc.role_id}, ${acc.phone_encrypted}, ${acc.phone_hash}, ${acc.email},
          'ACTIVE', ${acc.mfa_enabled}, ${TOTP_SECRET}, ${passwordHash}, false, 0
        );
      `;
      console.log(`[PASS] Created role credentials for ${acc.role_id} (${acc.service_number} - ${acc.full_name})`);
    }
  }

  console.log('\n--- VERIFYING SEEDED OFFICERS ---');
  const verify = await sql`
    SELECT service_number, full_name, rank, role_id, email, status, mfa_enabled, 
           (password_hash IS NOT NULL) as has_password
    FROM officers 
    WHERE is_deleted = false
    ORDER BY role_id;
  `;
  console.table(verify);
}

seedAllRoles().catch(err => {
  console.error('Failed to seed role accounts:', err);
  process.exit(1);
});
