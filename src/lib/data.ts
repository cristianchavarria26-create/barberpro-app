import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { barbers, blocks, reviews, services, settings } from "@/db/schema";
import { DEFAULT_PHOTOS, DEFAULT_SCHEDULE, type BarberItem, type BlockItem, type ServiceItem, type SiteSettings } from "@/lib/booking";
import { resolveTexts } from "@/lib/texts";
import { resolveTheme } from "@/lib/theme";

let seeded = false;

/** Inserts the starting content once. The settings row marks the site as seeded, so deleted items never come back. */
export async function ensureSeed() {
  if (seeded) return;
  await db.transaction(async (tx) => {
    const created = await tx
      .insert(settings)
      .values({
        id: 1,
        address: "Av. Italia 1234",
        commune: "Providencia",
        city: "Santiago",
        phone: "+56 9 1234 5678",
        email: "hola@barriobarber.cl",
        schedule: DEFAULT_SCHEDULE,
        paymentInstructions: "",
        ...DEFAULT_PHOTOS,
      })
      .onConflictDoNothing()
      .returning({ id: settings.id });
    if (!created.length) return;
    await tx.insert(services).values([
      { name: "Corte clásico", description: "Un buen corte nunca pasa de moda.", duration: 45, price: 16000 },
      { name: "Corte + barba", description: "El dúo perfecto para salir renovado.", duration: 60, price: 22000 },
      { name: "Barba & perfilado", description: "Precisión y cuidado hasta el último detalle.", duration: 30, price: 10000 },
      { name: "Experiencia Barrio", description: "Corte, barba y un momento solo para ti.", duration: 90, price: 30000 },
    ]);
    await tx.insert(barbers).values([
      { name: "Matías Rojas", role: "Master barber", photo: "/images/barber-matias.jpg" },
      { name: "Nicolás Díaz", role: "Especialista en fade", photo: "/images/barber-portrait.jpg" },
      { name: "Sebastián Mora", role: "Barbero senior", photo: "/images/barber-seba.jpg" },
    ]);
  });
  seeded = true;
}

export async function getSettings(): Promise<SiteSettings> {
  await ensureSeed();
  let [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row) {
    seeded = false;
    await ensureSeed();
    [row] = await db.select().from(settings).where(eq(settings.id, 1));
  }
  if (!row) throw new Error("Site settings are missing");
  return row;
}

/** Public site content: only the services and barbers marked as visible. */
export async function getSiteData() {
  const siteSettings = await getSettings();
  const [serviceRows, barberRows] = await Promise.all([
    db
      .select({ id: services.id, name: services.name, description: services.description, duration: services.duration, price: services.price })
      .from(services)
      .where(eq(services.active, true))
      .orderBy(asc(services.id)),
    db
      .select({ id: barbers.id, name: barbers.name, role: barbers.role, photo: barbers.photo })
      .from(barbers)
      .where(eq(barbers.active, true))
      .orderBy(asc(barbers.id)),
  ]);
  // Only the reviews the owner chose to show, newest first.
  const reviewRows = await db
    .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, comment: reviews.comment })
    .from(reviews)
    .where(eq(reviews.status, "shown"))
    .orderBy(desc(reviews.createdAt))
    .limit(9);
  return {
    settings: siteSettings,
    texts: resolveTexts(siteSettings.texts),
    theme: resolveTheme(siteSettings.theme),
    reviews: reviewRows,
    services: serviceRows as ServiceItem[],
    barbers: barberRows as BarberItem[],
  };
}

/** The hours blocked by hand that touch any day between `from` and `to`. */
export async function getBlocks(from: string, to: string): Promise<BlockItem[]> {
  return db
    .select({ barberId: blocks.barberId, startDate: blocks.startDate, endDate: blocks.endDate, startTime: blocks.startTime, endTime: blocks.endTime })
    .from(blocks)
    .where(and(lte(blocks.startDate, to), gte(blocks.endDate, from)));
}
