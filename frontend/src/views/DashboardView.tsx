import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { User, Pet, Appointment, LabExam } from '../types';
import {
  Plus,
  FileText,
  Settings,
  Users,
  Calendar,
  FlaskConical,
  CheckCircle2,
  Clock,
  Bed,
  Package,
  CreditCard,
  PawPrint,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../lib/utils';
import { StatCard, QuickActionButton, DashboardSection } from '../components/ui';
import { getInternamentosAtivos, type Internamento } from '../lib/internamentos';
import {
  getAdminMonthlyStats,
  getTecnicoDashboard,
  getVeterinarioDashboard,
  type AdminMonthlyStats,
  type TecnicoDashboard,
  type VeterinarioDashboard,
} from '../lib/rececao';

interface DashboardViewProps {
  user: User;
  onNewAppointment: () => void;
  onNewSample: () => void;
  onNewUser?: () => void;
  onNewOwner?: () => void;
  onNewAnimal?: () => void;
  onShowPatients?: () => void;
  onShowUsers?: () => void;
  onShowReports?: () => void;
  onShowSettings?: () => void;
  onShowInPatient?: () => void;
  onShowBilling?: () => void;
  onShowBillingPending?: () => void;
  onShowStock?: () => void;
  onShowLab?: () => void;
  onShowAppointments?: () => void;
  onShowCheckin?: () => void;
  patients: Pet[];
  appointments: Appointment[];
  exams: LabExam[];
}

type AdminChartStats = AdminMonthlyStats & {
  monthly: (AdminMonthlyStats['monthly'][number] & { label: string })[];
};

function isToday(dateTime: string): boolean {
  const [datePart] = dateTime.split(' ');
  if (!datePart) return false;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return datePart === `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(date).replace('.', '');
}

function getLastSixMonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return monthKey(date);
  });
}

function calculateTrend(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildSpeciesDistribution(patients: Pet[]): AdminMonthlyStats['species'] {
  return Object.entries(
    patients.reduce<Record<string, number>>((acc, pet) => {
      const speciesName = pet.species || 'Sem espécie';
      acc[speciesName] = (acc[speciesName] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([especie, total]) => ({ especie, total }));
}

function buildEmptyAdminStats(patients: Pet[]): AdminMonthlyStats {
  const monthly = getLastSixMonthKeys().map((mes) => ({
    mes,
    total: 0,
    concluidas: 0,
    receita: 0,
  }));

  return {
    monthly,
    species: buildSpeciesDistribution(patients),
    topMotivos: [],
    cards: {
      faturacaoMensal: 0,
      totalPacientes: patients.length,
      utilizadoresAtivos: 0,
      taxaOcupacao: 0,
    },
    trends: {
      faturacaoMensal: 0,
      totalPacientes: 0,
      utilizadoresAtivos: 0,
      taxaOcupacao: 0,
    },
  };
}

function prepareAdminChartStats(stats: AdminMonthlyStats, patients: Pet[]): AdminChartStats {
  const byMonth = new Map(stats.monthly.map((item) => [item.mes, item]));
  const monthly = getLastSixMonthKeys().map((mes) => {
    const point = byMonth.get(mes) ?? { mes, total: 0, concluidas: 0, receita: 0 };
    return { ...point, label: monthLabel(mes) };
  });

  const species = stats.species.length > 0 ? stats.species : buildSpeciesDistribution(patients);
  const current = monthly[monthly.length - 1] ?? { receita: 0, total: 0, concluidas: 0 };
  const previous = monthly[monthly.length - 2] ?? { receita: 0, total: 0, concluidas: 0 };

  return {
    monthly,
    species,
    topMotivos: stats.topMotivos ?? [],
    cards: {
      faturacaoMensal: stats.cards.faturacaoMensal ?? current.receita,
      totalPacientes: stats.cards.totalPacientes ?? patients.length,
      utilizadoresAtivos: stats.cards.utilizadoresAtivos ?? 0,
      taxaOcupacao: stats.cards.taxaOcupacao ?? 0,
    },
    trends: {
      faturacaoMensal: stats.trends.faturacaoMensal ?? calculateTrend(current.receita, previous.receita),
      totalPacientes: stats.trends.totalPacientes ?? 0,
      utilizadoresAtivos: stats.trends.utilizadoresAtivos ?? 0,
      taxaOcupacao: stats.trends.taxaOcupacao ?? calculateTrend(current.concluidas, previous.concluidas),
    },
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1).replace('.', ',')}%`;
}

function TrendStatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  trend?: number;
}) {
  const trendValue = trend ?? 0;
  const isUp = trendValue >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        <p className={cn(
          'mt-1 text-xs font-bold',
          isUp ? 'text-green-600' : 'text-red-600',
        )}>
          {isUp ? '↑' : '↓'} {formatPercent(trendValue)} vs mês anterior
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-4 sm:p-6 min-w-0">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  );
}

const pieColors = ['#5A5A40', '#78716C', '#A8A29E', '#D6D3D1', '#E7E5E4', '#F5F5F4'];

export function DashboardView({
  user,
  onNewAppointment,
  onNewSample,
  onNewUser,
  onNewOwner,
  onNewAnimal,
  onShowPatients,
  onShowUsers,
  onShowReports,
  onShowSettings,
  onShowInPatient,
  onShowBilling,
  onShowBillingPending,
  onShowStock,
  onShowLab,
  onShowAppointments,
  onShowCheckin,
  patients,
  appointments,
  exams,
}: DashboardViewProps) {
  const showAppointments = ['ADMIN', 'VETERINARIO', 'RECECIONISTA'].includes(user.role);
  const showLab = ['VETERINARIO', 'TECNICO'].includes(user.role);

  const [internamentosAtivos, setInternamentosAtivos] = useState<Internamento[]>([]);
  const [tecnicoDashboard, setTecnicoDashboard] = useState<TecnicoDashboard | null>(null);
  const [vetDashboard, setVetDashboard] = useState<VeterinarioDashboard | null>(null);
  const [adminMonthlyStats, setAdminMonthlyStats] = useState<AdminMonthlyStats | null>(null);

  useEffect(() => {
    if (user.role !== 'VETERINARIO') {
      setInternamentosAtivos([]);
      return;
    }

    let active = true;

    getInternamentosAtivos()
      .then((data) => {
        if (active) setInternamentosAtivos(data);
      })
      .catch(() => {
        if (active) setInternamentosAtivos([]);
      });

    return () => {
      active = false;
    };
  }, [user.role]);

  useEffect(() => {
    if (user.role !== 'VETERINARIO') {
      setVetDashboard(null);
      return;
    }

    let active = true;

    getVeterinarioDashboard()
      .then((data) => {
        if (active) setVetDashboard(data);
      })
      .catch(() => {
        if (active) setVetDashboard(null);
      });

    return () => {
      active = false;
    };
  }, [user.role]);

  useEffect(() => {
    if (user.role !== 'TECNICO') {
      setTecnicoDashboard(null);
      return;
    }

    let active = true;

    getTecnicoDashboard()
      .then((data) => {
        if (active) setTecnicoDashboard(data);
      })
      .catch(() => {
        if (active) setTecnicoDashboard(null);
      });

    return () => {
      active = false;
    };
  }, [user.role]);

  useEffect(() => {
    if (user.role !== 'ADMIN') {
      setAdminMonthlyStats(null);
      return;
    }

    let active = true;

    getAdminMonthlyStats()
      .then((data) => {
        if (active) setAdminMonthlyStats(data);
      })
      .catch(() => {
        if (active) setAdminMonthlyStats(null);
      });

    return () => {
      active = false;
    };
  }, [user.role]);

  const todayAppointments = useMemo(
    () => appointments.filter((a) => isToday(a.date)),
    [appointments],
  );

  const examesPorValidar = useMemo(
    () => exams.filter((e) => e.status === 'COMPLETED'),
    [exams],
  );

  const adminStats = useMemo(
    () => prepareAdminChartStats(adminMonthlyStats ?? buildEmptyAdminStats(patients), patients),
    [adminMonthlyStats, patients],
  );

  const maxSpeciesTotal = Math.max(...adminStats.species.map((item) => item.total), 1);
  const adminRecentAppointments = useMemo(
    () =>
      [...appointments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((appointment) => ({
          id: appointment.id,
          title: appointment.petName,
          subtitle: appointment.type,
          status: appointment.status,
          time: appointment.date.split(' ')[0] ?? appointment.date,
        })),
    [appointments],
  );
  const adminTopMotivos = useMemo(
    () =>
      adminStats.topMotivos.slice(0, 5).map((item, index) => ({
        id: `${item.motivo}-${index}`,
        title: item.motivo || 'Sem motivo',
        subtitle: `${item.total} marcação${item.total === 1 ? '' : 'ões'}`,
        status: 'INFO',
        time: `Top ${index + 1}`,
      })),
    [adminStats.topMotivos],
  );
  const tecnicoEstados = tecnicoDashboard?.examesPorEstado;
  const tecnicoStockAlerts = tecnicoDashboard?.alertasStock.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {user.name}</h1>
          <p className="text-[#78716C] mt-1">Aqui está o resumo da clínica para hoje.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {user.role === 'ADMIN' && (
          <>
            <QuickActionButton icon={Plus} label="Novo Utilizador" onClick={() => onNewUser?.()} />
            <QuickActionButton icon={FileText} label="Gerar Relatório" onClick={() => onShowReports?.()} />
            <QuickActionButton icon={Settings} label="Configurações" onClick={() => onShowSettings?.()} />
            <QuickActionButton icon={Users} label="Ver Staff" onClick={() => onShowUsers?.()} />
          </>
        )}

        {user.role === 'VETERINARIO' && (
          <>
            <QuickActionButton icon={Calendar} label="Agenda do Dia" onClick={() => onShowAppointments?.()} />
            <QuickActionButton icon={Users} label="Pacientes" onClick={() => onShowPatients?.()} />
            <QuickActionButton icon={FlaskConical} label="Laboratório" onClick={() => onShowLab?.()} />
            <QuickActionButton icon={Bed} label="Internamentos" onClick={() => onShowInPatient?.()} />
          </>
        )}

        {user.role === 'TECNICO' && (
          <>
            <QuickActionButton icon={Plus} label="Registar Amostra" onClick={onNewSample} />
            <QuickActionButton icon={CheckCircle2} label="Resultados" onClick={() => onShowLab?.()} />
            <QuickActionButton icon={Package} label="Stock Reagentes" onClick={() => onShowStock?.()} />
            <QuickActionButton icon={FlaskConical} label="Laboratório" onClick={() => onShowLab?.()} />
          </>
        )}

        {user.role === 'RECECIONISTA' && (
          <>
            <QuickActionButton icon={Plus} label="Nova Marcação" onClick={onNewAppointment} />
            <QuickActionButton icon={Users} label="Registar Dono" onClick={() => onNewOwner?.()} />
            <QuickActionButton icon={PawPrint} label="Registar Animal" onClick={() => onNewAnimal?.()} />
            <QuickActionButton icon={CreditCard} label="Emitir Fatura" onClick={() => onShowBilling?.()} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === 'ADMIN' ? (
          <>
            <TrendStatCard
              label="Faturação Mensal"
              value={formatCurrency(adminStats.cards.faturacaoMensal ?? 0)}
              icon={FileText}
              color="bg-green-50 text-green-600"
              trend={adminStats.trends.faturacaoMensal}
            />
            <TrendStatCard
              label="Total Pacientes"
              value={String(adminStats.cards.totalPacientes ?? patients.length)}
              icon={PawPrint}
              color="bg-blue-50 text-blue-600"
              trend={adminStats.trends.totalPacientes}
            />
            <TrendStatCard
              label="Utilizadores Ativos"
              value={String(adminStats.cards.utilizadoresAtivos ?? 14)}
              icon={Users}
              color="bg-purple-50 text-purple-600"
              trend={adminStats.trends.utilizadoresAtivos}
            />
            <TrendStatCard
              label="Taxa de Ocupação"
              value={`${adminStats.cards.taxaOcupacao ?? 85}%`}
              icon={Clock}
              color="bg-orange-50 text-orange-600"
              trend={adminStats.trends.taxaOcupacao}
            />
          </>
        ) : user.role === 'VETERINARIO' ? (
          <>
            <StatCard label="Marcações Hoje" value={(vetDashboard?.totais.marcacoesHoje ?? todayAppointments.length).toString()} icon={Calendar} color="bg-blue-50 text-blue-600" />
            <StatCard label="Resultados por Validar" value={(vetDashboard?.totais.examesPorValidar ?? examesPorValidar.length).toString()} icon={FlaskConical} color="bg-orange-50 text-orange-600" />
            <StatCard label="Internamentos Ativos" value={(vetDashboard?.totais.internamentosAtivos ?? 0).toString()} icon={Bed} color="bg-red-50 text-red-600" />
            <StatCard label="Alertas de Vacinas" value={(vetDashboard?.totais.alertasVacinas ?? 0).toString()} icon={Bell} color="bg-amber-50 text-amber-600" />
          </>
        ) : user.role === 'TECNICO' ? (
          <>
            <StatCard label="Exames Pendentes" value={(tecnicoEstados?.PENDENTE ?? 0).toString()} icon={FlaskConical} color="bg-orange-50 text-orange-600" />
            <StatCard label="Em Processamento" value={(tecnicoEstados?.AMOSTRA_COLETADA ?? 0).toString()} icon={Clock} color="bg-blue-50 text-blue-600" />
            <StatCard label="Aguardam Validação" value={(tecnicoEstados?.CONCLUIDO ?? 0).toString()} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Concluídos Hoje" value={(tecnicoDashboard?.examesConcluidosHoje ?? 0).toString()} icon={Bell} color="bg-purple-50 text-purple-600" />
          </>
        ) : (
          <>
            <button type="button" onClick={() => onShowAppointments?.()} className="w-full text-left transition-transform hover:-translate-y-0.5">
              <StatCard label="Marcações Hoje" value={todayAppointments.length.toString()} icon={Calendar} color="bg-blue-50 text-blue-600" />
            </button>
            <button type="button" onClick={() => onShowCheckin?.()} className="w-full text-left transition-transform hover:-translate-y-0.5">
              <StatCard label="Check-ins Pendentes" value="4" icon={Clock} color="bg-orange-50 text-orange-600" />
            </button>
            <button type="button" onClick={() => onShowPatients?.()} className="w-full text-left transition-transform hover:-translate-y-0.5">
              <StatCard label="Novos Clientes" value="2" icon={Users} color="bg-green-50 text-green-600" />
            </button>
            <button type="button" onClick={() => onShowBillingPending?.()} className="w-full text-left transition-transform hover:-translate-y-0.5">
              <StatCard label="Pagamentos Pendentes" value="3" icon={FileText} color="bg-red-50 text-red-600" />
            </button>
          </>
        )}
      </div>

      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Marcações dos últimos 6 meses">
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminStats.monthly} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill="#A8A29E" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="concluidas" name="Concluídas" fill="#5A5A40" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Receita mensal">
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adminStats.monthly} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Number(value).toLocaleString('pt-PT')}€`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="#5A5A40" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Distribuição por espécie">
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={adminStats.species} dataKey="total" nameKey="especie" innerRadius={46} outerRadius={78} paddingAngle={2}>
                      {adminStats.species.map((entry, index) => (
                        <Cell key={entry.especie} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 min-w-0">
                {adminStats.species.length === 0 && (
                  <p className="text-sm text-[#78716C]">Sem dados de espécies.</p>
                )}
                {adminStats.species.map((item) => (
                  <div key={item.especie} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold truncate">{item.especie}</span>
                      <span className="text-[#78716C] shrink-0">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F5F5F4] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#5A5A40]"
                        style={{ width: `${Math.max(6, (item.total / maxSpeciesTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      <div
        className={cn(
          'grid grid-cols-1 gap-8',
          showAppointments && showLab ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
        )}
      >
        {user.role === 'RECECIONISTA' && (
          <>
            <DashboardSection
              title="Sala de Espera"
              actionLabel="Ver todos"
              onAction={onShowCheckin}
              items={[
                { id: '1', title: 'Bobi', subtitle: 'Dono: João Silva', status: 'WAITING', time: '10:05' },
                { id: '2', title: 'Luna', subtitle: 'Dono: Maria Santos', status: 'ARRIVED', time: '10:15' },
              ]}
            />
            <DashboardSection
              title="Marcações do Dia"
              actionLabel="Ver agenda"
              onAction={onShowAppointments}
              items={todayAppointments.map((a) => ({
                id: a.id,
                title: a.petName,
                subtitle: a.type,
                status: a.status,
                time: a.date.split(' ')[1] ?? '--:--',
              }))}
            />
          </>
        )}

        {user.role === 'VETERINARIO' && (
          <>
            {(vetDashboard?.totais.alertasVacinas ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => onShowPatients?.()}
                className="lg:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <AlertTriangle size={20} />
                  {vetDashboard!.totais.alertasVacinas} alerta{vetDashboard!.totais.alertasVacinas === 1 ? '' : 's'} de vacina{vetDashboard!.totais.alertasVacinas === 1 ? '' : 's'} — próximas doses vencidas ou a vencer em 30 dias
                </span>
                <span className="text-sm font-bold">Ver pacientes</span>
              </button>
            )}
            <DashboardSection
              title="Agenda Clínica de Hoje"
              actionLabel="Ver marcações"
              onAction={onShowAppointments}
              items={
                vetDashboard
                  ? vetDashboard.marcacoesHoje.map((m) => ({
                      id: String(m.id),
                      title: m.animal?.nome ?? `Marcação #${m.id}`,
                      subtitle: m.motivo ?? m.animal?.especie ?? 'Consulta',
                      status: m.estado === 'CONCLUIDA' ? 'DONE' : m.estado === 'CONFIRMADA' ? 'ARRIVED' : 'PENDING',
                      time: new Date(m.hora).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                    }))
                  : todayAppointments.map((a) => ({
                      id: a.id,
                      title: a.petName,
                      subtitle: a.type,
                      status: a.status,
                      time: a.date.split(' ')[1] ?? '--:--',
                    }))
              }
            />
            <DashboardSection
              title="Resultados por Validar"
              actionLabel="Ir para Laboratório"
              onAction={onShowLab}
              items={
                vetDashboard
                  ? vetDashboard.examesPorValidar.map((e) => ({
                      id: String(e.id),
                      title: e.animal?.nome ?? `Exame #${e.id}`,
                      subtitle: e.tipo,
                      status: e.prioridade === 'ALTA' ? 'BUSY' : 'READY',
                      time: e.prioridade === 'ALTA' ? 'Urgente' : 'Normal',
                    }))
                  : examesPorValidar.map((e) => ({
                      id: e.id,
                      title: e.petName,
                      subtitle: e.type,
                      status: 'READY',
                      time: 'Disponível',
                    }))
              }
            />
          </>
        )}

        {user.role === 'TECNICO' && (
          <>
            {tecnicoStockAlerts > 0 && (
              <button
                type="button"
                onClick={() => onShowStock?.()}
                className="lg:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <AlertTriangle size={20} />
                  {tecnicoStockAlerts} alerta{tecnicoStockAlerts === 1 ? '' : 's'} de stock ativo{tecnicoStockAlerts === 1 ? '' : 's'}
                </span>
                <span className="text-sm font-bold">Ver stock</span>
              </button>
            )}
            <DashboardSection
              title="Exames Pendentes Mais Antigos"
              actionLabel="Ir para Laboratório"
              onAction={onShowLab}
              items={(tecnicoDashboard?.examesPendentesAntigos ?? []).map((e) => ({
                id: String(e.id),
                title: e.animal?.nome ?? `Exame #${e.id}`,
                subtitle: e.tipo,
                status: 'PENDING',
                time: new Date(e.dataPedido).toLocaleDateString('pt-PT'),
              }))}
            />
            <DashboardSection
              title="Alertas de Stock"
              actionLabel="Ver Stock"
              onAction={onShowStock}
              items={(tecnicoDashboard?.alertasStock ?? []).slice(0, 5).map((item) => ({
                id: String(item.id),
                title: item.nome,
                subtitle: item.baixoStock ? `Stock baixo: ${item.quantidade} ${item.unidade}` : item.categoria,
                status: 'BUSY',
                time: item.validadeAlerta ? 'Validade' : 'Stock',
              }))}
            />
          </>
        )}

        {user.role === 'ADMIN' && (
          <>
            <DashboardSection
              title="Marcações Recentes"
              actionLabel="Ver Agenda"
              onAction={onShowAppointments}
              items={adminRecentAppointments}
            />
            <DashboardSection
              title="Top Motivos de Marcação"
              actionLabel="Ver Relatórios"
              onAction={onShowReports}
              items={adminTopMotivos}
            />
          </>
        )}
      </div>
    </div>
  );
}
