import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAnimal,
  deleteAnimal,
  formatAxiosError,
  getAnimais,
  updateAnimal,
  type Animal,
} from "../lib/animais";
import { getDonos, type Dono } from "../lib/donos";

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
  historyLink: { padding: "6px 10px", borderRadius: 8, backgroundColor: "#eff6ff", color: "#1d4ed8", textDecoration: "none", fontWeight: 600, border: "1px solid #bfdbfe", fontSize: 12 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", borderBottom: "2px solid #e5e7eb", fontSize: 13, fontWeight: 700, color: "#374151" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 14, verticalAlign: "middle" as const },
  input: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" as const },
  editInput: { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #93c5fd", fontSize: 13, boxSizing: "border-box" as const },
  select: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" as const },
  label: { display: "grid", gap: 5, fontSize: 14, fontWeight: 600, color: "#374151" } as React.CSSProperties,
  alertError: { padding: 12, borderRadius: 10, border: "1px solid #fca5a5", background: "#fff5f5", color: "#7a1f1f", marginBottom: 16, fontSize: 14 } as React.CSSProperties,
  alertSuccess: { padding: 12, borderRadius: 10, border: "1px solid #86efac", background: "#f0fff4", color: "#166534", marginBottom: 16, fontSize: 14 } as React.CSSProperties,
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: "#f3f4f6", color: "#374151", marginLeft: 8 } as React.CSSProperties,
  empty: { padding: "40px 24px", textAlign: "center" as const, color: "#9ca3af", fontSize: 14, border: "2px dashed #e5e7eb", borderRadius: 12 } as React.CSSProperties,
};

type EditState = { nome: string; especie: string; raca: string; genero: string; donoId: string };

export default function Animais() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [donos, setDonos] = useState<Dono[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDonos, setLoadingDonos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ nome: "", especie: "", raca: "", genero: "", donoId: "" });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [especie, setEspecie] = useState("");
  const [donoId, setDonoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => nome.trim().length > 0 && especie.trim().length > 0 && Number(donoId) > 0 && !submitting, [nome, especie, donoId, submitting]);

  async function loadAnimais() {
    setLoading(true); setError(null);
    try { setAnimais(await getAnimais()); }
    catch (e) { setError(formatAxiosError(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void loadAnimais();
    setLoadingDonos(true);
    getDonos().then(setDonos).catch((e) => setError(formatAxiosError(e))).finally(() => setLoadingDonos(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!nome.trim()) { setError("O nome é obrigatório."); return; }
    if (!especie.trim()) { setError("A espécie é obrigatória."); return; }
    if (!donoId || Number(donoId) <= 0) { setError("Seleciona um dono."); return; }
    setSubmitting(true);
    try {
      await createAnimal({ nome: nome.trim(), especie: especie.trim(), donoId: Number(donoId) });
      setSuccess("Animal criado com sucesso."); setNome(""); setEspecie(""); setDonoId("");
      await loadAnimais();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setSubmitting(false); }
  }

  function startEdit(animal: Animal) {
    setEditingId(animal.id);
    setEditState({ nome: animal.nome, especie: animal.especie, raca: animal.raca ?? "", genero: animal.genero ?? "", donoId: String(animal.donoId) });
  }
  function cancelEdit() { setEditingId(null); }

  async function saveEdit(id: number) {
    setError(null); setSuccess(null);
    if (!editState.nome.trim()) { setError("O nome não pode estar vazio."); return; }
    if (!editState.especie.trim()) { setError("A espécie não pode estar vazia."); return; }
    setSavingId(id);
    try {
      await updateAnimal(id, {
        nome: editState.nome.trim(),
        especie: editState.especie.trim(),
        raca: editState.raca.trim() || undefined,
        genero: editState.genero || undefined,
        donoId: Number(editState.donoId) || undefined,
      });
      setSuccess("Animal atualizado com sucesso."); setEditingId(null);
      await loadAnimais();
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setSavingId(null); }
  }

  async function removeAnimal(id: number, nomeAnimal: string) {
    if (!window.confirm(`Remover o animal "${nomeAnimal}"? Esta ação é irreversível.`)) return;
    setError(null); setSuccess(null); setDeletingId(id);
    try {
      await deleteAnimal(id);
      setSuccess("Animal removido com sucesso.");
      setAnimais((prev) => prev.filter((a) => a.id !== id));
    } catch (e) { setError(formatAxiosError(e)); }
    finally { setDeletingId(null); }
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h1 style={s.title}>🐾 Gestão de Animais</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/donos" style={s.backLink}>👤 Donos</Link>
          <Link to="/" style={s.backLink}>← Voltar</Link>
        </div>
      </div>
      {error && <div style={s.alertError} role="alert"><strong>Erro: </strong>{error}</div>}
      {success && <div style={s.alertSuccess} role="status">{success}</div>}

      <div style={s.grid}>
        <section style={s.card}>
          <div style={s.sectionHeader}>
            <h2 style={s.h2}>Animais<span style={s.badge}>{animais.length}</span></h2>
            <button onClick={() => void loadAnimais()} disabled={loading} style={s.ghostBtn}>{loading ? "A carregar..." : "↻ Recarregar"}</button>
          </div>
          {loading ? (
            <p style={{ color: "#9ca3af" }}>A carregar...</p>
          ) : animais.length === 0 ? (
            <div style={s.empty}>Sem animais registados. Cria o primeiro →</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Espécie</th>
                    <th style={s.th}>Raça</th>
                    <th style={s.th}>Dono</th>
                    <th style={{ ...s.th, width: 220 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {animais.map((animal) => editingId === animal.id ? (
                    <tr key={animal.id} style={{ background: "#f0f9ff" }}>
                      <td style={s.td}><input style={s.editInput} value={editState.nome} onChange={(e) => setEditState((p) => ({ ...p, nome: e.target.value }))} /></td>
                      <td style={s.td}><input style={s.editInput} value={editState.especie} onChange={(e) => setEditState((p) => ({ ...p, especie: e.target.value }))} /></td>
                      <td style={s.td}><input style={s.editInput} value={editState.raca} onChange={(e) => setEditState((p) => ({ ...p, raca: e.target.value }))} placeholder="Raça" /></td>
                      <td style={s.td}>
                        <select style={{ ...s.editInput }} value={editState.donoId} onChange={(e) => setEditState((p) => ({ ...p, donoId: e.target.value }))}>
                          <option value="">Seleciona dono</option>
                          {donos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => void saveEdit(animal.id)} disabled={savingId === animal.id} style={s.successBtn}>{savingId === animal.id ? "..." : "✓ Guardar"}</button>
                          <button onClick={cancelEdit} style={s.ghostBtn}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={animal.id}>
                      <td style={s.td}><strong>{animal.nome}</strong></td>
                      <td style={s.td}>{animal.especie}</td>
                      <td style={{ ...s.td, color: "#6b7280" }}>{animal.raca || "—"}</td>
                      <td style={s.td}>{animal.dono?.nome ?? `#${animal.donoId}`}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Link to={`/animais/${animal.id}/historico`} style={s.historyLink}>📋 Histórico</Link>
                          <button onClick={() => startEdit(animal)} style={s.ghostBtn}>✎</button>
                          <button onClick={() => void removeAnimal(animal.id, animal.nome)} disabled={deletingId === animal.id} style={s.dangerBtn}>{deletingId === animal.id ? "..." : "🗑"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={s.card}>
          <h2 style={{ ...s.h2, marginBottom: 16 }}>Criar Animal</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={s.label}>Nome *<input style={s.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do animal" /></label>
            <label style={s.label}>Espécie *<input style={s.input} value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Ex: cão, gato" /></label>
            <label style={s.label}>
              Dono *
              <select style={s.select} value={donoId} onChange={(e) => setDonoId(e.target.value)} disabled={loadingDonos}>
                <option value="">{loadingDonos ? "A carregar..." : "Seleciona um dono"}</option>
                {donos.map((d) => <option key={d.id} value={d.id}>{d.nome} ({d.email})</option>)}
              </select>
            </label>
            <button type="submit" disabled={!canSubmit} style={{ ...s.primaryBtn, marginTop: 4 }}>{submitting ? "A criar..." : "+ Criar Animal"}</button>
          </form>
          {donos.length === 0 && !loadingDonos && (
            <p style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>
              ⚠ Não existem donos. <Link to="/donos" style={{ color: "#5a5a40", fontWeight: 600 }}>Cria um dono primeiro</Link>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
