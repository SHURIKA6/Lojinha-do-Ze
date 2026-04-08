export const ROLE_VALUES = ['customer', 'admin', 'shura'] as const;
export type UserRole = typeof ROLE_VALUES[number];

export const STAFF_ROLE_VALUES = ['admin', 'shura'] as const;
export type StaffRole = typeof STAFF_ROLE_VALUES[number];

export const CUSTOMER_TYPE_VALUES = ['registered', 'guest'] as const;
export type CustomerType = typeof CUSTOMER_TYPE_VALUES[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLE_VALUES.includes(value as UserRole);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return value === 'admin' || value === 'shura';
}

export function isShuraRole(value: unknown): value is 'shura' {
  return value === 'shura';
}

export function canManageRole(
  actorRole: unknown,
  targetRole: UserRole | null,
  nextRole: UserRole
): boolean {
  if (!isUserRole(actorRole)) {
    return false;
  }

  if (actorRole === 'shura') {
    return true;
  }

  if (actorRole !== 'admin') {
    return false;
  }

  if (targetRole === 'shura') {
    return false;
  }

  return nextRole === 'customer' || nextRole === 'admin';
}
