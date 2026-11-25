import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers } from "@/db/schema";
import { isBlocked, isDateInRange, isEmail, isPastTime, isValidTime, overlaps, timeSlots, weekday } from "@/lib/booking";
import { getBlocks, getSiteData } from "@/lib/data";
import { notifyBarber, notifyCustomer, type Booking, type Notice } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Revisa los datos de tu reserva." }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  const time = isValidTime(body.time) ? body.time : "";
  // Kept on one line: a name is shown in the panel and used in the messages that go out.
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");

  try {
    const site = await getSiteData();
    const service = site.services.find((item) => item.id === Number(body.serviceId));
    const candidates = body.barberId === "any" ? site.barbers : site.barbers.filter((item) => item.id === Number(body.barberId));
    const day = isDateInRange(date) ? site.settings.schedule[weekday(date)] : undefined;

    if (
      !service || !candidates.length || !day?.open || !time || !timeSlots(day, service.duration).includes(time) || isPastTime(date, time) ||
      name.length < 2 || name.length > 100 || phone.length > 30 || phoneDigits.length < 8 || phoneDigits.length > 15 ||
      (email !== "" && !isEmail(email))
    ) {
      return Response.json({ error: "Revisa tu fecha, horario y datos de contacto antes de continuar." }, { status: 400 });
    }

    // One fixed deposit for every service, set by the owner. It is read here, never taken from the browser.
    const deposit = site.settings.depositAmount;
    if (deposit > 0 && body.acceptDeposit !== true) {
      return Response.json({ error: "Para reservar debes aceptar el abono." }, { status: 400 });
    }

    // Only the browser that makes the reservation receives this token; it is what later lets the
    // customer attach the payment receipt. The database keeps just its hash.
    const token = deposit > 0 ? randomBytes(24).toString("hex") : null;

    // Hours the owner blocked by hand (lunch, an errand, holidays) cannot be taken, whatever the browser sends.
    const blocked = await getBlocks(date, date);

    const created = await db.transaction(async (tx) => {
      // Lock each candidate for this date so overlapping requests cannot both claim a slot.
      for (const barber of candidates) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${date}:${barber.id}`}))`);
      }
      const booked = await tx
        .select({ barberId: appointments.barberId, time: appointments.appointmentTime, duration: appointments.duration })
        .from(appointments)
        .where(and(eq(appointments.appointmentDate, date), ne(appointments.status, "cancelled")));
      const barber = candidates.find(
        (candidate) =>
          !isBlocked(blocked, candidate.id, date, time, service.duration) &&
          !booked.some((item) => item.barberId === candidate.id && overlaps(time, service.duration, item.time, item.duration)),
      );
      if (!barber) return null;

      const [appointment] = await tx.insert(appointments).values({
        serviceId: service.id,
        serviceName: service.name,
        barberId: barber.id,
        barberName: barber.name,
        appointmentDate: date,
        appointmentTime: time,
        duration: service.duration,
        price: service.price,
        depositAmount: deposit,
        receiptTokenHash: token ? createHash("sha256").update(token).digest("hex") : null,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
      }).returning({ id: appointments.id });
      return { id: appointment.id, barber: barber.name, barberId: barber.id };
    });

    if (!created) {
      return Response.json({ error: "Esta hora acaba de ocuparse. Elige otra disponible." }, { status: 409 });
    }

    // The deposit goes to the barber who got the reservation. Account details are sent only now, to
    // the person who reserved, instead of being published on the page for every visitor.
    const [barber] = await db.select({ account: barbers.paymentInstructions, email: barbers.email }).from(barbers).where(eq(barbers.id, created.barberId));
    const own = barber?.account.trim() ?? "";
    const instructions = deposit > 0 ? own || site.settings.paymentInstructions.trim() : "";

    // Messages go out after the answer is sent, so a slow mail server never keeps the customer waiting.
    const booking: Booking = { id: created.id, service: service.name, barber: created.barber, date, time, price: service.price, deposit, customerName: name, customerPhone: phone, customerEmail: email || null, instructions };
    const shop = {
      brand: `${site.texts.brandName.replace(/\.$/, "")} ${site.texts.brandTagline}`.trim(),
      address: `${site.settings.address}, ${site.settings.commune}, ${site.settings.city}`,
      phone: site.settings.phone,
    };
    after(async () => {
      try {
        const notices: { customerNotice: Notice; barberNotice?: Notice } = { customerNotice: await notifyCustomer(booking, shop) };
        // With a deposit, the barber hears about it when the payment screenshot arrives; without one, right away.
        if (deposit === 0) notices.barberNotice = await notifyBarber(barber?.email ?? "", booking, shop);
        await db.update(appointments).set(notices).where(eq(appointments.id, created.id));
      } catch (error) {
        console.error("Reservation notice error:", error);
      }
    });

    return Response.json(
      { id: created.id, barber: created.barber, service: service.name, date, time, duration: service.duration, price: service.price, deposit, token, instructions, paidToBarber: deposit > 0 && own !== "" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Appointment error:", error);
    return Response.json({ error: "No pudimos guardar tu reserva. Inténtalo de nuevo." }, { status: 503 });
  }
}
