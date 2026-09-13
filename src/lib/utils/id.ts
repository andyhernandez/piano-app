/** Short, URL-safe, collision-resistant id (no crypto dependency needed in browsers, but use it when present). */
export function newId(prefix = ""): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const s = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
  return prefix ? `${prefix}_${s}` : s;
}
