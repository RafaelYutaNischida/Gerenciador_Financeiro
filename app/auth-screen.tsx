"use client";

import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/client-api";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

export default function AuthScreen({
  initialError,
  onAuthenticated,
}: {
  initialError: string;
  onAuthenticated: (user: AuthenticatedUser) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && !name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest<{ user: AuthenticatedUser }>(
        `/api/auth/${mode}`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(mode === "register" ? { name: name.trim() } : {}),
            email: email.trim(),
            password,
          }),
        },
      );
      await onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível concluir a solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="auth-brand" href="/" aria-label="FinTrack">
          <span className="brand-mark">F</span>
          <span>fintrack<span className="brand-dot">.</span></span>
        </a>
        <p className="eyebrow">SUAS FINANÇAS, COM CLAREZA</p>
        <h1 id="auth-title">
          {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
        </h1>
        <p className="auth-description">
          {mode === "login"
            ? "Entre para acompanhar suas movimentações."
            : "Seus dados financeiros ficam associados à sua conta."}
        </p>

        <form onSubmit={submit} noValidate>
          {mode === "register" && (
            <>
              <label className="field-label" htmlFor="auth-name">Nome</label>
              <input
                id="auth-name"
                className="form-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </>
          )}
          <label className="field-label" htmlFor="auth-email">E-mail</label>
          <input
            id="auth-email"
            className="form-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            autoComplete="email"
          />
          <label className="field-label" htmlFor="auth-password">Senha</label>
          <input
            id="auth-password"
            className="form-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={128}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={submitting}
          >
            {submitting
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}
          {" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </section>
    </main>
  );
}
