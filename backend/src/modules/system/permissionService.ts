/**
 * Serviço de Controle de Permissões Granular
 * Gerencia permissões de acesso por recurso e ação
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from './cacheService';
import { Bindings, ExecutionContext } from '../../core/types';

/** Recursos disponíveis no sistema para controle de permissões */
export const RESOURCES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USERS: 'users',
  NOTIFICATIONS: 'notifications'
} as const;

/** Ações disponíveis que podem ser realizadas em recursos */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  MANAGE: 'manage'
} as const;

/** Papéis predefinidos no sistema com diferentes níveis de permissão */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  CUSTOMER: 'customer'
} as const;

/** Tipo representando valores válidos de recurso */
export type Resource = typeof RESOURCES[keyof typeof RESOURCES];
/** Tipo representando valores válidos de ação */
export type Action = typeof ACTIONS[keyof typeof ACTIONS];
/** Tipo representando valores válidos de papel */
export type Role = typeof ROLES[keyof typeof ROLES];

/** Mapeia recursos para arrays de ações permitidas */
export type ResourcePermissions = Partial<Record<Resource, Action[]>>;

/**
 * Permissões padrão atribuídas a cada papel predefinido.
 * Super admin tem acesso total, cliente tem acesso mínimo.
 */
export const DEFAULT_PERMISSIONS: Record<string, ResourcePermissions> = {
  [ROLES.SUPER_ADMIN]: {
    [RESOURCES.PRODUCTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.ORDERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.CUSTOMERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.SUPPLIERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    [RESOURCES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  [ROLES.ADMIN]: {
    [RESOURCES.PRODUCTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT],
    [RESOURCES.ORDERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT],
    [RESOURCES.CUSTOMERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT],
    [RESOURCES.SUPPLIERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.USERS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE]
  },
  [ROLES.MANAGER]: {
    [RESOURCES.PRODUCTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.ORDERS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.CUSTOMERS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.SUPPLIERS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ, ACTIONS.UPDATE]
  },
  [ROLES.EDITOR]: {
    [RESOURCES.PRODUCTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ORDERS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CUSTOMERS]: [ACTIONS.READ],
    [RESOURCES.SUPPLIERS]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ]
  },
  [ROLES.VIEWER]: {
    [RESOURCES.PRODUCTS]: [ACTIONS.READ],
    [RESOURCES.ORDERS]: [ACTIONS.READ],
    [RESOURCES.CUSTOMERS]: [ACTIONS.READ],
    [RESOURCES.SUPPLIERS]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ]
  },
  [ROLES.CUSTOMER]: {
    [RESOURCES.ORDERS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.PRODUCTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ]
  }
};

/**
 * Representa um papel customizado com permissões específicas.
 */
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: ResourcePermissions;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Classe principal do serviço de permissões.
 * Gerencia permissões de usuários, papéis e controle de acesso para recursos do sistema.
 */
export class PermissionService {
  private userPermissions = new Map<number, ResourcePermissions>();
  private customRoles = new Map<string, CustomRole>();

  constructor() {}

  /**
   * Verifica se um usuário tem permissão para realizar uma ação em um recurso.
   * Verifica primeiro o cache, depois busca do banco de dados se necessário.
   * @param userId - O ID do usuário a ser verificado
   * @param resource - O recurso para verificar acesso
   * @param action - A ação a ser verificada
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns True se o usuário tem permissão, false caso contrário
   */
  async hasPermission(userId: number, resource: Resource, action: Action, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const cacheKey = `permissions:${userId}`;
      let permissions: ResourcePermissions | null = await cacheService.get(cacheKey, env?.CACHE_KV, ctx);
      
      if (!permissions) {
        permissions = await this.getUserPermissions(userId, env, ctx);
        await cacheService.set(cacheKey, permissions, 3600, env?.CACHE_KV, ctx); // 1 hora
      }
      
      const resourcePermissions = permissions[resource];
      if (!resourcePermissions) {
        return false;
      }
      
      return resourcePermissions.includes(action) || resourcePermissions.includes(ACTIONS.MANAGE);
    } catch (error) {
      logger.error('Erro ao verificar permissão', error as Error);
      return false;
    }
  }

  /**
   * Recupera todas as permissões de um usuário, verificando primeiro o cache.
   * @param userId - O ID do usuário
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Objeto mapeando recursos para ações permitidas
   */
  async getUserPermissions(userId: number, env?: Bindings, ctx?: ExecutionContext): Promise<ResourcePermissions> {
    try {
      // Tenta cache primeiro
      const cacheKey = `user_permissions:${userId}`;
      let permissions: ResourcePermissions | null = await cacheService.get(cacheKey, env?.CACHE_KV, ctx);
      
      if (!permissions) {
        // Busca do banco de dados (simulado)
        permissions = await this.fetchUserPermissionsFromDB(userId);
        await cacheService.set(cacheKey, permissions, 3600, env?.CACHE_KV, ctx);
      }
      
      return permissions || {};
    } catch (error) {
      logger.error('Erro ao buscar permissões do usuário', error as Error);
      return {};
    }
  }

  /**
   * Busca permissões de usuário do banco de dados (simulado).
   * Em produção, isso consultaria o banco de dados para o papel e permissões do usuário.
   * @param userId - O ID do usuário
   * @returns Permissões de recurso baseadas no papel do usuário
   */
  async fetchUserPermissionsFromDB(userId: number): Promise<ResourcePermissions> {
    // Simulação - em produção, isso seria uma consulta ao banco
    // Por enquanto, retorna permissões padrão baseadas no role
    const user = await this.getUserById(userId);
    if (!user) {
      return {};
    }
    
    return DEFAULT_PERMISSIONS[user.role] || {};
  }

  /**
   * Simula a busca de um usuário pelo ID no banco de dados.
   * @param userId - O ID do usuário
   * @returns Objeto do usuário com papel (padrão: CUSTOMER)
   */
  async getUserById(userId: number) {
    // Simulação - em produção, isso seria uma consulta ao banco
    return {
      id: userId,
      role: ROLES.CUSTOMER // Role padrão
    };
  }

  /**
   * Define permissões customizadas para um usuário, sobrescrevendo os padrões.
   * Atualiza tanto o cache quanto o banco de dados.
   * @param userId - O ID do usuário
   * @param permissions - As permissões a serem definidas
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso ou mensagem de erro
   */
  async setUserPermissions(userId: number, permissions: ResourcePermissions, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      await cacheService.set(cacheKey, permissions, 3600, env?.CACHE_KV, ctx);
      
      // Salva no banco de dados (simulado)
      await this.saveUserPermissionsToDB(userId, permissions);
      
      logger.info('Permissões do usuário atualizadas', { userId });
      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao definir permissões do usuário', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva permissões de usuário no banco de dados (simulado).
   * @param userId - O ID do usuário
   * @param permissions - As permissões a serem salvas
   */
  async saveUserPermissionsToDB(userId: number, permissions: ResourcePermissions) {
    // Simulação - em produção, isso seria uma inserção/atualização no banco
    logger.debug('Permissões salvas no banco', { userId, permissions });
  }

  /**
   * Cria um novo papel customizado com permissões específicas.
   * @param roleData - Dados do papel incluindo nome, descrição e permissões
   * @returns Status de sucesso e papel criado ou mensagem de erro
   */
  async createCustomRole(roleData: { name: string; description: string; permissions: ResourcePermissions }) {
    try {
      const role: CustomRole = {
        id: this.generateRoleId(),
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.customRoles.set(role.id, role);
      
      // Salva no banco de dados (simulado)
      await this.saveCustomRoleToDB(role);
      
      logger.info('Role customizado criado', { roleId: role.id, name: role.name });
      return { success: true, role };
    } catch (error: any) {
      logger.error('Erro ao criar role customizado', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva papel customizado no banco de dados (simulado).
   * @param role - O papel customizado a ser salvo
   */
  async saveCustomRoleToDB(role: CustomRole) {
    // Simulação - em produção, isso seria uma inserção no banco
    logger.debug('Role customizado salvo no banco', { roleId: role.id });
  }

  /**
   * Lista todos os papéis disponíveis incluindo padrões e customizados.
   * @returns Status de sucesso e array de todos os papéis com permissões
   */
  async listRoles() {
    try {
      const defaultRoles = Object.entries(ROLES).map(([key, value]) => ({
        id: key,
        name: value,
        isDefault: true,
        permissions: DEFAULT_PERMISSIONS[value] || {}
      }));
      
      const customRoles = Array.from(this.customRoles.values()).map(role => ({
        ...role,
        isDefault: false
      }));
      
      return {
        success: true,
        roles: [...defaultRoles, ...customRoles]
      };
    } catch (error: any) {
      logger.error('Erro ao listar roles', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica múltiplas permissões de uma vez para um usuário.
   * @param userId - O ID do usuário
   * @param checks - Array de pares recurso/ação para verificar
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso e objeto com resultados das verificações
   */
  async checkMultiplePermissions(userId: number, checks: { resource: Resource; action: Action }[], env?: Bindings, ctx?: ExecutionContext) {
    try {
      const results: Record<string, boolean> = {};
      
      for (const check of checks) {
        const { resource, action } = check;
        const key = `${resource}:${action}`;
        results[key] = await this.hasPermission(userId, resource, action, env, ctx);
      }
      
      return { success: true, results };
    } catch (error: any) {
      logger.error('Erro ao verificar múltiplas permissões', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém permissões efetivas para um usuário, mesclando papel padrão e permissões customizadas.
   * @param userId - O ID do usuário
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso com ID do usuário, papel e permissões mescladas
   */
  async getEffectivePermissions(userId: number, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }
      
      let permissions: ResourcePermissions = DEFAULT_PERMISSIONS[user.role] || {};
      
      // Se o usuário tem permissões customizadas, mescla com as padrão
      const customPermissions = await this.getUserPermissions(userId, env, ctx);
      if (customPermissions && Object.keys(customPermissions).length > 0) {
        permissions = this.mergePermissions(permissions, customPermissions);
      }
      
      return {
        success: true,
        userId,
        role: user.role,
        permissions
      };
    } catch (error: any) {
      logger.error('Erro ao obter permissões efetivas', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mescla permissões padrão com permissões customizadas.
   * Remove duplicatas e combina arrays de ações.
   * @param defaultPerms - Permissões padrão do papel
   * @param customPerms - Permissões customizadas definidas para o usuário
   * @returns Objeto de permissões mescladas
   */
  mergePermissions(defaultPerms: ResourcePermissions, customPerms: ResourcePermissions): ResourcePermissions {
    const merged: ResourcePermissions = { ...defaultPerms };
    
    for (const [resource, actions] of Object.entries(customPerms)) {
      const res = resource as Resource;
      if (merged[res]) {
        // Remove duplicatas e mescla
        merged[res] = [...new Set([...(merged[res] || []), ...(actions || [])])];
      } else {
        merged[res] = actions;
      }
    }
    
    return merged;
  }

  /**
   * Gera um ID único para um novo papel customizado.
   * @returns String de ID único do papel
   */
  generateRoleId() {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove ações específicas das permissões de um usuário para um recurso.
   * @param userId - O ID do usuário
   * @param resource - O recurso para modificar permissões
   * @param actions - Array de ações a serem removidas
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso ou mensagem de erro
   */
  async removeUserPermissions(userId: number, resource: Resource, actions: Action[], env?: Bindings, ctx?: ExecutionContext) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      const permissions = await this.getUserPermissions(userId, env, ctx);
      
      if (permissions[resource]) {
        permissions[resource] = permissions[resource]?.filter(
          action => !actions.includes(action)
        );
        
        // Remove recurso se não houver mais permissões
        if (permissions[resource]?.length === 0) {
          delete permissions[resource];
        }
        
        await cacheService.set(cacheKey, permissions, 3600, env?.CACHE_KV, ctx);
        await this.saveUserPermissionsToDB(userId, permissions);
      }
      
      logger.info('Permissões removidas', { userId, resource, actions });
      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao remover permissões', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa todo o cache de permissões de um usuário.
   * Força nova busca na próxima verificação de permissão.
   * @param userId - O ID do usuário
   * @param env - Bindings opcionais do ambiente Cloudflare
   */
  async clearUserPermissionCache(userId: number, env?: Bindings) {
    const cacheKey = `user_permissions:${userId}`;
    await cacheService.delete(cacheKey, env?.CACHE_KV);
    
    const permissionsKey = `permissions:${userId}`;
    await cacheService.delete(permissionsKey, env?.CACHE_KV);
    
    logger.debug('Cache de permissões limpo', { userId });
  }

  /**
   * Retorna estatísticas sobre o uso do sistema de permissões.
   * @returns Status de sucesso e objeto de estatísticas com contagens
   */
  async getStats() {
    try {
      const stats = {
        totalUsers: this.userPermissions.size,
        totalCustomRoles: this.customRoles.size,
        defaultRoles: Object.keys(ROLES).length,
        resources: Object.keys(RESOURCES).length,
        actions: Object.keys(ACTIONS).length
      };
      
      return { success: true, stats };
    } catch (error: any) {
      logger.error('Erro ao obter estatísticas de permissões', error as Error);
      return { success: false, error: error.message };
    }
  }
}

export const permissionService = new PermissionService();
export default PermissionService;
