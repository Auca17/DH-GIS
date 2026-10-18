import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

// Sessions: after signing up or in, the browser keeps a random token in an
// httpOnly cookie (JavaScript in the page cannot read it), and `sessions` keeps
// its SHA-256 hash. If the database leaked, the hashes could not be used as cookies.
//
// `sessions` has a TTL index on expiresAt (scripts/seed.ts): MongoDB deletes
// expired sessions by itself, about once a minute.
//
// This is how the server knows WHO is calling. MongoDB has no row-level security
// for app users, so every route that touches a rider's data filters by the userId
// that comes from here, never by an id sent by the client.

export const SESSION_COOKIE = "dh_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session for the user and sets the cookie. Only in Route Handlers. */
export async function startSession(userId: ObjectId): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getDb()
    .collection("sessions")
    .insertOne({ tokenHash: hashToken(token), userId, createdAt: now, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Over HTTPS only in production (Vercel). localhost runs on plain http.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user's _id, or null (no cookie, unknown or expired session). */
export async function getSessionUserId(): Promise<ObjectId | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getDb()
    .collection("sessions")
    // expiresAt filter: the TTL index can take up to a minute to delete a session.
    .findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  return (session?.userId as ObjectId | undefined) ?? null;
}

/** Deletes the session and the cookie (sign out). Only in Route Handlers. */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().collection("sessions").deleteOne({ tokenHash: hashToken(token) });
  }
  cookieStore.delete(SESSION_COOKIE);
}
