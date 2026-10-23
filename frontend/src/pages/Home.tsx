import { Link, useNavigate } from "react-router-dom";

const styles = {
  page: {
    padding: 24,
    maxWidth: 960,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
    marginBottom: 24,
  },
  subtitle: {
    margin: 0,
    color: "#666",
    fontSize: "18px",
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    marginTop: 24,
  },
  primaryButton: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 10,
    backgroundColor: "#1f6feb",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(31, 111, 235, 0.18)",
  },
  secondaryButton: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    color: "#111",
    textDecoration: "none",
    fontWeight: 600,
    border: "1px solid #d1d5db",
    cursor: "pointer",
  },
};

export default function Home() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={{ marginBottom: 8 }}>VetLab</h1>
          <p style={styles.subtitle}>Área principal da interface.</p>
        </div>

        <button onClick={handleLogout} style={styles.secondaryButton}>
          Terminar sessão
        </button>
      </div>

      <div style={styles.actions}>
        <Link to="/donos" style={styles.primaryButton}>
          Gestão de Donos
        </Link>

        <Link to="/animais" style={styles.primaryButton}>
          Gestão de Animais
        </Link>

        <Link to="/marcacoes" style={styles.primaryButton}>
          📅 Marcações Ativas
        </Link>
      </div>
    </div>
  );
}