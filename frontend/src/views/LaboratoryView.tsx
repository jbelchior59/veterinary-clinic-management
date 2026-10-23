import { useMemo, useState } from 'react';
import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { User, LabExam } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  History,
  PackageMinus,
  Paperclip,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { printHtml } from '../lib/printUtils';
import {
  createAmostra,
  createConsumo,
  createExame,
  createNotaInterna,
  createResultado,
  formatAxiosError,
  getExame,
  getResultadoTemplates,
  getResultadosByExame,
  rejeitarAmostra,
  Resultado,
  ResultadoTemplate,
  updateExame,
  uploadAnexo,
  validarResultado,
} from '../lib/exames';
import { getAnimais, type Animal } from '../lib/animais';
import { getStock, type StockItem } from '../lib/stock';

interface LaboratoryViewProps {
  user: User;
  onInsertResults: (exam: LabExam) => void;
  onViewResults: (exam: LabExam) => void;
  onNewExam: () => void;
  exams: LabExam[];
  isDemo?: boolean;
  onDataChanged?: () => Promise<void> | void;
  autoOpenSample?: boolean;
  onAutoOpenSampleHandled?: () => void;
}

type ClinicalExamStatus = LabExam['status'] | 'POR_VALIDAR';
type QueueFilter = 'all' | 'urgent' | 'pending' | 'analysis' | 'validation' | 'rejected';


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

const SAMPLE_TYPE_OPTIONS = [
  'Sangue total',
  'Soro',
  'Plasma',
  'Urina',
  'Fezes',
  'Swab auricular',
  'Swab nasal',
  'Swab oral',
  'Swab cutâneo',
  'Raspado cutâneo',
  'Citologia',
  'Biópsia tecidular',
  'Aspirado por agulha fina',
  'Líquido sinovial',
  'Líquido pleural',
  'Líquido abdominal',
  'Sémen',
  'Leite',
];


function getClinicalExamStatus(exam: LabExam): ClinicalExamStatus {
  // No fluxo clínico, COMPLETED significa que o técnico já inseriu resultados,
  // mas o veterinário ainda precisa validá-los.
  if (exam.status === 'COMPLETED') {
    return 'POR_VALIDAR';
  }

  return exam.status;
}

function statusLabel(status: ClinicalExamStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'REQUESTED':
      return 'Solicitado';
    case 'SAMPLE_COLLECTED':
      return 'Amostra recolhida';
    case 'SAMPLE_REJECTED':
      return 'Amostra rejeitada';
    case 'AWAITING_NEW_SAMPLE':
      return 'Aguarda nova amostra';
    case 'IN_ANALYSIS':
      return 'Em análise';
    case 'COMPLETED':
      return 'Concluído';
    case 'POR_VALIDAR':
      return 'Por validar';
    case 'VALIDATED':
      return 'Validado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}

function statusBadgeClass(status: ClinicalExamStatus) {
  switch (status) {
    case 'VALIDATED':
      return 'bg-green-100 text-green-700';
    case 'COMPLETED':
    case 'POR_VALIDAR':
      return 'bg-orange-100 text-orange-700';
    case 'IN_ANALYSIS':
    case 'SAMPLE_COLLECTED':
      return 'bg-blue-100 text-blue-700';
    case 'SAMPLE_REJECTED':
    case 'AWAITING_NEW_SAMPLE':
      return 'bg-red-100 text-red-700';
    case 'CANCELLED':
      return 'bg-stone-200 text-stone-700';
    case 'REQUESTED':
    case 'PENDING':
    default:
      return 'bg-orange-100 text-orange-700';
  }
}

export function LaboratoryView({
  user,
  onNewExam,
  exams,
  isDemo,
  onDataChanged,
  autoOpenSample,
  onAutoOpenSampleHandled,
}: LaboratoryViewProps) {
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<LabExam | null>(null);
  const [selectedExamDetails, setSelectedExamDetails] = useState<any | null>(null);
  const [results, setResults] = useState<Resultado[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<ResultadoTemplate[]>([]);

  const [showExamRequestModal, setShowExamRequestModal] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [examRequestForm, setExamRequestForm] = useState({
    animalId: '',
    tipo: '',
    tipoOutro: '',
    prioridade: 'NORMAL',
    descricaoClinica: '',
  });

  const [sampleForm, setSampleForm] = useState({
    codigo: '',
    tipo: '',
    origem: 'INTERNA',
    temperatura: '',
    localizacaoArmazenamento: '',
    observacoes: '',
  });

  const [resultForm, setResultForm] = useState({
    parametro: '',
    valor: '',
    unidade: '',
    referencia: '',
    interpretacao: 'NORMAL',
    dados: '',
    observacoes: '',
  });

  const [rejectReason, setRejectReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [consumptionForm, setConsumptionForm] = useState({ stockItemId: '', item: '', quantidade: '1', unidade: 'un', lote: '' });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [loading, setLoading] = useState(false);

  const isTecnico = user.role === 'TECNICO';
  const isVeterinario = user.role === 'VETERINARIO';

  const pendingCount = exams.filter(
    (e) => e.status === 'REQUESTED' || e.status === 'PENDING',
  ).length;

  const analysisCount = exams.filter(
    (e) => e.status === 'SAMPLE_COLLECTED' || e.status === 'IN_ANALYSIS',
  ).length;

  const validationPendingCount = exams.filter((e) => e.status === 'COMPLETED').length;

  const validatedCount = exams.filter((e) => e.status === 'VALIDATED').length;
  const rejectedCount = exams.filter((e) => e.status === 'SAMPLE_REJECTED' || e.status === 'AWAITING_NEW_SAMPLE').length;

  const selectedStockItem = stockItems.find((item) => item.id === consumptionForm.stockItemId);

  useEffect(() => {
    if (!isTecnico) return;
    getStock().then(setStockItems).catch(() => setStockItems([]));
  }, [isTecnico]);

  const visibleExams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return exams.filter((exam) => {
      const matchesSearch =
        !term ||
        exam.type.toLowerCase().includes(term) ||
        exam.petName.toLowerCase().includes(term) ||
        exam.vetName.toLowerCase().includes(term) ||
        String(exam.id).includes(term);

      const matchesFilter =
        queueFilter === 'all' ||
        (queueFilter === 'urgent' && exam.priority === 'ALTA') ||
        (queueFilter === 'pending' && ['PENDING', 'REQUESTED'].includes(exam.status)) ||
        (queueFilter === 'analysis' && ['SAMPLE_COLLECTED', 'IN_ANALYSIS'].includes(exam.status)) ||
        (queueFilter === 'validation' && exam.status === 'COMPLETED') ||
        (queueFilter === 'rejected' && ['SAMPLE_REJECTED', 'AWAITING_NEW_SAMPLE'].includes(exam.status));

      return matchesSearch && matchesFilter;
    });
  }, [exams, queueFilter, searchTerm]);

  function showFeedback(message: string, type: 'success' | 'error' = 'success') {
    setFeedback({ message, type });
    window.setTimeout(() => setFeedback(null), 3500);
  }

  const sampleTypeOptions = useMemo(() => SAMPLE_TYPE_OPTIONS, []);

  async function refreshCurrentData() {
    await Promise.resolve(onDataChanged?.());
  }

  const handleOpenExamRequest = async () => {
    setExamRequestForm({
      animalId: '',
      tipo: '',
      tipoOutro: '',
      prioridade: 'NORMAL',
      descricaoClinica: '',
    });
    setShowExamRequestModal(true);

    if (animals.length > 0) return;

    try {
      setAnimalsLoading(true);
      const data = await getAnimais();
      setAnimals(data);
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setAnimalsLoading(false);
    }
  };

  const handleSubmitExamRequest = async () => {
    if (!examRequestForm.animalId) {
      showFeedback('Seleciona o animal associado ao pedido de exame.', 'error');
      return;
    }

    if (!examRequestForm.tipo) {
      showFeedback('Seleciona o tipo de exame.', 'error');
      return;
    }

    if (examRequestForm.tipo === 'Outro' && !examRequestForm.tipoOutro.trim()) {
      showFeedback('Especifica o tipo de exame no campo de texto.', 'error');
      return;
    }

    if (!examRequestForm.descricaoClinica.trim()) {
      showFeedback('Preenche o contexto clínico do pedido.', 'error');
      return;
    }

    const tipoFinal = examRequestForm.tipo === 'Outro' ? examRequestForm.tipoOutro.trim() : examRequestForm.tipo;

    try {
      setLoading(true);
      await createExame({
        animalId: parseInt(examRequestForm.animalId, 10),
        tipo: tipoFinal,
        prioridade: examRequestForm.prioridade,
        descricaoClinica: examRequestForm.descricaoClinica.trim(),
      });
      showFeedback('Pedido de exame criado com sucesso.');
      setShowExamRequestModal(false);
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async (examId: string) => {
    if (isDemo) {
      console.log('Demo: Iniciar análise do exame', examId);
      return;
    }

    try {
      setLoading(true);
      await updateExame(parseInt(examId, 10), { estado: 'EM_ANALISE' });
      showFeedback('Análise iniciada com sucesso.');
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSample = (exam: LabExam) => {
    setSelectedExam(exam);
    setSampleForm({
      codigo: `AM-${exam.id}-${Date.now().toString().slice(-4)}`,
      tipo: '',
      origem: 'INTERNA',
      temperatura: '2-8 C',
      localizacaoArmazenamento: '',
      observacoes: '',
    });
    setShowSampleModal(true);
  };

  useEffect(() => {
    if (!autoOpenSample) return;

    const exam = exams.find((item) =>
      ['PENDING', 'REQUESTED', 'AWAITING_NEW_SAMPLE'].includes(item.status),
    );

    if (exam) {
      handleRegisterSample(exam);
    } else {
      showFeedback('Não existem exames pendentes para registar amostra.', 'error');
    }

    onAutoOpenSampleHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenSample]);

  const handleInsertResults = (exam: LabExam) => {
    setSelectedExam(exam);
    setResultForm({
      parametro: '',
      valor: '',
      unidade: '',
      referencia: '',
      interpretacao: 'NORMAL',
      dados: '',
      observacoes: '',
    });
    void loadTemplates();
    setShowResultModal(true);
  };

  const loadTemplates = async () => {
    if (templates.length > 0) return;
    try {
      const data = await getResultadoTemplates();
      setTemplates(data);
    } catch {
      setTemplates([]);
    }
  };

  const handleApplyTemplate = (parametro: ResultadoTemplate['parametros'][number]) => {
    setResultForm((current) => ({
      ...current,
      parametro: parametro.parametro,
      unidade: parametro.unidade,
      referencia: parametro.referencia,
      dados: current.dados || `Resultado de ${parametro.parametro}.`,
    }));
  };

  const handleViewResults = async (exam: LabExam) => {
    setSelectedExam(exam);
    setShowReviewModal(true);
    setResults([]);
    setSelectedExamDetails(null);
    setRejectReason('');
    setNoteText('');
    setAttachmentUploading(false);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
    setConsumptionForm({ item: '', quantidade: '1', unidade: 'un', lote: '' });

    try {
      setResultsLoading(true);
      const [data, detail] = await Promise.all([
        getResultadosByExame(parseInt(exam.id, 10)),
        getExame(parseInt(exam.id, 10)),
      ]);
      setResults(data);
      setSelectedExamDetails(detail);
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setResultsLoading(false);
    }
  };

  const handlePrintRelatorio = async (exam: LabExam) => {
    try {
      const [resultados, exameDetalhado] = await Promise.all([
        getResultadosByExame(parseInt(exam.id, 10)),
        getExame(parseInt(exam.id, 10)),
      ]);

      const animal = exameDetalhado.animal;
      const amostra = exameDetalhado.amostras?.[0];
      const relatorio = exameDetalhado.relatorio;
      const validadoPor = resultados.find((r) => r.validadoPor)?.validadoPor;
      const dataImpressao = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const linhasResultados = resultados.length > 0
        ? resultados.map((r) => `
            <tr>
              <td>${r.parametro ?? '—'}</td>
              <td>${r.valor ?? '—'}</td>
              <td>${r.unidade ?? '—'}</td>
              <td>${r.referencia ?? '—'}</td>
              <td>${r.interpretacao ?? '—'}</td>
            </tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#999">Sem resultados registados</td></tr>';

      const html = `
        <div class="header">
          <div class="header-left">
            <h1>Clínica Veterinária</h1>
            <p>Relatório Laboratorial</p>
          </div>
          <div class="header-right">
            <div class="badge">${exam.status === 'VALIDATED' ? 'VALIDADO' : 'CONCLUÍDO'}</div>
            <p style="margin-top:6px">Data: ${dataImpressao}</p>
            <p>Pedido n.º ${exam.id}</p>
          </div>
        </div>

        <h2>Informação do Exame</h2>
        <div class="info-grid">
          <div><span>Tipo de exame:</span> <strong>${exam.type}</strong></div>
          <div><span>Prioridade:</span> ${exam.priority || 'NORMAL'}</div>
          <div><span>Animal:</span> <strong>${animal?.nome ?? exam.petName}</strong></div>
          <div><span>Espécie:</span> ${animal?.especie ?? '—'}</div>
          <div><span>Dono:</span> ${animal?.dono?.nome ?? exam.ownerName ?? '—'}</div>
          <div><span>Solicitado por:</span> ${exam.vetName}</div>
          <div><span>Data do pedido:</span> ${exam.requestDate}</div>
          ${exam.clinicalContext ? `<div style="grid-column:1/-1"><span>Contexto clínico:</span> ${exam.clinicalContext}</div>` : ''}
        </div>

        ${amostra ? `
        <h2>Amostra</h2>
        <div class="info-grid">
          <div><span>Código:</span> ${amostra.codigo}</div>
          <div><span>Tipo:</span> ${amostra.tipo}</div>
          ${amostra.dataColheita ? `<div><span>Data de colheita:</span> ${new Date(amostra.dataColheita).toLocaleDateString('pt-PT')}</div>` : ''}
          ${amostra.origem ? `<div><span>Origem:</span> ${amostra.origem}</div>` : ''}
        </div>` : ''}

        <h2>Resultados</h2>
        <table>
          <thead>
            <tr>
              <th>Parâmetro</th>
              <th>Valor</th>
              <th>Unidade</th>
              <th>Referência</th>
              <th>Interpretação</th>
            </tr>
          </thead>
          <tbody>${linhasResultados}</tbody>
        </table>

        ${relatorio ? `
        <h2>Conclusão e Recomendações</h2>
        <div class="conclusao">
          <p><strong>Conclusão:</strong> ${relatorio.conclusao}</p>
          ${relatorio.recomendacoes ? `<p style="margin-top:8px"><strong>Recomendações:</strong> ${relatorio.recomendacoes}</p>` : ''}
          ${relatorio.observacoes ? `<p style="margin-top:8px"><strong>Observações:</strong> ${relatorio.observacoes}</p>` : ''}
        </div>` : ''}

        <div class="footer">
          <div>
            <div class="sign-line">
              ${validadoPor ? `Dr(a). ${validadoPor.nome ?? validadoPor.email}` : 'Médico Veterinário Validador'}
            </div>
          </div>
          <div style="text-align:right;font-size:11px;color:#888">
            <p>Emitido em ${dataImpressao}</p>
            <p>Documento gerado automaticamente</p>
          </div>
        </div>`;

      printHtml(html, `Relatório — ${exam.type} — ${exam.petName}`);
    } catch {
      showFeedback('Erro ao carregar dados para impressão.', 'error');
    }
  };

  const handleSubmitSample = async () => {
    if (!selectedExam) return;

    if (!sampleForm.codigo.trim() || !sampleForm.tipo.trim()) {
      showFeedback('Preenche o código e o tipo da amostra.', 'error');
      return;
    }

    try {
      setLoading(true);
      await createAmostra({
        exameId: parseInt(selectedExam.id, 10),
        codigo: sampleForm.codigo.trim(),
        tipo: sampleForm.tipo.trim(),
        origem: sampleForm.origem,
        temperatura: sampleForm.temperatura.trim() || undefined,
        localizacaoArmazenamento: sampleForm.localizacaoArmazenamento.trim() || undefined,
        observacoes: sampleForm.observacoes.trim() || undefined,
      });
      showFeedback('Amostra registada com sucesso.');
      setShowSampleModal(false);
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedExam) return;

    if (
      !resultForm.parametro.trim() ||
      !resultForm.valor.trim() ||
      !resultForm.unidade.trim() ||
      !resultForm.referencia.trim() ||
      !resultForm.dados.trim() ||
      !resultForm.observacoes.trim()
    ) {
      showFeedback('Todos os campos do resultado são obrigatórios.', 'error');
      return;
    }

    try {
      setLoading(true);
      await createResultado({
        exameId: parseInt(selectedExam.id, 10),
        parametro: resultForm.parametro.trim(),
        valor: resultForm.valor.trim(),
        unidade: resultForm.unidade.trim(),
        referencia: resultForm.referencia.trim(),
        interpretacao: resultForm.interpretacao,
        dados: resultForm.dados.trim(),
        observacoes: resultForm.observacoes.trim(),
      });
      showFeedback('Resultado inserido com sucesso.');
      setShowResultModal(false);
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedExamDetails = async () => {
    if (!selectedExam) return;
    const detail = await getExame(parseInt(selectedExam.id, 10));
    setSelectedExamDetails(detail);
    setResults(detail.resultados ?? []);
  };

  const handleRejectFirstSample = async () => {
    const sample = selectedExamDetails?.amostras?.find((amostra: any) => amostra.estado !== 'REJEITADA');
    if (!sample || !rejectReason.trim()) {
      showFeedback('Seleciona um exame com amostra ativa e indica o motivo.', 'error');
      return;
    }

    try {
      setLoading(true);
      await rejeitarAmostra(sample.id, rejectReason.trim());
      showFeedback('Amostra rejeitada e exame marcado como aguardando nova amostra.');
      setRejectReason('');
      await refreshSelectedExamDetails();
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!selectedExam || !noteText.trim()) return;
    try {
      setLoading(true);
      await createNotaInterna(parseInt(selectedExam.id, 10), noteText.trim());
      setNoteText('');
      await refreshSelectedExamDetails();
      showFeedback('Nota interna registada.');
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedExam) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAttachmentUploading(true);
      await uploadAnexo(parseInt(selectedExam.id, 10), file);
      await refreshSelectedExamDetails();
      event.target.value = '';
      showFeedback('Anexo carregado com sucesso.');
    } catch (error) {
      event.target.value = '';
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleCreateConsumption = async () => {
    if (!selectedExam || !consumptionForm.stockItemId) {
      showFeedback('Seleciona um item de stock.', 'error');
      return;
    }
    const quantidade = Number(consumptionForm.quantidade);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      showFeedback('Indica uma quantidade válida.', 'error');
      return;
    }
    try {
      setLoading(true);
      await createConsumo(parseInt(selectedExam.id, 10), {
        stockItemId: Number(consumptionForm.stockItemId),
        item: selectedStockItem?.name,
        quantidade,
        unidade: selectedStockItem?.unit || consumptionForm.unidade.trim() || 'un',
        lote: selectedStockItem?.lot || consumptionForm.lote.trim() || undefined,
      });
      setConsumptionForm({ stockItemId: '', item: '', quantidade: '1', unidade: 'un', lote: '' });
      await Promise.all([refreshSelectedExamDetails(), getStock().then(setStockItems).catch(() => undefined)]);
      showFeedback('Consumo de stock associado ao exame.');
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateResult = async (resultadoId: number) => {
    try {
      setLoading(true);
      const validated = await validarResultado(resultadoId);
      const nextResults = results.map((result) =>
        result.id === resultadoId ? validated : result,
      );
      const allResultsValid = nextResults.length > 0 && nextResults.every((result) => result.validado);

      setResults(nextResults);

      if (allResultsValid && selectedExam) {
        await updateExame(parseInt(selectedExam.id, 10), { estado: 'VALIDADO' }).catch(() => undefined);
        await refreshCurrentData();
        setShowReviewModal(false);
        setSelectedExam(null);
        showFeedback('Todos os resultados foram validados. O relatório pode ser emitido no separador Relatórios Clínicos.');
      } else {
        showFeedback('Resultado validado com sucesso. Ainda existem resultados por validar neste exame.');
      }
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExam = async (examId: string) => {
    try {
      setLoading(true);
      await updateExame(parseInt(examId, 10), { estado: 'CANCELADO' });
      showFeedback('Pedido de exame cancelado.');
      await refreshCurrentData();
    } catch (error) {
      showFeedback(formatAxiosError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTecnico ? 'Área Técnica de Laboratório' : 'Módulo Laboratorial'}
          </h1>
          <p className="text-sm text-[#78716C] mt-1">
            {isTecnico
              ? 'Regista amostras, insere resultados e acompanha o estado dos exames.'
              : 'Consulta pedidos, valida resultados e acompanha o fluxo laboratorial.'}
          </p>
        </div>
        <div className="flex gap-3">
          {isVeterinario && (
            <button
              onClick={handleOpenExamRequest}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors"
            >
              <Plus size={18} />
              Novo Pedido
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-orange-500" size={20} />
            <h3 className="font-bold">Pedidos Pendentes</h3>
          </div>
          <p className="text-3xl font-bold">{pendingCount}</p>
          <p className="text-xs text-[#78716C] mt-1">Aguardando amostra</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FlaskConical className="text-blue-500" size={20} />
            <h3 className="font-bold">Em Análise</h3>
          </div>
          <p className="text-3xl font-bold">{analysisCount}</p>
          <p className="text-xs text-[#78716C] mt-1">Processamento interno/externo</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-orange-500" size={20} />
            <h3 className="font-bold">Por Validar</h3>
          </div>
          <p className="text-3xl font-bold">{validationPendingCount}</p>
          <p className="text-xs text-[#78716C] mt-1">Resultados à espera do veterinário</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="text-green-500" size={20} />
            <h3 className="font-bold">Validados</h3>
          </div>
          <p className="text-3xl font-bold">{validatedCount}</p>
          <p className="text-xs text-[#78716C] mt-1">Prontos para relatório clínico</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="font-bold">Amostras Rejeitadas</h3>
          </div>
          <p className="text-3xl font-bold">{rejectedCount}</p>
          <p className="text-xs text-[#78716C] mt-1">Aguardam nova recolha</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E5E4] space-y-4">
          <div>
            <h2 className="font-bold text-lg">Fila de Trabalho</h2>
            <p className="text-sm text-[#78716C]">Prioriza exames urgentes, amostras pendentes e resultados por validar.</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D6D3D1]"
                placeholder="Pesquisar por exame, paciente, ID ou solicitante"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'Todos'],
                ['urgent', 'Urgentes'],
                ['pending', 'Pendentes'],
                ['analysis', 'Em análise'],
                ['validation', 'Por validar'],
                ['rejected', 'Rejeitados'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQueueFilter(id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    queueFilter === id
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-white text-[#44403C] border-[#E7E5E4] hover:bg-[#F5F5F4]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E7E5E4]">
          {visibleExams.length === 0 && (
            <div className="p-8 text-center text-[#A8A29E]">
              Nenhum exame encontrado para os filtros atuais.
            </div>
          )}

          {visibleExams.map((exam) => (
            <div
              key={exam.id}
              className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40]">
                  <FlaskConical size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#A8A29E]">
                      #{exam.id}
                    </span>
                    <h4 className="font-bold">{exam.type}</h4>
                  </div>
                  <p className="text-sm text-[#57534E]">
                    Paciente: <span className="font-medium">{exam.petName}</span>
                  </p>
                  <p className="text-xs text-[#78716C]">
                    Solicitado por {exam.vetName} em {exam.requestDate}
                  </p>
                  <p className="text-xs text-[#78716C]">
                    {exam.ownerName ? `Dono: ${exam.ownerName} · ` : ''}
                    Prioridade: <span className={exam.priority === 'ALTA' ? 'font-bold text-red-600' : 'font-medium'}>{exam.priority || 'NORMAL'}</span>
                  </p>
                  {exam.clinicalContext && (
                    <p className="text-xs text-[#57534E] mt-1 max-w-2xl line-clamp-2">
                      {exam.clinicalContext}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p
                    className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${statusBadgeClass(getClinicalExamStatus(exam))}`}
                  >
                    {statusLabel(getClinicalExamStatus(exam))}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {isTecnico && ['PENDING', 'REQUESTED', 'AWAITING_NEW_SAMPLE'].includes(exam.status) && (
                    <button
                      onClick={() => handleRegisterSample(exam)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                      type="button"
                      disabled={loading}
                    >
                      Registar Amostra
                    </button>
                  )}

                  {isTecnico && ['PENDING', 'REQUESTED', 'SAMPLE_COLLECTED'].includes(exam.status) && (
                    <button
                      onClick={() => handleStartAnalysis(exam.id)}
                      className="px-3 py-1 bg-[#5A5A40] text-white text-xs rounded-lg hover:bg-[#4A4A35] transition-colors"
                      type="button"
                      disabled={loading}
                    >
                      Iniciar Análise
                    </button>
                  )}

                  {isTecnico && ['SAMPLE_COLLECTED', 'IN_ANALYSIS'].includes(exam.status) && (
                    <button
                      onClick={() => handleInsertResults(exam)}
                      className="px-3 py-1 bg-[#5A5A40] text-white text-xs rounded-lg hover:bg-[#4A4A35] transition-colors"
                      type="button"
                      disabled={loading}
                    >
                      Inserir Resultados
                    </button>
                  )}

                  {isTecnico && ['SAMPLE_COLLECTED', 'SAMPLE_REJECTED', 'AWAITING_NEW_SAMPLE', 'IN_ANALYSIS', 'COMPLETED', 'VALIDATED'].includes(exam.status) && (
                    <button
                      onClick={() => handleViewResults(exam)}
                      className="px-3 py-1 bg-white border border-[#E7E5E4] text-[#1C1917] text-xs rounded-lg hover:bg-[#F5F5F4] transition-colors flex items-center gap-1"
                      type="button"
                      disabled={loading}
                    >
                      <FileText size={13} />
                      Ver Detalhes
                    </button>
                  )}

                  {isVeterinario && ['COMPLETED', 'VALIDATED'].includes(exam.status) && (
                    <button
                      onClick={() => handleViewResults(exam)}
                      className="px-3 py-1 bg-white border border-[#E7E5E4] text-[#1C1917] text-xs rounded-lg hover:bg-[#F5F5F4] transition-colors flex items-center gap-1"
                      type="button"
                      disabled={loading}
                    >
                      <FileText size={13} />
                      Ver/Validar
                    </button>
                  )}

                  {isVeterinario && ['PENDING', 'REQUESTED'].includes(exam.status) && (
                    <button
                      onClick={() => handleCancelExam(exam.id)}
                      className="px-3 py-1 bg-white border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors"
                      type="button"
                      disabled={loading}
                    >
                      Cancelar pedido
                    </button>
                  )}

                  {['COMPLETED', 'VALIDATED'].includes(exam.status) && (
                    <button
                      onClick={() => void handlePrintRelatorio(exam)}
                      className="px-3 py-1 bg-white border border-[#E7E5E4] text-[#1C1917] text-xs rounded-lg hover:bg-[#F5F5F4] transition-colors flex items-center gap-1"
                      type="button"
                      disabled={loading}
                    >
                      <Printer size={13} />
                      Imprimir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showExamRequestModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Novo Pedido de Exame</h3>
                <p className="text-sm text-[#78716C]">
                  Cria um pedido laboratorial fora do contexto de uma consulta.
                </p>
              </div>
              <button
                onClick={() => setShowExamRequestModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Animal *</label>
                <select
                  value={examRequestForm.animalId}
                  onChange={(e) =>
                    setExamRequestForm({ ...examRequestForm, animalId: e.target.value })
                  }
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg bg-white"
                  disabled={animalsLoading}
                >
                  <option value="">
                    {animalsLoading ? 'A carregar animais...' : 'Selecionar animal'}
                  </option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.nome} — {animal.especie}
                      {animal.raca ? ` / ${animal.raca}` : ''}
                      {animal.dono?.nome ? ` — Dono: ${animal.dono.nome}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de exame *</label>
                <select
                  value={examRequestForm.tipo}
                  onChange={(e) =>
                    setExamRequestForm({ ...examRequestForm, tipo: e.target.value, tipoOutro: '' })
                  }
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg bg-white"
                  required
                >
                  <option value="" disabled>Seleciona o tipo de exame</option>
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {examRequestForm.tipo === 'Outro' && (
                  <input
                    type="text"
                    value={examRequestForm.tipoOutro}
                    onChange={(e) =>
                      setExamRequestForm({ ...examRequestForm, tipoOutro: e.target.value })
                    }
                    className="w-full mt-2 p-2 border border-[#E7E5E4] rounded-lg"
                    placeholder="Especifica o tipo de exame"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prioridade *</label>
                <select
                  value={examRequestForm.prioridade}
                  onChange={(e) =>
                    setExamRequestForm({ ...examRequestForm, prioridade: e.target.value })
                  }
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg bg-white"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contexto clínico *</label>
                <textarea
                  value={examRequestForm.descricaoClinica}
                  onChange={(e) =>
                    setExamRequestForm({
                      ...examRequestForm,
                      descricaoClinica: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  rows={4}
                  placeholder="Motivo do pedido, suspeita clínica ou observações relevantes"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExamRequestModal(false)}
                className="flex-1 px-4 py-2 border border-[#E7E5E4] text-[#1C1917] rounded-lg hover:bg-[#F5F5F4] transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitExamRequest}
                disabled={loading || animalsLoading}
                className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                type="button"
              >
                {loading ? 'A criar...' : 'Criar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSampleModal && selectedExam && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Registar Amostra</h3>
              <button
                onClick={() => setShowSampleModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-3 text-sm text-[#57534E] mb-4">
              Exame: <span className="font-bold">{selectedExam.type}</span> — {selectedExam.petName}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código *</label>
                <input
                  type="text"
                  value={sampleForm.codigo}
                  onChange={(e) => setSampleForm({ ...sampleForm, codigo: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  placeholder="Código da amostra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={sampleForm.tipo}
                  onChange={(e) => setSampleForm({ ...sampleForm, tipo: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                >
                  <option value="">Seleciona o tipo de amostra</option>
                  {sampleTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Origem</label>
                <select
                  value={sampleForm.origem}
                  onChange={(e) => setSampleForm({ ...sampleForm, origem: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                >
                  <option value="INTERNA">Interna</option>
                  <option value="EXTERNA">Externa</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Temperatura</label>
                  <input
                    type="text"
                    value={sampleForm.temperatura}
                    onChange={(e) => setSampleForm({ ...sampleForm, temperatura: e.target.value })}
                    className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                    placeholder="2-8 C"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Localização</label>
                  <input
                    type="text"
                    value={sampleForm.localizacaoArmazenamento}
                    onChange={(e) => setSampleForm({ ...sampleForm, localizacaoArmazenamento: e.target.value })}
                    className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                    placeholder="Frio B2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  value={sampleForm.observacoes}
                  onChange={(e) => setSampleForm({ ...sampleForm, observacoes: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSampleModal(false)}
                className="flex-1 px-4 py-2 border border-[#E7E5E4] text-[#1C1917] rounded-lg hover:bg-[#F5F5F4] transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitSample}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                type="button"
              >
                {loading ? 'A registar...' : 'Registar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultModal && selectedExam && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Inserir Resultado</h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {templates.find((template) => template.tipo === selectedExam.type) && (
                <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-3">
                  <p className="text-sm font-bold mb-2">Templates de parâmetros</p>
                  <div className="flex flex-wrap gap-2">
                    {templates
                      .find((template) => template.tipo === selectedExam.type)
                      ?.parametros.map((parametro) => (
                        <button
                          key={parametro.parametro}
                          type="button"
                          onClick={() => handleApplyTemplate(parametro)}
                          className="px-3 py-1 rounded-lg bg-white border border-[#E7E5E4] text-xs hover:bg-[#F5F5F4]"
                        >
                          {parametro.parametro}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Parâmetro *</label>
                <input
                  type="text"
                  value={resultForm.parametro}
                  onChange={(e) => setResultForm({ ...resultForm, parametro: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  placeholder="Nome do parâmetro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Valor *</label>
                  <input
                    type="text"
                    value={resultForm.valor}
                    onChange={(e) => setResultForm({ ...resultForm, valor: e.target.value })}
                    className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                    placeholder="Valor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidade *</label>
                  <input
                    type="text"
                    value={resultForm.unidade}
                    onChange={(e) => setResultForm({ ...resultForm, unidade: e.target.value })}
                    className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                    placeholder="Unidade"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referência *</label>
                <input
                  type="text"
                  value={resultForm.referencia}
                  onChange={(e) => setResultForm({ ...resultForm, referencia: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  placeholder="Valor de referência"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interpretação *</label>
                <select
                  value={resultForm.interpretacao}
                  onChange={(e) => setResultForm({ ...resultForm, interpretacao: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg bg-white"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="BAIXO">Baixo</option>
                  <option value="ALTO">Alto</option>
                  <option value="CRITICO">Crítico</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dados *</label>
                <textarea
                  value={resultForm.dados}
                  onChange={(e) => setResultForm({ ...resultForm, dados: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  rows={3}
                  placeholder="Dados do resultado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações *</label>
                <textarea
                  value={resultForm.observacoes}
                  onChange={(e) => setResultForm({ ...resultForm, observacoes: e.target.value })}
                  className="w-full p-2 border border-[#E7E5E4] rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowResultModal(false)}
                className="flex-1 px-4 py-2 border border-[#E7E5E4] text-[#1C1917] rounded-lg hover:bg-[#F5F5F4] transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                type="button"
              >
                {loading ? 'A inserir...' : 'Inserir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedExam && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Resultados do Exame</h3>
                <p className="text-sm text-[#78716C]">
                  {selectedExam.type} — {selectedExam.petName}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {selectedExamDetails && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm space-y-2">
                  <h4 className="font-bold text-[#1C1917]">Contexto do Pedido</h4>
                  <p><span className="font-medium">Animal:</span> {selectedExamDetails.animal?.nome} ({selectedExamDetails.animal?.especie})</p>
                  <p><span className="font-medium">Dono:</span> {selectedExamDetails.animal?.dono?.nome || 'Sem registo'}</p>
                  <p><span className="font-medium">Solicitante:</span> {selectedExamDetails.solicitante?.nome || selectedExamDetails.solicitante?.email || 'Veterinário'}</p>
                  <p><span className="font-medium">Prioridade:</span> {selectedExamDetails.prioridade}</p>
                  {selectedExamDetails.descricaoClinica && <p className="whitespace-pre-wrap">{selectedExamDetails.descricaoClinica}</p>}
                </div>

                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm space-y-2">
                  <h4 className="font-bold text-[#1C1917]">Amostras</h4>
                  {selectedExamDetails.amostras?.length ? selectedExamDetails.amostras.map((amostra: any) => (
                    <div key={amostra.id} className="border-t border-[#E7E5E4] pt-2 first:border-t-0 first:pt-0">
                      <p className="font-medium">{amostra.codigo} · {amostra.tipo}</p>
                      <p>Estado: {amostra.estado || 'RECEBIDA'} · Origem: {amostra.origem}</p>
                      {(amostra.temperatura || amostra.localizacaoArmazenamento) && (
                        <p>{amostra.temperatura || 'Sem temperatura'} · {amostra.localizacaoArmazenamento || 'Sem localização'}</p>
                      )}
                      {amostra.motivoRejeicao && <p className="text-red-600">Motivo: {amostra.motivoRejeicao}</p>}
                    </div>
                  )) : <p className="text-[#78716C]">Sem amostras registadas.</p>}
                </div>
              </div>
            )}

            {resultsLoading ? (
              <div className="p-6 text-center text-[#78716C]">A carregar resultados...</div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] p-5 text-[#78716C]">
                Ainda não existem resultados inseridos para este exame.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 text-sm text-[#57534E]">
                        <p className="font-bold text-[#1C1917]">
                          {result.parametro || 'Resultado laboratorial'}
                        </p>
                        {result.valor && (
                          <p>
                            Valor: <span className="font-semibold">{result.valor}</span>{' '}
                            {result.unidade || ''}
                          </p>
                        )}
                        {result.referencia && <p>Referência: {result.referencia}</p>}
                        {result.interpretacao && (
                          <p>
                            Interpretação:{' '}
                            <span className={result.interpretacao === 'CRITICO' ? 'font-bold text-red-700' : result.interpretacao === 'ALTO' || result.interpretacao === 'BAIXO' ? 'font-bold text-orange-700' : 'font-semibold text-green-700'}>
                              {result.interpretacao}
                            </span>
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{result.dados}</p>
                        {result.observacoes && <p>Obs.: {result.observacoes}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            result.validado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {result.validado ? 'Validado' : 'Por validar'}
                        </span>

                        {!result.validado && isVeterinario && (
                          <button
                            onClick={() => handleValidateResult(result.id)}
                            className="px-3 py-1 bg-[#5A5A40] text-white text-xs rounded-lg hover:bg-[#4A4A35] transition-colors"
                            type="button"
                            disabled={loading}
                          >
                            Validar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 border-t border-[#E7E5E4] pt-6">
              {selectedExamDetails && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                  <div className="rounded-2xl border border-[#E7E5E4] p-4 space-y-3">
                    <h4 className="font-bold flex items-center gap-2"><PackageMinus size={16} />Consumos</h4>
                    {selectedExamDetails.consumos?.map((consumo: any) => (
                      <p key={consumo.id} className="text-sm text-[#57534E]">{consumo.item}: {consumo.quantidade} {consumo.unidade}{consumo.lote ? ` · lote ${consumo.lote}` : ''}</p>
                    ))}
                    {isTecnico && (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={consumptionForm.stockItemId}
                          onChange={(e) => {
                            const item = stockItems.find((stockItem) => stockItem.id === e.target.value);
                            setConsumptionForm({
                              ...consumptionForm,
                              stockItemId: e.target.value,
                              item: item?.name || '',
                              unidade: item?.unit || 'un',
                              lote: item?.lot || '',
                            });
                          }}
                          className="col-span-2 p-2 border border-[#E7E5E4] rounded-lg text-sm bg-white"
                        >
                          <option value="">Selecionar item de stock</option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                              {item.name} · {item.quantity} {item.unit} disponíveis{item.lot ? ` · lote ${item.lot}` : ''}
                            </option>
                          ))}
                        </select>
                        <input value={consumptionForm.quantidade} onChange={(e) => setConsumptionForm({ ...consumptionForm, quantidade: e.target.value })} type="number" min="0.01" max={selectedStockItem?.quantity} placeholder="Qtd." className="p-2 border border-[#E7E5E4] rounded-lg text-sm" />
                        <input value={consumptionForm.unidade} readOnly placeholder="Unidade" className="p-2 border border-[#E7E5E4] rounded-lg text-sm bg-[#FAFAF9]" />
                        <input value={consumptionForm.lote} readOnly placeholder="Lote" className="col-span-2 p-2 border border-[#E7E5E4] rounded-lg text-sm bg-[#FAFAF9]" />
                        {selectedStockItem && (
                          <p className="col-span-2 text-xs text-[#78716C]">
                            Disponível: {selectedStockItem.quantity} {selectedStockItem.unit}
                          </p>
                        )}
                        <button type="button" onClick={handleCreateConsumption} disabled={loading || !consumptionForm.stockItemId} className="col-span-2 px-3 py-2 rounded-lg bg-[#5A5A40] text-white text-sm disabled:opacity-50">Registar consumo</button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E7E5E4] p-4 space-y-3">
                    <h4 className="font-bold flex items-center gap-2"><Paperclip size={16} />Anexos</h4>
                    {selectedExamDetails.anexos?.map((anexo: any) => (
                      <a key={anexo.id} className="block text-sm text-blue-700 underline" href={anexo.url} target="_blank" rel="noreferrer">{anexo.nome}</a>
                    ))}
                    <div className="space-y-2">
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleUploadAttachment}
                        disabled={attachmentUploading}
                        className="w-full p-2 border border-[#E7E5E4] rounded-lg text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#5A5A40] file:px-3 file:py-2 file:text-sm file:text-white disabled:opacity-50"
                      />
                      {attachmentUploading && (
                        <p className="text-sm text-[#78716C]">A carregar ficheiro...</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5E4] p-4 space-y-3">
                    <h4 className="font-bold flex items-center gap-2"><FileText size={16} />Notas internas</h4>
                    {selectedExamDetails.notasInternas?.map((nota: any) => (
                      <p key={nota.id} className="text-sm text-[#57534E] border-t border-[#E7E5E4] pt-2 first:border-t-0 first:pt-0">{nota.conteudo}</p>
                    ))}
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Nota interna do laboratório" className="w-full p-2 border border-[#E7E5E4] rounded-lg text-sm" />
                    <button type="button" onClick={handleCreateNote} disabled={loading} className="w-full px-3 py-2 rounded-lg bg-[#5A5A40] text-white text-sm">Guardar nota</button>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5E4] p-4 space-y-3">
                    <h4 className="font-bold flex items-center gap-2"><History size={16} />Auditoria</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {selectedExamDetails.auditoria?.map((log: any) => (
                        <p key={log.id} className="text-xs text-[#57534E]">{new Date(log.createdAt).toLocaleString('pt-PT')} · {log.acao}{log.de || log.para ? ` (${log.de || '-'} → ${log.para || '-'})` : ''}{log.detalhe ? ` · ${log.detalhe}` : ''}</p>
                      ))}
                    </div>
                    {isTecnico && selectedExamDetails.amostras?.some((amostra: any) => amostra.estado !== 'REJEITADA') && (
                      <div className="border-t border-[#E7E5E4] pt-3 space-y-2">
                        <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rejeição da amostra" className="w-full p-2 border border-red-200 rounded-lg text-sm" />
                        <button type="button" onClick={handleRejectFirstSample} disabled={loading} className="w-full px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50">Rejeitar amostra ativa</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isTecnico && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  O técnico pode consultar e inserir resultados, mas a validação e a emissão de relatório continuam reservadas ao veterinário.
                </div>
              )}

              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-[#E7E5E4] text-[#1C1917] rounded-lg hover:bg-[#F5F5F4] transition-colors"
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
