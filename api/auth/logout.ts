import type { IncomingMessage, ServerResponse } from 'http';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { setSecurityHeaders, SESSION_COOKIE_NAME, getClientIp, parseCookies, serializeCookie } from '../_lib/auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setSecurityHeaders(req, res);

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE_NAME];
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  if (sessionId) {
    const sql = getDb();
    
    // Find officer for audit logging before deletion
    const sess = await sql`
      SELECT s.officer_id, o.station_id, o.service_number, o.role_id 
      FROM sessions s 
      JOIN officers o ON o.id = s.officer_id 
      WHERE s.id = ${sessionId} 
      LIMIT 1;
    `;

    if (sess.length > 0) {
      await logAuditEvent({
        stationId: sess[0].station_id,
        actionType: 'AUTH_LOGOUT',
        actorId: sess[0].officer_id,
        actorServiceNumber: sess[0].service_number,
        actorRole: sess[0].role_id,
        ipAddress: clientIp,
        userAgent,
        justification: 'Officer signed out manually'
      });
    }

    // Invalidate session in database
    await sql`DELETE FROM sessions WHERE id = ${sessionId};`;
  }

  // Clear cookie
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  }));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Logged out successfully' }));
}
