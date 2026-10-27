import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';

const SoftDeleteObSchema = z.object({
  reason: z.string().min(10, 'Mandatory audit justification required (at least 10 chars)'),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const urlParts = req.url?.split('?')[0].split('/') || [];
  const obId = urlParts[urlParts.length - 1];

  if (!obId || obId === 'ob') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing OB entry ID' }));
    return;
  }

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  // 1. GET: Fetch single OB entry (Block IDOR: verify station)
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT * FROM ob_entries 
      WHERE id = ${obId} AND station_id = ${user.station_id} AND is_deleted = false
      LIMIT 1;
    `;

    if (rows.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'OB entry not found or unauthorized' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ entry: rows[0] }));
    return;
  }

  // 2. DELETE / PATCH: Soft delete OB entry - STRICTLY REQUIRES OCS ROLE & MANDATORY REASON!
  if (req.method === 'DELETE' || (req.method === 'PATCH' && req.url?.includes('soft-delete'))) {
    if (user.role_id !== 'OCS' && user.role_id !== 'ADMIN_SUPER_OWNER') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Hard deletion is prohibited. Soft-deletion requires Station Commander (OCS) authorization.' }));
      return;
    }

    try {
      const rawBody = await parseJsonBody(req);
      const parsed = SoftDeleteObSchema.safeParse(rawBody);

      if (!parsed.success) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Mandatory reason required' }));
        return;
      }

      const { reason } = parsed.data;

      const target = await sql`SELECT id, ob_number FROM ob_entries WHERE id = ${obId} LIMIT 1;`;
      if (target.length === 0) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'OB entry not found' }));
        return;
      }

      // Soft delete in database
      await sql`
        UPDATE ob_entries
        SET is_deleted = true,
            deleted_at = now(),
            deleted_by = ${user.id},
            delete_reason = ${reason.trim()},
            ocs_approved_delete = true,
            ocs_approved_by = ${user.id}
        WHERE id = ${obId};
      `;

      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'OB_ENTRY_SOFT_DELETED',
        tableName: 'ob_entries',
        recordId: obId,
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: `OCS soft-deleted ${target[0].ob_number}. Reason: ${reason}`
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: `OB entry ${target[0].ob_number} soft-deleted with OCS approval` }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Failed to soft delete OB entry' }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
