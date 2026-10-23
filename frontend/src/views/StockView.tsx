import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Edit3,
  History,
  Minus,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { User } from "../types";
import {
  addConsumo,
  addEntrada,
  createStockItem,
  getStock,
  getStockMovements,
  updateStockItem,
  type StockItem,
  type StockMovement,
} from "../lib/stock";

interface StockViewProps {
  user: User;
  onNewItem?: () => void;
  onAddStock?: (item: string) => void;
}

type StockFilter = "all" | "low" | "expiring";
type ReagentItem = StockItem;

type ItemFormState = {
  name: string;
  category: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  lot: string;
  expiryDate: string;
  location: string;
  supplier: string;
  notes: string;
};

const emptyForm: ItemFormState = {
  name: "",
  category: "",
  unit: "",
  quantity: "",
  minQuantity: "",
  lot: "",
  expiryDate: "",
  location: "",
  supplier: "",
  notes: "",
};

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function isPastDate(date: string) {
  if (!date) return false;
  return date < getTodayInputDate();
}

function normalizeIntegerInput(value: string, min = 0, max?: number) {
  if (value === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  const rounded = Math.floor(parsed);
  const limited = Math.max(
    min,
    max !== undefined ? Math.min(rounded, max) : rounded,
  );
  return String(limited);
}
function daysUntil(date: string) {
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}
function isExpiringSoon(date: string) {
  const days = daysUntil(date);
  return days >= 0 && days <= 30;
}
function isExpired(date: string) {
  return daysUntil(date) < 0;
}
function isLowStock(item: ReagentItem) {
  return item.quantity <= item.minQuantity;
}
function formatDate(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-PT");
}
function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-PT");
}

function formFromItem(item: ReagentItem): ItemFormState {
  return {
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: String(item.quantity),
    minQuantity: String(item.minQuantity),
    lot: item.lot,
    expiryDate: item.expiryDate,
    location: item.location,
    supplier: item.supplier,
    notes: item.notes,
  };
}

export function StockView({ user }: StockViewProps) {
  const [items, setItems] = useState<ReagentItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReagentItem | null>(null);
  const [editingItem, setEditingItem] = useState<ReagentItem | null>(null);
  const [historyItem, setHistoryItem] = useState<ReagentItem | null>(null);
  const [historyMovements, setHistoryMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [quantityDelta, setQuantityDelta] = useState("");
  const [consumptionDelta, setConsumptionDelta] = useState("");
  const [form, setForm] = useState<ItemFormState>(emptyForm);

  const canManage = ["ADMIN", "TECNICO"].includes(user.role);

  const refreshStock = async () => {
    const data = await getStock();
    setItems(data);
  };

  useEffect(() => {
    refreshStock().catch(() => setItems([]));
  }, []);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.lot.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "low" && isLowStock(item)) ||
        (filter === "expiring" && isExpiringSoon(item.expiryDate));
      return matchesSearch && matchesFilter;
    });
  }, [filter, items, search]);

  const totalItems = items.length;
  const lowStockItems = items.filter(isLowStock).length;
  const expiringItems = items.filter((item) =>
    isExpiringSoon(item.expiryDate),
  ).length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const resetForm = () => setForm(emptyForm);

  const validateForm = (mode: "create" | "edit") => {
    if (
      !form.name ||
      !form.category ||
      !form.unit ||
      !form.quantity ||
      !form.minQuantity ||
      !form.expiryDate ||
      !form.location
    ) {
      return false;
    }

    if (mode === "create" && isPastDate(form.expiryDate)) {
      return false;
    }

    return true;
  };

  const handleCreateItem = async () => {
    if (!validateForm("create")) return;
    await createStockItem({
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantity: Math.floor(Number(form.quantity)),
      minQuantity: Math.floor(Number(form.minQuantity)),
      lot: form.lot,
      expiryDate: form.expiryDate,
      location: form.location,
      supplier: form.supplier,
      notes: form.notes,
    });
    await refreshStock();
    setShowNewModal(false);
    resetForm();
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !validateForm("edit")) return;
    await updateStockItem(editingItem.id, {
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantity: Math.floor(Number(form.quantity)),
      minQuantity: Math.floor(Number(form.minQuantity)),
      lot: form.lot,
      expiryDate: form.expiryDate,
      location: form.location,
      supplier: form.supplier,
      notes: form.notes,
    });
    await refreshStock();
    setEditingItem(null);
    resetForm();
  };

  const handleOpenEdit = (item: ReagentItem) => {
    setEditingItem(item);
    setForm(formFromItem(item));
  };

  const handleOpenHistory = async (item: ReagentItem) => {
    setHistoryItem(item);
    setHistoryMovements(item.movements ?? []);
    try {
      setHistoryLoading(true);
      const data = await getStockMovements(item.id);
      setHistoryMovements(data);
    } catch {
      setHistoryMovements(item.movements ?? []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedItem || !quantityDelta) return;
    const amount = Math.floor(Number(quantityDelta));
    if (!Number.isFinite(amount) || amount <= 0) return;
    await addEntrada(selectedItem.id, {
      quantidade: amount,
      motivo: "Reposição de stock",
    });
    await refreshStock();
    setSelectedItem(null);
    setQuantityDelta("");
  };

  const handleConsumeStock = async () => {
    if (!selectedItem || !consumptionDelta) return;
    const amount = Math.floor(Number(consumptionDelta));
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (amount > selectedItem.quantity) return;
    await addConsumo(selectedItem.id, {
      quantidade: amount,
      motivo: "Consumo manual de stock",
    });
    await refreshStock();
    setSelectedItem(null);
    setConsumptionDelta("");
  };

  const getStatusInfo = (item: ReagentItem) => {
    if (isLowStock(item)) {
      return {
        label: "Stock baixo",
        dotClass: "bg-red-500",
        badgeClass: "bg-red-50 text-red-700 border border-red-200",
      };
    }

    if (isExpired(item.expiryDate)) {
      return {
        label: "Expirado",
        dotClass: "bg-red-500",
        badgeClass: "bg-red-50 text-red-700 border border-red-200",
      };
    }

    if (isExpiringSoon(item.expiryDate)) {
      return {
        label: "Validade próxima",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    }

    return {
      label: "OK",
      dotClass: "bg-green-500",
      badgeClass: "bg-green-50 text-green-700 border border-green-200",
    };
  };

  const renderStatusBadge = (item: ReagentItem) => {
    const status = getStatusInfo(item);

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${status.badgeClass}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
        {status.label}
      </span>
    );
  };

  const renderItemForm = (mode: "create" | "edit") => (
    <div className="bg-white rounded-2xl w-full max-w-2xl border border-[#E7E5E4] shadow-xl p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          {mode === "create" ? "Novo reagente" : "Editar reagente"}
        </h2>
        <p className="text-sm text-[#78716C] mt-1">
          {mode === "create"
            ? "Regista um novo item de stock para uso laboratorial."
            : "Atualiza os dados do item de stock selecionado."}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["name", "Nome"],
            ["category", "Categoria"],
            ["unit", "Unidade"],
            [
              "quantity",
              mode === "create" ? "Quantidade inicial" : "Quantidade atual",
            ],
            ["minQuantity", "Quantidade mínima"],
            ["lot", "Lote"],
            ["expiryDate", "Validade"],
            ["location", "Localização"],
            ["supplier", "Fornecedor"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="space-y-1 text-sm text-[#44403C]">
            <span>{label}</span>
            <input
              type={
                field === "expiryDate"
                  ? "date"
                  : field === "quantity" || field === "minQuantity"
                    ? "number"
                    : "text"
              }
              min={
                field === "expiryDate" && mode === "create"
                  ? getTodayInputDate()
                  : field === "quantity" || field === "minQuantity"
                    ? "0"
                    : undefined
              }
              step={
                field === "quantity" || field === "minQuantity"
                  ? "1"
                  : undefined
              }
              value={form[field]}
              onChange={(e) => {
                const value =
                  field === "quantity" || field === "minQuantity"
                    ? normalizeIntegerInput(e.target.value, 0)
                    : e.target.value;
                setForm((current) => ({ ...current, [field]: value }));
              }}
              className="w-full px-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1]"
            />
          </label>
        ))}
      </div>
      {mode === "create" && isPastDate(form.expiryDate) && (
        <p className="text-sm text-red-600">
          A validade não pode ser anterior à data atual.
        </p>
      )}
      <label className="space-y-1 text-sm text-[#44403C] block">
        <span>Notas</span>
        <textarea
          value={form.notes}
          onChange={(e) =>
            setForm((current) => ({ ...current, notes: e.target.value }))
          }
          rows={3}
          className="w-full px-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1] resize-none"
        />
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setShowNewModal(false);
            setEditingItem(null);
            resetForm();
          }}
          className="px-4 py-2 border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={mode === "create" ? handleCreateItem : handleUpdateItem}
          className="px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors"
        >
          Guardar item
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Reagentes</h1>
          <p className="text-sm text-[#78716C] mt-1">
            Gestão operacional de reagentes para o técnico de laboratório.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setShowNewModal(true);
            }}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
            type="button"
          >
            <Plus size={18} />
            Novo Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-sm text-[#78716C]">Itens registados</p>
          <p className="text-2xl font-bold mt-2">{totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-sm text-[#78716C]">Unidades em stock</p>
          <p className="text-2xl font-bold mt-2">{totalUnits}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-sm text-[#78716C]">Stock baixo</p>
          <p className="text-2xl font-bold mt-2">{lowStockItems}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-sm text-[#78716C]">Validade próxima</p>
          <p className="text-2xl font-bold mt-2">{expiringItems}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome, lote, categoria ou localização"
              className="w-full pl-9 pr-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "low", label: "Stock baixo" },
                { id: "expiring", label: "Validade próxima" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${filter === option.id ? "bg-[#5A5A40] text-white border-[#5A5A40]" : "bg-white text-[#44403C] border-[#E7E5E4] hover:bg-[#F5F5F4]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="border border-[#E7E5E4] rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-[#1C1917]">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[#78716C]">
                    {item.category} • lote {item.lot || "—"}
                  </p>
                </div>
                {renderStatusBadge(item)}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#FAFAF9] rounded-xl p-3">
                  <p className="text-[#78716C]">Quantidade</p>
                  <p className="font-semibold mt-1">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="bg-[#FAFAF9] rounded-xl p-3">
                  <p className="text-[#78716C]">Mínimo</p>
                  <p className="font-semibold mt-1">
                    {item.minQuantity} {item.unit}
                  </p>
                </div>
                <div className="bg-[#FAFAF9] rounded-xl p-3">
                  <p className="text-[#78716C]">Validade</p>
                  <p className="font-semibold mt-1">
                    {formatDate(item.expiryDate)}
                  </p>
                </div>
                <div className="bg-[#FAFAF9] rounded-xl p-3">
                  <p className="text-[#78716C]">Localização</p>
                  <p className="font-semibold mt-1">{item.location || "—"}</p>
                </div>
              </div>
              <div className="text-sm text-[#57534E] space-y-1">
                <p>
                  <span className="font-medium">Fornecedor:</span>{" "}
                  {item.supplier || "—"}
                </p>
                <p>
                  <span className="font-medium">Notas:</span>{" "}
                  {item.notes || "Sem notas"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setConsumptionDelta("");
                        setQuantityDelta("");
                      }}
                      className="px-3 py-2 rounded-lg bg-[#5A5A40] text-white text-sm flex items-center gap-2 hover:bg-[#4A4A35] transition-colors"
                    >
                      <Plus size={14} />
                      Repor stock
                    </button>
                    <button
                      type="button"
                      disabled={item.quantity <= 0}
                      onClick={() => {
                        setSelectedItem(item);
                        setQuantityDelta("");
                        setConsumptionDelta(String(Math.min(1, item.quantity)));
                      }}
                      className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus size={14} />
                      Registar consumo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenHistory(item)}
                  className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors"
                >
                  <History size={14} />
                  Histórico
                </button>
              </div>
              {(isLowStock(item) ||
                isExpiringSoon(item.expiryDate) ||
                isExpired(item.expiryDate)) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 space-y-2">
                  {isLowStock(item) && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Este reagente está em stock baixo.
                    </div>
                  )}
                  {isExpired(item.expiryDate) && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} />A validade deste reagente já
                      expirou.
                    </div>
                  )}
                  {!isExpired(item.expiryDate) &&
                    isExpiringSoon(item.expiryDate) && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Este reagente tem validade próxima.
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>

        {visibleItems.length === 0 && (
          <div className="border border-dashed border-[#D6D3D1] rounded-2xl p-10 text-center text-[#78716C]">
            Nenhum reagente encontrado para os filtros atuais.
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          {renderItemForm("create")}
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          {renderItemForm("edit")}
        </div>
      )}

      {selectedItem && !consumptionDelta && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#E7E5E4] shadow-xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">Repor stock</h2>
              <p className="text-sm text-[#78716C] mt-1">
                Adicionar unidades a {selectedItem.name}.
              </p>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={quantityDelta}
              onChange={(e) =>
                setQuantityDelta(normalizeIntegerInput(e.target.value, 1))
              }
              placeholder="Quantidade a adicionar"
              className="w-full px-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setQuantityDelta("");
                }}
                className="px-4 py-2 border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddStock}
                className="px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && consumptionDelta && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#E7E5E4] shadow-xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">Registar consumo</h2>
              <p className="text-sm text-[#78716C] mt-1">
                Deduzir unidades de {selectedItem.name}.
              </p>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              max={Math.floor(selectedItem.quantity)}
              value={consumptionDelta}
              onChange={(e) =>
                setConsumptionDelta(
                  normalizeIntegerInput(
                    e.target.value,
                    1,
                    Math.floor(selectedItem.quantity),
                  ),
                )
              }
              placeholder="Quantidade consumida"
              className="w-full px-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1]"
            />
            <p className="text-xs text-[#78716C]">
              Disponível: {selectedItem.quantity} {selectedItem.unit}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setConsumptionDelta("");
                }}
                className="px-4 py-2 border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Number(consumptionDelta) > selectedItem.quantity}
                onClick={handleConsumeStock}
                className="px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-[#E7E5E4] shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={18} />
                  Histórico de movimentos
                </h2>
                <p className="text-sm text-[#78716C] mt-1">
                  {historyItem.name} · stock atual: {historyItem.quantity}{" "}
                  {historyItem.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryItem(null);
                  setHistoryMovements([]);
                }}
                className="px-3 py-2 border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4] transition-colors"
              >
                Fechar
              </button>
            </div>
            {historyLoading && (
              <p className="text-sm text-[#78716C]">A carregar histórico...</p>
            )}
            {!historyLoading && historyMovements.length === 0 && (
              <p className="text-sm text-[#78716C]">
                Ainda não existem movimentos para este item.
              </p>
            )}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {historyMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="rounded-xl border border-[#E7E5E4] p-3 text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-[#1C1917]">
                      {movement.tipo === "ENTRADA" ? "Entrada" : "Consumo"} de{" "}
                      {movement.quantidade} {historyItem.unit}
                    </p>
                    <p className="text-[#78716C]">
                      {movement.motivo || "Sem motivo registado"}
                    </p>
                    {movement.exameId && (
                      <p className="text-xs text-[#78716C] mt-1">
                        Associado ao exame #{movement.exameId}
                      </p>
                    )}
                    {movement.registadoPor && (
                      <p className="text-xs text-[#78716C] mt-1">
                        Registado por{" "}
                        {movement.registadoPor.nome ||
                          movement.registadoPor.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[#78716C] whitespace-nowrap">
                    {formatDateTime(movement.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
