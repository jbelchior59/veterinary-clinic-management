import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function at(daysFromToday: number, hour: number, minute = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function past(daysAgo: number, hour: number, minute = 0) {
  return at(-daysAgo, hour, minute);
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function upsertUser(nome: string, email: string, password: string, role: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { nome, password: hashedPassword, role },
    create: { nome, email, password: hashedPassword, role },
  });
}

async function upsertDono(params: {
  nome: string; email: string; telefone?: string; morada?: string;
}) {
  return prisma.dono.upsert({
    where: { email: params.email },
    update: { nome: params.nome, telefone: params.telefone, morada: params.morada },
    create: { nome: params.nome, email: params.email, telefone: params.telefone, morada: params.morada },
  });
}

async function ensureAnimal(
  nome: string, especie: string, donoId: number,
  extras?: { raca?: string; genero?: string; dataNascimento?: Date; peso?: number; alergias?: string; alertasClinicos?: string },
) {
  const existing = await prisma.animal.findFirst({ where: { nome, especie, donoId } });
  const data = {
    raca: extras?.raca, genero: extras?.genero,
    dataNascimento: extras?.dataNascimento, peso: extras?.peso,
    alergias: extras?.alergias, alertasClinicos: extras?.alertasClinicos,
  };
  if (existing) return prisma.animal.update({ where: { id: existing.id }, data });
  return prisma.animal.create({ data: { nome, especie, donoId, ...data } });
}

async function ensureConsulta(
  animalId: number, data: Date, observacoes: string, diagnostico: string, veterinarioId?: number,
) {
  const existing = await prisma.consulta.findFirst({ where: { animalId, data, observacoes, diagnostico } });
  if (existing) return existing;
  return prisma.consulta.create({ data: { animalId, data, observacoes, diagnostico, veterinarioId } });
}

async function ensureTratamento(
  consultaId: number, descricao: string, medicacao?: string, dataInicio?: Date, dataFim?: Date,
) {
  const existing = await prisma.tratamento.findFirst({ where: { consultaId, descricao, medicacao: medicacao ?? null } });
  if (existing) return existing;
  return prisma.tratamento.create({ data: { consultaId, descricao, medicacao, dataInicio, dataFim } });
}

async function ensureMarcacao(
  animalId: number, data: Date, motivo: string, estado = 'AGENDADA',
  criadoPorId?: number, profissionalId?: number,
) {
  const existing = await prisma.marcacao.findFirst({ where: { animalId, data, motivo } });
  if (existing) return prisma.marcacao.update({ where: { id: existing.id }, data: { estado, criadoPorId, profissionalId } });
  return prisma.marcacao.create({ data: { animalId, data, motivo, estado, criadoPorId, profissionalId } });
}

async function ensureLaboratorio(nome: string, tipo: string, especialidade?: string, contacto?: string) {
  const existing = await prisma.laboratorio.findUnique({ where: { nome } });
  if (existing) return prisma.laboratorio.update({ where: { id: existing.id }, data: { tipo, especialidade, contacto } });
  return prisma.laboratorio.create({ data: { nome, tipo, especialidade, contacto } });
}

async function ensureExame(params: {
  tipo: string; estado?: string; descricaoClinica?: string; prioridade?: string;
  dataPedido?: Date; dataConclusao?: Date; animalId: number; solicitanteId?: number; laboratorioId?: number;
}) {
  const existing = await prisma.exame.findFirst({
    where: { tipo: params.tipo, animalId: params.animalId, dataPedido: params.dataPedido ?? undefined },
  });
  const data = {
    estado: params.estado ?? 'PENDENTE', descricaoClinica: params.descricaoClinica,
    prioridade: params.prioridade ?? 'NORMAL', dataConclusao: params.dataConclusao,
    solicitanteId: params.solicitanteId, laboratorioId: params.laboratorioId,
  };
  if (existing) return prisma.exame.update({ where: { id: existing.id }, data });
  return prisma.exame.create({
    data: {
      tipo: params.tipo, dataPedido: params.dataPedido ?? new Date(),
      animalId: params.animalId, ...data,
    },
  });
}

async function ensureAmostra(params: {
  codigo: string; tipo: string; origem?: string; observacoes?: string;
  dataColheita?: Date; exameId: number; registadaPorId?: number;
}) {
  const existing = await prisma.amostra.findUnique({ where: { codigo: params.codigo } });
  const data = {
    tipo: params.tipo, origem: params.origem ?? 'INTERNA',
    observacoes: params.observacoes, dataColheita: params.dataColheita ?? new Date(),
    exameId: params.exameId, registadaPorId: params.registadaPorId,
  };
  if (existing) return prisma.amostra.update({ where: { id: existing.id }, data });
  return prisma.amostra.create({ data: { codigo: params.codigo, ...data } });
}

async function ensureResultado(params: {
  exameId: number; dados: string; parametro?: string; valor?: string; unidade?: string;
  referencia?: string; interpretacao?: string; observacoes?: string; validado?: boolean;
  dataResultado?: Date; dataValidacao?: Date; inseridoPorId?: number; validadoPorId?: number;
}) {
  const existing = await prisma.resultado.findFirst({
    where: { exameId: params.exameId, dados: params.dados, parametro: params.parametro ?? null },
  });
  const data = {
    valor: params.valor, unidade: params.unidade, referencia: params.referencia,
    interpretacao: params.interpretacao, observacoes: params.observacoes,
    validado: params.validado ?? false, dataResultado: params.dataResultado ?? new Date(),
    dataValidacao: params.dataValidacao, inseridoPorId: params.inseridoPorId,
    validadoPorId: params.validadoPorId,
  };
  if (existing) return prisma.resultado.update({ where: { id: existing.id }, data });
  return prisma.resultado.create({
    data: {
      exameId: params.exameId, dados: params.dados, parametro: params.parametro, ...data,
    },
  });
}

async function ensureRelatorio(params: {
  exameId: number; conclusao: string; observacoes?: string; recomendacoes?: string;
  dataEmissao?: Date; emitidoPorId?: number; resultadoIds?: number[];
}) {
  let relatorio = await prisma.relatorio.findUnique({ where: { exameId: params.exameId } });
  if (!relatorio) {
    relatorio = await prisma.relatorio.create({
      data: {
        exameId: params.exameId, conclusao: params.conclusao,
        observacoes: params.observacoes, recomendacoes: params.recomendacoes,
        dataEmissao: params.dataEmissao ?? new Date(), emitidoPorId: params.emitidoPorId,
      },
    });
  } else {
    relatorio = await prisma.relatorio.update({
      where: { id: relatorio.id },
      data: {
        conclusao: params.conclusao, observacoes: params.observacoes,
        recomendacoes: params.recomendacoes, emitidoPorId: params.emitidoPorId,
      },
    });
  }
  if (params.resultadoIds?.length) {
    await prisma.resultado.updateMany({
      where: { id: { in: params.resultadoIds } },
      data: { relatorioId: relatorio.id },
    });
  }
  return relatorio;
}

async function ensureInternamento(params: {
  animalId: number; motivo: string; observacoes?: string; estado?: string;
  dataEntrada?: Date; dataAlta?: Date; veterinarioId?: number;
}) {
  const existing = await prisma.internamento.findFirst({
    where: { animalId: params.animalId, motivo: params.motivo, dataEntrada: params.dataEntrada ?? undefined },
  });
  const data = {
    motivo: params.motivo, observacoes: params.observacoes, estado: params.estado ?? 'ATIVO',
    dataEntrada: params.dataEntrada ?? new Date(), dataAlta: params.dataAlta, veterinarioId: params.veterinarioId,
  };
  if (existing) return prisma.internamento.update({ where: { id: existing.id }, data });
  return prisma.internamento.create({ data: { animalId: params.animalId, ...data } });
}

async function ensureInternamentoObservacao(params: {
  internamentoId: number; observacoes: string; sinaisVitais?: string;
  alimentacao?: string; medicacao?: string; data?: Date; registadoPorId?: number;
}) {
  const existing = await prisma.internamentoObservacao.findFirst({
    where: { internamentoId: params.internamentoId, observacoes: params.observacoes, data: params.data ?? undefined },
  });
  if (existing) return existing;
  return prisma.internamentoObservacao.create({
    data: {
      internamentoId: params.internamentoId, sinaisVitais: params.sinaisVitais,
      alimentacao: params.alimentacao, medicacao: params.medicacao,
      observacoes: params.observacoes, data: params.data ?? new Date(),
      registadoPorId: params.registadoPorId,
    },
  });
}

async function ensureStockItem(params: {
  nome: string; categoria: string; unidade: string; quantidade: number; quantidadeMin: number;
  lote?: string; validade?: Date; localizacao?: string; fornecedor?: string; notas?: string;
}) {
  const existing = await prisma.stockItem.findFirst({ where: { nome: params.nome, lote: params.lote ?? null } });
  const data = { ...params };
  if (existing) return prisma.stockItem.update({ where: { id: existing.id }, data });
  return prisma.stockItem.create({ data });
}

async function ensureVacina(params: {
  animalId: number; nome: string; dataAplicacao: Date; lote?: string;
  fabricante?: string; proximaDose?: Date; observacoes?: string; aplicadoPorId?: number;
}) {
  const existing = await prisma.vacina.findFirst({
    where: { animalId: params.animalId, nome: params.nome, dataAplicacao: params.dataAplicacao },
  });
  if (existing) return existing;
  return prisma.vacina.create({ data: { ...params } });
}

async function ensureHorario(params: {
  userId: number; diaSemana: number; horaEntrada: string; horaSaida: string;
  ativo?: boolean; estado?: string; observacoes?: string; criadoPorId?: number;
}) {
  const existing = await prisma.horarioProfissional.findFirst({
    where: { userId: params.userId, diaSemana: params.diaSemana },
  });
  const data = {
    horaEntrada: params.horaEntrada, horaSaida: params.horaSaida,
    ativo: params.ativo ?? true, observacoes: params.observacoes,
    criadoPorId: params.criadoPorId,
  };
  if (existing) return prisma.horarioProfissional.update({ where: { id: existing.id }, data });
  return prisma.horarioProfissional.create({
    data: { userId: params.userId, diaSemana: params.diaSemana, ...data },
  });
}

async function ensureServico(params: {
  nome: string; categoria: string; preco: number; descricao?: string; ativo?: boolean;
}) {
  const existing = await prisma.servicoCatalogo.findFirst({ where: { nome: params.nome } });
  const data = { categoria: params.categoria, preco: params.preco, descricao: params.descricao, ativo: params.ativo ?? true };
  if (existing) return prisma.servicoCatalogo.update({ where: { id: existing.id }, data });
  return prisma.servicoCatalogo.create({ data: { nome: params.nome, ...data } });
}

async function ensureFatura(params: {
  numero: string; animalId: number; valor: number; estado?: string;
  descricao?: string; dataEmissao?: Date; dataVencimento?: Date; criadaPorId?: number;
}) {
  const existing = await prisma.fatura.findUnique({ where: { numero: params.numero } });
  if (existing) return existing;
  return prisma.fatura.create({
    data: {
      numero: params.numero, animalId: params.animalId, valor: params.valor,
      estado: params.estado ?? 'PENDENTE', descricao: params.descricao,
      dataEmissao: params.dataEmissao ?? new Date(),
      dataVencimento: params.dataVencimento, criadaPorId: params.criadaPorId,
    },
  });
}

async function ensureFaturaLinha(params: {
  faturaId: number; descricao: string; quantidade: number;
  precoUnit: number; total: number; servicoId?: number;
}) {
  const existing = await prisma.faturaLinha.findFirst({
    where: { faturaId: params.faturaId, descricao: params.descricao },
  });
  if (existing) return existing;
  return prisma.faturaLinha.create({ data: { ...params } });
}

async function ensurePagamento(params: {
  faturaId: number; valor: number; metodo: string; referencia?: string; dataPagamento?: Date; registadoPorId?: number;
}) {
  const existing = await prisma.pagamento.findFirst({
    where: { faturaId: params.faturaId, valor: params.valor, metodo: params.metodo },
  });
  if (existing) return existing;
  return prisma.pagamento.create({
    data: { ...params, dataPagamento: params.dataPagamento ?? new Date() },
  });
}

async function ensureNotaRapida(params: {
  animalId: number; texto: string; autorId?: number;
}) {
  const existing = await prisma.notaRapida.findFirst({
    where: { animalId: params.animalId, texto: params.texto },
  });
  if (existing) return existing;
  return prisma.notaRapida.create({ data: { ...params } });
}

async function ensureComunicacao(params: {
  tipo: string; canal: string; mensagem: string; assunto?: string;
  estado?: string; animalId?: number; criadoPorId?: number; data?: Date;
}) {
  const existing = await prisma.comunicacao.findFirst({
    where: { tipo: params.tipo, canal: params.canal, mensagem: params.mensagem },
  });
  if (existing) return existing;
  return prisma.comunicacao.create({
    data: {
      tipo: params.tipo, canal: params.canal, mensagem: params.mensagem,
      assunto: params.assunto, estado: params.estado ?? 'REGISTADA',
      animalId: params.animalId, criadoPorId: params.criadoPorId,
    },
  });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── utilizadores ────────────────────────────────────────────────────────────
  const admin       = await upsertUser('Administrador',       'admin@les.local',            'admin123',   'ADMIN');
  const vet         = await upsertUser('Dr. Gonçalo Vet',     'vet@les.local',              'vet123',     'VETERINARIO');
  const vetAna      = await upsertUser('Dra. Ana Ribeiro',    'ana.vet@les.local',          'ana123',     'VETERINARIO');
  const rececao     = await upsertUser('Rita Receção',        'rececao@les.local',          'rececao123', 'RECECIONISTA');
  const rececaoMiguel = await upsertUser('Miguel Receção',    'miguel.rececao@les.local',   'miguel123',  'RECECIONISTA');
  const tecnico     = await upsertUser('Tiago Técnico',       'tecnico@les.local',          'tecnico123', 'TECNICO');
  const tecnicaSofia = await upsertUser('Sofia Técnica',      'sofia.lab@les.local',        'sofia123',   'TECNICO');

  // ── horários profissionais ────────────────────────────────────────────────
  // 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb
  for (const dia of [1, 2, 3, 4, 5]) {
    await ensureHorario({ userId: vet.id,     diaSemana: dia, horaEntrada: '09:00', horaSaida: '17:00', criadoPorId: admin.id });
    await ensureHorario({ userId: tecnico.id, diaSemana: dia, horaEntrada: '08:00', horaSaida: '16:00', criadoPorId: admin.id });
    await ensureHorario({ userId: rececao.id, diaSemana: dia, horaEntrada: '08:00', horaSaida: '17:00', criadoPorId: admin.id });
  }
  for (const dia of [1, 2, 3]) {
    await ensureHorario({ userId: vetAna.id, diaSemana: dia, horaEntrada: '09:00', horaSaida: '17:00', criadoPorId: admin.id });
  }
  for (const dia of [4, 5]) {
    await ensureHorario({ userId: vetAna.id, diaSemana: dia, horaEntrada: '12:00', horaSaida: '20:00', criadoPorId: admin.id });
  }
  for (const dia of [2, 3, 4, 5, 6]) {
    await ensureHorario({ userId: tecnicaSofia.id,    diaSemana: dia, horaEntrada: '10:00', horaSaida: '18:00', criadoPorId: admin.id });
    await ensureHorario({ userId: rececaoMiguel.id,   diaSemana: dia, horaEntrada: '12:00', horaSaida: '20:00', criadoPorId: admin.id });
  }

  // ── donos ────────────────────────────────────────────────────────────────
  const joao    = await upsertDono({ nome: 'João Silva',     email: 'joao.silva@clinic.local',     telefone: '912345678', morada: 'Rua das Flores, Faro' });
  const maria   = await upsertDono({ nome: 'Maria Santos',   email: 'maria.santos@clinic.local',   telefone: '923456789', morada: 'Avenida do Mar, Olhão' });
  const pedro   = await upsertDono({ nome: 'Pedro Costa',    email: 'pedro.costa@clinic.local',    telefone: '934567890', morada: 'Largo da Sé, Loulé' });
  const ana     = await upsertDono({ nome: 'Ana Martins',    email: 'ana.martins@clinic.local',    telefone: '915678234', morada: 'Rua do Mercado, Portimão' });
  const ricardo = await upsertDono({ nome: 'Ricardo Almeida',email: 'ricardo.almeida@clinic.local',telefone: '919888777', morada: 'Urbanização do Lago, Faro' });
  const ines    = await upsertDono({ nome: 'Inês Oliveira',  email: 'ines.oliveira@clinic.local',  telefone: '927654321', morada: 'Rua da Ria Formosa, Tavira' });
  const sofia   = await upsertDono({ nome: 'Sofia Neves',    email: 'sofia.neves@clinic.local',    telefone: '933221144', morada: 'Travessa das Amendoeiras, Loulé' });

  // ── animais ───────────────────────────────────────────────────────────────
  const bobi   = await ensureAnimal('Bobi',   'Cão',    joao.id,    { raca: 'Labrador Retriever', genero: 'M', dataNascimento: new Date('2020-05-10'), peso: 24.5 });
  const nina   = await ensureAnimal('Nina',   'Gato',   joao.id,    { raca: 'Siamês',             genero: 'F', dataNascimento: new Date('2022-03-02'), peso: 3.9 });
  const luna   = await ensureAnimal('Luna',   'Gato',   maria.id,   { raca: 'Europeu Comum',      genero: 'F', dataNascimento: new Date('2021-08-15'), peso: 4.2 });
  const thor   = await ensureAnimal('Thor',   'Cão',    pedro.id,   { raca: 'Pastor Alemão',      genero: 'M', dataNascimento: new Date('2019-02-01'), peso: 31.0, alertasClinicos: 'Comportamento dominante — aproximação com cautela.' });
  const kika   = await ensureAnimal('Kika',   'Cão',    ana.id,     { raca: 'Caniche',            genero: 'F', dataNascimento: new Date('2018-11-20'), peso: 7.8 });
  const rex    = await ensureAnimal('Rex',    'Cão',    ricardo.id, { raca: 'Beagle',             genero: 'M', dataNascimento: new Date('2023-01-11'), peso: 11.4 });
  const mimi   = await ensureAnimal('Mimi',   'Gato',   ines.id,    { raca: 'Persa',              genero: 'F', dataNascimento: new Date('2016-09-04'), peso: 4.8, alertasClinicos: 'Paciente geriátrica — monitorização renal periódica.' });
  const simba  = await ensureAnimal('Simba',  'Gato',   sofia.id,   { raca: 'Maine Coon',         genero: 'M', dataNascimento: new Date('2021-12-12'), peso: 6.7 });
  const pipoca = await ensureAnimal('Pipoca', 'Coelho', ana.id,     { raca: 'Anão Holandês',      genero: 'F', dataNascimento: new Date('2022-07-01'), peso: 1.4, alergias: 'Sensível a pellets com soja.' });

  // ── vacinas ───────────────────────────────────────────────────────────────
  await ensureVacina({ animalId: bobi.id,  nome: 'Raiva',                dataAplicacao: past(240, 10), lote: 'RB-2024-01', fabricante: 'MSD Animal Health', proximaDose: at(125, 10),  aplicadoPorId: vet.id });
  await ensureVacina({ animalId: bobi.id,  nome: 'Polivalente (DHPPi+L)',  dataAplicacao: past(180, 10), lote: 'PV-2024-08', fabricante: 'Boehringer',         proximaDose: at(185, 10),  aplicadoPorId: vet.id });
  await ensureVacina({ animalId: luna.id,  nome: 'Trivalente Felina',      dataAplicacao: past(90,  9),  lote: 'TF-2025-03', fabricante: 'Zoetis',             proximaDose: at(275, 9),   aplicadoPorId: vetAna.id });
  await ensureVacina({ animalId: thor.id,  nome: 'Raiva',                dataAplicacao: past(362, 11), lote: 'RB-2024-02', fabricante: 'MSD Animal Health', proximaDose: at(3, 11),    aplicadoPorId: vet.id, observacoes: 'Reforço anual quase no prazo.' });
  await ensureVacina({ animalId: kika.id,  nome: 'Polivalente (DHPPi+L)',  dataAplicacao: past(60,  10), lote: 'PV-2025-05', fabricante: 'Boehringer',         proximaDose: at(305, 10),  aplicadoPorId: vetAna.id });
  await ensureVacina({ animalId: mimi.id,  nome: 'Trivalente Felina',      dataAplicacao: past(420, 9),  lote: 'TF-2024-01', fabricante: 'Zoetis',             proximaDose: past(55, 9),  aplicadoPorId: vetAna.id, observacoes: 'REFORÇO EM ATRASO — reagendar urgente.' });
  await ensureVacina({ animalId: simba.id, nome: 'Trivalente Felina',      dataAplicacao: past(30,  10), lote: 'TF-2025-10', fabricante: 'Zoetis',             proximaDose: at(335, 10),  aplicadoPorId: vet.id });
  await ensureVacina({ animalId: rex.id,   nome: 'Polivalente (DHPPi+L)',  dataAplicacao: past(15,  11), lote: 'PV-2025-11', fabricante: 'Boehringer',         proximaDose: at(350, 11),  aplicadoPorId: vet.id });

  // ── consultas ─────────────────────────────────────────────────────────────
  const consultaBobiRotina = await ensureConsulta(bobi.id, past(16, 10), 'Consulta de rotina. Animal ativo, apetite normal e sem sinais de dor.', 'Bom estado geral. Manter vigilância e rotina habitual.', vet.id);
  const consultaBobiGastro = await ensureConsulta(bobi.id, past(8, 15, 30), 'Reavaliação após vómitos esporádicos. Abdómen sem dor à palpação.', 'Gastroenterite ligeira. Dieta branda por 3 dias e hidratação reforçada.', vet.id);
  const consultaLunaDerm   = await ensureConsulta(luna.id, past(11, 9, 15), 'Queixas de prurido e queda de pelo na região dorsal.', 'Suspeita de dermatite alérgica. Iniciar tratamento tópico e pedir bioquímica.', vetAna.id);
  const consultaThorVacina = await ensureConsulta(thor.id, past(25, 16), 'Vacinação anual e exame físico geral. Sem alterações relevantes.', 'Apto para vacinação. Reforço anual administrado.', vet.id);
  const consultaKikaOrtopedia = await ensureConsulta(kika.id, past(4, 11, 20), 'Claudicação intermitente no membro posterior direito. Dor ligeira à extensão.', 'Suspeita de processo articular ligeiro. Pedida radiografia e repouso relativo.', vetAna.id);
  const consultaRexOtite   = await ensureConsulta(rex.id,  past(3, 14, 10), 'Abanar frequente da cabeça e prurido auricular. Canal auditivo com secreção.', 'Otite externa provável. Colheita para citologia auricular.', vet.id);
  const consultaMimiGeriatrica = await ensureConsulta(mimi.id, past(2, 10, 45), 'Consulta geriátrica. Aumento da ingestão de água e perda ligeira de peso.', 'Suspeita de doença renal inicial. Pedida urianálise e perfil renal.', vetAna.id);
  const consultaSimbaDental = await ensureConsulta(simba.id, past(18, 12), 'Halitose e gengivite moderada. Tutor refere diminuição da mastigação.', 'Doença periodontal moderada. Preparação para destartarização.', vet.id);

  void consultaBobiRotina;
  void consultaThorVacina;

  // ── tratamentos ───────────────────────────────────────────────────────────
  await ensureTratamento(consultaBobiGastro.id,    'Dieta branda durante 3 dias e monitorização do apetite.',                  'Probiótico oral 1x/dia',                          past(8, 0),  past(5, 0));
  await ensureTratamento(consultaLunaDerm.id,      'Aplicação tópica diária e controlo de exposição a potenciais alergénios.', 'Spray dermatológico 2x/dia',                       past(11, 0), at(2, 0));
  await ensureTratamento(consultaKikaOrtopedia.id, 'Repouso relativo, passeios curtos e reavaliação após resultado imagiológico.','Anti-inflamatório 1x/dia durante 4 dias',       past(4, 0),  at(0, 0));
  await ensureTratamento(consultaRexOtite.id,      'Limpeza auricular e aplicação local conforme tolerância.',                 'Gotas auriculares 2x/dia durante 7 dias',          past(3, 0),  at(4, 0));
  await ensureTratamento(consultaMimiGeriatrica.id,'Incentivar hidratação e monitorizar ingestão de água até resultados.',     undefined,                                          past(2, 0),  at(5, 0));
  await ensureTratamento(consultaSimbaDental.id,   'Higiene oral progressiva e agendamento de destartarização.',              'Gel oral enzimático 1x/dia',                       past(18, 0), at(12, 0));

  // ── marcações ─────────────────────────────────────────────────────────────
  // Esta semana (hoje + próximos dias)
  await ensureMarcacao(bobi.id,   at(0, 9, 30),  'Consulta de seguimento gastrointestinal', 'CONFIRMADA',rececao.id,       vet.id);
  await ensureMarcacao(luna.id,   at(0, 11),     'Reavaliação dermatológica',               'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(rex.id,    at(0, 15, 15), 'Revisão de otite externa',                'AGENDADA',  rececaoMiguel.id, vet.id);
  await ensureMarcacao(mimi.id,   at(1, 10),     'Discussão de resultados renais',          'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(kika.id,   at(2, 16, 30), 'Reavaliação ortopédica',                 'AGENDADA',  rececaoMiguel.id, vetAna.id);
  await ensureMarcacao(simba.id,  at(3, 9),      'Preparação pré-cirúrgica dentária',       'AGENDADA',  rececao.id,       vet.id);
  await ensureMarcacao(pipoca.id, at(4, 12),     'Consulta de rotina de exóticos',          'AGENDADA',  rececaoMiguel.id, vetAna.id);
  await ensureMarcacao(thor.id,   at(5, 11),     'Reforço vacinal — Raiva',                 'AGENDADA',  rececao.id,       vet.id);
  // Semana seguinte
  await ensureMarcacao(nina.id,   at(6, 10),     'Consulta de rotina',                      'AGENDADA',  rececao.id,       vet.id);
  await ensureMarcacao(bobi.id,   at(6, 14, 30), 'Controlo pós-gastroenterite',             'AGENDADA',  rececaoMiguel.id, vet.id);
  await ensureMarcacao(luna.id,   at(7, 9, 30),  'Controlo dermatológico — 2ª avaliação',   'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(mimi.id,   at(7, 11),     'Reavaliação renal — resultados',          'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(rex.id,    at(8, 10, 30), 'Controlo otite — 5 dias',                 'AGENDADA',  rececaoMiguel.id, vet.id);
  await ensureMarcacao(kika.id,   at(8, 15),     'Análise de radiografia ortopédica',       'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(simba.id,  at(9, 9),      'Destartarização — cirurgia',              'AGENDADA',  rececao.id,       vet.id);
  await ensureMarcacao(thor.id,   at(9, 16),     'Revisão pós-vacinal',                     'AGENDADA',  rececaoMiguel.id, vet.id);
  await ensureMarcacao(pipoca.id, at(10, 11, 30),'Controlo pós-consulta exóticos',          'AGENDADA',  rececao.id,       vetAna.id);
  await ensureMarcacao(bobi.id,   at(12, 10),    'Consulta de rotina mensal',               'AGENDADA',  rececao.id,       vet.id);
  // Passado recente
  await ensureMarcacao(thor.id,   past(1, 16),   'Vacinação anual',                         'CANCELADA', rececao.id);
  await ensureMarcacao(nina.id,   past(6, 17, 30),'Desparasitação interna',                 'CONCLUIDA', rececao.id,       vet.id);

  // ── laboratórios ──────────────────────────────────────────────────────────
  const labInterno = await ensureLaboratorio('Laboratório Interno VetClinic',  'INTERNO', 'Bioquímica, Hematologia e Urianálise',      'interno@vetclinic.local');
  const labExterno = await ensureLaboratorio('LabPartner Diagnósticos',        'EXTERNO', 'Microbiologia, PCR e Histopatologia',        'parcerias@labpartner.local');

  // ── exames ────────────────────────────────────────────────────────────────
  const exameBobi  = await ensureExame({ tipo: 'Hemograma Completo',                    estado: 'VALIDADO',    descricaoClinica: 'Exame solicitado após episódio de vómitos para excluir processo inflamatório relevante.', prioridade: 'NORMAL', dataPedido: past(8, 16),    dataConclusao: past(8, 18, 30), animalId: bobi.id,  solicitanteId: vet.id,    laboratorioId: labInterno.id });
  const exameLuna  = await ensureExame({ tipo: 'Bioquímica Sérica',                     estado: 'CONCLUIDO',   descricaoClinica: 'Avaliação complementar no contexto dermatológico antes de medicação sistémica.', prioridade: 'NORMAL', dataPedido: past(11, 10),   dataConclusao: past(11, 12, 30), animalId: luna.id,  solicitanteId: vetAna.id, laboratorioId: labInterno.id });
  const exameThor  = await ensureExame({ tipo: 'PCR Dermatofitose',                     estado: 'PENDENTE',    descricaoClinica: 'Pedido enviado para laboratório externo por lesão circular suspeita.',              prioridade: 'ALTA',   dataPedido: past(1, 9),                            animalId: thor.id,  solicitanteId: vet.id,    laboratorioId: labExterno.id });
  const exameKika  = await ensureExame({ tipo: 'Radiografia Membro Posterior Direito',  estado: 'PENDENTE',    descricaoClinica: 'Avaliação de claudicação intermitente.',                                           prioridade: 'NORMAL', dataPedido: past(4, 12),                           animalId: kika.id,  solicitanteId: vetAna.id, laboratorioId: labInterno.id });
  const exameRex   = await ensureExame({ tipo: 'Citologia Auricular',                   estado: 'CONCLUIDO',   descricaoClinica: 'Secreção auricular e prurido. Identificar presença de leveduras/bactérias.',       prioridade: 'NORMAL', dataPedido: past(3, 14, 45), dataConclusao: past(1, 11), animalId: rex.id,   solicitanteId: vet.id,    laboratorioId: labInterno.id });
  const exameMimi  = await ensureExame({ tipo: 'Urianálise + Relação Proteína/Creatinina',estado: 'CONCLUIDO', descricaoClinica: 'Suspeita de doença renal inicial em paciente geriátrico.',                        prioridade: 'ALTA',   dataPedido: past(2, 11, 10),dataConclusao: past(2, 15),    animalId: mimi.id,  solicitanteId: vetAna.id, laboratorioId: labInterno.id });
  const exameSimba = await ensureExame({ tipo: 'Perfil Pré-Anestésico',                 estado: 'VALIDADO',    descricaoClinica: 'Avaliação pré-anestésica antes de destartarização.',                              prioridade: 'NORMAL', dataPedido: past(18, 12, 20),dataConclusao: past(18, 17), animalId: simba.id, solicitanteId: vet.id,    laboratorioId: labInterno.id });
  const exameNina  = await ensureExame({ tipo: 'Coprológico Parasitário',               estado: 'PENDENTE',    descricaoClinica: 'Controlo parasitário após episódio de diarreia ligeira.',                         prioridade: 'NORMAL', dataPedido: at(0, 8, 30),                          animalId: nina.id,  solicitanteId: vet.id,    laboratorioId: labInterno.id });

  void exameThor; void exameKika; void exameNina;

  // ── amostras ──────────────────────────────────────────────────────────────
  await ensureAmostra({ codigo: 'AM-BB-HEM-001', tipo: 'Sangue EDTA',    origem: 'INTERNA', observacoes: 'Colheita sem intercorrências.',                          dataColheita: past(8, 16, 20),  exameId: exameBobi.id,  registadaPorId: tecnico.id });
  await ensureAmostra({ codigo: 'AM-LN-BIO-001', tipo: 'Soro',           origem: 'INTERNA', observacoes: 'Amostra para bioquímica sérica.',                        dataColheita: past(11, 10, 20), exameId: exameLuna.id,  registadaPorId: tecnicaSofia.id });
  await ensureAmostra({ codigo: 'AM-RX-CIT-001', tipo: 'Swab auricular', origem: 'INTERNA', observacoes: 'Amostra em coloração rápida para análise microscópica.', dataColheita: past(3, 15),      exameId: exameRex.id,   registadaPorId: tecnico.id });
  await ensureAmostra({ codigo: 'AM-MM-URI-001', tipo: 'Urina',          origem: 'INTERNA', observacoes: 'Colheita por cistocentese. Amostra refrigerada.',        dataColheita: past(2, 11, 30),  exameId: exameMimi.id,  registadaPorId: tecnicaSofia.id });
  await ensureAmostra({ codigo: 'AM-SB-PRE-001', tipo: 'Sangue + Soro',  origem: 'INTERNA', observacoes: 'Perfil pré-anestésico completo.',                        dataColheita: past(18, 12, 45), exameId: exameSimba.id, registadaPorId: tecnico.id });

  // ── resultados ────────────────────────────────────────────────────────────
  const resultadoBobi1 = await ensureResultado({ exameId: exameBobi.id,  parametro: 'Hemoglobina',        valor: '13.8', unidade: 'g/dL',    referencia: '12.0 - 18.0', dados: 'Valor dentro do intervalo de referência.',             observacoes: 'Sem alterações relevantes.',                              validado: true,  dataResultado: past(8, 18),     dataValidacao: past(8, 18, 20), inseridoPorId: tecnico.id,      validadoPorId: vet.id });
  const resultadoBobi2 = await ensureResultado({ exameId: exameBobi.id,  parametro: 'Leucócitos',         valor: '9.2',  unidade: 'x10^9/L', referencia: '6.0 - 17.0',  dados: 'Leucograma sem alterações significativas.',            observacoes: 'Compatível com quadro ligeiro e sem alarme laboratorial.', validado: true,  dataResultado: past(8, 18, 5),  dataValidacao: past(8, 18, 20), inseridoPorId: tecnico.id,      validadoPorId: vet.id });
  const resultadoLuna  = await ensureResultado({ exameId: exameLuna.id,  parametro: 'ALT',                valor: '58',   unidade: 'U/L',     referencia: '20 - 100',    dados: 'Valor dentro do intervalo esperado.',                  observacoes: 'Pendente de validação clínica.',                          validado: false, dataResultado: past(11, 12, 30),                                inseridoPorId: tecnicaSofia.id });
  const resultadoMimi1 = await ensureResultado({ exameId: exameMimi.id,  parametro: 'Densidade urinária', valor: '1.018',unidade: '',        referencia: '> 1.035',     dados: 'Densidade urinária diminuída para espécie felina.',    observacoes: 'Sugere incapacidade de concentração urinária.',           validado: false, dataResultado: past(2, 14, 45),                                 inseridoPorId: tecnicaSofia.id });
  const resultadoMimi2 = await ensureResultado({ exameId: exameMimi.id,  parametro: 'UPC',                valor: '0.46', unidade: '',        referencia: '< 0.40',      dados: 'Proteinúria ligeira.',                                 observacoes: 'Interpretar em conjunto com bioquímica renal.',           validado: false, dataResultado: past(2, 14, 50),                                 inseridoPorId: tecnicaSofia.id });
  const resultadoSimba1= await ensureResultado({ exameId: exameSimba.id, parametro: 'Creatinina',         valor: '1.1',  unidade: 'mg/dL',   referencia: '0.8 - 2.4',   dados: 'Função renal sem alterações laboratoriais relevantes.', observacoes: 'Apto para procedimento anestésico.',                      validado: true,  dataResultado: past(18, 16, 30),dataValidacao: past(18, 17, 10),inseridoPorId: tecnico.id,      validadoPorId: vet.id });
  const resultadoSimba2= await ensureResultado({ exameId: exameSimba.id, parametro: 'ALT',                valor: '42',   unidade: 'U/L',     referencia: '20 - 100',    dados: 'Enzima hepática dentro dos valores de referência.',    observacoes: 'Sem contraindicação laboratorial evidente.',              validado: true,  dataResultado: past(18, 16, 35),dataValidacao: past(18, 17, 10),inseridoPorId: tecnico.id,      validadoPorId: vet.id });
  const resultadoRex   = await ensureResultado({ exameId: exameRex.id,   parametro: 'Citologia Auricular', valor: 'Positivo', unidade: '', referencia: 'Negativo',    dados: 'Leveduras (Malassezia spp.) em grande quantidade. Presença de neutrófilos e debris celulares.', observacoes: 'Coloração Diff-Quick. Estimativa: >40 leveduras/campo de imersão.', interpretacao: 'Otite externa por Malassezia spp. Recomendado tratamento antifúngico tópico.', validado: false, dataResultado: past(1, 10, 30), inseridoPorId: tecnico.id });

  void resultadoLuna; void resultadoMimi1; void resultadoMimi2; void resultadoRex;

  // ── relatórios ────────────────────────────────────────────────────────────
  await ensureRelatorio({ exameId: exameBobi.id,  conclusao: 'Hemograma sem alterações clinicamente relevantes.',              observacoes: 'Resultados compatíveis com recuperação favorável do quadro gastrointestinal ligeiro.',    recomendacoes: 'Manter dieta branda e reavaliar apenas se houver agravamento ou recorrência dos vómitos.', dataEmissao: past(8, 18, 25), emitidoPorId: vet.id,    resultadoIds: [resultadoBobi1.id, resultadoBobi2.id] });
  await ensureRelatorio({ exameId: exameSimba.id, conclusao: 'Perfil pré-anestésico dentro dos parâmetros esperados.',         observacoes: 'Sem alterações laboratoriais que contraindiquem procedimento dentário planeado.',          recomendacoes: 'Pode avançar para destartarização com protocolo anestésico habitual.',                    dataEmissao: past(18, 17, 20),emitidoPorId: vet.id,    resultadoIds: [resultadoSimba1.id, resultadoSimba2.id] });

  // ── internamentos ─────────────────────────────────────────────────────────
  const internamentoKika = await ensureInternamento({ animalId: kika.id,  motivo: 'Observação ortopédica após episódio de claudicação.',    observacoes: 'Manter repouso, avaliar dor e mobilidade durante 24h.',                                estado: 'ATIVO', dataEntrada: at(0, 9, 10),    veterinarioId: vetAna.id });
  const internamentoMimi = await ensureInternamento({ animalId: mimi.id,  motivo: 'Fluidoterapia e monitorização renal.',                   observacoes: 'Paciente geriátrica com suspeita renal. Monitorizar hidratação e diurese.',            estado: 'ATIVO', dataEntrada: past(1, 18),     veterinarioId: vetAna.id });
  const internamentoSimba= await ensureInternamento({ animalId: simba.id, motivo: 'Recuperação pós-procedimento dentário.',                 observacoes: 'Recuperação anestésica sem intercorrências. Alta dada no dia seguinte.',               estado: 'ALTA',  dataEntrada: past(10, 9, 30), dataAlta: past(9, 17, 15), veterinarioId: vet.id });

  await ensureInternamentoObservacao({ internamentoId: internamentoKika.id,  observacoes: 'Animal alerta, dor ligeira ao apoio. Mantém apetite.',                   sinaisVitais: 'T 38.5ºC, FC 96 bpm, FR 24 rpm',  alimentacao: 'Aceitou alimento húmido em pequena quantidade.', medicacao: 'Anti-inflamatório administrado conforme plano.', data: at(0, 11, 30),    registadoPorId: vetAna.id });
  await ensureInternamentoObservacao({ internamentoId: internamentoMimi.id,  observacoes: 'Paciente tranquila. Ingestão de água reduzida, fluidoterapia em curso.',  sinaisVitais: 'T 38.2ºC, FC 148 bpm, FR 28 rpm', alimentacao: 'Recusou ração seca; aceitou pequena quantidade de patê renal.', medicacao: 'Fluidoterapia IV e antiemético.', data: past(1, 21),    registadoPorId: vetAna.id });
  await ensureInternamentoObservacao({ internamentoId: internamentoSimba.id, observacoes: 'Recuperação anestésica adequada. Sem hemorragia oral ativa.',             sinaisVitais: 'T 38.1ºC, FC 112 bpm, FR 22 rpm', alimentacao: 'Aguardar oferta alimentar até plena recuperação.', medicacao: 'Analgesia pós-operatória administrada.', data: past(10, 13), registadoPorId: vet.id });

  // ── stock ─────────────────────────────────────────────────────────────────
  await ensureStockItem({ nome: 'PCR Master Mix',       categoria: 'Biologia Molecular', unidade: 'frascos',   quantidade: 8,  quantidadeMin: 3, lote: 'PCR-9921', validade: at(90, 0),  localizacao: 'Frio B2',    fornecedor: 'BioStore',        notas: 'Manter refrigerado entre 2-8ºC.' });
  await ensureStockItem({ nome: 'Corante Diff-Quick',   categoria: 'Citologia',          unidade: 'kits',      quantidade: 2,  quantidadeMin: 2, lote: 'DQ-4410',  validade: at(25, 0),  localizacao: 'Lab A1',     fornecedor: 'VetLab Supplies', notas: 'Validade próxima — reabastecer.' });
  await ensureStockItem({ nome: 'Tiras de Urianálise',  categoria: 'Urianálise',         unidade: 'caixas',    quantidade: 5,  quantidadeMin: 2, lote: 'URI-7752', validade: at(180, 0), localizacao: 'Armário U1', fornecedor: 'VetLab Supplies' });
  await ensureStockItem({ nome: 'Tubos EDTA',           categoria: 'Hematologia',        unidade: 'unidades',  quantidade: 25, quantidadeMin: 10,lote: 'EDTA-3308',validade: at(240, 0), localizacao: 'Gaveta H3',  fornecedor: 'MedVet' });
  await ensureStockItem({ nome: 'Reagente ALT',         categoria: 'Bioquímica',         unidade: 'frascos',   quantidade: 1,  quantidadeMin: 2, lote: 'ALT-1206', validade: at(120, 0), localizacao: 'Frio B1',    fornecedor: 'BioStore',        notas: 'Stock abaixo do mínimo — encomenda pendente.' });
  await ensureStockItem({ nome: 'Seringas 5 mL',        categoria: 'Material Clínico',   unidade: 'unidades',  quantidade: 80, quantidadeMin: 20,lote: 'SR-2025-04',validade: at(730, 0), localizacao: 'Armário C2', fornecedor: 'MedVet' });
  await ensureStockItem({ nome: 'Luvas nitrilo M',      categoria: 'EPI',                unidade: 'caixas',    quantidade: 6,  quantidadeMin: 3, lote: 'GL-M-2025', validade: at(548, 0), localizacao: 'Armário C1', fornecedor: 'MedStore' });
  await ensureStockItem({ nome: 'Soro Fisiológico 500mL',categoria: 'Fluidoterapia',     unidade: 'unidades',  quantidade: 12, quantidadeMin: 5, lote: 'SF-0925',  validade: at(365, 0), localizacao: 'Armazém F1', fornecedor: 'PharmVet',        notas: 'Uso em internamentos e cirurgia.' });

  // ── catálogo de serviços ──────────────────────────────────────────────────
  const svcConsultaRotina = await ensureServico({ nome: 'Consulta de Rotina',       categoria: 'Consultas',    preco: 35,  descricao: 'Exame físico geral e avaliação de bem-estar.' });
  const svcConsultaUrgencia = await ensureServico({ nome: 'Consulta de Urgência',   categoria: 'Consultas',    preco: 55,  descricao: 'Atendimento urgente fora de horário ou sem marcação prévia.' });
  const svcHemograma      = await ensureServico({ nome: 'Hemograma Completo',       categoria: 'Laboratório',  preco: 45,  descricao: 'Contagem de células sanguíneas e leucograma.' });
  const svcBioquimica     = await ensureServico({ nome: 'Bioquímica Sérica',        categoria: 'Laboratório',  preco: 50,  descricao: 'Perfil bioquímico com enzimas hepáticas e função renal.' });
  const svcCitologia      = await ensureServico({ nome: 'Citologia',                categoria: 'Laboratório',  preco: 30,  descricao: 'Análise microscópica de amostras celulares.' });
  const svcUrianálise     = await ensureServico({ nome: 'Urianálise',               categoria: 'Laboratório',  preco: 25,  descricao: 'Análise físico-química e microscopia urinária.' });
  const svcDestartarizacao= await ensureServico({ nome: 'Destartarização',          categoria: 'Cirurgia',     preco: 120, descricao: 'Limpeza dentária com remoção de tártaro sob anestesia.' });
  const svcVacinacao      = await ensureServico({ nome: 'Vacinação',                categoria: 'Preventiva',   preco: 25,  descricao: 'Administração de vacina e registo clínico.' });
  const svcDesparasitacao = await ensureServico({ nome: 'Desparasitação Interna',   categoria: 'Preventiva',   preco: 15,  descricao: 'Tratamento antiparasitário interno.' });
  const svcInternamento   = await ensureServico({ nome: 'Internamento (por dia)',   categoria: 'Internamento', preco: 40,  descricao: 'Alojamento, monitorização e cuidados básicos diários.' });
  const svcPreAnestesico  = await ensureServico({ nome: 'Perfil Pré-Anestésico',   categoria: 'Laboratório',  preco: 65,  descricao: 'Painel laboratorial para avaliação pré-cirúrgica.' });

  void svcConsultaUrgencia; void svcCitologia; void svcUrianálise; void svcVacinacao; void svcDesparasitacao;

  // ── faturas ───────────────────────────────────────────────────────────────
  // Fatura paga — João / Bobi (consulta gastro + hemograma)
  const fatBobiGastro = await ensureFatura({
    numero: 'FT-2025-0042', animalId: bobi.id, valor: 80,
    estado: 'PAGA', dataEmissao: past(8, 19), dataVencimento: past(1, 0), criadaPorId: rececao.id,
  });
  await ensureFaturaLinha({ faturaId: fatBobiGastro.id, descricao: svcConsultaRotina.nome, quantidade: 1, precoUnit: svcConsultaRotina.preco, total: svcConsultaRotina.preco, servicoId: svcConsultaRotina.id });
  await ensureFaturaLinha({ faturaId: fatBobiGastro.id, descricao: svcHemograma.nome,      quantidade: 1, precoUnit: svcHemograma.preco,      total: svcHemograma.preco,      servicoId: svcHemograma.id });
  await ensurePagamento({ faturaId: fatBobiGastro.id, valor: 80, metodo: 'Cartão', dataPagamento: past(8, 19, 30), registadoPorId: rececao.id });

  // Fatura pendente — Ana / Kika (consulta ortopédica)
  const fatKikaOrtopedia = await ensureFatura({
    numero: 'FT-2025-0051', animalId: kika.id, valor: 35,
    estado: 'PENDENTE', dataEmissao: past(4, 12), dataVencimento: at(10, 0), criadaPorId: rececaoMiguel.id,
  });
  await ensureFaturaLinha({ faturaId: fatKikaOrtopedia.id, descricao: svcConsultaRotina.nome, quantidade: 1, precoUnit: svcConsultaRotina.preco, total: svcConsultaRotina.preco, servicoId: svcConsultaRotina.id });

  // Fatura paga — Inês / Mimi (consulta geriátrica + urianálise)
  const fatMimiRenal = await ensureFatura({
    numero: 'FT-2025-0055', animalId: mimi.id, valor: 60,
    estado: 'PAGA', dataEmissao: past(2, 16), dataVencimento: at(5, 0), criadaPorId: rececao.id,
  });
  await ensureFaturaLinha({ faturaId: fatMimiRenal.id, descricao: svcConsultaRotina.nome, quantidade: 1, precoUnit: svcConsultaRotina.preco, total: svcConsultaRotina.preco, servicoId: svcConsultaRotina.id });
  await ensureFaturaLinha({ faturaId: fatMimiRenal.id, descricao: svcUrianálise.nome,     quantidade: 1, precoUnit: svcUrianálise.preco,     total: svcUrianálise.preco,     servicoId: svcUrianálise.id });
  await ensurePagamento({ faturaId: fatMimiRenal.id, valor: 60, metodo: 'Multibanco', dataPagamento: past(2, 16, 30), registadoPorId: rececao.id });

  // Fatura paga — Sofia / Simba (destartarização + pré-anestésico + internamento 2 dias)
  const fatSimbaDestartarizacao = await ensureFatura({
    numero: 'FT-2025-0038', animalId: simba.id, valor: 265,
    estado: 'PAGA', dataEmissao: past(9, 18), dataVencimento: past(2, 0), criadaPorId: rececao.id,
  });
  await ensureFaturaLinha({ faturaId: fatSimbaDestartarizacao.id, descricao: svcDestartarizacao.nome, quantidade: 1, precoUnit: svcDestartarizacao.preco, total: svcDestartarizacao.preco, servicoId: svcDestartarizacao.id });
  await ensureFaturaLinha({ faturaId: fatSimbaDestartarizacao.id, descricao: svcPreAnestesico.nome,   quantidade: 1, precoUnit: svcPreAnestesico.preco,   total: svcPreAnestesico.preco,   servicoId: svcPreAnestesico.id });
  await ensureFaturaLinha({ faturaId: fatSimbaDestartarizacao.id, descricao: svcInternamento.nome,    quantidade: 2, precoUnit: svcInternamento.preco,    total: svcInternamento.preco * 2, servicoId: svcInternamento.id });
  await ensurePagamento({ faturaId: fatSimbaDestartarizacao.id, valor: 265, metodo: 'Transferência', dataPagamento: past(9, 19), registadoPorId: rececao.id });

  // Fatura paga — Pedro / Thor (consulta + vacina)
  const fatThorVacina = await ensureFatura({
    numero: 'FT-2025-0029', animalId: thor.id, valor: 60,
    estado: 'PAGA', dataEmissao: past(25, 17), dataVencimento: past(18, 0), criadaPorId: rececaoMiguel.id,
  });
  await ensureFaturaLinha({ faturaId: fatThorVacina.id, descricao: svcConsultaRotina.nome, quantidade: 1, precoUnit: svcConsultaRotina.preco, total: svcConsultaRotina.preco, servicoId: svcConsultaRotina.id });
  await ensureFaturaLinha({ faturaId: fatThorVacina.id, descricao: svcVacinacao.nome,      quantidade: 2, precoUnit: svcVacinacao.preco,      total: svcVacinacao.preco * 2,  servicoId: svcVacinacao.id });
  await ensurePagamento({ faturaId: fatThorVacina.id, valor: 60, metodo: 'Dinheiro', dataPagamento: past(25, 17, 15), registadoPorId: rececaoMiguel.id });

  void fatBobiGastro; void fatKikaOrtopedia; void fatMimiRenal; void fatSimbaDestartarizacao; void fatThorVacina;

  // ── notas rápidas ─────────────────────────────────────────────────────────
  await ensureNotaRapida({ animalId: bobi.id,  texto: 'Sensível a alimentos com frango. Reagiu com vómitos na última dieta prescrita — preferir proteína alternativa (borrego ou salmão).', autorId: vet.id });
  await ensureNotaRapida({ animalId: mimi.id,  texto: 'Protocolo geriátrico ativo — urianálise e bioquímica a cada 6 meses. Última avaliação renal sugeriu doença incipiente.',             autorId: vetAna.id });
  await ensureNotaRapida({ animalId: thor.id,  texto: 'Comportamento dominante registado nas últimas consultas. Recomendado sempre abordagem calma e uso de açaime preventivo.',             autorId: vet.id });
  await ensureNotaRapida({ animalId: pipoca.id,texto: 'Coelho exótico — não administrar antibióticos beta-lactâmicos (penicilinas/amoxicilinas). Risco de disbiose fatal.',                  autorId: vetAna.id });
  await ensureNotaRapida({ animalId: luna.id,  texto: 'Tutor alerta para comportamento ansioso em ambiente clínico. Recomendar Feliway® 48h antes das consultas.',                           autorId: vetAna.id });

  // ── comunicações ──────────────────────────────────────────────────────────
  await ensureComunicacao({ tipo: 'SAIDA', canal: 'Telefone', assunto: 'Resultado de exame disponível', mensagem: 'Contactado tutor João Silva para informar que o hemograma do Bobi está disponível para consulta. Sem alterações relevantes. Tutor informado.',                         estado: 'CONCLUIDA', animalId: bobi.id,  criadoPorId: rececao.id });
  await ensureComunicacao({ tipo: 'SAIDA', canal: 'Email',    assunto: 'Lembrete de marcação',          mensagem: 'Enviado email de lembrete a Maria Santos para a consulta de reavaliação dermatológica da Luna amanhã às 11h.',                                                        estado: 'CONCLUIDA', animalId: luna.id,  criadoPorId: rececao.id });
  await ensureComunicacao({ tipo: 'SAIDA', canal: 'Telefone', assunto: 'Reforço vacinal em atraso',     mensagem: 'Contactada tutora Inês Oliveira: vacina trivalente da Mimi está em atraso há 55 dias. Marcação sugerida para a próxima semana. Tutora aceitou.',                    estado: 'CONCLUIDA', animalId: mimi.id,  criadoPorId: rececaoMiguel.id });
  await ensureComunicacao({ tipo: 'ENTRADA',canal: 'Telefone',assunto: 'Pedido de marcação urgente',    mensagem: 'Tutor Pedro Costa contactou a solicitar marcação urgente para o Thor — lesão cutânea circular detetada. Marcado PCR externo e consulta para reavaliação.',            estado: 'CONCLUIDA', animalId: thor.id,  criadoPorId: rececao.id });
  await ensureComunicacao({ tipo: 'SAIDA', canal: 'Email',    assunto: 'Orçamento destartarização',     mensagem: 'Enviado orçamento detalhado para Sofia Neves relativo à destartarização do Simba (pré-anestésico + procedimento + internamento). Tutora confirmou agendamento.',     estado: 'CONCLUIDA', animalId: simba.id, criadoPorId: rececaoMiguel.id });

  // ── sumário ───────────────────────────────────────────────────────────────
  const totals = await Promise.all([
    prisma.user.count(), prisma.dono.count(), prisma.animal.count(),
    prisma.consulta.count(), prisma.tratamento.count(), prisma.marcacao.count(),
    prisma.vacina.count(), prisma.laboratorio.count(), prisma.exame.count(),
    prisma.amostra.count(), prisma.resultado.count(), prisma.relatorio.count(),
    prisma.internamento.count(), prisma.internamentoObservacao.count(),
    prisma.stockItem.count(), prisma.servicoCatalogo.count(),
    prisma.fatura.count(), prisma.faturaLinha.count(), prisma.pagamento.count(),
    prisma.notaRapida.count(), prisma.comunicacao.count(), prisma.horarioProfissional.count(),
  ]);

  const labels = [
    'Utilizadores', 'Donos', 'Animais', 'Consultas', 'Tratamentos', 'Marcações',
    'Vacinas', 'Laboratórios', 'Exames', 'Amostras', 'Resultados', 'Relatórios',
    'Internamentos', 'Obs. internamento', 'Itens de stock', 'Serviços',
    'Faturas', 'Linhas de fatura', 'Pagamentos', 'Notas rápidas', 'Comunicações', 'Horários',
  ];

  console.log('\nSeed concluído com sucesso.\n');
  labels.forEach((l, i) => console.log(`  ${l.padEnd(20)}: ${totals[i]}`));
  console.log('\nCredenciais de teste:');
  console.log('  admin@les.local / admin123');
  console.log('  vet@les.local / vet123');
  console.log('  ana.vet@les.local / ana123');
  console.log('  rececao@les.local / rececao123');
  console.log('  miguel.rececao@les.local / miguel123');
  console.log('  tecnico@les.local / tecnico123');
  console.log('  sofia.lab@les.local / sofia123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
