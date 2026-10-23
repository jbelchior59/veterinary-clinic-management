import { useState, useMemo } from 'react';
import { User, Appointment, Pet } from '../types';
import { Plus, CreditCard, Download, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface BillingViewProps {
  user: User;
  appointments: Appointment[];
  onNewInvoice: () => void;
  onDownload: (id: string) => void;
  patients: Pet[];
}

const MOCK_PRICES: Record<string, number> = {
  'Consulta Geral': 35,
  'Vacinação': 25,
  'Cirurgia': 150,
  'Exame': 45,
  'Urgência': 60,
  'Controlo': 30,
};

function getPrice(type: string): number {
  for (const [key, val] of Object.entries(MOCK_PRICES)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 35;
}

function formatDate(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return dateStr;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}${timePart ? ' ' + timePart : ''}`;
}

export function BillingView({ user, appointments, onNewInvoice, onDownload }: BillingViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [paid, setPaid] = useState<Set<string>>(new Set());

  const canManage = ['ADMIN', 'RECECIONISTA'].includes(user.role);

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => filterStatus === 'ALL' || a.status === filterStatus)
      .filter((a) =>
        search === '' ||
        a.petName.toLowerCase().includes(search.toLowerCase()) ||
        a.type.toLowerCase().includes(search.toLowerCase()),
      );
  }, [appointments, filterStatus, search]);

  const totalReceita = useMemo(() => {
    return appointments
      .filter((a) => paid.has(a.id) || a.status === 'COMPLETED')
      .reduce((sum, a) => sum + getPrice(a.type), 0);
  }, [appointments, paid]);

  const pendingTotal = useMemo(() => {
    return appointments
      .filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && !paid.has(a.id))
      .reduce((sum, a) => sum + getPrice(a.type), 0);
  }, [appointments, paid]);

  function togglePaid(id: string) {
    setPaid((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Faturação</h1>
        {canManage && (
          <button
            onClick={onNewInvoice}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
          >
            <Plus size={18} />
            Nova Fatura
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Receita</p>
            <p className="text-xl font-bold truncate">{totalReceita.toFixed(2)} €</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Clock size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Pendente</p>
            <p className="text-xl font-bold truncate">{pendingTotal.toFixed(2)} €</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CreditCard size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Total Consultas</p>
            <p className="text-xl font-bold truncate">{appointments.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            placeholder="Pesquisar por animal ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E7E5E4] rounded-lg text-sm outline-none focus:border-[#5A5A40] bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-semibold border transition-colors',
                filterStatus === s
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                  : 'bg-white text-[#57534E] border-[#E7E5E4] hover:border-[#5A5A40]',
              )}
            >
              {s === 'ALL' ? 'Todos' : s === 'PENDING' ? 'Pendente' : s === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <th className="p-4 font-semibold text-sm text-[#57534E]">Animal</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Tipo</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Data</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Estado</th>
              <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Valor</th>
              <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {filtered.map((a) => {
              const isPaid = paid.has(a.id) || a.status === 'COMPLETED';
              const isCancelled = a.status === 'CANCELLED';
              const price = getPrice(a.type);

              return (
                <tr key={a.id} className="hover:bg-[#FAFAF9] transition-colors">
                  <td className="p-4 font-semibold">{a.petName}</td>
                  <td className="p-4 text-sm text-[#57534E]">{a.type}</td>
                  <td className="p-4 text-sm text-[#57534E]">{formatDate(a.date)}</td>
                  <td className="p-4">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                        isPaid && !isCancelled
                          ? 'bg-green-100 text-green-700'
                          : isCancelled
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700',
                      )}
                    >
                      {isCancelled ? 'Cancelada' : isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold whitespace-nowrap">
                    {isCancelled ? (
                      <span className="text-[#A8A29E] line-through">{price.toFixed(2)} €</span>
                    ) : (
                      <span>{price.toFixed(2)} €</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {!isCancelled && canManage && (
                        <button
                          onClick={() => togglePaid(a.id)}
                          className={cn(
                            'text-xs font-semibold px-2 py-1 rounded-lg border transition-colors',
                            isPaid
                              ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                              : 'text-green-700 border-green-200 hover:bg-green-50',
                          )}
                        >
                          {isPaid ? 'Marcar Pendente' : 'Marcar Pago'}
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(a.id)}
                        className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#57534E] transition-colors"
                        title="Download fatura"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[#A8A29E]">
                  <XCircle size={36} className="mx-auto mb-3 text-[#D6D3D1]" />
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}