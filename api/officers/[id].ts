import type { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';
import { validatePasswordPolicy } from '../_lib/password.js';

const UpdateOfficerSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'RETIRED']).optional(),
  suspensionReason: z.string().optional(),
  resetPassword: z.string().min(12).optional(),
  roleId: z.string().optional()
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only OCS can mutate officer accounts
  const user = await requireAuth(req, res, ['OCS', 'ADMIN_SUPER_OWNER']);
  if (!user) return;

  // Extract ID from URL path (e.g. /api/officers/uuid or /api/officers/[id])
  const urlParts = req.url?.split('?')[0].split('/') || [];
  const officerId = urlParts[urlParts.length - 1];

  if (!officerId || officerId === 'officers') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing officer ID' }));
    return;
  }

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const rawBody = await parseJsonBody(req);
      const parsed = UpdateOfficerSchema.safeParse(rawBody);

      if (!parsed.success) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }));
        return;
      }

      const { status, suspensionReason, resetPassword, roleId } = parsed.data;

      // Prevent OCS from suspending themselves
      if (officerId === user.id && status && status !== 'ACTIVE') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'OCS cannot suspend or deactivate their own primary account' }));
        return;
      }

      let newPasswordHash: string | undefined = undefined;
      if (resetPassword) {
        const policyCheck = validatePasswordPolicy(resetPassword);
        if (!policyCheck.valid) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: policyCheck.error }));
          return;
        }
        const salt = await bcrypt.genSalt(12);
        newPasswordHash = await bcrypt.hash(resetPassword, salt);
      }

      const target = await sql`SELECT id, service_number, role_id, status FROM officers WHERE id = ${officerId} LIMIT 1;`;
      if (target.length === 0) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Officer not found' }));
        return;
      }

      await sql`
        UPDATE officers
        SET 
          status = COALESCE(${status || null}, status),
          suspension_reason = COALESCE(${suspensionReason || null}, suspension_reason),
          role_id = COALESCE(${roleId || null}, role_id),
          password_hash = COALESCE(${newPasswordHash || null}, password_hash),
          must_change_password = CASE WHEN ${Boolean(newPasswordHash)} THEN true ELSE must_change_password END,
          updated_at = now()
        WHERE id = ${officerId};
      `;

      // If officer was suspended or password reset, terminate all their active sessions immediately
      if (status === 'SUSPENDED' || resetPassword) {
        await sql`DELETE FROM sessions WHERE officer_id = ${officerId};`;
      }

      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'OFFICER_ACCOUNT_UPDATED',
        tableName: 'officers',
        recordId: officerId,
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: `Account modification for ${target[0].service_number}. Status: ${status || 'unchanged'}`
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Officer account updated successfully' }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Failed to update officer' }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
