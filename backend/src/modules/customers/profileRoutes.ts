import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, csrfMiddleware } from '../../core/middleware/auth';
import { profileUpdateSchema } from '../../core/domain/schemas';
import {
  buildAvatar,
  cleanOptionalString,
  isUniqueViolation,
  normalizeEmail,
  uniqueFieldLabel,
} from '../../core/utils/normalize';
import { jsonError, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { profileLimiter } from '../../core/middleware/rateLimit';
import { Bindings, Variables } from '../../core/types';
import { loyaltyService } from './loyaltyService';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use('*', authMiddleware);

router.put('/', profileLimiter, csrfMiddleware, zValidator('json', profileUpdateSchema, validationError), async (c) => {
  try {
    const db = c.get('db');
    const payload = c.req.valid('json') as any;
    const user = c.get('user');
    const name = payload.name ? payload.name.trim() : undefined;
    const email = payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
    const phone = payload.phone !== undefined ? cleanOptionalString(payload.phone) : undefined;
    const address = payload.address !== undefined ? cleanOptionalString(payload.address) : undefined;
    const avatar = name ? buildAvatar(name) : undefined;

    const { rows } = await db.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           avatar = COALESCE($5, avatar),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, phone, cpf, address, avatar, role, created_at`,
      [name, email, phone, address, avatar, user?.id]
    );

    return c.json(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
    }

    logger.error('Erro no PUT de Perfil', error as Error);
    return jsonError(c, 500, 'Erro ao atualizar suas informações de perfil.');
  }
});

router.get('/loyalty', async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user');
    
    if (!user) return jsonError(c, 401, 'Não autorizado');

    const balance = await loyaltyService.getBalance(db, parseInt(user.id));
    
    // Busca as últimas 10 transações
    const { rows: history } = await db.query(
      'SELECT type, points, description, created_at FROM loyalty_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [user.id]
    );

    return c.json({
      balance,
      history
    });
  } catch (error) {
    logger.error('Erro ao buscar fidelidade', error as Error);
    return jsonError(c, 500, 'Erro ao carregar dados de fidelidade.');
  }
});

export default router;
