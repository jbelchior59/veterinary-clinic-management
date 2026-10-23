import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Pencil,
  Phone,
  Printer,
  Plus,
  PawPrint,
  Receipt,
  Search,
    ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { User, Pet, Appointment } from '../types';
import { updateAnimal } from '../lib/animais';
import { updateDono, createDono } from '../lib/donos';
import { createAnimal } from '../lib/animais';
import {
  cancelarMarcacao,
  confirmarMarcacao,
  concluirMarcacao,
  createMarcacao,
  formatAxiosError,
  formatarDataMarcacao,
  getMarcacoesAtivas,
  getMarcacoesHoje,
  getHistoricoMarcacoes,
  updateMarcacao,
  type Marcacao,
} from '../lib/marcacoes';
import {
  addComunicacao,
  addFatura,
  addHorario,
  deleteComunicacao,
  getAllFaturas,
  getComunicacoes,
  getFaturaDetalhada,
  getFaturas,
  getHorarios,
  getNotaAdmin,
  getProfissionais,
  registarPagamento,
  saveNotaAdmin,
  updateComunicacao,
  updateHorarioEstado,
  type Comunicacao,
  type Fatura,
  type FaturaDetalhada,
  type FaturaLinha,
  type HorarioProfissional,
  type RececaoTab,
  type ServicoCatalogo,
  type Profissional,
  getServicos,
} from '../lib/rececao';
import { cn } from '../lib/utils';
import { printDiv } from '../lib/printUtils';
import { getSocket } from '../lib/socket';
import { getClinicaInfo } from '../lib/clinicaInfo';
import { Modal } from '../components/ui';

interface RececaoViewProps {
  user: User;
  initialTab: RececaoTab;
  patients: Pet[];
  appointments: Appointment[];
  onRefreshData: () => Promise<void>;
  autoOpenAction?: {
    action: 'appointment' | 'owner' | 'animal' | 'invoice' | 'communication';
    token: number;
  } | null;
  onAutoOpenHandled?: () => void;
}

type CalendarMode = 'day' | 'week' | 'month';
type RegisterMode = 'owner' | 'animal' | null;

type AppointmentForm = {
  animalId: string;
  data: string;
  motivo: string;
  servicoId: string;
  profissionalId: string;
};

type OwnerForm = {
  nome: string;
  email: string;
  telefone: string;
};

type AnimalRegisterForm = {
  nome: string;
  especie: string;
  raca: string;
  genero: 'M' | 'F';
  dataNascimento: string;
  peso: string;
  donoId: string;
  donoNome: string;
  donoEmail: string;
  donoTelefone: string;
};

type PatientForm = {
  animalId: number | null;
  nome: string;
  especie: string;
  raca: string;
  genero: 'M' | 'F';
  dataNascimento: string;
  peso: string;
  donoNome: string;
  donoEmail: string;
  donoTelefone: string;
  nota: string;
};

type CommunicationForm = {
  animalId: string;
  tipo: string;
  canal: string;
  assunto: string;
  mensagem: string;
};

type InvoiceLine = {
  servicoId?: string;
  descricao: string;
  quantidade: string;
  precoUnit: string;
};

type InvoiceForm = {
  animalId: string;
  descricao: string;
  valor: string;
  dataVencimento: string;
  linhas: InvoiceLine[];
};

type ShiftForm = {
  userId: string;
  diaSemana: number;
  horaEntrada: string;
  horaSaida: string;
  ativo: boolean;
  estado: string;
  observacoes: string;
};

function parseDateTime(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShort(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function formatLong(date: Date) {
  return date.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function splitDateTime(value: string): { date: string; time: string } {
  if (!value) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    };
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function isTodayDate(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);

  return (
    today.getDate() === date.getDate() &&
    today.getMonth() === date.getMonth() &&
    today.getFullYear() === date.getFullYear()
  );
}

function statusBadge(status: string) {
  if (status === 'CONFIRMADA') return 'bg-blue-100 text-blue-700';
  if (status === 'CANCELADA') return 'bg-red-100 text-red-700';
  if (status === 'CONCLUIDA') return 'bg-green-100 text-green-700';
  return 'bg-amber-100 text-amber-700';
}

function statusLabel(status: string) {
  switch (status) {
    case 'CONFIRMADA': return 'Confirmada';
    case 'CANCELADA': return 'Cancelada';
    case 'CONCLUIDA': return 'Concluída';
    default: return 'Agendada';
  }
}

function appointmentStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return 'Concluída';
    case 'CANCELLED': return 'Cancelada';
    case 'CONFIRMED': return 'Em Espera';
    default: return 'Agendada';
  }
}

function appointmentStatusClass(status: string) {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-700';
    default: return 'bg-amber-100 text-amber-700';
  }
}

function getCheckinStatus(parsedDate: Date, appointment: Appointment) {
  const today = startOfDay(new Date());
  const day = startOfDay(parsedDate);

  if (appointment.status === 'COMPLETED') return { label: 'Concluída', className: 'bg-green-100 text-green-700' };
  if (appointment.status === 'CANCELLED') return { label: 'Cancelada', className: 'bg-red-100 text-red-700' };

  if (appointment.status === 'PENDING') {
    if (day.getTime() < today.getTime()) {
      return { label: 'Não compareceu', className: 'bg-stone-100 text-stone-700' };
    }
    if (day.getTime() === today.getTime() && parsedDate.getTime() < Date.now()) {
      return { label: 'Atrasado', className: 'bg-amber-100 text-amber-700' };
    }
  }

  if (appointment.status === 'CONFIRMED') {
    return { label: 'Em Espera', className: 'bg-blue-100 text-blue-700' };
  }

  return { label: 'Agendada', className: 'bg-amber-100 text-amber-700' };
}

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

const ESTADOS_PROFISSIONAIS = ['ATIVO', 'FOLGA', 'FERIAS', 'AUSENTE', 'EM_TREINO'] as const;

function estadoProfissionalLabel(estado: string) {
  switch (estado) {
    case 'ATIVO': return 'Ativo';
    case 'FOLGA': return 'Folga';
    case 'FERIAS': return 'Férias';
    case 'AUSENTE': return 'Ausente';
    case 'EM_TREINO': return 'Em treino';
    default: return estado;
  }
}

const TIPOS_COMUNICACAO = ['CHAMADA', 'PEDIDO', 'LEMBRETE', 'NOTA'];
const CANAIS_COMUNICACAO = ['TELEFONE', 'SMS', 'EMAIL', 'PRESENCIAL'];
const METODOS_PAGAMENTO = ['MULTIBANCO', 'MBWAY', 'NUMERARIO', 'CARTAO', 'TRANSFERENCIA'];

const TAB_HEADER_COPY: Record<RececaoTab, { title: string; description: string; actionLabel: string }> = {
  agenda: { title: 'Marcações', description: 'Ver marcações já agendadas, criar novas marcações e gerir a agenda do dia.', actionLabel: 'Criar marcação' },
  pacientes: { title: 'Pacientes & Donos', description: 'Ver fichas, registar donos, adicionar animais e editar dados existentes.', actionLabel: 'Registar' },
  checkin: { title: 'Check-in', description: 'Ver quem está pronto para entrar e consultar todas as marcações por ordem temporal.', actionLabel: 'Atualizar fila' },
  faturacao: { title: 'Faturação', description: 'Emitir faturas, registar pagamentos e consultar pendentes, pagas e todas as faturas.', actionLabel: 'Nova fatura' },
  comunicacao: { title: 'Comunicação', description: 'Criar e acompanhar chamadas, pedidos e lembretes da receção.', actionLabel: 'Novo registo' },
  profissionais: { title: 'Profissionais', description: 'Ver a equipa e o respetivo estado de serviço.', actionLabel: 'Alterar estado' },
};

function formatPaymentMethod(method: string): string {
  const lower = method.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatShortLabel(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : value;
}

function emptyAppointmentForm(): AppointmentForm {
  return { animalId: '', data: '', motivo: '', servicoId: '', profissionalId: '' };
}

function emptyOwnerForm(): OwnerForm {
  return { nome: '', email: '', telefone: '' };
}

function emptyAnimalRegisterForm(): AnimalRegisterForm {
  return { nome: '', especie: '', raca: '', genero: 'M', dataNascimento: '', peso: '', donoId: '', donoNome: '', donoEmail: '', donoTelefone: '' };
}

function emptyPatientForm(): PatientForm {
  return {
    animalId: null, nome: '', especie: '', raca: '', genero: 'M',
    dataNascimento: '', peso: '', donoNome: '', donoEmail: '', donoTelefone: '', nota: '',
  };
}

function emptyCommunicationForm(): CommunicationForm {
  return { animalId: '', tipo: 'CHAMADA', canal: 'TELEFONE', assunto: '', mensagem: '' };
}

function emptyInvoiceForm(): InvoiceForm {
  return { animalId: '', descricao: '', valor: '', dataVencimento: '', linhas: [] };
}

function emptyShiftForm(): ShiftForm {
  return { userId: '', diaSemana: 1, horaEntrada: '09:00', horaSaida: '17:00', ativo: true, estado: 'ATIVO', observacoes: '' };
}

function formatServicoLabel(servico: ServicoCatalogo): string {
  return `${servico.categoria} - ${servico.nome}`;
}

function findServicoIdFromMotivo(motivo: string, servicos: ServicoCatalogo[]): string {
  const normalized = motivo.trim().toLowerCase();
  const match = servicos.find((servico) => {
    const label = formatServicoLabel(servico).toLowerCase();
    return label === normalized || servico.nome.toLowerCase() === normalized;
  });
  return match ? String(match.id) : '';
}

type RececaoTabConfig = {
  id: RececaoTab;
  label: string;
  hint: string;
  icon: any;
};

const RECECAO_TABS: RececaoTabConfig[] = [
  { id: 'agenda', label: 'Agenda', hint: 'marcação', icon: Calendar },
  { id: 'pacientes', label: 'Pacientes', hint: 'registo', icon: Users },
  { id: 'checkin', label: 'Check-in', hint: 'fila', icon: UserCheck },
  { id: 'faturacao', label: 'Faturação', hint: 'cobrança', icon: CreditCard },
  { id: 'comunicacao', label: 'Comunicação', hint: 'mensagens', icon: Bell },
  { id: 'profissionais', label: 'Profissionais', hint: 'estado', icon: Phone },
];

export function RececaoView({ user, initialTab, patients, appointments, onRefreshData, autoOpenAction, onAutoOpenHandled }: RececaoViewProps) {
  const canManage = ['ADMIN', 'RECECIONISTA'].includes(user.role);
  const [activeTab, setActiveTab] = useState<RececaoTab>(initialTab);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('day');
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [loadingHoje, setLoadingHoje] = useState(false);
  const [marcacoesHoje, setMarcacoesHoje] = useState<Marcacao[]>([]);
  const [historicoMarcacoes, setHistoricoMarcacoes] = useState<Marcacao[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [editingProfessionalId, setEditingProfessionalId] = useState<number | null>(null);

  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>(emptyAppointmentForm());
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const [patientForm, setPatientForm] = useState<PatientForm>(emptyPatientForm());
  const [selectedPatient, setSelectedPatient] = useState<Pet | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [registerMode, setRegisterMode] = useState<RegisterMode>(null);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(emptyOwnerForm());
  const [animalRegisterForm, setAnimalRegisterForm] = useState<AnimalRegisterForm>(emptyAnimalRegisterForm());

  const [communicationForm, setCommunicationForm] = useState<CommunicationForm>(emptyCommunicationForm());
  const [editingCommunication, setEditingCommunication] = useState<Comunicacao | null>(null);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm());
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShiftForm());
  const [paymentModal, setPaymentModal] = useState<{ faturaId: string; valor: string; metodo: string } | null>(null);
  const [printFatura, setPrintFatura] = useState<FaturaDetalhada | null>(null);

  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [allFaturas, setAllFaturas] = useState<Fatura[]>([]);
  const [faturacaoView, setFaturacaoView] = useState<'pendentes' | 'pagas' | 'todas'>('pendentes');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState(false);
  const [horarios, setHorarios] = useState<HorarioProfissional[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [allUsers, setAllUsers] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [searchPatients, setSearchPatients] = useState('');
  const [searchAppointments, setSearchAppointments] = useState('');
  const [showRegisterChoices, setShowRegisterChoices] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!autoOpenAction) return;

    if (autoOpenAction.action === 'appointment') {
      setActiveTab('agenda');
      setShowAppointmentModal(true);
    } else if (autoOpenAction.action === 'communication') {
      setActiveTab('comunicacao');
      setShowCommunicationModal(true);
    } else if (autoOpenAction.action === 'invoice') {
      setActiveTab('faturacao');
      setShowInvoiceModal(true);
      setConfirmInvoice(false);
    } else if (autoOpenAction.action === 'owner') {
      setActiveTab('pacientes');
      setRegisterMode('owner');
      setShowPatientModal(true);
      setOwnerForm(emptyOwnerForm());
    } else if (autoOpenAction.action === 'animal') {
      setActiveTab('pacientes');
      setRegisterMode('animal');
      setShowPatientModal(true);
      setAnimalRegisterForm(emptyAnimalRegisterForm());
    }

    onAutoOpenHandled?.();
  }, [autoOpenAction?.token]);

  useEffect(() => {
    void loadData();
    void loadHoje();

    const socket = getSocket();
    const handleSync = () => { void loadHoje(); };
    socket.on('marcacao_criada', handleSync);
    socket.on('marcacao_atualizada', handleSync);

    return () => {
      socket.off('marcacao_criada', handleSync);
      socket.off('marcacao_atualizada', handleSync);
    };
  }, []);

  useEffect(() => {
    if (!selectedPatient) {
      setPatientForm(emptyPatientForm());
      return;
    }
    const note = getNotaAdmin(Number(selectedPatient.id));
    setPatientForm({
      animalId: Number(selectedPatient.id),
      nome: selectedPatient.name,
      especie: selectedPatient.species,
      raca: selectedPatient.breed ?? '',
      genero: selectedPatient.gender,
      dataNascimento: selectedPatient.birthDate ?? '',
      peso: selectedPatient.weight?.toString() ?? '',
      donoNome: selectedPatient.ownerName ?? '',
      donoEmail: selectedPatient.ownerEmail ?? '',
      donoTelefone: selectedPatient.ownerPhone ?? '',
      nota: note?.texto ?? '',
    });
  }, [selectedPatient]);

  useEffect(() => {
    if (!registerMode) {
      setOwnerForm(emptyOwnerForm());
      setAnimalRegisterForm(emptyAnimalRegisterForm());
    }
  }, [registerMode]);

  async function loadData() {
    const [comsResult, fatsResult, allFatsResult, horsResult, profsResult, servsResult, histResult] = await Promise.allSettled([
      getComunicacoes(),
      getFaturas(),
      getAllFaturas(),
      getHorarios(),
      getProfissionais(),
      getServicos(),
      getHistoricoMarcacoes(),
    ]);
    if (comsResult.status === 'fulfilled') setComunicacoes(comsResult.value);
    if (fatsResult.status === 'fulfilled') setFaturas(fatsResult.value);
    if (allFatsResult.status === 'fulfilled') setAllFaturas(allFatsResult.value);
    if (horsResult.status === 'fulfilled') setHorarios(horsResult.value);
    if (profsResult.status === 'fulfilled') {
      setProfissionais(profsResult.value);
      setAllUsers(profsResult.value);
    }
    if (servsResult.status === 'fulfilled') setServicos(servsResult.value);
    if (histResult.status === 'fulfilled') setHistoricoMarcacoes(histResult.value);
  }

  const patientLookup = useMemo(
    () => new Map(patients.map((pet) => [Number(pet.id), pet])),
    [patients],
  );

  const availableOwners = useMemo(() => {
    const seen = new Set<number>();
    return patients
      .filter((pet) => pet.ownerId && pet.ownerName)
      .map((pet) => ({
        id: Number(pet.ownerId),
        nome: pet.ownerName ?? '',
        email: pet.ownerEmail ?? '',
        telefone: pet.ownerPhone ?? '',
      }))
      .filter((owner) => {
        if (seen.has(owner.id)) return false;
        seen.add(owner.id);
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-PT'));
  }, [patients]);

  const latestHorarioByUser = useMemo(() => {
    const map = new Map<number, HorarioProfissional>();
    horarios.forEach((horario) => {
      map.set(horario.userId, horario);
    });
    return map;
  }, [horarios]);

  const activeProfessionals = useMemo(() => {
    return allUsers.filter((u) => u.role !== 'ADMIN' && (latestHorarioByUser.get(u.id)?.estado ?? 'ATIVO') === 'ATIVO');
  }, [allUsers, latestHorarioByUser]);

  const allProfessionals = useMemo(() => [...allUsers].filter((u) => u.role !== 'ADMIN').sort((a, b) => {
    const aActive = (latestHorarioByUser.get(a.id)?.estado ?? 'ATIVO') === 'ATIVO' ? 0 : 1;
    const bActive = (latestHorarioByUser.get(b.id)?.estado ?? 'ATIVO') === 'ATIVO' ? 0 : 1;
    return aActive - bActive || (a.nome ?? a.email).localeCompare(b.nome ?? b.email, 'pt-PT');
  }), [allUsers, latestHorarioByUser]);

  const paidInvoicesSorted = useMemo(() => {
    return [...allFaturas]
      .filter((fatura) => fatura.estado === 'PAGA')
      .sort((a, b) => {
        const aLast = new Date(a.pagamentos?.[a.pagamentos.length - 1]?.dataPagamento ?? a.createdAt).getTime();
        const bLast = new Date(b.pagamentos?.[b.pagamentos.length - 1]?.dataPagamento ?? b.createdAt).getTime();
        return bLast - aLast;
      });
  }, [allFaturas]);

  const allAppointments = useMemo(() => {
    const merged = [...appointments, ...historicoMarcacoes.map(mapMarcacaoToAppointment)];
    const byId = new Map<string, Appointment>();
    merged.forEach((appointment) => byId.set(appointment.id, appointment));
    return [...byId.values()];
  }, [appointments, historicoMarcacoes]);

  const appointmentsSorted = useMemo(
    () =>
      allAppointments
        .map((appointment) => ({ appointment, parsedDate: parseDateTime(appointment.date) }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()),
    [allAppointments],
  );

  const appointmentByDay = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointmentsSorted.forEach(({ appointment, parsedDate }) => {
      const key = dateKey(parsedDate);
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(appointment);
    });
    return grouped;
  }, [appointmentsSorted]);

  const todayKey = dateKey(currentDate);
  const weekStart = startOfWeek(currentDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const visibleAppointments = useMemo(() => {
    const dateFiltered = appointmentsSorted.filter(({ parsedDate }) => {
      if (calendarMode === 'day') return dateKey(parsedDate) === todayKey;
      if (calendarMode === 'week') {
        const start = startOfWeek(currentDate);
        const end = addDays(start, 6);
        return parsedDate >= start && parsedDate <= end;
      }
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return parsedDate >= monthStart && parsedDate <= monthEnd;
    });

    const q = searchAppointments.trim().toLowerCase();
    if (!q) return dateFiltered;
    return dateFiltered.filter(({ appointment }) =>
      appointment.petName.toLowerCase().includes(q) ||
      appointment.type.toLowerCase().includes(q) ||
      appointment.date.toLowerCase().includes(q),
    );
  }, [appointmentsSorted, calendarMode, currentDate, searchAppointments, todayKey]);

  const checkinsHoje = appointmentsSorted.filter(({ parsedDate }) => dateKey(parsedDate) === todayKey);
  const todayStart = startOfDay(new Date());
  const checkinsNaoCompareceu = appointmentsSorted.filter(({ parsedDate, appointment }) => appointment.status === 'PENDING' && startOfDay(parsedDate).getTime() < todayStart.getTime()).length;
  const checkinsAChegar = appointmentsSorted.filter(({ parsedDate, appointment }) => {
    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') return false;
    return startOfDay(parsedDate).getTime() >= todayStart.getTime();
  }).length;
  const pendingInvoices = faturas.filter((f) => f.estado === 'PENDENTE').length;
  const allInvoicesCount = allFaturas.length;
  const unreadCommunications = comunicacoes.filter((c) => c.estado !== 'CONCLUIDA').length;

  const filteredPatients = useMemo(() => {
    const q = searchPatients.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((pet) =>
      pet.name.toLowerCase().includes(q) ||
      pet.species.toLowerCase().includes(q) ||
      (pet.breed ?? '').toLowerCase().includes(q) ||
      (pet.ownerName ?? '').toLowerCase().includes(q) ||
      (pet.ownerEmail ?? '').toLowerCase().includes(q),
    );
  }, [patients, searchPatients]);

  async function loadHoje() {
    setLoadingHoje(true);
    setError(null);
    try {
      const data = await getMarcacoesAtivas();
      setMarcacoesHoje(data);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setLoadingHoje(false);
    }
  }

  function mapMarcacaoToAppointment(marcacao: Marcacao): Appointment {
    return {
      id: String(marcacao.id),
      petId: String(marcacao.animalId),
      petName: marcacao.animal?.nome ?? `Animal #${marcacao.animalId}`,
      date: new Date(marcacao.data).toISOString(),
      status: marcacao.estado === 'CONCLUIDA' ? 'COMPLETED' : marcacao.estado === 'CANCELADA' ? 'CANCELLED' : 'PENDING',
      type: marcacao.motivo?.trim() ? marcacao.motivo : 'Consulta Geral',
      professionalId: marcacao.profissionalId ? String(marcacao.profissionalId) : undefined,
      professionalName: marcacao.profissional?.nome ?? marcacao.profissional?.email,
      professionalRole: marcacao.profissional?.role,
    };
  }

  async function handleCreateAppointment() {
    setError(null);
    setSuccess(null);
    const servicoSelecionado = servicos.find((servico) => String(servico.id) === appointmentForm.servicoId);
    const motivo = servicoSelecionado ? formatServicoLabel(servicoSelecionado) : appointmentForm.motivo.trim();

    if (!appointmentForm.animalId || !appointmentForm.data || !servicoSelecionado) {
      setError('Seleciona o animal, data e serviço.');
      return;
    }
    if (new Date(appointmentForm.data) <= new Date()) {
      setError('A data da marcação deve ser no futuro.');
      return;
    }
    setBusyId('create-appointment');
    try {
      await createMarcacao({
        animalId: Number(appointmentForm.animalId),
        data: new Date(appointmentForm.data).toISOString(),
        motivo,
        profissionalId: appointmentForm.profissionalId ? Number(appointmentForm.profissionalId) : (activeProfessionals[0]?.id ?? allProfessionals[0]?.id),
      });
      setAppointmentForm(emptyAppointmentForm());
      setShowAppointmentModal(false);
      setSuccess('Marcação criada com sucesso.');
      await onRefreshData();
      await loadHoje();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateAppointment() {
    if (!editingAppointment) return;
    setError(null);
    setSuccess(null);
    const servicoSelecionado = servicos.find((servico) => String(servico.id) === appointmentForm.servicoId);
    const motivo = servicoSelecionado ? formatServicoLabel(servicoSelecionado) : appointmentForm.motivo.trim();

    if (!appointmentForm.data) {
      setError('Seleciona a data da marcação.');
      return;
    }
    if (!motivo) {
      setError('Seleciona o serviço ou indica o motivo.');
      return;
    }

    setBusyId(Number(editingAppointment.id));
    try {
      await updateMarcacao(Number(editingAppointment.id), {
        data: new Date(appointmentForm.data).toISOString(),
        motivo,
        ...(appointmentForm.profissionalId ? { profissionalId: Number(appointmentForm.profissionalId) } : {}),
      });
      setEditingAppointment(null);
      setAppointmentForm(emptyAppointmentForm());
      setSuccess('Marcação atualizada.');
      await onRefreshData();
      await loadHoje();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelAppointment(id: number) {
    setError(null); setSuccess(null); setBusyId(id);
    try {
      await cancelarMarcacao(id);
      setSuccess('Marcação cancelada.');
      await onRefreshData(); await loadHoje();
    } catch (e) { setError(formatAxiosError(e)); } finally { setBusyId(null); }
  }

  async function handleConfirmAppointment(id: number) {
    setError(null); setSuccess(null); setBusyId(id);
    try {
      await confirmarMarcacao(id);
      setSuccess('Presença confirmada.');
      await onRefreshData(); await loadHoje();
    } catch (e) { setError(formatAxiosError(e)); } finally { setBusyId(null); }
  }

  async function handleConcludeAppointment(id: number) {
    setError(null); setSuccess(null); setBusyId(id);
    try {
      await concluirMarcacao(id);
      setSuccess('Consulta concluída.');
      await onRefreshData(); await loadHoje();
    } catch (e) { setError(formatAxiosError(e)); } finally { setBusyId(null); }
  }

  function openEditAppointment(appointment: Appointment) {
    setEditingAppointment(appointment);
    setAppointmentForm({
      animalId: appointment.petId,
      data: new Date(parseDateTime(appointment.date)).toISOString().slice(0, 16),
      motivo: appointment.type,
      servicoId: findServicoIdFromMotivo(appointment.type, servicos),
      profissionalId: appointment.professionalId ?? '',
    });
  }

  function closeAppointmentModal() {
    setEditingAppointment(null);
    setShowAppointmentModal(false);
    setAppointmentForm(emptyAppointmentForm());
  }

  function openAppointmentModal() {
    setEditingAppointment(null);
    setAppointmentForm(emptyAppointmentForm());
    const fallbackProfessional = activeProfessionals[0] ?? allProfessionals[0];
    if (fallbackProfessional) {
      setAppointmentForm((current) => ({ ...current, profissionalId: String(fallbackProfessional.id) }));
    }
    setShowAppointmentModal(true);
  }

  function closeCommunicationModal() {
    setShowCommunicationModal(false);
    setCommunicationForm(emptyCommunicationForm());
    setEditingCommunication(null);
  }

  function openCommunicationModal(item?: Comunicacao) {
    if (item) {
      setEditingCommunication(item);
      setCommunicationForm({
        animalId: item.animalId ? String(item.animalId) : '',
        tipo: item.tipo,
        canal: item.canal,
        assunto: item.assunto,
        mensagem: item.mensagem,
      });
    } else {
      setEditingCommunication(null);
      setCommunicationForm(emptyCommunicationForm());
    }
    setShowCommunicationModal(true);
  }

  function openRegisterModal(mode: RegisterMode) {
    setRegisterMode(mode);
    setSelectedPatient(null);
    setOwnerForm(emptyOwnerForm());
    setAnimalRegisterForm(emptyAnimalRegisterForm());
    setShowRegisterChoices(false);
    setShowPatientModal(true);
  }

  function openEditPatientModal(patient: Pet) {
    setSelectedPatient(patient);
    setRegisterMode(null);
    setShowRegisterChoices(false);
    setShowPatientModal(true);
  }

  function closePatientModal() {
    setSelectedPatient(null);
    setShowPatientModal(false);
    setRegisterMode(null);
    setShowRegisterChoices(false);
    setPatientForm(emptyPatientForm());
    setOwnerForm(emptyOwnerForm());
    setAnimalRegisterForm(emptyAnimalRegisterForm());
  }

  async function handleSavePatient() {
    if (!selectedPatient || !patientForm.animalId) return;
    setError(null); setSuccess(null);
    setBusyId(`patient-${selectedPatient.id}`);
    try {
      await updateAnimal(Number(selectedPatient.id), {
        nome: patientForm.nome.trim(),
        especie: patientForm.especie.trim(),
        raca: patientForm.raca.trim() || undefined,
        genero: patientForm.genero,
        dataNascimento: patientForm.dataNascimento || undefined,
        peso: patientForm.peso ? Number(patientForm.peso) : undefined,
      });
      if (selectedPatient.ownerId) {
        await updateDono(Number(selectedPatient.ownerId), {
          nome: patientForm.donoNome.trim(),
          email: patientForm.donoEmail.trim(),
          telefone: patientForm.donoTelefone.trim(),
        });
      }
      saveNotaAdmin(Number(selectedPatient.id), patientForm.nota.trim());
      setSuccess('Dados básicos atualizados.');
      await onRefreshData();
      closePatientModal();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateOwner() {
    if (!ownerForm.nome.trim() || !ownerForm.email.trim()) {
      setError('Preenche nome e email do dono.');
      return;
    }
    setBusyId('create-owner');
    setError(null);
    try {
      await createDono({
        nome: ownerForm.nome.trim(),
        email: ownerForm.email.trim(),
        telefone: ownerForm.telefone.trim() || undefined,
      });
      setSuccess('Dono registado com sucesso.');
      closePatientModal();
      await onRefreshData();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAnimal() {
    if (!animalRegisterForm.nome.trim() || !animalRegisterForm.especie.trim() || !animalRegisterForm.donoId) {
      setError('Escolhe um dono já existente e preenche os dados do animal.');
      return;
    }
    setBusyId('create-animal');
    setError(null);
    try {
      await createAnimal({
        nome: animalRegisterForm.nome.trim(),
        especie: animalRegisterForm.especie.trim(),
        raca: animalRegisterForm.raca.trim() || undefined,
        genero: animalRegisterForm.genero,
        dataNascimento: animalRegisterForm.dataNascimento || undefined,
        peso: animalRegisterForm.peso ? Number(animalRegisterForm.peso) : undefined,
        donoId: Number(animalRegisterForm.donoId),
      });
      setSuccess('Animal registado com sucesso.');
      closePatientModal();
      await onRefreshData();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveCommunication() {
    if (!communicationForm.mensagem.trim()) {
      setError('Preenche a mensagem.');
      return;
    }
    setError(null);
    setBusyId('add-com');
    try {
      const payload = {
        animalId: communicationForm.animalId ? Number(communicationForm.animalId) : null,
        tipo: communicationForm.tipo,
        canal: communicationForm.canal,
        assunto: communicationForm.assunto.trim(),
        mensagem: communicationForm.mensagem.trim(),
      };
      const item = editingCommunication
        ? await updateComunicacao(editingCommunication.id, payload)
        : await addComunicacao(payload);
      setComunicacoes((current) => [item, ...current.filter((c) => c.id !== item.id)]);
      setCommunicationForm(emptyCommunicationForm());
      setEditingCommunication(null);
      setShowCommunicationModal(false);
      setSuccess(editingCommunication ? 'Comunicação atualizada.' : 'Comunicação registada.');
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteCommunication(id: string) {
    setError(null);
    setBusyId(`com-del-${id}`);
    try {
      await deleteComunicacao(id);
      setComunicacoes((current) => current.filter((c) => c.id !== id));
      setSuccess('Comunicação removida.');
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddInvoice() {
    if (!invoiceForm.animalId) {
      setError('Seleciona um animal.');
      return;
    }
    if (invoiceForm.linhas.length === 0 && (!invoiceForm.descricao.trim() || !invoiceForm.valor.trim())) {
      setError('Preenche descrição e valor ou adiciona linhas.');
      return;
    }
    if (invoiceForm.linhas.length > 0) {
      for (const linha of invoiceForm.linhas) {
        if (!linha.descricao.trim() || !linha.quantidade.trim() || !linha.precoUnit.trim()) {
          setError('Preenche todos os campos das linhas.');
          return;
        }
        if (Number(linha.quantidade) <= 0 || Number(linha.precoUnit) <= 0) {
          setError('Quantidade e preço unitário devem ser maiores que zero.');
          return;
        }
      }
    }
    setError(null);
    setBusyId('add-fat');
    try {
      const linhas = invoiceForm.linhas.length > 0 ? invoiceForm.linhas.map(l => ({
        descricao: l.descricao.trim(),
        quantidade: Number(l.quantidade),
        precoUnit: Number(l.precoUnit),
        servicoId: l.servicoId ? Number(l.servicoId) : undefined,
      })) : undefined;
      const valorTotal = linhas ? linhas.reduce((acc, l) => acc + l.quantidade * l.precoUnit, 0) : Number(invoiceForm.valor);
      const item = await addFatura({
        animalId: Number(invoiceForm.animalId),
        descricao: invoiceForm.descricao.trim(),
        valor: valorTotal,
        dataVencimento: invoiceForm.dataVencimento || undefined,
        linhas,
      });
      setFaturas((f) => [item, ...f]);
      setAllFaturas((f) => [item, ...f]);
      setInvoiceForm(emptyInvoiceForm());
      setConfirmInvoice(false);
      setShowInvoiceModal(false);
      setSuccess('Fatura criada com sucesso!');
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleImprimir(faturaId: string) {
    setError(null);
    setBusyId(`print-${faturaId}`);
    try {
      const detalhada = await getFaturaDetalhada(faturaId);
      setPrintFatura(detalhada);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegistarPagamento() {
    if (!paymentModal) return;
    setError(null);
    setBusyId('pagamento');
    try {
      await registarPagamento(
        paymentModal.faturaId,
        Number(paymentModal.valor),
        paymentModal.metodo,
      );
      setSuccess('Pagamento registado.');
      setPaymentModal(null);
      const [updated, updatedAll] = await Promise.all([getFaturas(), getAllFaturas()]);
      setFaturas(updated);
      setAllFaturas(updatedAll);
      setFaturacaoView('pagas');
      setAllFaturas((current) => [...updatedAll].sort((a, b) => {
        const aLast = new Date(a.pagamentos?.[a.pagamentos.length - 1]?.dataPagamento ?? a.createdAt).getTime();
        const bLast = new Date(b.pagamentos?.[b.pagamentos.length - 1]?.dataPagamento ?? b.createdAt).getTime();
        return bLast - aLast;
      }));
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddShift() {
    if (!shiftForm.userId) {
      setError('Seleciona um profissional.');
      return;
    }
    setError(null);
    setBusyId('add-hor');
    try {
      const item = await addHorario({
        userId: Number(shiftForm.userId),
        diaSemana: shiftForm.diaSemana,
        horaEntrada: shiftForm.horaEntrada,
        horaSaida: shiftForm.horaSaida,
        ativo: shiftForm.ativo,
        estado: shiftForm.estado,
        observacoes: shiftForm.observacoes.trim() || undefined,
      } as any);
      setHorarios((h) => [item, ...h]);
      setShiftForm(emptyShiftForm());
      setSuccess('Horário adicionado.');
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateProfessionalEstado(userId: number, estado: string, current?: HorarioProfissional | undefined) {
    setError(null);
    setSuccess(null);
    setBusyId(`prof-${userId}`);
    try {
      if (current) {
        await updateHorarioEstado(current.id, estado);
      } else {
        await addHorario({
          userId,
          diaSemana: new Date().getDay(),
          horaEntrada: '09:00',
          horaSaida: '17:00',
          ativo: estado === 'ATIVO',
          estado,
        });
      }
      setEditingProfessionalId(null);
      setSuccess('Estado do profissional atualizado.');
      await loadData();
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setBusyId(null);
    }
  }

  function handleSelectTab(tab: RececaoTab) {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{TAB_HEADER_COPY[activeTab].title}</h1>
          <p className="text-[#78716C] dark:text-[#A8A29E] mt-1">
            {TAB_HEADER_COPY[activeTab].description}
          </p>
        </div>
      </div>

      

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ─── AGENDA ─── */}
      {activeTab === 'agenda' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg">Agenda</h2>
                  <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Criar, editar e cancelar consultas.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentDate((d) => addDays(d, calendarMode === 'week' ? -7 : calendarMode === 'month' ? -31 : -1))} className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">‹</button>
                  <button onClick={() => setCurrentDate(startOfDay(new Date()))} className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">Hoje</button>
                  <button onClick={() => setCurrentDate((d) => addDays(d, calendarMode === 'week' ? 7 : calendarMode === 'month' ? 31 : 1))} className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">›</button>
                </div>
              </div>

              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(['day', 'week', 'month'] as CalendarMode[]).map((mode) => (
                    <button key={mode} onClick={() => setCalendarMode(mode)}
                      className={cn('px-3 py-2 rounded-xl text-sm font-semibold capitalize', calendarMode === mode ? 'bg-[#5A5A40] text-white' : 'bg-[#F5F5F4] dark:bg-[#3C3836] text-[#57534E] dark:text-[#A8A29E]')}
                    >{mode}</button>
                  ))}
                </div>
                <div className="text-sm text-[#78716C] dark:text-[#A8A29E]">
                  {calendarMode === 'day' ? formatLong(currentDate)
                    : calendarMode === 'week' ? `Semana de ${formatShort(startOfWeek(currentDate))} a ${formatShort(addDays(startOfWeek(currentDate), 6))}`
                    : currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </div>
              </div>

              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                  <input value={searchAppointments} onChange={(e) => setSearchAppointments(e.target.value)} placeholder="Pesquisar por paciente, motivo ou data"
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] pl-9 pr-3 py-2" />
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 gap-3">
                {visibleAppointments.length === 0 ? (
                  <div className="text-center py-12 text-[#A8A29E]"><Clock size={40} className="mx-auto mb-3" /><p>Sem marcações para o período selecionado.</p></div>
                ) : (
                  visibleAppointments.map(({ appointment, parsedDate }) => {
                    const isPending = appointment.status === 'PENDING';
                    return (
                    <div key={appointment.id} className="rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] p-4 hover:bg-[#FAFAF9] dark:hover:bg-[#3C3836] transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{appointment.petName}</p>
                            <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', appointmentStatusClass(appointment.status))}>
                              {appointmentStatusLabel(appointment.status)}
                            </span>
                          </div>
                          <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{appointment.type}</p>
                          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] flex items-center gap-2 mt-1">
                            <Clock size={14} />{formatTime(parsedDate)} · {appointment.date}
                          </p>
                        </div>
                        {canManage && isPending && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openEditAppointment(appointment)} className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-sm font-semibold hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] flex items-center gap-2">
                              <Pencil size={14} />Editar
                            </button>
                            <button onClick={() => void handleConfirmAppointment(Number(appointment.id))} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2">
                              <UserCheck size={14} />Confirmar
                            </button>
                            <button onClick={() => void handleCancelAppointment(Number(appointment.id))} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 flex items-center gap-2">
                              <Trash2 size={14} />Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">Nova marcação</h3>
                  <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Abrir o formulário num pop-up.</p>
                </div>
                <button onClick={openAppointmentModal}
                  className="rounded-xl bg-[#5A5A40] text-white px-4 py-2 font-semibold hover:bg-[#4A4A35] transition-colors">
                  Nova marcação
                </button>
              </div>

              <div className="pt-4 border-t border-[#E7E5E4] dark:border-[#44403C] space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#78716C] dark:text-[#A8A29E]">Hoje</span>
                  <strong>{appointmentByDay[todayKey]?.length ?? 0}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#78716C] dark:text-[#A8A29E]">Semana</span>
                  <strong>{weekDays.reduce((acc, day) => acc + (appointmentByDay[dateKey(day)]?.length ?? 0), 0)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#78716C] dark:text-[#A8A29E]">Mês</span>
                  <strong>{allAppointments.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PACIENTES ─── */}
      {activeTab === 'pacientes' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">Pacientes</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Consulta de dados básicos e histórico administrativo.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input value={searchPatients} onChange={(e) => setSearchPatients(e.target.value)} placeholder="Pesquisar paciente ou dono"
                  className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] pl-9 pr-3 py-2" />
              </div>
            </div>

            <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
              {filteredPatients.map((pet) => {
                const note = getNotaAdmin(Number(pet.id));
                return (
                  <div key={pet.id} className="w-full p-4 hover:bg-[#FAFAF9] dark:hover:bg-[#3C3836] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <button type="button" onClick={() => openEditPatientModal(pet)} className="text-left min-w-0">
                      <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{pet.name}</p>
                      <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{pet.species} · {pet.breed?.trim() ? pet.breed : 'Sem raça'} · {pet.gender === 'M' ? 'Macho' : 'Fémea'}</p>
                      <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">Dono: {pet.ownerName ?? 'Sem dono'} · {pet.ownerEmail ?? 'Email não registado'}</p>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-[#78716C] dark:text-[#A8A29E] flex-wrap">
                      {note ? <ShieldAlert size={14} className="text-amber-500" /> : <FileText size={14} />}
                      {note ? 'Com nota administrativa' : 'Sem nota'}
                      <button type="button" onClick={() => openEditPatientModal(pet)}
                        className="ml-2 px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-xs font-semibold hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">
                        Ver
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPatients.length === 0 && <div className="p-8 text-center text-[#A8A29E]">Sem pacientes para mostrar.</div>}
            </div>
          </div>

          <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-lg">Registar</h3>
            <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Escolhe o que pretendes registar e abre-se o pop-up certo.</p>
            <div className="space-y-2">
              <button onClick={() => setShowRegisterChoices((current) => !current)}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] px-4 py-3 font-semibold hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">
                Registar
              </button>
              {showRegisterChoices && (
                <div className="rounded-xl border border-dashed border-[#D6D3D1] dark:border-[#57534E] p-3 space-y-2">
                  <button onClick={() => openRegisterModal('owner')} className="w-full rounded-2xl bg-[#5A5A40] text-white p-4 font-semibold shadow-sm hover:bg-[#4A4A35] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <Users size={18} />
                      <div>
                        <p className="text-base">Dono</p>
                        <p className="text-xs text-white/75">Criar um novo dono</p>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => openRegisterModal('animal')} className="w-full rounded-2xl bg-white dark:bg-[#3C3836] border border-[#E7E5E4] dark:border-[#44403C] p-4 font-semibold shadow-sm hover:bg-[#FAFAF9] dark:hover:bg-[#44403C] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <PawPrint size={18} className="text-[#5A5A40]" />
                      <div>
                        <p className="text-base text-[#1C1917] dark:text-[#F5F5F4]">Animal</p>
                        <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">Registar um novo animal</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CHECK-IN ─── */}
      {activeTab === 'checkin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard label="Total hoje" value={String(checkinsHoje.length)} icon={Calendar} />
            <StatCard label="A chegar" value={String(checkinsAChegar)} icon={Clock} />
            <StatCard label="Não compareceu" value={String(checkinsNaoCompareceu)} icon={UserX} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <h2 className="font-bold text-lg">Check-ins a chegar</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Marcações futuras e ainda por atender.</p>
              </div>
              <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
                {appointmentsSorted
                  .filter(({ parsedDate, appointment }) => appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && startOfDay(parsedDate).getTime() >= todayStart.getTime())
                  .map(({ appointment, parsedDate }) => {
                    const itemId = Number(appointment.id);
                    const checkin = getCheckinStatus(parsedDate, appointment);
                    return (
                      <div key={appointment.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{appointment.petName}</p>
                            <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', checkin.className)}>
                              {checkin.label}
                            </span>
                          </div>
                          <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{appointment.type}</p>
                          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] flex items-center gap-2 mt-1">
                            <Clock size={14} />{formatTime(parsedDate)} · {parsedDate.toLocaleDateString('pt-PT')}
                          </p>
                          {appointment.professionalName && (
                            <p className="text-xs text-[#A8A29E] mt-1">Veterinário: {appointment.professionalName}</p>
                          )}
                        </div>
                        {canManage && appointment.status === 'PENDING' && isTodayDate(appointment.date) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => void handleConfirmAppointment(itemId)} disabled={busyId === itemId}
                              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                              <UserCheck size={14} />Dar entrada
                            </button>
                            <button onClick={() => void handleCancelAppointment(itemId)} disabled={busyId === itemId}
                              className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center gap-2">
                              <Trash2 size={14} />Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {appointmentsSorted.filter(({ parsedDate, appointment }) => appointment.status !== 'CANCELLED' && (appointment.status !== 'PENDING' || startOfDay(parsedDate).getTime() >= startOfDay(new Date()).getTime())).length === 0 && (
                  <div className="p-10 text-center text-[#A8A29E]">Sem marcações futuras para mostrar.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <h2 className="font-bold text-lg">Check-ins já passados</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Marcações já concluídas, canceladas ou que já ficaram para trás.</p>
              </div>
              <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
                {appointmentsSorted
                  .filter(({ parsedDate, appointment }) => appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED' || (appointment.status === 'PENDING' && startOfDay(parsedDate).getTime() < startOfDay(new Date()).getTime()))
                  .map(({ appointment, parsedDate }) => {
                    const itemId = Number(appointment.id);
                    const checkin = getCheckinStatus(parsedDate, appointment);
                    return (
                      <div key={appointment.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{appointment.petName}</p>
                            <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', checkin.className)}>
                              {checkin.label}
                            </span>
                          </div>
                          <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{appointment.type}</p>
                          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] flex items-center gap-2 mt-1">
                            <Clock size={14} />{formatTime(parsedDate)} · {parsedDate.toLocaleDateString('pt-PT')}
                          </p>
                          {appointment.professionalName && (
                            <p className="text-xs text-[#A8A29E] mt-1">Veterinário: {appointment.professionalName}</p>
                          )}
                        </div>
                        {canManage && appointment.status === 'PENDING' && isTodayDate(appointment.date) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => void handleConfirmAppointment(itemId)} disabled={busyId === itemId}
                              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                              <UserCheck size={14} />Dar entrada
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {appointmentsSorted.filter(({ parsedDate, appointment }) => appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED' || (appointment.status === 'PENDING' && startOfDay(parsedDate).getTime() < startOfDay(new Date()).getTime())).length === 0 && (
                  <div className="p-10 text-center text-[#A8A29E]">Sem histórico para mostrar.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FATURAÇÃO ─── */}
      {activeTab === 'faturacao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Faturas Pendentes" value={String(pendingInvoices)} icon={CreditCard} />
            <StatCard label="Todas as Faturas" value={String(allInvoicesCount)} icon={Receipt} />
          </div>

          {/* Sub-tabs + Nova Fatura button */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setFaturacaoView('pendentes')}
                className={cn('px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  faturacaoView === 'pendentes'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white dark:bg-[#292524] border-[#E7E5E4] dark:border-[#44403C] text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]'
                )}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFaturacaoView('pagas')}
                className={cn('px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  faturacaoView === 'pagas'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white dark:bg-[#292524] border-[#E7E5E4] dark:border-[#44403C] text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]'
                )}
              >
                Pagas
              </button>
              <button
                onClick={() => setFaturacaoView('todas')}
                className={cn('px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  faturacaoView === 'todas'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white dark:bg-[#292524] border-[#E7E5E4] dark:border-[#44403C] text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]'
                )}
              >
                Todas as Faturas
              </button>
            </div>
            <button
              onClick={() => { setShowInvoiceModal(true); setConfirmInvoice(false); setInvoiceForm(emptyInvoiceForm()); }}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#4A4A35] transition-colors"
            >
              <Plus size={16} />
              Nova Fatura
            </button>
          </div>

          {faturacaoView === 'todas' ? (
            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <h2 className="font-bold text-lg">Todas as faturas</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Histórico completo de faturas emitidas e o seu estado.</p>
              </div>
              <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
                {allFaturas.map((fatura) => (
                  <div key={fatura.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{fatura.animalNome}</p>
                        <span className="text-xs text-[#78716C] dark:text-[#A8A29E]">{fatura.numero}</span>
                        <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', fatura.estado === 'PAGA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                          {fatura.estado === 'PAGA' ? 'Paga' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{fatura.descricao}</p>
                      <p className="text-sm font-semibold text-[#57534E] dark:text-[#A8A29E]">{formatCurrency(fatura.valor)}</p>
                      <p className="text-xs text-[#A8A29E] mt-1">{new Date(fatura.createdAt).toLocaleString('pt-PT')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleImprimir(fatura.id)}
                        disabled={busyId === `print-${fatura.id}`}
                        className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-sm font-semibold flex items-center gap-1 hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] disabled:opacity-50"
                      >
                        <Printer size={14} />
                        {busyId === `print-${fatura.id}` ? 'A carregar...' : 'Imprimir'}
                      </button>
                      {fatura.estado === 'PENDENTE' && (
                        <button onClick={() => setPaymentModal({ faturaId: fatura.id, valor: String(fatura.valor), metodo: '' })}
                          className="px-3 py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-semibold hover:bg-[#4A4A35]">
                          Registar pagamento
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {allFaturas.length === 0 && <div className="p-10 text-center text-[#A8A29E]">Sem faturas registadas.</div>}
              </div>
            </div>
          ) : faturacaoView === 'pagas' ? (
            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <h2 className="font-bold text-lg">Faturas pagas</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Lista de faturas já liquidadas.</p>
              </div>
              <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
                {paidInvoicesSorted.map((fatura) => {
                  const pagamentos = fatura.pagamentos ?? [];
                  const ultimoPagamento = pagamentos[pagamentos.length - 1];
                  return (
                  <div key={fatura.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{fatura.animalNome}</p>
                        <span className="text-xs text-[#78716C] dark:text-[#A8A29E]">{fatura.numero}</span>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-green-100 text-green-700">Paga</span>
                      </div>
                      <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{fatura.descricao}</p>
                      <p className="text-sm font-semibold text-[#57534E] dark:text-[#A8A29E]">{formatCurrency(fatura.valor)}</p>
                      <p className="text-xs text-[#A8A29E] mt-1">{ultimoPagamento ? `Pago em ${new Date(ultimoPagamento.dataPagamento).toLocaleString('pt-PT')}` : new Date(fatura.createdAt).toLocaleString('pt-PT')}</p>
                    </div>
                    <button
                      onClick={() => void handleImprimir(fatura.id)}
                      disabled={busyId === `print-${fatura.id}`}
                      className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-sm font-semibold flex items-center gap-1 hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] disabled:opacity-50"
                    >
                      <Printer size={14} />
                      {busyId === `print-${fatura.id}` ? 'A carregar...' : 'Imprimir'}
                    </button>
                  </div>
                  );
                })}
                {paidInvoicesSorted.length === 0 && <div className="p-10 text-center text-[#A8A29E]">Sem faturas pagas.</div>}
              </div>
            </div>
          ) : (
          <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">Faturas e pagamentos</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Emitir faturas, registar pagamentos e consultar pendentes.</p>
              </div>
              <div className="text-sm text-[#78716C] dark:text-[#A8A29E]">{pendingInvoices} pendente(s)</div>
            </div>

            <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
              {faturas.map((fatura) => (
                <div key={fatura.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{fatura.animalNome}</p>
                      <span className="text-xs text-[#78716C] dark:text-[#A8A29E]">{fatura.numero}</span>
                      <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', fatura.estado === 'PAGA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                        {fatura.estado === 'PAGA' ? 'Paga' : 'Pendente'}
                      </span>
                    </div>
                    {fatura.linhas && fatura.linhas.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {fatura.linhas.map((linha, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-[#78716C] dark:text-[#A8A29E]">{linha.descricao} ({linha.quantidade}x)</span>
                            <span className="text-[#57534E] dark:text-[#A8A29E] font-semibold">{formatCurrency(linha.total)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{fatura.descricao}</p>
                        <p className="text-sm text-[#57534E] dark:text-[#A8A29E] font-bold">{formatCurrency(fatura.valor)}</p>
                      </>
                    )}
                    <p className="text-xs text-[#A8A29E] mt-2">{new Date(fatura.createdAt).toLocaleString('pt-PT')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => void handleImprimir(fatura.id)}
                      disabled={busyId === `print-${fatura.id}`}
                      className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-sm font-semibold flex items-center gap-1 hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] disabled:opacity-50"
                    >
                      <Printer size={14} />
                      {busyId === `print-${fatura.id}` ? 'A carregar...' : 'Imprimir'}
                    </button>
                    {fatura.estado === 'PENDENTE' && (
                      <button onClick={() => setPaymentModal({ faturaId: fatura.id, valor: String(fatura.valor), metodo: '' })}
                        className="px-3 py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-semibold hover:bg-[#4A4A35]">
                        Registar pagamento
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {faturas.length === 0 && <div className="p-10 text-center text-[#A8A29E]">Ainda sem faturas pendentes.</div>}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ─── MODAL NOVA FATURA ─── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#292524] rounded-2xl shadow-xl border border-[#E7E5E4] dark:border-[#44403C] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-between">
              <h2 className="font-bold text-xl">Nova Fatura</h2>
              <button onClick={() => { setShowInvoiceModal(false); setConfirmInvoice(false); }} className="p-2 rounded-lg hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] text-[#57534E]">
                <X size={18} />
              </button>
            </div>

            {confirmInvoice ? (
              /* ─── Ecrã de confirmação ─── */
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <CheckCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800">Confirmar emissão de fatura</p>
                    <p className="text-sm text-amber-700 mt-1">Verifica os detalhes abaixo antes de emitir a fatura. Esta ação não pode ser desfeita.</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#78716C] dark:text-[#A8A29E]">Animal</span>
                    <span className="font-semibold">{patients.find(p => String(p.id) === invoiceForm.animalId)?.name ?? '—'}</span>
                  </div>
                  {invoiceForm.descricao && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#78716C] dark:text-[#A8A29E]">Descrição</span>
                      <span className="font-semibold">{invoiceForm.descricao}</span>
                    </div>
                  )}
                  {invoiceForm.linhas.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Linhas</p>
                      {invoiceForm.linhas.map((l, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[#57534E] dark:text-[#A8A29E]">{l.descricao} ({l.quantidade}x)</span>
                          <span className="font-semibold">{formatCurrency((Number(l.quantidade) || 0) * (Number(l.precoUnit) || 0))}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#E7E5E4] dark:border-[#44403C] pt-2 mt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(invoiceForm.linhas.reduce((acc, l) => acc + (Number(l.quantidade) || 0) * (Number(l.precoUnit) || 0), 0))}</span>
                      </div>
                    </div>
                  )}
                  {invoiceForm.dataVencimento && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#78716C] dark:text-[#A8A29E]">Vencimento</span>
                      <span className="font-semibold">{invoiceForm.dataVencimento}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmInvoice(false)}
                    className="flex-1 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] py-3 font-semibold text-[#57534E] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => void handleAddInvoice()}
                    disabled={busyId === 'add-fat'}
                    className="flex-1 rounded-xl bg-[#5A5A40] text-white py-3 font-semibold hover:bg-[#4A4A35] disabled:opacity-50 transition-colors"
                  >
                    {busyId === 'add-fat' ? 'A emitir...' : 'Confirmar e Emitir'}
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Formulário ─── */
              <div className="p-5 space-y-4">
                <select value={invoiceForm.animalId} onChange={(e) => setInvoiceForm((c) => ({ ...c, animalId: e.target.value }))}
                  className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
                  <option value="">Selecionar animal</option>
                  {patients.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                </select>
                <input value={invoiceForm.descricao} onChange={(e) => setInvoiceForm((c) => ({ ...c, descricao: e.target.value }))} placeholder="Descrição geral (opcional)"
                  className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />

                {/* Linhas detalhadas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Linhas da fatura</label>
                    <button
                      type="button"
                      onClick={() => setInvoiceForm((c) => ({ ...c, linhas: [...c.linhas, { servicoId: '', descricao: '', quantidade: '1', precoUnit: '' }] }))}
                      className="text-sm text-[#5A5A40] hover:text-[#4A4A35] font-semibold flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Adicionar linha
                    </button>
                  </div>
                  {invoiceForm.linhas.length === 0 && (
                    <div className="grid grid-cols-12 gap-2 p-3 border border-[#E7E5E4] dark:border-[#44403C] rounded-xl items-center">
                      <select
                        value=""
                        onChange={(e) => {
                          const servicoId = e.target.value;
                          const servico = servicos.find(s => s.id === Number(servicoId));
                          setInvoiceForm((c) => ({
                            ...c,
                            linhas: [...c.linhas, {
                              servicoId,
                              descricao: servico ? servico.nome : '',
                              quantidade: '1',
                              precoUnit: servico ? String(servico.preco) : ''
                            }]
                          }));
                        }}
                        className="col-span-3 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm"
                      >
                        <option value="">Selecionar serviço</option>
                        {servicos.map((servico) => (
                          <option key={servico.id} value={servico.id}>{servico.categoria} - {servico.nome}</option>
                        ))}
                      </select>
                      <input placeholder="Descrição" className="col-span-4 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm" disabled />
                      <input placeholder="Qtd" type="number" className="col-span-2 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm" disabled />
                      <input placeholder="Preço" type="number" className="col-span-2 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm" disabled />
                      <div className="col-span-1 p-2 text-[#A8A29E]">—</div>
                    </div>
                  )}
                  {invoiceForm.linhas.map((linha, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 border border-[#E7E5E4] dark:border-[#44403C] rounded-xl items-center">
                      <select
                        value={linha.servicoId}
                        onChange={(e) => {
                          const servicoId = e.target.value;
                          const servico = servicos.find(s => s.id === Number(servicoId));
                          setInvoiceForm((c) => ({
                            ...c,
                            linhas: c.linhas.map((l, i) => i === index ? {
                              ...l,
                              servicoId,
                              descricao: servico ? servico.nome : l.descricao,
                              precoUnit: servico ? String(servico.preco) : l.precoUnit
                            } : l)
                          }));
                        }}
                        className="col-span-3 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm"
                      >
                        <option value="">Selecionar serviço</option>
                        {servicos.map((servico) => (
                          <option key={servico.id} value={servico.id}>{servico.categoria} - {servico.nome}</option>
                        ))}
                      </select>
                      <input
                        value={linha.descricao}
                        onChange={(e) => setInvoiceForm((c) => ({ ...c, linhas: c.linhas.map((l, i) => i === index ? { ...l, descricao: e.target.value } : l) }))}
                        placeholder="Descrição"
                        className="col-span-4 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm"
                      />
                      <input
                        value={linha.quantidade}
                        onChange={(e) => setInvoiceForm((c) => ({ ...c, linhas: c.linhas.map((l, i) => i === index ? { ...l, quantidade: e.target.value } : l) }))}
                        placeholder="Qtd" type="number" step="0.01" min="0"
                        className="col-span-2 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm"
                      />
                      <input
                        value={linha.precoUnit}
                        onChange={(e) => setInvoiceForm((c) => ({ ...c, linhas: c.linhas.map((l, i) => i === index ? { ...l, precoUnit: e.target.value } : l) }))}
                        placeholder="Preço" type="number" step="0.01" min="0"
                        className="col-span-2 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setInvoiceForm((c) => ({ ...c, linhas: c.linhas.filter((_, i) => i !== index) }))}
                        className="col-span-1 p-2 text-red-500 hover:text-red-700 flex justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total calculado */}
                {invoiceForm.linhas.length > 0 && (
                  <div className="text-right text-sm font-semibold">
                    Total: {formatCurrency(invoiceForm.linhas.reduce((acc, l) => acc + (Number(l.quantidade) || 0) * (Number(l.precoUnit) || 0), 0))}
                  </div>
                )}

                <input type="date" value={invoiceForm.dataVencimento} onChange={(e) => setInvoiceForm((c) => ({ ...c, dataVencimento: e.target.value }))} placeholder="Data de vencimento"
                  className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowInvoiceModal(false); setConfirmInvoice(false); }}
                    className="flex-1 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] py-3 font-semibold text-[#57534E] hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!invoiceForm.animalId) { setError('Seleciona um animal.'); return; }
                      if (invoiceForm.linhas.length === 0 && (!invoiceForm.descricao.trim() || !invoiceForm.valor.trim())) { setError('Preenche descrição e valor ou adiciona linhas.'); return; }
                      setError(null);
                      setConfirmInvoice(true);
                    }}
                    className="flex-1 rounded-xl bg-[#5A5A40] text-white py-3 font-semibold hover:bg-[#4A4A35] transition-colors"
                  >
                    Rever e Emitir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── COMUNICAÇÃO ─── */}
      {activeTab === 'comunicacao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 max-w-xs">
            <StatCard label="Comunicações Abertas" value={String(unreadCommunications)} icon={Bell} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
                <h2 className="font-bold text-lg">Chamadas, pedidos e lembretes</h2>
                <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Registo rápido de comunicação administrativa.</p>
              </div>

              <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
                {comunicacoes.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{item.assunto || item.tipo}</p>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-[#F5F5F4] dark:bg-[#3C3836] text-[#57534E] dark:text-[#A8A29E]">{formatShortLabel(item.tipo)}</span>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-[#F5F5F4] dark:bg-[#3C3836] text-[#57534E] dark:text-[#A8A29E]">{formatShortLabel(item.canal)}</span>
                        {item.estado === 'CONCLUIDA' && (
                          <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-green-100 text-green-700">Feito</span>
                        )}
                      </div>
                      <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{item.animalNome}</p>
                      <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">{item.mensagem}</p>
                      <p className="text-xs text-[#A8A29E]">{item.feitaPor} · {new Date(item.createdAt).toLocaleString('pt-PT')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openCommunicationModal(item)} className="px-3 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] text-sm font-semibold hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]">Editar</button>
                      <button onClick={() => void handleDeleteCommunication(item.id)} disabled={busyId === `com-del-${item.id}`} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 disabled:opacity-50">Remover</button>
                    </div>
                  </div>
                ))}
                {comunicacoes.length === 0 && <div className="p-10 text-center text-[#A8A29E]">Sem registos de comunicação.</div>}
              </div>
            </div>

            <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-lg">Novo registo</h3>
              <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Criar um registo rápido no pop-up.</p>
              <button onClick={() => openCommunicationModal()}
                className="w-full rounded-xl bg-[#5A5A40] text-white py-3 font-semibold hover:bg-[#4A4A35] transition-colors">
                Novo registo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROFISSIONAIS ─── */}
      {activeTab === 'profissionais' && (
        <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E7E5E4] dark:border-[#44403C]">
            <h2 className="font-bold text-lg">Estado dos profissionais</h2>
            <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">Ver quem está a trabalhar, de folga ou em férias.</p>
          </div>

          <div className="divide-y divide-[#E7E5E4] dark:divide-[#44403C]">
            {allProfessionals.map((u) => {
              const current = latestHorarioByUser.get(u.id);
              const estado = current?.estado ?? (current?.ativo ? 'ATIVO' : 'FOLGA');
              const isEditing = editingProfessionalId === u.id;
              return (
                <div key={u.id} className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{u.nome ?? u.email}</p>
                          <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-[#F5F5F4] dark:bg-[#3C3836] text-[#57534E] dark:text-[#A8A29E]">{u.role.toLowerCase()}</span>
                          <span className={cn('text-[10px] px-2 py-1 rounded-full font-bold uppercase', estado === 'ATIVO' ? 'bg-green-100 text-green-700' : estado === 'FERIAS' ? 'bg-blue-100 text-blue-700' : estado === 'FOLGA' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700')}>
                            {estadoProfissionalLabel(estado)}
                          </span>
                          <button type="button" onClick={() => setEditingProfessionalId((currentId) => (currentId === u.id ? null : u.id))} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] dark:border-[#44403C] bg-white dark:bg-[#3C3836] px-3 py-1.5 text-xs font-semibold text-[#5A5A40] dark:text-[#D6D3D1] shadow-sm hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Alterar estado</button>
                        </div>
                        <p className="text-sm text-[#78716C] dark:text-[#A8A29E]">{u.email}</p>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {ESTADOS_PROFISSIONAIS.map((option) => {
                          const isActive = estado === option;
                          return (
                            <button
                              key={option}
                              onClick={() => void handleUpdateProfessionalEstado(u.id, option, current)}
                              disabled={busyId === `prof-${u.id}`}
                              className={cn(
                                'px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50',
                                isActive
                                  ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                                  : 'bg-white dark:bg-[#3C3836] border-[#E7E5E4] dark:border-[#44403C] text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C]'
                              )}
                            >
                              {estadoProfissionalLabel(option)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {allProfessionals.length === 0 && <div className="p-10 text-center text-[#A8A29E]">Sem profissionais disponíveis.</div>}
          </div>
        </div>
      )}

      {/* ─── MODAL NOVA MARCAÇÃO ─── */}
      {showAppointmentModal && (
        <Modal title="Nova marcação" onClose={closeAppointmentModal}>
          <div className="space-y-4">
            <select value={appointmentForm.animalId} onChange={(e) => setAppointmentForm((c) => ({ ...c, animalId: e.target.value }))}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
              <option value="">Selecionar animal</option>
              {patients.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} — {pet.ownerName ?? 'Sem dono'}</option>)}
            </select>
            <select value={appointmentForm.profissionalId} onChange={(e) => setAppointmentForm((c) => ({ ...c, profissionalId: e.target.value }))}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
              <option value="">Selecionar veterinário</option>
              {activeProfessionals.map((u) => (
                <option key={`active-${u.id}`} value={u.id}>{u.nome ?? u.email} · Ativo</option>
              ))}
              {allProfessionals.filter((u) => !activeProfessionals.some((a) => a.id === u.id)).map((u) => (
                <option key={u.id} value={u.id}>{u.nome ?? u.email} ({u.role.toLowerCase()})</option>
              ))}
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" value={splitDateTime(appointmentForm.data).date} onChange={(e) => {
                const time = splitDateTime(appointmentForm.data).time;
                setAppointmentForm((c) => ({ ...c, data: `${e.target.value}T${time}` }));
              }}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input type="time" value={splitDateTime(appointmentForm.data).time} onChange={(e) => {
                const date = splitDateTime(appointmentForm.data).date;
                setAppointmentForm((c) => ({ ...c, data: `${date}T${e.target.value}` }));
              }}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
            </div>
            <select
              value={appointmentForm.servicoId}
              onChange={(e) => {
                const servicoId = e.target.value;
                const servico = servicos.find((item) => String(item.id) === servicoId);
                setAppointmentForm((c) => ({
                  ...c,
                  servicoId,
                  motivo: servico ? formatServicoLabel(servico) : '',
                }));
              }}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3"
            >
              <option value="">Selecionar serviço</option>
              {servicos.map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {formatServicoLabel(servico)}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={closeAppointmentModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
              <button onClick={() => void handleCreateAppointment()} disabled={busyId === 'create-appointment'}
                className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                {busyId === 'create-appointment' ? 'A criar...' : 'Criar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL REGISTO / EDIÇÃO DE PACIENTE ─── */}
      {showPatientModal && (
        <Modal title={registerMode === 'owner' ? 'Registar dono' : registerMode === 'animal' ? 'Registar animal' : 'Editar paciente'} onClose={closePatientModal}>
          {registerMode === 'owner' ? (
            <div className="space-y-4">
              <input value={ownerForm.nome} onChange={(e) => setOwnerForm((c) => ({ ...c, nome: e.target.value }))}
                placeholder="Nome do dono" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input value={ownerForm.email} onChange={(e) => setOwnerForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="Email" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input value={ownerForm.telefone} onChange={(e) => setOwnerForm((c) => ({ ...c, telefone: e.target.value }))}
                placeholder="Telefone" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closePatientModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
                <button onClick={() => void handleCreateOwner()} disabled={busyId === 'create-owner'}
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                  {busyId === 'create-owner' ? 'A criar...' : 'Criar'}
                </button>
              </div>
            </div>
          ) : registerMode === 'animal' ? (
            <div className="space-y-4">
              <input value={animalRegisterForm.nome} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, nome: e.target.value }))}
                placeholder="Nome do animal" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input value={animalRegisterForm.especie} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, especie: e.target.value }))}
                placeholder="Espécie" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input value={animalRegisterForm.raca} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, raca: e.target.value }))}
                placeholder="Raça" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <select value={animalRegisterForm.genero} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, genero: e.target.value as 'M' | 'F' }))}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
                <option value="M">Macho</option>
                <option value="F">Fémea</option>
              </select>
              <input type="date" value={animalRegisterForm.dataNascimento} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, dataNascimento: e.target.value }))}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <input value={animalRegisterForm.peso} onChange={(e) => setAnimalRegisterForm((c) => ({ ...c, peso: e.target.value }))}
                placeholder="Peso" type="number" step="0.1" className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <div className="space-y-2 rounded-2xl border border-dashed border-[#D6D3D1] dark:border-[#57534E] p-4">
                <label className="text-sm font-semibold text-[#57534E] dark:text-[#A8A29E]">Dono já existente</label>
                <select value={animalRegisterForm.donoId} onChange={(e) => {
                  const selectedId = e.target.value;
                  const owner = availableOwners.find((item) => String(item.id) === selectedId);
                  setAnimalRegisterForm((c) => ({
                    ...c,
                    donoId: selectedId,
                    donoNome: owner?.nome ?? '',
                    donoEmail: owner?.email ?? '',
                    donoTelefone: owner?.telefone ?? '',
                  }));
                }} className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
                  <option value="">Escolher dono</option>
                  {availableOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.nome}{owner.email ? ` · ${owner.email}` : ''}</option>
                  ))}
                </select>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-[#FAFAF9] dark:bg-[#3C3836] border border-[#E7E5E4] dark:border-[#44403C] p-3">
                    <p className="text-[#A8A29E] text-xs uppercase font-bold">Nome</p>
                    <p className="font-semibold">{animalRegisterForm.donoNome || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFAF9] dark:bg-[#3C3836] border border-[#E7E5E4] dark:border-[#44403C] p-3">
                    <p className="text-[#A8A29E] text-xs uppercase font-bold">Email</p>
                    <p className="font-semibold break-all">{animalRegisterForm.donoEmail || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFAF9] dark:bg-[#3C3836] border border-[#E7E5E4] dark:border-[#44403C] p-3">
                    <p className="text-[#A8A29E] text-xs uppercase font-bold">Telefone</p>
                    <p className="font-semibold">{animalRegisterForm.donoTelefone || '—'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closePatientModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
                <button onClick={() => void handleCreateAnimal()} disabled={busyId === 'create-animal' || !animalRegisterForm.donoId}
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                  {busyId === 'create-animal' ? 'A criar...' : 'Criar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedPatient && (
                <>
                  {[
                    { value: patientForm.nome, key: 'nome', placeholder: 'Nome' },
                    { value: patientForm.especie, key: 'especie', placeholder: 'Espécie' },
                    { value: patientForm.raca, key: 'raca', placeholder: 'Raça' },
                  ].map(({ value, key, placeholder }) => (
                    <input key={key} value={value} onChange={(e) => setPatientForm((c) => ({ ...c, [key]: e.target.value }))} placeholder={placeholder}
                      className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
                  ))}
                  <select value={patientForm.genero} onChange={(e) => setPatientForm((c) => ({ ...c, genero: e.target.value as 'M' | 'F' }))}
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
                    <option value="M">Macho</option>
                    <option value="F">Fémea</option>
                  </select>
                  <input type="date" value={patientForm.dataNascimento} onChange={(e) => setPatientForm((c) => ({ ...c, dataNascimento: e.target.value }))}
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
                  <input value={patientForm.peso} onChange={(e) => setPatientForm((c) => ({ ...c, peso: e.target.value }))} placeholder="Peso" type="number" step="0.1"
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
                  <hr className="border-[#E7E5E4] dark:border-[#44403C]" />
                  {[
                    { value: patientForm.donoNome, key: 'donoNome', placeholder: 'Nome do dono' },
                    { value: patientForm.donoEmail, key: 'donoEmail', placeholder: 'Email do dono' },
                    { value: patientForm.donoTelefone, key: 'donoTelefone', placeholder: 'Telefone do dono' },
                  ].map(({ value, key, placeholder }) => (
                    <input key={key} value={value} onChange={(e) => setPatientForm((c) => ({ ...c, [key]: e.target.value }))} placeholder={placeholder}
                      className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
                  ))}
                  <textarea value={patientForm.nota} onChange={(e) => setPatientForm((c) => ({ ...c, nota: e.target.value }))} placeholder="Nota administrativa"
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3 min-h-28" />
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closePatientModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
                    <button onClick={() => void handleSavePatient()} disabled={busyId === `patient-${selectedPatient.id}`}
                      className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                      {busyId === `patient-${selectedPatient.id}` ? 'A guardar...' : 'Guardar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ─── MODAL NOVA COMUNICAÇÃO ─── */}
      {showCommunicationModal && (
        <Modal title={editingCommunication ? "Editar registo" : "Novo registo"} onClose={closeCommunicationModal}>
          <div className="space-y-4">
            <select value={communicationForm.animalId} onChange={(e) => setCommunicationForm((c) => ({ ...c, animalId: e.target.value }))}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
              <option value="">Sem paciente</option>
              {patients.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
            </select>
            <select value={communicationForm.tipo} onChange={(e) => setCommunicationForm((c) => ({ ...c, tipo: e.target.value }))}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
              {TIPOS_COMUNICACAO.map((t) => <option key={t} value={t}>{formatShortLabel(t)}</option>)}
            </select>
            <select value={communicationForm.canal} onChange={(e) => setCommunicationForm((c) => ({ ...c, canal: e.target.value }))}
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
              {CANAIS_COMUNICACAO.map((c) => <option key={c} value={c}>{formatShortLabel(c)}</option>)}
            </select>
            <input value={communicationForm.assunto} onChange={(e) => setCommunicationForm((c) => ({ ...c, assunto: e.target.value }))} placeholder="Assunto (opcional)"
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
            <textarea value={communicationForm.mensagem} onChange={(e) => setCommunicationForm((c) => ({ ...c, mensagem: e.target.value }))} placeholder="Mensagem *"
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3 min-h-32" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeCommunicationModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
              <button onClick={() => void handleSaveCommunication()} disabled={busyId === 'add-com'}
                className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                {busyId === 'add-com' ? (editingCommunication ? 'A guardar...' : 'A registar...') : (editingCommunication ? 'Guardar' : 'Registar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL EDITAR MARCAÇÃO ─── */}
      {editingAppointment && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292524] rounded-3xl border border-[#E7E5E4] dark:border-[#44403C] shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">Editar marcação</p>
                <h2 className="text-2xl font-bold text-[#1C1917] dark:text-[#F5F5F4] mt-1">{editingAppointment.petName}</h2>
              </div>
              <button onClick={closeAppointmentModal} className="p-2 rounded-xl hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] p-3 bg-[#FAFAF9] dark:bg-[#3C3836] text-[#57534E] dark:text-[#A8A29E]">
                {patients.find((pet) => pet.id === appointmentForm.animalId)?.name ?? 'Paciente associado'}
              </div>
              <input type="datetime-local" value={appointmentForm.data} onChange={(e) => setAppointmentForm((c) => ({ ...c, data: e.target.value }))}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <select
                value={appointmentForm.servicoId}
                onChange={(e) => {
                  const servicoId = e.target.value;
                  const servico = servicos.find((item) => String(item.id) === servicoId);
                  setAppointmentForm((c) => ({
                    ...c,
                    servicoId,
                    motivo: servico ? formatServicoLabel(servico) : '',
                  }));
                }}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3"
              >
                <option value="">Selecionar serviço</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {formatServicoLabel(servico)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#A8A29E]">Os serviços são os mesmos do catálogo ativo usado na faturação.</p>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button onClick={closeAppointmentModal} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
                <button onClick={() => void handleUpdateAppointment()} disabled={busyId === Number(editingAppointment.id)}
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL PAGAMENTO ─── */}
      {paymentModal && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292524] rounded-3xl border border-[#E7E5E4] dark:border-[#44403C] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-xl font-bold text-[#1C1917] dark:text-[#F5F5F4]">Registar pagamento</h2>
              <button onClick={() => setPaymentModal(null)} className="p-2 rounded-xl hover:bg-[#F5F5F4] dark:hover:bg-[#3C3836]"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={paymentModal.valor} onChange={(e) => setPaymentModal((p) => p ? { ...p, valor: e.target.value } : null)} placeholder="Valor" type="number" step="0.01"
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3" />
              <select value={paymentModal.metodo} onChange={(e) => setPaymentModal((p) => p ? { ...p, metodo: e.target.value } : null)}
                className="w-full rounded-xl border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#3C3836] p-3">
                <option value="" disabled>Escolher método</option>
                {METODOS_PAGAMENTO.map((m) => <option key={m} value={m}>{formatPaymentMethod(m)}</option>)}
              </select>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button onClick={() => setPaymentModal(null)} className="px-4 py-2 rounded-xl border border-[#E7E5E4] dark:border-[#57534E] dark:bg-[#3C3836] dark:text-[#F5F5F4] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors">Cancelar</button>
                <button onClick={() => void handleRegistarPagamento()} disabled={busyId === 'pagamento' || !paymentModal.metodo}
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-semibold disabled:opacity-50">
                  {busyId === 'pagamento' ? 'A registar...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TEMPLATE DE IMPRESSÃO (oculto) ─── */}
      {printFatura && (
        <FaturaImpressao fatura={printFatura} onReady={() => {
          printDiv('fatura-print', `Fatura N.º ${printFatura.numero}`);
          setPrintFatura(null);
        }} />
      )}
    </div>
  );
}

// ─── FaturaImpressao ──────────────────────────────────────────────────────────
function FaturaImpressao({
  fatura,
  onReady,
}: {
  fatura: FaturaDetalhada;
  onReady: () => void;
}) {
  const clinicaInfo = getClinicaInfo();
  const nomeClinica = clinicaInfo.nome || 'VetClinic Pro';

  useEffect(() => {
    const t = setTimeout(onReady, 0);
    return () => clearTimeout(t);
  }, [onReady]);

  const totalGeral =
    fatura.linhas.length > 0
      ? fatura.linhas.reduce((s, l) => s + l.total, 0)
      : fatura.valor;

  const dataFatura   = new Date(fatura.createdAt).toLocaleDateString('pt-PT');
  const horaFatura   = new Date(fatura.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const isPaga       = fatura.estado === 'PAGA';
  const temPagamentos = fatura.pagamentos && fatura.pagamentos.length > 0;

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
      <div id="fatura-print">

        {/* ══ CABEÇALHO ══ */}
        <div className="fatura-header">
          {/* Esquerda — marca */}
          <div className="brand-block">
            <div className="brand-name">{nomeClinica}</div>
            <div className="brand-sub">
              {[clinicaInfo.morada, clinicaInfo.telefone].filter(Boolean).join(' · ') || 'Clínica Veterinária'}
            </div>
          </div>

          {/* Centro — título do documento */}
          <div className="header-title-block">
            <div className="doc-title">Protocolo de Recebimento</div>
            <div className="doc-subtitle">{nomeClinica.toUpperCase()}</div>
            <div className="doc-note">(documento sem valor fiscal)</div>
          </div>

          {/* Direita — número e data */}
          <div className="header-meta">
            <div className="header-meta-row"><strong>Fatura N.º:</strong> {fatura.numero}</div>
            <div className="header-meta-row"><strong>Data:</strong> {dataFatura}</div>
            <div className="header-meta-row"><strong>Hora:</strong> {horaFatura}</div>
          </div>
        </div>

        {/* ══ FAIXA DO CLIENTE ══ */}
        <div className="client-strip">
          <div className="client-field">
            <strong>Proprietário:</strong> {fatura.donoNome}
          </div>
          <div className="client-field">
            <strong>Animal:</strong> {fatura.animalNome}
          </div>
          <div className="client-field">
            <strong>Estado:</strong>{' '}
            <span className={`badge ${isPaga ? 'badge-paga' : 'badge-pendente'}`}>
              {isPaga ? 'Paga' : 'Pendente'}
            </span>
          </div>
          <div className="client-field">
            <strong>E-mail:</strong> {fatura.donoEmail || '—'}
          </div>
          <div className="client-field">
            <strong>Telefone:</strong> {fatura.donoTelefone || '—'}
          </div>
          <div className="client-field">
            <strong>Vencimento:</strong>{' '}
            {fatura.dataVencimento
              ? new Date(fatura.dataVencimento).toLocaleDateString('pt-PT')
              : '—'}
          </div>
        </div>

        {/* ══ RESUMO DA FATURA ══ */}
        <div className="section">
          <div className="section-header">Resumo da Fatura</div>
          <table>
            <thead>
              <tr>
                <th>N.º Fatura</th>
                <th>Data Geração</th>
                <th>Data Vencimento</th>
                <th>Descrição</th>
                <th className="tr">Vlr. Total</th>
                <th className="tr">Vlr. Recebido</th>
                <th className="tr">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{fatura.numero}</td>
                <td>{dataFatura} {horaFatura}</td>
                <td>
                  {fatura.dataVencimento
                    ? new Date(fatura.dataVencimento).toLocaleDateString('pt-PT')
                    : '—'}
                </td>
                <td>{fatura.descricao || 'Serviços veterinários'}</td>
                <td className="tr">{formatCurrency(totalGeral)}</td>
                <td className="tr">
                  {isPaga
                    ? formatCurrency(totalGeral)
                    : fatura.pagamentos
                        ? formatCurrency(fatura.pagamentos.reduce((s, p) => s + p.valor, 0))
                        : formatCurrency(0)}
                </td>
                <td className="tr">
                  {isPaga
                    ? formatCurrency(0)
                    : formatCurrency(
                        totalGeral -
                          (fatura.pagamentos
                            ? fatura.pagamentos.reduce((s, p) => s + p.valor, 0)
                            : 0),
                      )}
                </td>
              </tr>
              <tr className="total-row">
                <td colSpan={4} className="tr"><strong>TOTAL</strong></td>
                <td className="tr">{formatCurrency(totalGeral)}</td>
                <td className="tr">
                  {isPaga
                    ? formatCurrency(totalGeral)
                    : fatura.pagamentos
                        ? formatCurrency(fatura.pagamentos.reduce((s, p) => s + p.valor, 0))
                        : formatCurrency(0)}
                </td>
                <td className="tr">
                  {isPaga
                    ? formatCurrency(0)
                    : formatCurrency(
                        totalGeral -
                          (fatura.pagamentos
                            ? fatura.pagamentos.reduce((s, p) => s + p.valor, 0)
                            : 0),
                      )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ══ MEIOS DE PAGAMENTO (se existirem) ══ */}
        {temPagamentos && (
          <div className="section">
            <div className="section-header">Meios de Pagamento</div>
            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Referência</th>
                  <th className="tc">Data Pagamento</th>
                  <th className="tr">Valor Pago</th>
                </tr>
              </thead>
              <tbody>
                {fatura.pagamentos!.map((p) => (
                  <tr key={p.id}>
                    <td>{p.metodo}</td>
                    <td>{p.referencia || '—'}</td>
                    <td className="tc">
                      {new Date(p.dataPagamento).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="tr">{formatCurrency(p.valor)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3} className="tr"><strong>TOTAL PAGO</strong></td>
                  <td className="tr">
                    {formatCurrency(fatura.pagamentos!.reduce((s, p) => s + p.valor, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ══ SERVIÇOS / PRODUTOS ══ */}
        <div className="section">
          <div className="section-header">Serviços / Produtos</div>
          {(fatura.linhas?.length ?? 0) > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Produto / Serviço</th>
                  <th>Animal</th>
                  <th className="tc" style={{ width: '50px' }}>Qtd</th>
                  <th className="tr" style={{ width: '100px' }}>Vlr. Unit.</th>
                  <th className="tr" style={{ width: '100px' }}>Vlr. Desconto</th>
                  <th className="tr" style={{ width: '100px' }}>Vlr. Total</th>
                </tr>
              </thead>
              <tbody>
                {(fatura.linhas ?? []).map((linha) => (
                  <tr key={linha.id}>
                    <td>{linha.descricao}</td>
                    <td>{fatura.animalNome}</td>
                    <td className="tc">{linha.quantidade}</td>
                    <td className="tr">{formatCurrency(linha.precoUnit)}</td>
                    <td className="tr">{formatCurrency(0)}</td>
                    <td className="tr">{formatCurrency(linha.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produto / Serviço</th>
                  <th>Animal</th>
                  <th className="tc" style={{ width: '50px' }}>Qtd</th>
                  <th className="tr" style={{ width: '100px' }}>Vlr. Desconto</th>
                  <th className="tr" style={{ width: '100px' }}>Vlr. Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{fatura.descricao || 'Serviços veterinários'}</td>
                  <td>{fatura.animalNome}</td>
                  <td className="tc">1</td>
                  <td className="tr">{formatCurrency(0)}</td>
                  <td className="tr">{formatCurrency(fatura.valor)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* ══ BARRA DO TOTAL GERAL ══ */}
        <div className="grand-total-bar">
          <div className="grand-total-label">Total a Pagar</div>
          <div className="grand-total-amount">{formatCurrency(totalGeral)}</div>
        </div>

        {/* ══ RODAPÉ ══ */}
        <div className="fatura-footer">
          <span className="footer-brand">
            {[nomeClinica, clinicaInfo.nif ? `NIF ${clinicaInfo.nif}` : '', clinicaInfo.email].filter(Boolean).join(' — ')}
          </span>
          <span className="footer-note">
            Documento gerado em {new Date().toLocaleString('pt-PT')}
          </span>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white dark:bg-[#292524] rounded-2xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#1C1917] dark:text-[#F5F5F4]">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-[#F5F5F4] dark:bg-[#3C3836] flex items-center justify-center text-[#5A5A40]">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
