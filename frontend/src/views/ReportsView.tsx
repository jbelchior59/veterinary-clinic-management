import { useEffect, useMemo, useState } from 'react';
import { User, Pet, Appointment, LabExam } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  createRelatorio,
  formatAxiosError,
  getExames,
  type Exame,
  type Relatorio,
} from '../lib/exames';
import { printHtml } from '../lib/printUtils';

interface ReportsViewProps {
  user: User;
  patients: Pet[];
  appointments: Appointment[];
  exams: LabExam[];
  onExport: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case 'VALIDADO':
      return 'Validado';
    case 'CONCLUIDO':
      return 'Concluído';
    case 'EM_ANALISE':
      return 'Em análise';
    case 'AMOSTRA_COLETADA':
      return 'Amostra recolhida';
    case 'PENDENTE':
      return 'Pendente';
    default:
      return status;
  }
}

function isReportable(exame: Exame) {
  const resultados = exame.resultados ?? [];
  return !exame.relatorio && resultados.length > 0 && resultados.every((r) => r.validado);
}

function exportRelatoriosCSV(relatorios: Relatorio[]) {
  const headers = ['ID', 'Animal', 'Tipo de Exame', 'Data de Emissão', 'Veterinário', 'Conclusão'];
  const rows = relatorios.map((r) => [
    r.id,
    r.exame?.animal?.nome ?? '',
    r.exame?.tipo ?? '',
    r.dataEmissao ?? r.createdAt ?? '',
    r.emitidoPor?.nome ?? r.emitidoPor?.email ?? '',
    `"${(r.conclusao ?? '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorios_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function paragraphHtml(value?: string | null) {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

export function ReportsView({ user, patients, appointments, exams, onExport }: ReportsViewProps) {
  const [allExames, setAllExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Relatorio | null>(null);
  const [selectedExame, setSelectedExame] = useState<Exame | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    conclusao: '',
    observacoes: '',
    recomendacoes: '',
  });

  async function loadExames() {
    setLoading(true);
    setError(null);

    try {
      const data = await getExames();
      setAllExames(data);
    } catch (e) {
      setAllExames([]);
      setError(formatAxiosError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExames();
  }, []);

  const relatorios = useMemo(
    () =>
      allExames
        .flatMap((exame) =>
          exame.relatorio ? [{ ...exame.relatorio, exame }] : [],
        )
        .sort(
          (a, b) =>
            new Date(b.dataEmissao ?? b.createdAt ?? '').getTime() -
            new Date(a.dataEmissao ?? a.createdAt ?? '').getTime(),
        ),
    [allExames],
  );

  const examesProntosParaRelatorio = useMemo(
    () => allExames.filter(isReportable),
    [allExames],
  );

  function openReportForm(exame: Exame) {
    setSelectedExame(exame);
    setForm({
      conclusao: exame.resultados?.[0]?.dados ?? '',
      observacoes: exame.descricaoClinica ?? '',
      recomendacoes: '',
    });
  }

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedExame) return;

    if (!form.conclusao.trim()) {
      setError('A conclusão do relatório é obrigatória.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createRelatorio({
        exameId: selectedExame.id,
        conclusao: form.conclusao.trim(),
        observacoes: form.observacoes.trim() || undefined,
        recomendacoes: form.recomendacoes.trim() || undefined,
      });

      setSelectedExame(null);
      setForm({ conclusao: '', observacoes: '', recomendacoes: '' });
      await loadExames();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setCreating(false);
    }
  }

  function handlePrintReport(relatorio: Relatorio) {
    const animal = relatorio.exame?.animal?.nome ?? 'Animal nao identificado';
    const exame = relatorio.exame?.tipo ?? `Exame #${relatorio.exameId}`;
    const emissao = formatDate(relatorio.dataEmissao ?? relatorio.createdAt);
    const emitidoPor = relatorio.emitidoPor?.nome ?? relatorio.emitidoPor?.email ?? 'Veterinario';

    printHtml(
      `
        <div class="fatura-header">
          <div>
            <div class="brand-name">VetCare</div>
            <div class="brand-sub">Relatorio Clinico Veterinario</div>
          </div>
          <div class="header-title-block">
            <div class="doc-title">Relatorio Clinico</div>
            <div class="doc-subtitle">${escapeHtml(exame)}</div>
            <div class="doc-note">Relatorio #${escapeHtml(relatorio.id)}</div>
          </div>
          <div class="header-meta">
            <div class="header-meta-row"><strong>Data:</strong> ${escapeHtml(emissao)}</div>
            <div class="header-meta-row"><strong>Emitido por:</strong> ${escapeHtml(emitidoPor)}</div>
          </div>
        </div>

        <div class="client-strip">
          <div class="client-field"><strong>Animal:</strong> ${escapeHtml(animal)}</div>
          <div class="client-field"><strong>Exame:</strong> ${escapeHtml(exame)}</div>
          <div class="client-field"><strong>ID:</strong> ${escapeHtml(relatorio.id)}</div>
        </div>

        <section class="section">
          <div class="section-header">Conclusao</div>
          <div style="border: 1px solid #ccc; border-top: none; padding: 10px; line-height: 1.5; font-size: 11px;">
            ${paragraphHtml(relatorio.conclusao)}
          </div>
        </section>

        ${
          relatorio.observacoes
            ? `
              <section class="section">
                <div class="section-header">Observacoes</div>
                <div style="border: 1px solid #ccc; border-top: none; padding: 10px; line-height: 1.5; font-size: 11px;">
                  ${paragraphHtml(relatorio.observacoes)}
                </div>
              </section>
            `
            : ''
        }

        ${
          relatorio.recomendacoes
            ? `
              <section class="section">
                <div class="section-header">Recomendacoes</div>
                <div style="border: 1px solid #ccc; border-top: none; padding: 10px; line-height: 1.5; font-size: 11px;">
                  ${paragraphHtml(relatorio.recomendacoes)}
                </div>
              </section>
            `
            : ''
        }

        <div class="fatura-footer">
          <div class="footer-brand">VetCare</div>
          <div class="footer-note">Documento emitido automaticamente.</div>
        </div>
      `,
      `Relatorio - ${animal}`,
    );
  }

  const validatedExams = allExames.filter((e) => e.estado === 'VALIDADO').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Clínicos</h1>
          <p className="text-[#78716C] mt-1">
            Consulta e emissão de relatórios clínicos associados a exames laboratoriais.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => void loadExames()}
            disabled={loading}
            className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button
            onClick={() => exportRelatoriosCSV(relatorios)}
            disabled={relatorios.length === 0}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <h3 className="font-bold mb-2">Total Pacientes</h3>
          <p className="text-3xl font-bold text-[#5A5A40]">{patients.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <h3 className="font-bold mb-2">Marcações Ativas</h3>
          <p className="text-3xl font-bold text-[#5A5A40]">{appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <h3 className="font-bold mb-2">Exames Validados</h3>
          <p className="text-3xl font-bold text-[#5A5A40]">{validatedExams || exams.filter((e) => e.status === 'VALIDATED').length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm">
          <h3 className="font-bold mb-2">Relatórios Emitidos</h3>
          <p className="text-3xl font-bold text-[#5A5A40]">{relatorios.length}</p>
        </div>
      </div>

      {user.role === 'VETERINARIO' && (
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E7E5E4] flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg">Exames prontos para relatório</h2>
              <p className="text-sm text-[#78716C]">
                Apenas exames com resultados validados podem gerar relatório clínico.
              </p>
            </div>
            <span className="text-xs font-bold uppercase bg-[#F5F5F4] text-[#57534E] px-3 py-1 rounded-full">
              {examesProntosParaRelatorio.length} pendente(s)
            </span>
          </div>

          {examesProntosParaRelatorio.length === 0 ? (
            <div className="p-8 text-center text-[#78716C]">
              Não existem exames validados sem relatório.
            </div>
          ) : (
            <div className="divide-y divide-[#E7E5E4]">
              {examesProntosParaRelatorio.map((exame) => (
                <div key={exame.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#1C1917]">{exame.animal?.nome ?? `Animal #${exame.animalId}`}</p>
                    <p className="text-sm text-[#78716C]">
                      {exame.tipo} · {statusLabel(exame.estado)} · Pedido em {formatDate(exame.dataPedido)}
                    </p>
                    <p className="text-sm text-[#57534E] mt-1">
                      Dono: {exame.animal?.dono?.nome ?? 'Sem dono'}
                    </p>
                  </div>

                  <button
                    onClick={() => openReportForm(exame)}
                    className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
                  >
                    <Plus size={16} />
                    Emitir relatório
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E5E4]">
          <h2 className="font-bold text-lg">Relatórios emitidos</h2>
          <p className="text-sm text-[#78716C]">Histórico de relatórios clínicos já criados.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#78716C]">A carregar relatórios...</div>
        ) : relatorios.length === 0 ? (
          <div className="p-8 text-center text-[#78716C]">Ainda não existem relatórios emitidos.</div>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {relatorios.map((relatorio) => (
              <div key={relatorio.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-[#1C1917]">
                    {relatorio.exame?.animal?.nome ?? 'Animal não identificado'} · {relatorio.exame?.tipo ?? `Exame #${relatorio.exameId}`}
                  </p>
                  <p className="text-sm text-[#78716C]">
                    Emitido em {formatDate(relatorio.dataEmissao ?? relatorio.createdAt)} por {relatorio.emitidoPor?.nome ?? relatorio.emitidoPor?.email ?? 'Veterinário'}
                  </p>
                  <p className="text-sm text-[#57534E] line-clamp-2">{relatorio.conclusao}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedReport(relatorio)}
                    className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors"
                  >
                    <Eye size={16} />
                    Ver
                  </button>

                  <button
                    onClick={() => handlePrintReport(relatorio)}
                    className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors"
                  >
                    <Download size={16} />
                    Imprimir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedExame && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleCreateReport(e)}
            className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] max-w-2xl w-full p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Emitir relatório clínico</h2>
                <p className="text-sm text-[#78716C] mt-1">
                  {selectedExame.animal?.nome ?? `Animal #${selectedExame.animalId}`} · {selectedExame.tipo}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedExame(null)}>
                <X size={22} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Conclusão *</label>
              <textarea
                value={form.conclusao}
                onChange={(e) => setForm((prev) => ({ ...prev, conclusao: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Recomendações</label>
              <textarea
                value={form.recomendacoes}
                onChange={(e) => setForm((prev) => ({ ...prev, recomendacoes: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedExame(null)}
                className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                {creating ? 'A emitir...' : 'Emitir relatório'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4 print:bg-white print:static print:block">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] max-w-3xl w-full p-8 space-y-6 print:shadow-none print:border-none print:max-w-none">
            <div className="flex items-start justify-between gap-4 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Relatório clínico</h2>
                <p className="text-sm text-[#78716C] mt-1">Relatório #{selectedReport.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)}>
                <X size={22} />
              </button>
            </div>

            <div className="border-b border-[#E7E5E4] pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#78716C] mb-3">
                <FileText size={16} /> Relatório Clínico Veterinário
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917]">
                {selectedReport.exame?.animal?.nome ?? 'Animal não identificado'}
              </h1>
              <p className="text-[#78716C] mt-1">
                {selectedReport.exame?.tipo ?? `Exame #${selectedReport.exameId}`} · Emitido em {formatDate(selectedReport.dataEmissao ?? selectedReport.createdAt)}
              </p>
            </div>

            <section>
              <h3 className="font-bold text-[#1C1917] mb-2">Conclusão</h3>
              <p className="text-[#44403C] whitespace-pre-wrap leading-relaxed">{selectedReport.conclusao}</p>
            </section>

            {selectedReport.observacoes && (
              <section>
                <h3 className="font-bold text-[#1C1917] mb-2">Observações</h3>
                <p className="text-[#44403C] whitespace-pre-wrap leading-relaxed">{selectedReport.observacoes}</p>
              </section>
            )}

            {selectedReport.recomendacoes && (
              <section>
                <h3 className="font-bold text-[#1C1917] mb-2">Recomendações</h3>
                <p className="text-[#44403C] whitespace-pre-wrap leading-relaxed">{selectedReport.recomendacoes}</p>
              </section>
            )}

            <div className="text-sm text-[#78716C] border-t border-[#E7E5E4] pt-4">
              Emitido por: {selectedReport.emitidoPor?.nome ?? selectedReport.emitidoPor?.email ?? 'Veterinário'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
