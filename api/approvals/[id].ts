import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';

const ReviewApprovalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().optional()
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Only OCS or authorized roles can approve requests
  const user = await requireAuth(req, res);
  if (!user) return;

  const urlParts = req.url?.split('?')[0].split('/') || [];
  const approvalId = urlParts[urlParts.length - 1];

  if (!approvalId || approvalId === 'approvals') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing approval ID' }));
    return;
  }

  const sql = getDb();
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  try {
    const rawBody = await parseJsonBody(req);
    const parsed = ReviewApprovalSchema.safeParse(rawBody);

    if (!parsed.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Invalid approval review payload' }));
      return;
    }

    const { decision, notes } = parsed.data;

    // Fetch existing approval request
    const existing = await sql`
      SELECT id, station_id, action_type, requested_by, required_role, status
      FROM approvals
      WHERE id = ${approvalId} AND station_id = ${user.station_id}
      LIMIT 1;
    `;

    if (existing.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Approval request not found or cross-station access denied' }));
      return;
    }

    const approval = existing[0];

    if (approval.status !== 'PENDING') {
      res.statusCode = 409;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Approval request is already ${approval.status}` }));
      return;
    }

    // MANDATORY ZERO-TRUST RULE: STRICT FOUR-EYES INTEGRITY CHECK
    // The server rejects self-approval under all circumstances
    if (approval.requested_by === user.id) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Dual-Custody Violation: Self-approval is strictly prohibited by Four-Eyes governance. A second independent officer must review and approve this request.'
      }));
      return;
    }

    // Role check: must meet required role (or be OCS/Super Admin)
    const canApprove = user.role_id === 'OCS' || user.role_id === 'ADMIN_SUPER_OWNER' || user.role_id === approval.required_role;
    if (!canApprove) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Forbidden: Review requires [${approval.required_role}] role` }));
      return;
    }

    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await sql`
      UPDATE approvals
      SET 
        status = ${newStatus},
        approved_by = ${user.id},
        approved_at = now(),
        rejection_reason = ${decision === 'REJECT' ? (notes || 'Rejected by supervisor') : null}
      WHERE id = ${approvalId};
    `;

    await logAuditEvent({
      stationId: user.station_id,
      actionType: decision === 'APPROVE' ? 'FOUR_EYES_APPROVAL_GRANTED' : 'FOUR_EYES_REQUEST_REJECTED',
      tableName: 'approvals',
      recordId: approvalId,
      actorId: user.id,
      actorServiceNumber: user.service_number,
      actorRole: user.role_id,
      ipAddress: clientIp,
      userAgent,
      justification: `Dual-custody decision ${newStatus} for ${approval.action_type}. Reviewer: ${user.service_number}. Notes: ${notes || 'None'}`
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      message: `Request successfully ${newStatus.toLowerCase()}`,
      status: newStatus,
      approvedBy: user.service_number
    }));
  } catch (err: any) {
    console.error('Error reviewing approval:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal server error processing approval' }));
  }
}
