import type { IncomingMessage, ServerResponse } from 'http';
import loginHandler from '../_lib/auth-routes/login.js';
import logoutHandler from '../_lib/auth-routes/logout.js';
import meHandler from '../_lib/auth-routes/me.js';
import lockHandler from '../_lib/auth-routes/lock.js';
import unlockHandler from '../_lib/auth-routes/unlock.js';
import changePasswordHandler from '../_lib/auth-routes/change-password.js';

export { loginHandler };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlPath = req.url?.split('?')[0] || '';
  const action = ((req as any).query?.action as string) || urlPath.split('/').filter(Boolean).pop() || '';

  switch (action.toLowerCase()) {
    case 'login':
      return loginHandler(req, res);
    case 'logout':
      return logoutHandler(req, res);
    case 'me':
      return meHandler(req, res);
    case 'lock':
      return lockHandler(req, res);
    case 'unlock':
      return unlockHandler(req, res);
    case 'change-password':
      return changePasswordHandler(req, res);
    default:
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
  }
}
