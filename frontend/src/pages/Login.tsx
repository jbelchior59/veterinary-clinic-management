import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/apiClient";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("O email é obrigatório.");
      return;
    }

    if (!password.trim()) {
      setError("A password é obrigatória.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const token =
        res.data?.access_token ??
        res.data?.token ??
        res.data?.accessToken;

      if (!token) {
        throw new Error("Token não recebido do servidor.");
      }

      localStorage.setItem("token", token);

      navigate("/", { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as any;
        const message = data?.message ?? data?.error;

        if (Array.isArray(message)) {
          setError(message.join(", "));
        } else if (typeof message === "string") {
          setError(message);
        } else if (err.response?.status === 401) {
          setError("Credenciais inválidas.");
        } else {
          setError("Não foi possível iniciar sessão.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro inesperado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "#f6f7fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e6e6e6",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Login</h1>
        <p style={{ marginTop: 0, color: "#666", marginBottom: 20 }}>
          Inicia sessão para aceder à aplicação.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e7a5a5",
              background: "#fff5f5",
              color: "#7a1f1f",
            }}
          >
            <strong>Erro:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Email
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Password
            <input
              type="password"
              placeholder="Introduz a tua password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            style={{
              padding: 12,
              border: "none",
              borderRadius: 10,
              background: "#1f6feb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {submitting ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}