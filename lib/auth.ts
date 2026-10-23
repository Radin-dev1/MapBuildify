import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { storageMode } from "./storage";

export const PASSWORD_HEADER = "x-admin-password";

/**
 * Uploads and deletes need ADMIN_PASSWORD. When it is unset, only local
 * (disk) mode allows writes, so a deployed site is never left open.
 */
export function checkPassword(given: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return storageMode() === "local";
  if (!given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function passwordRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) || storageMode() === "blob";
}
