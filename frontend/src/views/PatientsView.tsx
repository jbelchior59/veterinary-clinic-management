import { useState } from 'react';
import { User, Pet } from '../types';
import {
  PawPrint,
  X,
  UserCircle,
  Stethoscope,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  Weight,
  CalendarDays,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { updateAnimal, formatAxiosError } from '../lib/animais';

interface PatientsViewProps {
  user: User;
  onViewProfile: (pet: Pet) => void;
  onViewHistory: (pet: Pet) => void;
  onStartConsultation: (pet: Pet) => void;
  onRegisterPet: () => void;
  patients: Pet[];
}

function formatSpeciesBreed(pet: Pet) {
  const breed = pet.breed?.trim();
  return breed && breed !== 'N/D' ? `${pet.species} / ${breed}` : pet.species;
}

function formatBirthDate(value?: string) {
  if (!value) return 'Não registada';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não registada';

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
  }).format(date);
}

export function PatientsView({
  user,
  onViewProfile,
  onViewHistory,
  onStartConsultation,
  onRegisterPet,
  patients,
}: PatientsViewProps) {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [search, setSearch] = useState('');
  const [alertasForm, setAlertasForm] = useState({ alergias: '', alertasClinicos: '' });
  const [alertasSaving, setAlertasSaving] = useState(false);
  const [alertasError, setAlertasError] = useState<string | null>(null);
  const [alertasSuccess, setAlertasSuccess] = useState<string | null>(null);

  const canRegisterPet = ['ADMIN', 'RECECIONISTA'].includes(user.role);
  const canViewHistory = ['VETERINARIO', 'TECNICO'].includes(user.role);
  const canStartConsultation = user.role === 'VETERINARIO';

  const filtered = search.trim()
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.species.toLowerCase().includes(q) ||
          (p.breed ?? '').toLowerCase().includes(q) ||
          (p.ownerName ?? '').toLowerCase().includes(q)
        );
      })
    : patients;

  function openProfile(pet: Pet) {
    onViewProfile(pet);
    setSelectedPet(pet);
    setAlertasForm({ alergias: pet.alergias ?? '', alertasClinicos: pet.alertasClinicos ?? '' });
    setAlertasError(null);
    setAlertasSuccess(null);
  }

  async function handleSaveAlertas() {
    if (!selectedPet) return;
    setAlertasSaving(true);
    setAlertasError(null);
    setAlertasSuccess(null);
    try {
      await updateAnimal(Number(selectedPet.id), {
        alergias: alertasForm.alergias || undefined,
        alertasClinicos: alertasForm.alertasClinicos || undefined,
      });
      setAlertasSuccess('Informação clínica guardada.');
      setSelectedPet({ ...selectedPet, alergias: alertasForm.alergias || null, alertasClinicos: alertasForm.alertasClinicos || null });
    } catch (e) {
      setAlertasError(formatAxiosError(e));
    } finally {
      setAlertasSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Pacientes & Donos</h1>

        {canRegisterPet && (
          <button
            onClick={onRegisterPet}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
          >
            <PawPrint size={18} />
            Registar Animal
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm px-4 pt-4 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, espécie, raça ou dono..."
          className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-[#FAFAF9]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <th className="p-4 font-semibold text-sm text-[#57534E]">Animal</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Espécie/Raça</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Dono</th>
              <th className="p-4 font-semibold text-sm text-[#57534E]">Género</th>
              <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E7E5E4]">
            {filtered.map((pet) => (
              <tr key={pet.id} className="hover:bg-[#FAFAF9] transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F4] rounded-lg flex items-center justify-center text-[#5A5A40]">
                      <PawPrint size={16} />
                    </div>
                    <span className="font-semibold">{pet.name}</span>
                  </div>
                </td>

                <td className="p-4 text-sm">{formatSpeciesBreed(pet)}</td>

                <td className="p-4 text-sm font-medium">{pet.ownerName ?? 'Sem dono associado'}</td>

                <td className="p-4">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                      pet.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700',
                    )}
                  >
                    {pet.gender === 'M' ? 'Macho' : 'Fêmea'}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                      onClick={() => openProfile(pet)}
                      className="text-[#5A5A40] hover:underline text-sm font-semibold"
                    >
                      Ver Perfil
                    </button>

                    {canViewHistory && (
                      <>
                        <span className="text-[#E7E5E4]">|</span>

                        <button
                          onClick={() => onViewHistory(pet)}
                          className="text-[#5A5A40] hover:underline text-sm font-semibold"
                        >
                          Histórico
                        </button>
                      </>
                    )}

                    {canStartConsultation && (
                      <>
                        <span className="text-[#E7E5E4]">|</span>

                        <button
                          onClick={() => onStartConsultation(pet)}
                          className="text-[#5A5A40] hover:underline text-sm font-semibold"
                        >
                          Iniciar Consulta
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#A8A29E]">
                  {search.trim() ? 'Nenhum resultado para a pesquisa.' : 'Nenhum paciente registado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPet && (
        <div className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-6 border-b border-[#E7E5E4] flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#F5F5F4] rounded-2xl flex items-center justify-center text-[#5A5A40]">
                  <PawPrint size={26} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E]">
                    Perfil do animal
                  </p>
                  <h2 className="text-2xl font-bold text-[#1C1917] mt-1">{selectedPet.name}</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPet(null)}
                className="p-2 rounded-xl hover:bg-[#F5F5F4] transition-colors text-[#57534E]"
                aria-label="Fechar perfil"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">
                  Identificação
                </p>
                <div className="space-y-3 text-sm text-[#57534E]">
                  <div><span className="font-bold text-[#1C1917]">Nome:</span> {selectedPet.name}</div>
                  <div><span className="font-bold text-[#1C1917]">Espécie:</span> {selectedPet.species}</div>
                  <div>
                    <span className="font-bold text-[#1C1917]">Raça:</span>{' '}
                    {selectedPet.breed?.trim() ? selectedPet.breed : 'Não registada'}
                  </div>
                  <div><span className="font-bold text-[#1C1917]">Género:</span> {selectedPet.gender === 'M' ? 'Macho' : 'Fêmea'}</div>

                  <div className="flex items-center gap-2 pt-1">
                    <CalendarDays size={15} className="text-[#5A5A40]" />
                    <span><span className="font-bold text-[#1C1917]">Nascimento:</span> {formatBirthDate(selectedPet.birthDate)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Weight size={15} className="text-[#5A5A40]" />
                    <span>
                      <span className="font-bold text-[#1C1917]">Peso:</span>{' '}
                      {selectedPet.weight ? `${selectedPet.weight} kg` : 'Não registado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] mb-3">
                  Dono associado
                </p>
                <div className="space-y-3 text-sm text-[#57534E]">
                  <div className="flex items-center gap-2">
                    <UserCircle size={16} className="text-[#5A5A40]" />
                    <span className="font-bold text-[#1C1917]">{selectedPet.ownerName ?? 'Sem dono associado'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-[#5A5A40]" />
                    <span>{selectedPet.ownerEmail || 'Email não registado'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone size={15} className="text-[#5A5A40]" />
                    <span>{selectedPet.ownerPhone || 'Telefone não registado'}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-[#5A5A40] mt-0.5" />
                    <span>{selectedPet.ownerAddress || 'Morada não registada'}</span>
                  </div>
                </div>
              </div>
            </div>

            {['ADMIN', 'VETERINARIO'].includes(user.role) && (
              <div className="px-6 pb-2">
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 space-y-3">
                  <p className="text-xs uppercase tracking-widest font-bold text-[#A8A29E] flex items-center gap-2">
                    <AlertTriangle size={13} /> Informação Clínica
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#57534E]">Alergias conhecidas</label>
                    <input
                      type="text"
                      value={alertasForm.alergias}
                      onChange={(e) => setAlertasForm((p) => ({ ...p, alergias: e.target.value }))}
                      placeholder="Ex: Penicilina, látex..."
                      className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#57534E]">Alertas clínicos</label>
                    <input
                      type="text"
                      value={alertasForm.alertasClinicos}
                      onChange={(e) => setAlertasForm((p) => ({ ...p, alertasClinicos: e.target.value }))}
                      placeholder="Ex: Cardiopatia, diabetes..."
                      className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-white"
                    />
                  </div>
                  {alertasError && <p className="text-xs text-red-600">{alertasError}</p>}
                  {alertasSuccess && <p className="text-xs text-green-600">{alertasSuccess}</p>}
                  <button
                    type="button"
                    onClick={() => void handleSaveAlertas()}
                    disabled={alertasSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                    {alertasSaving ? 'A guardar...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 pb-6 flex flex-col sm:flex-row justify-end gap-3">
              {canViewHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onViewHistory(selectedPet);
                    setSelectedPet(null);
                  }}
                  className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors flex items-center justify-center gap-2"
                >
                  <ClipboardList size={16} />
                  Abrir histórico
                </button>
              )}

              {canStartConsultation && (
                <button
                  type="button"
                  onClick={() => {
                    onStartConsultation(selectedPet);
                    setSelectedPet(null);
                  }}
                  className="px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors flex items-center justify-center gap-2"
                >
                  <Stethoscope size={16} />
                  Iniciar consulta
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedPet(null)}
                className="px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
