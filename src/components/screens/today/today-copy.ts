import type { BlockType, Child, PitchClass, ScaleId } from "@/lib/types";
import { BLOCK_ORDER } from "@/lib/types";
import type { SessionPlan } from "@/lib/store/app-store";
import { BASE_WEIGHTS } from "@/lib/engine/weights";
import { DISCIPLINE } from "@/lib/engine/record";
import { pcIndex } from "@/lib/music/notes";

/** What Tick says at the top of Today: the one reason behind today's weighting, in plain second person. */
export function weightingReason(child: Child, plan: SessionPlan, teacherName: string | null, hasNote: boolean): string {
  const profile = child.skillProfile;
  if (child.settings.weightsOverride) return "This is the plan you shaped yourself. Change anything from the queue.";
  if (!profile) return "No skill check yet, so every stop gets an even share. The grown-ups page can start one any time.";
  const extra = BLOCK_ORDER.map((b) => ({ b, d: plan.weights[b] - BASE_WEIGHTS[b] })).sort((x, y) => y.d - x.d)[0];
  const scores: Partial<Record<BlockType, { score: number; what: string }>> = {
    reading: { score: profile.eye, what: "reading" },
    rhythm: { score: profile.pulse, what: "timing" },
    ear: { score: profile.ear, what: "ear" },
    theory: { score: profile.ear, what: "ear" },
  };
  const hit = extra && extra.d > 0.02 ? scores[extra.b] : undefined;
  if (hit) {
    const name = DISCIPLINE[extra.b].title.toLowerCase();
    const lowest = Math.min(profile.ear, profile.eye, profile.pulse);
    const why = hit.score === lowest ? `your ${hit.what} score was the lowest in the skill check` : `your ${hit.what} score was ${hit.score} in the skill check`;
    return `${name.charAt(0).toUpperCase() + name.slice(1)} gets a bit more time today, because ${why}.`;
  }
  if (hasNote && teacherName) return `${teacherName} left a note for today — it's on the right. The stops are shared out evenly.`;
  return "Your three scores are close, so every stop gets about the same time today.";
}

const SHARPS: PitchClass[] = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
const FLATS: PitchClass[] = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B"];
const COUNT = ["No sharps or flats", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];

/** "One sharp", "Two flats", "No sharps or flats" for a key. Minor keys read their relative major. */
export function keySignatureWords(scale: ScaleId): string {
  const majorIndex = scale.mode === "major" ? pcIndex(scale.key) : (pcIndex(scale.key) + 3) % 12;
  const sharp = SHARPS.findIndex((p) => pcIndex(p) === majorIndex);
  const flat = FLATS.findIndex((p) => pcIndex(p) === majorIndex);
  if (sharp === 0 || flat === 0) return COUNT[0];
  if (sharp > 0 && (flat < 0 || sharp <= flat)) return `${COUNT[sharp]} sharp${sharp === 1 ? "" : "s"}`;
  if (flat > 0) return `${COUNT[flat]} flat${flat === 1 ? "" : "s"}`;
  return COUNT[0];
}
