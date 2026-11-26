
import type { Metadata } from "next";
import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { businesses } from "@/db/schema";

import HomePage from "@/app/components/home-page";

import {
  addDays,
  nextBookableDate,
  todayInChile,
} from "@/lib/booking";

import {
  getBlocks,
  getSiteData,
} from "@/lib/data";

import { themeCss } from "@/lib/theme";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getBusinessBySlug = cache(async (slug: string) => {
  const [business] = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.slug, slug),
        eq(businesses.active, true)
      )
    )
    .limit(1);

  return business ?? null;
});

const loadSite = cache(async (slug: string) => {
  const business = await getBusinessBySlug(slug);

  if (!business) return null;

  const site = await getSiteData(business.id);

  return {
    business,
    ...site,
  };
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);

  if (!site) {
    return {
      title: "Barbería no encontrada | BarberPro",
      description: "Esta barbería no está disponible.",
    };
  }

  return {
    title: site.texts.metaTitle,
    description: site.texts.metaDescription,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  const site = await loadSite(slug);

  if (!site) {
    return (
      <main className="site-empty">
        <h1>Barbería no encontrada</h1>
        <p>Esta barbería no existe o no está disponible.</p>
      </main>
    );
  }

  const {
    settings,
    texts,
    theme,
    reviews,
    services,
    barbers,
    business,
  } = site;

  const today = todayInChile();

  const closures = (
    await getBlocks(
      business.id,
      today,
      addDays(today, 60)
    )
  ).filter(
    (block) =>
      block.barberId === null &&
      !block.startTime
  );

  const shopClosed = (date: string) =>
    closures.some(
      (block) =>
        block.startDate <= date &&
        date <= block.endDate
    );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: themeCss(theme),
        }}
      />

      <HomePage
        slug={business.slug}
        settings={{
          ...settings,
          paymentInstructions: "",
        }}
        texts={texts}
        theme={theme}
        reviews={reviews}
        services={services}
        barbers={barbers}
        initialDate={nextBookableDate(
          settings.schedule,
          shopClosed
        )}
        today={today}
      />
    </>
  );
}
