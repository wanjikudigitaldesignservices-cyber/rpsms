import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();

await db.exec(`
  CREATE ROLE anon NOSUPERUSER NOBYPASSRLS;
  CREATE TABLE test (id int, secret text);
  INSERT INTO test VALUES (1, 'classified');
  ALTER TABLE test ENABLE ROW LEVEL SECURITY;
  ALTER TABLE test FORCE ROW LEVEL SECURITY;
  CREATE POLICY "deny_all" ON test FOR ALL TO anon USING (false);
  GRANT SELECT ON test TO anon;
`);

// As postgres (superuser)
const asSuper = await db.query('SELECT count(*)::int as count FROM test;');
console.log('As Superuser:', asSuper.rows[0].count);

// As anon (non-superuser)
await db.exec('SET ROLE anon;');
const asAnon = await db.query('SELECT count(*)::int as count FROM test;');
console.log('As Anon role (RLS active):', asAnon.rows[0].count);

await db.close();
