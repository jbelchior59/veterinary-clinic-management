import axios from "axios";
import { api } from "./apiClient";

export type CreateConsultaPayload = {
  animalId: number;
  data: string;
  observacoes: string;
  diagnostico: string;
  pesoRegistado?: number;
};

export type Consulta = {
  id: number;
  data: string;
  observacoes: string;
  diagnostico: string;
  createdAt: string;
  animal: {
    id: number;
    nome: string;
    especie: string;
  };
  tratamentos: Array<{
    id: number;
    descricao: string;
    medicacao?: string | null;
    createdAt: string;
  }>;
};

export async function createConsulta(payload: CreateConsultaPayload): Promise<Consulta> {
  const res = await api.post<Consulta>("/consultas", payload);
  return res.data;
}

export async function getConsultasByAnimal(animalId: number): Promise<Consulta[]> {
  const res = await api.get<Consulta[]>(`/consultas/animal/${animalId}`);
  return res.data;
}

export async function updateConsulta(
  id: number,
  payload: { observacoes: string; diagnostico: string },
): Promise<Consulta> {
  const res = await api.patch<Consulta>(`/consultas/${id}`, payload);
  return res.data;
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
