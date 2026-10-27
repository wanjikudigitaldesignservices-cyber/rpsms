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

  // Any authenticated officer can inspect the station RBAC permission matrix
  const user = await requireAuth(req, res);
  if (!user) return;

  const sql = getDb();

  try {
    const roles = await sql`
      SELECT id, name, display_name, description, clearance_level
      FROM roles
      ORDER BY clearance_level DESC;
    `;

    const permissions = await sql`
      SELECT role_id, permission, description
      FROM role_permissions
      ORDER BY role_id, permission;
    `;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      roles,
      permissions,
      matrixSource: 'PostgreSQL role_permissions table (Neon Single Source of Truth)'
    }));
  } catch (err: any) {
    console.error('Failed to query RBAC matrix:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to retrieve RBAC matrix' }));
  }
}
