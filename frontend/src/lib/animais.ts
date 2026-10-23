import axios from "axios";
import { api } from "./apiClient";

export type Animal = {
  id: number;
  nome: string;
  especie: string;
  raca?: string | null;
  genero?: string | null;
  dataNascimento?: string | null;
  peso?: number | null;
  donoId: number;
  dono?: {
    id: number;
    nome: string;
    email: string;
    telefone?: string | null;
    morada?: string | null;
  } | null;
};

export type CreateAnimalPayload = {
  nome: string;
  especie: string;
  raca?: string;
  genero?: string;
  dataNascimento?: string;
  peso?: number;
  donoId: number;
};

export type UpdateAnimalPayload = {
  nome?: string;
  especie?: string;
  raca?: string;
  genero?: string;
  dataNascimento?: string;
  peso?: number;
  donoId?: number;
  alergias?: string;
  alertasClinicos?: string;
};

export async function getAnimais(): Promise<Animal[]> {
  const res = await api.get<Animal[]>("/animais");
  return res.data;
}

export async function createAnimal(payload: CreateAnimalPayload): Promise<Animal> {
  const body: CreateAnimalPayload = {
    nome: payload.nome,
    especie: payload.especie,
    raca: payload.raca,
    genero: payload.genero,
    dataNascimento: payload.dataNascimento,
    peso: payload.peso,
    donoId: payload.donoId,
  };
  const res = await api.post<Animal>("/animais", body);
  return res.data;
}

export async function updateAnimal(id: number, payload: UpdateAnimalPayload): Promise<Animal> {
  const res = await api.patch<Animal>(`/animais/${id}`, payload);
  return res.data;
}

export async function deleteAnimal(id: number): Promise<void> {
  await api.delete(`/animais/${id}`);
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
  if (err instanceof Error) return err.message;
  return "Erro inesperado";
}
