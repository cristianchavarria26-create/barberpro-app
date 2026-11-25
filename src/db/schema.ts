import { boolean, customType, date, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { DaySchedule } from "../lib/booking";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  address: varchar("address", { length: 160 }).notNull(),
  commune: varchar("commune", { length: 80 }).notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  schedule: jsonb("schedule").$type<DaySchedule[]>().notNull(),
  // No longer used: the deposit is now a fixed amount. Kept so existing databases need no destructive change.
  depositPercent: integer("deposit_percent").notNull().default(30),
  // The deposit asked for every reservation, in pesos. Zero means no deposit.
  depositAmount: integer("deposit_amount").notNull().default(3000),
  paymentInstructions: text("payment_instructions").notNull().default(""),
  heroImage: varchar("hero_image", { length: 255 }).notNull(),
  aboutImage: varchar("about_image", { length: 255 }).notNull(),
  visitImage: varchar("visit_image", { length: 255 }).notNull(),
  // Only the texts the owner has edited; everything else uses the original wording in lib/texts.
  texts: jsonb("texts").$type<Record<string, string>>().notNull().default({}),
  // Colours, typefaces, shapes and logo chosen by the owner; anything missing uses the original design.
  theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 200 }).notNull().default(""),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
});

export const barbers = pgTable("barbers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 80 }).notNull().default(""),
  photo: varchar("photo", { length: 255 }).notNull().default(""),
  // Where customers transfer the deposit when this barber takes the reservation.
  paymentInstructions: text("payment_instructions").notNull().default(""),
  // Where this barber receives their reservations and the customers' payment screenshots.
  email: varchar("email", { length: 160 }).notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id").notNull(),
    serviceName: varchar("service_name", { length: 80 }).notNull(),
    barberId: integer("barber_id").notNull(),
    barberName: varchar("barber_name", { length: 100 }).notNull(),
    appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
    appointmentTime: varchar("appointment_time", { length: 5 }).notNull(),
    duration: integer("duration").notNull(),
    price: integer("price").notNull(),
    depositAmount: integer("deposit_amount").notNull().default(0),
    depositPaid: boolean("deposit_paid").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("confirmed"),
    // The customer's payment screenshot (a private image) and the hash of the token that lets them attach it.
    receiptImageId: integer("receipt_image_id"),
    receiptTokenHash: varchar("receipt_token_hash", { length: 64 }),
    // How each side was told: "email", "sms", "failed" or "none". Empty until the messages have been attempted.
    customerNotice: varchar("customer_notice", { length: 20 }),
    barberNotice: varchar("barber_notice", { length: 20 }),
    customerName: varchar("customer_name", { length: 100 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 30 }).notNull(),
    customerEmail: varchar("customer_email", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("appointments_date_barber_idx").on(table.appointmentDate, table.barberId)],
);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  mimeType: varchar("mime_type", { length: 40 }).notNull(),
  // Private images (payment receipts) are never served from the public image address.
  private: boolean("private").notNull().default(false),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  rating: integer("rating").notNull(),
  comment: varchar("comment", { length: 600 }).notNull(),
  // "pending" until the owner reviews it; then "shown" on the site or "hidden".
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Hours closed by hand: lunch, an errand, holidays, a day off. Customers cannot reserve inside them.
export const blocks = pgTable(
  "blocks",
  {
    id: serial("id").primaryKey(),
    // Empty means the whole shop. A barber's blocks disappear with the barber.
    barberId: integer("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    // Empty times mean the whole day; otherwise the same hours apply on every day of the range.
    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),
    reason: varchar("reason", { length: 120 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("blocks_dates_idx").on(table.startDate, table.endDate)],
);
