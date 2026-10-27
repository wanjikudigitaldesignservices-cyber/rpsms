import type { IncomingMessage, ServerResponse } from 'http';
import { requireAuth, getClientIp } from '../auth.js';
import { getDb } from '../db.js';
import { logAuditEvent } from '../audit.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // requireAuth verifies active session (returns 401 if invalid/expired)
  const user = await requireAuth(req, res);
  if (!user) return;

  const sql = getDb();
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  await sql`
    UPDATE sessions
    SET is_locked = true, locked_at = now()
    WHERE id = ${user.sessionId};
  `;

  await logAuditEvent({
    stationId: user.station_id,
    actionType: 'AUTH_TERMINAL_LOCKED',
    actorId: user.id,
    actorServiceNumber: user.service_number,
    actorRole: user.role_id,
    ipAddress: clientIp,
    userAgent,
    justification: 'Officer manually locked terminal'
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'LOCKED',
    lockedAt: new Date().toISOString(),
    message: 'Terminal locked successfully'
  }));
}
