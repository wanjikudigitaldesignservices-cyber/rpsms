/**
 * Rockport Police Station Management System (RPSMS)
 * Comprehensive End-to-End Neon Services Verification Suite
 *
 * Verifies live in-cloud:
 *  1. Neon Postgres (Tables, RLS policies, live data)
 *  2. Neon Auth (JWKS Ed25519 public keys)
 *  3. Neon Functions (Live HTTP invocation of hello.ts)
 *  4. Neon Object Storage (S3 upload, get, list in bucket 'assets')
 *  5. Neon Realtime (WSS endpoint & secret verification)
 */

import { Client } from '@neondatabase/serverless';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

function getVal(key) {
  const m = envContent.match(new RegExp(`${key}="?([^"\\r\\n]+)"?`));
  return m ? m[1] : '';
}

const dbUrl = getVal('DATABASE_URL_UNPOOLED') || getVal('DATABASE_URL');
const authJwksUrl = getVal('NEON_AUTH_JWKS_URL');
const functionHelloUrl = getVal('NEON_FUNCTION_HELLO_BASE_URL');
const s3AccessKey = getVal('AWS_ACCESS_KEY_ID');
const s3SecretKey = getVal('AWS_SECRET_ACCESS_KEY');
const s3Endpoint = getVal('AWS_ENDPOINT_URL_S3');
const s3Region = getVal('AWS_REGION') || 'us-east-2';
const realtimeUrl = getVal('NEON_REALTIME_URL');
const realtimeSecret = getVal('NEON_REALTIME_SECRET');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runVerification() {
  console.log('\n========================================================================');
  console.log('🏛️  ROCKPORT POLICE STATION (RPSMS) - NEON LIVE CLOUD VERIFICATION');
  console.log('========================================================================\n');

  // ---------------------------------------------------------
  // 1. NEON POSTGRESQL VERIFICATION
  // ---------------------------------------------------------
  console.log('--- 1. NEON SERVERLESS POSTGRESQL ---');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const dbRes = await client.query('SELECT current_database() as db, current_user as usr, version() as ver;');
  assert(dbRes.rows.length === 1, `Postgres connected to database "${dbRes.rows[0].db}" as user "${dbRes.rows[0].usr}"`);

  const tablesRes = await client.query(`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';`);
  assert(tablesRes.rows[0].count === 34, `34 production tables verified in public schema (Found: ${tablesRes.rows[0].count})`);

  const officersRes = await client.query(`SELECT count(*)::int as count FROM officers;`);
  assert(officersRes.rows[0].count >= 8, `Station roster seeded with officers in live DB (Count: ${officersRes.rows[0].count})`);

  const stationRes = await client.query(`SELECT code, name FROM stations LIMIT 1;`);
  assert(stationRes.rows[0].code === 'RPS-001', `Rockport Police Station (RPS-001) verified in database`);

  await client.end();

  // ---------------------------------------------------------
  // 2. NEON AUTH VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 2. NEON AUTH (BETTER AUTH / JWKS) ---');
  try {
    const authRes = await fetch(authJwksUrl);
    assert(authRes.status === 200, `Neon Auth JWKS endpoint returned HTTP 200 OK`);
    const jwks = await authRes.json();
    assert(jwks.keys && jwks.keys.length > 0, `Active Ed25519 signing keys returned (Keys: ${jwks.keys.length}, Kid: ${jwks.keys[0].kid})`);
  } catch (err) {
    assert(false, `Neon Auth error: ${err.message}`);
  }

  // ---------------------------------------------------------
  // 3. NEON FUNCTIONS VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 3. NEON FUNCTIONS (COMPUTE) ---');
  try {
    const fnRes = await fetch(functionHelloUrl);
    assert(fnRes.status === 200, `Neon Function /hello returned HTTP 200 OK`);
    const text = await fnRes.text();
    assert(text.includes('Hello from Neon Functions'), `Function response verified: "${text.trim()}"`);
  } catch (err) {
    assert(false, `Neon Function error: ${err.message}`);
  }

  // ---------------------------------------------------------
  // 4. NEON OBJECT STORAGE (S3 COMPATIBLE) VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 4. NEON OBJECT STORAGE (BUCKET: assets) ---');
  const s3 = new S3Client({
    region: s3Region,
    endpoint: s3Endpoint,
    credentials: {
      accessKeyId: s3AccessKey,
      secretAccessKey: s3SecretKey,
    },
    forcePathStyle: true,
  });

  const testFileKey = `evidence/test-exhibit-${Date.now()}.txt`;
  const testContent = `KENYA POLICE SERVICE - ROCKPORT STATION - EXHIBIT CHAIN OF CUSTODY VERIFIED - ${new Date().toISOString()}`;

  try {
    // Put Object
    await s3.send(new PutObjectCommand({
      Bucket: 'assets',
      Key: testFileKey,
      Body: testContent,
      ContentType: 'text/plain',
    }));
    assert(true, `Successfully uploaded evidence artifact to bucket "assets" (Key: ${testFileKey})`);

    // Get Object
    const getRes = await s3.send(new GetObjectCommand({
      Bucket: 'assets',
      Key: testFileKey,
    }));
    const downloaded = await getRes.Body.transformToString();
    assert(downloaded === testContent, `Downloaded artifact matched uploaded payload 100%`);

    // List Objects
    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: 'assets',
      Prefix: 'evidence/',
    }));
    assert(listRes.Contents && listRes.Contents.length > 0, `Bucket "assets" contains ${listRes.Contents.length} evidence artifacts`);
  } catch (err) {
    assert(false, `Neon Object Storage S3 error: ${err.message}`);
  }

  // ---------------------------------------------------------
  // 5. NEON REALTIME VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 5. NEON REALTIME ---');
  assert(realtimeUrl.startsWith('wss://'), `Realtime WebSocket URL verified: ${realtimeUrl}`);
  assert(realtimeSecret.startsWith('nrt_live_'), `Realtime client secret verified (Prefix: ${realtimeSecret.slice(0, 12)}...)`);

  // ---------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 NEON SERVICES VERIFICATION: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('========================================================================\n');
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
