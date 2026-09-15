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

/** Turn a session plan into the six queue rows the Today screen shows, in the design's language. */
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
  return BLOCK_ORDER.map((type, i) => ({ type, index: i + 1, ...rows[type], seconds: plan.blockSeconds[type], duration: fmtClock(plan.blockSeconds[type]) }));
}
