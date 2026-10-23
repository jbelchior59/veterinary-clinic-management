import { useMemo, useState } from 'react';
import { User, Appointment } from '../types';
import {
  Plus,
  Calendar,
  Clock,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AppointmentsViewProps {
  user: User;
  onNewAppointment: () => void;
  onStartConsultation: (appointment: Appointment) => void;
  appointments: Appointment[];
}

type CalendarMode = 'day' | 'week' | 'month';

function parseAppointmentDate(dateTime: string): Date {
  const normalized = dateTime.includes('T') ? dateTime : dateTime.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatWeekRange(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);

  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
}

function statusLabel(status: Appointment['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'Concluída';
    case 'CANCELLED':
      return 'Cancelada';
    case 'CONFIRMED':
      return 'Em Espera';
    default:
      return 'Agendada';
  }
}

function statusClass(status: Appointment['status']): string {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700';
  if (status === 'CONFIRMED') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export function AppointmentsView({
  user,
  onNewAppointment,
  onStartConsultation,
  appointments,
}: AppointmentsViewProps) {
  const [mode, setMode] = useState<CalendarMode>('day');
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));

  const canManageAppointments = user.role === 'RECECIONISTA' || user.role === 'ADMIN';
  const canCreateAppointment = user.role === 'RECECIONISTA' || user.role === 'ADMIN';
  const canStartConsultation = user.role === 'VETERINARIO';

  const appointmentsWithDate = useMemo(
    () =>
      appointments
        .map((appointment) => ({
          appointment,
          parsedDate: parseAppointmentDate(appointment.date),
        }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()),
    [appointments],
  );

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};

    appointmentsWithDate.forEach(({ appointment, parsedDate }) => {
      const key = dateKey(parsedDate);
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(appointment);
    });

    return grouped;
  }, [appointmentsWithDate]);

  const selectedDayAppointments = appointmentsByDay[dateKey(currentDate)] ?? [];

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const first = startOfMonth(currentDate);
    const firstGridDay = startOfWeek(first);

    return Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index));
  }, [currentDate]);

  const title =
    mode === 'day'
      ? formatLongDate(currentDate)
      : mode === 'week'
        ? formatWeekRange(currentDate)
        : formatMonth(currentDate);

  const dayCount = selectedDayAppointments.length;
  const weekCount = weekDays.reduce((total, day) => total + (appointmentsByDay[dateKey(day)]?.length ?? 0), 0);
  const monthCount = appointmentsWithDate.filter(({ parsedDate }) => parsedDate.getFullYear() === currentDate.getFullYear() && parsedDate.getMonth() === currentDate.getMonth()).length;

  function goPrevious() {
    if (mode === 'day') setCurrentDate((date) => addDays(date, -1));
    else if (mode === 'week') setCurrentDate((date) => addDays(date, -7));
    else setCurrentDate((date) => addMonths(date, -1));
  }

  function goNext() {
    if (mode === 'day') setCurrentDate((date) => addDays(date, 1));
    else if (mode === 'week') setCurrentDate((date) => addDays(date, 7));
    else setCurrentDate((date) => addMonths(date, 1));
  }

  function goToday() {
    setCurrentDate(startOfDay(new Date()));
  }

  function renderAppointmentCard(appointment: Appointment, compact = false) {
    const parsedDate = parseAppointmentDate(appointment.date);

    if (compact) {
      return (
        <div
          key={appointment.id}
          className="rounded-2xl border border-[#E7E5E4] bg-white hover:bg-[#FAFAF9] transition-colors p-3"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-bold text-[#1C1917]">
              {formatTime(parsedDate)}
            </span>
            <span
              className={cn(
                'text-[10px] px-2 py-1 rounded-full font-bold uppercase shrink-0',
                statusClass(appointment.status),
              )}
            >
              {statusLabel(appointment.status)}
            </span>
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-[#1C1917] truncate" title={appointment.petName}>
              {appointment.petName}
            </p>
            <p className="text-xs text-[#78716C] truncate" title={appointment.type}>
              {appointment.type}
            </p>
          </div>

          {canStartConsultation && ['PENDING', 'CONFIRMED'].includes(appointment.status) && (
            <button
              onClick={() => onStartConsultation(appointment)}
              className="mt-3 w-full px-3 py-1.5 bg-[#5A5A40] text-white text-xs rounded-lg hover:bg-[#4A4A35] transition-colors font-semibold"
            >
              Iniciar Consulta
            </button>
          )}

          {canManageAppointments && ['PENDING', 'CONFIRMED'].includes(appointment.status) && (
            <button
              onClick={onNewAppointment}
              className="mt-3 w-full px-3 py-1.5 bg-[#F5F5F4] text-[#57534E] text-xs rounded-lg hover:bg-[#E7E5E4] transition-colors font-semibold"
            >
              Gerir Marcação
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={appointment.id}
        className="rounded-2xl border border-[#E7E5E4] bg-white hover:bg-[#FAFAF9] transition-colors p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#F5F5F4] rounded-lg flex items-center justify-center text-[#5A5A40] shrink-0">
              <UserIcon size={20} />
            </div>

            <div className="min-w-0">
              <p className="font-semibold truncate" title={appointment.petName}>{appointment.petName}</p>
              <p className="text-sm text-[#78716C] truncate" title={appointment.type}>{appointment.type}</p>
              <p className="text-sm text-[#57534E] mt-1 flex items-center gap-1">
                <Clock size={14} />
                {formatTime(parsedDate)}
              </p>
            </div>
          </div>

          <span
            className={cn(
              'text-[10px] px-2 py-1 rounded-full font-bold uppercase shrink-0',
              statusClass(appointment.status),
            )}
          >
            {statusLabel(appointment.status)}
          </span>
        </div>

        {(canManageAppointments || canStartConsultation) && ['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {canManageAppointments && (
              <button
                onClick={onNewAppointment}
                className="px-3 py-1 bg-[#F5F5F4] text-[#57534E] text-xs rounded-lg hover:bg-[#E7E5E4] transition-colors"
              >
                Gerir Marcação
              </button>
            )}

            {canStartConsultation && (
              <button
                onClick={() => onStartConsultation(appointment)}
                className="px-3 py-1 bg-[#5A5A40] text-white text-xs rounded-lg hover:bg-[#4A4A35] transition-colors"
              >
                Iniciar Consulta
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marcações</h1>
          <p className="text-[#78716C] mt-1">
            Agenda clínica com visualização diária, semanal e mensal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-1 flex w-fit">
            {(['day', 'week', 'month'] as CalendarMode[]).map((item) => {
              const count = item === 'day' ? dayCount : item === 'week' ? weekCount : monthCount;
              return (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-bold transition-colors',
                    mode === item
                      ? 'bg-[#5A5A40] text-white'
                      : 'text-[#57534E] hover:bg-[#F5F5F4]',
                  )}
                >
                  {item === 'day' ? 'Dia' : item === 'week' ? 'Semana' : 'Mês'} ({count})
                </button>
              );
            })}
          </div>

          {canCreateAppointment && (
            <button
              onClick={onNewAppointment}
              className="bg-[#5A5A40] text-white px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit font-bold"
            >
              <Plus size={18} />
              Nova Marcação
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#E7E5E4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#F5F5F4] rounded-2xl flex items-center justify-center text-[#5A5A40]">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">
                Calendário
              </p>
              <h2 className="text-xl font-bold capitalize">{title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={goPrevious}
              className="p-3 rounded-2xl bg-[#F5F5F4] text-[#57534E] hover:bg-[#E7E5E4] transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={goToday}
              className="px-4 py-3 rounded-2xl bg-[#F5F5F4] text-[#57534E] hover:bg-[#E7E5E4] transition-colors font-bold text-sm"
            >
              Hoje
            </button>

            <button
              onClick={goNext}
              className="p-3 rounded-2xl bg-[#F5F5F4] text-[#57534E] hover:bg-[#E7E5E4] transition-colors"
              aria-label="Seguinte"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {mode === 'day' && (
          <div className="p-4 md:p-6 space-y-3">
            {selectedDayAppointments.length === 0 ? (
              <div className="p-10 text-center text-[#A8A29E] border border-dashed border-[#D6D3D1] rounded-2xl bg-[#FAFAF9]">
                Nenhuma marcação neste dia.
              </div>
            ) : (
              selectedDayAppointments.map((appointment) => renderAppointmentCard(appointment))
            )}
          </div>
        )}

        {mode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 border-t border-[#E7E5E4] md:border-t-0">
            {weekDays.map((day) => {
              const key = dateKey(day);
              const dayAppointments = appointmentsByDay[key] ?? [];
              const isSelected = key === dateKey(currentDate);

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[300px] border-b md:border-b-0 md:border-r last:border-r-0 border-[#E7E5E4] p-3 space-y-3',
                    isSelected ? 'bg-[#FAFAF9]' : 'bg-white',
                  )}
                >
                  <button
                    onClick={() => {
                      setCurrentDate(day);
                      setMode('day');
                    }}
                    className="text-left w-full"
                  >
                    <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">
                      {day.toLocaleDateString('pt-PT', { weekday: 'short' })}
                    </p>
                    <p className="font-bold text-[#1C1917]">{formatShortDate(day)}</p>
                  </button>

                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-[#A8A29E]">Sem marcações.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAppointments.map((appointment) => renderAppointmentCard(appointment, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mode === 'month' && (
          <div className="p-3 md:p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div key={day} className="text-xs font-bold text-[#A8A29E] uppercase text-center py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const key = dateKey(day);
                const dayAppointments = appointmentsByDay[key] ?? [];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isSelected = key === dateKey(currentDate);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCurrentDate(day);
                      setMode('day');
                    }}
                    className={cn(
                      'min-h-[92px] rounded-2xl border p-2 text-left transition-colors',
                      isSelected
                        ? 'border-[#5A5A40] bg-[#F5F5F4]'
                        : 'border-[#E7E5E4] hover:bg-[#FAFAF9]',
                      !isCurrentMonth && 'opacity-40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm">{day.getDate()}</span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5A5A40] text-white font-bold">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayAppointments.slice(0, 2).map((appointment) => (
                        <div key={appointment.id} className="text-[11px] truncate text-[#57534E]">
                          {formatTime(parseAppointmentDate(appointment.date))} · {appointment.petName}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-[11px] text-[#A8A29E]">
                          +{dayAppointments.length - 2} restantes
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
