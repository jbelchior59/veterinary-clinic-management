import axios from "axios";
import { api } from "./apiClient";

export type TratamentoHistorico = {
  id: number;
  descricao: string;
  medicacao?: string | null;
  createdAt: string;
};

export type ConsultaHistorico = {
  id: number;
  data: string;
  observacoes: string;
  diagnostico: string;
  pesoRegistado?: number | null;
  createdAt: string;
  tratamentos: TratamentoHistorico[];
};

export type MarcacaoHistorico = {
  id: number;
  data: string;
  motivo?: string | null;
  estado: string;
  createdAt: string;
};

export type HistoricoClinico = {
  animalId: number;
  nome: string;
  especie: string;
  alergias?: string | null;
  alertasClinicos?: string | null;
  dono?: {
    id: number;
    nome: string;
    email: string;
    telefone?: string | null;
  };
  totalConsultas: number;
  totalTratamentos: number;
  marcacoes: MarcacaoHistorico[];
  consultas: ConsultaHistorico[];
};

export async function getHistoricoClinico(animalId: number): Promise<HistoricoClinico> {
  const res = await api.get<HistoricoClinico>(`/animais/${animalId}/historico`);
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
