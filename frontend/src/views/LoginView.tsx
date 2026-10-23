import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { PawPrint } from 'lucide-react';
import type { UserRole } from '../types';

type QuickAccessUser = {
  label: string;
  email: string;
  password: string;
  role: UserRole;
};

const QUICK_ACCESS_USERS: QuickAccessUser[] = [
  { label: 'Admin', email: 'admin@les.local', password: 'admin123', role: 'ADMIN' },
  { label: 'Veterinário', email: 'vet@les.local', password: 'vet123', role: 'VETERINARIO' },
  { label: 'Receção', email: 'rececao@les.local', password: 'rececao123', role: 'RECECIONISTA' },
  { label: 'Técnico', email: 'tecnico@les.local', password: 'tecnico123', role: 'TECNICO' },
];

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (targetEmail: string, targetPassword: string) => {
    setLoading(true);
    setError('');

    try {
      await onLogin(targetEmail, targetPassword);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao iniciar sessão. Verifique as credenciais.';

      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const handleQuickAccess = async (targetEmail: string, targetPassword: string) => {
    setEmail(targetEmail);
    setPassword(targetPassword);
    await doLogin(targetEmail, targetPassword);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-[#E7E5E4] w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white mb-4">
            <PawPrint size={32} />
          </div>
          <h1 className="text-2xl font-bold">VetClinic Pro</h1>
          <p className="text-[#78716C] text-sm">Inicie sessão para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#57534E] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@les.local"
              className="w-full px-4 py-3 rounded-xl border border-[#E7E5E4] focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#57534E] mb-1">Palavra-passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#E7E5E4] focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
              required
            />
          </div>

          {error && <p className="text-[#EF4444] text-xs font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-bold hover:bg-[#4A4A35] transition-colors shadow-lg shadow-[#5A5A40]/20 disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E7E5E4]">
          <p className="text-xs text-[#A8A29E] text-center mb-4 uppercase tracking-widest font-bold">
            Acesso Rápido
          </p>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACCESS_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => handleQuickAccess(u.email, u.password)}
                disabled={loading}
                className="text-[10px] bg-[#F5F5F4] hover:bg-[#E7E5E4] p-2 rounded-lg text-left transition-colors border border-[#E7E5E4] group disabled:opacity-50"
              >
                <p className="font-bold text-[#57534E] group-hover:text-[#5A5A40]">{u.label}</p>
                <p className="text-[#78716C] truncate">{u.email}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#E7E5E4]">
          <p className="text-[10px] text-[#78716C] text-center">
            Esta aplicação é para uso interno da clínica veterinária.
          </p>
        </div>
      </motion.div>
    </div>
  );
}