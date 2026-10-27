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

const { default: handler } = await import('../api/auth/login.ts');

const TEST_ROLES = [
  { role: 'OCS', serviceNumber: 'KPS-238914', password: 'Station@2026!', totp: '123456' },
  { role: 'DEPUTY_OCS', serviceNumber: 'KPS-241088', password: 'Station@2026!', totp: '123456' },
  { role: 'DUTY_OFFICER_OB_CLERK', serviceNumber: 'KPS-248901', password: 'Station@2026!' },
  { role: 'INVESTIGATING_OFFICER', serviceNumber: 'KPS-250122', password: 'Station@2026!' },
  { role: 'CELL_SERGEANT', serviceNumber: 'KPS-248765', password: 'Station@2026!' },
  { role: 'AUDITOR (IPOA)', serviceNumber: 'IPOA-00412', password: 'Station@2026!', totp: '123456' },
  { role: 'DPP (ODPP)', serviceNumber: 'ODPP-88219', password: 'Station@2026!' },
  { role: 'ADMIN_SUPER_OWNER', serviceNumber: 'TECH-000001', password: 'Station@2026!' }
];

function simulateRequest(body) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const headers = {};
    let responseBody = '';

    const req = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'RoleLoginTester/1.0',
        'x-forwarded-for': '127.0.0.1'
      },
      on: (event, handler) => {
        if (event === 'data') {
          handler(Buffer.from(JSON.stringify(body)));
        } else if (event === 'end') {
          handler();
        }
      }
    };

    const res = {
      setHeader: (name, val) => { headers[name.toLowerCase()] = val; },
      getHeader: (name) => headers[name.toLowerCase()],
      end: (chunk) => {
        if (chunk) responseBody += chunk;
        let json = null;
        try { json = JSON.parse(responseBody); } catch {}
        resolve({ statusCode, headers, body: json || responseBody });
      }
    };
    Object.defineProperty(res, 'statusCode', {
      get: () => statusCode,
      set: (val) => { statusCode = val; }
    });

    handler(req, res);
  });
}

async function testAllLogins() {
  console.log('=== TESTING ROLE-BASED LOGIN AUTHENTICATION ===\n');
  const results = [];

  for (const t of TEST_ROLES) {
    const res = await simulateRequest({
      serviceNumber: t.serviceNumber,
      password: t.password,
      totpCode: t.totp
    });

    const isSuccess = res.statusCode === 200 && res.body?.user && res.headers['set-cookie'];
    const user = res.body?.user;

    results.push({
      Role: t.role,
      'Service Number': t.serviceNumber,
      Status: isSuccess ? 'PASS' : `FAIL (${res.statusCode})`,
      'Authenticated Name': user?.full_name || 'N/A',
      'Assigned Role': user?.role_id || 'N/A',
      'Cookie Received': !!res.headers['set-cookie']
    });
  }

  console.table(results);
  const allPass = results.every(r => r.Status === 'PASS');
  console.log(`\nOverall Result: ${allPass ? 'ALL 8 ROLE LOGINS PASSED SUCCESSFULLY!' : 'SOME LOGINS FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

testAllLogins().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
