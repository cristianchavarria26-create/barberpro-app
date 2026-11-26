
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { DaySchedule } from "../lib/booking";

// =====================================================
// BUSINESSES - Cada barbería dentro de BarberPro
// =====================================================

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    plan: text("plan").notNull().default("trial"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '3 days'`),
    subscriptionEndsAt: timestamp("subscription_ends_at", {
      withTimezone: true,
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("businesses_owner_id_idx").on(table.ownerId),
    uniqueIndex("businesses_slug_idx").on(table.slug),
  ],
);

// =====================================================
// CONFIGURACIÓN DE CADA NEGOCIO
// =====================================================

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .unique()
      .references(() => businesses.id, { onDelete: "cascade" }),

    address: varchar("address", { length: 160 }).notNull(),
    commune: varchar("commune", { length: 80 }).notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),

    schedule: jsonb("schedule").$type<DaySchedule[]>().notNull(),

    depositPercent: integer("deposit_percent").notNull().default(30),

    depositAmount: integer("deposit_amount").notNull().default(3000),

    // Cada barbería decide si exige abono.
    // Por defecto está desactivado.
    requireDeposit: boolean("require_deposit").notNull().default(false),

    paymentInstructions: text("payment_instructions")
      .notNull()
      .default(""),

    heroImage: varchar("hero_image", { length: 255 }).notNull(),
    aboutImage: varchar("about_image", { length: 255 }).notNull(),
    visitImage: varchar("visit_image", { length: 255 }).notNull(),

    texts: jsonb("texts")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),

    theme: jsonb("theme")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    index("settings_business_idx").on(table.businessId),
  ],
);

// =====================================================
// SERVICIOS
// =====================================================

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 200 })
      .notNull()
      .default(""),
    duration: integer("duration").notNull(),
    price: integer("price").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("services_business_idx").on(table.businessId),
  ],
);

// =====================================================
// BARBEROS
// =====================================================

export const barbers = pgTable(
  "barbers",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 80 }).notNull().default(""),
    photo: varchar("photo", { length: 255 }).notNull().default(""),
    paymentInstructions: text("payment_instructions")
      .notNull()
      .default(""),
    email: varchar("email", { length: 160 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("barbers_business_idx").on(table.businessId),
  ],
);

// =====================================================
// RESERVAS
// =====================================================

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    serviceId: integer("service_id").notNull(),
    serviceName: varchar("service_name", { length: 80 }).notNull(),

    barberId: integer("barber_id").notNull(),
    barberName: varchar("barber_name", { length: 100 }).notNull(),

    appointmentDate: date("appointment_date", {
      mode: "string",
    }).notNull(),

    appointmentTime: varchar("appointment_time", {
      length: 5,
    }).notNull(),

    duration: integer("duration").notNull(),
    price: integer("price").notNull(),

    depositAmount: integer("deposit_amount").notNull().default(0),
    depositPaid: boolean("deposit_paid").notNull().default(false),

    status: varchar("status", { length: 20 })
      .notNull()
      .default("confirmed"),

    receiptImageId: integer("receipt_image_id"),
    receiptTokenHash: varchar("receipt_token_hash", { length: 64 }),

    customerNotice: varchar("customer_notice", { length: 20 }),
    barberNotice: varchar("barber_notice", { length: 20 }),

    customerName: varchar("customer_name", { length: 100 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 30 }).notNull(),
    customerEmail: varchar("customer_email", { length: 160 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("appointments_business_idx").on(table.businessId),

    index("appointments_date_barber_idx").on(
      table.appointmentDate,
      table.barberId,
    ),

    index("appointments_business_date_idx").on(
      table.businessId,
      table.appointmentDate,
    ),
  ],
);

// =====================================================
// IMÁGENES
// =====================================================

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const images = pgTable(
  "images",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    mimeType: varchar("mime_type", { length: 40 }).notNull(),
    private: boolean("private").notNull().default(false),
    data: bytea("data").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("images_business_idx").on(table.businessId),
  ],
);

// =====================================================
// ADMINISTRADORES DE PLATAFORMA
// =====================================================

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),

  email: varchar("email", { length: 160 })
    .notNull()
    .unique(),

  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),

  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }).notNull(),
});

// =====================================================
// RESEÑAS
// =====================================================

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 80 }).notNull(),
    rating: integer("rating").notNull(),
    comment: varchar("comment", { length: 600 }).notNull(),

    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reviews_business_idx").on(table.businessId),
  ],
);

// =====================================================
// BLOQUEOS DE HORARIO
// =====================================================

export const blocks = pgTable(
  "blocks",
  {
    id: serial("id").primaryKey(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    barberId: integer("barber_id").references(() => barbers.id, {
      onDelete: "cascade",
    }),

    startDate: date("start_date", {
      mode: "string",
    }).notNull(),

    endDate: date("end_date", {
      mode: "string",
    }).notNull(),

    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),

    reason: varchar("reason", { length: 120 })
      .notNull()
      .default(""),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("blocks_business_idx").on(table.businessId),

    index("blocks_dates_idx").on(
      table.startDate,
      table.endDate,
    ),
  ],
);
                         
