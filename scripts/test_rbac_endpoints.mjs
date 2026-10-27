import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local FIRST
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
} catch {}

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const { default: loginHandler } = await import('../api/auth/login.ts');
const { default: auditHandler } = await import('../api/audit/index.ts');
const { default: healthHandler } = await import('../api/system/health.ts');

function invokeApi(handler, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const resHeaders = {};
    let responseBody = '';

    const req = {
      method,
      headers: {
        'user-agent': 'RBACVerifier/1.0',
        ...headers
      },
      on: (event, fn) => {
        if (event === 'data' && body) fn(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
        else if (event === 'end') fn();
      }
    };

    const res = {
      setHeader: (name, val) => { resHeaders[name.toLowerCase()] = val; },
      getHeader: (name) => resHeaders[name.toLowerCase()],
      removeHeader: (name) => { delete resHeaders[name.toLowerCase()]; },
      end: (chunk) => {
        if (chunk) responseBody += chunk;
        let json = null;
        try { json = JSON.parse(responseBody); } catch {}
        resolve({ statusCode, headers: resHeaders, body: json || responseBody });
      }
    };

    Object.defineProperty(res, 'statusCode', {
      get: () => statusCode,
      set: (val) => { statusCode = val; }
    });

    handler(req, res);
  });
}

async function runRbacTests() {
  console.log('=== VERIFYING SERVER-SIDE RBAC PRIVILEGE ENFORCEMENT ===\n');

  // 1. Login as OCS
  const ocsLogin = await invokeApi(loginHandler, {
    method: 'POST',
    body: { serviceNumber: 'KPS-238914', password: 'Station@2026!', totpCode: '123456' }
  });
  const ocsCookie = (ocsLogin.headers['set-cookie'] || '').split(';')[0];
  console.log(`[OCS Login] HTTP ${ocsLogin.statusCode} - Session Cookie Acquired: ${!!ocsCookie}`);

  // 2. Login as Normal Officer (Duty Officer)
  const officerLogin = await invokeApi(loginHandler, {
    method: 'POST',
    body: { serviceNumber: 'KPS-248901', password: 'Station@2026!' }
  });
  const officerCookie = (officerLogin.headers['set-cookie'] || '').split(';')[0];
  console.log(`[Officer Login] HTTP ${officerLogin.statusCode} - Session Cookie Acquired: ${!!officerCookie}`);

  const results = [];

  // Test 1: OCS calls /api/audit
  const ocsAudit = await invokeApi(auditHandler, {
    method: 'GET',
    headers: { cookie: ocsCookie }
  });
  if (ocsAudit.statusCode !== 200) {
    console.error('OCS Audit error body:', ocsAudit.body);
  }
  results.push({
    Endpoint: '/api/audit',
    Caller: 'OCS (SSP Mwangi)',
    Expected: '200 OK',
    Actual: `${ocsAudit.statusCode}`,
    Authorized: ocsAudit.statusCode === 200 ? 'YES' : 'NO',
    Passed: ocsAudit.statusCode === 200
  });

  // Test 2: Normal Officer calls /api/audit
  const officerAudit = await invokeApi(auditHandler, {
    method: 'GET',
    headers: { cookie: officerCookie }
  });
  results.push({
    Endpoint: '/api/audit',
    Caller: 'Duty Officer (Sgt Kamau)',
    Expected: '403 Forbidden',
    Actual: `${officerAudit.statusCode}`,
    Authorized: officerAudit.statusCode === 200 ? 'YES' : 'NO',
    Passed: officerAudit.statusCode === 403
  });

  // Test 3: OCS calls /api/system/health
  const ocsHealth = await invokeApi(healthHandler, {
    method: 'GET',
    headers: { cookie: ocsCookie }
  });
  results.push({
    Endpoint: '/api/system/health',
    Caller: 'OCS (SSP Mwangi)',
    Expected: '200 OK',
    Actual: `${ocsHealth.statusCode}`,
    Authorized: ocsHealth.statusCode === 200 ? 'YES' : 'NO',
    Passed: ocsHealth.statusCode === 200
  });

  // Test 4: Normal Officer calls /api/system/health
  const officerHealth = await invokeApi(healthHandler, {
    method: 'GET',
    headers: { cookie: officerCookie }
  });
  results.push({
    Endpoint: '/api/system/health',
    Caller: 'Duty Officer (Sgt Kamau)',
    Expected: '403 Forbidden',
    Actual: `${officerHealth.statusCode}`,
    Authorized: officerHealth.statusCode === 200 ? 'YES' : 'NO',
    Passed: officerHealth.statusCode === 403
  });

  console.table(results);
  const allPassed = results.every(r => r.Passed);
  console.log(`RBAC Test Result: ${allPassed ? 'ALL PRIVILEGE BOUNDARY CHECKS PASSED!' : 'RBAC CHECKS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runRbacTests().catch(err => {
  console.error(err);
  process.exit(1);
});
