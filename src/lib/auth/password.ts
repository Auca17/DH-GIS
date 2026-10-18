// Passwords are never stored. We store a scrypt hash and a random salt per user.
//
// scrypt comes with Node (node:crypto): no extra library. It is slow on purpose,
// so trying millions of passwords against a stolen hash takes too long.
// The salt makes two users with the same password get different hashes.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return { hash: key.toString("hex"), salt };
}

/** True when `password` matches the stored hash and salt. */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const key = await scrypt(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  // timingSafeEqual takes the same time whether the first or the last byte differs,
  // so an attacker cannot guess the hash byte by byte by measuring response times.
  return stored.length === key.length && timingSafeEqual(stored, key);
}
