export const USER_ROLE_VALUES = ['customer', 'admin', 'shura'] as const;
export type UserRole = typeof USER_ROLE_VALUES[number];

export const STAFF_ROLE_VALUES = ['admin', 'shura'] as const;
export type StaffRole = typeof STAFF_ROLE_VALUES[number];

export const CUSTOMER_TYPE_VALUES = ['registered', 'guest'] as const;
export type CustomerType = typeof CUSTOMER_TYPE_VALUES[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLE_VALUES.includes(value as UserRole);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return value === 'admin' || value === 'shura';
}

export function isShuraRole(value: unknown): value is 'shura' {
  return value === 'shura';
}

export function isCustomerRole(value: unknown): value is 'customer' {
  return value === 'customer';
}

export function getHomePathForRole(role: unknown): '/admin/dashboard' | '/conta' {
  return isStaffRole(role) ? '/admin/dashboard' : '/conta';
}

export function getRoleLabel(role: UserRole | null | undefined): string {
  if (role === 'shura') {
    return 'SHURA';
  }

  if (role === 'admin') {
    return 'Administrador';
  }

  if (role === 'customer') {
    return 'Cliente';
  }

  return 'Sem cargo';
}
