import axios from 'axios';
import { api } from './apiClient';

export type CreateTratamentoPayload = {
  descricao: string;
  medicacao?: string;
  consultaId: number;
};

export type UpdateTratamentoPayload = {
  descricao?: string;
  medicacao?: string;
};

export type Tratamento = {
  id: number;
  descricao: string;
  medicacao?: string | null;
  consultaId: number;
  createdAt?: string;
};

export async function createTratamento(payload: CreateTratamentoPayload): Promise<Tratamento> {
  const res = await api.post<Tratamento>('/tratamentos', payload);
  return res.data;
}

export async function updateTratamento(
  id: number,
  payload: UpdateTratamentoPayload,
): Promise<Tratamento> {
  const res = await api.patch<Tratamento>(`/tratamentos/${id}`, payload);
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