import axios from "axios";
import { api } from "./apiClient";

export type MarcacaoDono = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
};

export type MarcacaoAnimal = {
  id: number;
  nome: string;
  especie: string;
  donoId: number;
  dono: MarcacaoDono;
};

export type MarcacaoEstado = "AGENDADA" | "CANCELADA" | "CONCLUIDA" | string;

export type Marcacao = {
  id: number;
  data: string;
  motivo: string;
  estado: MarcacaoEstado;
  animalId: number;
  animal: MarcacaoAnimal;
  profissionalId?: number | null;
  profissional?: { id: number; nome: string | null; email: string; role: string } | null;
};

export type CreateMarcacaoPayload = {
  data: string;
  motivo: string;
  animalId: number;
  profissionalId?: number;
};

export async function getMarcacoesAtivas(): Promise<Marcacao[]> {
  const res = await api.get<Marcacao[]>("/marcacoes");
  return res.data;
}

export async function getHistoricoMarcacoes(): Promise<Marcacao[]> {
  const res = await api.get<Marcacao[]>("/marcacoes/historico");
  return res.data;
}

export async function createMarcacao(payload: CreateMarcacaoPayload): Promise<Marcacao> {
  const res = await api.post<Marcacao>("/marcacoes", payload);
  return res.data;
}

export async function cancelarMarcacao(id: number): Promise<Marcacao> {
  const res = await api.patch<Marcacao>(`/marcacoes/${id}/cancelar`);
  return res.data;
}

export async function concluirMarcacao(id: number): Promise<Marcacao> {
  const res = await api.patch<Marcacao>(`/marcacoes/${id}/concluir`);
  return res.data;
}

export function formatarDataMarcacao(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    const msg = data?.message ?? data?.error ?? data;

    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
    if (err.response?.status) return `Erro ${err.response.status}`;
    return err.message || "Erro de rede";
  }

  if (err instanceof Error) return err.message;
  return "Erro inesperado";
}
export async function confirmarMarcacao(id: number): Promise<Marcacao> {
  const res = await api.patch<Marcacao>(`/marcacoes/${id}/confirmar`);
  return res.data;
}

export async function updateMarcacao(id: number, payload: Partial<CreateMarcacaoPayload>): Promise<Marcacao> {
  const res = await api.patch<Marcacao>(`/marcacoes/${id}`, payload);
  return res.data;
}

export async function getMarcacoesHoje(): Promise<Marcacao[]> {
  const res = await api.get<Marcacao[]>('/marcacoes/hoje');
  return res.data;
}
