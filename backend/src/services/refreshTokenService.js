/**
 * Serviço de Refresh Tokens para autenticação JWT
 * Permite renovação de sessão sem re-login
 */

import { randomToken, sha256Hex } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const REFRESH_TOKEN_PREFIX = 'refresh_token_';

export class RefreshTokenService {
  constructor(db, cacheService) {
    this.db = db;
    this.cache = cacheService;
  }

  /**
   * Cria um novo refresh token para o usuário
   */
  async createRefreshToken(userId, sessionId, ipAddress, userAgent) {
    const tokenId = randomToken(32);
    const tokenHash = await sha256Hex(tokenId);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    // Armazena no banco de dados
    await this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tokenId, userId, sessionId, tokenHash, ipAddress, userAgent, expiresAt]
    );

    // Armazena no cache para verificação rápida
    this.cache.set(
      `${REFRESH_TOKEN_PREFIX}${tokenHash}`,
      { userId, sessionId, expiresAt },
      REFRESH_TOKEN_TTL_SECONDS
    );

    logger.info('Refresh token criado', { userId, sessionId, tokenId });
    return tokenId;
  }

  /**
   * Valida e usa um refresh token para gerar novos tokens
   */
  async refreshAccessToken(refreshToken, ipAddress, _userAgent) {
    const tokenHash = await sha256Hex(refreshToken);

    // Verifica no cache primeiro (mais rápido)
    let tokenData = this.cache.get(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);

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

      tokenData = rows[0];
    }

    // Verifica se o token não expirou
    if (new Date(tokenData.expiresAt) < new Date()) {
      return { valid: false, error: 'Refresh token expirado' };
    }

    // Revoga o token usado (one-time use)
    await this.revokeRefreshToken(refreshToken);

    // Verifica se o IP/User-Agent mudou significativamente (opcional)
    if (tokenData.ipAddress !== ipAddress) {
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
        id: tokenData.user_id || tokenData.userId,
        role: tokenData.role,
        email: tokenData.email,
        name: tokenData.name
      },
      sessionId: tokenData.session_id || tokenData.sessionId
    };
  }

  /**
   * Revoga um refresh token específico
   */
  async revokeRefreshToken(refreshToken) {
    const tokenHash = await sha256Hex(refreshToken);

    // Remove do cache
    this.cache.delete(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);

    // Marca como revogado no banco (soft delete)
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  /**
   * Revoga todos os refresh tokens de um usuário
   */
  async revokeAllUserTokens(userId) {
    // Remove todos do cache
    const { rows } = await this.db.query(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    for (const row of rows) {
      this.cache.delete(`${REFRESH_TOKEN_PREFIX}${row.token_hash}`);
    }

    // Revoga todos no banco
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    logger.info('Todos os refresh tokens revogados', { userId });
  }

  /**
   * Limpa tokens expirados (executar periodicamente)
   */
  async cleanupExpiredTokens() {
    const { rowCount } = await this.db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
    );

    if (rowCount > 0) {
      logger.info('Tokens expirados limpos', { count: rowCount });
    }

    return rowCount;
  }

  /**
   * Obtém estatísticas de tokens
   */
  async getTokenStats() {
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