import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const r = await db.query(`SELECT gen_random_uuid() as uuid, encode(sha256('test'::bytea), 'hex') as hash;`);
console.log('Postgres native functions test:', r.rows);
await db.close();
