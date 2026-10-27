import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const { setSecurityHeaders } = await import('../api/_lib/auth.ts');
const { default: loginHandler } = await import('../api/_lib/auth-routes/login.js');

async function testHeadersAndErrors() {
  console.log('=== VERIFYING RESPONSE HEADERS & HYGIENE ===\n');

  // 1. Inspect setSecurityHeaders output
  const testHeaders = {};
  const mockReq = {
    headers: { host: 'rpsms-psi.vercel.app', origin: 'https://rpsms-psi.vercel.app' }
  };
  const mockRes = {
    setHeader: (k, v) => { testHeaders[k] = v; },
    removeHeader: (k) => { delete testHeaders[k]; }
  };

  testHeaders['X-Powered-By'] = 'Express/Vercel'; // Simulate default framework header
  setSecurityHeaders(mockReq, mockRes);

  console.log('Applied Security Headers:');
  for (const [k, v] of Object.entries(testHeaders)) {
    console.log(`  ${k}: ${v}`);
  }

  const hasXPoweredBy = 'x-powered-by' in testHeaders || 'X-Powered-By' in testHeaders;
  console.log(`\nX-Powered-By completely stripped: ${!hasXPoweredBy ? 'PASS (Header Absent)' : 'FAIL'}`);
  console.log(`X-Robots-Tag present: ${testHeaders['X-Robots-Tag'] === 'noindex, nofollow, noarchive, nosnippet' ? 'PASS' : 'FAIL'}`);
  console.log(`X-Frame-Options DENY: ${testHeaders['X-Frame-Options'] === 'DENY' ? 'PASS' : 'FAIL'}`);
  console.log(`X-Content-Type-Options nosniff: ${testHeaders['X-Content-Type-Options'] === 'nosniff' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== TESTING ERROR RESPONSES HYGIENE ===\n');

  // 2. Test Invalid Method (405)
  const methodHeaders = {};
  let methodBody = '';
  let methodStatus = 200;
  const methodRes = {
    setHeader: (k, v) => { methodHeaders[k] = v; },
    removeHeader: (k) => { delete methodHeaders[k]; },
    end: (chunk) => { methodBody += chunk; }
  };
  Object.defineProperty(methodRes, 'statusCode', {
    set: (s) => { methodStatus = s; },
    get: () => methodStatus
  });

  await loginHandler({ method: 'GET', headers: {} }, methodRes);
  console.log(`405 Method Not Allowed Response (Status ${methodStatus}):`);
  console.log('  Body:', methodBody);
  const isGeneric405 = !methodBody.toLowerCase().includes('trace') && !methodBody.toLowerCase().includes('sql');
  console.log(`  Clean & generic: ${isGeneric405 ? 'PASS' : 'FAIL'}\n`);

  // 3. Test Invalid Body / Failed Auth (400)
  let failBody = '';
  let failStatus = 200;
  const failRes = {
    setHeader: () => {},
    removeHeader: () => {},
    end: (chunk) => { failBody += chunk; }
  };
  Object.defineProperty(failRes, 'statusCode', {
    set: (s) => { failStatus = s; },
    get: () => failStatus
  });

  const badReq = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    on: (event, fn) => {
      if (event === 'data') fn(Buffer.from(JSON.stringify({ maliciousPayload: "'; DROP TABLE officers; --" })));
      if (event === 'end') fn();
    }
  };

  await loginHandler(badReq, failRes);
  console.log(`Failed Auth / Injection Attempt Response (Status ${failStatus}):`);
  console.log('  Body:', failBody);
  const isGenericFail = failBody.includes('Invalid credentials') && !failBody.includes('syntax') && !failBody.includes('column');
  console.log(`  No SQL/Stack leak: ${isGenericFail ? 'PASS' : 'FAIL'}\n`);

  // 4. Confirm zero .map files in dist/
  console.log('=== VERIFYING DIST/ ASSETS & SOURCEMAPS ===\n');
  const distDir = path.resolve(__dirname, '../dist');
  let hasMapFiles = false;
  function scanDir(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) scanDir(full);
      else if (f.endsWith('.map')) {
        console.error('Found map file:', full);
        hasMapFiles = true;
      }
    }
  }
  scanDir(distDir);
  console.log(`Sourcemap (.map) files in dist/: ${hasMapFiles ? 'FAIL (Found .map)' : '0 found - PASS'}`);

  const allPass = !hasXPoweredBy && isGeneric405 && isGenericFail && !hasMapFiles;
  console.log(`\nOverall Response & Build Hygiene: ${allPass ? 'ALL TESTS PASSED!' : 'FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

testHeadersAndErrors().catch(err => {
  console.error(err);
  process.exit(1);
});
