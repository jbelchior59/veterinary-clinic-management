import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import AnimaisPage from './pages/Animais.tsx';
import DonosPage from './pages/Donos.tsx';
import MarcacoesPage from './pages/Marcacoes.tsx';
import HistoricoClinicoPage from './pages/HistoricoClinico.tsx';
import './index.css';

type UserRole = 'ADMIN' | 'VETERINARIO' | 'TECNICO' | 'RECECIONISTA' | 'TUTOR';

function RequireRole({ children, roles }: { children: ReactNode; roles: UserRole[] }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  const role = localStorage.getItem('userRole') as UserRole | null;
  if (!role || !roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/donos" element={<RequireRole roles={['ADMIN', 'RECECIONISTA', 'VETERINARIO']}><DonosPage /></RequireRole>} />
        <Route path="/animais" element={<RequireRole roles={['ADMIN', 'RECECIONISTA', 'VETERINARIO']}><AnimaisPage /></RequireRole>} />
        <Route path="/animais/:id/historico" element={<RequireRole roles={['ADMIN', 'VETERINARIO', 'RECECIONISTA', 'TECNICO']}><HistoricoClinicoPage /></RequireRole>} />
        <Route path="/marcacoes" element={<RequireRole roles={['ADMIN', 'RECECIONISTA']}><MarcacoesPage /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
