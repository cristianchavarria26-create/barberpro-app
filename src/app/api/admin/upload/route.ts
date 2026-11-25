import { db } from "@/db";
import { images } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { bodyTooLarge, readImage } from "@/lib/image-type";

export const dynamic = "force-dynamic";

/** Photos for the site (barbers, cover, shop), uploaded from the admin panel. */
export async function POST(request: Request) {
  try {
    // Refuse oversized bodies before reading them; the session token arrives as a form field.
    if (bodyTooLarge(request)) {
      return Response.json({ error: "La foto pesa más de 5 MB. Elige una más liviana." }, { status: 413 });
    }
    const form = await request.formData().catch(() => null);
    if (!(await getAdmin(form?.get("token")))) {
      return Response.json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });
    }
    const image = await readImage(form?.get("file"));
    if (!image.ok) return Response.json({ error: image.error }, { status: image.status });

    const [stored] = await db.insert(images).values({ mimeType: image.mimeType, data: image.bytes }).returning({ id: images.id });
    return Response.json({ url: `/api/images/${stored.id}` }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "No pudimos subir la foto. Inténtalo de nuevo." }, { status: 503 });
  }
}
