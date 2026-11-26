
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, businesses } from "@/db/schema";
import {
  isBlocked,
  isDateInRange,
  isEmail,
  isPastTime,
  isValidTime,
  overlaps,
  timeSlots,
  weekday,
} from "@/lib/booking";
import { getBlocks, getSiteData } from "@/lib/data";
import {
  notifyBarber,
  notifyCustomer,
  type Booking,
  type Notice,
} from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Revisa los datos de tu reserva." },
      { status: 400 }
    );
  }

  const slug =
    typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

  const date = typeof body.date === "string" ? body.date : "";
  const time = isValidTime(body.time) ? body.time : "";
  const name =
    typeof body.name === "string"
      ? body.name.replace(/\s+/g, " ").trim()
      : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return Response.json(
      { error: "No encontramos esta barbería." },
      { status: 404 }
    );
  }

  try {
    const [business] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.slug, slug), eq(businesses.active, true)))
      .limit(1);

    if (!business) {
      return Response.json(
        { error: "Esta barbería no está disponible." },
        { status: 404 }
      );
    }

    const site = await getSiteData(business.id);

    const service = site.services.find(
      (item) => item.id === Number(body.serviceId)
    );

    const candidates =
      body.barberId === "any"
        ? site.barbers
        : site.barbers.filter(
            (item) => item.id === Number(body.barberId)
          );

    const day = isDateInRange(date)
      ? site.settings.schedule[weekday(date)]
      : undefined;

    if (
      !service ||
      !candidates.length ||
      !day?.open ||
      !time ||
      !timeSlots(day, service.duration).includes(time) ||
      isPastTime(date, time) ||
      name.length < 2 ||
      name.length > 100 ||
      phone.length > 30 ||
      phoneDigits.length < 8 ||
      phoneDigits.length > 15 ||
      (email !== "" && !isEmail(email))
    ) {
      return Response.json(
        {
          error:
            "Revisa tu fecha, horario y datos de contacto antes de continuar.",
        },
        { status: 400 }
      );
    }

    // El abono solo se exige si el dueño de esta barbería lo activó.
    const deposit = site.settings.requireDeposit
      ? site.settings.depositAmount
      : 0;

    if (deposit > 0 && body.acceptDeposit !== true) {
      return Response.json(
        { error: "Para reservar debes aceptar el abono." },
        { status: 400 }
      );
    }

    const token =
      deposit > 0 ? randomBytes(24).toString("hex") : null;

    const blocked = await getBlocks(business.id, date, date);

    const created = await db.transaction(async (tx) => {
      for (const barber of candidates) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`${business.id}:${date}:${barber.id}`}))`
        );
      }

      const booked = await tx
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
            ne(appointments.status, "cancelled")
          )
        );

      const barber = candidates.find(
        (candidate) =>
          !isBlocked(blocked, candidate.id, date, time, service.duration) &&
          !booked.some(
            (item) =>
              item.barberId === candidate.id &&
              overlaps(time, service.duration, item.time, item.duration)
          )
      );

      if (!barber) return null;

      const [appointment] = await tx
        .insert(appointments)
        .values({
          businessId: business.id,
          serviceId: service.id,
          serviceName: service.name,
          barberId: barber.id,
          barberName: barber.name,
          appointmentDate: date,
          appointmentTime: time,
          duration: service.duration,
          price: service.price,
          depositAmount: deposit,
          receiptTokenHash: token
            ? createHash("sha256").update(token).digest("hex")
            : null,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
        })
        .returning({ id: appointments.id });

      return {
        id: appointment.id,
        barber: barber.name,
        barberId: barber.id,
      };
    });

    if (!created) {
      return Response.json(
        {
          error:
            "Esta hora acaba de ocuparse. Elige otra disponible.",
        },
        { status: 409 }
      );
    }

    const [barber] = await db
      .select({
        account: barbers.paymentInstructions,
        email: barbers.email,
      })
      .from(barbers)
      .where(
        and(
          eq(barbers.id, created.barberId),
          eq(barbers.businessId, business.id)
        )
      )
      .limit(1);

    const own = barber?.account?.trim() ?? "";
    const instructions =
      deposit > 0
        ? own || site.settings.paymentInstructions.trim()
        : "";

    const booking: Booking = {
      id: created.id,
      service: service.name,
      barber: created.barber,
      date,
      time,
      price: service.price,
      deposit,
      customerName: name,
      customerPhone: phone,
      customerEmail: email || null,
      instructions,
    };

    const shop = {
      brand: `${site.texts.brandName.replace(/\.$/, "")} ${site.texts.brandTagline}`.trim(),
      address: `${site.settings.address}, ${site.settings.commune}, ${site.settings.city}`,
      phone: site.settings.phone,
    };

    after(async () => {
      try {
        const notices: {
          customerNotice: Notice;
          barberNotice?: Notice;
        } = {
          customerNotice: await notifyCustomer(booking, shop),
        };

        if (deposit === 0) {
          notices.barberNotice = await notifyBarber(
            barber?.email ?? "",
            booking,
            shop
          );
        }

        await db
          .update(appointments)
          .set(notices)
          .where(
            and(
              eq(appointments.id, created.id),
              eq(appointments.businessId, business.id)
            )
          );
      } catch (error) {
        console.error("Reservation notice error:", error);
      }
    });

    return Response.json(
      {
        id: created.id,
        barber: created.barber,
        service: service.name,
        date,
        time,
        duration: service.duration,
        price: service.price,
        deposit,
        token,
        instructions,
        paidToBarber: deposit > 0 && own !== "",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Appointment error:", error);

    return Response.json(
      {
        error: "No pudimos guardar tu reserva. Inténtalo de nuevo.",
      },
      { status: 503 }
    );
  }
    }

