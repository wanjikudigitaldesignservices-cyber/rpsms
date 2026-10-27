import fs from 'fs';
import path from 'path';

const FORBIDDEN_TERMS = [
  'neon', 'postgres', 'postgresql', 'sql', 'supabase', 'vercel', 'vite', 'react', 'tailwind',
  'shadcn', 'drizzle', 'prisma', 'rls', 'row level', 'rbac', 'sha-256', 'sha256',
  'hash chain', 'block ledger', 'cryptographic', 'jwt', 'argon', 'bcrypt', 'aes',
  'gemini', 'antigravity', 'lovable', 'base44', 'bolt', 'replit', 'openai', 'anthropic',
  'llm', 'api key', 'schema', 'migration', 'table', 'endpoint', 'localhost',
  'TODO', 'FIXME', 'console.log'
];

const SCAN_DIRS = ['src', 'public'];
const SCAN_FILES = ['index.html'];

function isExcludedFile(filePath) {
  // We scan user-visible UI and shipped assets
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('node_modules') || normalized.includes('.git');
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (!isExcludedFile(fullPath)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allTargetFiles = [...SCAN_FILES];
SCAN_DIRS.forEach(d => {
  allTargetFiles.push(...getAllFiles(d));
});

// Also include dist if it exists
if (fs.existsSync('dist')) {
  allTargetFiles.push(...getAllFiles('dist'));
}

console.log(`Scanning ${allTargetFiles.length} files across src/, public/, index.html, dist/...`);

const findings = [];

allTargetFiles.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  // Focus on code, templates, HTML, json, text
  if (!['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json', '.md'].includes(ext)) {
    return;
  }

  let content = '';
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch (err) {
    return;
  }

  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const lowerLine = lineText.toLowerCase();

    FORBIDDEN_TERMS.forEach(term => {
      // Regex boundary check for words to avoid partial accidental matches
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}([^a-zA-Z0-9_-]|$)`, 'i');
      if (regex.test(lineText)) {
        // Classify severity
        let severity = 'LOW';
        // User-visible UI text or public HTML or dist bundle
        if (file.endsWith('index.html') || file.includes('dist')) {
          severity = 'CRITICAL';
        } else if (file.includes('src/components/layout') || file.includes('src/components/ob') || file.includes('src/components/admin')) {
          // Check if it appears in JSX or user strings
          if (lineText.includes('>') || lineText.includes('title=') || lineText.includes('placeholder=') || lineText.includes('label') || lineText.includes('"') || lineText.includes("'")) {
            severity = 'HIGH';
          } else {
            severity = 'MEDIUM';
          }
        }

        findings.push({
          file: file.replace(/\\/g, '/'),
          line: lineNum,
          term,
          snippet: lineText.trim().slice(0, 120),
          severity
        });
      }
    });
  });
});

console.log(`\n=== SCAN SUMMARY: ${findings.length} DISCLOSURE CANDIDATES FOUND ===\n`);

const srcFindings = findings.filter(f => f.file.startsWith('src/') || f.file === 'index.html');
console.log(`\n=== SOURCE CODE USER DISCLOSURES (${srcFindings.length} items) ===\n`);

srcFindings.forEach((item, index) => {
  console.log(`${index + 1}. [${item.file}:${item.line}] [Term: ${item.term}]`);
  console.log(`   ${item.snippet}`);
});
