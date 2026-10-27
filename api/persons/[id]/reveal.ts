import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { getDb } from '../../_lib/db.js';
import { logAuditEvent } from '../../_lib/audit.js';
import { decryptField } from '../../_lib/crypto.js';
import { requireAuth, parseJsonBody, getClientIp } from '../../_lib/auth.js';

const RevealSchema = z.object({
  field: z.enum(['national_id', 'phone_number']),
  justification: z.string().min(5, 'Mandatory official justification required')
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const urlParts = req.url?.split('?')[0].split('/') || [];
  // /api/persons/[id]/reveal -> ID is second to last
  const personIndex = urlParts.indexOf('persons');
  const personId = personIndex !== -1 ? urlParts[personIndex + 1] : null;

  if (!personId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing person ID' }));
    return;
  }

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const sql = getDb();

  try {
    const rawBody = await parseJsonBody(req);
    const parsed = RevealSchema.safeParse(rawBody);

    if (!parsed.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Validation error' }));
      return;
    }

    const { field, justification } = parsed.data;

    const personRes = await sql`
      SELECT id, full_name, national_id_encrypted, phone_encrypted, station_id 
      FROM persons 
      WHERE id = ${personId} 
      LIMIT 1;
    `;

    if (personRes.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Person record not found' }));
      return;
    }

    const person = personRes[0];
    const encryptedData = field === 'national_id' ? person.national_id_encrypted : person.phone_encrypted;
    const decrypted = decryptField(encryptedData || '');

    // Record PII reveal in audit ledger
    await logAuditEvent({
      stationId: user.station_id,
      actionType: 'PII_REVEALED',
      tableName: 'persons',
      recordId: person.id,
      actorId: user.id,
      actorServiceNumber: user.service_number,
      actorRole: user.role_id,
      ipAddress: clientIp,
      userAgent,
      justification: `Officer revealed ${field} for detainee ${person.full_name}. Reason: ${justification}`
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      field,
      decryptedValue: decrypted
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Failed to reveal PII field' }));
  }
}
