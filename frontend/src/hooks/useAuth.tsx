import { useEffect, useState } from 'react';
import { api, setApiToken } from '../lib/apiClient';
import { disconnectSocket } from '../lib/socket';
import type { User, UserRole } from '../types';

const TOKEN_KEY = 'token';

type BackendProfile = { id: number | string; nome?: string | null; email: string; role: UserRole };

function roleDisplayName(role: UserRole): string {
  switch (role) {
    case 'ADMIN': return 'Administrador';
    case 'VETERINARIO': return 'Veterinário';
    case 'TECNICO': return 'Técnico de Laboratório';
    case 'RECECIONISTA': return 'Rececionista';
    case 'TUTOR': return 'Tutor';
    default: return role;
  }
}

function buildUser(profile: BackendProfile): User {
  return { id: String(profile.id), email: profile.email, role: profile.role, name: profile.nome?.trim() || roleDisplayName(profile.role) };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsAuthReady(true);
      return;
    }

    setApiToken(token);
    api.get<BackendProfile>('/auth/profile')
      .then((res) => setUser(buildUser(res.data)))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setApiToken(null);
      })
      .finally(() => setIsAuthReady(true));
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const token: string | undefined = res.data?.access_token;
    const backendUser = res.data?.user;
    if (!token || !backendUser) throw new Error('Resposta de autenticação inválida.');
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('userRole', backendUser.role);
    setApiToken(token);
    setUser(buildUser(backendUser));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('userRole');
    setApiToken(null);
    setUser(null);
    disconnectSocket();
  };

  const refreshUser = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await api.get<BackendProfile>('/auth/profile');
      setUser(buildUser(res.data));
    } catch {}
  };

  return { user, isAuthReady, handleLogin, handleLogout, refreshUser };
}
