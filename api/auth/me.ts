import type { IncomingMessage, ServerResponse } from 'http';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // requireAuth handles cookie parsing, session check, idle timeout slide, and returns user or 401
  const user = await requireAuth(req, res);
  if (!user) return;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    user: {
      id: user.id,
      station_id: user.station_id,
      service_number: user.service_number,
      full_name: user.full_name,
      rank: user.rank,
      role_id: user.role_id,
      email: user.email,
      status: user.status,
      must_change_password: user.must_change_password
    },
    csrfToken: user.csrfToken
  }));
}
