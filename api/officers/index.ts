import type { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { encryptField, hashField, maskPii } from '../_lib/crypto.js';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';

const CreateOfficerSchema = z.object({
  serviceNumber: z.string().min(5).max(32),
  nationalId: z.string().min(6).max(20),
  fullName: z.string().min(3).max(128),
  rank: z.string().min(3).max(64),
  roleId: z.string().min(2).max(32),
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  temporaryPassword: z.string().min(12)
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  // 1. GET: List all officers - OCS & AUDITOR ONLY!
  if (req.method === 'GET') {
    const user = await requireAuth(req, res, ['OCS', 'AUDITOR', 'ADMIN_SUPER_OWNER']);
    if (!user) return; // 401 or 403 sent by requireAuth

    const officers = await sql`
      SELECT 
        o.id,
        o.station_id,
        o.service_number,
        o.full_name,
        o.rank,
        o.role_id,
        r.name as role_name,
        o.email,
        o.phone_encrypted,
        o.status,
        o.mfa_enabled,
        o.must_change_password,
        o.last_login_at,
        o.created_at
      FROM officers o
      LEFT JOIN roles r ON r.id = o.role_id
      WHERE o.is_deleted = false
      ORDER BY o.created_at ASC;
    `;

    // Mask phone numbers in presentation
    const safeOfficers = officers.map(o => ({
      ...o,
      phone_masked: maskPii(o.phone_encrypted ? '07' + o.service_number.slice(-6) : '07xxxxxxx'),
      phone_encrypted: undefined // never send raw ciphertext to client unnecessarily
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ officers: safeOfficers }));
    return;
  }

  // 2. POST: Create officer - OCS ONLY!
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['OCS', 'ADMIN_SUPER_OWNER']);
    if (!user) return;

    try {
      const rawBody = await parseJsonBody(req);
      const parsed = CreateOfficerSchema.safeParse(rawBody);

      if (!parsed.success) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }));
        return;
      }

      const data = parsed.data;

      // Check unique service number
      const existing = await sql`
        SELECT id FROM officers WHERE LOWER(service_number) = LOWER(${data.serviceNumber}) OR LOWER(email) = LOWER(${data.email}) LIMIT 1;
      `;
      if (existing.length > 0) {
        res.statusCode = 409;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Officer with this service number or email already exists' }));
        return;
      }

      // Hash password with bcrypt cost 12
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(data.temporaryPassword, salt);

      // Field-level encryption for National ID and Phone
      const nationalIdEncrypted = encryptField(data.nationalId);
      const nationalIdHash = hashField(data.nationalId);
      const phoneEncrypted = encryptField(data.phone);
      const phoneHash = hashField(data.phone);

      const inserted = await sql`
        INSERT INTO officers (
          station_id,
          service_number,
          national_id_hash,
          national_id_encrypted,
          full_name,
          rank,
          role_id,
          phone_encrypted,
          phone_hash,
          email,
          status,
          password_hash,
          must_change_password,
          created_by
        ) VALUES (
          ${user.station_id},
          ${data.serviceNumber.trim().toUpperCase()},
          ${nationalIdHash},
          ${nationalIdEncrypted},
          ${data.fullName.trim()},
          ${data.rank.trim()},
          ${data.roleId},
          ${phoneEncrypted},
          ${phoneHash},
          ${data.email.trim().toLowerCase()},
          'ACTIVE',
          ${passwordHash},
          true,
          ${user.id}
        )
        RETURNING id, service_number, full_name, rank, role_id, email, status, must_change_password;
      `;

      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'OFFICER_CREATED',
        tableName: 'officers',
        recordId: inserted[0].id,
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: `OCS provisioned officer account for ${inserted[0].service_number}`
      });

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ officer: inserted[0] }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Failed to create officer' }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
