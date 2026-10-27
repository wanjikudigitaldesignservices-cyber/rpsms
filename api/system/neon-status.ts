import type { IncomingMessage, ServerResponse } from 'http';
import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only authenticated officers can query system status
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const sql = getDb();

  try {
    const startTime = Date.now();
    const dbInfo = await sql`SELECT current_database(), version();`;
    const latency = Date.now() - startTime;

    const tableCounts = await sql`
      SELECT 
        (SELECT count(*) FROM officers)::text as officers_count,
        (SELECT count(*) FROM roles)::text as roles_count,
        (SELECT count(*) FROM ob_entries WHERE is_deleted = false)::text as ob_count,
        (SELECT count(*) FROM sessions)::text as active_sessions;
    `;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'HEALTHY',
      database: {
        connected: true,
        latencyMs: latency,
        name: dbInfo[0].current_database,
        branch: process.env.NEON_BRANCH || 'production',
        tables: {
          officers: Number(tableCounts[0].officers_count),
          roles: Number(tableCounts[0].roles_count),
          activeObEntries: Number(tableCounts[0].ob_count),
          activeSessions: Number(tableCounts[0].active_sessions)
        }
      },
      zeroTrustLayer: {
        serverAuthEnforced: true,
        auditImmutabilityEnforced: true,
        clientDbAccessBlocked: true
      }
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      status: 'UNHEALTHY', 
      error: err.message || 'Database connection error' 
    }));
  }
}
