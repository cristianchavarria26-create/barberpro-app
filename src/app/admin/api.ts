// Browser helpers for the admin panel. The session token is sent inside every request body: not in a
// cookie and not in a header, because proxies and embedded previews can drop both on the way.

const KEY = "barrio_admin_session";
let memory = "";

export type Result = { ok: true } | { ok: false; error: string; expired?: boolean };
export type Panel<Data> = { state: "setup" | "login" } | { state: "ready"; data: Data };

type Fields = Record<string, unknown>;
type Parsed = { ok: true; data: Fields } | { ok: false; error: string; expired?: boolean };

export function getToken() {
  if (!memory) {
    try {
      memory = window.localStorage.getItem(KEY) ?? "";
    } catch {
      // Storage is blocked (for example inside an embedded preview): the session lives in memory only.
    }
  }
  return memory;
}

export function setToken(token: string) {
  memory = token;
  try {
    if (token) window.localStorage.setItem(KEY, token);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage is blocked: the session still works until the page is reloaded.
  }
}

/** Sends one request to the panel endpoint. Never throws: every failure becomes a message to show. */
async function post(action: string, payload: Fields): Promise<Parsed> {
  let response: Response;
  try {
    response = await fetch("/api/admin", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action, token: getToken() }),
    });
  } catch {
    return { ok: false, error: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo." };
  }
  const data: Fields | null = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || typeof data.ok !== "boolean") {
    return { ok: false, error: `El servidor respondió con un error (código ${response.status}). Inténtalo de nuevo en un momento.` };
  }
  if (!data.ok) {
    return { ok: false, error: String(data.error || "No pudimos completar la acción."), expired: response.status === 401 };
  }
  return { ok: true, data };
}

function toPanel<Data>(data: Fields): Panel<Data> | null {
  if (data.state === "ready") return { state: "ready", data: data as Data };
  if (data.state === "login" || data.state === "setup") return { state: data.state };
  return null;
}

/** Runs one admin action, such as saving a service. */
export async function adminCall(action: string, payload: Fields = {}): Promise<Result> {
  const result = await post(action, payload);
  if (result.ok) return { ok: true };
  if (result.expired) setToken("");
  return result;
}

/** Creates the first account or signs in. On success the answer already contains the panel. */
export async function signIn<Data>(mode: "setup" | "login", email: string, password: string): Promise<{ ok: true; panel: Panel<Data> } | { ok: false; error: string }> {
  const result = await post(mode, { email, password });
  if (!result.ok) return result;
  const panel = toPanel<Data>(result.data);
  if (typeof result.data.token !== "string" || panel?.state !== "ready") {
    return { ok: false, error: "Tus datos son correctos, pero el servidor no devolvió el panel. Inténtalo de nuevo." };
  }
  setToken(result.data.token);
  return { ok: true, panel };
}

/** Asks what the panel should show right now. `expired` means a saved session was no longer accepted. */
export async function fetchAdminState<Data>(): Promise<{ panel: Panel<Data>; expired: boolean }> {
  const hadSession = Boolean(getToken());
  const result = await post("state", {});
  const panel = result.ok ? toPanel<Data>(result.data) : null;
  if (!panel) throw new Error(result.ok ? "Unexpected panel state" : result.error);
  if (panel.state !== "ready") setToken("");
  return { panel, expired: hadSession && panel.state === "login" };
}

/** Asks the server for figures or lists that are not part of the panel's main data, such as the month's statistics. */
export async function adminQuery<Data>(action: string, payload: Fields = {}): Promise<{ ok: true; data: Data } | { ok: false; error: string; expired?: boolean }> {
  const result = await post(action, payload);
  if (!result.ok) {
    if (result.expired) setToken("");
    return result;
  }
  return { ok: true, data: result.data as Data };
}
