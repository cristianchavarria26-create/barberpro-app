"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminState, signIn, type Panel } from "./api";
import AuthForm from "./auth-form";
import Dashboard, { type AdminData } from "./dashboard";

type View = { state: "loading" | "error" } | Panel<AdminData>;

const EXPIRED = "Tu sesión terminó. Ingresa de nuevo para seguir.";

export default function AdminApp() {
  const [view, setView] = useState<View>({ state: "loading" });
  const [notice, setNotice] = useState("");

  const load = useCallback(
    () =>
      fetchAdminState<AdminData>()
        .then(({ panel, expired }) => {
          setView(panel);
          if (expired) setNotice(EXPIRED);
        })
        .catch(() => setView({ state: "error" })),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Returns the message to show when signing in fails, or null once the panel is open. */
  async function submit(mode: "setup" | "login", email: string, password: string) {
    const result = await signIn<AdminData>(mode, email, password);
    if (result.ok) {
      setNotice("");
      setView(result.panel);
      return null;
    }
    // If the account was created in the meantime, this switches the form to "sign in".
    if (mode === "setup") void load();
    return result.error;
  }

  if (view.state === "ready") {
    return <Dashboard data={view.data} onReload={load} onExpired={() => { setNotice(EXPIRED); setView({ state: "login" }); }} />;
  }
  if (view.state === "setup" || view.state === "login") {
    return <AuthForm mode={view.state} notice={notice} onSubmit={submit} />;
  }

  return (
    <main className="auth-page">
      <div className="auth-card admin-loading" role="status">
        {view.state === "loading" ? (
          <p>Cargando el panel…</p>
        ) : (
          <>
            <p>No pudimos cargar el panel. Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="admin-btn primary" onClick={() => { setView({ state: "loading" }); void load(); }}>Reintentar</button>
          </>
        )}
      </div>
    </main>
  );
}
