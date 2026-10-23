import { useEffect, useMemo, useState } from 'react';
import { User, Pet } from '../types';
import {
  Plus,
  Bed,
  RefreshCw,
  ClipboardList,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  User as UserIcon,
} from 'lucide-react';
import {
  addObservacaoInternamento,
  createInternamento,
  darAltaInternamento,
  formatAxiosError,
  getInternamentos,
  type Internamento,
} from '../lib/internamentos';

interface InPatientViewProps {
  user: User;
  patients: Pet[];
  onNewInPatient?: () => void;
  onMonitor?: (id: string) => void;
  onDischarge?: (id: string) => void;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toDateTimeLocalValue(date = new Date()) {
  const dt = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return dt.toISOString().slice(0, 16);
}

const MOTIVOS_INTERNAMENTO = [
  'Pós-cirúrgico',
  'Fluidoterapia',
  'Observação',
  'Crise aguda',
  'Monitorização pós-anestésica',
  'Ferida / Trauma',
  'Doença infeciosa',
  'Insuficiência orgânica',
  'Outro',
];

function estadoClass(estado: string) {
  return estado === 'ALTA'
    ? 'bg-green-100 text-green-700'
    : 'bg-orange-100 text-orange-700';
}

export function InPatientView({ user, patients }: InPatientViewProps) {
  const [internamentos, setInternamentos] = useState<Internamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    animalId: '',
    dataEntrada: toDateTimeLocalValue(),
    motivo: '',
    observacoes: '',
  });

  const [selected, setSelected] = useState<Internamento | null>(null);
  const [monitorFormOpen, setMonitorFormOpen] = useState(false);
  const [monitorSubmitting, setMonitorSubmitting] = useState(false);
  const [monitorForm, setMonitorForm] = useState({
    data: toDateTimeLocalValue(),
    sinaisVitais: '',
    alimentacao: '',
    medicacao: '',
    observacoes: '',
  });

  const [altaOpen, setAltaOpen] = useState(false);
  const [altaSubmitting, setAltaSubmitting] = useState(false);
  const [altaForm, setAltaForm] = useState({
    dataAlta: toDateTimeLocalValue(),
    observacoesAlta: '',
  });

  const canManage = user.role === 'VETERINARIO' || user.role === 'ADMIN';

  async function loadInternamentos() {
    setLoading(true);
    setError(null);

    try {
      const data = await getInternamentos();
      setInternamentos(data);
    } catch (e) {
      setInternamentos([]);
      setError(formatAxiosError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInternamentos();
  }, []);

  const ativos = useMemo(
    () => internamentos.filter((i) => i.estado !== 'ALTA'),
    [internamentos],
  );

  const altas = useMemo(
    () => internamentos.filter((i) => i.estado === 'ALTA'),
    [internamentos],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.animalId || !form.motivo) {
      setError('Escolhe um animal e seleciona o motivo do internamento.');
      return;
    }

    if (!form.observacoes.trim()) {
      setError('As observações iniciais são obrigatórias.');
      return;
    }

    setSubmitting(true);

    try {
      await createInternamento({
        animalId: Number(form.animalId),
        motivo: form.motivo,
        observacoes: form.observacoes.trim(),
        dataEntrada: form.dataEntrada ? new Date(form.dataEntrada).toISOString() : undefined,
      });

      setSuccess('Internamento criado com sucesso.');
      setForm({
        animalId: '',
        dataEntrada: toDateTimeLocalValue(),
        motivo: '',
        observacoes: '',
      });
      setFormOpen(false);
      await loadInternamentos();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function openDetails(internamento: Internamento) {
    setSelected(internamento);
    setMonitorFormOpen(false);
    setAltaOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleAddMonitorizacao(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setError(null);
    setSuccess(null);

    if (!monitorForm.sinaisVitais.trim()) {
      setError('Os sinais vitais são obrigatórios.');
      return;
    }

    if (!monitorForm.observacoes.trim()) {
      setError('As observações de monitorização são obrigatórias.');
      return;
    }

    setMonitorSubmitting(true);

    try {
      await addObservacaoInternamento(selected.id, {
        data: monitorForm.data ? new Date(monitorForm.data).toISOString() : undefined,
        sinaisVitais: monitorForm.sinaisVitais.trim(),
        alimentacao: monitorForm.alimentacao.trim() || undefined,
        medicacao: monitorForm.medicacao.trim() || undefined,
        observacoes: monitorForm.observacoes.trim(),
      });

      setSuccess('Monitorização registada com sucesso.');
      setMonitorForm({
        data: toDateTimeLocalValue(),
        sinaisVitais: '',
        alimentacao: '',
        medicacao: '',
        observacoes: '',
      });
      setMonitorFormOpen(false);
      const refreshed = await getInternamentos();
      setInternamentos(refreshed);
      setSelected(refreshed.find((i) => i.id === selected.id) ?? null);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setMonitorSubmitting(false);
    }
  }

  async function handleAlta(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setError(null);
    setSuccess(null);

    if (!altaForm.observacoesAlta.trim()) {
      setError('As observações de alta são obrigatórias.');
      return;
    }

    setAltaSubmitting(true);

    try {
      await darAltaInternamento(selected.id, {
        dataAlta: altaForm.dataAlta ? new Date(altaForm.dataAlta).toISOString() : undefined,
        observacoesAlta: altaForm.observacoesAlta.trim(),
      });

      setSuccess('Alta registada com sucesso.');
      setAltaOpen(false);
      setSelected(null);
      setAltaForm({ dataAlta: toDateTimeLocalValue(), observacoesAlta: '' });
      await loadInternamentos();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setAltaSubmitting(false);
    }
  }

  const animalOptions = patients.map((patient) => ({
    id: patient.id,
    label: `${patient.name} — ${patient.species}${patient.breed ? ` / ${patient.breed}` : ''}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internamentos</h1>
          <p className="text-[#78716C] mt-1">
            Gestão de animais internados, monitorização clínica e altas.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => void loadInternamentos()}
            disabled={loading}
            className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          {canManage && (
            <button
              onClick={() => setFormOpen((value) => !value)}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
            >
              <Plus size={18} />
              Novo Internamento
            </button>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className="grid gap-3">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {formOpen && canManage && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">Animal *</label>
            <select
              value={form.animalId}
              onChange={(e) => setForm((prev) => ({ ...prev, animalId: e.target.value }))}
              className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            >
              <option value="">Selecionar animal</option>
              {animalOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">Data de entrada</label>
            <input
              type="datetime-local"
              value={form.dataEntrada}
              onChange={(e) => setForm((prev) => ({ ...prev, dataEntrada: e.target.value }))}
              className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-[#57534E]">Motivo *</label>
            <select
              value={form.motivo}
              onChange={(e) => setForm((prev) => ({ ...prev, motivo: e.target.value }))}
              className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            >
              <option value="">Selecionar motivo</option>
              {MOTIVOS_INTERNAMENTO.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-[#57534E]">Observações iniciais *</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[100px]"
              placeholder="Estado inicial, plano de vigilância, restrições, medicação prevista..."
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
            >
              {submitting ? 'A criar...' : 'Criar internamento'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <p className="text-sm text-[#78716C]">Ativos</p>
          <p className="text-3xl font-bold text-[#5A5A40] mt-2">{ativos.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <p className="text-sm text-[#78716C]">Altas registadas</p>
          <p className="text-3xl font-bold text-[#5A5A40] mt-2">{altas.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <p className="text-sm text-[#78716C]">Total</p>
          <p className="text-3xl font-bold text-[#5A5A40] mt-2">{internamentos.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-8 text-center text-[#78716C]">
          A carregar internamentos...
        </div>
      ) : internamentos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-8 text-center">
          <Bed size={48} className="text-[#A8A29E] mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Sem internamentos registados</h3>
          <p className="text-[#78716C]">Cria um novo internamento para iniciar a monitorização clínica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {internamentos.map((internamento) => (
            <div
              key={internamento.id}
              className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-5 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40] shrink-0">
                    <Bed size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1C1917]">
                      {internamento.animal?.nome ?? `Animal #${internamento.animalId}`}
                    </h3>
                    <p className="text-sm text-[#78716C]">
                      {internamento.animal?.especie}
                      {internamento.animal?.raca ? ` / ${internamento.animal.raca}` : ''}
                    </p>
                    {internamento.estado === 'ATIVO' && internamento.animal?.alertasClinicos && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1 w-fit">
                        <AlertTriangle size={12} className="shrink-0" />
                        {internamento.animal.alertasClinicos}
                      </div>
                    )}
                    <p className="text-sm text-[#57534E] mt-2 line-clamp-2">{internamento.motivo}</p>
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${estadoClass(internamento.estado)}`}>
                  {internamento.estado === 'ALTA' ? 'Alta' : 'Ativo'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#57534E]">
                <div>
                  <span className="font-bold text-[#1C1917]">Entrada:</span>{' '}
                  {formatDate(internamento.dataEntrada)}
                </div>
                <div>
                  <span className="font-bold text-[#1C1917]">Veterinário:</span>{' '}
                  {internamento.veterinario?.nome ?? internamento.veterinario?.email ?? '—'}
                </div>
                <div>
                  <span className="font-bold text-[#1C1917]">Dono:</span>{' '}
                  {internamento.animal?.dono?.nome ?? '—'}
                </div>
                <div>
                  <span className="font-bold text-[#1C1917]">Monitorizações:</span>{' '}
                  {internamento.observacoesInternamento?.length ?? 0}
                </div>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openDetails(internamento)}
                  className="px-3 py-2 bg-[#5A5A40] text-white rounded-lg text-sm font-bold hover:bg-[#4A4A35] transition-colors flex items-center gap-2"
                >
                  <ClipboardList size={15} />
                  Ver detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#E7E5E4]">
            <div className="p-6 border-b border-[#E7E5E4] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40]">
                  <UserIcon size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">Internamento #{selected.id}</p>
                  <h2 className="text-2xl font-bold text-[#1C1917]">
                    {selected.animal?.nome ?? `Animal #${selected.animalId}`}
                  </h2>
                  <p className="text-sm text-[#78716C] mt-1">{selected.motivo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-[#F5F5F4] rounded-lg transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#57534E]">
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                  <p><span className="font-bold text-[#1C1917]">Entrada:</span> {formatDate(selected.dataEntrada)}</p>
                  <p className="mt-2"><span className="font-bold text-[#1C1917]">Alta:</span> {formatDate(selected.dataAlta)}</p>
                  <p className="mt-2"><span className="font-bold text-[#1C1917]">Estado:</span> {selected.estado === 'ALTA' ? 'Alta registada' : 'Ativo'}</p>
                </div>
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                  <p><span className="font-bold text-[#1C1917]">Dono:</span> {selected.animal?.dono?.nome ?? '—'}</p>
                  <p className="mt-2"><span className="font-bold text-[#1C1917]">Email:</span> {selected.animal?.dono?.email ?? '—'}</p>
                  <p className="mt-2"><span className="font-bold text-[#1C1917]">Telefone:</span> {selected.animal?.dono?.telefone ?? '—'}</p>
                </div>
              </div>

              {selected.observacoes && (
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm text-[#57534E] whitespace-pre-wrap">
                  <span className="font-bold text-[#1C1917]">Observações iniciais:</span> {selected.observacoes}
                </div>
              )}

              {canManage && selected.estado !== 'ALTA' && (
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMonitorFormOpen((value) => !value)}
                    className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors flex items-center gap-2"
                  >
                    <Activity size={16} />
                    Nova monitorização
                  </button>
                  <button
                    type="button"
                    onClick={() => setAltaOpen((value) => !value)}
                    className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Dar alta
                  </button>
                </div>
              )}

              {monitorFormOpen && (
                <form onSubmit={handleAddMonitorizacao} className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Data</label>
                    <input
                      type="datetime-local"
                      value={monitorForm.data}
                      onChange={(e) => setMonitorForm((prev) => ({ ...prev, data: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Sinais vitais *</label>
                    <input
                      value={monitorForm.sinaisVitais}
                      onChange={(e) => setMonitorForm((prev) => ({ ...prev, sinaisVitais: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                      placeholder="T 38.4ºC, FC 92 bpm..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Alimentação</label>
                    <input
                      value={monitorForm.alimentacao}
                      onChange={(e) => setMonitorForm((prev) => ({ ...prev, alimentacao: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                      placeholder="Aceitou comida húmida..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Medicação</label>
                    <input
                      value={monitorForm.medicacao}
                      onChange={(e) => setMonitorForm((prev) => ({ ...prev, medicacao: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                      placeholder="Fluidoterapia, analgesia..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-[#57534E]">Observações *</label>
                    <textarea
                      value={monitorForm.observacoes}
                      onChange={(e) => setMonitorForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[100px]"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setMonitorFormOpen(false)}
                      className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={monitorSubmitting}
                      className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                    >
                      {monitorSubmitting ? 'A guardar...' : 'Guardar monitorização'}
                    </button>
                  </div>
                </form>
              )}

              {altaOpen && (
                <form onSubmit={handleAlta} className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Data da alta</label>
                    <input
                      type="datetime-local"
                      value={altaForm.dataAlta}
                      onChange={(e) => setAltaForm((prev) => ({ ...prev, dataAlta: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Observações de alta *</label>
                    <textarea
                      value={altaForm.observacoesAlta}
                      onChange={(e) => setAltaForm((prev) => ({ ...prev, observacoesAlta: e.target.value }))}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[90px]"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setAltaOpen(false)}
                      className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={altaSubmitting}
                      className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                    >
                      {altaSubmitting ? 'A registar...' : 'Confirmar alta'}
                    </button>
                  </div>
                </form>
              )}

              <div>
                <h3 className="font-bold text-[#1C1917] mb-3">Histórico de monitorização</h3>
                {selected.observacoesInternamento?.length ? (
                  <div className="space-y-3">
                    {selected.observacoesInternamento.map((observacao) => (
                      <div key={observacao.id} className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm text-[#57534E]">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                          <span className="font-bold text-[#1C1917]">{formatDate(observacao.data)}</span>
                          <span className="text-xs text-[#78716C]">{observacao.registadoPor?.nome ?? observacao.registadoPor?.email ?? '—'}</span>
                        </div>
                        {observacao.sinaisVitais && <p><span className="font-bold text-[#1C1917]">Sinais vitais:</span> {observacao.sinaisVitais}</p>}
                        {observacao.alimentacao && <p><span className="font-bold text-[#1C1917]">Alimentação:</span> {observacao.alimentacao}</p>}
                        {observacao.medicacao && <p><span className="font-bold text-[#1C1917]">Medicação:</span> {observacao.medicacao}</p>}
                        <p className="mt-2 whitespace-pre-wrap">{observacao.observacoes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] p-5 text-[#78716C]">
                    Ainda não existem monitorizações registadas para este internamento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
