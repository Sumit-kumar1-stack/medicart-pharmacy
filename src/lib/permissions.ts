import type { Role } from '@prisma/client';

export const PHARMACY_REVIEW_ROLES: Role[] = ['PHARMACIST', 'ADMIN', 'SUPER_ADMIN'];
export const ORDER_MANAGEMENT_ROLES: Role[] = ['ORDER_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
export const INVENTORY_ROLES: Role[] = ['INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
export const ADMIN_DASHBOARD_ROLES: Role[] = [
  'PHARMACIST',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'ADMIN',
  'SUPER_ADMIN'
];
