/** Local calendar date as YYYY-MM-DD. All streak logic operates on these keys, never on timestamps. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** ISO week key, e.g. 2026-W37. Weeks start Monday. */
export function weekKey(key: string): string {
  const d = parseDateKey(key);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day + 3); // Thursday of this week
  const firstThu = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday..Sunday date keys for the week containing `key`. */
export function weekDays(key: string): string[] {
  const d = parseDateKey(key);
  const day = (d.getDay() + 6) % 7;
  const monday = addDays(key, -day);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function isWeekend(key: string): boolean {
  const day = parseDateKey(key).getDay();
  return day === 0 || day === 6;
}
