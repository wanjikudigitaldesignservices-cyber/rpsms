import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';

const CreateApprovalSchema = z.object({
  actionType: z.string().min(2),
  targetResourceType: z.string().min(2),
  targetResourceId: z.string().uuid(),
  justification: z.string().min(10, 'Mandatory justification required (at least 10 characters)'),
  requiredRole: z.string().default('OCS')
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const sql = getDb();
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  // GET: List station approvals (Pending / Reviewed)
  if (req.method === 'GET') {
    try {
      const approvals = await sql`
        SELECT 
          a.id,
          a.station_id,
          a.action_type,
          a.target_resource_type,
          a.target_resource_id,
          a.requested_by,
          req_o.full_name as requester_name,
          req_o.service_number as requester_service_number,
          a.requested_at,
          a.justification,
          a.required_role,
          a.status,
          a.approved_by,
          app_o.full_name as approver_name,
          a.approved_at,
          a.rejection_reason
        FROM approvals a
        LEFT JOIN officers req_o ON req_o.id = a.requested_by
        LEFT JOIN officers app_o ON app_o.id = a.approved_by
        WHERE a.station_id = ${user.station_id}
        ORDER BY a.requested_at DESC
        LIMIT 50;
      `;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ approvals }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch approvals' }));
    }
    return;
  }

  // POST: Create a new approval request
  if (req.method === 'POST') {
    try {
      const rawBody = await parseJsonBody(req);
      const parsed = CreateApprovalSchema.safeParse(rawBody);

      if (!parsed.success) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }));
        return;
      }

      const { actionType, targetResourceType, targetResourceId, justification, requiredRole } = parsed.data;

      const inserted = await sql`
        INSERT INTO approvals (
          station_id, action_type, target_resource_type, target_resource_id, requested_by, justification, required_role, status
        ) VALUES (
          ${user.station_id}, ${actionType}, ${targetResourceType}, ${targetResourceId}, ${user.id}, ${justification}, ${requiredRole}, 'PENDING'
        )
        RETURNING id, action_type, target_resource_type, target_resource_id, requested_by, justification, status;
      `;

      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'FOUR_EYES_REQUEST_CREATED',
        tableName: 'approvals',
        recordId: inserted[0].id,
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: `Requested dual-custody approval for ${actionType}: ${justification}`
      });

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ approval: inserted[0] }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Failed to submit approval request' }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
