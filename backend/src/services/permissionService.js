/**
 * Serviço de Controle de Permissões Granular
 * Gerencia permissões de acesso por recurso e ação
 */

import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

/**
 * Recursos do sistema
 */
const RESOURCES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USERS: 'users',
  NOTIFICATIONS: 'notifications'
};

/**
 * Ações disponíveis
 */
const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  MANAGE: 'manage'
};

/**
 * Roles predefinidos
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  CUSTOMER: 'customer'
};

/**
 * Permissões padrão por role
 */
const DEFAULT_PERMISSIONS = {
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
 * Classe principal do serviço de permissões
 */
class PermissionService {
  constructor() {
    this.userPermissions = new Map();
    this.customRoles = new Map();
  }

  /**
   * Verifica se um usuário tem permissão para uma ação específica
   */
  async hasPermission(userId, resource, action) {
    try {
      const cacheKey = `permissions:${userId}`;
      let permissions = cacheService.get(cacheKey);
      
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
      logger.error('Erro ao verificar permissão', error);
      return false;
    }
  }

  /**
   * Obtém permissões de um usuário
   */
  async getUserPermissions(userId) {
    try {
      // Tenta cache primeiro
      const cacheKey = `user_permissions:${userId}`;
      let permissions = cacheService.get(cacheKey);
      
      if (!permissions) {
        // Busca do banco de dados (simulado)
        permissions = await this.fetchUserPermissionsFromDB(userId);
        cacheService.set(cacheKey, permissions, 3600);
      }
      
      return permissions;
    } catch (error) {
      logger.error('Erro ao buscar permissões do usuário', error);
      return {};
    }
  }

  /**
   * Busca permissões do banco de dados (simulado)
   */
  async fetchUserPermissionsFromDB(userId) {
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
  async getUserById(userId) {
    // Simulação - em produção, isso seria uma consulta ao banco
    return {
      id: userId,
      role: ROLES.CUSTOMER // Role padrão
    };
  }

  /**
   * Define permissões customizadas para um usuário
   */
  async setUserPermissions(userId, permissions) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      cacheService.set(cacheKey, permissions, 3600);
      
      // Salva no banco de dados (simulado)
      await this.saveUserPermissionsToDB(userId, permissions);
      
      logger.info('Permissões do usuário atualizadas', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Erro ao definir permissões do usuário', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva permissões no banco de dados (simulado)
   */
  async saveUserPermissionsToDB(userId, permissions) {
    // Simulação - em produção, isso seria uma inserção/atualização no banco
    logger.debug('Permissões salvas no banco', { userId, permissions });
  }

  /**
   * Cria um role customizado
   */
  async createCustomRole(roleData) {
    try {
      const role = {
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
    } catch (error) {
      logger.error('Erro ao criar role customizado', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva role customizado no banco de dados (simulado)
   */
  async saveCustomRoleToDB(role) {
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
    } catch (error) {
      logger.error('Erro ao listar roles', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica múltiplas permissões de uma vez
   */
  async checkMultiplePermissions(userId, checks) {
    try {
      const results = {};
      
      for (const check of checks) {
        const { resource, action } = check;
        const key = `${resource}:${action}`;
        results[key] = await this.hasPermission(userId, resource, action);
      }
      
      return { success: true, results };
    } catch (error) {
      logger.error('Erro ao verificar múltiplas permissões', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém permissões efetivas de um usuário (incluindo roles customizados)
   */
  async getEffectivePermissions(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }
      
      let permissions = DEFAULT_PERMISSIONS[user.role] || {};
      
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
    } catch (error) {
      logger.error('Erro ao obter permissões efetivas', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mescla permissões padrão com customizadas
   */
  mergePermissions(defaultPerms, customPerms) {
    const merged = { ...defaultPerms };
    
    for (const [resource, actions] of Object.entries(customPerms)) {
      if (merged[resource]) {
        // Remove duplicatas e mescla
        merged[resource] = [...new Set([...merged[resource], ...actions])];
      } else {
        merged[resource] = actions;
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
  async removeUserPermissions(userId, resource, actions) {
    try {
      const cacheKey = `user_permissions:${userId}`;
      const permissions = await this.getUserPermissions(userId);
      
      if (permissions[resource]) {
        permissions[resource] = permissions[resource].filter(
          action => !actions.includes(action)
        );
        
        // Remove recurso se não houver mais permissões
        if (permissions[resource].length === 0) {
          delete permissions[resource];
        }
        
        cacheService.set(cacheKey, permissions, 3600);
        await this.saveUserPermissionsToDB(userId, permissions);
      }
      
      logger.info('Permissões removidas', { userId, resource, actions });
      return { success: true };
    } catch (error) {
      logger.error('Erro ao remover permissões', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa cache de permissões de um usuário
   */
  async clearUserPermissionCache(userId) {
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
    } catch (error) {
      logger.error('Erro ao obter estatísticas de permissões', error);
      return { success: false, error: error.message };
    }
  }
}

// Instância singleton
export const permissionService = new PermissionService();

// Exporta constantes para uso externo
export { RESOURCES, ACTIONS, ROLES, DEFAULT_PERMISSIONS };