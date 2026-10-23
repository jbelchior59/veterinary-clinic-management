import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../auth/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExameDto } from './dto/create-exame.dto';
import { CreateAmostraDto } from './dto/create-amostra.dto';
import { CreateResultadoDto } from './dto/create-resultado.dto';
import { CreateRelatorioDto } from './dto/create-relatorio.dto';
import { RejectAmostraDto } from './dto/reject-amostra.dto';
import { CreateNotaInternaDto } from './dto/create-nota-interna.dto';
import { CreateAnexoDto } from './dto/create-anexo.dto';
import { CreateConsumoDto } from './dto/create-consumo.dto';

@Injectable()
export class ExameService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly pessoaSelect = {
    id: true,
    nome: true,
    email: true,
    role: true,
  };

  private readonly exameInclude = {
    animal: { include: { dono: true } },
    solicitante: { select: this.pessoaSelect },
    laboratorio: true,
    amostras: {
      orderBy: { dataColheita: 'desc' as const },
      include: { registadaPor: { select: this.pessoaSelect } },
    },
    resultados: {
      orderBy: { dataResultado: 'desc' as const },
      include: {
        inseridoPor: { select: this.pessoaSelect },
        validadoPor: { select: this.pessoaSelect },
      },
    },
    relatorio: { include: { emitidoPor: { select: this.pessoaSelect } } },
    notasInternas: {
      orderBy: { createdAt: 'desc' as const },
      include: { autor: { select: this.pessoaSelect } },
    },
    anexos: {
      orderBy: { createdAt: 'desc' as const },
      include: { autor: { select: this.pessoaSelect } },
    },
    auditoria: {
      orderBy: { createdAt: 'desc' as const },
      include: { ator: { select: this.pessoaSelect } },
    },
    consumos: {
      orderBy: { createdAt: 'desc' as const },
      include: {
        registadoPor: { select: this.pessoaSelect },
        stockItem: true,
      },
    },
  };

  async create(createExameDto: CreateExameDto, solicitanteId: number) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: createExameDto.animalId },
    });

    if (!animal) throw new NotFoundException('Animal não encontrado.');

    if (createExameDto.laboratorioId) {
      const laboratorio = await this.prisma.laboratorio.findUnique({
        where: { id: createExameDto.laboratorioId },
      });
      if (!laboratorio) throw new NotFoundException('Laboratório não encontrado.');
    }

    const exame = await this.prisma.exame.create({
      data: {
        animalId: createExameDto.animalId,
        tipo: createExameDto.tipo.trim(),
        prioridade: createExameDto.prioridade?.trim() || 'NORMAL',
        descricaoClinica: createExameDto.descricaoClinica?.trim() || null,
        solicitanteId,
        laboratorioId: createExameDto.laboratorioId,
        estado: 'PENDENTE',
      },
      include: this.exameInclude,
    });

    await this.audit(exame.id, solicitanteId, 'EXAME_CRIADO', null, exame.estado, exame.tipo);
    return exame;
  }

  async findAll() {
    return this.prisma.exame.findMany({
      orderBy: [{ prioridade: 'asc' }, { dataPedido: 'desc' }],
      include: this.exameInclude,
    });
  }

  async findOne(id: number) {
    const exame = await this.prisma.exame.findUnique({
      where: { id },
      include: this.exameInclude,
    });
    if (!exame) throw new NotFoundException('Exame não encontrado.');
    return exame;
  }

  async findByAnimal(animalId: number) {
    return this.prisma.exame.findMany({
      where: { animalId },
      orderBy: { dataPedido: 'desc' },
      include: this.exameInclude,
    });
  }

  async updateEstado(exameId: number, estado: string, actorRole?: Role | string, actorId?: number) {
    const exame = await this.ensureExameExists(exameId);
    if (exame.estado === 'VALIDADO') throw new ForbiddenException('Não é possível alterar um exame já validado.');
    if (exame.estado === 'CANCELADO') throw new ForbiddenException('Não é possível alterar um exame cancelado.');

    if (actorRole === Role.TECNICO) {
      const allowedTechnicalStates = new Set([
        'AMOSTRA_COLETADA',
        'AMOSTRA_REJEITADA',
        'AGUARDA_NOVA_AMOSTRA',
        'EM_ANALISE',
        'CONCLUIDO',
      ]);
      if (!allowedTechnicalStates.has(estado)) {
        throw new ForbiddenException('O técnico não pode definir esse estado.');
      }
    }

    if (actorRole === Role.VETERINARIO) {
      if (estado !== 'VALIDADO' && estado !== 'CANCELADO') {
        throw new ForbiddenException('O veterinário só pode validar ou cancelar exames.');
      }
    }

    const updated = await this.prisma.exame.update({
      where: { id: exameId },
      data: {
        estado,
        dataConclusao:
          estado === 'CONCLUIDO' || estado === 'VALIDADO' ? new Date() : exame.dataConclusao,
      },
      include: this.exameInclude,
    });

    await this.audit(exameId, actorId, 'ESTADO_EXAME', exame.estado, estado);
    return updated;
  }

  async createAmostra(dto: CreateAmostraDto, registadaPorId: number) {
    const exame = await this.ensureOpenExame(dto.exameId);
    const amostra = await this.prisma.amostra.create({
      data: {
        exameId: dto.exameId,
        codigo: dto.codigo.trim(),
        tipo: dto.tipo.trim(),
        origem: dto.origem?.trim() || 'INTERNA',
        temperatura: dto.temperatura?.trim() || null,
        localizacaoArmazenamento: dto.localizacaoArmazenamento?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
        registadaPorId,
      },
      include: { registadaPor: { select: this.pessoaSelect } },
    });

    await this.prisma.exame.update({
      where: { id: dto.exameId },
      data: { estado: 'AMOSTRA_COLETADA' },
    });
    await this.audit(dto.exameId, registadaPorId, 'AMOSTRA_REGISTADA', exame.estado, 'AMOSTRA_COLETADA', amostra.codigo);
    return amostra;
  }

  async rejeitarAmostra(amostraId: number, dto: RejectAmostraDto, actorId: number) {
    const amostra = await this.prisma.amostra.findUnique({
      where: { id: amostraId },
      include: { exame: true },
    });
    if (!amostra) throw new NotFoundException('Amostra não encontrada.');
    if (['VALIDADO', 'CANCELADO'].includes(amostra.exame.estado)) {
      throw new ForbiddenException('Não é possível rejeitar amostras de um exame fechado.');
    }

    const updated = await this.prisma.amostra.update({
      where: { id: amostraId },
      data: {
        estado: 'REJEITADA',
        motivoRejeicao: dto.motivo.trim(),
      },
      include: { registadaPor: { select: this.pessoaSelect } },
    });

    await this.prisma.exame.update({
      where: { id: amostra.exameId },
      data: { estado: 'AGUARDA_NOVA_AMOSTRA' },
    });
    await this.audit(amostra.exameId, actorId, 'AMOSTRA_REJEITADA', amostra.exame.estado, 'AGUARDA_NOVA_AMOSTRA', dto.motivo.trim());
    return updated;
  }

  async createResultado(dto: CreateResultadoDto, inseridoPorId: number) {
    const exame = await this.ensureOpenExame(dto.exameId);
    const resultado = await this.prisma.resultado.create({
      data: {
        exameId: dto.exameId,
        parametro: dto.parametro?.trim() || null,
        valor: dto.valor?.trim() || null,
        unidade: dto.unidade?.trim() || null,
        referencia: dto.referencia?.trim() || null,
        interpretacao: dto.interpretacao?.trim() || null,
        dados: dto.dados.trim(),
        observacoes: dto.observacoes?.trim() || null,
        inseridoPorId,
      },
      include: {
        inseridoPor: { select: this.pessoaSelect },
        validadoPor: { select: this.pessoaSelect },
      },
    });

    await this.prisma.exame.update({
      where: { id: dto.exameId },
      data: { estado: 'CONCLUIDO', dataConclusao: new Date() },
    });
    await this.audit(dto.exameId, inseridoPorId, 'RESULTADO_INSERIDO', exame.estado, 'CONCLUIDO', dto.parametro?.trim() || dto.dados.trim());
    return resultado;
  }

  async findResultadosByExame(exameId: number) {
    await this.ensureExameExists(exameId);
    return this.prisma.resultado.findMany({
      where: { exameId },
      orderBy: { dataResultado: 'desc' },
      include: {
        inseridoPor: { select: this.pessoaSelect },
        validadoPor: { select: this.pessoaSelect },
      },
    });
  }

  async validarResultado(resultadoId: number, validadoPorId: number) {
    const resultado = await this.prisma.resultado.findUnique({ where: { id: resultadoId } });
    if (!resultado) throw new NotFoundException('Resultado não encontrado.');

    const resultadoValidado = await this.prisma.resultado.update({
      where: { id: resultadoId },
      data: { validado: true, validadoPorId, dataValidacao: new Date() },
      include: {
        inseridoPor: { select: this.pessoaSelect },
        validadoPor: { select: this.pessoaSelect },
      },
    });

    const resultadosDoExame = await this.prisma.resultado.findMany({
      where: { exameId: resultado.exameId },
    });
    if (resultadosDoExame.length > 0 && resultadosDoExame.every((r) => r.validado || r.id === resultadoId)) {
      await this.prisma.exame.update({
        where: { id: resultado.exameId },
        data: { estado: 'VALIDADO' },
      });
      await this.audit(resultado.exameId, validadoPorId, 'RESULTADOS_VALIDADOS', 'CONCLUIDO', 'VALIDADO');
    }
    return resultadoValidado;
  }

  async createRelatorio(dto: CreateRelatorioDto, emitidoPorId: number) {
    const exame = await this.prisma.exame.findUnique({
      where: { id: dto.exameId },
      include: { resultados: true, relatorio: true },
    });
    if (!exame) throw new NotFoundException('Exame não encontrado.');
    if (exame.relatorio) throw new BadRequestException('Este exame já tem relatório emitido.');
    if (exame.resultados.length === 0) throw new BadRequestException('Não é possível emitir relatório sem resultados.');
    if (exame.resultados.some((resultado) => !resultado.validado)) {
      throw new BadRequestException('Todos os resultados devem estar validados antes de emitir relatório.');
    }

    const relatorio = await this.prisma.relatorio.create({
      data: {
        exameId: dto.exameId,
        conclusao: dto.conclusao.trim(),
        observacoes: dto.observacoes?.trim() || null,
        recomendacoes: dto.recomendacoes?.trim() || null,
        emitidoPorId,
      },
      include: {
        emitidoPor: { select: this.pessoaSelect },
        resultados: true,
        exame: { include: { animal: { include: { dono: true } } } },
      },
    });

    await this.prisma.resultado.updateMany({
      where: { exameId: dto.exameId },
      data: { relatorioId: relatorio.id },
    });
    await this.prisma.exame.update({
      where: { id: dto.exameId },
      data: { estado: 'VALIDADO' },
    });
    await this.audit(dto.exameId, emitidoPorId, 'RELATORIO_EMITIDO', exame.estado, 'VALIDADO', dto.conclusao.trim());
    return relatorio;
  }

  async findRelatorios() {
    return this.prisma.relatorio.findMany({
      orderBy: { dataEmissao: 'desc' },
      include: {
        emitidoPor: { select: this.pessoaSelect },
        resultados: true,
        exame: {
          include: {
            animal: { include: { dono: true } },
            solicitante: { select: this.pessoaSelect },
          },
        },
      },
    });
  }

  async findRelatorio(id: number) {
    const relatorio = await this.prisma.relatorio.findUnique({
      where: { id },
      include: {
        emitidoPor: { select: this.pessoaSelect },
        resultados: true,
        exame: {
          include: {
            animal: { include: { dono: true } },
            solicitante: { select: this.pessoaSelect },
          },
        },
      },
    });
    if (!relatorio) throw new NotFoundException('Relatório não encontrado.');
    return relatorio;
  }

  async createNotaInterna(exameId: number, dto: CreateNotaInternaDto, autorId: number) {
    await this.ensureExameExists(exameId);
    const nota = await this.prisma.exameNotaInterna.create({
      data: { exameId, autorId, conteudo: dto.conteudo.trim() },
      include: { autor: { select: this.pessoaSelect } },
    });
    await this.audit(exameId, autorId, 'NOTA_INTERNA', null, null, dto.conteudo.trim());
    return nota;
  }

  async createAnexo(exameId: number, dto: CreateAnexoDto, autorId: number) {
    await this.ensureExameExists(exameId);
    const anexo = await this.prisma.exameAnexo.create({
      data: {
        exameId,
        autorId,
        nome: dto.nome.trim(),
        url: dto.url.trim(),
        tipo: dto.tipo?.trim() || null,
      },
      include: { autor: { select: this.pessoaSelect } },
    });
    await this.audit(exameId, autorId, 'ANEXO_ADICIONADO', null, null, anexo.nome);
    return anexo;
  }

  async addAnexo(exameId: number, dto: CreateAnexoDto, autorId: number) {
    return this.createAnexo(exameId, dto, autorId);
  }

  async createConsumo(exameId: number, dto: CreateConsumoDto, registadoPorId: number) {
    await this.ensureExameExists(exameId);

    if (!dto.stockItemId && !dto.item?.trim()) {
      throw new BadRequestException('Seleciona um item de stock ou indica o nome do item consumido.');
    }

    const consumo = await this.prisma.$transaction(async (tx) => {
      let stockItem: any = null;
      let itemNome = dto.item?.trim() || '';
      let unidade = dto.unidade?.trim() || '';
      let lote = dto.lote?.trim() || null;

      if (dto.stockItemId) {
        stockItem = await (tx as any).stockItem.findUnique({
          where: { id: dto.stockItemId },
        });

        if (!stockItem) {
          throw new NotFoundException(`Item de stock com id ${dto.stockItemId} nao encontrado`);
        }

        if (stockItem.quantidade - dto.quantidade < 0) {
          throw new BadRequestException('Stock insuficiente para registar consumo neste exame.');
        }

        itemNome = itemNome || stockItem.nome;
        unidade = unidade || stockItem.unidade;
        lote = lote || stockItem.lote || null;

        await (tx as any).stockMovimento.create({
          data: {
            itemId: stockItem.id,
            tipo: 'CONSUMO',
            quantidade: dto.quantidade,
            motivo: `Consumo associado ao exame #${exameId}`,
            registadoPorId,
          },
        });

        await (tx as any).stockItem.update({
          where: { id: stockItem.id },
          data: { quantidade: stockItem.quantidade - dto.quantidade },
        });
      }

      return (tx as any).labConsumo.create({
        data: {
          exameId,
          registadoPorId,
          stockItemId: stockItem?.id ?? null,
          item: itemNome,
          quantidade: dto.quantidade,
          unidade: unidade || 'un',
          lote,
        },
        include: {
          registadoPor: { select: this.pessoaSelect },
          stockItem: true,
        },
      });
    });

    await this.audit(
      exameId,
      registadoPorId,
      'CONSUMO_STOCK',
      null,
      null,
      `${consumo.item}: ${consumo.quantidade} ${consumo.unidade}`,
    );

    return consumo;
  }

  getResultadoTemplates() {
    return [
      {
        tipo: 'Hemograma Completo',
        parametros: [
          { parametro: 'Hematocrito', unidade: '%', referencia: '37 - 55' },
          { parametro: 'Hemoglobina', unidade: 'g/dL', referencia: '12 - 18' },
          { parametro: 'Leucocitos', unidade: '10^9/L', referencia: '6.0 - 17.0' },
          { parametro: 'Plaquetas', unidade: '10^9/L', referencia: '200 - 500' },
        ],
      },
      {
        tipo: 'Bioquímica Sérica',
        parametros: [
          { parametro: 'Ureia', unidade: 'mg/dL', referencia: '20 - 60' },
          { parametro: 'Creatinina', unidade: 'mg/dL', referencia: '0.5 - 1.8' },
          { parametro: 'ALT', unidade: 'U/L', referencia: '10 - 100' },
          { parametro: 'Glicose', unidade: 'mg/dL', referencia: '70 - 120' },
        ],
      },
      {
        tipo: 'Urianálise',
        parametros: [
          { parametro: 'Densidade urinaria', unidade: '', referencia: '1.015 - 1.045' },
          { parametro: 'pH', unidade: '', referencia: '5.5 - 7.5' },
          { parametro: 'Proteina', unidade: '', referencia: 'Negativo/Tracos' },
          { parametro: 'Sedimento', unidade: '', referencia: 'Sem alteracoes relevantes' },
        ],
      },
      {
        tipo: 'Citologia',
        parametros: [
          { parametro: 'Celularidade', unidade: '', referencia: 'Adequada' },
          { parametro: 'Populacao celular predominante', unidade: '', referencia: 'Descricao morfologica' },
          { parametro: 'Agentes infecciosos', unidade: '', referencia: 'Nao observados' },
        ],
      },
    ];
  }

  private async ensureExameExists(exameId: number) {
    const exame = await this.prisma.exame.findUnique({ where: { id: exameId } });
    if (!exame) throw new NotFoundException('Exame não encontrado.');
    return exame;
  }

  private async ensureOpenExame(exameId: number) {
    const exame = await this.ensureExameExists(exameId);
    if (exame.estado === 'VALIDADO') throw new ForbiddenException('Não é possível alterar um exame já validado.');
    if (exame.estado === 'CANCELADO') throw new ForbiddenException('Não é possível alterar um exame cancelado.');
    return exame;
  }

  private async audit(
    exameId: number,
    atorId: number | null | undefined,
    acao: string,
    de?: string | null,
    para?: string | null,
    detalhe?: string | null,
  ) {
    await this.prisma.exameAuditLog.create({
      data: {
        exameId,
        atorId: atorId || null,
        acao,
        de: de || null,
        para: para || null,
        detalhe: detalhe || null,
      },
    });
  }
}
