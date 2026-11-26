
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, businesses } from "@/db/schema";
import {
  isBlocked,
  isDateInRange,
  isPastTime,
  overlaps,
  timeSlots,
  weekday,
} from "@/lib/booking";
import { getBlocks, getSiteData } from "@/lib/data";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const slug = params.get("slug") ?? "";
  const date = params.get("date") ?? "";
  const barberParam = params.get("barber") ?? "any";
  const serviceId = Number(params.get("service"));

  try {
    // Identificar la barbería mediante su URL pública.
    if (!slug) {
      return json({ error: "No se identificó la barbería." }, 400);
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.slug, slug), eq(businesses.active, true)))
      .limit(1);

    if (!business) {
      return json({ error: "La barbería no existe o no está disponible." }, 404);
    }

    // Obtener solamente los servicios y barberos de esta barbería.
    const site = await getSiteData(business.id);

    const service = site.services.find((item) => item.id === serviceId);

    const candidates =
      barberParam === "any"
        ? site.barbers
        : site.barbers.filter((item) => item.id === Number(barberParam));

    if (
      !service ||
      !candidates.length ||
      !isDateInRange(date)
    ) {
      return json(
        { error: "Selecciona un servicio, barbero y fecha válidos." },
        400,
      );
    }

    const day = site.settings.schedule[weekday(date)];

    if (!day?.open) {
      return json({ slots: [], closed: true });
    }

    // Consultar reservas y bloqueos exclusivamente de esta barbería.
    const [booked, blocked] = await Promise.all([
      db
        .select({
          barberId: appointments.barberId,
          time: appointments.appointmentTime,
          duration: appointments.duration,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.businessId, business.id),
            eq(appointments.appointmentDate, date),
            ne(appointments.status, "cancelled"),
          ),
        ),

      getBlocks(business.id, date, date),
    ]);

    // Si toda la barbería está cerrada durante el día.
    const awayAllDay = (barberId: number | null) =>
      blocked.some(
        (block) => block.barberId === barberId && !block.startTime,
      );

    if (awayAllDay(null)) {
      return json({ slots: [], closed: true });
    }

    // Excluir barberos que tengan el día completo bloqueado.
    const working = candidates.filter(
      (barber) => !awayAllDay(barber.id),
    );

    if (!working.length) {
      return json({ slots: [], closed: false });
    }

    const slots = timeSlots(day, service.duration).map((time) => ({
      time,
      available:
        !isPastTime(date, time) &&
        working.some(
          (barber) =>
            !isBlocked(blocked, barber.id, date, time, service.duration) &&
            !booked.some(
              (item) =>
                item.barberId === barber.id &&
                overlaps(
                  time,
                  service.duration,
                  item.time,
                  item.duration,
                ),
            ),
        ),
    }));

    return json({ slots, closed: false });
  } catch (error) {
    console.error("Availability error:", error);

    return json(
      {
        error: "No pudimos consultar los horarios. Inténtalo de nuevo.",
      },
      503,
    );
  }
}


    
