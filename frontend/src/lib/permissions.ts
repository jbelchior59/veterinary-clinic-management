import type { UserRole } from '../types';

export type AppPage =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'checkin'
  | 'laboratory'
  | 'inpatient'
  | 'stock'
  | 'billing'
  | 'comunicacao'
  | 'profissionais'
  | 'servicesCatalog'
  | 'financial'
  | 'reports'
  | 'users'
  | 'settings';

const PAGE_PERMISSIONS: Record<AppPage, UserRole[]> = {
  users: ['ADMIN'],
  settings: ['ADMIN'],
  financial: ['ADMIN'],
  servicesCatalog: ['ADMIN'],

  dashboard: ['ADMIN', 'VETERINARIO', 'RECECIONISTA', 'TECNICO'],
  patients: ['ADMIN', 'VETERINARIO', 'RECECIONISTA'],
  appointments: ['ADMIN', 'VETERINARIO', 'RECECIONISTA'],
  laboratory: ['VETERINARIO', 'TECNICO'],
  reports: ['ADMIN', 'VETERINARIO'],
  inpatient: ['ADMIN', 'VETERINARIO'],

  billing: ['ADMIN', 'RECECIONISTA'],
  comunicacao: ['ADMIN', 'RECECIONISTA'],
  profissionais: ['ADMIN', 'RECECIONISTA'],
  checkin: ['ADMIN', 'RECECIONISTA'],

  stock: ['ADMIN', 'TECNICO'],
};

export function canAccessPage(role: UserRole, page: AppPage): boolean {
  return PAGE_PERMISSIONS[page]?.includes(role) ?? false;
}

export function getAllowedPages(role: UserRole): AppPage[] {
  return (Object.keys(PAGE_PERMISSIONS) as AppPage[]).filter((page) =>
    canAccessPage(role, page),
  );
}

export function getDefaultPageForRole(role: UserRole): AppPage {
  if (role === 'ADMIN') return 'dashboard';
  if (role === 'VETERINARIO') return 'dashboard';
  if (role === 'RECECIONISTA') return 'appointments';
  if (role === 'TECNICO') return 'dashboard';

  return 'dashboard';
}
