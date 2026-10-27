import type { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, getClientIp, parseJsonBody } from '../_lib/auth.js';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';

const UnlockSchema = z.object({
  password: z.string().min(1).max(256)
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Allow locked session so officer can unlock it
  const user = await requireAuth(req, res, undefined, { allowLocked: true });
  if (!user) return;

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  try {
    const rawBody = await parseJsonBody(req);
    const parsed = UnlockSchema.safeParse(rawBody);

    if (!parsed.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Password is required' }));
      return;
    }

    const { password } = parsed.data;

    // Fetch officer hash
    const rows = await sql`
      SELECT password_hash FROM officers WHERE id = ${user.id} LIMIT 1;
    `;

    if (rows.length === 0 || !rows[0].password_hash) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
      return;
    }

    const isValid = await bcrypt.compare(password, rows[0].password_hash);
    if (!isValid) {
      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'AUTH_UNLOCK_FAILED',
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: 'Failed password challenge to unlock terminal'
      });

      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
      return;
    }

    // Unlock session server-side
    await sql`
      UPDATE sessions
      SET is_locked = false, locked_at = null, last_active_at = now()
      WHERE id = ${user.sessionId};
    `;

    await logAuditEvent({
      stationId: user.station_id,
      actionType: 'AUTH_TERMINAL_UNLOCKED',
      actorId: user.id,
      actorServiceNumber: user.service_number,
      actorRole: user.role_id,
      ipAddress: clientIp,
      userAgent,
      justification: 'Officer unlocked terminal with password verification'
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'UNLOCKED',
      message: 'Terminal unlocked successfully'
    }));
  } catch (err: any) {
    console.error('Unlock error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
