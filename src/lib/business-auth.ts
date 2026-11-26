
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function getBusinessOwner() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerId, user.id))
    .limit(1);

  if (!business || !business.active) {
    return null;
  }

  const trialExpired =
    business.plan === "trial" &&
    business.trialEndsAt &&
    business.trialEndsAt.getTime() < Date.now();

  const subscriptionExpired =
    business.plan !== "trial" &&
    business.subscriptionEndsAt &&
    business.subscriptionEndsAt.getTime() < Date.now();

  if (trialExpired || subscriptionExpired) {
    return {
      user,
      business,
      accessAllowed: false,
      reason: "expired",
    };
  }

  return {
    user,
    business,
    accessAllowed: true,
    reason: null,
  };
}
