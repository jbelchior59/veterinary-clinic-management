import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  PawPrint,
  RefreshCw,
  Stethoscope,
  Plus,
  Clock3,
  Mail,
  Phone,
  Pill,
  Edit2,
  Save,
  X,
  FlaskConical,
  ExternalLink,
  Printer,
  Weight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function PesoChart({ dados }: { dados: { data: string; peso: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
        <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#78716C' }} />
        <YAxis
          tick={{ fontSize: 12, fill: '#78716C' }}
          tickFormatter={(v) => `${v} kg`}
          width={60}
        />
        <Tooltip
          formatter={(value: number) => [`${value} kg`, 'Peso']}
          contentStyle={{ borderRadius: '12px', border: '1px solid #E7E5E4', fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="#5A5A40"
          strokeWidth={2}
          dot={{ r: 4, fill: '#5A5A40' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
import { createConsulta, updateConsulta } from '../lib/consultas';
import { concluirMarcacao } from '../lib/marcacoes';
import {
  formatAxiosError as formatHistoricoError,
  getHistoricoClinico,
  type HistoricoClinico,
} from '../lib/historico';
import {
  createTratamento,
  updateTratamento,
  formatAxiosError as formatTratamentoError,
} from '../lib/tratamentos';
import {
  createExame,
  getExamesByAnimal,
  formatAxiosError as formatExameError,
  type Exame,
} from '../lib/exames';
import {
  createVacina,
  deleteVacina,
  getVacinasByAnimal,
  vacinaStatus,
  type Vacina,
} from '../lib/vacinas';
import { useAuth } from '../hooks/useAuth';
import { getClinicaInfo } from '../lib/clinicaInfo';
import { printHtml } from '../lib/printUtils';

const EXAM_TYPES = [
  'Hemograma Completo',
  'Bioquímica Sérica',
  'Urianálise',
  'Raio-X (Radiografia)',
  'Ecografia Abdominal',
  'Ecografia Cardíaca',
  'Eletrocardiograma (ECG)',
  'Citologia',
  'Histopatologia',
  'Cultura e Antibiograma',
  'Coprologia (Fezes)',
  'Serologia',
  'Perfil Tiroidal',
  'Teste de Coagulação',
  'Esfregaço Sanguíneo',
  'Outro',
];

function exameEstadoLabel(estado: string): string {
  switch (estado) {
    case 'PENDENTE': return 'Pendente';
    case 'EM_ANALISE': return 'Em análise';
    case 'AMOSTRA_COLETADA': return 'Amostra recolhida';
    case 'CONCLUIDO': return 'Por validar';
    case 'VALIDADO': return 'Validado';
    case 'CANCELADO': return 'Cancelado';
    default: return estado;
  }
}

function exameEstadoClass(estado: string): string {
  switch (estado) {
    case 'VALIDADO': return 'bg-green-100 text-green-700';
    case 'CONCLUIDO': return 'bg-orange-100 text-orange-700';
    case 'EM_ANALISE':
    case 'AMOSTRA_COLETADA': return 'bg-blue-100 text-blue-700';
    case 'CANCELADO': return 'bg-red-100 text-red-700';
    default: return 'bg-stone-100 text-stone-700';
  }
}

function examePrioridadeLabel(prioridade: string): string {
  return prioridade === 'ALTA' ? 'Urgente' : 'Normal';
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

function toDateTimeLocalValue(date = new Date()) {
  const dt = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return dt.toISOString().slice(0, 16);
}

type TratamentoFormState = {
  descricao: string;
  medicacao: string;
};

export default function HistoricoClinicoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const animalId = Number(id);
  const { user } = useAuth();

  const [historico, setHistorico] = useState<HistoricoClinico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [vacinasLoading, setVacinasLoading] = useState(false);
  const [vacinaFormOpen, setVacinaFormOpen] = useState(false);
  const [vacinaSubmitting, setVacinaSubmitting] = useState(false);
  const [vacinaError, setVacinaError] = useState<string | null>(null);
  const [vacinaSuccess, setVacinaSuccess] = useState<string | null>(null);
  const [vacinaForm, setVacinaForm] = useState({
    nome: '',
    lote: '',
    fabricante: '',
    dataAplicacao: new Date().toISOString().slice(0, 10),
    proximaDose: '',
    observacoes: '',
  });

  const [exames, setExames] = useState<Exame[]>([]);
  const [examesError, setExamesError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    data: toDateTimeLocalValue(),
    observacoes: '',
    diagnostico: '',
    pesoRegistado: '',
    adicionarTratamento: false,
    tratamentoDescricao: '',
    tratamentoMedicacao: '',
    pedirExame: false,
    exameTipo: '',
    exameOutroTipo: '',
    examePrioridade: 'NORMAL',
    exameDescricaoClinica: '',
  });

  const [openTratamentoForms, setOpenTratamentoForms] = useState<Record<number, boolean>>({});
  const [tratamentoForms, setTratamentoForms] = useState<Record<number, TratamentoFormState>>({});
  const [tratamentoSubmitting, setTratamentoSubmitting] = useState<Record<number, boolean>>({});
  const [tratamentoErrors, setTratamentoErrors] = useState<Record<number, string | null>>({});
  const [tratamentoSuccess, setTratamentoSuccess] = useState<Record<number, string | null>>({});

  const [editingTratamentos, setEditingTratamentos] = useState<Record<number, boolean>>({});
  const [editTratamentoForms, setEditTratamentoForms] = useState<Record<number, TratamentoFormState>>({});
  const [editTratamentoSubmitting, setEditTratamentoSubmitting] = useState<Record<number, boolean>>({});
  const [editTratamentoErrors, setEditTratamentoErrors] = useState<Record<number, string | null>>({});
  const [editTratamentoSuccess, setEditTratamentoSuccess] = useState<Record<number, string | null>>({});

  type ConsultaEditForm = { observacoes: string; diagnostico: string };
  const [editingConsultas, setEditingConsultas] = useState<Record<number, boolean>>({});
  const [editConsultaForms, setEditConsultaForms] = useState<Record<number, ConsultaEditForm>>({});
  const [editConsultaSubmitting, setEditConsultaSubmitting] = useState<Record<number, boolean>>({});
  const [editConsultaErrors, setEditConsultaErrors] = useState<Record<number, string | null>>({});
  const [editConsultaSuccess, setEditConsultaSuccess] = useState<Record<number, string | null>>({});

  const autoOpenConsulta = searchParams.get('novaConsulta') === '1';
  const marcacaoId = searchParams.get('marcacaoId');

  async function loadHistorico() {
  if (!animalId || Number.isNaN(animalId)) {
    setError('ID de animal inválido.');
    setExames([]);
    setExamesError(null);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);
  setExamesError(null);

  try {
    const data = await getHistoricoClinico(animalId);
    setHistorico(data);

    try {
      const examesData = await getExamesByAnimal(animalId);
      setExames(examesData);
    } catch (examError) {
      setExames([]);
      setExamesError(formatExameError(examError));
    }
  } catch (e) {
    setHistorico(null);
    setExames([]);
    setError(formatHistoricoError(e));
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    void loadHistorico();
    void loadVacinas();
  }, [animalId]);

  useEffect(() => {
    if (!autoOpenConsulta) return;

    setFormOpen(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    setTimeout(() => {
      const formElement = document.getElementById('form-nova-consulta');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('novaConsulta');
    setSearchParams(nextParams, { replace: true });
  }, [autoOpenConsulta, searchParams, setSearchParams]);

  const consultasOrdenadas = useMemo(() => {
    return [...(historico?.consultas ?? [])].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );
  }, [historico]);

  const marcacoesOrdenadas = useMemo(() => {
    return [...(historico?.marcacoes ?? [])].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );
  }, [historico]);

  const proximasMarcacoes = useMemo(
    () =>
      marcacoesOrdenadas
        .filter((m) => m.estado === 'AGENDADA' && new Date(m.data).getTime() >= Date.now())
        .slice(0, 3),
    [marcacoesOrdenadas],
  );
  const examesOrdenados = useMemo(() => {
  return [...exames].sort(
    (a, b) => new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime(),
  );
}, [exames]);
  async function handleSubmitConsulta(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!animalId || Number.isNaN(animalId)) {
      setSubmitError('Animal inválido.');
      return;
    }

    if (!form.data || !form.observacoes.trim() || !form.diagnostico.trim()) {
      setSubmitError('Preenche todos os campos obrigatórios da consulta.');
      return;
    }

    if (form.adicionarTratamento && !form.tratamentoDescricao.trim()) {
      setSubmitError('Preenche a descrição do tratamento ou desativa essa opção.');
      return;
    }

    if (form.pedirExame && !form.exameTipo) {
      setSubmitError('Seleciona o tipo de exame.');
      return;
    }

    if (form.pedirExame && form.exameTipo === 'Outro' && !form.exameOutroTipo.trim()) {
      setSubmitError('Especifica o tipo de exame no campo de texto.');
      return;
    }

    if (form.pedirExame && !form.exameDescricaoClinica.trim()) {
      setSubmitError('Preenche a descrição clínica do exame.');
      return;
    }

    setSubmitting(true);

    try {
      const consultaCriada = await createConsulta({
        animalId,
        data: new Date(form.data).toISOString(),
        observacoes: form.observacoes.trim(),
        diagnostico: form.diagnostico.trim(),
        pesoRegistado: form.pesoRegistado ? Number(form.pesoRegistado) : undefined,
      });

      if (form.adicionarTratamento) {
        await createTratamento({
          consultaId: consultaCriada.id,
          descricao: form.tratamentoDescricao.trim(),
          medicacao: form.tratamentoMedicacao.trim() || undefined,
        });
      }

      if (form.pedirExame) {
        const tipoFinal = form.exameTipo === 'Outro' ? form.exameOutroTipo.trim() : form.exameTipo;
        await createExame({
          animalId,
          tipo: tipoFinal,
          prioridade: form.examePrioridade,
          descricaoClinica: form.exameDescricaoClinica.trim(),
        });
      }

      if (marcacaoId) {
        await concluirMarcacao(Number(marcacaoId)).catch(() => undefined);
      }

      const partes = ['Consulta'];
      if (form.adicionarTratamento) partes.push('tratamento');
      if (form.pedirExame) partes.push('pedido de exame');

      setSubmitSuccess(`${partes.join(', ')} registados com sucesso.`);

      setForm({
        data: toDateTimeLocalValue(),
        observacoes: '',
        diagnostico: '',
        pesoRegistado: '',
        adicionarTratamento: false,
        tratamentoDescricao: '',
        tratamentoMedicacao: '',
        pedirExame: false,
        exameTipo: '',
        exameOutroTipo: '',
        examePrioridade: 'NORMAL',
        exameDescricaoClinica: '',
      });

      setFormOpen(false);
      await loadHistorico();
    } catch (error: any) {
      setSubmitError(
        error?.response?.config?.url?.includes('/exames')
          ? formatExameError(error)
          : formatHistoricoError(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTratamentoForm(consultaId: number) {
    setOpenTratamentoForms((prev) => ({
      ...prev,
      [consultaId]: !prev[consultaId],
    }));

    setTratamentoErrors((prev) => ({
      ...prev,
      [consultaId]: null,
    }));

    setTratamentoSuccess((prev) => ({
      ...prev,
      [consultaId]: null,
    }));

    setTratamentoForms((prev) => ({
      ...prev,
      [consultaId]: prev[consultaId] ?? { descricao: '', medicacao: '' },
    }));
  }

  function updateTratamentoField(
    consultaId: number,
    field: keyof TratamentoFormState,
    value: string,
  ) {
    setTratamentoForms((prev) => ({
      ...prev,
      [consultaId]: {
        ...(prev[consultaId] ?? { descricao: '', medicacao: '' }),
        [field]: value,
      },
    }));
  }

  async function handleSubmitTratamento(
    e: React.FormEvent,
    consultaId: number,
  ) {
    e.preventDefault();

    const currentForm = tratamentoForms[consultaId] ?? {
      descricao: '',
      medicacao: '',
    };

    setTratamentoErrors((prev) => ({ ...prev, [consultaId]: null }));
    setTratamentoSuccess((prev) => ({ ...prev, [consultaId]: null }));

    if (!currentForm.descricao.trim()) {
      setTratamentoErrors((prev) => ({
        ...prev,
        [consultaId]: 'A descrição do tratamento é obrigatória.',
      }));
      return;
    }

    setTratamentoSubmitting((prev) => ({ ...prev, [consultaId]: true }));

    try {
      await createTratamento({
        consultaId,
        descricao: currentForm.descricao.trim(),
        medicacao: currentForm.medicacao.trim() || undefined,
      });

      setTratamentoSuccess((prev) => ({
        ...prev,
        [consultaId]: 'Tratamento registado com sucesso.',
      }));

      setTratamentoForms((prev) => ({
        ...prev,
        [consultaId]: { descricao: '', medicacao: '' },
      }));

      setOpenTratamentoForms((prev) => ({
        ...prev,
        [consultaId]: false,
      }));

      await loadHistorico();
    } catch (e) {
      setTratamentoErrors((prev) => ({
        ...prev,
        [consultaId]: formatTratamentoError(e),
      }));
    } finally {
      setTratamentoSubmitting((prev) => ({ ...prev, [consultaId]: false }));
    }
  }

  function startEditTratamento(
    tratamentoId: number,
    descricao: string,
    medicacao?: string | null,
  ) {
    setEditingTratamentos((prev) => ({
      ...prev,
      [tratamentoId]: true,
    }));

    setEditTratamentoErrors((prev) => ({
      ...prev,
      [tratamentoId]: null,
    }));

    setEditTratamentoSuccess((prev) => ({
      ...prev,
      [tratamentoId]: null,
    }));

    setEditTratamentoForms((prev) => ({
      ...prev,
      [tratamentoId]: {
        descricao,
        medicacao: medicacao ?? '',
      },
    }));
  }

  function cancelEditTratamento(tratamentoId: number) {
    setEditingTratamentos((prev) => ({
      ...prev,
      [tratamentoId]: false,
    }));

    setEditTratamentoErrors((prev) => ({
      ...prev,
      [tratamentoId]: null,
    }));
  }

  function updateEditTratamentoField(
    tratamentoId: number,
    field: keyof TratamentoFormState,
    value: string,
  ) {
    setEditTratamentoForms((prev) => ({
      ...prev,
      [tratamentoId]: {
        ...(prev[tratamentoId] ?? { descricao: '', medicacao: '' }),
        [field]: value,
      },
    }));
  }

  async function handleUpdateTratamento(
    e: React.FormEvent,
    tratamentoId: number,
  ) {
    e.preventDefault();

    const currentForm = editTratamentoForms[tratamentoId] ?? {
      descricao: '',
      medicacao: '',
    };

    setEditTratamentoErrors((prev) => ({ ...prev, [tratamentoId]: null }));
    setEditTratamentoSuccess((prev) => ({ ...prev, [tratamentoId]: null }));

    if (!currentForm.descricao.trim()) {
      setEditTratamentoErrors((prev) => ({
        ...prev,
        [tratamentoId]: 'A descrição do tratamento é obrigatória.',
      }));
      return;
    }

    setEditTratamentoSubmitting((prev) => ({ ...prev, [tratamentoId]: true }));

    try {
      await updateTratamento(tratamentoId, {
        descricao: currentForm.descricao.trim(),
        medicacao: currentForm.medicacao.trim(),
      });

      setEditTratamentoSuccess((prev) => ({
        ...prev,
        [tratamentoId]: 'Tratamento atualizado com sucesso.',
      }));

      setEditingTratamentos((prev) => ({
        ...prev,
        [tratamentoId]: false,
      }));

      await loadHistorico();
    } catch (e) {
      setEditTratamentoErrors((prev) => ({
        ...prev,
        [tratamentoId]: formatTratamentoError(e),
      }));
    } finally {
      setEditTratamentoSubmitting((prev) => ({ ...prev, [tratamentoId]: false }));
    }
  }

  function startEditConsulta(id: number, observacoes: string, diagnostico: string) {
    setEditingConsultas((prev) => ({ ...prev, [id]: true }));
    setEditConsultaForms((prev) => ({ ...prev, [id]: { observacoes, diagnostico } }));
    setEditConsultaErrors((prev) => ({ ...prev, [id]: null }));
    setEditConsultaSuccess((prev) => ({ ...prev, [id]: null }));
  }

  function cancelEditConsulta(id: number) {
    setEditingConsultas((prev) => ({ ...prev, [id]: false }));
    setEditConsultaErrors((prev) => ({ ...prev, [id]: null }));
  }

  async function handleUpdateConsulta(e: React.FormEvent, id: number) {
    e.preventDefault();
    const form = editConsultaForms[id] ?? { observacoes: '', diagnostico: '' };
    setEditConsultaErrors((prev) => ({ ...prev, [id]: null }));

    if (!form.observacoes.trim() || !form.diagnostico.trim()) {
      setEditConsultaErrors((prev) => ({ ...prev, [id]: 'Observações e diagnóstico são obrigatórios.' }));
      return;
    }

    setEditConsultaSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await updateConsulta(id, { observacoes: form.observacoes.trim(), diagnostico: form.diagnostico.trim() });
      setEditConsultaSuccess((prev) => ({ ...prev, [id]: 'Consulta atualizada com sucesso.' }));
      setEditingConsultas((prev) => ({ ...prev, [id]: false }));
      await loadHistorico();
    } catch (e) {
      setEditConsultaErrors((prev) => ({ ...prev, [id]: formatHistoricoError(e) }));
    } finally {
      setEditConsultaSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function loadVacinas() {
    if (!animalId || Number.isNaN(animalId)) return;
    setVacinasLoading(true);
    try {
      const data = await getVacinasByAnimal(animalId);
      setVacinas(data);
    } catch {
      setVacinas([]);
    } finally {
      setVacinasLoading(false);
    }
  }

  async function handleSubmitVacina(e: React.FormEvent) {
    e.preventDefault();
    if (!vacinaForm.nome.trim()) {
      setVacinaError('O nome da vacina é obrigatório.');
      return;
    }
    setVacinaSubmitting(true);
    setVacinaError(null);
    setVacinaSuccess(null);
    try {
      await createVacina(animalId, {
        nome: vacinaForm.nome.trim(),
        lote: vacinaForm.lote.trim() || undefined,
        fabricante: vacinaForm.fabricante.trim() || undefined,
        dataAplicacao: new Date(vacinaForm.dataAplicacao).toISOString(),
        proximaDose: vacinaForm.proximaDose ? new Date(vacinaForm.proximaDose).toISOString() : undefined,
        observacoes: vacinaForm.observacoes.trim() || undefined,
      });
      setVacinaSuccess('Vacina registada com sucesso.');
      setVacinaFormOpen(false);
      setVacinaForm({ nome: '', lote: '', fabricante: '', dataAplicacao: new Date().toISOString().slice(0, 10), proximaDose: '', observacoes: '' });
      await loadVacinas();
    } catch {
      setVacinaError('Erro ao registar vacina. Tenta novamente.');
    } finally {
      setVacinaSubmitting(false);
    }
  }

  async function handleDeleteVacina(vacinaId: number) {
    if (!window.confirm('Eliminar este registo de vacina?')) return;
    try {
      await deleteVacina(vacinaId);
      await loadVacinas();
    } catch {
      setVacinaError('Erro ao eliminar vacina.');
    }
  }

  function handlePrintVacina(vacina: Vacina) {
    const clinica = getClinicaInfo();
    const animalNome = historico?.nome ?? `Animal #${animalId}`;
    const donoNome = historico?.dono?.nome ?? 'Sem proprietário registado';
    const dataAplicacao = new Date(vacina.dataAplicacao).toLocaleDateString('pt-PT');
    const proximaDose = vacina.proximaDose
      ? new Date(vacina.proximaDose).toLocaleDateString('pt-PT')
      : 'Não definida';

    printHtml(
      `
        <div class="fatura-header">
          <div class="brand-block">
            <div class="brand-name">${clinica.nome || 'VetClinic Pro'}</div>
            <div class="brand-sub">${[clinica.morada, clinica.telefone].filter(Boolean).join(' · ') || 'Clínica Veterinária'}</div>
          </div>
          <div class="header-title-block">
            <div class="doc-title">Certificado de Vacinação</div>
            <div class="doc-subtitle">${(clinica.nome || 'VetClinic Pro').toUpperCase()}</div>
          </div>
          <div class="header-meta">
            <div class="header-meta-row"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-PT')}</div>
            ${clinica.nif ? `<div class="header-meta-row"><strong>NIF:</strong> ${clinica.nif}</div>` : ''}
          </div>
        </div>
        <div class="section">
          <div class="section-header">Paciente</div>
          <table>
            <tbody>
              <tr><td><strong>Animal</strong></td><td>${animalNome}</td></tr>
              <tr><td><strong>Espécie</strong></td><td>${historico?.especie ?? '—'}</td></tr>
              <tr><td><strong>Proprietário</strong></td><td>${donoNome}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-header">Vacina</div>
          <table>
            <tbody>
              <tr><td><strong>Nome</strong></td><td>${vacina.nome}</td></tr>
              <tr><td><strong>Lote</strong></td><td>${vacina.lote || '—'}</td></tr>
              <tr><td><strong>Fabricante</strong></td><td>${vacina.fabricante || '—'}</td></tr>
              <tr><td><strong>Data de aplicação</strong></td><td>${dataAplicacao}</td></tr>
              <tr><td><strong>Próxima dose</strong></td><td>${proximaDose}</td></tr>
              <tr><td><strong>Aplicado por</strong></td><td>${vacina.aplicadoPor?.nome || '—'}</td></tr>
              <tr><td><strong>Observações</strong></td><td>${vacina.observacoes || '—'}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="fatura-footer">
          <span class="footer-brand">${[clinica.nome || 'VetClinic Pro', clinica.email].filter(Boolean).join(' — ')}</span>
          <span class="footer-note">Documento gerado em ${new Date().toLocaleString('pt-PT')}</span>
        </div>
      `,
      `Certificado de vacinação — ${animalNome}`,
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
  <div className="min-w-0 flex-1">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E7E5E4] text-[#78716C] text-xs font-bold uppercase tracking-widest mb-4">
      <Stethoscope size={14} className="text-[#5A5A40]" /> Histórico Clínico
    </div>

    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1C1917]">
      Consulta do histórico do animal
    </h1>

    <p className="mt-2 text-[#78716C] max-w-3xl">
      Visualização cronológica das consultas, observações, diagnósticos, tratamentos e marcações do paciente.
    </p>
  </div>

  <div className="flex flex-row flex-nowrap items-center gap-3 shrink-0 overflow-x-auto pb-1">
    <button
      onClick={() => setFormOpen((v) => !v)}
      className="whitespace-nowrap px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors shadow-lg shadow-[#5A5A40]/20 flex items-center gap-2"
    >
      <Plus size={16} /> {formOpen ? 'Fechar formulário' : 'Nova consulta'}
    </button>

    <button
      onClick={() => void loadHistorico()}
      disabled={loading}
      className="whitespace-nowrap px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      {loading ? 'A carregar...' : 'Recarregar'}
    </button>

    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
      }}
      className="whitespace-nowrap px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors flex items-center gap-2"
    >
      <ArrowLeft size={16} /> Voltar aos pacientes
    </button>
  </div>
</div>

        {historico?.alertasClinicos && (
          <div className="rounded-2xl border border-red-400 bg-red-100 dark:bg-red-900/30 dark:border-red-600 p-4 flex items-start gap-3 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">
              <strong>ALERTA CLÍNICO: </strong>{historico.alertasClinicos}
            </span>
          </div>
        )}

        {historico?.alergias && (
          <div className="rounded-2xl border border-amber-400 bg-amber-100 dark:bg-amber-900/30 dark:border-amber-600 p-4 text-amber-800 dark:text-amber-300 text-sm">
            <strong>ALERGIAS CONHECIDAS: </strong>{historico.alergias}
          </div>
        )}

        {(submitError || submitSuccess) && (
          <div className="grid gap-3">
            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {submitSuccess}
              </div>
            )}
          </div>
        )}

        {formOpen && (
          <div
            id="form-nova-consulta"
            className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Registar nova consulta</h2>
                <p className="text-sm text-[#78716C]">
                  O animal é associado automaticamente pelo contexto desta página.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitConsulta} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-[#57534E]">Data e hora *</label>
                <input
                  type="datetime-local"
                  value={form.data}
                  onChange={(e) => setForm((prev) => ({ ...prev, data: e.target.value }))}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#57534E]">Observações *</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[140px]"
                  placeholder="Observações da consulta"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#57534E]">Diagnóstico *</label>
                <textarea
                  value={form.diagnostico}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, diagnostico: e.target.value }))
                  }
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[140px]"
                  placeholder="Diagnóstico clínico"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#57534E]">Peso registado (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.pesoRegistado}
                  onChange={(e) => setForm((prev) => ({ ...prev, pesoRegistado: e.target.value }))}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                  placeholder="Ex: 4.5"
                />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.adicionarTratamento}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        adicionarTratamento: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-[#1C1917]">Adicionar tratamento agora</p>
                    <p className="text-sm text-[#78716C]">
                      Usa esta opção se quiseres já associar um tratamento à consulta.
                    </p>
                  </div>
                </label>
              </div>

              {form.adicionarTratamento && (
                <>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-bold text-[#57534E]">
                      Descrição do tratamento *
                    </label>
                    <textarea
                      value={form.tratamentoDescricao}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tratamentoDescricao: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[120px]"
                      placeholder="Ex.: Manter dieta gastrointestinal durante 5 dias"
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-bold text-[#57534E]">Medicação</label>
                    <input
                      type="text"
                      value={form.tratamentoMedicacao}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tratamentoMedicacao: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                      placeholder="Ex.: Probiótico oral 2x/dia"
                    />
                  </div>
                </>
              )}

              <div className="lg:col-span-2 rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pedirExame}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pedirExame: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-[#1C1917]">Pedir exame agora</p>
                    <p className="text-sm text-[#78716C]">
                      Usa esta opção se quiseres registar logo um pedido de exame laboratorial.
                    </p>
                  </div>
                </label>
              </div>

              {form.pedirExame && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Tipo de exame *</label>
                    <select
                      value={form.exameTipo}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, exameTipo: e.target.value, exameOutroTipo: '' }))
                      }
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                      required
                    >
                      <option value="" disabled>Seleciona o tipo de exame</option>
                      {EXAM_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {form.exameTipo === 'Outro' && (
                      <input
                        type="text"
                        value={form.exameOutroTipo}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, exameOutroTipo: e.target.value }))
                        }
                        className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                        placeholder="Especifica o tipo de exame"
                        required
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#57534E]">Prioridade *</label>
                    <select
                      value={form.examePrioridade}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, examePrioridade: e.target.value }))
                      }
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="ALTA">Alta</option>
                    </select>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-bold text-[#57534E]">
                      Descrição clínica *
                    </label>
                    <textarea
                      value={form.exameDescricaoClinica}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, exameDescricaoClinica: e.target.value }))
                      }
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[100px]"
                      placeholder="Contexto clínico que justifica o pedido de exame"
                      required
                    />
                  </div>
                </>
              )}

              <div className="lg:col-span-2 flex gap-3 justify-end">
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
                  {submitting
                    ? 'A registar...'
                    : form.adicionarTratamento && form.pedirExame
                      ? 'Guardar consulta, tratamento e exame'
                      : form.adicionarTratamento
                        ? 'Guardar consulta e tratamento'
                        : form.pedirExame
                          ? 'Guardar consulta e exame'
                          : 'Guardar consulta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {historico && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
                  <PawPrint size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">Paciente</p>
                  <h2 className="text-xl font-bold text-[#1C1917]">{historico.nome}</h2>
                </div>
              </div>
              <div className="space-y-2 text-sm text-[#57534E]">
                  <div><span className="font-bold">Espécie:</span> {historico.especie}</div>
                  <div><span className="font-bold">Consultas:</span> {historico.totalConsultas}</div>
                  <div><span className="font-bold">Tratamentos:</span> {historico.totalTratamentos}</div>
                  <div><span className="font-bold">Exames:</span> {examesOrdenados.length}</div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6">
              <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">Dono</p>
              {historico.dono ? (
                <div className="space-y-3 text-sm text-[#57534E]">
                  <div className="font-bold text-[#1C1917] text-lg">{historico.dono.nome}</div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[#5A5A40]" /> {historico.dono.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#5A5A40]" />{' '}
                    {historico.dono.telefone || 'Sem telefone registado'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#78716C]">Sem informação do dono.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6">
              <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">
                Próximas marcações
              </p>
              {proximasMarcacoes.length === 0 ? (
                <p className="text-sm text-[#78716C]">Não existem marcações futuras ativas.</p>
              ) : (
                <div className="space-y-3">
                  {proximasMarcacoes.map((marcacao) => (
                    <div key={marcacao.id} className="rounded-2xl bg-[#FAFAF9] border border-[#E7E5E4] p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                        <Clock3 size={15} className="text-[#5A5A40]" /> {formatDate(marcacao.data)}
                      </div>
                      <p className="text-sm text-[#57534E] mt-2">
                        {marcacao.motivo || 'Consulta clínica'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {historico && !loading && !error && (
  <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6 md:p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
        <FlaskConical size={20} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#1C1917]">Exames do animal</h2>
        <p className="text-sm text-[#78716C]">
          Pedidos laboratoriais associados ao histórico clínico deste paciente.
        </p>
      </div>
    </div>

    {examesError && (
      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {examesError}
      </div>
    )}

    {examesOrdenados.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] p-5 text-[#78716C]">
        Ainda não existem exames registados para este animal.
      </div>
    ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {examesOrdenados.map((exame) => (
          <div
            key={exame.id}
            className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">
                  Exame #{exame.id}
                </p>
                <h3 className="font-bold text-[#1C1917] mt-1">{exame.tipo}</h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${exameEstadoClass(exame.estado)}`}>
                  {exameEstadoLabel(exame.estado)}
                </span>

                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                    exame.prioridade === 'ALTA'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {examePrioridadeLabel(exame.prioridade)}
                </span>

                {exame.estado === 'CONCLUIDO' && (
                  <button
                    type="button"
                    onClick={() => navigate('/', { state: { goToPage: 'laboratory' } })}
                    className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-[#5A5A40] text-white flex items-center gap-1 hover:bg-[#4A4A35] transition-colors"
                  >
                    <ExternalLink size={10} />
                    Validar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-[#57534E]">
              <div>
                <span className="font-bold text-[#1C1917]">Pedido em:</span>{' '}
                {formatDate(exame.dataPedido)}
              </div>

              {exame.descricaoClinica && (
                <div>
                  <span className="font-bold text-[#1C1917]">Contexto clínico:</span>{' '}
                  {exame.descricaoClinica}
                </div>
              )}

              {exame.laboratorio?.nome && (
                <div>
                  <span className="font-bold text-[#1C1917]">Laboratório:</span>{' '}
                  {exame.laboratorio.nome}
                </div>
              )}

              {exame.solicitante?.nome && (
                <div>
                  <span className="font-bold text-[#1C1917]">Solicitado por:</span>{' '}
                  {exame.solicitante.nome}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
        {loading && (
          <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-10 text-center text-[#78716C]">
            A carregar histórico clínico...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-700">Não foi possível carregar o histórico</h2>
                <p className="text-red-600 mt-2">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && historico && consultasOrdenadas.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-10 text-center text-[#78716C]">
            Ainda não existem consultas registadas para este animal.
          </div>
        )}

        {!loading && !error && historico && consultasOrdenadas.length > 0 && (
          <div className="space-y-6 pb-8">
            {consultasOrdenadas.map((consulta) => {
              const tratamentoForm = tratamentoForms[consulta.id] ?? {
                descricao: '',
                medicacao: '',
              };
              const isTratamentoOpen = openTratamentoForms[consulta.id] ?? false;
              const isSubmittingTratamento = tratamentoSubmitting[consulta.id] ?? false;
              const tratamentoError = tratamentoErrors[consulta.id] ?? null;
              const tratamentoOk = tratamentoSuccess[consulta.id] ?? null;

              return (
                <article
                  key={consulta.id}
                  className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm overflow-hidden"
                >
                  <div className="p-6 md:p-8 border-b border-[#E7E5E4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-2">
                        Consulta #{consulta.id}
                      </p>
                      <h2 className="text-2xl font-bold text-[#1C1917]">Registo clínico</h2>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F5F5F4] text-[#57534E] font-medium">
                        <CalendarDays size={16} className="text-[#5A5A40]" />
                        {formatDate(consulta.data)}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          editingConsultas[consulta.id]
                            ? cancelEditConsulta(consulta.id)
                            : startEditConsulta(consulta.id, consulta.observacoes, consulta.diagnostico)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-[#E7E5E4] bg-white text-[#57534E] font-bold text-sm hover:bg-[#F5F5F4] transition-colors"
                      >
                        {editingConsultas[consulta.id] ? <><X size={14} /> Cancelar edição</> : <><Edit2 size={14} /> Editar</>}
                      </button>
                    </div>
                  </div>

                  {editConsultaErrors[consulta.id] && (
                    <div className="mx-6 md:mx-8 mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {editConsultaErrors[consulta.id]}
                    </div>
                  )}
                  {editConsultaSuccess[consulta.id] && (
                    <div className="mx-6 md:mx-8 mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                      {editConsultaSuccess[consulta.id]}
                    </div>
                  )}

                  {editingConsultas[consulta.id] ? (
                    <form
                      onSubmit={(e) => void handleUpdateConsulta(e, consulta.id)}
                      className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#57534E]">Diagnóstico *</label>
                        <textarea
                          value={editConsultaForms[consulta.id]?.diagnostico ?? consulta.diagnostico}
                          onChange={(e) =>
                            setEditConsultaForms((prev) => ({
                              ...prev,
                              [consulta.id]: { ...prev[consulta.id], diagnostico: e.target.value },
                            }))
                          }
                          className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[140px]"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#57534E]">Observações *</label>
                        <textarea
                          value={editConsultaForms[consulta.id]?.observacoes ?? consulta.observacoes}
                          onChange={(e) =>
                            setEditConsultaForms((prev) => ({
                              ...prev,
                              [consulta.id]: { ...prev[consulta.id], observacoes: e.target.value },
                            }))
                          }
                          className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[140px]"
                          required
                        />
                      </div>
                      <div className="lg:col-span-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => cancelEditConsulta(consulta.id)}
                          className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={editConsultaSubmitting[consulta.id]}
                          className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <Save size={15} />
                          {editConsultaSubmitting[consulta.id] ? 'A guardar...' : 'Guardar alterações'}
                        </button>
                      </div>
                    </form>
                  ) : (
                  <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4] p-5">
                      <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">
                        Diagnóstico
                      </p>
                      <p className="text-[#44403C] leading-relaxed whitespace-pre-wrap">
                        {consulta.diagnostico || '—'}
                      </p>
                    </div>

                    <div className="bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4] p-5">
                      <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">
                        Observações
                      </p>
                      <p className="text-[#44403C] leading-relaxed whitespace-pre-wrap">
                        {consulta.observacoes || '—'}
                      </p>
                    </div>
                  </div>
                  )}

                  <div className="px-6 md:px-8 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
                          <ClipboardList size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#1C1917]">Tratamentos associados</h3>
                          <p className="text-sm text-[#78716C]">
                            Intervenções registadas no contexto desta consulta.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleTratamentoForm(consulta.id)}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors w-fit"
                      >
                        <Pill size={16} />
                        {isTratamentoOpen ? 'Fechar tratamento' : 'Adicionar tratamento'}
                      </button>
                    </div>

                    {tratamentoError && (
                      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {tratamentoError}
                      </div>
                    )}

                    {tratamentoOk && (
                      <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        {tratamentoOk}
                      </div>
                    )}

                    {isTratamentoOpen && (
                      <form
                        onSubmit={(e) => void handleSubmitTratamento(e, consulta.id)}
                        className="mb-6 rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5 space-y-4"
                      >
                        <div className="rounded-xl bg-white border border-[#E7E5E4] px-4 py-3 text-sm text-[#57534E]">
                          <span className="font-bold text-[#1C1917]">Consulta associada:</span>{' '}
                          #{consulta.id} — {formatDate(consulta.data)}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#57534E]">Descrição *</label>
                          <textarea
                            value={tratamentoForm.descricao}
                            onChange={(e) =>
                              updateTratamentoField(consulta.id, 'descricao', e.target.value)
                            }
                            className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[110px]"
                            placeholder="Descreve a intervenção realizada"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#57534E]">Medicação</label>
                          <input
                            type="text"
                            value={tratamentoForm.medicacao}
                            onChange={(e) =>
                              updateTratamentoField(consulta.id, 'medicacao', e.target.value)
                            }
                            className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="flex gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => toggleTratamentoForm(consulta.id)}
                            className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingTratamento}
                            className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                          >
                            {isSubmittingTratamento ? 'A guardar...' : 'Guardar tratamento'}
                          </button>
                        </div>
                      </form>
                    )}

                    {consulta.tratamentos.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] p-5 text-[#78716C]">
                        Sem tratamentos associados a esta consulta.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {consulta.tratamentos.map((tratamento) => {
                          const isEditing = editingTratamentos[tratamento.id] ?? false;
                          const editForm = editTratamentoForms[tratamento.id] ?? {
                            descricao: tratamento.descricao,
                            medicacao: tratamento.medicacao ?? '',
                          };
                          const isSubmittingEdit = editTratamentoSubmitting[tratamento.id] ?? false;
                          const editError = editTratamentoErrors[tratamento.id] ?? null;
                          const editOk = editTratamentoSuccess[tratamento.id] ?? null;

                          return (
                            <div
                              key={tratamento.id}
                              className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5"
                            >
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">
                                  Tratamento #{tratamento.id}
                                </p>

                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditTratamento(
                                        tratamento.id,
                                        tratamento.descricao,
                                        tratamento.medicacao,
                                      )
                                    }
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#E7E5E4] rounded-xl text-xs font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                                  >
                                    <Edit2 size={14} />
                                    Editar
                                  </button>
                                )}
                              </div>

                              {!isEditing ? (
                                <div className="space-y-2 text-sm text-[#57534E]">
                                  {editOk && (
                                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                      {editOk}
                                    </div>
                                  )}

                                  <div>
                                    <span className="font-bold text-[#1C1917]">Descrição:</span>{' '}
                                    {tratamento.descricao}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#1C1917]">Medicação:</span>{' '}
                                    {tratamento.medicacao || '—'}
                                  </div>
                                  <div className="text-[#78716C] pt-2">
                                    Registado em {formatDate(tratamento.createdAt)}
                                  </div>
                                </div>
                              ) : (
                                <form
                                  onSubmit={(e) => void handleUpdateTratamento(e, tratamento.id)}
                                  className="space-y-4"
                                >
                                  {editError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                      {editError}
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#57534E]">
                                      Descrição *
                                    </label>
                                    <textarea
                                      value={editForm.descricao}
                                      onChange={(e) =>
                                        updateEditTratamentoField(
                                          tratamento.id,
                                          'descricao',
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[100px]"
                                      required
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#57534E]">
                                      Medicação
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.medicacao}
                                      onChange={(e) =>
                                        updateEditTratamentoField(
                                          tratamento.id,
                                          'medicacao',
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-white border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                                    />
                                  </div>

                                  <div className="flex gap-3 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => cancelEditTratamento(tratamento.id)}
                                      className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
                                    >
                                      <X size={14} />
                                      Cancelar
                                    </button>

                                    <button
                                      type="submit"
                                      disabled={isSubmittingEdit}
                                      className="inline-flex items-center gap-2 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                                    >
                                      <Save size={14} />
                                      {isSubmittingEdit ? 'A guardar...' : 'Guardar alterações'}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Evolução do Peso */}
        {(() => {
          const dadosPeso = (historico?.consultas ?? [])
            .filter((c) => c.pesoRegistado != null)
            .map((c) => ({
              data: new Date(c.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' }),
              peso: c.pesoRegistado as number,
            }))
            .reverse();

          return (
            <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
                  <Weight size={18} />
                </div>
                <h2 className="text-xl font-bold text-[#1C1917]">Evolução do Peso</h2>
              </div>
              {dadosPeso.length === 0 ? (
                <p className="text-sm text-[#A8A29E]">Sem dados de peso registados nas consultas.</p>
              ) : (
                <PesoChart dados={dadosPeso} />
              )}
            </div>
          );
        })()}

        {/* Vacinações */}
        <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F5F4] flex items-center justify-center text-[#5A5A40]">
                <Pill size={18} />
              </div>
              <h2 className="text-xl font-bold text-[#1C1917]">Registos de Vacinação</h2>
            </div>
            {['ADMIN', 'VETERINARIO'].includes(user?.role ?? '') && (
              <button
                type="button"
                onClick={() => { setVacinaFormOpen((v) => !v); setVacinaError(null); setVacinaSuccess(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-2xl text-sm font-bold hover:bg-[#4A4A35] transition-colors"
              >
                <Plus size={15} />
                {vacinaFormOpen ? 'Fechar' : 'Registar vacina'}
              </button>
            )}
          </div>

          {vacinaSuccess && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{vacinaSuccess}</div>
          )}
          {vacinaError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{vacinaError}</div>
          )}

          {vacinaFormOpen && (
            <form onSubmit={handleSubmitVacina} className="mb-6 rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#57534E]">Nome da vacina *</label>
                <input
                  type="text"
                  value={vacinaForm.nome}
                  onChange={(e) => setVacinaForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Raiva, Parvovírus, Leucemia Felina..."
                  className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#57534E]">Lote</label>
                <input type="text" value={vacinaForm.lote} onChange={(e) => setVacinaForm((p) => ({ ...p, lote: e.target.value }))} className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#57534E]">Fabricante</label>
                <input type="text" value={vacinaForm.fabricante} onChange={(e) => setVacinaForm((p) => ({ ...p, fabricante: e.target.value }))} className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#57534E]">Data de aplicação *</label>
                <input type="date" value={vacinaForm.dataAplicacao} onChange={(e) => setVacinaForm((p) => ({ ...p, dataAplicacao: e.target.value }))} className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#57534E]">Próxima dose</label>
                <input type="date" value={vacinaForm.proximaDose} onChange={(e) => setVacinaForm((p) => ({ ...p, proximaDose: e.target.value }))} className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#57534E]">Observações</label>
                <textarea value={vacinaForm.observacoes} onChange={(e) => setVacinaForm((p) => ({ ...p, observacoes: e.target.value }))} rows={2} className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white resize-none" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setVacinaFormOpen(false)} className="px-4 py-2 border border-[#E7E5E4] rounded-2xl text-sm font-bold text-[#57534E] hover:bg-[#F5F5F4]">Cancelar</button>
                <button type="submit" disabled={vacinaSubmitting} className="px-4 py-2 bg-[#5A5A40] text-white rounded-2xl text-sm font-bold hover:bg-[#4A4A35] disabled:opacity-50">
                  {vacinaSubmitting ? 'A guardar...' : 'Guardar vacina'}
                </button>
              </div>
            </form>
          )}

          {vacinasLoading ? (
            <p className="text-sm text-[#A8A29E]">A carregar vacinações...</p>
          ) : vacinas.length === 0 ? (
            <p className="text-sm text-[#A8A29E]">Nenhuma vacina registada para este animal.</p>
          ) : (
            <div className="space-y-3">
              {vacinas.map((v) => {
                const status = vacinaStatus(v.proximaDose);
                return (
                  <div key={v.id} className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-bold text-[#1C1917]">{v.nome}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#57534E]">
                          {v.lote && <span>Lote: <span className="font-medium">{v.lote}</span></span>}
                          {v.fabricante && <span>Fabricante: <span className="font-medium">{v.fabricante}</span></span>}
                          <span>Aplicada em: <span className="font-medium">{new Date(v.dataAplicacao).toLocaleDateString('pt-PT')}</span></span>
                          {v.aplicadoPor && <span>Por: <span className="font-medium">{v.aplicadoPor.nome}</span></span>}
                        </div>
                        {v.proximaDose && (
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                            status === 'overdue' ? 'bg-red-100 text-red-700' :
                            status === 'soon' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            Próxima dose: {new Date(v.proximaDose).toLocaleDateString('pt-PT')}
                            {status === 'overdue' && ' — Em atraso'}
                            {status === 'soon' && ' — Próxima'}
                          </span>
                        )}
                        {v.observacoes && <p className="text-xs text-[#78716C] mt-1">{v.observacoes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePrintVacina(v)}
                          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#5A5A40] hover:bg-[#F5F5F4] transition-colors"
                          title="Imprimir certificado"
                        >
                          <Printer size={15} />
                        </button>
                        {['ADMIN', 'VETERINARIO'].includes(user?.role ?? '') && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteVacina(v.id)}
                            className="p-1.5 rounded-lg text-[#A8A29E] hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
