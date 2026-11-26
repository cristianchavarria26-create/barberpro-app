export type DaySchedule = {
  open: boolean;
  start: string;
  end: string;
};

export type ServiceItem = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export type BarberItem = {
  id: number;
  name: string;
  role: string;
  photo: string;
};

export type SiteSettings = {
  address: string;
  commune: string;
  city: string;
  phone: string;
  email: string;
  schedule: DaySchedule[];

  // Configuración del abono de cada barbería.
  requireDeposit: boolean;
  depositAmount: number;

  paymentInstructions: string;
  heroImage: string;
  aboutImage: string;
  visitImage: string;
  texts: Record<string, string>;
  theme: Record<string, unknown>;
};

// Índice 0 = domingo, compatible con Date#getUTCDay.
export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_SCHEDULE: DaySchedule[] = DAY_NAMES.map(
  (_, day) => ({
    open: day !== 0,
    start: "10:00",
    end: "19:00",
  })
);

export const DEFAULT_PHOTOS = {
  heroImage: "/images/barber-hero.jpg",
  aboutImage: "/images/barber-action.jpg",
  visitImage: "/images/barbershop.jpg",
} as const;

export function formatPrice(price: number) {
  return `$${price.toLocaleString("es-CL")}`;
}

export function isValidTime(time: unknown): time is string {
  return (
    typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
}

function chileNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes:
      Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function todayInChile() {
  return chileNow().date;
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T12:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function isDateInRange(date: string) {
  if (!isValidDate(date)) return false;

  const today = todayInChile();

  return date >= today && date <= addDays(today, 90);
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isPastTime(date: string, time: string) {
  const now = chileNow();

  if (date < now.date) return true;
  if (date !== now.date) return false;

  return timeToMinutes(time) <= now.minutes;
}

export function timeSlots(
  day: DaySchedule | undefined,
  duration: number
) {
  const slots: string[] = [];

  if (!day?.open) return slots;

  const end = timeToMinutes(day.end);

  for (
    let minutes = timeToMinutes(day.start);
    minutes + duration <= end;
    minutes += 30
  ) {
    slots.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
        minutes % 60
      ).padStart(2, "0")}`
    );
  }

  return slots;
}

export function nextBookableDate(
  schedule: DaySchedule[],
  isClosed: (date: string) => boolean = () => false
) {
  const now = chileNow();
  let date = now.date;

  for (let i = 0; i < 60; i += 1) {
    const day = schedule[weekday(date)];

    if (
      day?.open &&
      !isClosed(date) &&
      (date !== now.date ||
        now.minutes < timeToMinutes(day.end) - 30)
    ) {
      return date;
    }

    date = addDays(date, 1);
  }

  return now.date;
}

export function overlaps(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number
) {
  const a = timeToMinutes(startA);
  const b = timeToMinutes(startB);

  return a < b + durationB && b < a + durationA;
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  }
) {
  if (!isValidDate(date)) return "Selecciona una fecha";

  return new Intl.DateTimeFormat("es-CL", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Agrupa días consecutivos con el mismo horario. */
export function scheduleSummary(schedule: DaySchedule[]) {
  const key = (day?: DaySchedule) =>
    day?.open ? `${day.start}-${day.end}` : "closed";

  const lines: string[] = [];
  let i = 0;

  while (i < WEEK_ORDER.length) {
    const first = schedule[WEEK_ORDER[i]];
    let j = i;

    while (
      j + 1 < WEEK_ORDER.length &&
      key(schedule[WEEK_ORDER[j + 1]]) === key(first)
    ) {
      j += 1;
    }

    const label =
      i === j
        ? DAY_NAMES[WEEK_ORDER[i]]
        : `${DAY_NAMES[WEEK_ORDER[i]]} a ${DAY_NAMES[
            WEEK_ORDER[j]
          ].toLowerCase()}`;

    lines.push(
      first?.open
        ? `${label}: ${first.start} — ${first.end}`
        : `${label}: cerrado`
    );

    i = j + 1;
  }

  return lines;
}

/** Valida una dirección de correo. */
export function isEmail(value: string) {
  return (
    value.length <= 160 &&
    /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/.test(
      value
    )
  );
}

/** Convierte números móviles chilenos a formato internacional. */
export function toMobile(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (phone.trim().startsWith("+")) {
    return digits.length >= 10 && digits.length <= 15
      ? `+${digits}`
      : null;
  }

  if (digits.length === 11 && digits.startsWith("569")) {
    return `+${digits}`;
  }

  if (digits.length === 9 && digits.startsWith("9")) {
    return `+56${digits}`;
  }

  return null;
}

/** Bloqueo de un barbero o de toda la barbería. */
export type BlockItem = {
  barberId: number | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
};

/** Comprueba si un bloqueo impide realizar una reserva. */
export function isBlocked(
  blocks: BlockItem[],
  barberId: number,
  date: string,
  time: string,
  duration: number
) {
  const start = timeToMinutes(time);

  return blocks.some(
    (block) =>
      (block.barberId === null ||
        block.barberId === barberId) &&
      block.startDate <= date &&
      date <= block.endDate &&
      (!block.startTime ||
        !block.endTime ||
        (start < timeToMinutes(block.endTime) &&
          timeToMinutes(block.startTime) < start + duration))
  );
    }
    
