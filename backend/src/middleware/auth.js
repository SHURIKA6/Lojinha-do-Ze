import jwt from 'jsonwebtoken';

async function authMiddleware(c, next) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    c.set('user', decoded);
    await next();
  } catch (err) {
    return c.json({ error: 'Token inválido' }, 401);
  }
}

async function adminOnly(c, next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Acesso restrito ao administrador' }, 403);
  }
  await next();
}

export { authMiddleware, adminOnly };


