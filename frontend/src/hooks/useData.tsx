import { useCallback, useEffect, useRef, useState } from 'react';
import type { User, Pet, Appointment, LabExam } from '../types';
import { getAnimais } from '../lib/animais';
import { getMarcacoesAtivas } from '../lib/marcacoes';
import { getExames } from '../lib/exames';
import { getSocket } from '../lib/socket';

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mapMarcacaoStatus(status: string): Appointment['status'] {
  switch (status) {
    case 'CONCLUIDA':
      return 'COMPLETED';
    case 'CANCELADA':
      return 'CANCELLED';
    case 'CONFIRMADA':
      return 'CONFIRMED';
    default:
      return 'PENDING';
  }
}

function mapExameStatus(status: string): LabExam['status'] {
  switch (status) {
    case 'PENDENTE':
      return 'PENDING';
    case 'AMOSTRA_COLETADA':
      return 'SAMPLE_COLLECTED';
    case 'AMOSTRA_REJEITADA':
      return 'SAMPLE_REJECTED';
    case 'AGUARDA_NOVA_AMOSTRA':
      return 'AWAITING_NEW_SAMPLE';
    case 'EM_ANALISE':
      return 'IN_ANALYSIS';
    case 'CONCLUIDO':
      return 'COMPLETED';
    case 'VALIDADO':
      return 'VALIDATED';
    case 'CANCELADO':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

function normalizarGenero(genero?: string | null): 'M' | 'F' {
  return genero?.toUpperCase() === 'F' || genero?.toUpperCase() === 'FEMEA' || genero?.toUpperCase() === 'FÊMEA'
    ? 'F'
    : 'M';
}

export function useData(user: User | null) {
  const [patients, setPatients] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exams, setExams] = useState<LabExam[]>([]);

  const loadData = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setAppointments([]);
      setExams([]);
      return;
    }

    try {
      const [animais, marcacoes, exames] = await Promise.all([
        getAnimais(),
        getMarcacoesAtivas().catch((err) => { console.error('Erro ao carregar marcações:', err); return []; }),
        getExames().catch((err) => { console.error('Erro ao carregar exames:', err); return []; }),
      ]);

      setPatients(
        animais.map((animal) => ({
          id: String(animal.id),
          name: animal.nome,
          species: animal.especie,
          breed: animal.raca?.trim() ?? '',
          gender: normalizarGenero(animal.genero),
          ownerId: String(animal.donoId),
          ownerName: animal.dono?.nome ?? 'Sem dono',
          ownerEmail: animal.dono?.email ?? '',
          ownerPhone: animal.dono?.telefone ?? '',
          ownerAddress: animal.dono?.morada ?? '',
          birthDate: animal.dataNascimento ?? undefined,
          weight: animal.peso ?? null,
        })),
      );

      setAppointments(
        marcacoes.map((marcacao) => ({
          id: String(marcacao.id),
          petId: String(marcacao.animalId),
          petName: marcacao.animal?.nome ?? `Animal #${marcacao.animalId}`,
          date: formatDateTime(marcacao.data),
          status: mapMarcacaoStatus(marcacao.estado),
          type: marcacao.motivo?.trim() ? marcacao.motivo : 'Consulta Geral',
          professionalId: marcacao.profissionalId ? String(marcacao.profissionalId) : undefined,
          professionalName: marcacao.profissional?.nome ?? marcacao.profissional?.email,
          professionalRole: marcacao.profissional?.role,
        })),
      );

      setExams(
        exames.map((exame) => ({
          id: String(exame.id),
          petId: String(exame.animalId),
          petName: exame.animal?.nome ?? `Animal #${exame.animalId}`,
          type: exame.tipo,
          status: mapExameStatus(exame.estado),
          requestDate: formatDateTime(exame.dataPedido),
          vetName: exame.solicitante?.nome ?? exame.solicitante?.email ?? 'Veterinário',
          results: exame.descricaoClinica ?? '',
          createdAt: exame.createdAt ?? exame.dataPedido,
          priority: exame.prioridade,
          ownerName: exame.animal?.dono?.nome,
          clinicalContext: exame.descricaoClinica ?? '',
          raw: exame,
        })),
      );
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setPatients([]);
      setAppointments([]);
      setExams([]);
    }
  }, [user]);

  // Referência estável ao loadData para usar dentro do listener WebSocket
  // sem o incluir nas dependências do useEffect dos sockets (evita re-subscrições)
  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Carrega dados iniciais sempre que o utilizador muda
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Subscrição WebSocket — corre UMA vez após o login e nunca mais se re-executa
  // desnecessariamente, porque usa loadDataRef em vez de loadData directamente
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    const handleSync = () => {
      void loadDataRef.current();
    };

    socket.on('marcacao_criada', handleSync);
    socket.on('marcacao_atualizada', handleSync);

    return () => {
      socket.off('marcacao_criada', handleSync);
      socket.off('marcacao_atualizada', handleSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // só re-executa se o utilizador mudar (login/logout)

  return {
    patients,
    appointments,
    exams,
    refreshData: loadData,
  };
}
