import axios from 'axios';
import { api } from './apiClient';

export type UserRole = 'ADMIN' | 'VETERINARIO' | 'TECNICO' | 'RECECIONISTA' | 'TUTOR';

export type BackendUser = {
  id: number;
  nome: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
};

export async function getUsers(): Promise<BackendUser[]> {
  const res = await api.get<BackendUser[]>('/users');
  return res.data;
}

export async function createUser(data: {
  nome?: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<BackendUser> {
  const res = await api.post<BackendUser>('/users', data);
  return res.data;
}

export async function updateUserRole(id: number, role: UserRole): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${id}`, { role });
  return res.data;
}

export async function updateUser(
  id: number,
  data: {
    nome?: string;
    email?: string;
    role?: UserRole;
  },
): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${id}`, data);
  return res.data;
}

export async function updateUserPassword(
  id: number,
  newPassword: string,
): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${id}/password`, {
    newPassword,
  });
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function updateMyProfile(data: {
  nome?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<BackendUser> {
  const res = await api.patch<BackendUser>('/users/me', data);
  return res.data;
}

export function formatAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    const msg = data?.message ?? data?.error ?? data;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (err.response?.status) return `Erro ${err.response.status}`;
    return err.message || 'Erro de rede';
  }
  if (err instanceof Error) return err.message;
  return 'Erro inesperado';
}
