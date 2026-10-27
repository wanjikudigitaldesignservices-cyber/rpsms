import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../_lib/db.js';
import { logAuditEvent } from '../_lib/audit.js';
import { requireAuth, parseJsonBody, getClientIp } from '../_lib/auth.js';

const CreateObSchema = z.object({
  category: z.enum(['CRIMINAL', 'TRAFFIC', 'INCIDENT', 'REPORT', 'DIRECTIVE', 'PUBLIC_COMPLAINT', 'LOST_PROPERTY', 'OTHER']),
  subject: z.string().min(3).max(256),
  narrative: z.string().min(5),
  reportingPersonName: z.string().optional(),
  reportingPersonPhone: z.string().optional()
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // All OB operations require authenticated officer
  const user = await requireAuth(req, res);
  if (!user) return;

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  // 1. GET: List OB entries (excludes soft-deleted entries)
  if (req.method === 'GET') {
    const entries = await sql`
      SELECT 
        id,
        station_id,
        ob_number,
        seq_number,
        incident_date,
        entry_timestamp,
        category,
        subject,
        narrative,
        recorded_by,
        reporting_person_name,
        previous_entry_hash,
        entry_hash,
        status,
        is_amended,
        created_at
      FROM ob_entries
      WHERE is_deleted = false
      ORDER BY seq_number DESC
      LIMIT 100;
    `;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ entries }));
    return;
  }

  // 2. POST: Create new OB entry
  if (req.method === 'POST') {
    try {
      const rawBody = await parseJsonBody(req);
      const parsed = CreateObSchema.safeParse(rawBody);

      if (!parsed.success) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }));
        return;
      }

      const { category, subject, narrative, reportingPersonName, reportingPersonPhone } = parsed.data;

      // Fetch last entry hash & sequence
      const lastEntry = await sql`
        SELECT seq_number, entry_hash 
        FROM ob_entries 
        ORDER BY seq_number DESC 
        LIMIT 1;
      `;

      const seqNumber = lastEntry.length > 0 ? Number(lastEntry[0].seq_number) + 1 : 1;
      const previousHash = lastEntry.length > 0 ? (lastEntry[0].entry_hash as string) : 'GENESIS_OB_LEDGER_HASH_0000000000000000000000000000000000000000000000';
      const year = new Date().getFullYear();
      const obNumber = `OB ${seqNumber}/${year}`;

      // Hash reporting phone if provided
      const phoneHash = reportingPersonPhone ? crypto.createHash('sha256').update(reportingPersonPhone.trim()).digest('hex') : null;

      // Compute cryptographic entry hash
      const hashPayload = `${obNumber}:${seqNumber}:${category}:${subject}:${narrative}:${previousHash}:${user.id}`;
      const entryHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

      const inserted = await sql`
        INSERT INTO ob_entries (
          station_id,
          ob_number,
          seq_number,
          incident_date,
          entry_timestamp,
          category,
          subject,
          narrative,
          recorded_by,
          reporting_person_name,
          reporting_person_phone_hash,
          previous_entry_hash,
          entry_hash,
          status,
          created_by
        ) VALUES (
          ${user.station_id},
          ${obNumber},
          ${seqNumber},
          CURRENT_DATE,
          now(),
          ${category},
          ${subject.trim()},
          ${narrative.trim()},
          ${user.id},
          ${reportingPersonName?.trim() || null},
          ${phoneHash},
          ${previousHash},
          ${entryHash},
          'OPEN',
          ${user.id}
        )
        RETURNING *;
      `;

      await logAuditEvent({
        stationId: user.station_id,
        actionType: 'OB_ENTRY_CREATED',
        tableName: 'ob_entries',
        recordId: inserted[0].id,
        actorId: user.id,
        actorServiceNumber: user.service_number,
        actorRole: user.role_id,
        ipAddress: clientIp,
        userAgent,
        justification: `Officer recorded OB entry ${obNumber}`
      });

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ entry: inserted[0] }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Failed to record OB entry' }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
