import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { User } from '../types';
import {
  DEFAULT_CLINICA_INFO,
  getClinicaInfo,
  setClinicaInfo,
  type ClinicaInfo,
} from '../lib/clinicaInfo';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  user: User;
  isDemo?: boolean;
  onProfileUpdated?: () => Promise<void>;
}

type Msg = { text: string; type: 'success' | 'error' } | null;

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 text-sm flex items-center gap-2',
        msg.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg.text}
    </div>
  );
}

export function SettingsView({ user }: SettingsViewProps) {
  const [clinicaForm, setClinicaForm] = useState<ClinicaInfo>(DEFAULT_CLINICA_INFO);
  const [clinicaMsg, setClinicaMsg] = useState<Msg>(null);

  useEffect(() => {
    setClinicaForm(getClinicaInfo());
  }, []);

  function feedback(text: string, type: 'success' | 'error' = 'success') {
    setClinicaMsg({ text, type });
    window.setTimeout(() => setClinicaMsg(null), 3500);
  }

  function handleClinicaSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clinicaForm.nome.trim()) {
      feedback('O nome da clínica é obrigatório.', 'error');
      return;
    }

    setClinicaInfo(clinicaForm);
    feedback('Informação da clínica guardada com sucesso.');
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Definições</h1>
        <p className="text-[#78716C] mt-1">
          Configuração administrativa da informação da clínica.
        </p>
        <p className="text-xs text-[#A8A29E] mt-1">Sessão ativa: {user.role}</p>
      </div>

      <section className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-lg text-[#1C1917]">Informação da clínica</h2>
          <p className="text-sm text-[#78716C]">
            Estes dados aparecem nas impressões de faturas e certificados.
          </p>
        </div>

        <Feedback msg={clinicaMsg} />

        <form onSubmit={handleClinicaSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">Nome da clínica *</label>
            <input
              value={clinicaForm.nome}
              onChange={(e) => setClinicaForm((current) => ({ ...current, nome: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">Telefone</label>
            <input
              value={clinicaForm.telefone}
              onChange={(e) => setClinicaForm((current) => ({ ...current, telefone: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-bold text-[#57534E]">Morada</label>
            <input
              value={clinicaForm.morada}
              onChange={(e) => setClinicaForm((current) => ({ ...current, morada: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">Email</label>
            <input
              type="email"
              value={clinicaForm.email}
              onChange={(e) => setClinicaForm((current) => ({ ...current, email: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#57534E]">NIF</label>
            <input
              value={clinicaForm.nif ?? ''}
              onChange={(e) => setClinicaForm((current) => ({ ...current, nif: e.target.value }))}
              className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
          </div>
          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A35] transition-colors"
            >
              <Save size={18} />
              Guardar informação
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
