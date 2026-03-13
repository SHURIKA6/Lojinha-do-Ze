import jwt from 'jsonwebtoken';

export function getJwtSecret(c) {
  const jwtSecret = c.env?.JWT_SECRET;
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET is not configured for this request.');
    return null;
  }
  return jwtSecret;
}

function decodeToken(c) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const jwtSecret = getJwtSecret(c);
  if (!jwtSecret) {
    return { error: c.json({ error: 'Erro interno no Servidor' }, 500) };
  }

  const token = authHeader.split(' ')[1];
  try {
    return { user: jwt.verify(token, jwtSecret) };
  } catch (err) {
    return { error: c.json({ error: 'Token inválido' }, 401) };
  }
}

async function authMiddleware(c, next) {
  const decoded = decodeToken(c);
  if (!decoded.user && !decoded.error) {
    return c.json({ error: 'Token não fornecido' }, 401);
  }
  if (decoded.error) {
    return decoded.error;
  }

  c.set('user', decoded.user);
  await next();
}

async function optionalAuthMiddleware(c, next) {
  const decoded = decodeToken(c);
  if (decoded.error) {
    return decoded.error;
  }

  if (decoded.user) {
    c.set('user', decoded.user);
  }

  await next();
}

async function adminOnly(c, next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Acesso restrito ao administrador' }, 403);
  }
  await next();
}

export { authMiddleware, optionalAuthMiddleware, adminOnly };


