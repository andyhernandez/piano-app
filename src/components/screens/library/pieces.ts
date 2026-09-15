import type { Assignment, Child, Song } from "@/lib/types";
import type { Format } from "@/components/ds";
import { keyLabel } from "@/components/ds";
import { currentScale } from "@/lib/engine/progression";

export type PieceState = "today" | "learning" | "suggested" | "none";
export type Filter = "All" | "Suggested" | "Learning" | "Custom";
export const FILTERS: Filter[] = ["All", "Suggested", "Learning", "Custom"];

export interface PieceView {
  song: Song;
  state: PieceState;
  format: Format;
  meta: string;
  /** Whole levels the piece sits above the player's reading (0 when within reach). */
  above: number;
  sessions: number;
}

const LEVEL_WORD = ["", "One level", "Two levels", "Three levels", "Four levels"];

/** Reading level runs 1–10; a piece's level 1–5. Same ladder, two rungs per piece level. */
export function readingBand(readingLevel: number): number {
  return Math.max(1, Math.min(5, Math.ceil(readingLevel / 2)));
}

/** How a piece is read in this app: a lead sheet when there is a chart, chords only when there are no level cards, the score elsewhere otherwise. */
export function formatFor(song: Song): Format {
  if (!song.chart.length) return "full-notation";
  return song.leadSheetLevels.length ? "lead-sheet" : "chord-chart";
}

export function describePiece(song: Song, child: Child, assignment: Assignment | null, sessionsBySong: Map<string, number>): PieceView {
  const key = keyLabel(song.key, song.mode);
  const above = Math.max(0, song.level - readingBand(child.settings.readingLevel));
  const sessions = sessionsBySong.get(song.id) ?? 0;
  const inToday = (assignment?.songIds.includes(song.id) ?? false) || (child.settings.pinnedSongIds?.includes(song.id) ?? false);
  const week = currentScale(child);
  const thisKey = song.key === week.key && song.mode === week.mode;
  const state: PieceState = inToday ? "today" : sessions > 0 ? "learning" : thisKey ? "suggested" : "none";
  const aboveText = above > 0 ? `${LEVEL_WORD[Math.min(4, above)]} above your reading` : null;
  let meta: string;
  if (state === "today") meta = `In today · ${key} · level ${song.level}`;
  else if (state === "learning") meta = `Learning · ${sessions} ${sessions === 1 ? "session" : "sessions"} · ${key}`;
  else if (aboveText) meta = `${aboveText} · ${key}`;
  else if (state === "suggested") meta = `In this week's key · level ${song.level}`;
  else if (song.isCustom) meta = `Your own · ${key} · level ${song.level}`;
  else meta = `${key} · level ${song.level}`;
  return { song, state, format: formatFor(song), meta, above, sessions };
}

const ORDER: Record<PieceState, number> = { today: 0, learning: 1, suggested: 2, none: 3 };

export function sortPieces(list: PieceView[]): PieceView[] {
  return list.slice().sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.song.level - b.song.level || a.song.title.localeCompare(b.song.title));
}

export function filterPieces(list: PieceView[], filter: Filter): PieceView[] {
  if (filter === "Suggested") return list.filter((p) => p.state === "suggested" || p.state === "today");
  if (filter === "Learning") return list.filter((p) => p.state === "learning" || p.state === "today");
  if (filter === "Custom") return list.filter((p) => p.song.isCustom);
  return list;
}

/** The one piece to point at next: this week's key first, then the nearest piece above the reading level. */
export function suggestedNext(list: PieceView[]): { piece: PieceView; why: string } | null {
  const fresh = list.filter((p) => p.state !== "today" && p.state !== "learning");
  const inKey = fresh.find((p) => p.state === "suggested" && p.above === 0) ?? fresh.find((p) => p.state === "suggested");
  if (inKey) return { piece: inKey, why: inKey.above > 0 ? `${LEVEL_WORD[Math.min(4, inKey.above)]} above your reading. Start it anyway — you'll get a simplified sheet.` : "In this week's key, with chords you already play. The lead sheet is ready when you are." };
  const reach = fresh.filter((p) => p.above > 0).sort((a, b) => a.above - b.above)[0];
  if (reach) return { piece: reach, why: `${LEVEL_WORD[Math.min(4, reach.above)]} above your reading. Start it anyway — you'll get a simplified sheet.` };
  const any = fresh[0];
  return any ? { piece: any, why: `${keyLabel(any.song.key, any.song.mode)}, level ${any.song.level}. Nothing is locked.` } : null;
}

/** "I | IV | V I | I" → [["I"],["IV"],["V","I"],["I"]]. Bars split on | or newline; chords within a bar on spaces. */
export function parseChart(text: string): string[][] {
  return text
    .split(/[|\n]/)
    .map((bar) => bar.trim().split(/[\s,]+/).filter(Boolean))
    .filter((bar) => bar.length > 0);
}

const ROMAN = /^(i|ii|iii|iv|v|vi|vii)(°|dim)?$/i;
export function chartProblem(chart: string[][]): string | null {
  for (const bar of chart) for (const c of bar) if (!ROMAN.test(c)) return `"${c}" is not a roman numeral. Use I to VII, lower case for minor.`;
  return null;
}
