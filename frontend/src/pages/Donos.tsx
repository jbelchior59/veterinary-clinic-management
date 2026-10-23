import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createDono,
  deleteDono,
  formatAxiosError,
  getDonos,
  updateDono,
  type Dono,
} from "../lib/donos";

const s = {
  page: { padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, sans-serif" } as React.CSSProperties,
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const, marginBottom: 20 },
  title: { margin: 0, fontSize: 28, fontWeight: 700 } as React.CSSProperties,
  backLink: { padding: "10px 16px", borderRadius: 10, backgroundColor: "#f3f4f6", color: "#111", textDecoration: "none", fontWeight: 600, border: "1px solid #d1d5db", fontSize: 14 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 20 } as React.CSSProperties,
  card: { border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, backgroundColor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" } as React.CSSProperties,
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  h2: { margin: 0, fontSize: 18, fontWeight: 700 } as React.CSSProperties,
  primaryBtn: { padding: "9px 16px", borderRadius: 10, border: "none", backgroundColor: "#5a5a40", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 } as React.CSSProperties,
  ghostBtn: { padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", backgroundColor: "#f9fafb", color: "#111", fontWeight: 600, cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  dangerBtn: { padding: "7px 12px", borderRadius: 8, border: "1px solid #fca5a5", backgroundColor: "#fff5f5", color: "#b91c1c", fontWeight: 600, cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  successBtn: { padding: "7px 12px", borderRadius: 8, border: "none", backgroundColor: "#5a5a40", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", borderBottom: "2px solid #e5e7eb", fontSize: 13, fontWeight: 700, color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 14, verticalAlign: "middle" as const },
  input: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" as const },
  editInput: { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #93c5fd", fontSize: 13, boxSizing: "border-box" as const },
  label: { display: "grid", gap: 5, fontSize: 14, fontWeight: 600, color: "#374151" } as React.CSSProperties,
  alertError: { padding: 12, borderRadius: 10, border: "1px solid #fca5a5", background: "#fff5f5", color: "#7a1f1f", marginBottom: 16, fontSize: 14 } as React.CSSProperties,
  alertSuccess: { padding: 12, borderRadius: 10, border: "1px solid #86efac", background: "#f0fff4", color: "#166534", marginBottom: 16, fontSize: 14 } as React.CSSProperties,
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: "#f3f4f6", color: "#374151", marginLeft: 8 } as React.CSSProperties,
  empty: { padding: "40px 24px", textAlign: "center" as const, color: "#9ca3af", fontSize: 14, border: "2px dashed #e5e7eb", borderRadius: 12, marginTop: 8 } as React.CSSProperties,
};

type EditState = { nome: string; email: string; telefone: string };

export default function Donos() {
  const [donos, setDonos] = useState<Dono[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ nome: "", email: "", telefone: "" });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => nome.trim().length > 0 && email.trim().length > 0 && !submitting, [nome, email, submitting]);

  async function loadDonos() {
    setLoading(true); setError(null);
    try { setDonos(await getDonos()); }
    catch (e) { setError(formatAxiosError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadDonos(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!nome.trim()) { setError("O nome é obrigatório."); return; }
    if (!email.trim()) { setError("O email é obrigatório."); return; }
    setSubmitting(true);
    try {
      await createDono({ nome: nome.trim(), email: email.trim(), telefone: telefone.trim() || undefined });
      setSuccess("Dono criado com sucesso."); setNome(""); setEmail(""); setTelefone("");
      await loadDonos();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setSubmitting(false); }
  }

  function startEdit(dono: Dono) {
    setEditingId(dono.id);
    setEditState({ nome: dono.nome, email: dono.email, telefone: dono.telefone ?? "" });
  }
  function cancelEdit() { setEditingId(null); }

  async function saveEdit(id: number) {
    setError(null); setSuccess(null);
    if (!editState.nome.trim()) { setError("O nome não pode estar vazio."); return; }
    if (!editState.email.trim()) { setError("O email não pode estar vazio."); return; }
    setSavingId(id);
    try {
      await updateDono(id, { nome: editState.nome.trim(), email: editState.email.trim(), telefone: editState.telefone.trim() || undefined });
      setSuccess("Dono atualizado com sucesso."); setEditingId(null);
      await loadDonos();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setSavingId(null); }
  }

  async function removeDono(id: number, nomeDono: string) {
    if (!window.confirm(`Remover "${nomeDono}"? Esta ação é irreversível.`)) return;
    setError(null); setSuccess(null); setDeletingId(id);
    try {
      await deleteDono(id);
      setSuccess("Dono removido com sucesso.");
      setDonos((prev) => prev.filter((d) => d.id !== id));
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setDeletingId(null); }
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h1 style={s.title}>👤 Gestão de Donos</h1>
        <Link to="/" style={s.backLink}>← Voltar</Link>
      </div>
      {error && <div style={s.alertError} role="alert"><strong>Erro: </strong>{error}</div>}
      {success && <div style={s.alertSuccess} role="status">{success}</div>}

      <div style={s.grid}>
        {/* Lista */}
        <section style={s.card}>
          <div style={s.sectionHeader}>
            <h2 style={s.h2}>Donos<span style={s.badge}>{donos.length}</span></h2>
            <button onClick={() => void loadDonos()} disabled={loading} style={s.ghostBtn}>{loading ? "A carregar..." : "↻ Recarregar"}</button>
          </div>
          {loading ? (
            <p style={{ color: "#9ca3af" }}>A carregar...</p>
          ) : donos.length === 0 ? (
            <div style={s.empty}>Sem donos registados. Cria o primeiro →</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Telefone</th>
                    <th style={{ ...s.th, width: 200 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {donos.map((dono) => editingId === dono.id ? (
                    <tr key={dono.id} style={{ background: "#f0f9ff" }}>
                      <td style={s.td}><input style={s.editInput} value={editState.nome} onChange={(e) => setEditState((p) => ({ ...p, nome: e.target.value }))} /></td>
                      <td style={s.td}><input style={s.editInput} value={editState.email} onChange={(e) => setEditState((p) => ({ ...p, email: e.target.value }))} /></td>
                      <td style={s.td}><input style={s.editInput} value={editState.telefone} onChange={(e) => setEditState((p) => ({ ...p, telefone: e.target.value }))} /></td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => void saveEdit(dono.id)} disabled={savingId === dono.id} style={s.successBtn}>{savingId === dono.id ? "..." : "✓ Guardar"}</button>
                          <button onClick={cancelEdit} style={s.ghostBtn}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={dono.id}>
                      <td style={s.td}><strong>{dono.nome}</strong></td>
                      <td style={{ ...s.td, color: "#6b7280" }}>{dono.email}</td>
                      <td style={{ ...s.td, color: "#6b7280" }}>{dono.telefone || "—"}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEdit(dono)} style={s.ghostBtn}>✎ Editar</button>
                          <button onClick={() => void removeDono(dono.id, dono.nome)} disabled={deletingId === dono.id} style={s.dangerBtn}>{deletingId === dono.id ? "..." : "🗑"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Criar */}
        <section style={s.card}>
          <h2 style={{ ...s.h2, marginBottom: 16 }}>Criar Dono</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={s.label}>Nome *<input style={s.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" /></label>
            <label style={s.label}>Email *<input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></label>
            <label style={s.label}>Telefone<input style={s.input} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="9XXXXXXXX" /></label>
            <button type="submit" disabled={!canSubmit} style={{ ...s.primaryBtn, marginTop: 4 }}>{submitting ? "A criar..." : "+ Criar Dono"}</button>
          </form>
          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Após criar o dono, associa animais em{" "}
            <Link to="/animais" style={{ color: "#5a5a40", fontWeight: 600 }}>Animais</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
