import type { Metadata } from "next";
import { cache } from "react";
import HomePage from "@/app/components/home-page";
import { addDays, nextBookableDate, todayInChile } from "@/lib/booking";
import { getBlocks, getSiteData } from "@/lib/data";
import { themeCss } from "@/lib/theme";

export const dynamic = "force-dynamic";

// The page and its browser-tab title share one database read per visit.
const loadSite = cache(getSiteData);

export async function generateMetadata(): Promise<Metadata> {
  const { texts } = await loadSite();
  return { title: texts.metaTitle, description: texts.metaDescription };
}

export default async function Page() {
  const { settings, texts, theme, reviews, services, barbers } = await loadSite();
  const today = todayInChile();
  // Days when the whole shop is blocked are skipped when suggesting the first date to reserve.
  const closures = (await getBlocks(today, addDays(today, 60))).filter((block) => block.barberId === null && !block.startTime);
  const shopClosed = (date: string) => closures.some((block) => block.startDate <= date && date <= block.endDate);
  return (
    <>
      {/* The owner's colours, typefaces and shapes. Built only from validated colours and fixed lists. */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      {/* Account details are not published on the page: each customer receives them when they reserve. */}
      <HomePage
        settings={{ ...settings, paymentInstructions: "" }}
        texts={texts}
        theme={theme}
        reviews={reviews}
        services={services}
        barbers={barbers}
        initialDate={nextBookableDate(settings.schedule, shopClosed)}
        today={today}
      />
    </>
  );
}
