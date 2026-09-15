import type { BlockType, Child, Scale, ScaleId } from "../types";
import { BLOCK_ORDER } from "../types";
import { buildScale } from "../music/scales";
import type { SessionPlan } from "../store/app-store";
import { LEVELS } from "../generator/sightreading";
import { RHYTHM_LEVELS } from "../generator/rhythm";
import { fmtClock } from "./record";

export interface QueueItem {
  type: BlockType;
  index: number;
  title: string;
  detail: string;
  duration: string;
  seconds: number;
  settings: string[];
}

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

/** Turn a session plan into the queue rows the Today screen shows, in the design's language. */
export function buildQueue(child: Child, plan: SessionPlan, scaleId?: ScaleId): QueueItem[] {
  const scale: Scale = buildScale(scaleId ?? plan.scale);
  const keyName = scale.name.replace("#", "♯").replace("b", "♭");
  const s = child.settings;
  const reading = LEVELS[Math.max(0, Math.min(9, s.readingLevel - 1))];
  const rhythm = RHYTHM_LEVELS[Math.max(0, Math.min(9, s.rhythmLevel - 1))];
  const rows: Record<BlockType, Omit<QueueItem, "index" | "duration" | "seconds" | "type">> = {
    scales: { title: `Warm-up — ${keyName}, two octaves`, detail: "Hands separately, then together", settings: ["72BPM"] },
    rhythm: { title: `Timing — ${rhythm.title.toLowerCase()}`, detail: `Level ${s.rhythmLevel} · tap or play`, settings: [`${rhythm.bpm}BPM`, `L${s.rhythmLevel}`] },
    reading: { title: `Sight reading — level ${s.readingLevel}`, detail: `${reading.hands === "together" ? "Hands together" : reading.hands === "alternating" ? "Alternating hands" : reading.hands === "LH" ? "Left hand" : "Right hand"} · ${3 - s.noStopStreak} clean run${3 - s.noStopStreak === 1 ? "" : "s"} from promotion`, settings: [`${reading.tempo}BPM`, `${reading.bars} BARS`] },
    theory: { title: "Harmony — hear it, then find it", detail: `I, IV, V and vi in ${keyName.replace(/ (major|minor|harmonic minor)$/, "")}`, settings: [`L${s.theoryLevel}`] },
    repertoire: { title: "Pieces", detail: "Your piece, then a lead sheet", settings: [] },
    improv: { title: "Play something of your own", detail: `Backing loop in ${keyName.replace(/ (major|minor|harmonic minor)$/, "")}`, settings: [] },
  };
  return orderedBlocks(child).map((type, i) => ({ type, index: i + 1, ...rows[type], seconds: plan.blockSeconds[type], duration: fmtClock(plan.blockSeconds[type]) }));
}
