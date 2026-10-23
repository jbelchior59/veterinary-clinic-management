import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from './lib/utils';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PatientsView } from './views/PatientsView';
import { LaboratoryView } from './views/LaboratoryView';
import { AppointmentsView } from './views/AppointmentsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { InPatientView } from './views/InPatientView';
import { StockView } from './views/StockView';
import { FinancialSummaryView } from './views/FinancialSummaryView';
import { BillingView } from './views/BillingView';
import { Layout } from './components/Layout';
import { RececaoView } from './views/RececaoView';
import { UsersView } from './views/UsersView';
import { ServicesCatalogView } from './views/ServicesCatalogView';
import {
  canAccessPage,
  getDefaultPageForRole,
  type AppPage,
} from './lib/permissions';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Ocorreu um erro inesperado.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro não tratado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#E7E5E4] max-w-md text-center">
            <AlertTriangle size={48} className="text-[#EF4444] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ups! Algo correu mal.</h2>
            <p className="text-[#78716C] mb-6">
              {this.state.errorMessage ?? 'Ocorreu um erro inesperado.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#4A4A35] transition-colors"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user, isAuthReady, handleLogin, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = window.localStorage.getItem('vetclinic-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [openSampleFromDashboard, setOpenSampleFromDashboard] = useState(false);
  const [rececaoAutoOpen, setRececaoAutoOpen] = useState<{
    action: 'appointment' | 'owner' | 'animal' | 'invoice' | 'communication';
    token: number;
  } | null>(null);

  const { patients, appointments, exams, refreshData } = useData(user);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('vetclinic-theme', theme);
  }, [theme]);

  useEffect(() => {
    const requested = (location.state as { goToPage?: AppPage } | null)?.goToPage;

    if (requested && user && canAccessPage(user.role, requested)) {
      setActivePage(requested);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, user, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;

    if (!canAccessPage(user.role, activePage)) {
      setActivePage(getDefaultPageForRole(user.role));
    }
  }, [user, activePage]);

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const currentRole = user?.role ?? '';
  const isReceptionRole = ['ADMIN', 'RECECIONISTA'].includes(currentRole);

  const safePageChange = (page: AppPage) => {
    if (!user) return;

    if (!canAccessPage(user.role, page)) {
      showToast('Sem permissão para aceder a essa área.', 'error');
      return;
    }

    setActivePage(page);
  };

  const openRececaoPage = (page: AppPage, action: 'appointment' | 'owner' | 'animal' | 'invoice' | 'communication') => {
    if (!user) return;

    if (!canAccessPage(user.role, page)) {
      showToast('Sem permissão para aceder a essa área.', 'error');
      return;
    }

    setRececaoAutoOpen({ action, token: Date.now() });
    setActivePage(page);
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen">
      <Layout
        user={user}
        activePage={activePage}
        onPageChange={safePageChange}
        onLogout={() => {
          handleLogout();
          setActivePage('dashboard');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activePage === 'dashboard' && (
              <DashboardView
                user={user}
                onNewAppointment={() =>
                  isReceptionRole
                    ? openRececaoPage('appointments', 'appointment')
                    : showToast('Fluxo de nova marcação será ligado no próximo passo.')
                }
                onNewSample={() => {
                  setOpenSampleFromDashboard(true);
                  safePageChange('laboratory');
                }}
                onNewUser={() =>
                  user.role === 'ADMIN'
                    ? safePageChange('users')
                    : showToast(
                        'Só um administrador pode aceder à gestão de utilizadores.',
                        'error',
                      )
                }
                onNewOwner={() =>
                  isReceptionRole
                    ? openRececaoPage('patients', 'owner')
                    : showToast('Formulários reais serão ligados no próximo passo.')
                }
                onNewAnimal={() =>
                  isReceptionRole
                    ? openRececaoPage('patients', 'animal')
                    : showToast('Formulários reais serão ligados no próximo passo.')
                }
                onShowPatients={() => safePageChange('patients')}
                onShowUsers={() =>
                  user.role === 'ADMIN'
                    ? safePageChange('users')
                    : showToast(
                        'Só um administrador pode aceder à gestão de utilizadores.',
                        'error',
                      )
                }
                onShowReports={() => safePageChange('reports')}
                onShowSettings={() => safePageChange('settings')}
                onShowInPatient={() => safePageChange('inpatient')}
                onShowBilling={() =>
                  isReceptionRole
                    ? openRececaoPage('billing', 'invoice')
                    : safePageChange('billing')
                }
                onShowBillingPending={() => safePageChange('billing')}
                onShowStock={() => safePageChange('stock')}
                onShowLab={() => safePageChange('laboratory')}
                onShowAppointments={() => safePageChange('appointments')}
                onShowCheckin={() => safePageChange('checkin')}
                patients={patients}
                appointments={appointments}
                exams={exams}
              />
            )}

            {activePage === 'patients' &&
              (isReceptionRole ? (
                <RececaoView
                  user={user}
                  initialTab="pacientes"
                  patients={patients}
                  appointments={appointments}
                  onRefreshData={refreshData}
                  autoOpenAction={rececaoAutoOpen}
                  onAutoOpenHandled={() => setRececaoAutoOpen(null)}
                />
              ) : (
                <PatientsView
                  user={user}
                  onViewProfile={() => undefined}
                  onViewHistory={(pet) =>
                    navigate(`/animais/${pet.id}/historico`)
                  }
                  onStartConsultation={(pet) =>
                    navigate(`/animais/${pet.id}/historico?novaConsulta=1`)
                  }
                  onRegisterPet={() => navigate('/animais')}
                  patients={patients}
                />
              ))}

            {activePage === 'laboratory' && (
              <LaboratoryView
                user={user}
                onInsertResults={() => {}}
                onViewResults={() => {}}
                onNewExam={() =>
                  showToast(
                    'O pedido de exame é feito durante a consulta clínica.',
                  )
                }
                exams={exams}
                isDemo={false}
                onDataChanged={refreshData}
                autoOpenSample={openSampleFromDashboard}
                onAutoOpenSampleHandled={() => setOpenSampleFromDashboard(false)}
              />
            )}

            {activePage === 'appointments' &&
              (isReceptionRole ? (
                <RececaoView
                  user={user}
                  initialTab="agenda"
                  patients={patients}
                  appointments={appointments}
                  onRefreshData={refreshData}
                  autoOpenAction={rececaoAutoOpen}
                  onAutoOpenHandled={() => setRececaoAutoOpen(null)}
                />
              ) : (
                <AppointmentsView
                  user={user}
                  onNewAppointment={() => navigate('/marcacoes')}
                  onStartConsultation={(appointment) =>
                    navigate(
                      `/animais/${appointment.petId}/historico?novaConsulta=1&marcacaoId=${appointment.id}`,
                    )
                  }
                  appointments={appointments}
                />
              ))}

            {activePage === 'users' && user.role === 'ADMIN' && (
              <UsersView user={user} />
            )}

            {activePage === 'financial' && user.role === 'ADMIN' && (
              <FinancialSummaryView />
            )}

            {activePage === 'reports' && (
              <ReportsView
                user={user}
                patients={patients}
                appointments={appointments}
                exams={exams}
                onExport={() => showToast('Geração de relatório iniciada...')}
              />
            )}

            {activePage === 'servicesCatalog' && user.role === 'ADMIN' && (
              <ServicesCatalogView />
            )}

            {activePage === 'settings' && user.role === 'ADMIN' && (
              <SettingsView user={user} isDemo={false} />
            )}

            {activePage === 'inpatient' && (
              <InPatientView
                user={user}
                patients={patients}
                onNewInPatient={() =>
                  showToast('Internamentos serão ligados no próximo passo.')
                }
                onMonitor={() =>
                  showToast('Monitorização será ligada no próximo passo.')
                }
                onDischarge={() =>
                  showToast('Alta será ligada no próximo passo.')
                }
              />
            )}

            {activePage === 'billing' &&
              (isReceptionRole ? (
                <RececaoView
                  user={user}
                  initialTab="faturacao"
                  patients={patients}
                  appointments={appointments}
                  onRefreshData={refreshData}
                  autoOpenAction={rececaoAutoOpen}
                  onAutoOpenHandled={() => setRececaoAutoOpen(null)}
                />
              ) : (
                <BillingView
                  user={user}
                  patients={patients}
                  appointments={appointments}
                  onNewInvoice={() =>
                    showToast('Faturação será ligada no próximo passo.')
                  }
                  onDownload={() => showToast('Download iniciado.')}
                />
              ))}

            {activePage === 'stock' && (
              <StockView
                user={user}
                onNewItem={() =>
                  showToast('Gestão de stock será ligada no próximo passo.')
                }
                onAddStock={() =>
                  showToast('Gestão de stock será ligada no próximo passo.')
                }
              />
            )}

            {activePage === 'checkin' && (
              <RececaoView
                user={user}
                initialTab="checkin"
                patients={patients}
                appointments={appointments}
                onRefreshData={refreshData}
              />
            )}

            {activePage === 'comunicacao' && (
              <RececaoView
                user={user}
                initialTab="comunicacao"
                patients={patients}
                appointments={appointments}
                onRefreshData={refreshData}
              />
            )}

            {activePage === 'profissionais' && (
              <RececaoView
                user={user}
                initialTab="profissionais"
                patients={patients}
                appointments={appointments}
                onRefreshData={refreshData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Layout>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              'fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-[200] font-bold flex items-center gap-3',
              toast.type === 'success'
                ? 'bg-[#5A5A40] text-white'
                : 'bg-red-600 text-white',
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
