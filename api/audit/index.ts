import type { IncomingMessage, ServerResponse } from 'http';
import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { verifyChainHandler } from '../_lib/audit-verify.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const action = ((req as any).query?.action as string) || url.searchParams.get('action') || '';

  if (action === 'verify-chain' || url.pathname.includes('/verify-chain')) {
    return verifyChainHandler(req, res);
  }

  // OCS and AUDITOR ONLY!
  const user = await requireAuth(req, res, ['OCS', 'AUDITOR', 'ADMIN_SUPER_OWNER']);
  if (!user) return;

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const officerFilter = url.searchParams.get('officer');
  const actionFilter = url.searchParams.get('action_type');
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);

  const sql = getDb();

  try {
    let logs;
    if (officerFilter && actionFilter) {
      logs = await sql`
        SELECT a.id, a.seq_number, a.action_type, a.table_name, a.record_id, a.actor_id, a.actor_service_number, a.actor_role, a.ip_address, a.justification, a.previous_log_hash, a.log_hash, a.recorded_at
        FROM audit_log a
        WHERE (a.actor_service_number = ${officerFilter} OR a.actor_id::text = ${officerFilter})
          AND a.action_type = ${actionFilter}
        ORDER BY a.seq_number DESC
        LIMIT ${limit};
      `;
    } else if (officerFilter) {
      logs = await sql`
        SELECT a.id, a.seq_number, a.action_type, a.table_name, a.record_id, a.actor_id, a.actor_service_number, a.actor_role, a.ip_address, a.justification, a.previous_log_hash, a.log_hash, a.recorded_at
        FROM audit_log a
        WHERE (a.actor_service_number = ${officerFilter} OR a.actor_id::text = ${officerFilter})
        ORDER BY a.seq_number DESC
        LIMIT ${limit};
      `;
    } else if (actionFilter) {
      logs = await sql`
        SELECT a.id, a.seq_number, a.action_type, a.table_name, a.record_id, a.actor_id, a.actor_service_number, a.actor_role, a.ip_address, a.justification, a.previous_log_hash, a.log_hash, a.recorded_at
        FROM audit_log a
        WHERE a.action_type = ${actionFilter}
        ORDER BY a.seq_number DESC
        LIMIT ${limit};
      `;
    } else {
      logs = await sql`
        SELECT a.id, a.seq_number, a.action_type, a.table_name, a.record_id, a.actor_id, a.actor_service_number, a.actor_role, a.ip_address, a.justification, a.previous_log_hash, a.log_hash, a.recorded_at
        FROM audit_log a
        ORDER BY a.seq_number DESC
        LIMIT ${limit};
      `;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ logs }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Failed to retrieve audit log' }));
  }
}
