import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { PawPrint, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-[#E7E5E4] rounded-2xl hover:border-[#5A5A40] hover:bg-[#F5F5F4] transition-all group"
    >
      <div className="w-10 h-10 bg-[#F5F5F4] group-hover:bg-[#5A5A40] group-hover:text-white rounded-xl flex items-center justify-center text-[#5A5A40] transition-colors">
        <Icon size={20} />
      </div>
      <span className="text-xs font-bold text-[#57534E] group-hover:text-[#1C1917]">{label}</span>
    </button>
  );
}

function statusPtLabel(status: string): string {
  switch (status) {
    case 'WAITING': return 'Em espera';
    case 'ARRIVED': return 'Chegou';
    case 'PENDING': return 'Pendente';
    case 'COMPLETED': return 'Concluído';
    case 'CANCELLED': return 'Cancelado';
    case 'READY': return 'Disponível';
    case 'BUSY': return 'Ocupado';
    case 'FREE': return 'Livre';
    case 'DONE': return 'Feito';
    case 'SUCCESS': return 'Sucesso';
    case 'NEW': return 'Novo';
    case 'INFO': return 'Info';
    default: return status;
  }
}

export function DashboardSection({ title, actionLabel, items, onAction }: { title: string, actionLabel: string, items: any[], onAction?: () => void }) {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E7E5E4] dark:border-[#334155] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[#E7E5E4] dark:border-[#334155] flex items-center justify-between">
        <h2 className="font-bold text-lg">{title}</h2>
        <button onClick={onAction} className="text-sm text-[#5A5A40] dark:text-[#cbd5e1] font-semibold hover:underline">{actionLabel}</button>
      </div>
      <div className="divide-y divide-[#E7E5E4] dark:divide-[#334155]">
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-[#A8A29E]">Sem registos para mostrar.</div>
        )}
        {items.map(item => (
          <div
            key={item.id}
            onClick={onAction}
            className={cn(
              "p-4 flex items-center justify-between transition-colors",
              onAction ? "cursor-pointer hover:bg-[#F5F5F4] dark:hover:bg-[#1f2937]" : "hover:bg-[#FAFAF9] dark:hover:bg-[#1f2937]",
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F5F5F4] rounded-full flex items-center justify-center text-[#5A5A40]">
                <PawPrint size={20} />
              </div>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-[#78716C]">{item.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{item.time}</p>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                item.status === 'WAITING' || item.status === 'PENDING' || item.status === 'BUSY' ? "bg-orange-100 text-orange-700" :
                item.status === 'DONE' || item.status === 'SUCCESS' || item.status === 'FREE' ? "bg-green-100 text-green-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {statusPtLabel(item.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationItem({ title, desc, time, onClick }: { title: string, desc: string, time: string, onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full p-2 hover:bg-[#F5F5F4] dark:hover:bg-[#1f2937] rounded-xl transition-colors text-left">
        <div className="flex justify-between items-start gap-3">
          <p className="text-sm font-bold">{title}</p>
          <span className="text-[10px] text-[#A8A29E]">{time}</span>
        </div>
        <p className="text-xs text-[#78716C] mt-0.5">{desc}</p>
      </button>
    );
  }

  return (
    <div className="w-full p-2 hover:bg-[#F5F5F4] dark:hover:bg-[#1f2937] rounded-xl transition-colors text-left">
      <div className="flex justify-between items-start gap-3">
        <p className="text-sm font-bold">{title}</p>
        <span className="text-[10px] text-[#A8A29E]">{time}</span>
      </div>
      <p className="text-xs text-[#78716C] mt-0.5">{desc}</p>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string, children: ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#E7E5E4] rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}