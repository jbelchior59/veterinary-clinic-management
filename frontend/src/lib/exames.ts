import { api } from '../lib/apiClient';

export type CreateExamePayload = {
  animalId: number;
  tipo: string;
  prioridade?: string;
  descricaoClinica?: string;
  laboratorioId?: number;
};

export type CreateAmostraPayload = {
  exameId: number;
  codigo: string;
  tipo: string;
  origem?: string;
  temperatura?: string;
  localizacaoArmazenamento?: string;
  observacoes?: string;
};

export type CreateResultadoPayload = {
  exameId: number;
  dados: string;
  parametro?: string;
  valor?: string;
  unidade?: string;
  referencia?: string;
  interpretacao?: string;
  observacoes?: string;
};

export type CreateRelatorioPayload = {
  exameId: number;
  conclusao: string;
  observacoes?: string;
  recomendacoes?: string;
};

export type UpdateEstadoExamePayload = {
  estado: string;
};

export type ResultadoTemplate = {
  tipo: string;
  parametros: Array<{
    parametro: string;
    unidade: string;
    referencia: string;
  }>;
};

export type PessoaResumo = {
  id: number;
  nome?: string | null;
  email?: string | null;
  role?: string;
};

export type Resultado = {
  id: number;
  exameId: number;
  dados: string;
  parametro?: string | null;
  valor?: string | null;
  unidade?: string | null;
  referencia?: string | null;
  interpretacao?: string | null;
  observacoes?: string | null;
  validado?: boolean;
  dataResultado?: string;
  dataValidacao?: string | null;
  createdAt?: string;
  inseridoPor?: PessoaResumo | null;
  validadoPor?: PessoaResumo | null;
};

export type Amostra = {
  id: number;
  exameId: number;
  codigo: string;
  tipo: string;
  origem?: string | null;
  estado?: string;
  motivoRejeicao?: string | null;
  temperatura?: string | null;
  localizacaoArmazenamento?: string | null;
  observacoes?: string | null;
  dataColheita?: string;
  dataRececao?: string;
  processadaEm?: string | null;
  createdAt?: string;
  registadaPor?: PessoaResumo | null;
};

export type NotaInterna = {
  id: number;
  exameId: number;
  conteudo: string;
  createdAt: string;
  autor?: PessoaResumo | null;
};

export type AnexoLaboratorial = {
  id: number;
  exameId: number;
  nome: string;
  url: string;
  tipo?: string | null;
  createdAt: string;
  autor?: PessoaResumo | null;
};

export type ExameAuditLog = {
  id: number;
  exameId: number;
  acao: string;
  de?: string | null;
  para?: string | null;
  detalhe?: string | null;
  createdAt: string;
  ator?: PessoaResumo | null;
};

export type LabConsumo = {
  id: number;
  exameId: number;
  stockItemId?: number | null;
  item: string;
  quantidade: number;
  unidade: string;
  lote?: string | null;
  createdAt: string;
  registadoPor?: PessoaResumo | null;
  stockItem?: {
    id: number;
    nome: string;
    categoria?: string;
    unidade?: string;
    quantidade?: number;
    lote?: string | null;
  } | null;
};

export type Relatorio = {
  id: number;
  exameId: number;
  conclusao: string;
  observacoes?: string | null;
  recomendacoes?: string | null;
  dataEmissao?: string;
  createdAt?: string;
  emitidoPorId?: number | null;

  emitidoPor?: {
    id: number;
    nome?: string | null;
    email?: string | null;
    role?: string;
  } | null;

  resultados?: Resultado[];

  exame?: Exame | null;
};

export type Exame = {
  id: number;
  tipo: string;
  estado: string;
  prioridade: string;
  descricaoClinica?: string | null;
  dataPedido: string;
  animalId: number;
  solicitanteId?: number | null;
  laboratorioId?: number | null;
  dataConclusao?: string | null;
  createdAt?: string;
  animal?: {
    id: number;
    nome: string;
    especie?: string;
    dono?: {
      id: number;
      nome: string;
      email: string;
    } | null;
  } | null;
  laboratorio?: {
    id: number;
    nome: string;
    tipo?: string;
  } | null;
  solicitante?: PessoaResumo | null;
  amostras?: Amostra[];
  resultados?: Resultado[];
  relatorio?: Relatorio | null;
  notasInternas?: NotaInterna[];
  anexos?: AnexoLaboratorial[];
  auditoria?: ExameAuditLog[];
  consumos?: LabConsumo[];
};

export async function createExame(payload: CreateExamePayload) {
  const { data } = await api.post<Exame>('/exames', payload);
  return data;
}

export async function getExames() {
  const { data } = await api.get<Exame[]>('/exames');
  return data;
}

export async function getResultadoTemplates() {
  const { data } = await api.get<ResultadoTemplate[]>('/exames/templates/resultados');
  return data;
}

export async function getExame(exameId: number) {
  const { data } = await api.get<Exame>(`/exames/${exameId}`);
  return data;
}

export async function getExamesByAnimal(animalId: number) {
  const { data } = await api.get<Exame[]>(`/exames/animal/${animalId}`);
  return data;
}

export async function createAmostra(payload: CreateAmostraPayload) {
  const { data } = await api.post<Amostra>('/amostras', payload);
  return data;
}

export async function rejeitarAmostra(amostraId: number, motivo: string) {
  const { data } = await api.patch<Amostra>(`/amostras/${amostraId}/rejeitar`, { motivo });
  return data;
}

export async function createResultado(payload: CreateResultadoPayload) {
  const { data } = await api.post<Resultado>('/resultados', payload);
  return data;
}

export async function getResultadosByExame(exameId: number) {
  const { data } = await api.get<Resultado[]>(`/resultados/exame/${exameId}`);
  return data;
}

export async function validarResultado(resultadoId: number) {
  const { data } = await api.patch<Resultado>(`/resultados/${resultadoId}/validar`);
  return data;
}

export async function createRelatorio(payload: CreateRelatorioPayload) {
  const { data } = await api.post<Relatorio>('/relatorios', payload);
  return data;
}

export async function updateExameEstado(exameId: number, payload: UpdateEstadoExamePayload) {
  const { data } = await api.patch<Exame>(`/exames/${exameId}/estado`, payload);
  return data;
}

export const updateExame = updateExameEstado;

export async function createNotaInterna(exameId: number, conteudo: string) {
  const { data } = await api.post<NotaInterna>(`/exames/${exameId}/notas-internas`, { conteudo });
  return data;
}

export async function createAnexo(exameId: number, payload: { nome: string; url: string; tipo?: string }) {
  const { data } = await api.post<AnexoLaboratorial>(`/exames/${exameId}/anexos`, payload);
  return data;
}

export async function uploadAnexo(exameId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<AnexoLaboratorial>(`/exames/${exameId}/anexos/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}

export async function createConsumo(exameId: number, payload: { stockItemId?: number; item?: string; quantidade: number; unidade?: string; lote?: string }) {
  const { data } = await api.post<LabConsumo>(`/exames/${exameId}/consumos`, payload);
  return data;
}

export function formatAxiosError(error: any) {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'Não foi possível processar o pedido laboratorial.';

  return Array.isArray(message) ? message.join(', ') : message;
}
