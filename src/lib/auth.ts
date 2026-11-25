import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN = /^[a-f0-9]{64}$/;

// Only a hash of the session token is stored, so a database leak cannot be replayed as a login.
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Starts a session and returns its token. The browser sends it back inside each request body. */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await db.insert(adminSessions).values({ tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + SESSION_MS) });
  return token;
}

// The token travels in the request body, not in a cookie or a header. The browser never attaches it
// on its own, so other sites cannot act for the owner, and proxies that drop headers cannot lose it.
export async function getAdmin(token: unknown) {
  if (typeof token !== "string" || !TOKEN.test(token)) return null;
  const [admin] = await db
    .select({ id: adminUsers.id, email: adminUsers.email })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, digest(token)), gt(adminSessions.expiresAt, new Date())));
  return admin ?? null;
}

export async function destroySession(token: unknown) {
  if (typeof token === "string" && TOKEN.test(token)) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, digest(token)));
  }
}

export async function adminExists() {
  const [row] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return Boolean(row);
}
