import { and, desc, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";

export type MonthStats = {
  month: string;
  /** Reservations dated in the month that were not cancelled. */
  reservations: number;
  cancelled: number;
  /** Sum of the price of those reservations: an estimate, since it assumes everyone shows up and pays in full. */
  revenue: number;
  /** Deposits already marked as received. */
  depositsPaid: number;
  /** People (by phone number) whose first reservation ever falls in the month. */
  newCustomers: number;
  services: { name: string; count: number }[];
};

/** The figures of one month ("2026-11"). Returns null for anything that is not a real month. */
export async function monthStats(monthInput: unknown): Promise<MonthStats | null> {
  if (typeof monthInput !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthInput)) return null;
  const [year, month] = monthInput.split("-").map(Number);
  const start = `${monthInput}-01`;
  const end = `${monthInput}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
  const inMonth = and(gte(appointments.appointmentDate, start), lte(appointments.appointmentDate, end));

  const [[totals], services, firsts] = await Promise.all([
    db
      .select({
        reservations: sql<number>`(count(*) filter (where ${appointments.status} <> 'cancelled'))::int`,
        cancelled: sql<number>`(count(*) filter (where ${appointments.status} = 'cancelled'))::int`,
        revenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${appointments.status} <> 'cancelled'), 0)::int`,
        depositsPaid: sql<number>`coalesce(sum(${appointments.depositAmount}) filter (where ${appointments.depositPaid} and ${appointments.status} <> 'cancelled'), 0)::int`,
      })
      .from(appointments)
      .where(inMonth),
    db
      .select({ name: appointments.serviceName, count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(and(inMonth, ne(appointments.status, "cancelled")))
      .groupBy(appointments.serviceName)
      .orderBy(desc(sql`count(*)`), appointments.serviceName)
      .limit(5),
    // A customer is recognised by the digits of their phone, whatever spaces or symbols they typed.
    db
      .select({ first: sql<string>`min(${appointments.appointmentDate})` })
      .from(appointments)
      .where(ne(appointments.status, "cancelled"))
      .groupBy(sql`regexp_replace(${appointments.customerPhone}, '[^0-9]', '', 'g')`),
  ]);

  return {
    month: monthInput,
    reservations: totals.reservations,
    cancelled: totals.cancelled,
    revenue: totals.revenue,
    depositsPaid: totals.depositsPaid,
    newCustomers: firsts.filter((row) => row.first >= start && row.first <= end).length,
    services,
  };
}
