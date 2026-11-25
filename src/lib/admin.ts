import { and, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, appointments, barbers, blocks, images, reviews, services, settings } from "@/db/schema";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { DEFAULT_PHOTOS, addDays, isEmail, isValidDate, isValidTime, timeToMinutes, todayInChile, type DaySchedule } from "@/lib/booking";
import { editedTexts } from "@/lib/texts";
import { resolveTheme } from "@/lib/theme";

export type Result = { ok: true; token?: string } | { ok: false; error: string };

const OK: Result = { ok: true };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPLOADED = /^\/api\/images\/(\d+)$/;
const BUNDLED = /^\/images\/[\w.-]+$/;

// The API route checks the session; every function here validates its own input.
const fail = (error: string): Result => ({ ok: false, error });
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const toId = (value: unknown) => (Number.isInteger(value) && (value as number) > 0 ? (value as number) : null);

async function removeUploaded(url: string) {
  const match = UPLOADED.exec(url);
  // Only site photos can be removed this way; payment receipts belong to their reservation.
  if (match) await db.delete(images).where(and(eq(images.id, Number(match[1])), eq(images.private, false)));
}

// Slows down password guessing: five misses lock that email for fifteen minutes.
const attempts = new Map<string, { count: number; until: number }>();
const LOCK_MS = 15 * 60 * 1000;

export async function setupAdmin(emailInput: string, password: string): Promise<Result> {
  const email = text(emailInput, 160).toLowerCase();
  if (!EMAIL.test(email)) return fail("Ingresa un correo válido.");
  if (typeof password !== "string" || password.length < 8 || password.length > 200) {
    return fail("La contraseña debe tener al menos 8 caracteres.");
  }
  const userId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('admin-setup'))`);
    const [existing] = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1);
    if (existing) return null;
    const [created] = await tx.insert(adminUsers).values({ email, passwordHash: hashPassword(password) }).returning({ id: adminUsers.id });
    return created.id;
  });
  if (!userId) return fail("Ya existe una cuenta de administración. Inicia sesión.");
  return { ok: true, token: await createSession(userId) };
}

export async function login(emailInput: string, password: string): Promise<Result> {
  const email = text(emailInput, 160).toLowerCase();
  const now = Date.now();
  const entry = attempts.get(email);
  if (entry && entry.count >= 5 && entry.until > now) {
    return fail("Demasiados intentos. Espera 15 minutos y vuelve a probar.");
  }
  const [user] = email ? await db.select().from(adminUsers).where(eq(adminUsers.email, email)) : [];
  if (!user || typeof password !== "string" || !verifyPassword(password, user.passwordHash)) {
    if (attempts.size > 5000) attempts.clear();
    attempts.set(email, { count: entry && entry.until > now ? entry.count + 1 : 1, until: now + LOCK_MS });
    return fail("Correo o contraseña incorrectos.");
  }
  attempts.delete(email);
  return { ok: true, token: await createSession(user.id) };
}

export async function saveService(input: { id?: number; name: string; description: string; duration: number; price: number; active: boolean }): Promise<Result> {
  const name = text(input?.name, 80);
  const description = text(input?.description, 200);
  const { duration, price } = input ?? {};
  if (name.length < 2) return fail("Escribe el nombre del servicio.");
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) return fail("La duración debe estar entre 10 y 240 minutos.");
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000) return fail("Ingresa un precio válido, sin puntos ni decimales.");
  const values = { name, description, duration, price, active: input.active !== false };

  if (input.id === undefined) {
    await db.insert(services).values(values);
    return OK;
  }
  const id = toId(input.id);
  const updated = id ? await db.update(services).set(values).where(eq(services.id, id)).returning({ id: services.id }) : [];
  return updated.length ? OK : fail("Ese servicio ya no existe.");
}

export async function deleteService(idInput: number): Promise<Result> {
  const id = toId(idInput);
  if (!id) return fail("Ese servicio ya no existe.");
  // Past and upcoming reservations keep their own copy of the service name and price.
  await db.delete(services).where(eq(services.id, id));
  return OK;
}

export async function saveBarber(input: { id?: number; name: string; role: string; photo: string; paymentInstructions?: string; email?: string; active: boolean }): Promise<Result> {
  const name = text(input?.name, 100);
  const role = text(input?.role, 80);
  const photo = text(input?.photo, 255);
  const paymentInstructions = text(input?.paymentInstructions, 1000);
  const email = text(input?.email, 160).toLowerCase();
  if (name.length < 2) return fail("Escribe el nombre del barbero.");
  if (photo && !UPLOADED.test(photo) && !BUNDLED.test(photo)) return fail("La foto no es válida. Vuelve a subirla.");
  if (email && !isEmail(email)) return fail("El correo del barbero no es válido.");
  const values = { name, role, photo, paymentInstructions, email, active: input.active !== false };

  if (input.id === undefined) {
    await db.insert(barbers).values(values);
    return OK;
  }
  const id = toId(input.id);
  const [previous] = id ? await db.select({ photo: barbers.photo }).from(barbers).where(eq(barbers.id, id)) : [];
  if (!id || !previous) return fail("Ese barbero ya no existe.");
  await db.update(barbers).set(values).where(eq(barbers.id, id));
  if (previous.photo !== photo) await removeUploaded(previous.photo);
  return OK;
}

export async function deleteBarber(idInput: number): Promise<Result> {
  const id = toId(idInput);
  if (!id) return fail("Ese barbero ya no existe.");
  const [upcoming] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(and(eq(appointments.barberId, id), gte(appointments.appointmentDate, todayInChile()), ne(appointments.status, "cancelled")));
  if (upcoming.count > 0) {
    const blocking = upcoming.count === 1 ? "Tiene 1 reserva próxima. Cancélala primero" : `Tiene ${upcoming.count} reservas próximas. Cancélalas primero`;
    return fail(`${blocking}, o desmarca "Visible en el sitio" para que no reciba más.`);
  }
  const [removed] = await db.delete(barbers).where(eq(barbers.id, id)).returning({ photo: barbers.photo });
  if (removed) await removeUploaded(removed.photo);
  return OK;
}

export async function saveSettings(input: { address: string; commune: string; city: string; phone: string; email: string; depositAmount: number; paymentInstructions: string }): Promise<Result> {
  const address = text(input?.address, 160);
  const commune = text(input?.commune, 80);
  const city = text(input?.city, 80);
  const phone = text(input?.phone, 30);
  const email = text(input?.email, 160);
  const paymentInstructions = text(input?.paymentInstructions, 1000);
  const depositAmount = input?.depositAmount;
  const phoneDigits = phone.replace(/\D/g, "");
  if (address.length < 3 || commune.length < 2 || city.length < 2) return fail("Completa la dirección, la comuna y la ciudad.");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) return fail("Ingresa un teléfono válido.");
  if (!EMAIL.test(email)) return fail("Ingresa un correo de contacto válido.");
  if (!Number.isInteger(depositAmount) || depositAmount < 0 || depositAmount > 1_000_000) return fail("El abono debe ser un monto en pesos, sin puntos ni decimales.");
  await db.update(settings).set({ address, commune, city, phone, email, depositAmount, paymentInstructions }).where(eq(settings.id, 1));
  return OK;
}

export async function saveSchedule(input: DaySchedule[]): Promise<Result> {
  if (!Array.isArray(input) || input.length !== 7) return fail("Revisa los horarios e inténtalo de nuevo.");
  const schedule: DaySchedule[] = [];
  for (const day of input) {
    if (!day || !isValidTime(day.start) || !isValidTime(day.end)) return fail("Revisa las horas de apertura y cierre.");
    const open = day.open === true;
    if (open && timeToMinutes(day.start) >= timeToMinutes(day.end)) return fail("La hora de cierre debe ser posterior a la de apertura.");
    schedule.push({ open, start: day.start, end: day.end });
  }
  await db.update(settings).set({ schedule }).where(eq(settings.id, 1));
  return OK;
}

export async function saveSitePhoto(slot: string, url: string): Promise<Result> {
  if (slot !== "heroImage" && slot !== "aboutImage" && slot !== "visitImage") return fail("Esa foto no existe.");
  // An empty url restores the original photo.
  const next = url ? text(url, 255) : DEFAULT_PHOTOS[slot];
  if (url && !UPLOADED.test(next)) return fail("La foto no es válida. Vuelve a subirla.");
  const [current] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!current) return fail("No encontramos la configuración del sitio.");
  const change = slot === "heroImage" ? { heroImage: next } : slot === "aboutImage" ? { aboutImage: next } : { visitImage: next };
  await db.update(settings).set(change).where(eq(settings.id, 1));
  if (current[slot] !== next) await removeUploaded(current[slot]);
  return OK;
}

export async function setDepositPaid(idInput: number, paid: boolean): Promise<Result> {
  const id = toId(idInput);
  const updated = id ? await db.update(appointments).set({ depositPaid: paid === true }).where(eq(appointments.id, id)).returning({ id: appointments.id }) : [];
  return updated.length ? OK : fail("Esa reserva ya no existe.");
}

export async function cancelAppointment(idInput: number): Promise<Result> {
  const id = toId(idInput);
  const updated = id ? await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, id)).returning({ id: appointments.id }) : [];
  return updated.length ? OK : fail("Esa reserva ya no existe.");
}

export async function saveTexts(input: unknown): Promise<Result> {
  await db.update(settings).set({ texts: editedTexts(input) }).where(eq(settings.id, 1));
  return OK;
}

export async function saveTheme(input: unknown): Promise<Result> {
  // Colours must be real hex colours and fonts must come from the offered list; anything else becomes the original.
  const theme = resolveTheme(input);
  const [current] = await db.select({ theme: settings.theme }).from(settings).where(eq(settings.id, 1));
  if (!current) return fail("No encontramos la configuración del sitio.");
  const previousLogo = resolveTheme(current.theme).logo;
  await db.update(settings).set({ theme }).where(eq(settings.id, 1));
  if (previousLogo && previousLogo !== theme.logo) await removeUploaded(previousLogo);
  return OK;
}

export async function setReviewStatus(idInput: unknown, status: unknown): Promise<Result> {
  const id = toId(idInput);
  if (status !== "shown" && status !== "hidden") return fail("Esa opción no existe.");
  const updated = id ? await db.update(reviews).set({ status }).where(eq(reviews.id, id)).returning({ id: reviews.id }) : [];
  return updated.length ? OK : fail("Esa reseña ya no existe.");
}

export async function deleteReview(idInput: unknown): Promise<Result> {
  const id = toId(idInput);
  if (!id) return fail("Esa reseña ya no existe.");
  await db.delete(reviews).where(eq(reviews.id, id));
  return OK;
}

export async function saveBlock(input: { barberId?: unknown; startDate?: unknown; endDate?: unknown; allDay?: unknown; startTime?: unknown; endTime?: unknown; reason?: unknown }): Promise<Result> {
  const startDate = typeof input?.startDate === "string" ? input.startDate : "";
  const endDate = typeof input?.endDate === "string" ? input.endDate : "";
  const today = todayInChile();
  if (!isValidDate(startDate) || !isValidDate(endDate)) return fail("Elige desde y hasta qué día se bloquea.");
  if (endDate < startDate) return fail("La fecha de término no puede ser anterior a la de inicio.");
  if (endDate < today) return fail("Ese bloqueo ya pasó. Elige fechas desde hoy en adelante.");
  if (endDate > addDays(today, 730)) return fail("El bloqueo no puede extenderse más de dos años.");

  let startTime: string | null = null;
  let endTime: string | null = null;
  if (input.allDay !== true) {
    if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) return fail("Indica desde y hasta qué hora se bloquea.");
    if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) return fail("La hora de término debe ser posterior a la de inicio.");
    startTime = input.startTime;
    endTime = input.endTime;
  }

  // The whole shop is blocked only when that is asked for explicitly, never by leaving the barber out.
  let barberId: number | null = null;
  if (input.barberId !== null) {
    barberId = toId(input.barberId);
    const [barber] = barberId ? await db.select({ id: barbers.id }).from(barbers).where(eq(barbers.id, barberId)) : [];
    if (!barber) return fail("Ese barbero ya no existe.");
  }

  // Reservations already made inside the block are left alone; the panel points them out so the owner can warn those customers.
  await db.insert(blocks).values({ barberId, startDate, endDate, startTime, endTime, reason: text(input.reason, 120) });
  return OK;
}

export async function deleteBlock(idInput: unknown): Promise<Result> {
  const id = toId(idInput);
  if (!id) return fail("Ese bloqueo ya no existe.");
  await db.delete(blocks).where(eq(blocks.id, id));
  return OK;
}
