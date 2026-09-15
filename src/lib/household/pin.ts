/**
 * The household's four-digit code. Hashed with a cheap salt (types.ts): a deterrent against a curious child, not
 * cryptography. `pinMatches` also accepts a plain four-digit value so older records keep working.
 */
const PIN_SALT = "keycadence:pin:v1";

export function hashPin(pin: string): string {
  const s = `${PIN_SALT}:${pin}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `h1:${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export function pinMatches(stored: string | null | undefined, entered: string): boolean {
  if (!stored) return false;
  return stored === hashPin(entered) || stored === entered;
}

export function pinValid(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Six uppercase alphanumerics, no 0/O/1/I so a code read out at a lesson survives handwriting. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
