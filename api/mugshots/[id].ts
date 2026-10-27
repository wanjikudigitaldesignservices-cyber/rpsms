import type { IncomingMessage, ServerResponse } from 'http';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { requireAuth, getClientIp } from '../_lib/auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // MUST be authenticated to access detainee mugshot
  const user = await requireAuth(req, res);
  if (!user) return; // 401 sent if not authenticated

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const urlParts = req.url?.split('?')[0].split('/') || [];
  const mugshotId = urlParts[urlParts.length - 1];

  if (!mugshotId || mugshotId === 'mugshots') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing mugshot ID' }));
    return;
  }

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  try {
    const rows = await sql`
      SELECT id, person_id, station_id, view_angle, image_data_url, sha256_hash 
      FROM mugshots 
      WHERE id = ${mugshotId} 
      LIMIT 1;
    `;

    if (rows.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Mugshot not found' }));
      return;
    }

    const mugshot = rows[0];

    // Log mugshot view for anti-corruption and biometric accountability
    await logAuditEvent({
      stationId: user.station_id,
      actionType: 'MUGSHOT_ACCESSED',
      tableName: 'mugshots',
      recordId: mugshot.id,
      actorId: user.id,
      actorServiceNumber: user.service_number,
      actorRole: user.role_id,
      ipAddress: clientIp,
      userAgent,
      justification: `Officer inspected ${mugshot.view_angle} mugshot for person ${mugshot.person_id}`
    });

    // Check if client requested raw image stream or JSON
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('image/')) {
      const base64Data = (mugshot.image_data_url as string).replace(/^data:image\/[a-z]+;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imgBuffer.length);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.end(imgBuffer);
      return;
    }

    // Otherwise return protected JSON payload
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.end(JSON.stringify({
      id: mugshot.id,
      personId: mugshot.person_id,
      viewAngle: mugshot.view_angle,
      imageDataUrl: mugshot.image_data_url,
      sha256Hash: mugshot.sha256_hash
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Failed to serve mugshot' }));
  }
}
