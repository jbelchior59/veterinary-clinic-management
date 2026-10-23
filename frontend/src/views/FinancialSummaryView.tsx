import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle,
  Euro,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/apiClient';

type FinancialItem = {
  categoria: string;
  valor: number;
};

type FinancialSummary = {
  totalLucros: number;
  totalDespesas: number;
  balanco: number;
  lucros: FinancialItem[];
  despesas: FinancialItem[];
};

const EMPTY_SUMMARY: FinancialSummary = {
  totalLucros: 0,
  totalDespesas: 0,
  balanco: 0,
  lucros: [],
  despesas: [],
};

const COLORS = ['#166534', '#0F766E', '#0369A1', '#7C3AED', '#A16207'];

function formatMoney(value: unknown): string {
  return `${Number(value ?? 0).toLocaleString('pt-PT')} €`;
}

function percentage(value: number, total: number): string {
  if (total <= 0) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function FinancialSummaryView() {
  const [summary, setSummary] = useState<FinancialSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.get<FinancialSummary>('/financial-summary');
      setSummary({
        totalLucros: Number(res.data.totalLucros ?? 0),
        totalDespesas: Number(res.data.totalDespesas ?? 0),
        balanco: Number(res.data.balanco ?? 0),
        lucros: res.data.lucros ?? [],
        despesas: res.data.despesas ?? [],
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Não foi possível carregar o resumo financeiro.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-8 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const totalLucros = summary.lucros.reduce(
    (acc, item) => acc + item.valor,
    0,
  );

  const totalDespesas = summary.despesas.reduce(
    (acc, item) => acc + item.valor,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Resumo Financeiro
          </h1>
          <p className="text-[#78716C] mt-1">
            Visão global dos lucros, despesas e balanço da clínica.
          </p>
        </div>

        <button
          onClick={() => void loadSummary()}
          className="bg-white border border-[#E7E5E4] text-[#57534E] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F5F5F4] transition-colors w-fit"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Lucros"
          value={summary.totalLucros}
          icon={<TrendingUp size={24} />}
          tone="positive"
        />

        <SummaryCard
          title="Total Despesas"
          value={summary.totalDespesas}
          icon={<TrendingDown size={24} />}
          tone="negative"
        />

        <SummaryCard
          title="Balanço"
          value={summary.balanco}
          icon={<Euro size={24} />}
          tone={summary.balanco >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Lucros por Categoria">
          {summary.lucros.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={summary.lucros}
                    dataKey="valor"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ percent = 0 }) =>
                      `${(percent * 100).toFixed(1)}%`
                    }
                  >
                    {summary.lucros.map((_, index) => (
                      <Cell
                        key={`lucro-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>

              <LegendList items={summary.lucros} total={totalLucros} />
            </>
          ) : (
            <EmptyState message="Ainda não existem lucros registados." />
          )}
        </ChartCard>

        <ChartCard title="Despesas por Categoria">
          {summary.despesas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={summary.despesas}
                    dataKey="valor"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ percent = 0 }) =>
                      `${(percent * 100).toFixed(1)}%`
                    }
                  >
                    {summary.despesas.map((_, index) => (
                      <Cell
                        key={`despesa-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>

              <LegendList items={summary.despesas} total={totalDespesas} />
            </>
          ) : (
            <EmptyState message="Ainda não existem despesas registadas." />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ListCard title="Detalhe dos Lucros" items={summary.lucros} />
        <ListCard title="Detalhe das Despesas" items={summary.despesas} />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'positive' | 'negative';
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6">
      <div className="flex items-center gap-4">
        <div
          className={
            tone === 'positive'
              ? 'w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center'
              : 'w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center'
          }
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-[#78716C]">{title}</p>
          <p className="text-3xl font-bold">{formatMoney(value)}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function LegendList({
  items,
  total,
}: {
  items: FinancialItem[];
  total: number;
}) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((item, index) => (
        <div
          key={item.categoria}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-[#57534E] truncate">
              {item.categoria}
            </span>
          </div>

          <div className="text-sm font-bold whitespace-nowrap">
            {percentage(item.valor, total)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: FinancialItem[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.categoria}
              className="flex items-center justify-between border-b border-[#F5F5F4] pb-3 gap-4"
            >
              <span className="text-[#57534E] min-w-0 truncate">
                {item.categoria}
              </span>
              <span className="font-bold whitespace-nowrap">
                {formatMoney(item.valor)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Sem movimentos para mostrar." compact />
      )}
    </div>
  );
}

function EmptyState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'text-sm text-[#78716C]'
          : 'min-h-[280px] flex items-center justify-center text-center text-[#78716C]'
      }
    >
      {message}
    </div>
  );
}
