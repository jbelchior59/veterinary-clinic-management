import { api } from './apiClient';

export type RececaoTab =
  | 'agenda'
  | 'pacientes'
  | 'checkin'
  | 'faturacao'
  | 'comunicacao'
  | 'profissionais';
  
// ── Tipos ──────────────────────────────────────────────────────────────────

export type Comunicacao = {
  id: string;
  animalId: number | null;
  animalNome: string;
  tipo: string;
  canal: string;
  assunto: string;
  mensagem: string;
  estado: string;
  feitaPor: string;
  createdAt: string;
};

export type Pagamento = {
  id: number;
  valor: number;
  metodo: string;
  referencia?: string;
  dataPagamento: string;
};

export type Fatura = {
  id: string;
  animalId: number;
  animalNome: string;
  numero: string;
  descricao: string;
  valor: number;
  estado: 'PENDENTE' | 'PAGA';
  createdAt: string;
  dataVencimento: string | null;
  pagamentos: Pagamento[];
  linhas?: FaturaLinha[];
};

export type FaturaLinha = {
  id: number;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  total: number;
};

export type ServicoCatalogo = {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
  descricao: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type FaturaDetalhada = Fatura & {
  linhas: FaturaLinha[];
  donoNome: string;
  donoEmail: string;
  donoTelefone: string | null;
};

export type HorarioProfissional = {
  id: string;
  userId: number;
  nome: string;
  funcao: string;
  diaSemana: number;
  dia: string;
  horaEntrada: string;
  horaSaida: string;
  ativo: boolean;
  estado: string;
  observacoes?: string;
};

export type Profissional = {
  id: number;
  nome: string | null;
  email: string;
  role: string;
  createdAt: string;
};
export type VeterinarioDashboardMarcacao = {
  id: number;
  hora: string;
  estado: string;
  motivo: string | null;
  animal: { id: number; nome: string; especie: string } | null;
};

export type VeterinarioDashboardExame = {
  id: number;
  tipo: string;
  prioridade: string;
  dataConclusao: string | null;
  animal: { id: number; nome: string; especie: string } | null;
};

export type VeterinarioDashboardInternamento = {
  id: number;
  motivo: string;
  dataEntrada: string;
  animal: { id: number; nome: string; especie: string } | null;
};

export type VeterinarioDashboardVacina = {
  id: number;
  nome: string;
  proximaDose: string | null;
  animal: { id: number; nome: string; especie: string } | null;
};

export type VeterinarioDashboard = {
  totais: {
    marcacoesHoje: number;
    examesPorValidar: number;
    internamentosAtivos: number;
    alertasVacinas: number;
  };
  marcacoesHoje: VeterinarioDashboardMarcacao[];
  examesPorValidar: VeterinarioDashboardExame[];
  internamentosAtivos: VeterinarioDashboardInternamento[];
  alertasVacinas: VeterinarioDashboardVacina[];
};

export type TecnicoDashboardExame = {
  id: number;
  tipo: string;
  estado: string;
  prioridade: string;
  dataPedido: string;
  animal?: {
    id: number;
    nome: string;
    especie?: string;
    dono?: {
      id: number;
      nome: string;
    } | null;
  } | null;
};

export type TecnicoDashboardStockAlerta = {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  quantidadeMin: number;
  unidade: string;
  validade?: string | null;
  baixoStock: boolean;
  validadeAlerta: boolean;
};

export type TecnicoDashboard = {
  examesPorEstado: {
    PENDENTE: number;
    AMOSTRA_COLETADA: number;
    CONCLUIDO: number;
  };
  examesConcluidosHoje: number;
  examesPendentesAntigos: TecnicoDashboardExame[];
  alertasStock: TecnicoDashboardStockAlerta[];
};

export type AdminMonthlyPoint = {
  mes: string;
  total: number;
  concluidas: number;
  canceladas?: number;
  receita: number;
};

export type SpeciesDistributionPoint = {
  especie: string;
  total: number;
};

export type AdminMonthlyStats = {
  monthly: AdminMonthlyPoint[];
  species: SpeciesDistributionPoint[];
  topMotivos: {
    motivo: string;
    total: number;
  }[];
  cards: {
    faturacaoMensal: number;
    totalPacientes: number;
    utilizadoresAtivos: number;
    taxaOcupacao: number;
  };
  trends: {
    faturacaoMensal: number;
    totalPacientes: number;
    utilizadoresAtivos: number;
    taxaOcupacao: number;
  };
};

type RececaoMonthlyStatsResponse = {
  marcacoesPorMes: {
    mes: string;
    total: number;
    concluidas: number;
    canceladas: number;
  }[];
  receitaPorMes: {
    mes: string;
    receita: number;
  }[];
  distribuicaoEspecie: SpeciesDistributionPoint[];
  topMotivos: {
    motivo: string;
    total: number;
  }[];
};

// ── Mappers ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/([\s-])/)
    .map((part) => {
      if (part === ' ' || part === '-') return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

function mapComunicacao(raw: any): Comunicacao {
  return {
    id: String(raw.id),
    animalId: raw.animalId ?? null,
    animalNome: toTitleCase(raw.animal?.nome ?? 'Sem paciente'),
    tipo: toTitleCase(raw.tipo ?? ''),
    canal: toTitleCase(raw.canal ?? ''),
    assunto: raw.assunto ?? '',
    mensagem: raw.mensagem ?? '',
    estado: raw.estado ?? 'REGISTADA',
    feitaPor: toTitleCase(raw.criadoPor?.nome ?? 'Desconhecido'),
    createdAt: raw.createdAt ?? raw.data ?? new Date().toISOString(),
  };
}

function mapFatura(raw: any): Fatura {
  return {
    id: String(raw.id),
    animalId: raw.animalId,
    animalNome: toTitleCase(raw.animal?.nome ?? 'Sem paciente'),
    numero: raw.numero ?? '',
    descricao: raw.descricao ?? '',
    valor: raw.valor,
    estado: raw.estado as 'PENDENTE' | 'PAGA',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    dataVencimento: raw.dataVencimento ?? null,
    pagamentos: raw.pagamentos ?? [],
  };
}

function mapHorario(raw: any): HorarioProfissional {
  return {
    id: String(raw.id),
    userId: raw.userId,
    nome: raw.user?.nome ? toTitleCase(raw.user.nome) : raw.user?.email ?? 'Desconhecido',
    funcao: raw.user?.role ?? '',
    diaSemana: raw.diaSemana,
    dia: DIAS_SEMANA[raw.diaSemana] ?? String(raw.diaSemana),
    horaEntrada: raw.horaEntrada,
    horaSaida: raw.horaSaida,
    ativo: raw.ativo,
    estado: raw.estado ?? (raw.ativo ? 'ATIVO' : 'FOLGA'),
    observacoes: raw.observacoes,
  };
}


// ── Comunicações ───────────────────────────────────────────────────────────

export async function getComunicacoes(): Promise<Comunicacao[]> {
  const res = await api.get('/rececao/comunicacoes');
  return (res.data as any[]).map(mapComunicacao);
}

export async function addComunicacao(payload: {
  animalId: number | null;
  tipo: string;
  canal: string;
  assunto: string;
  mensagem: string;
}): Promise<Comunicacao> {
  const res = await api.post('/rececao/comunicacoes', {
    tipo: payload.tipo,
    canal: payload.canal,
    assunto: payload.assunto || undefined,
    mensagem: payload.mensagem,
    animalId: payload.animalId ?? undefined,
  });
  return mapComunicacao(res.data);
}

export async function updateComunicacao(id: string, payload: Partial<{
  animalId: number | null;
  tipo: string;
  canal: string;
  assunto: string;
  mensagem: string;
}>): Promise<Comunicacao> {
  const res = await api.patch(`/rececao/comunicacoes/${id}`, payload);
  return mapComunicacao(res.data);
}

export async function deleteComunicacao(id: string): Promise<void> {
  await api.post(`/rececao/comunicacoes/${id}/delete`);
}

// ── Faturas ────────────────────────────────────────────────────────────────

export async function getFaturas(): Promise<Fatura[]> {
  const res = await api.get('/rececao/faturas/pendentes');
  return (res.data as any[]).map(mapFatura);
}

export async function getAllFaturas(): Promise<Fatura[]> {
  const res = await api.get('/rececao/faturas');
  return (res.data as any[]).map(mapFatura);
}

export async function addFatura(payload: {
  animalId: number;
  descricao: string;
  valor: number;
  dataVencimento?: string;
  linhas?: {
    descricao?: string;
    quantidade: number;
    precoUnit: number;
    servicoId?: number;
  }[];
}): Promise<Fatura> {
  const numero = `FT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const res = await api.post('/rececao/faturas', {
    numero,
    valor: payload.valor,
    descricao: payload.descricao || undefined,
    animalId: payload.animalId,
    dataVencimento: payload.dataVencimento || undefined,
    linhas: payload.linhas || undefined,
  });
  return mapFatura(res.data);
}

export async function getFaturaDetalhada(id: string): Promise<FaturaDetalhada> {
  const res = await api.get(`/rececao/faturas/${id}`);
  const raw = res.data;
  return {
    ...mapFatura(raw),
    linhas: (raw.linhas ?? []) as FaturaLinha[],
    donoNome: toTitleCase(raw.animal?.dono?.nome ?? ''),
    donoEmail: raw.animal?.dono?.email ?? '',
    donoTelefone: raw.animal?.dono?.telefone ?? null,
  };
}

export async function registarPagamento(
  faturaId: string,
  valor: number,
  metodo: string,
  referencia?: string,
): Promise<void> {
  await api.post(`/rececao/faturas/${faturaId}/pagamentos`, {
    valor,
    metodo,
    referencia: referencia || undefined,
  });
}

export async function getServicos(): Promise<ServicoCatalogo[]> {
  const res = await api.get('/rececao/servicos');
  return res.data as ServicoCatalogo[];
}

export async function getServicosCatalogo(): Promise<ServicoCatalogo[]> {
  const res = await api.get('/rececao/servicos/catalogo');
  return res.data as ServicoCatalogo[];
}

export async function createServico(payload: {
  nome: string;
  categoria: string;
  preco: number;
  descricao?: string;
}): Promise<ServicoCatalogo> {
  const res = await api.post('/rececao/servicos', payload);
  return res.data as ServicoCatalogo;
}

export async function updateServico(
  id: number,
  payload: {
    nome?: string;
    categoria?: string;
    preco?: number;
    descricao?: string;
  },
): Promise<ServicoCatalogo> {
  const res = await api.patch(`/rececao/servicos/${id}`, payload);
  return res.data as ServicoCatalogo;
}

export async function toggleServico(id: number): Promise<ServicoCatalogo> {
  const res = await api.patch(`/rececao/servicos/${id}/toggle`);
  return res.data as ServicoCatalogo;
}

// ── Horários ───────────────────────────────────────────────────────────────

export async function getHorarios(): Promise<HorarioProfissional[]> {
  const res = await api.get('/rececao/horarios');
  return (res.data as any[]).map(mapHorario);
}

export async function getProfissionais(): Promise<Profissional[]> {
  const res = await api.get('/rececao/profissionais');
  return (res.data as Profissional[]).map((profissional) => ({
    ...profissional,
    nome: profissional.nome ? toTitleCase(profissional.nome) : null,
  }));
}

export async function getTecnicoDashboard(): Promise<TecnicoDashboard> {
  const { data } = await api.get<TecnicoDashboard>('/rececao/dashboard/tecnico');
  return data;
}

export async function getVeterinarioDashboard(): Promise<VeterinarioDashboard> {
  const { data } = await api.get<VeterinarioDashboard>('/rececao/dashboard/veterinario');
  return data;
}

export async function getAdminMonthlyStats(): Promise<AdminMonthlyStats> {
  const { data } = await api.get<RececaoMonthlyStatsResponse>(
    '/rececao/stats/monthly',
  );

  const receitaByMonth = new Map(
    data.receitaPorMes.map((item) => [item.mes, item.receita]),
  );
  const monthly = data.marcacoesPorMes.map((item) => ({
    ...item,
    receita: receitaByMonth.get(item.mes) ?? 0,
  }));
  const current = monthly[monthly.length - 1] ?? {
    total: 0,
    concluidas: 0,
    receita: 0,
  };
  const previous = monthly[monthly.length - 2] ?? {
    total: 0,
    concluidas: 0,
    receita: 0,
  };
  const trend = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  };

  return {
    monthly,
    species: data.distribuicaoEspecie,
    topMotivos: data.topMotivos ?? [],
    cards: {
      faturacaoMensal: current.receita,
      totalPacientes: data.distribuicaoEspecie.reduce(
        (sum, item) => sum + item.total,
        0,
      ),
      utilizadoresAtivos: 0,
      taxaOcupacao: current.total
        ? Math.round((current.concluidas / current.total) * 100)
        : 0,
    },
    trends: {
      faturacaoMensal: trend(current.receita, previous.receita),
      totalPacientes: 0,
      utilizadoresAtivos: 0,
      taxaOcupacao: trend(current.concluidas, previous.concluidas),
    },
  };
}

export async function addHorario(payload: {
  userId: number;
  diaSemana: number;
  horaEntrada: string;
  horaSaida: string;
  ativo: boolean;
  estado?: string;
  observacoes?: string;
}): Promise<HorarioProfissional> {
  const res = await api.post('/rececao/horarios', payload);
  return mapHorario(res.data);
}

export async function updateHorarioEstado(id: string, estado: string): Promise<HorarioProfissional> {
  const res = await api.patch(`/rececao/horarios/${id}/estado`, { estado });
  return mapHorario(res.data);
}

// ── Notas administrativas (localStorage — apenas informação local) ──────────

export type NotaAdmin = {
  animalId: number;
  texto: string;
  updatedAt: string;
};

const KEY_NOTAS = 'rececao:notas';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getNotasAdmin(): NotaAdmin[] {
  if (typeof window === 'undefined') return [];
  return safeParse<NotaAdmin[]>(window.localStorage.getItem(KEY_NOTAS), []);
}

export function saveNotaAdmin(animalId: number, texto: string): void {
  const current = getNotasAdmin().filter((item) => item.animalId !== animalId);
  current.unshift({ animalId, texto, updatedAt: new Date().toISOString() });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY_NOTAS, JSON.stringify(current));
  }
}

export function getNotaAdmin(animalId: number): NotaAdmin | null {
  return getNotasAdmin().find((item) => item.animalId === animalId) ?? null;
}
