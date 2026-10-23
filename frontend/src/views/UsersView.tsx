import { useEffect, useState } from 'react';
import { User } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Plus,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react';
import {
  createUser,
  deleteUser,
  formatAxiosError,
  getUsers,
  updateUser,
  updateUserPassword,
  updateUserRole,
  type BackendUser,
  type UserRole,
} from '../lib/users';

interface UsersViewProps {
  user: User;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  VETERINARIO: 'Veterinário',
  TECNICO: 'Técnico de Laboratório',
  RECECIONISTA: 'Rececionista',
  TUTOR: 'Tutor',
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  VETERINARIO: 'bg-blue-100 text-blue-700',
  TECNICO: 'bg-purple-100 text-purple-700',
  RECECIONISTA: 'bg-orange-100 text-orange-700',
  TUTOR: 'bg-stone-100 text-stone-600',
};

const ALL_ROLES: UserRole[] = ['ADMIN', 'VETERINARIO', 'TECNICO', 'RECECIONISTA', 'TUTOR'];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(date);
}

export function UsersView({ user }: UsersViewProps) {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'VETERINARIO' as UserRole,
  });
  const [creating, setCreating] = useState(false);

  const [changingRole, setChangingRole] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    role: 'VETERINARIO' as UserRole,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [passwordUser, setPasswordUser] = useState<BackendUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<BackendUser | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      setError(formatAxiosError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function showFeedback(message: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    window.setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3500);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password.trim()) {
      showFeedback('Email e password são obrigatórios.', 'error');
      return;
    }
    setCreating(true);
    try {
      await createUser({
        nome: createForm.nome.trim() || undefined,
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      showFeedback('Utilizador criado com sucesso.');
      setShowCreateModal(false);
      setCreateForm({ nome: '', email: '', password: '', role: 'VETERINARIO' });
      await loadUsers();
    } catch (e) {
      showFeedback(formatAxiosError(e), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleChangeRole(userId: number, role: UserRole) {
    if (userId === Number(user.id)) {
      showFeedback('Não podes alterar o teu próprio papel.', 'error');
      return;
    }
    setChangingRole(userId);
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      showFeedback('Papel atualizado com sucesso.');
    } catch (e) {
      showFeedback(formatAxiosError(e), 'error');
    } finally {
      setChangingRole(null);
    }
  }

  function openEditModal(item: BackendUser) {
    setEditingUser(item);
    setEditForm({
      nome: item.nome ?? '',
      email: item.email,
      role: item.role,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.email.trim()) {
      showFeedback('Email e obrigatorio.', 'error');
      return;
    }

    if (editingUser.id === Number(user.id) && editForm.role !== editingUser.role) {
      showFeedback('Nao podes alterar o teu proprio papel.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateUser(editingUser.id, {
        nome: editForm.nome.trim() || undefined,
        email: editForm.email.trim(),
        role: editForm.role,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      showFeedback('Utilizador atualizado com sucesso.');
    } catch (e) {
      showFeedback(formatAxiosError(e), 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;

    if (newPassword.length < 6) {
      showFeedback('A password deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await updateUserPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setNewPassword('');
      showFeedback('Password atualizada com sucesso.');
    } catch (e) {
      showFeedback(formatAxiosError(e), 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteUser) return;

    if (confirmDeleteUser.id === Number(user.id)) {
      showFeedback('Não podes eliminar a tua própria conta.', 'error');
      return;
    }

    const userId = confirmDeleteUser.id;
    setDeletingId(userId);
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteUser(null);
      showFeedback('Utilizador eliminado com sucesso.');
    } catch (e) {
      showFeedback(formatAxiosError(e), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Utilizadores</h1>
          <p className="text-[#78716C] mt-1">
            Criação, consulta e gestão de papéis dos utilizadores do sistema.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4A4A35] transition-colors w-fit"
        >
          <Plus size={18} />
          Novo Utilizador
        </button>
      </div>

      {(error || success) && (
        <div className="grid gap-3">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between">
          <h2 className="font-bold text-lg">Utilizadores registados</h2>
          <span className="text-xs font-bold uppercase bg-[#F5F5F4] text-[#57534E] px-3 py-1 rounded-full">
            {users.length} utilizador(es)
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[#78716C]">A carregar utilizadores...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-[#78716C]">Nenhum utilizador encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                  <th className="p-4 font-semibold text-sm text-[#57534E]">Utilizador</th>
                  <th className="p-4 font-semibold text-sm text-[#57534E]">Email</th>
                  <th className="p-4 font-semibold text-sm text-[#57534E]">Papel</th>
                  <th className="p-4 font-semibold text-sm text-[#57534E]">Criado em</th>
                  <th className="p-4 font-semibold text-sm text-[#57534E] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F5F5F4] rounded-lg flex items-center justify-center text-[#5A5A40]">
                          <UserCircle size={18} />
                        </div>
                        <span className="font-semibold">
                          {u.nome?.trim() || '—'}
                          {u.id === Number(user.id) && (
                            <span className="ml-2 text-[10px] bg-[#5A5A40] text-white px-2 py-0.5 rounded-full font-bold uppercase">
                              Tu
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#57534E]">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => void handleChangeRole(u.id, e.target.value as UserRole)}
                        disabled={changingRole === u.id || u.id === Number(user.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E7E5E4] bg-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${ROLE_BADGE[u.role]}`}
                      >
                        {ALL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-sm text-[#78716C]">{formatDate(u.createdAt)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-[#A8A29E] hover:text-blue-600 transition-colors"
                        title="Editar utilizador"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setPasswordUser(u);
                          setNewPassword('');
                        }}
                        className="p-2 rounded-lg hover:bg-amber-50 text-[#A8A29E] hover:text-amber-600 transition-colors"
                        title="Alterar password"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUser(u)}
                        disabled={deletingId === u.id || u.id === Number(user.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#A8A29E] hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Eliminar utilizador"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] w-full max-w-md p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Novo utilizador</h2>
                <p className="text-sm text-[#78716C] mt-1">Cria uma conta no sistema.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl hover:bg-[#F5F5F4] text-[#57534E]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Nome</label>
              <input
                type="text"
                value={createForm.nome}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                placeholder="Nome completo (opcional)"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                placeholder="email@clinica.pt"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Password *</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Papel *</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, role: e.target.value as UserRole }))
                }
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
              >
                {creating ? 'A criar...' : 'Criar utilizador'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => void handleEdit(e)}
            className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] w-full max-w-md p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Editar utilizador</h2>
                <p className="text-sm text-[#78716C] mt-1">Atualiza dados e papel da equipa.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl hover:bg-[#F5F5F4] text-[#57534E]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Nome</label>
              <input
                type="text"
                value={editForm.nome}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Email *</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Papel *</label>
              <select
                value={editForm.role}
                disabled={editingUser.id === Number(user.id)}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 disabled:opacity-60"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
              >
                {savingEdit ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => void handlePasswordChange(e)}
            className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] w-full max-w-md p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Alterar password</h2>
                <p className="text-sm text-[#78716C] mt-1">{passwordUser.nome || passwordUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="p-2 rounded-xl hover:bg-[#F5F5F4] text-[#57534E]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#57534E]">Nova password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="flex-1 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
              >
                {savingPassword ? 'A guardar...' : 'Alterar password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1C1917]">Confirmar eliminacao</h2>
                <p className="text-sm text-[#78716C] mt-1">
                  Tem a certeza que quer eliminar {confirmDeleteUser.nome || confirmDeleteUser.email}?
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl font-bold text-[#57534E] hover:bg-[#F5F5F4] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deletingId === confirmDeleteUser.id}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId === confirmDeleteUser.id ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
