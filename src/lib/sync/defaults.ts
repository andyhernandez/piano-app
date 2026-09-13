/**
 * The KeyCadence cloud project. The publishable key is safe to ship: every row is protected by
 * row-level security that only matches the family code sent with each request.
 */
export const KEYCADENCE_CLOUD = {
  url: "https://tfsqqbsnmllagsdiranr.supabase.co",
  anonKey: "sb_publishable_8Z3tzkOn_lsST_YK0pQ73Q_62Nw1vMd",
};

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
