
// Remembers a reservation with a pending deposit receipt on the customer's device.

export type Confirmation = {
  id: number;
  barber: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  deposit: number;
  token: string | null;
  instructions: string;
  paidToBarber: boolean;
};

export type Pending = {
  slug: string;
  confirmation: Confirmation;
  name: string;
};

const KEY = "barberpro_reserva_abono_pendiente";
const CHANGED = "barberpro-reserva-abono-pendiente";

export function readPending(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function savePending(pending: Pending | null) {
  try {
    if (pending) {
      window.localStorage.setItem(KEY, JSON.stringify(pending));
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // Storage may be unavailable in the customer's browser.
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

export function parsePending(
  raw: string | null,
  today: string,
  expectedSlug?: string
): Pending | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw);
    const c = value?.confirmation;

    if (
      !c ||
      !Number.isInteger(c.id) ||
      typeof c.token !== "string" ||
      typeof c.date !== "string" ||
      c.date < today ||
      typeof value.slug !== "string" ||
      !value.slug
    ) {
      return null;
    }

    if (expectedSlug && value.slug !== expectedSlug) {
      return null;
    }

    if (!(Number(c.deposit) > 0)) {
      return null;
    }

    return {
      slug: value.slug,
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
