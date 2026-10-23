import { api } from './apiClient';

export type StockMovement = {
  id: number;
  tipo: 'ENTRADA' | 'CONSUMO' | string;
  quantidade: number;
  motivo?: string | null;
  exameId?: number | null;
  labConsumoId?: number | null;
  createdAt: string;
  registadoPor?: {
    id: number;
    nome?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

export type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  lot: string;
  expiryDate: string;
  location: string;
  supplier: string;
  notes: string;
  movements?: StockMovement[];
};

export type CreateStockItemPayload = {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  lot?: string;
  expiryDate?: string;
  location?: string;
  supplier?: string;
  notes?: string;
};

export type UpdateStockItemPayload = Partial<CreateStockItemPayload>;

export type StockMovementPayload = {
  quantidade: number;
  motivo?: string;
};

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function mapMovement(raw: any): StockMovement {
  return {
    id: Number(raw.id),
    tipo: raw.tipo,
    quantidade: Number(raw.quantidade ?? 0),
    motivo: raw.motivo ?? null,
    exameId: raw.exameId ?? null,
    labConsumoId: raw.labConsumoId ?? null,
    createdAt: raw.createdAt,
    registadoPor: raw.registadoPor ?? null,
  };
}

function mapStockItem(raw: any): StockItem {
  return {
    id: String(raw.id),
    name: raw.nome ?? '',
    category: raw.categoria ?? '',
    unit: raw.unidade ?? '',
    quantity: Number(raw.quantidade ?? 0),
    minQuantity: Number(raw.quantidadeMin ?? 0),
    lot: raw.lote ?? '',
    expiryDate: toDateInputValue(raw.validade),
    location: raw.localizacao ?? '',
    supplier: raw.fornecedor ?? '',
    notes: raw.notas ?? '',
    movements: Array.isArray(raw.movimentos) ? raw.movimentos.map(mapMovement) : [],
  };
}

function mapStockPayload(payload: CreateStockItemPayload | UpdateStockItemPayload) {
  return {
    nome: payload.name,
    categoria: payload.category,
    unidade: payload.unit,
    quantidade: payload.quantity,
    quantidadeMin: payload.minQuantity,
    lote: payload.lot || undefined,
    validade: payload.expiryDate || undefined,
    localizacao: payload.location || undefined,
    fornecedor: payload.supplier || undefined,
    notas: payload.notes || undefined,
  };
}

export async function getStock(): Promise<StockItem[]> {
  const { data } = await api.get('/stock');
  return (data as any[]).map(mapStockItem);
}

export async function getStockMovements(id: string | number): Promise<StockMovement[]> {
  const { data } = await api.get(`/stock/${id}/movimentos`);
  return (data as any[]).map(mapMovement);
}

export async function createStockItem(payload: CreateStockItemPayload): Promise<StockItem> {
  const { data } = await api.post('/stock', mapStockPayload(payload));
  return mapStockItem(data);
}

export async function updateStockItem(
  id: string | number,
  payload: UpdateStockItemPayload,
): Promise<StockItem> {
  const { data } = await api.patch(`/stock/${id}`, mapStockPayload(payload));
  return mapStockItem(data);
}

export async function addEntrada(
  id: string | number,
  payload: StockMovementPayload,
): Promise<StockItem> {
  const { data } = await api.post(`/stock/${id}/entrada`, payload);
  return mapStockItem(data);
}

export async function addConsumo(
  id: string | number,
  payload: StockMovementPayload,
): Promise<StockItem> {
  const { data } = await api.post(`/stock/${id}/consumo`, payload);
  return mapStockItem(data);
}
