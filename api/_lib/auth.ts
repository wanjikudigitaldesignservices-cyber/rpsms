import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { getDb } from './db.js';

export interface AuthenticatedUser {
  id: string;
  station_id: string;
  service_number: string;
  full_name: string;
  rank: string;
  role_id: string;
  email: string;
  status: string;
  mfa_enabled: boolean;
  must_change_password: boolean;
  sessionId: string;
  tokenHash: string;
  isLocked: boolean;
  csrfToken: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
}

export const SESSION_COOKIE_NAME = 'rpsms_session';
export const IDLE_TIMEOUT_MINUTES = 15;
export const ABSOLUTE_TIMEOUT_HOURS = 8;

/**
 * Robust zero-dependency cookie parser
 */
export function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  const list: Record<string, string> = {};
  header.split(';').forEach(item => {
    const parts = item.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      list[key] = decodeURIComponent(val);
    }
  });
  return list;
}

/**
 * Robust zero-dependency cookie serializer with strict security flags
 */
export function serializeCookie(
  name: string,
  val: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    maxAge?: number;
    expires?: Date;
  } = {}
): string {
  let cookieStr = `${name}=${encodeURIComponent(val)}`;
  if (options.maxAge != null) cookieStr += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookieStr += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookieStr += `; Path=${options.path}`;
  if (options.sameSite) {
    const ss = options.sameSite.toLowerCase();
    cookieStr += `; SameSite=${ss === 'strict' ? 'Strict' : ss === 'lax' ? 'Lax' : 'None'}`;
  }
  if (options.secure) cookieStr += `; Secure`;
  if (options.httpOnly) cookieStr += `; HttpOnly`;
  return cookieStr;
}

/**
 * Extract client IP address accurately behind reverse proxies
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Apply Fort-Knox HTTP Security Headers to every response
 */
export function setSecurityHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  
  if (origin && (origin.includes(host) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('https://rpsms'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
  }

  // Security Headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
}

/**
 * Hash raw session token at rest using SHA-256
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Require valid session and enforce role authorization (RBAC)
 */
export async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
  allowedRoles?: string[],
  options?: { allowLocked?: boolean }
): Promise<AuthenticatedUser | null> {
  setSecurityHeaders(req, res);

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return null;
  }

  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE_NAME];

  if (!rawToken) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: No active session' }));
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const sql = getDb();

  // Query session joined with active officer via token_hash (fallback to id for legacy sessions)
  const rows = await sql`
    SELECT 
      s.id as session_id,
      s.token_hash,
      s.is_locked,
      s.csrf_token,
      s.expires_at,
      s.idle_expires_at,
      o.id,
      o.station_id,
      o.service_number,
      o.full_name,
      o.rank,
      o.role_id,
      o.email,
      o.status,
      o.mfa_enabled,
      o.must_change_password
    FROM sessions s
    JOIN officers o ON o.id = s.officer_id
    WHERE (s.token_hash = ${tokenHash} OR s.id = ${rawToken})
      AND o.status = 'ACTIVE' 
      AND o.is_deleted = false
    LIMIT 1;
  `;

  if (rows.length === 0) {
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    }));
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or terminated session' }));
    return null;
  }

  const session = rows[0];
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  const idleExpiresAt = new Date(session.idle_expires_at);

  // Check absolute timeout (8 hours)
  if (now > expiresAt) {
    await sql`DELETE FROM sessions WHERE id = ${session.session_id};`;
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    }));
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Session reached maximum lifetime (8h). Please login again.' }));
    return null;
  }

  // Check idle timeout (15 minutes)
  if (now > idleExpiresAt) {
    await sql`DELETE FROM sessions WHERE id = ${session.session_id};`;
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    }));
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Session expired due to inactivity (15m).' }));
    return null;
  }

  // Check Server-Side Session Lock
  if (session.is_locked && !options?.allowLocked) {
    res.statusCode = 423; // HTTP 423 Locked
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Terminal is locked. Re-authentication required to resume session.',
      isLocked: true 
    }));
    return null;
  }

  // Enforce CSRF protection on state-changing requests
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (req.method && mutatingMethods.includes(req.method.toUpperCase())) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!csrfHeader || csrfHeader !== session.csrf_token) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Invalid or missing CSRF token' }));
      return null;
    }
  }

  // Enforce Role-Based Access Control (RBAC) - Deny by default
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role_id)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role` }));
      return null;
    }
  }

  // Slide idle timeout: extend by 15 minutes from now if active and not locked
  if (!session.is_locked) {
    const newIdleExpiry = new Date(now.getTime() + IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    await sql`
      UPDATE sessions 
      SET last_active_at = now(), idle_expires_at = ${newIdleExpiry}
      WHERE id = ${session.session_id};
    `;
  }

  return {
    id: session.id,
    station_id: session.station_id,
    service_number: session.service_number,
    full_name: session.full_name,
    rank: session.rank,
    role_id: session.role_id,
    email: session.email,
    status: session.status,
    mfa_enabled: session.mfa_enabled,
    must_change_password: session.must_change_password,
    sessionId: session.session_id,
    tokenHash: session.token_hash || tokenHash,
    isLocked: !!session.is_locked,
    csrfToken: session.csrf_token
  };
}

/**
 * Parse JSON body with size limits
 */
export async function parseJsonBody(req: IncomingMessage, maxBytes = 1_000_000): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        if (chunks.length === 0) {
          resolve({});
          return;
        }
        const str = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(str));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}
