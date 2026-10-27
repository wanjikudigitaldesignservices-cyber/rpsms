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

  // Any authenticated officer can inspect the live RLS status
  const user = await requireAuth(req, res);
  if (!user) return;

  const sql = getDb();

  try {
    const tables = await sql`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid=c.relnamespace 
      WHERE n.nspname='public' AND c.relkind='r'
      ORDER BY c.relname;
    `;

    const policies = await sql`
      SELECT tablename, policyname, cmd, qual 
      FROM pg_policies 
      ORDER BY tablename, policyname;
    `;

    const tablesWithRls = tables.filter(t => t.relrowsecurity).length;
    const isLiveRlsActive = tablesWithRls >= 30 && policies.length > 50;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      rlsActive: isLiveRlsActive,
      totalTables: tables.length,
      tablesWithRls,
      policiesCount: policies.length,
      tables: tables.map(t => ({
        tableName: t.relname,
        relrowsecurity: t.relrowsecurity,
        relforcerowsecurity: t.relforcerowsecurity
      })),
      policiesSample: policies.slice(0, 10)
    }));
  } catch (err: any) {
    console.error('Failed to query RLS status:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to query live PostgreSQL RLS status' }));
  }
}
