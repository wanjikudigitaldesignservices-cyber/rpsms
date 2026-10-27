import type { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, 'Password must be at least 12 characters').max(128)
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  try {
    const rawBody = await parseJsonBody(req);
    const parsed = ChangePasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Invalid password payload' }));
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    // Verify current password
    const officerRes = await sql`
      SELECT password_hash FROM officers WHERE id = ${user.id} LIMIT 1;
    `;

    if (officerRes.length === 0 || !officerRes[0].password_hash) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Current password verification failed' }));
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, officerRes[0].password_hash);
    if (!isMatch) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Incorrect current password' }));
      return;
    }

    // Hash new password with bcrypt cost 12
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await sql`
      UPDATE officers
      SET password_hash = ${newHash},
          must_change_password = false,
          updated_at = now()
      WHERE id = ${user.id};
    `;

    await logAuditEvent({
      stationId: user.station_id,
      actionType: 'AUTH_PASSWORD_CHANGED',
      actorId: user.id,
      actorServiceNumber: user.service_number,
      actorRole: user.role_id,
      ipAddress: clientIp,
      userAgent,
      justification: 'Officer password updated'
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Password updated successfully' }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Failed to update password' }));
  }
}
