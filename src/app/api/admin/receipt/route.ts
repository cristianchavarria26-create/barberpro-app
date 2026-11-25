import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, images } from "@/db/schema";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Returns the payment receipt of a reservation. Only for a signed-in owner; the session comes in the body. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!(await getAdmin(body?.token))) return json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, 401);
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "Esa reserva no existe." }, 400);

    const [receipt] = await db
      .select({ mimeType: images.mimeType, data: images.data })
      .from(appointments)
      .innerJoin(images, eq(images.id, appointments.receiptImageId))
      .where(eq(appointments.id, id));
    if (!receipt) return json({ error: "Esta reserva no tiene comprobante." }, 404);

    return new Response(new Uint8Array(receipt.data), {
      headers: { "Content-Type": receipt.mimeType, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    console.error("Receipt read error:", error);
    return json({ error: "No pudimos abrir el comprobante. Inténtalo de nuevo." }, 503);
  }
}
