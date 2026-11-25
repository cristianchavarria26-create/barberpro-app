// Remembers, on the customer's own device, a reservation whose deposit receipt has not been uploaded
// yet. If they leave to make the transfer and come back, the site offers to upload it.

export type Confirmation = {
  id: number;
  barber: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  deposit: number;
  /** Proves this browser made the reservation; needed to attach the receipt. */
  token: string | null;
  /** Where to transfer the deposit: the barber's own account, or the shop's general one. */
  instructions: string;
  paidToBarber: boolean;
};
export type Pending = { confirmation: Confirmation; name: string };

const KEY = "reserva_abono_pendiente";
const CHANGED = "reserva-abono-pendiente";

export function readPending(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null; // Storage is blocked: nothing is remembered, the upload still works while the page is open.
  }
}

export function savePending(pending: Pending | null) {
  try {
    if (pending) window.localStorage.setItem(KEY, JSON.stringify(pending));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage is blocked: see readPending.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function subscribePending(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** Reads the remembered reservation, ignoring anything malformed or already in the past. */
export function parsePending(raw: string | null, today: string): Pending | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const c = value?.confirmation;
    if (!c || !Number.isInteger(c.id) || typeof c.token !== "string" || typeof c.date !== "string" || c.date < today) return null;
    if (!(Number(c.deposit) > 0)) return null;
    return {
      name: typeof value.name === "string" ? value.name : "",
      confirmation: {
        id: c.id,
        barber: String(c.barber ?? ""),
        service: String(c.service ?? ""),
        date: c.date,
        time: String(c.time ?? ""),
        duration: Number(c.duration) || 0,
        price: Number(c.price) || 0,
        deposit: Number(c.deposit),
        token: c.token,
        instructions: String(c.instructions ?? ""),
        paidToBarber: c.paidToBarber === true,
      },
    };
  } catch {
    return null;
  }
}
