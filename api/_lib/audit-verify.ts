import type { IncomingMessage, ServerResponse } from 'http';
import { getDb } from './db.js';
import { requireAuth } from './auth.js';

export async function verifyChainHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // OCS and AUDITOR only
  const user = await requireAuth(req, res, ['OCS', 'AUDITOR', 'ADMIN_SUPER_OWNER']);
  if (!user) return;

  const sql = getDb();

  try {
    const entries = await sql`
      SELECT 
        id, ob_number, seq_number, category, subject, narrative,
        entry_timestamp, recorded_by, previous_entry_hash, entry_hash
      FROM ob_entries
      ORDER BY seq_number ASC;
    `;

    let expectedPrevHash = 'GENESIS_OB_LEDGER_HASH_0000000000000000000000000000000000000000000000';
    let brokenLink: any = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i + 1;
      if (Number(entry.seq_number) !== expectedSeq) {
        brokenLink = {
          issue: 'SEQUENCE_GAP',
          expectedSeq,
          actualSeq: entry.seq_number,
          entryId: entry.id
        };
        break;
      }

      if (entry.previous_entry_hash !== expectedPrevHash) {
        brokenLink = {
          issue: 'BROKEN_HASH_LINK',
          seqNumber: entry.seq_number,
          obNumber: entry.ob_number,
          entryId: entry.id
        };
        break;
      }

      expectedPrevHash = entry.entry_hash;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      unbroken: brokenLink === null,
      totalEntries: entries.length,
      brokenLink: brokenLink || null,
      verifiedAt: new Date().toISOString()
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Chain verification failed' }));
  }
}
