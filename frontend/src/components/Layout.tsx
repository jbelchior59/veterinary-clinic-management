import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  Bell,
  Moon,
  Menu,
  ShieldCheck,
  Sun,
  X,
  PawPrint,
  UserCircle,
  Bed,
  Package,
  CreditCard,
  UserCheck,
  Mail,
  BriefcaseBusiness,
  TrendingUp,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { User } from '../types';
import { NotificationItem } from './ui';
import { getRececaoSocket } from '../lib/socket';
import { canAccessPage, type AppPage } from '../lib/permissions';

interface LayoutProps {
  user: User;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  children: ReactNode;
}

type NavItem = {
  id: AppPage;
  label: string;
  icon: any;
  group: 'principal' | 'operacao' | 'gestao';
};

const groupLabels: Record<NavItem['group'], string> = {
  principal: 'Principal',
  operacao: 'Operação clínica',
  gestao: 'Gestão',
};

function roleLabel(role: User['role']): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'VETERINARIO':
      return 'Veterinário';
    case 'TECNICO':
      return 'Técnico';
    case 'RECECIONISTA':
      return 'Rececionista';
    case 'TUTOR':
      return 'Tutor';
    default:
      return role;
  }
}

export function Layout({
  user,
  activePage,
  onPageChange,
  onLogout,
  theme,
  onToggleTheme,
  children,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [liveNotifications, setLiveNotifications] = useState<{ title: string; desc: string; time: string; onClick?: () => void }[]>([]);

  useEffect(() => {
    const socket = getRececaoSocket();
    const push = (title: string, desc: string, onClick?: () => void) => {
      setLiveNotifications((current) => [{ title, desc, time: 'agora', onClick }, ...current].slice(0, 6));
    };

    const handleComunicacao = (payload: any) => {
      push('Nova comunicação', payload?.assunto ? `${payload.assunto}` : 'Foi criado um novo registo de comunicação.');
    };

    const handleMarcacao = (payload: any) => {
      push('Nova marcação', payload?.animal?.nome ? `Marcação para ${payload.animal.nome}` : 'Foi criada uma nova marcação.');
    };

    const handleFatura = (payload: any) => {
      push('Fatura paga', payload?.numero ? `A fatura ${payload.numero} foi paga.` : 'Uma fatura foi marcada como paga.');
    };

    const handleHorario = (payload: any) => {
      push('Estado atualizado', payload?.user?.nome ? `${payload.user.nome} está agora ${payload.estado?.toLowerCase?.() ?? 'atualizado'}` : 'O estado de um profissional foi atualizado.');
    };

    socket.on('comunicacao_criada', handleComunicacao);
    socket.on('comunicacao_atualizada', handleComunicacao);
    socket.on('comunicacao_removida', () => push('Comunicação removida', 'Um pedido/comunicação foi removido.'));
    socket.on('marcacao_criada', handleMarcacao);
    socket.on('fatura_paga', handleFatura);
    socket.on('horario_atualizado', handleHorario);

    return () => {
      socket.off('comunicacao_criada', handleComunicacao);
      socket.off('comunicacao_atualizada', handleComunicacao);
      socket.off('comunicacao_removida');
      socket.off('marcacao_criada', handleMarcacao);
      socket.off('fatura_paga', handleFatura);
      socket.off('horario_atualizado', handleHorario);
    };
  }, []);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'principal' },
    { id: 'patients', label: 'Pacientes & Donos', icon: Users, group: 'principal' },
    { id: 'appointments', label: 'Marcações', icon: Calendar, group: 'principal' },
    { id: 'checkin', label: 'Check-in', icon: UserCheck, group: 'operacao' },
    { id: 'laboratory', label: 'Laboratório', icon: FlaskConical, group: 'operacao' },
    { id: 'inpatient', label: 'Internamentos', icon: Bed, group: 'operacao' },
    { id: 'stock', label: 'Stock Reagentes', icon: Package, group: 'operacao' },
    { id: 'billing', label: 'Faturação', icon: CreditCard, group: 'gestao' },
    { id: 'comunicacao', label: 'Comunicação', icon: Mail, group: 'gestao' },
    { id: 'profissionais', label: 'Profissionais', icon: BriefcaseBusiness, group: 'gestao' },
    { id: 'servicesCatalog', label: 'Catálogo de Serviços', icon: ClipboardList, group: 'gestao' },
    { id: 'financial', label: 'Resumo Financeiro', icon: TrendingUp, group: 'gestao' },
    { id: 'reports', label: 'Relatórios', icon: FileText, group: 'gestao' },
    { id: 'users', label: 'Utilizadores', icon: UserCircle, group: 'gestao' },
    { id: 'settings', label: 'Definições', icon: Settings, group: 'gestao' },
  ];

  const filteredNavItems = navItems.filter((item) =>
    canAccessPage(user.role, item.id),
  );

  const groupedNavItems = useMemo(
    () =>
      (['principal', 'operacao', 'gestao'] as const)
        .map((group) => ({
          group,
          items: filteredNavItems.filter((item) => item.group === group),
        }))
        .filter((section) => section.items.length > 0),
    [filteredNavItems],
  );

  const activeItem = filteredNavItems.find((item) => item.id === activePage);

  return (
    <div className="flex h-screen bg-[#F5F5F4] text-[#1C1917] font-sans overflow-hidden app-shell">
      <aside
        className={cn(
          'bg-white border-r border-[#E7E5E4] transition-all duration-300 flex flex-col shadow-sm',
          isSidebarOpen ? 'w-[17.5rem]' : 'w-20',
        )}
      >
        <div className="h-20 px-5 flex items-center gap-3 border-b border-[#E7E5E4] shrink-0">
          <div className="w-11 h-11 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
            <PawPrint size={24} />
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <p className="font-bold text-lg tracking-tight truncate">VetClinic Pro</p>
              <p className="text-xs text-[#78716C] truncate">Gestão clínica veterinária</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {groupedNavItems.map((section) => (
            <div key={section.group} className="space-y-1">
              {isSidebarOpen && (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#A8A29E]">
                  {groupLabels[section.group]}
                </p>
              )}

              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group text-left',
                    activePage === item.id
                      ? 'bg-[#5A5A40] text-white shadow-sm'
                      : 'text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917]',
                  )}
                  title={!isSidebarOpen ? item.label : undefined}
                  type="button"
                >
                  <item.icon
                    size={19}
                    className={cn(
                      'shrink-0',
                      activePage === item.id
                        ? 'text-white'
                        : 'text-[#A8A29E] group-hover:text-[#57534E]',
                    )}
                  />
                  {isSidebarOpen && (
                    <span className="font-medium text-sm truncate">
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[#E7E5E4] space-y-3 shrink-0">
          {isSidebarOpen && (
            <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-center text-[#5A5A40]">
                  <Activity size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">Operação ativa</p>
                  <p className="text-xs text-[#78716C] truncate">Sistema sincronizado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white border border-[#E7E5E4] px-3 py-2">
                  <p className="text-[#78716C]">Perfil</p>
                  <p className="font-bold truncate">{roleLabel(user.role)}</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E7E5E4] px-3 py-2">
                  <p className="text-[#78716C]">Sessão</p>
                  <p className="font-bold text-green-700">Online</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[#EF4444] hover:bg-[#FEF2F2] rounded-xl transition-colors text-left"
            type="button"
          >
            <LogOut size={19} />
            {isSidebarOpen && (
              <span className="font-medium text-sm truncate">
                Terminar sessão
              </span>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/95 backdrop-blur border-b border-[#E7E5E4] flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#F5F5F4] rounded-xl transition-colors shrink-0"
              type="button"
              aria-label={isSidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="min-w-0">
              <p className="text-xs text-[#78716C] font-medium">Área atual</p>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {activeItem?.label ?? 'VetClinic Pro'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="p-2.5 hover:bg-[#F5F5F4] rounded-xl transition-colors"
              type="button"
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-[#FACC15]" />
              ) : (
                <Moon size={20} className="text-[#57534E]" />
              )}
            </button>

            <div className="relative group">
              <button className="relative p-2.5 hover:bg-[#F5F5F4] rounded-xl transition-colors" type="button">
                <Bell size={20} className="text-[#57534E]" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></span>
              </button>

              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E7E5E4] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-4">
                <h3 className="font-bold mb-3 px-2">Notificações</h3>
                <div className="space-y-2">
                  {liveNotifications.length > 0 ? (
                    liveNotifications.map((notification, index) => (
                      <NotificationItem key={index} {...notification} />
                    ))
                  ) : (
                    <>
                      {user.role === 'VETERINARIO' && (
                        <NotificationItem
                          title="Exame Concluído"
                          desc="Resultado pronto para validação"
                          time="5m ago"
                        />
                      )}
                      {user.role === 'TECNICO' && (
                        <NotificationItem
                          title="Nova Amostra"
                          desc="Exame pendente de processamento"
                          time="2m ago"
                        />
                      )}
                      {user.role === 'RECECIONISTA' && (
                        <NotificationItem
                          title="Check-in"
                          desc="Novo atendimento registado"
                          time="1m ago"
                          onClick={() => onPageChange('checkin')}
                        />
                      )}
                      {user.role === 'ADMIN' && (
                        <NotificationItem
                          title="Sistema"
                          desc="Sessão iniciada com sucesso"
                          time="1h ago"
                        />
                      )}
                      <NotificationItem
                        title="Lembrete"
                        desc="Rever integrações do sprint"
                        time="2h ago"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-3 lg:pl-5 border-l border-[#E7E5E4]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-[#78716C] flex items-center justify-end gap-1">
                  <ShieldCheck size={12} />
                  {roleLabel(user.role)}
                </p>
              </div>
              <div className="w-10 h-10 bg-[#E7E5E4] rounded-full flex items-center justify-center text-[#57534E] ring-2 ring-white">
                <UserCircle size={24} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-7 app-content">
          {children}
        </div>
      </main>
    </div>
  );
}