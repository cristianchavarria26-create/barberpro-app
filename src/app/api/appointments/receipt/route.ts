import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, images } from "@/db/schema";
import { getSiteData } from "@/lib/data";
import { bodyTooLarge, readImage } from "@/lib/image-type";
import { notifyBarber } from "@/lib/notify";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** The customer attaches the screenshot of their deposit transfer to their own reservation. */
export async function POST(request: Request) {
  try {
    if (bodyTooLarge(request)) return json({ error: "La imagen pesa más de 5 MB. Elige una más liviana." }, 413);
    const form = await request.formData().catch(() => null);
    const id = Number(form?.get("id"));
    const token = form?.get("token");
    if (!Number.isInteger(id) || id < 1 || typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) {
      return json({ error: "No pudimos identificar tu reserva." }, 400);
    }

    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    // Same answer for an unknown reservation and a wrong token, so reservation numbers cannot be probed.
    const expected = Buffer.from(appointment?.receiptTokenHash ?? "", "hex");
    const actual = createHash("sha256").update(token).digest();
    if (!appointment || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return json({ error: "No pudimos verificar tu reserva. Sube el pantallazo desde el mismo dispositivo en que reservaste." }, 403);
    }
    if (appointment.status === "cancelled") return json({ error: "Esta reserva fue cancelada. Contacta a la barbería.", final: true }, 409);
    if (appointment.depositPaid) return json({ error: "El abono de esta reserva ya fue confirmado. No necesitas enviar nada más.", final: true }, 409);

    const image = await readImage(form?.get("file"));
    if (!image.ok) return json({ error: image.error }, image.status);

    // Receipts are private: they are never served from the public image address, only inside the admin panel.
    await db.transaction(async (tx) => {
      const [stored] = await tx.insert(images).values({ mimeType: image.mimeType, data: image.bytes, private: true }).returning({ id: images.id });
      await tx.update(appointments).set({ receiptImageId: stored.id }).where(eq(appointments.id, id));
      // Sending a new screenshot replaces the previous one, so each reservation keeps a single image.
      if (appointment.receiptImageId) await tx.delete(images).where(eq(images.id, appointment.receiptImageId));
    });

    // The barber gets the reservation and the screenshot by email, after the customer already has their answer.
    after(async () => {
      try {
        const [site, [barber]] = await Promise.all([
          getSiteData(),
          db.select({ email: barbers.email }).from(barbers).where(eq(barbers.id, appointment.barberId)),
        ]);
        const notice = await notifyBarber(
          barber?.email ?? "",
          {
            id,
            service: appointment.serviceName,
            barber: appointment.barberName,
            date: appointment.appointmentDate,
            time: appointment.appointmentTime,
            price: appointment.price,
            deposit: appointment.depositAmount,
            customerName: appointment.customerName,
            customerPhone: appointment.customerPhone,
            customerEmail: appointment.customerEmail,
            instructions: "",
          },
          {
            brand: `${site.texts.brandName.replace(/\.$/, "")} ${site.texts.brandTagline}`.trim(),
            address: `${site.settings.address}, ${site.settings.commune}, ${site.settings.city}`,
            phone: site.settings.phone,
          },
          { image: image.bytes, mimeType: image.mimeType, replaced: appointment.receiptImageId !== null },
        );
        await db.update(appointments).set({ barberNotice: notice }).where(eq(appointments.id, id));
      } catch (error) {
        console.error("Receipt notice error:", error);
      }
    });

    return json({ ok: true }, 201);
  } catch (error) {
    console.error("Receipt upload error:", error);
    return json({ error: "No pudimos guardar tu pantallazo. Inténtalo de nuevo." }, 503);
  }
}
