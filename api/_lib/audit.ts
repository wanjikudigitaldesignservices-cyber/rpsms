import { getDb } from './db.js';
import crypto from 'crypto';

export interface AuditLogEntry {
  stationId?: string;
  actionType: string;
  tableName?: string;
  recordId?: string;
  actorId?: string;
  actorServiceNumber?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  oldData?: any;
  newData?: any;
  justification?: string;
}

/**
 * Append-only tamper-evident audit logger with SHA-256 hash chaining
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const sql = getDb();
  
  try {
    // 1. Fetch latest audit log hash & seq_number
    const lastRow = await sql`
      SELECT seq_number, log_hash 
      FROM audit_log 
      ORDER BY seq_number DESC 
      LIMIT 1;
    `;
    
    const seqNumber = lastRow.length > 0 ? Number(lastRow[0].seq_number) + 1 : 1;
    const previousHash = lastRow.length > 0 ? (lastRow[0].log_hash as string) : 'GENESIS_ZERO_HASH_000000000000000000000000000000000000000000000000';
    
    // 2. Fetch default station ID if not provided
    let stationId = entry.stationId;
    if (!stationId) {
      const st = await sql`SELECT id FROM stations LIMIT 1;`;
      stationId = st[0]?.id || '00000000-0000-0000-0000-000000000000';
    }
    
    const recordedAt = new Date().toISOString();
    
    // 3. Compute immutable SHA-256 hash of this entry
    const payloadToHash = JSON.stringify({
      seqNumber,
      stationId,
      actionType: entry.actionType,
      tableName: entry.tableName || null,
      recordId: entry.recordId || null,
      actorId: entry.actorId || null,
      actorServiceNumber: entry.actorServiceNumber || null,
      actorRole: entry.actorRole || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      oldData: entry.oldData || null,
      newData: entry.newData || null,
      justification: entry.justification || null,
      previousHash,
      recordedAt
    });
    
    const currentHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    
    // 4. Insert append-only log record
    await sql`
      INSERT INTO audit_log (
        station_id,
        seq_number,
        action_type,
        table_name,
        record_id,
        actor_id,
        actor_service_number,
        actor_role,
        ip_address,
        user_agent,
        old_data,
        new_data,
        justification,
        previous_log_hash,
        log_hash,
        recorded_at
      ) VALUES (
        ${stationId},
        ${seqNumber},
        ${entry.actionType},
        ${entry.tableName || null},
        ${entry.recordId || null},
        ${entry.actorId || null},
        ${entry.actorServiceNumber || null},
        ${entry.actorRole || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.oldData ? JSON.stringify(entry.oldData) : null},
        ${entry.newData ? JSON.stringify(entry.newData) : null},
        ${entry.justification || null},
        ${previousHash},
        ${currentHash},
        ${recordedAt}
      );
    `;
  } catch (err: any) {
    // Never crash the primary request if audit logging encounters a transient issue, but log error
    console.error('CRITICAL: Audit log failure:', err.message);
  }
}
