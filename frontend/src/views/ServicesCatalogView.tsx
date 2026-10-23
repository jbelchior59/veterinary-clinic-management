import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import {
  createServico,
  getServicosCatalogo,
  toggleServico,
  updateServico,
  type ServicoCatalogo,
} from '../lib/rececao';
import { cn } from '../lib/utils';

type Msg = { text: string; type: 'success' | 'error' } | null;

type ServicoForm = {
  nome: string;
  categoria: string;
  preco: string;
  descricao: string;
};

const emptyServicoForm: ServicoForm = {
  nome: '',
  categoria: '',
  preco: '',
  descricao: '',
};

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 text-sm flex items-center gap-2',
        msg.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg.text}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function ServicesCatalogView() {
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [servicoForm, setServicoForm] = useState<ServicoForm>(emptyServicoForm);
  const [editingServico, setEditingServico] = useState<ServicoCatalogo | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    void loadServicos();
  }, []);

  const sortedServicos = useMemo(
    () =>
      [...servicos].sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
        return `${a.categoria}${a.nome}`.localeCompare(`${b.categoria}${b.nome}`);
      }),
    [servicos],
  );

  function feedback(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    window.setTimeout(() => setMsg(null), 3500);
  }

  async function loadServicos() {
    setLoading(true);
    try {
      setServicos(await getServicosCatalogo());
    } catch {
      feedback('Não foi possível carregar o catálogo de serviços.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function startEditServico(servico: ServicoCatalogo) {
    setEditingServico(servico);
    setServicoForm({
      nome: servico.nome,
      categoria: servico.categoria,
      preco: String(servico.preco),
      descricao: servico.descricao ?? '',
    });
  }

  function resetServicoForm() {
    setEditingServico(null);
    setServicoForm(emptyServicoForm);
  }

  async function handleServicoSubmit(e: React.FormEvent) {
    e.preventDefault();

    const preco = Number(servicoForm.preco);
    if (!servicoForm.nome.trim() || !servicoForm.categoria.trim()) {
      feedback('Nome e categoria são obrigatórios.', 'error');
      return;
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      feedback('O preço tem de ser válido.', 'error');
      return;
    }

    const payload = {
      nome: servicoForm.nome.trim(),
      categoria: servicoForm.categoria.trim(),
      preco,
      descricao: servicoForm.descricao.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingServico) {
        const updated = await updateServico(editingServico.id, payload);
        setServicos((current) =>
          current.map((servico) => (servico.id === updated.id ? updated : servico)),
        );
        feedback('Serviço atualizado com sucesso.');
      } else {
        const created = await createServico(payload);
        setServicos((current) => [created, ...current]);
        feedback('Serviço criado com sucesso.');
      }
      resetServicoForm();
    } catch {
      feedback('Não foi possível guardar o serviço.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleServico(servico: ServicoCatalogo) {
    setTogglingId(servico.id);
    try {
      const updated = await toggleServico(servico.id);
      setServicos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      feedback(
        updated.ativo ? 'Serviço ativado com sucesso.' : 'Serviço desativado com sucesso.',
      );
    } catch {
      feedback('Não foi possível alterar o estado do serviço.', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Serviços</h1>
          <p className="text-[#78716C] mt-1">
            Serviços usados pela receção na criação de faturas detalhadas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadServicos()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E7E5E4] font-bold text-sm hover:bg-[#F5F5F4] transition-colors w-fit"
        >
          <RefreshCw size={17} className={cn(loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6 space-y-5">
        <Feedback msg={msg} />

        <form
          onSubmit={(e) => void handleServicoSubmit(e)}
          className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_140px_1fr_auto] gap-3 items-end"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#57534E]">Nome</label>
            <input
              value={servicoForm.nome}
              onChange={(e) => setServicoForm((current) => ({ ...current, nome: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              placeholder="Consulta Geral"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#57534E]">Categoria</label>
            <input
              value={servicoForm.categoria}
              onChange={(e) => setServicoForm((current) => ({ ...current, categoria: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              placeholder="Consulta"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#57534E]">Preço</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={servicoForm.preco}
              onChange={(e) => setServicoForm((current) => ({ ...current, preco: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              placeholder="45.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#57534E]">Descrição</label>
            <input
              value={servicoForm.descricao}
              onChange={(e) => setServicoForm((current) => ({ ...current, descricao: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-2">
            {editingServico && (
              <button
                type="button"
                onClick={resetServicoForm}
                className="p-2.5 rounded-xl border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] transition-colors"
                title="Cancelar edição"
              >
                <X size={18} />
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5A5A40] text-white font-bold text-sm hover:bg-[#4A4A35] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {editingServico ? <Save size={17} /> : <Plus size={17} />}
              {saving ? 'A guardar...' : editingServico ? 'Guardar' : 'Criar'}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-[#E7E5E4]">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <th className="p-4 font-semibold text-sm text-[#57534E]">Serviço</th>
                <th className="p-4 font-semibold text-sm text-[#57534E]">Categoria</th>
                <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Preço</th>
                <th className="p-4 font-semibold text-sm text-[#57534E]">Estado</th>
                <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#78716C]">
                    A carregar serviços...
                  </td>
                </tr>
              ) : sortedServicos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#78716C]">
                    Nenhum serviço registado.
                  </td>
                </tr>
              ) : (
                sortedServicos.map((servico) => (
                  <tr key={servico.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="p-4">
                      <p className="font-bold">{servico.nome}</p>
                      {servico.descricao && (
                        <p className="text-xs text-[#78716C]">{servico.descricao}</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-[#57534E]">{servico.categoria}</td>
                    <td className="p-4 text-right font-bold">{formatCurrency(Number(servico.preco))}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
                          servico.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                        )}
                      >
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditServico(servico)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-[#A8A29E] hover:text-blue-600 transition-colors"
                          title="Editar serviço"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleServico(servico)}
                          disabled={togglingId === servico.id}
                          className={cn(
                            'p-2 rounded-lg transition-colors disabled:opacity-50',
                            servico.ativo
                              ? 'text-[#A8A29E] hover:bg-red-50 hover:text-red-600'
                              : 'text-[#A8A29E] hover:bg-green-50 hover:text-green-600',
                          )}
                          title={servico.ativo ? 'Desativar serviço' : 'Ativar serviço'}
                        >
                          {servico.ativo ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
