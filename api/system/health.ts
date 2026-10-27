import type { IncomingMessage, ServerResponse } from 'http';
import { requireAuth } from '../_lib/auth.js';
import { getDb } from '../_lib/db.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Strictly OCS / Station Administrator role check
  const user = await requireAuth(req, res, ['OCS', 'ADMIN_SUPER_OWNER']);
  if (!user) return;

  try {
    const sql = getDb();
    await sql`SELECT 1;`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    // Return neutral status without vendor, database engine, or cloud telemetry
    res.end(JSON.stringify({
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'DEGRADED',
      timestamp: new Date().toISOString()
    }));
  }
}
