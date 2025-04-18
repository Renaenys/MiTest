import { verifyToken } from './auth';

export function withAdmin(handler) {
  return async (req) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) return new Response('Unauthorized', { status: 401 });

      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyToken(token);

      if (decoded.role !== 'admin') {
        return new Response('Forbidden: Admins only', { status: 403 });
      }

      req.user = decoded;
      return handler(req);
    } catch (err) {
      return new Response('Invalid or expired token', { status: 401 });
    }
  };
}
