import type { BlockType, Child, Scale, ScaleId } from "../types";
import { BLOCK_ORDER } from "../types";
import { buildScale } from "../music/scales";
import { songById } from "../music/songs";
import type { SessionPlan } from "../store/app-store";
import { LEVELS, READING_PROMOTE_AT } from "../generator/sightreading";
import { RHYTHM_LEVELS } from "../generator/rhythm";
import { fmtClock } from "./record";

export interface QueueItem {
  type: BlockType;
  index: number;
  /** The stop's name, as the path and the queue rows write it: "Technique", "Ear", "Your own". */
  title: string;
  /** One line under the name: "G major scale, two octaves". */
  detail: string;
  duration: string;
  seconds: number;
  /** Short setting chips: "♩76", "hands apart", "level 4". A leading quarter-note glyph marks a tempo. */
  settings: string[];
  /** Material Symbols icon for the stop. */
  icon: string;
}

/** The icon each stop carries on the path, in the queue and in the session header. */
export const STOP_ICON: Record<BlockType, string> = {
  scales: "piano",
  rhythm: "timer",
  ear: "hearing",
  reading: "menu_book",
  theory: "queue_music",
  repertoire: "music_note",
  improv: "auto_awesome",
};

/** The stop's short name on the path: "Scale", "Timing", "Ear", "Reading", "Harmony", "Pieces", "Your own". */
export const STOP_SHORT: Record<BlockType, string> = {
  scales: "Scale",
  rhythm: "Timing",
  ear: "Ear",
  reading: "Reading",
  theory: "Harmony",
  repertoire: "Pieces",
  improv: "Your own",
};

/** The quarter-note glyph that opens a tempo chip ("♩76"); the queue rows draw it in the music font. */
export const TEMPO_GLYPH = "\u{1D15F}";

const VALID = new Set<string>(BLOCK_ORDER);

/**
 * Today's blocks in the order they run. In own-plan mode this honours the order the Today screen persisted in
 * `settings.queueOrder` (a type may repeat or be missing) plus any `extraBlocks`; otherwise it is BLOCK_ORDER.
 * The session runner calls this so the queue it walks matches the one the Today screen showed.
 */
export function orderedBlocks(child: Child): BlockType[] {
  const s = child.settings;
  if (s.mode !== "own") return [...BLOCK_ORDER];
  const custom = (s.queueOrder ?? []).filter((b) => VALID.has(b));
  if (s.queueOrder && custom.length) return custom;
  const extras = (s.extraBlocks ?? []).filter((b) => VALID.has(b));
  return [...BLOCK_ORDER, ...extras];
}

/** Seconds the ordered queue adds up to (a repeated block counts twice). */
export function queueSeconds(child: Child, plan: SessionPlan): number {
  return orderedBlocks(child).reduce((a, b) => a + plan.blockSeconds[b], 0);
}

/** "G" from "G major"; the key without its mode. */
export function keyOnly(keyName: string): string {
  return keyName.replace(/ (major|minor|harmonic minor)$/, "");
}

/** Turn a session plan into the queue rows the Today screen shows, in the design's language. */
export function buildQueue(child: Child, plan: SessionPlan, scaleId?: ScaleId): QueueItem[] {
  const scale: Scale = buildScale(scaleId ?? plan.scale);
  const keyName = scale.name.replace("#", "♯").replace("b", "♭");
  const tonic = keyOnly(keyName);
  const s = child.settings;
  const reading = LEVELS[Math.max(0, Math.min(9, s.readingLevel - 1))];
  const rhythm = RHYTHM_LEVELS[Math.max(0, Math.min(9, s.rhythmLevel - 1))];
  const hands = reading.hands === "together" ? "hands together" : reading.hands === "alternating" ? "alternating" : reading.hands === "LH" ? "left hand" : "right hand";
  const toPromotion = Math.max(1, READING_PROMOTE_AT - s.noStopStreak);
  const pinned = (s.pinnedSongIds ?? []).map((id) => songById(id)).find(Boolean);
  const rows: Record<BlockType, Omit<QueueItem, "index" | "duration" | "seconds" | "type" | "icon">> = {
    scales: { title: "Technique", detail: `${keyName} scale, two octaves`, settings: [`${TEMPO_GLYPH}72`, "hands apart"] },
    rhythm: { title: "Timing", detail: `${rhythm.title} · level ${s.rhythmLevel}`, settings: [`${TEMPO_GLYPH}${rhythm.bpm}`, s.countIn ? "count-in" : "no count-in"] },
    ear: { title: "Ear", detail: "Hear it, play it back, find it on the staff", settings: ["3–5 notes"] },
    reading: { title: "Sight reading", detail: `New page every run · ${toPromotion} clean run${toPromotion === 1 ? "" : "s"} from level ${Math.min(10, s.readingLevel + 1)}`, settings: [`level ${s.readingLevel}`, hands] },
    theory: { title: "Harmony", detail: `Hear it, then find it · I, IV, V and vi in ${tonic}`, settings: [`level ${s.theoryLevel}`, "backing"] },
    repertoire: { title: "Pieces", detail: pinned ? pinned.title : "Your piece, then a lead sheet", settings: pinned ? ["hands apart"] : [] },
    improv: { title: "Your own", detail: "Anything — nothing is measured", settings: [`backing loop in ${tonic}`] },
  };
  return orderedBlocks(child).map((type, i) => ({ type, index: i + 1, icon: STOP_ICON[type], ...rows[type], seconds: plan.blockSeconds[type], duration: fmtClock(plan.blockSeconds[type]) }));
}
