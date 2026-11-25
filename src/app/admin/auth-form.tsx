"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

type Mode = "login" | "setup";
type Props = { mode: Mode; notice: string; onSubmit: (mode: Mode, email: string, password: string) => Promise<string | null> };

export default function AuthForm({ mode, notice, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isSetup = mode === "setup";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isSetup && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    startTransition(async () => {
      // On success the panel replaces this form; otherwise there is always a message to show.
      const message = await onSubmit(mode, email, password);
      if (message) setError(message);
    });
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="auth-icon"><Lock size={19} /></span>
        <h1>{isSetup ? "Crea tu acceso" : "Administración"}</h1>
        <p>
          {isSetup
            ? "Todavía no hay una cuenta de administración. Elige el correo y la contraseña con los que vas a entrar al panel."
            : "Ingresa con tu correo y contraseña para gestionar la barbería."}
        </p>
        {notice && !error && <p className="admin-warning" role="status">{notice}</p>}
        <form onSubmit={submit}>
          <label className="admin-field">Correo
            <input type="email" required maxLength={160} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="admin-field">Contraseña
            <input type="password" required minLength={isSetup ? 8 : 1} maxLength={200} autoComplete={isSetup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {isSetup && (
            <label className="admin-field">Repite la contraseña
              <input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-btn primary auth-submit" disabled={pending}>
            {pending ? "Un momento..." : isSetup ? "Crear cuenta y entrar" : "Entrar"}
          </button>
        </form>
        <Link href="/" className="auth-back"><ArrowLeft size={14} /> VOLVER AL SITIO</Link>
      </div>
    </main>
  );
}
