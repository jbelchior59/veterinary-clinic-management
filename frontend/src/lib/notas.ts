import { api } from './apiClient';

export type NotaRapida = {
  id: number;
  texto: string;
  animalId: number;
  animal?: { id: number; nome: string };
  autorId?: number | null;
  autor?: { id: number; nome?: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotaPayload = {
  texto: string;
  animalId: number;
};

export async function getNotasByAnimal(animalId: number): Promise<NotaRapida[]> {
  const res = await api.get<NotaRapida[]>(`/notas-rapidas/animal/${animalId}`);
  return res.data;
}

export async function createNota(payload: CreateNotaPayload): Promise<NotaRapida> {
  const res = await api.post<NotaRapida>('/notas-rapidas', payload);
  return res.data;
}

export async function deleteNota(id: number): Promise<void> {
  await api.delete(`/notas-rapidas/${id}`);
}
