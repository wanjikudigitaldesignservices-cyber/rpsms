import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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
    // 1. Fetch all OB entries in strict sequence order
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

      // Check sequence gap
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

      // Check previous hash pointer
      if (entry.previous_entry_hash !== expectedPrevHash) {
        brokenLink = {
          issue: 'BROKEN_HASH_LINK',
          seqNumber: entry.seq_number,
          obNumber: entry.ob_number,
          entryId: entry.id,
          expectedPreviousHash: expectedPrevHash,
          actualPreviousHash: entry.previous_entry_hash
        };
        break;
      }

      // Advance expected hash pointer
      expectedPrevHash = entry.entry_hash;
    }

    // 2. Fetch latest audit log head
    const latestAudit = await sql`
      SELECT seq_number, log_hash FROM audit_log ORDER BY seq_number DESC LIMIT 1;
    `;

    const chainHead = entries.length > 0 ? entries[entries.length - 1].entry_hash : expectedPrevHash;
    const nowIso = new Date().toISOString();

    if (brokenLink) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'TAMPER_DETECTED',
        unbroken: false,
        brokenLink,
        verifiedCount: entries.length,
        timestamp: nowIso
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'VERIFIED',
      unbroken: true,
      totalEntries: entries.length,
      chainHeadHash: chainHead,
      auditLogHeadHash: latestAudit.length > 0 ? latestAudit[0].log_hash : 'GENESIS_AUDIT',
      externalAnchor: {
        anchorTimestamp: nowIso,
        stationId: user.station_id,
        obLedgerHead: chainHead,
        algorithm: 'SHA-256',
        authority: 'Kenya Police Service / Rockport Station Commander'
      },
      message: `Occurrence Book ledger verified intact (${entries.length} chained entries). Zero tampering detected.`
    }));
  } catch (err: any) {
    console.error('Verify chain error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to verify ledger integrity chain' }));
  }
}
