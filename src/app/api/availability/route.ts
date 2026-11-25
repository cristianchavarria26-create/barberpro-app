import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { isBlocked, isDateInRange, isPastTime, overlaps, timeSlots, weekday } from "@/lib/booking";
import { getBlocks, getSiteData } from "@/lib/data";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const barberParam = params.get("barber") ?? "any";

  try {
    const site = await getSiteData();
    const service = site.services.find((item) => item.id === Number(params.get("service")));
    const candidates = barberParam === "any" ? site.barbers : site.barbers.filter((item) => item.id === Number(barberParam));
    if (!service || !candidates.length || !isDateInRange(date)) {
      return json({ error: "Selecciona un servicio, barbero y fecha válidos." }, 400);
    }

    const day = site.settings.schedule[weekday(date)];
    if (!day?.open) return json({ slots: [], closed: true });

    const [booked, blocked] = await Promise.all([
      db
        .select({ barberId: appointments.barberId, time: appointments.appointmentTime, duration: appointments.duration })
        .from(appointments)
        .where(and(eq(appointments.appointmentDate, date), ne(appointments.status, "cancelled"))),
      // Hours the owner closed by hand in the panel: lunch, an errand, holidays, a day off.
      getBlocks(date, date),
    ]);

    // The whole shop blocked for the whole day works like a closed day.
    const awayAllDay = (barberId: number | null) => blocked.some((block) => block.barberId === barberId && !block.startTime);
    if (awayAllDay(null)) return json({ slots: [], closed: true });
    // If everyone who could take the reservation is away that day, there are simply no hours to offer.
    const working = candidates.filter((barber) => !awayAllDay(barber.id));
    if (!working.length) return json({ slots: [], closed: false });

    const slots = timeSlots(day, service.duration).map((time) => ({
      time,
      available:
        !isPastTime(date, time) &&
        working.some(
          (barber) =>
            !isBlocked(blocked, barber.id, date, time, service.duration) &&
            !booked.some((item) => item.barberId === barber.id && overlaps(time, service.duration, item.time, item.duration)),
        ),
    }));
    return json({ slots, closed: false });
  } catch (error) {
    console.error("Availability error:", error);
    return json({ error: "No pudimos consultar los horarios. Inténtalo de nuevo." }, 503);
  }
}
