import { api } from './apiClient';

export type Vacina = {
  id: number;
  nome: string;
  lote?: string | null;
  fabricante?: string | null;
  dataAplicacao: string;
  proximaDose?: string | null;
  observacoes?: string | null;
  animalId: number;
  aplicadoPorId?: number | null;
  createdAt: string;
  animal?: { id: number; nome: string; especie: string } | null;
  aplicadoPor?: { id: number; nome: string; email: string } | null;
};

export type CreateVacinaPayload = {
  nome: string;
  lote?: string;
  fabricante?: string;
  dataAplicacao: string;
  proximaDose?: string;
  observacoes?: string;
};

export type UpdateVacinaPayload = Partial<CreateVacinaPayload>;

export async function getVacinasByAnimal(animalId: number): Promise<Vacina[]> {
  const { data } = await api.get<Vacina[]>(`/animais/${animalId}/vacinas`);
  return data;
}

export async function createVacina(animalId: number, payload: CreateVacinaPayload): Promise<Vacina> {
  const { data } = await api.post<Vacina>(`/animais/${animalId}/vacinas`, payload);
  return data;
}

export async function updateVacina(id: number, payload: UpdateVacinaPayload): Promise<Vacina> {
  const { data } = await api.patch<Vacina>(`/vacinas/${id}`, payload);
  return data;
}

export async function deleteVacina(id: number): Promise<void> {
  await api.delete(`/vacinas/${id}`);
}

export async function getAlertasProximasDoses(days = 30): Promise<Vacina[]> {
  const { data } = await api.get<Vacina[]>(`/vacinas/alertas?days=${days}`);
  return data;
}

export function vacinaStatus(proximaDose?: string | null): 'ok' | 'soon' | 'overdue' | 'none' {
  if (!proximaDose) return 'none';
  const diff = new Date(proximaDose).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'overdue';
  if (days <= 30) return 'soon';
  return 'ok';
}
