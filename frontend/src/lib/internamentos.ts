import { api } from './apiClient';

export type PessoaResumo = {
  id: number;
  nome?: string | null;
  email?: string | null;
  role?: string;
};

export type InternamentoAnimal = {
  id: number;
  nome: string;
  especie: string;
  raca?: string | null;
  genero?: string | null;
  alergias?: string | null;
  alertasClinicos?: string | null;
  dono?: {
    id: number;
    nome: string;
    email?: string | null;
    telefone?: string | null;
  } | null;
};

export type InternamentoObservacao = {
  id: number;
  data: string;
  sinaisVitais?: string | null;
  alimentacao?: string | null;
  medicacao?: string | null;
  observacoes: string;
  internamentoId: number;
  registadoPor?: PessoaResumo | null;
  createdAt?: string;
};

export type Internamento = {
  id: number;
  dataEntrada: string;
  dataAlta?: string | null;
  motivo: string;
  observacoes?: string | null;
  estado: 'ATIVO' | 'ALTA' | string;
  animalId: number;
  veterinarioId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  animal?: InternamentoAnimal | null;
  veterinario?: PessoaResumo | null;
  observacoesInternamento?: InternamentoObservacao[];
};

export type CreateInternamentoPayload = {
  animalId: number;
  motivo: string;
  observacoes?: string;
  dataEntrada?: string;
};

export type CreateObservacaoInternamentoPayload = {
  observacoes: string;
  sinaisVitais?: string;
  alimentacao?: string;
  medicacao?: string;
  data?: string;
};

export type AltaInternamentoPayload = {
  observacoesAlta?: string;
  dataAlta?: string;
};

export async function getInternamentos() {
  const { data } = await api.get<Internamento[]>('/internamentos');
  return data;
}

export async function getInternamentosAtivos() {
  const { data } = await api.get<Internamento[]>('/internamentos/ativos');
  return data;
}

export async function createInternamento(payload: CreateInternamentoPayload) {
  const { data } = await api.post<Internamento>('/internamentos', payload);
  return data;
}

export async function addObservacaoInternamento(
  internamentoId: number,
  payload: CreateObservacaoInternamentoPayload,
) {
  const { data } = await api.post<InternamentoObservacao>(
    `/internamentos/${internamentoId}/observacoes`,
    payload,
  );
  return data;
}

export async function darAltaInternamento(
  internamentoId: number,
  payload: AltaInternamentoPayload,
) {
  const { data } = await api.patch<Internamento>(
    `/internamentos/${internamentoId}/alta`,
    payload,
  );
  return data;
}

export function formatAxiosError(error: any) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Não foi possível processar o internamento.';

  return Array.isArray(message) ? message.join(', ') : message;
}
