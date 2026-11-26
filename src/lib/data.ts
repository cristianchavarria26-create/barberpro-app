
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  barbers,
  blocks,
  reviews,
  services,
  settings,
} from "@/db/schema";

import type {
  BarberItem,
  BlockItem,
  ServiceItem,
  SiteSettings,
} from "@/lib/booking";

import { resolveTexts } from "@/lib/texts";
import { resolveTheme } from "@/lib/theme";

/**
 * Obtiene la configuración de una barbería específica.
 * Cada negocio tiene su propia configuración.
 */
export async function getSettings(
  businessId: string
): Promise<SiteSettings> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.businessId, businessId))
    .limit(1);

  if (!row) {
    throw new Error("Business settings are missing");
  }

  return {
    address: row.address,
    commune: row.commune,
    city: row.city,
    phone: row.phone,
    email: row.email,
    schedule: row.schedule,
    requireDeposit: row.requireDeposit,
    depositAmount: row.depositAmount,
    paymentInstructions: row.paymentInstructions,
    heroImage: row.heroImage,
    aboutImage: row.aboutImage,
    visitImage: row.visitImage,
    texts: row.texts,
    theme: row.theme,
  };
}

/**
 * Obtiene todos los datos públicos de una barbería.
 * Ninguna consulta mezcla información de otros negocios.
 */
export async function getSiteData(businessId: string) {
  const siteSettings = await getSettings(businessId);

  const [serviceRows, barberRows, reviewRows] = await Promise.all([
    db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        duration: services.duration,
        price: services.price,
      })
      .from(services)
      .where(
        and(
          eq(services.businessId, businessId),
          eq(services.active, true)
        )
      )
      .orderBy(asc(services.id)),

    db
      .select({
        id: barbers.id,
        name: barbers.name,
        role: barbers.role,
        photo: barbers.photo,
      })
      .from(barbers)
      .where(
        and(
          eq(barbers.businessId, businessId),
          eq(barbers.active, true)
        )
      )
      .orderBy(asc(barbers.id)),

    db
      .select({
        id: reviews.id,
        name: reviews.name,
        rating: reviews.rating,
        comment: reviews.comment,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.businessId, businessId),
          eq(reviews.status, "shown")
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(9),
  ]);

  return {
    settings: siteSettings,
    texts: resolveTexts(siteSettings.texts),
    theme: resolveTheme(siteSettings.theme),
    reviews: reviewRows,
    services: serviceRows as ServiceItem[],
    barbers: barberRows as BarberItem[],
  };
}

/**
 * Obtiene los bloqueos de agenda de una barbería.
 * Solo devuelve bloqueos que intersectan las fechas solicitadas.
 */
export async function getBlocks(
  businessId: string,
  from: string,
  to: string
): Promise<BlockItem[]> {
  return db
    .select({
      barberId: blocks.barberId,
      startDate: blocks.startDate,
      endDate: blocks.endDate,
      startTime: blocks.startTime,
      endTime: blocks.endTime,
    })
    .from(blocks)
    .where(
      and(
        eq(blocks.businessId, businessId),
        lte(blocks.startDate, to),
        gte(blocks.endDate, from)
      )
    );
}


    
