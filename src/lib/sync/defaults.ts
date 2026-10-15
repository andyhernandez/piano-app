/**
 * The EasyKeys cloud: the admin app on Laravel Cloud (piano-app-admin), which stores each family's records
 * behind its family code and serves the music library. NEXT_PUBLIC_CLOUD_URL overrides it for local work.
 */
export const CLOUD_URL = (process.env.NEXT_PUBLIC_CLOUD_URL || "https://piano-app-admin-production-7u1y3i.laravel.cloud").replace(/\/+$/, "");

/** A family code: 24 URL-safe characters (~140 bits), generated once per family. */
export function newFamilyCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "fam-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function isFamilyCode(s: string): boolean {
  return /^fam-[a-z0-9]{24}$/.test(s.trim());
}
