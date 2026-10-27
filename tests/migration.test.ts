import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('RPSMS Phase 1 - Database Schema & Migrations', () => {
  it('applies all versioned migrations cleanly on PostgreSQL', async () => {
    const db = new PGlite();
    
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(5);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await db.exec(sql);
    }

    // Verify all 34 tables exist
    const res = await db.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map(r => r.table_name);
    
    // Core tables required by master prompt
    const expectedCoreTables = [
      'stations', 'officers', 'roles', 'officer_invites', 'ob_entries', 'ob_amendments',
      'persons', 'person_identifiers', 'mugshots', 'next_of_kin', 'cells',
      'custody_records', 'property_items', 'welfare_logs', 'visitor_logs', 'cases',
      'case_assignments', 'case_notes', 'evidence_items', 'evidence_transfers',
      'bail_records', 'payments', 'complaints', 'complaint_updates', 'duty_roster',
      'arms_register', 'vehicles', 'fuel_logs', 'approvals', 'anomaly_flags',
      'notifications', 'audit_log', 'attachments', 'station_setup_tokens'
    ];

    for (const table of expectedCoreTables) {
      expect(tableNames, `Table ${table} must exist`).toContain(table);
    }

    // Verify Seed Officers
    const officers = await db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM officers;`);
    expect(parseInt(officers.rows[0].count, 10)).toBe(8);

    // Verify Station
    const stations = await db.query<{ code: string }>(`SELECT code FROM stations WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;`);
    expect(stations.rows[0].code).toBe('RPS-001');

    await db.close();
  });
});
