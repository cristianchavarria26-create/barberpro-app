import { asc, desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, blocks, reviews, services } from "@/db/schema";
import * as admin from "@/lib/admin";
import { adminExists, destroySession, getAdmin } from "@/lib/auth";
import { addDays, todayInChile } from "@/lib/booking";
import { getSettings } from "@/lib/data";
import { mailReady, smsReady } from "@/lib/notify";
import { monthStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const reply = (result: admin.Result) => json(result, result.ok ? 200 : 400);

/** Everything the panel shows once the owner is signed in. */
async function panelData(email: string) {
  const [settings, serviceRows, barberRows, appointmentRows, reviewRows, blockRows] = await Promise.all([
    getSettings(),
    db.select().from(services).orderBy(asc(services.id)),
    db.select().from(barbers).orderBy(asc(barbers.id)),
    db
      .select({
        id: appointments.id,
        serviceName: appointments.serviceName,
        barberName: appointments.barberName,
        barberId: appointments.barberId,
        date: appointments.appointmentDate,
        time: appointments.appointmentTime,
        duration: appointments.duration,
        price: appointments.price,
        depositAmount: appointments.depositAmount,
        depositPaid: appointments.depositPaid,
        status: appointments.status,
        customerName: appointments.customerName,
        customerPhone: appointments.customerPhone,
        customerEmail: appointments.customerEmail,
        hasReceipt: sql<boolean>`${appointments.receiptImageId} is not null`,
        customerNotice: appointments.customerNotice,
        barberNotice: appointments.barberNotice,
      })
      .from(appointments)
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime))
      .limit(500),
    db
      .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, comment: reviews.comment, status: reviews.status, date: reviews.createdAt })
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(300),
    // Current and upcoming blocks, plus the last month so the calendar still shows them when looking back.
    db
      .select({ id: blocks.id, barberId: blocks.barberId, startDate: blocks.startDate, endDate: blocks.endDate, startTime: blocks.startTime, endTime: blocks.endTime, reason: blocks.reason })
      .from(blocks)
      .where(gte(blocks.endDate, addDays(todayInChile(), -31)))
      .orderBy(asc(blocks.startDate), asc(blocks.startTime), asc(blocks.id))
      .limit(300),
  ]);
  return {
    state: "ready",
    email,
    settings,
    services: serviceRows,
    barbers: barberRows,
    appointments: appointmentRows,
    reviews: reviewRows,
    blocks: blockRows,
    today: todayInChile(),
    notify: { email: mailReady(), sms: smsReady() },
  };
}

// One POST endpoint for the whole panel. Every request carries the session token in its JSON body,
// and nothing is read with GET, so the panel does not depend on headers, cookies or cached responses.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.action !== "string") {
    return json({ ok: false, error: "Solicitud no válida." }, 400);
  }
  const input = body.input && typeof body.input === "object" ? body.input : {};

  try {
    if (body.action === "setup" || body.action === "login") {
      const result = body.action === "setup" ? await admin.setupAdmin(body.email, body.password) : await admin.login(body.email, body.password);
      if (!result.ok) return json(result, 400);
      const user = await getAdmin(result.token);
      if (!user) throw new Error("The new session could not be read back");
      // Signing in returns the panel itself, so opening it never depends on a second request.
      return json({ ok: true, token: result.token, ...(await panelData(user.email)) });
    }

    const user = await getAdmin(body.token);
    if (body.action === "state") {
      if (user) return json({ ok: true, ...(await panelData(user.email)) });
      return json({ ok: true, state: (await adminExists()) ? "login" : "setup" });
    }

    // Everything below reads or changes the business, so it requires a valid session.
    if (!user) return json({ ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." }, 401);
    switch (body.action) {
      case "logout":
        await destroySession(body.token);
        return json({ ok: true });
      case "stats": {
        const stats = await monthStats(body.month);
        return stats ? json({ ok: true, ...stats }) : json({ ok: false, error: "Ese mes no es válido." }, 400);
      }
      case "saveService":
        return reply(await admin.saveService(input));
      case "deleteService":
        return reply(await admin.deleteService(body.id));
      case "saveBarber":
        return reply(await admin.saveBarber(input));
      case "deleteBarber":
        return reply(await admin.deleteBarber(body.id));
      case "saveSettings":
        return reply(await admin.saveSettings(input));
      case "saveSchedule":
        return reply(await admin.saveSchedule(body.schedule));
      case "saveSitePhoto":
        return reply(await admin.saveSitePhoto(String(body.slot), typeof body.url === "string" ? body.url : ""));
      case "setDepositPaid":
        return reply(await admin.setDepositPaid(body.id, body.paid));
      case "cancelAppointment":
        return reply(await admin.cancelAppointment(body.id));
      case "saveTexts":
        return reply(await admin.saveTexts(input));
      case "saveTheme":
        return reply(await admin.saveTheme(input));
      case "setReviewStatus":
        return reply(await admin.setReviewStatus(body.id, body.status));
      case "deleteReview":
        return reply(await admin.deleteReview(body.id));
      case "saveBlock":
        return reply(await admin.saveBlock(input));
      case "deleteBlock":
        return reply(await admin.deleteBlock(body.id));
      default:
        return json({ ok: false, error: "Solicitud no válida." }, 400);
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return json({ ok: false, error: "El servidor tuvo un problema al procesar la solicitud. Inténtalo de nuevo." }, 503);
  }
}
