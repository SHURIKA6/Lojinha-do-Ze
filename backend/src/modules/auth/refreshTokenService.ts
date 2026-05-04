/**
 * Serviço de Refresh Tokens para autenticação JWT
 * Permite renovação de sessão sem re-login
 *
 * SEGURANÇA: Refresh tokens são armazenados apenas como hash SHA-256 no banco de dados.
 * O token bruto nunca é persistido, apenas retornado no momento da criação para o cliente.
 * Isso previne roubo de sessões caso o banco de dados seja comprometido.
 */

import { randomToken, sha256Hex } from '../../core/utils/crypto';
import { logger } from '../../core/utils/logger';
import { REFRESH_TOKEN_TTL_SECONDS } from '../../core/domain/constants';
import { Database, Bindings, HonoCloudflareContext } from '../../core/types';

type ExecutionContext = HonoCloudflareContext['executionCtx'];

const REFRESH_TOKEN_PREFIX = 'refresh_token_';

/**
 * Estrutura de dados representando as informações de um refresh token.
 * Usado para cache e recuperação de dados do token.
 */
export interface TokenData {
  /** ID do usuário ao qual este token pertence */
  userId: number;
  /** ID da sessão associada a este token */
  sessionId: string;
  /** Data e hora em que este token expira */
  expiresAt: string | Date;
  /** Papel/função do usuário (para acesso rápido sem consulta ao DB) */
  role?: string;
  /** Email do usuário (para acesso rápido sem consulta ao DB) */
  email?: string;
  /** Nome do usuário (para acesso rápido sem consulta ao DB) */
  name?: string;
  /** Endereço IP de onde o token foi criado */
  ipAddress?: string;
  /** User agent de onde o token foi criado */
  userAgent?: string;
  /** Data e hora em que este token foi revogado (null se ainda for válido) */
  revokedAt?: string | Date;
}

/**
 * RefreshTokenService lida com a criação, validação e revogação de refresh tokens.
 * Refresh tokens permitem que usuários obtenham novos tokens de sessão sem reautenticação.
 * Tokens são armazenados tanto no banco de dados (persistência) quanto no cache (consulta rápida).
 * Implementa rotação de tokens - cada uso revoga o token antigo e emite um novo.
 */
export class RefreshTokenService {
  private db: Database;
  private cache: any;

  /**
   * Cria uma nova instância de RefreshTokenService.
   * 
   * @param db - Cliente do banco de dados para executar consultas
   * @param cacheService - Serviço de cache para consulta rápida de tokens
   */
  constructor(db: Database, cacheService: any) {
    this.db = db;
    this.cache = cacheService;
  }

  /**
   * Cria um novo refresh token para o usuário
   * Gera um novo refresh token, armazena no banco de dados e no cache.
   * O token pode ser usado uma vez para obter uma nova sessão (rotação de token).
   * 
   * @param userId - ID do usuário para quem criar o token
   * @param sessionId - ID da sessão associada a este token
   * @param ipAddress - Endereço IP de onde a requisição originou-se
   * @param userAgent - String do user agent da requisição
   * @param env - Bindings de ambiente (para acesso ao cache)
   * @param ctx - Contexto de execução para tarefas em background (Cloudflare Workers)
   * @returns O refresh token bruto (deve ser armazenado em cookie HTTP-only)
   */
  async createRefreshToken(userId: number, sessionId: string, ipAddress: string, userAgent: string, env?: Bindings, ctx?: ExecutionContext): Promise<string> {
    const tokenId = randomToken(32);
    const tokenHash = await sha256Hex(tokenId);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    // Armazena no banco de dados (background task se ctx disponível)
    // IMPORTANTE: tokenHash é usado como id, nunca armazenar o tokenId (token bruto) no banco
    const dbTask = this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tokenHash, userId, sessionId, tokenHash, ipAddress, userAgent, expiresAt]
    ).catch((err: any) => {
      logger.error('Erro ao persistir refresh token no banco', err, { userId, tokenHash });
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

    logger.info('Refresh token criado', { userId, sessionId });
    return tokenId;
  }

  /**
   * Valida e usa um refresh token para gerar novos tokens
   * Realiza rotação de token: valida o token, depois o revoga imediatamente.
   * Retorna dados do usuário necessários para criar uma nova sessão.
   * 
   * @param refreshToken - O refresh token bruto vindo do cookie
   * @param ipAddress - Endereço IP atual (para log de segurança)
   * @param _userAgent - String atual do user agent
   * @param env - Bindings de ambiente (para acesso ao cache)
   * @param ctx - Contexto de execução para tarefas em background
   * @returns Objeto contendo status de validade, dados do usuário e mensagem de erro
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
   * Remove o token do cache e marca como revogado no banco de dados.
   * Usado durante logout ou ao rotacionar tokens (política de uso único).
   * 
   * @param refreshToken - O refresh token bruto para revogar
   * @param env - Bindings de ambiente (para acesso ao cache)
   * @param ctx - Contexto de execução para tarefas em background
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
   * Usado durante eventos de segurança ou quando o usuário altera a senha.
   * Força reautenticação em todos os dispositivos.
   * 
   * @param userId - ID do usuário cujos tokens devem ser revogados
   * @param env - Bindings de ambiente (para acesso ao cache)
   * @param ctx - Contexto de execução para tarefas em background
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
   * Remove tokens que expiraram ou foram revogados do banco de dados.
   * Esta é uma operação de limpeza para evitar inchaço do banco de dados.
   * 
   * @param _env - Bindings de ambiente (reservado para uso futuro)
   * @param _ctx - Contexto de execução (reservado para uso futuro)
   * @returns Número de tokens excluídos
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
   * Retorna contagens de tokens total, ativos, expirados e revogados.
   * Útil para monitoramento e depuração de uso de tokens.
   * 
   * @param _env - Bindings de ambiente (reservado para uso futuro)
   * @param _ctx - Contexto de execução (reservado para uso futuro)
   * @returns Objeto contendo estatísticas dos tokens
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
