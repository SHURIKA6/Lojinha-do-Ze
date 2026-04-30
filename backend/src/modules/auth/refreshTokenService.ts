/**
 * Serviço de Refresh Tokens para autenticação JWT
 * Permite renovação de sessão sem re-login
 */

import { randomToken, sha256Hex } from '../../core/utils/crypto';
import { logger } from '../../core/utils/logger';
import { REFRESH_TOKEN_TTL_SECONDS } from '../../core/domain/constants';
import { Database, Bindings, HonoCloudflareContext } from '../../core/types';

type ExecutionContext = HonoCloudflareContext['executionCtx'];

const REFRESH_TOKEN_PREFIX = 'refresh_token_';

export interface TokenData {
  userId: number;
  sessionId: string;
  expiresAt: string | Date;
  role?: string;
  email?: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: string | Date;
}

export class RefreshTokenService {
  private db: Database;
  private cache: any;

  constructor(db: Database, cacheService: any) {
    this.db = db;
    this.cache = cacheService;
  }

  /**
   * Cria um novo refresh token para o usuário
   */
  async createRefreshToken(userId: number, sessionId: string, ipAddress: string, userAgent: string, env?: Bindings, ctx?: ExecutionContext): Promise<string> {
    const tokenId = randomToken(32);
    const tokenHash = await sha256Hex(tokenId);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    // Armazena no banco de dados (background task se ctx disponível)
    const dbTask = this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tokenId, userId, sessionId, tokenHash, ipAddress, userAgent, expiresAt]
    ).catch((err: any) => {
      logger.error('Erro ao persistir refresh token no banco', err, { userId, tokenId });
    });

    if (ctx?.waitUntil) {
      ctx.waitUntil(dbTask);
    } else {
      await dbTask;
    }

    // Armazena no cache para verificação rápida
    this.cache.set(
      `${REFRESH_TOKEN_PREFIX}${tokenHash}`,
      { userId, sessionId, expiresAt },
      REFRESH_TOKEN_TTL_SECONDS,
      env?.CACHE_KV,
      ctx
    );

    logger.info('Refresh token criado', { userId, sessionId, tokenId });
    return tokenId;
  }

  /**
   * Valida e usa um refresh token para gerar novos tokens
   */
  async refreshAccessToken(refreshToken: string, ipAddress: string, _userAgent: string, env?: Bindings, ctx?: ExecutionContext): Promise<{ valid: boolean; error?: string; user?: any; sessionId?: string }> {
    const tokenHash = await sha256Hex(refreshToken);

    // Verifica no cache primeiro (mais rápido)
    let tokenData: TokenData | null = await this.cache.get(`${REFRESH_TOKEN_PREFIX}${tokenHash}`, env?.CACHE_KV, ctx);

    if (!tokenData) {
      // Se não estiver no cache, busca no banco
      const { rows } = await this.db.query(
        `SELECT rt.*, u.id as user_id, u.role, u.email, u.name
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL`,
        [tokenHash]
      );

      if (!rows.length) {
        return { valid: false, error: 'Refresh token inválido ou expirado' };
      }

      const row = rows[0];
      tokenData = {
        userId: row.user_id,
        sessionId: row.session_id,
        expiresAt: row.expires_at,
        role: row.role,
        email: row.email,
        name: row.name,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      };
    }

    // Verifica se o token não expirou
    if (new Date(tokenData.expiresAt) < new Date()) {
      return { valid: false, error: 'Refresh token expirado' };
    }

    // Revoga o token usado (one-time use)
    await this.revokeRefreshToken(refreshToken, env, ctx);

    // Verifica se o IP/User-Agent mudou significativamente (opcional)
    if (tokenData.ipAddress && tokenData.ipAddress !== ipAddress) {
      logger.warn('Refresh token usado com IP diferente', {
        userId: tokenData.userId,
        originalIp: tokenData.ipAddress,
        newIp: ipAddress
      });
    }

    // Retorna dados do usuário para gerar nova sessão
    return {
      valid: true,
      user: {
        id: tokenData.userId,
        role: tokenData.role,
        email: tokenData.email,
        name: tokenData.name
      },
      sessionId: tokenData.sessionId
    };
  }

  /**
   * Revoga um refresh token específico
   */
  async revokeRefreshToken(refreshToken: string, env?: Bindings, ctx?: ExecutionContext): Promise<void> {
    const tokenHash = await sha256Hex(refreshToken);

    // Remove do cache
    this.cache.delete(`${REFRESH_TOKEN_PREFIX}${tokenHash}`, env?.CACHE_KV, ctx);

    // Marca como revogado no banco (soft delete)
    const dbTask = this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    ).catch((err: any) => {
      logger.error('Erro ao revogar refresh token no banco', err, { tokenHash });
    });

    if (ctx?.waitUntil) {
      ctx.waitUntil(dbTask);
    } else {
      await dbTask;
    }
  }

  /**
   * Revoga todos os refresh tokens de um usuário
   */
  async revokeAllUserTokens(userId: number, env?: Bindings, ctx?: ExecutionContext): Promise<void> {
    // Remove todos do cache
    const { rows } = await this.db.query(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    for (const row of rows) {
      this.cache.delete(`${REFRESH_TOKEN_PREFIX}${row.token_hash}`, env?.CACHE_KV, ctx);
    }

    // Revoga todos no banco
    const dbTask = this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    ).catch((err: any) => {
      logger.error('Erro ao revogar todos os tokens do usuário no banco', err, { userId });
    });

    if (ctx?.waitUntil) {
      ctx.waitUntil(dbTask);
    } else {
      await dbTask;
    }

    logger.info('Todos os refresh tokens revogados', { userId });
  }

  /**
   * Limpa tokens expirados (executar periodicamente)
   */
  async cleanupExpiredTokens(_env?: Bindings, _ctx?: ExecutionContext): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
    );
    
    const rowCount = result.rowCount || 0;

    if (rowCount > 0) {
      logger.info('Tokens expirados limpos', { count: rowCount });
    }

    return rowCount;
  }

  /**
   * Obtém estatísticas de tokens
   */
  async getTokenStats(_env?: Bindings, _ctx?: ExecutionContext): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN expires_at > NOW() AND revoked_at IS NULL THEN 1 END) as active_tokens,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_tokens,
        COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked_tokens
      FROM refresh_tokens
    `);

    return rows[0];
  }
}

export default RefreshTokenService;
