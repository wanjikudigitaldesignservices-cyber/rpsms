/**
 * Rockport Police Station Management System (RPSMS) - Kenya Police Service
 * Neon Tier-1 Cloud Services Integration Layer
 * 
 * Services wired:
 *  1. Neon Serverless Postgres (HTTP & WebSocket driver)
 *  2. Neon Auth (JWKS & OAuth)
 *  3. Neon Functions (Compute / Serverless tasks)
 *  4. Neon Object Storage (S3-compatible bucket 'assets')
 *  5. Neon Realtime (Broadcast & Live sync)
 */

import { neon } from '@neondatabase/serverless';
import { 
  S3Client, 
  PutObjectCommand, 
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';

// Helper to resolve environment variables across Vite and Node
function getEnv(key: string, viteKey?: string): string {
  const g = globalThis as any;
  if (typeof g.process !== 'undefined' && g.process?.env && g.process.env[key]) {
    return g.process.env[key] as string;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const vKey = viteKey || `VITE_${key}`;
    if ((import.meta as any).env[vKey]) {
      return (import.meta as any).env[vKey];
    }
    if ((import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  }
  return '';
}

// 1. Neon Configuration
export const NEON_CONFIG = {
  databaseUrl: getEnv('DATABASE_URL'),
  databaseUrlUnpooled: getEnv('DATABASE_URL_UNPOOLED'),
  branch: getEnv('NEON_BRANCH') || 'production',
  authBaseUrl: getEnv('NEON_AUTH_BASE_URL'),
  authJwksUrl: getEnv('NEON_AUTH_JWKS_URL'),
  functionHelloUrl: getEnv('NEON_FUNCTION_HELLO_BASE_URL'),
  s3AccessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
  s3SecretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY'),
  s3Endpoint: getEnv('AWS_ENDPOINT_URL_S3'),
  s3Region: getEnv('AWS_REGION') || 'us-east-2',
  realtimeUrl: getEnv('NEON_REALTIME_URL'),
  realtimeSecret: getEnv('NEON_REALTIME_SECRET'),
  bucketName: 'assets',
};

// 2. Neon Serverless Postgres Client
export const getNeonSql = (unpooled = false) => {
  const url = unpooled ? NEON_CONFIG.databaseUrlUnpooled : NEON_CONFIG.databaseUrl;
  if (!url) {
    throw new Error('NEON_CONFIG: DATABASE_URL is not configured.');
  }
  return neon(url);
};

// 3. Neon Object Storage (S3 Client)
export const getNeonS3Client = () => {
  if (!NEON_CONFIG.s3Endpoint || !NEON_CONFIG.s3AccessKeyId || !NEON_CONFIG.s3SecretAccessKey) {
    throw new Error('NEON_CONFIG: S3 credentials are not configured.');
  }
  return new S3Client({
    region: NEON_CONFIG.s3Region,
    endpoint: NEON_CONFIG.s3Endpoint,
    credentials: {
      accessKeyId: NEON_CONFIG.s3AccessKeyId,
      secretAccessKey: NEON_CONFIG.s3SecretAccessKey,
    },
    forcePathStyle: true,
  });
};

// 4. Object Storage Operations
export async function uploadEvidenceAttachment(
  filename: string,
  content: string | Uint8Array,
  contentType = 'application/octet-stream'
) {
  const s3 = getNeonS3Client();
  const command = new PutObjectCommand({
    Bucket: NEON_CONFIG.bucketName,
    Key: `evidence/${filename}`,
    Body: typeof content === 'string' ? new TextEncoder().encode(content) : content,
    ContentType: contentType,
  });
  await s3.send(command);
  return {
    bucket: NEON_CONFIG.bucketName,
    key: `evidence/${filename}`,
    url: `${NEON_CONFIG.s3Endpoint}/${NEON_CONFIG.bucketName}/evidence/${filename}`,
  };
}

export async function listStorageAssets(prefix = '') {
  const s3 = getNeonS3Client();
  const command = new ListObjectsV2Command({
    Bucket: NEON_CONFIG.bucketName,
    Prefix: prefix,
  });
  const res = await s3.send(command);
  return res.Contents || [];
}

// 5. Neon Function Invocation
export async function callNeonHelloFunction(): Promise<{ message: string; status: number }> {
  if (!NEON_CONFIG.functionHelloUrl) {
    throw new Error('NEON_CONFIG: NEON_FUNCTION_HELLO_BASE_URL is not configured.');
  }
  const res = await fetch(NEON_CONFIG.functionHelloUrl);
  if (!res.ok) {
    throw new Error(`Neon Function returned HTTP ${res.status}: ${res.statusText}`);
  }
  const text = await res.text();
  return { message: text.trim(), status: res.status };
}

// 6. Neon Auth Verification
export async function verifyNeonAuthJWKS(): Promise<{ activeKeysCount: number; keys: any[] }> {
  if (!NEON_CONFIG.authJwksUrl) {
    throw new Error('NEON_CONFIG: NEON_AUTH_JWKS_URL is not configured.');
  }
  const res = await fetch(NEON_CONFIG.authJwksUrl);
  if (!res.ok) {
    throw new Error(`Neon Auth JWKS endpoint returned HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    activeKeysCount: data.keys?.length || 0,
    keys: data.keys || [],
  };
}

// 7. Neon Database Queries
export async function fetchLiveOfficers() {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, station_id, service_number, full_name, role_name, rank, email, status, is_active, mfa_enabled, created_at
    FROM officers
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function fetchLiveStationSettings() {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, code, name, county, sub_county, division, phone, email, custody_clock_limit_hours
    FROM stations
    LIMIT 1;
  `;
  return rows[0] || null;
}

export async function fetchLiveAuditChainStatus() {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT COUNT(*)::int as total_entries,
           MAX(seq_number)::int as highest_seq,
           BOOL_AND(log_hash IS NOT NULL) as all_hashed
    FROM audit_log;
  `;
  return rows[0];
}

// 8. End-to-End Comprehensive Service Health Check
export interface NeonServiceHealthReport {
  timestamp: string;
  branch: string;
  postgres: {
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    database: string;
    currentUser: string;
    tablesCount: number;
    officersCount: number;
    error?: string;
  };
  auth: {
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    jwksUrl: string;
    keysCount: number;
    error?: string;
  };
  functions: {
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    endpoint: string;
    response: string;
    error?: string;
  };
  objectStorage: {
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    bucket: string;
    objectsCount: number;
    error?: string;
  };
  realtime: {
    status: 'CONFIGURED' | 'OFFLINE';
    url: string;
    error?: string;
  };
}

export async function checkAllNeonServices(): Promise<NeonServiceHealthReport> {
  const report: NeonServiceHealthReport = {
    timestamp: new Date().toISOString(),
    branch: NEON_CONFIG.branch,
    postgres: { status: 'OFFLINE', latencyMs: 0, database: '', currentUser: '', tablesCount: 0, officersCount: 0 },
    auth: { status: 'OFFLINE', latencyMs: 0, jwksUrl: NEON_CONFIG.authJwksUrl, keysCount: 0 },
    functions: { status: 'OFFLINE', latencyMs: 0, endpoint: NEON_CONFIG.functionHelloUrl, response: '' },
    objectStorage: { status: 'OFFLINE', latencyMs: 0, bucket: NEON_CONFIG.bucketName, objectsCount: 0 },
    realtime: { status: 'OFFLINE', url: NEON_CONFIG.realtimeUrl },
  };

  // 1. Postgres
  try {
    const t0 = performance.now();
    const sql = getNeonSql();
    const dbInfo = await sql`SELECT current_database() as db, current_user as usr, version() as ver;`;
    const tables = await sql`SELECT count(*)::int as cnt FROM information_schema.tables WHERE table_schema = 'public';`;
    const officers = await sql`SELECT count(*)::int as cnt FROM officers;`;
    report.postgres = {
      status: 'ONLINE',
      latencyMs: Math.round(performance.now() - t0),
      database: dbInfo[0].db,
      currentUser: dbInfo[0].usr,
      tablesCount: tables[0].cnt,
      officersCount: officers[0].cnt,
    };
  } catch (err: any) {
    report.postgres.error = err.message;
  }

  // 2. Auth
  try {
    const t0 = performance.now();
    const authResult = await verifyNeonAuthJWKS();
    report.auth = {
      status: 'ONLINE',
      latencyMs: Math.round(performance.now() - t0),
      jwksUrl: NEON_CONFIG.authJwksUrl,
      keysCount: authResult.activeKeysCount,
    };
  } catch (err: any) {
    report.auth.error = err.message;
  }

  // 3. Functions
  try {
    const t0 = performance.now();
    const fnResult = await callNeonHelloFunction();
    report.functions = {
      status: 'ONLINE',
      latencyMs: Math.round(performance.now() - t0),
      endpoint: NEON_CONFIG.functionHelloUrl,
      response: fnResult.message,
    };
  } catch (err: any) {
    report.functions.error = err.message;
  }

  // 4. Object Storage
  try {
    const t0 = performance.now();
    const assets = await listStorageAssets();
    report.objectStorage = {
      status: 'ONLINE',
      latencyMs: Math.round(performance.now() - t0),
      bucket: NEON_CONFIG.bucketName,
      objectsCount: assets.length,
    };
  } catch (err: any) {
    report.objectStorage.error = err.message;
  }

  // 5. Realtime
  if (NEON_CONFIG.realtimeUrl && NEON_CONFIG.realtimeSecret) {
    report.realtime = {
      status: 'CONFIGURED',
      url: NEON_CONFIG.realtimeUrl,
    };
  }

  return report;
}
