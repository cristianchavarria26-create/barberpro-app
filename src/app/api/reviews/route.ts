import { db } from "@/db";
import { reviews } from "@/db/schema";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const oneLine = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Anyone can write a review, so a burst of them is capped. Nothing is published until the owner approves it.
let recent: number[] = [];
function underLimit() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  recent = recent.filter((time) => time > cutoff);
  if (recent.length >= 30) return false;
  recent.push(Date.now());
  return true;
}

/** A customer leaves a review. It waits in the admin panel until the owner decides to show it. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // "website" is a hidden field that people never see; only automated form-fillers complete it.
  if (body && typeof body === "object" && body.website) return json({ ok: true }, 201);

  const name = oneLine(body?.name, 80);
  const comment = oneLine(body?.comment, 600);
  const rating = Number(body?.rating);
  if (name.length < 2 || comment.length < 5 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: "Escribe tu nombre, elige las estrellas y cuéntanos un poco más." }, 400);
  }
  if (!underLimit()) return json({ error: "Recibimos muchas reseñas en poco tiempo. Inténtalo más tarde." }, 429);

  try {
    await db.insert(reviews).values({ name, rating, comment });
    return json({ ok: true }, 201);
  } catch (error) {
    console.error("Review error:", error);
    return json({ error: "No pudimos guardar tu reseña. Inténtalo de nuevo." }, 503);
  }
}
