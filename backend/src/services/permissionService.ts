/**
 * Serviço de Controle de Permissões Granular
 * Gerencia permissões de acesso por recurso e ação
 */

import { logger } from '../utils/logger';
import { cacheService } from './cacheService';

/**
 * Recursos do sistema
 */
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

/**
 * Ações disponíveis
 */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  MANAGE: 'manage'
} as const;

/**
 * Roles predefinidos
 */
export const ROLES = {
  SHURA: 'shura',
  ADMIN: 'admin',
  CUSTOMER: 'customer'
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];
export type Role = typeof ROLES[keyof typeof ROLES];

export type ResourcePermissions = Partial<Record<Resource, Action[]>>;

/**
 * Permissões padrão por role
 */
export const DEFAULT_PERMISSIONS: Record<Role, ResourcePermissions> = {
  [ROLES.SHURA]: {
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
  [ROLES.CUSTOMER]: {
    [RESOURCES.ORDERS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.PRODUCTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ]
  }
};

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: ResourcePermissions;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Classe principal do serviço de permissões
 */
export class PermissionService {
  private userPermissions = new Map<number, ResourcePermissions>();
  private customRoles = new Map<string, CustomRole>();

  constructor() {}

  /**
   * Verifica se um usuário tem permissão para uma ação específica
   */
  async hasPermission(userId: number, resource: Resource, action: Action) {
    try {
      const cacheKey = `permissions:${userId}`;
      let permissions: ResourcePermissions | null = cacheService.get(cacheKey);
      
      if (!permissions) {
        permissions = await this.getUserPermissions(userId);
        cacheService.set(cacheKey, permissions, 3600); // 1 hora
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
   * Obtém permissões de um usuário
   */
  async getUserPermissions(userId: number): Promise<ResourcePermissions> {
    try {
      // Tenta cache primeiro
      const cacheKey = `user_permissions:${userId}`;
      let permissions: ResourcePermissions | null = cacheService.get(cacheKey);
      
      if (!permissions) {
        // Busca do banco de dados (simulado)
        permissions = await this.fetchUserPermissionsFromDB(userId);
        cacheService.set(cacheKey, permissions, 3600);
      }
      
      return permissions || {};
    } catch (error) {
      logger.error('Erro ao buscar permissões do usuário', error as Error);
      return {};
    }
  }

  /**
   * Busca permissões do banco de dados (simulado)
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
   * Simula busca de usuário por ID
   */
  async getUserById(userId: number) {
    // Simulação - em produção, isso seria uma consulta ao banco
    return {
      id: userId,
      role: ROLES.CUSTOMER as Role // Role padrão
    };
  }

  /**
   * Define permissões customizadas para um usuário
   */
  async setUserPermissions(userId: number, permissions: ResourcePermissions) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      cacheService.set(cacheKey, permissions, 3600);
      
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
   * Salva permissões no banco de dados (simulado)
   */
  async saveUserPermissionsToDB(userId: number, permissions: ResourcePermissions) {
    // Simulação - em produção, isso seria uma inserção/atualização no banco
    logger.debug('Permissões salvas no banco', { userId, permissions });
  }

  /**
   * Cria um role customizado
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
   * Salva role customizado no banco de dados (simulado)
   */
  async saveCustomRoleToDB(role: CustomRole) {
    // Simulação - em produção, isso seria uma inserção no banco
    logger.debug('Role customizado salvo no banco', { roleId: role.id });
  }

  /**
   * Lista todos os roles disponíveis
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
   * Verifica múltiplas permissões de uma vez
   */
  async checkMultiplePermissions(userId: number, checks: { resource: Resource; action: Action }[]) {
    try {
      const results: Record<string, boolean> = {};
      
      for (const check of checks) {
        const { resource, action } = check;
        const key = `${resource}:${action}`;
        results[key] = await this.hasPermission(userId, resource, action);
      }
      
      return { success: true, results };
    } catch (error: any) {
      logger.error('Erro ao verificar múltiplas permissões', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém permissões efetivas de um usuário (incluindo roles customizados)
   */
  async getEffectivePermissions(userId: number) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }
      
      let permissions: ResourcePermissions = DEFAULT_PERMISSIONS[user.role] || {};
      
      // Se o usuário tem permissões customizadas, mescla com as padrão
      const customPermissions = await this.getUserPermissions(userId);
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
   * Mescla permissões padrão com customizadas
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
   * Gera ID único para role
   */
  generateRoleId() {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove permissões de um usuário
   */
  async removeUserPermissions(userId: number, resource: Resource, actions: Action[]) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      const permissions = await this.getUserPermissions(userId);
      
      if (permissions[resource]) {
        permissions[resource] = permissions[resource]?.filter(
          action => !actions.includes(action)
        );
        
        // Remove recurso se não houver mais permissões
        if (permissions[resource]?.length === 0) {
          delete permissions[resource];
        }
        
        cacheService.set(cacheKey, permissions, 3600);
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
   * Limpa cache de permissões de um usuário
   */
  async clearUserPermissionCache(userId: number) {
    const cacheKey = `user_permissions:${userId}`;
    cacheService.delete(cacheKey);
    
    const permissionsKey = `permissions:${userId}`;
    cacheService.delete(permissionsKey);
    
    logger.debug('Cache de permissões limpo', { userId });
  }

  /**
   * Obtém estatísticas de permissões
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
