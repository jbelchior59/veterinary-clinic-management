import { useEffect, useState } from 'react';
import {
  UserCheck,
  Clock,
  PawPrint,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Phone,
} from 'lucide-react';
import {
  getMarcacoesHoje,
  confirmarMarcacao,
  cancelarMarcacao,
  formatAxiosError,
  type Marcacao,
} from '../lib/marcacoes';
import { cn } from '../lib/utils';
import type { User } from '../types';

interface CheckInViewProps {
  user: User;
}

function estadoBadgeClass(estado: string) {
  if (estado === 'AGENDADA') return 'bg-orange-100 text-orange-700';
  if (estado === 'CONFIRMADA') return 'bg-blue-100 text-blue-700';
  if (estado === 'CANCELADA') return 'bg-red-100 text-red-700';
  if (estado === 'CONCLUIDA') return 'bg-green-100 text-green-700';
  return 'bg-stone-100 text-stone-700';
}

function estadoLabel(estado: string) {
  if (estado === 'AGENDADA') return 'Agendada';
  if (estado === 'CONFIRMADA') return '✓ Em Espera';
  if (estado === 'CANCELADA') return 'Cancelada';
  if (estado === 'CONCLUIDA') return 'Concluída';
  return estado;
}

function formatHora(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export function CheckInView({ user }: CheckInViewProps) {
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const canManage = ['ADMIN', 'RECECIONISTA'].includes(user.role);

  async function loadHoje() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarcacoesHoje();
      setMarcacoes(data);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadHoje(); }, []);

  async function handleConfirmar(id: number) {
    setActionId(id); setError(null); setSuccess(null);
    try {
      await confirmarMarcacao(id);
      setSuccess('Check-in realizado — paciente em espera.');
      await loadHoje();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setActionId(null); }
  }

  async function handleCancelar(id: number) {
    if (!window.confirm('Cancelar esta marcação?')) return;
    setActionId(id); setError(null); setSuccess(null);
    try {
      await cancelarMarcacao(id);
      setSuccess('Marcação cancelada.');
      await loadHoje();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setActionId(null); }
  }

  const emEspera = marcacoes.filter((m) => m.estado === 'CONFIRMADA');
  const agendadas = marcacoes.filter((m) => m.estado === 'AGENDADA');

  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-in & Fluxo do Dia</h1>
          <p className="text-[#78716C] mt-1 capitalize">{today}</p>
        </div>
        <button onClick={() => void loadHoje()} disabled={loading}
          className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors disabled:opacity-50 w-fit">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-5">
          <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider mb-1">Total Hoje</p>
          <p className="text-3xl font-bold text-[#1C1917]">{marcacoes.length}</p>
          <p className="text-xs text-[#78716C] mt-1">marcações</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-5">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Em Espera</p>
          <p className="text-3xl font-bold text-blue-700">{emEspera.length}</p>
          <p className="text-xs text-blue-500 mt-1">prontos</p>
        </div>
        <div className="bg-orange-50 rounded-2xl border border-orange-100 shadow-sm p-5">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Por Chegar</p>
          <p className="text-3xl font-bold text-orange-700">{agendadas.length}</p>
          <p className="text-xs text-orange-500 mt-1">aguardados</p>
        </div>
      </div>

      {/* Fila de espera */}
      {emEspera.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
            <UserCheck size={20} className="text-blue-600" />
            <h2 className="font-bold text-blue-800">Pacientes em Espera ({emEspera.length})</h2>
          </div>
          <div className="divide-y divide-[#E7E5E4]">
            {emEspera.map((m) => (
              <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <PawPrint size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1917]">{m.animal.nome}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">Em Espera</span>
                    </div>
                    <p className="text-sm text-[#78716C]">Dono: {m.animal.dono.nome}</p>
                    {m.animal.dono.telefone && (
                      <p className="text-xs text-[#A8A29E] flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {m.animal.dono.telefone}
                      </p>
                    )}
                    <p className="text-xs text-[#57534E]">{m.motivo} · <span className="text-[#A8A29E]">{formatHora(m.data)}</span></p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => void handleCancelar(m.id)} disabled={actionId === m.id}
                      className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marcações agendadas para hoje */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center gap-3">
          <Clock size={20} className="text-[#5A5A40]" />
          <h2 className="font-bold text-[#1C1917]">Agenda de Hoje</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#78716C]">A carregar agenda...</div>
        ) : marcacoes.length === 0 ? (
          <div className="p-10 text-center">
            <Clock size={40} className="text-[#D6D3D1] mx-auto mb-3" />
            <p className="text-[#78716C] text-sm">Sem marcações para hoje.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {marcacoes.map((m) => (
              <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9]">
                <div className="flex items-center gap-3">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-lg font-bold text-[#1C1917]">{formatHora(m.data)}</p>
                  </div>
                  <div className="w-px h-10 bg-[#E7E5E4] shrink-0" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#F5F5F4] rounded-xl flex items-center justify-center text-[#5A5A40] shrink-0">
                      <PawPrint size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1C1917]">{m.animal.nome}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase', estadoBadgeClass(m.estado))}>
                          {estadoLabel(m.estado)}
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C]">{m.motivo} · {m.animal.dono.nome}</p>
                    </div>
                  </div>
                </div>

                {canManage && m.estado === 'AGENDADA' && (
                  <button onClick={() => void handleConfirmar(m.id)} disabled={actionId === m.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0">
                    <UserCheck size={15} />
                    {actionId === m.id ? 'A registar...' : 'Dar Entrada'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
