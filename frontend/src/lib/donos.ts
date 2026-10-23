import axios from "axios";
import { api } from "./apiClient";

export type Dono = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  animais?: unknown[];
};

export type CreateDonoPayload = {
  nome: string;
  email: string;
  telefone?: string;
};

export type UpdateDonoPayload = {
  nome?: string;
  email?: string;
  telefone?: string;
};

export async function getDonos(): Promise<Dono[]> {
  const res = await api.get<Dono[]>("/donos");
  return res.data;
}

export async function createDono(payload: CreateDonoPayload): Promise<Dono> {
  const body: CreateDonoPayload = {
    nome: payload.nome,
    email: payload.email,
    ...(payload.telefone ? { telefone: payload.telefone } : {}),
  };
  const res = await api.post<Dono>("/donos", body);
  return res.data;
}

export async function updateDono(id: number, payload: UpdateDonoPayload): Promise<Dono> {
  const res = await api.patch<Dono>(`/donos/${id}`, payload);
  return res.data;
}

export async function deleteDono(id: number): Promise<void> {
  await api.delete(`/donos/${id}`);
}

export function formatAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    const msg = data?.message ?? data?.error ?? data;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
    if (err.response?.status === 403) return "Sem permissão para esta ação.";
    if (err.response?.status) return `Erro ${err.response.status}`;
    return err.message || "Erro de rede";
  }
  return "Erro inesperado";
}
