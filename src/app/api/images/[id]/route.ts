import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { images } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imageId = Number(id);
  if (!Number.isInteger(imageId) || imageId < 1) return new Response("Not found", { status: 404 });

  try {
    const [image] = await db.select({ mimeType: images.mimeType, data: images.data }).from(images).where(and(eq(images.id, imageId), eq(images.private, false)));
    if (!image) return new Response("Not found", { status: 404 });
    // Every upload gets a new id, so a stored image never changes and can be cached for good.
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Image error:", error);
    return new Response("Unavailable", { status: 503 });
  }
}
