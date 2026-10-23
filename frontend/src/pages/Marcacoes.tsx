import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  PawPrint,
  Plus,
  RefreshCw,
  AlertTriangle,
  X,
  Edit3,
  UserCheck,
  StickyNote,
  Trash2,
} from 'lucide-react';
import {
  cancelarMarcacao,
  confirmarMarcacao,
  updateMarcacao,
  createMarcacao,
  formatAxiosError,
  formatarDataMarcacao,
  getMarcacoesAtivas,
  getHistoricoMarcacoes,
  type Marcacao,
} from '../lib/marcacoes';
import { getAnimais, type Animal } from '../lib/animais';
import { getNotasByAnimal, createNota, deleteNota, type NotaRapida } from '../lib/notas';
import { cn } from '../lib/utils';
import { getSocket } from '../lib/socket';

const MOTIVOS = [
  'Consulta de Rotina',
  'Vacinação',
  'Desparasitação',
  'Cirurgia',
  'Urgência / Emergência',
  'Seguimento Pós-Cirúrgico',
  'Reavaliação Clínica',
  'Colheita de Amostras',
  'Controlo de Tratamento',
  'Consulta de Nutrição',
  'Consulta Dermatológica',
  'Consulta Oftalmológica',
  'Consulta Odontológica',
  'Internamento',
  'Outro',
];

type Tab = 'ativas' | 'historico';

function estadoBadgeClass(estado: string) {
  if (estado === 'AGENDADA') return 'bg-green-100 text-green-700';
  if (estado === 'CONFIRMADA') return 'bg-blue-100 text-blue-700';
  if (estado === 'CANCELADA') return 'bg-red-100 text-red-700';
  return 'bg-stone-100 text-stone-700';
}

function estadoLabel(estado: string) {
  if (estado === 'AGENDADA') return 'Agendada';
  if (estado === 'CONFIRMADA') return 'Confirmada';
  if (estado === 'CANCELADA') return 'Cancelada';
  if (estado === 'CONCLUIDA') return 'Concluída';
  return estado;
}

export default function Marcacoes() {
  const [tab, setTab] = useState<Tab>('ativas');
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([]);
  const [historico, setHistorico] = useState<Marcacao[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnimais, setLoadingAnimais] = useState(true);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Nova marcação
  const [animalId, setAnimalId] = useState('');
  const [data, setData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const motivoFinal = motivo === 'Outro' ? motivoOutro.trim() : motivo;
  const canSubmit = animalId !== '' && data !== '' && motivoFinal.length > 0 && !submitting;

  // Editar marcação
  const [editingMarcacao, setEditingMarcacao] = useState<Marcacao | null>(null);
  const [editData, setEditData] = useState('');
  const [editMotivo, setEditMotivo] = useState('');
  const [editMotivoOutro, setEditMotivoOutro] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Notas rápidas
  const [notasAnimalId, setNotasAnimalId] = useState<number | null>(null);
  const [notas, setNotas] = useState<NotaRapida[]>([]);
  const [novaNota, setNovaNota] = useState('');
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasAnimalNome, setNotasAnimalNome] = useState('');

  async function loadMarcacoes() {
    setLoading(true);
    setError(null);
    try {
      const [ativas, hist] = await Promise.all([getMarcacoesAtivas(), getHistoricoMarcacoes()]);
      setMarcacoes(ativas);
      setHistorico(hist);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarcacoes();
    setLoadingAnimais(true);
    getAnimais()
      .then(setAnimais)
      .catch(() => {})
      .finally(() => setLoadingAnimais(false));

    // Sincronização em tempo real: recarrega quando outro utilizador
    // cria ou altera uma marcação
    const socket = getSocket();
    const handleSync = () => { void loadMarcacoes(); };
    socket.on('marcacao_criada', handleSync);
    socket.on('marcacao_atualizada', handleSync);

    return () => {
      socket.off('marcacao_criada', handleSync);
      socket.off('marcacao_atualizada', handleSync);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!animalId || !data || !motivoFinal) {
      setError('Preenche todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      await createMarcacao({ animalId: Number(animalId), data: new Date(data).toISOString(), motivo: motivoFinal });
      setSuccess('Marcação criada com sucesso.');
      setAnimalId(''); setData(''); setMotivo(''); setMotivoOutro('');
      await loadMarcacoes();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelar(id: number) {
    if (!window.confirm('Cancelar esta marcação?')) return;
    setError(null); setSuccess(null);
    setCancelingId(id);
    try {
      await cancelarMarcacao(id);
      setSuccess('Marcação cancelada.');
      await loadMarcacoes();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setCancelingId(null);
    }
  }

  async function confirmar(id: number) {
    setError(null); setSuccess(null);
    setConfirmingId(id);
    try {
      await confirmarMarcacao(id);
      setSuccess('Presença confirmada — paciente em espera.');
      await loadMarcacoes();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setConfirmingId(null);
    }
  }

  function abrirEdicao(m: Marcacao) {
    setEditingMarcacao(m);
    const d = new Date(m.data);
    // format as datetime-local: "YYYY-MM-DDTHH:MM"
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditData(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    const motivoExistente = MOTIVOS.includes(m.motivo ?? '') ? (m.motivo ?? '') : 'Outro';
    setEditMotivo(motivoExistente);
    setEditMotivoOutro(motivoExistente === 'Outro' ? (m.motivo ?? '') : '');
  }

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMarcacao) return;
    const mFinal = editMotivo === 'Outro' ? editMotivoOutro.trim() : editMotivo;
    setEditSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await updateMarcacao(editingMarcacao.id, {
        data: new Date(editData).toISOString(),
        motivo: mFinal,
      });
      setSuccess('Marcação editada com sucesso.');
      setEditingMarcacao(null);
      await loadMarcacoes();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function abrirNotas(m: Marcacao) {
    setNotasAnimalId(m.animalId);
    setNotasAnimalNome(m.animal.nome);
    setNotasLoading(true);
    try {
      const n = await getNotasByAnimal(m.animalId);
      setNotas(n);
    } catch {}
    finally { setNotasLoading(false); }
  }

  async function adicionarNota(e: React.FormEvent) {
    e.preventDefault();
    if (!notasAnimalId || !novaNota.trim()) return;
    try {
      const nota = await createNota({ texto: novaNota.trim(), animalId: notasAnimalId });
      setNotas((prev) => [nota, ...prev]);
      setNovaNota('');
    } catch {}
  }

  async function removerNota(id: number) {
    try {
      await deleteNota(id);
      setNotas((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  }

  const lista = tab === 'ativas' ? marcacoes : historico;

  return (
    <div className="min-h-screen bg-[#F5F5F4] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E7E5E4] text-[#78716C] text-xs font-bold uppercase tracking-widest mb-3">
              <Calendar size={14} className="text-[#5A5A40]" /> Agenda Clínica
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Marcações</h1>
            <p className="text-[#78716C] mt-1">Gestão de marcações clínicas e agenda.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => void loadMarcacoes()} disabled={loading}
              className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
            <Link to="/" className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors">
              <ArrowLeft size={16} /> Voltar
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* Lista */}
          <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#E7E5E4] flex items-center justify-between gap-4">
              <h2 className="font-bold text-lg">Lista de Marcações</h2>
              <div className="flex gap-1 bg-[#F5F5F4] rounded-xl p-1">
                {(['ativas', 'historico'] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
                      tab === t ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#57534E] hover:text-[#1C1917]')}>
                    {t === 'ativas' ? `Ativas (${marcacoes.length})` : `Histórico (${historico.length})`}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#78716C]">A carregar marcações...</div>
            ) : lista.length === 0 ? (
              <div className="p-10 text-center">
                <Calendar size={40} className="text-[#D6D3D1] mx-auto mb-3" />
                <p className="text-[#78716C] text-sm">
                  {tab === 'ativas' ? 'Sem marcações ativas de momento.' : 'Sem histórico de marcações.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E7E5E4]">
                {lista.map((m) => (
                  <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-[#FAFAF9] transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40] shrink-0">
                        <PawPrint size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#1C1917]">{m.animal.nome}</span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase', estadoBadgeClass(m.estado))}>
                            {estadoLabel(m.estado)}
                          </span>
                        </div>
                        <p className="text-sm text-[#78716C] mt-0.5">Dono: {m.animal.dono.nome}</p>
                        <p className="text-sm text-[#57534E] mt-0.5">{m.motivo}</p>
                        <p className="text-xs text-[#A8A29E] mt-1 flex items-center gap-1">
                          <Clock size={12} /> {formatarDataMarcacao(m.data)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap shrink-0">
                      {/* Check-in */}
                      {m.estado === 'AGENDADA' && (
                        <button onClick={() => void confirmar(m.id)} disabled={confirmingId === m.id}
                          className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1">
                          <UserCheck size={14} />
                          {confirmingId === m.id ? '...' : 'Check-in'}
                        </button>
                      )}
                      {/* Editar */}
                      {m.estado === 'AGENDADA' && (
                        <button onClick={() => abrirEdicao(m)}
                          className="px-3 py-2 bg-white border border-[#E7E5E4] text-[#57534E] rounded-lg text-sm font-bold hover:bg-[#F5F5F4] transition-colors flex items-center gap-1">
                          <Edit3 size={14} /> Editar
                        </button>
                      )}
                      {/* Notas */}
                      <button onClick={() => void abrirNotas(m)}
                        className="px-3 py-2 bg-white border border-[#E7E5E4] text-[#57534E] rounded-lg text-sm font-bold hover:bg-[#F5F5F4] transition-colors flex items-center gap-1">
                        <StickyNote size={14} /> Notas
                      </button>
                      {/* Cancelar */}
                      {['AGENDADA', 'CONFIRMADA'].includes(m.estado) && (
                        <button onClick={() => void cancelar(m.id)} disabled={cancelingId === m.id}
                          className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1">
                          <X size={14} />
                          {cancelingId === m.id ? 'A cancelar...' : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário Nova Marcação */}
          <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40]">
                <Plus size={18} />
              </div>
              <div>
                <h2 className="font-bold text-[#1C1917]">Nova Marcação</h2>
                <p className="text-xs text-[#78716C]">Preenche os dados da nova marcação.</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#57534E]">Animal *</label>
                <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} disabled={loadingAnimais}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20">
                  <option value="">{loadingAnimais ? 'A carregar animais...' : 'Seleciona um animal'}</option>
                  {animais.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.dono?.nome ?? '?'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#57534E]">Data e Hora *</label>
                <input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#57534E]">Motivo *</label>
                <select value={motivo} onChange={(e) => { setMotivo(e.target.value); setMotivoOutro(''); }}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20">
                  <option value="" disabled>Seleciona o motivo</option>
                  {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {motivo === 'Outro' && (
                  <input type="text" value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)}
                    placeholder="Especifica o motivo"
                    className="w-full mt-2 bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20" />
                )}
              </div>

              <button type="submit" disabled={!canSubmit}
                className="w-full px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus size={16} />
                {submitting ? 'A criar...' : 'Criar Marcação'}
              </button>
            </form>

            <div className="pt-2 border-t border-[#E7E5E4]">
              <p className="text-xs text-[#A8A29E]">
                Fluxo:{' '}
                <Link to="/donos" className="text-[#5A5A40] font-bold hover:underline">Dono</Link>
                {' → '}
                <Link to="/animais" className="text-[#5A5A40] font-bold hover:underline">Animal</Link>
                {' → '}Marcação
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {editingMarcacao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Editar Marcação</h3>
              <button onClick={() => setEditingMarcacao(null)} className="p-2 hover:bg-[#F5F5F4] rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#78716C]">
              Animal: <strong>{editingMarcacao.animal.nome}</strong>
            </p>
            <form onSubmit={onEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#57534E]">Nova Data e Hora</label>
                <input type="datetime-local" value={editData} onChange={(e) => setEditData(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#57534E]">Motivo</label>
                <select value={editMotivo} onChange={(e) => { setEditMotivo(e.target.value); setEditMotivoOutro(''); }}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20">
                  {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {editMotivo === 'Outro' && (
                  <input type="text" value={editMotivoOutro} onChange={(e) => setEditMotivoOutro(e.target.value)}
                    placeholder="Especifica o motivo"
                    className="w-full mt-2 bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20" />
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingMarcacao(null)}
                  className="flex-1 px-4 py-2 border border-[#E7E5E4] text-[#57534E] rounded-xl font-bold hover:bg-[#F5F5F4] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={editSubmitting}
                  className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50">
                  {editSubmitting ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Notas Rápidas */}
      {notasAnimalId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg">Notas Rápidas</h3>
                <p className="text-sm text-[#78716C]">{notasAnimalNome}</p>
              </div>
              <button onClick={() => setNotasAnimalId(null)} className="p-2 hover:bg-[#F5F5F4] rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={adicionarNota} className="flex gap-2 shrink-0">
              <input type="text" value={novaNota} onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Ex: Ligar para confirmar às 14h..."
                className="flex-1 bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20" />
              <button type="submit" disabled={!novaNota.trim()}
                className="px-4 py-2 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50">
                <Plus size={16} />
              </button>
            </form>

            <div className="overflow-y-auto flex-1 space-y-2">
              {notasLoading ? (
                <p className="text-sm text-[#78716C] text-center py-4">A carregar notas...</p>
              ) : notas.length === 0 ? (
                <div className="text-center py-6">
                  <StickyNote size={32} className="text-[#D6D3D1] mx-auto mb-2" />
                  <p className="text-sm text-[#A8A29E]">Sem notas para este paciente.</p>
                </div>
              ) : (
                notas.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-3 p-3 bg-[#FAFAF9] rounded-xl border border-[#E7E5E4]">
                    <div className="min-w-0">
                      <p className="text-sm text-[#1C1917]">{n.texto}</p>
                      <p className="text-xs text-[#A8A29E] mt-1">
                        {n.autor?.nome ?? n.autor?.email ?? 'Rececionista'} · {new Date(n.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => void removerNota(n.id)} className="p-1.5 hover:bg-red-50 text-[#A8A29E] hover:text-red-600 rounded-lg transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
