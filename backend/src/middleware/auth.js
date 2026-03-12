import jwt from 'jsonwebtoken';

async function authMiddleware(c, next) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
      return c.json({ error: 'Erro interno no Servidor' }, 500);
    }
    const decoded = jwt.verify(token, secret);
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


