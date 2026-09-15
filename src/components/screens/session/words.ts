import type { BlockResult, BlockType, Session } from "@/lib/types";
import { LEVELS } from "@/lib/generator/sightreading";
import { RHYTHM_LEVELS } from "@/lib/generator/rhythm";

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** "twenty-two"; falls back to digits past ninety-nine. */
export function numberWord(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 20) return ONES[v];
  if (v < 100) return TENS[Math.floor(v / 10)] + (v % 10 ? `-${ONES[v % 10]}` : "");
  return String(v);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

export function handsText(hands: string | undefined): string {
  return hands === "together" ? "hands together" : hands === "alternating" ? "alternating hands" : hands === "LH" ? "left hand" : "right hand";
}

export function readingSpec(level: number) {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.round(level) - 1))];
}

export function rhythmSpec(level: number) {
  return RHYTHM_LEVELS[Math.max(0, Math.min(RHYTHM_LEVELS.length - 1, Math.round(level) - 1))];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The mono headline of a block for the log: "CLEAN · 84 BPM", "LEVEL 4 HELD", "22 MS EARLY". */
export function blockHeadline(r: BlockResult): { text: string; marked: boolean } {
  const d = r.details ?? {};
  if (r.skipped) return { text: "SKIPPED", marked: false };
  if (typeof d.headline === "string" && d.headline) return { text: d.headline, marked: !!r.midiScore?.badge };
  switch (r.type) {
    case "scales": {
      const bpm = num(d.tempoBest) ?? num(d.bpm);
      if (r.midiScore?.badge === "clean-scale" && bpm) return { text: `CLEAN · ${bpm} BPM`, marked: true };
      const clean = num(d.clean);
      const runs = num(d.runs);
      if (clean != null && runs != null && runs > 0) return { text: `${clean} / ${runs} CLEAN`, marked: false };
      break;
    }
    case "rhythm": {
      const ahead = num(d.aheadMs);
      if (ahead != null && ahead !== 0) return { text: `${Math.abs(ahead)} MS ${ahead > 0 ? "EARLY" : "LATE"}`, marked: r.midiScore?.badge === "steady-pulse" };
      if (r.midiScore?.badge === "steady-pulse") return { text: "STEADY", marked: true };
      break;
    }
    case "reading": {
      const level = num(d.level);
      if (d.promoted && level != null) return { text: `LEVEL ${level} UP`, marked: true };
      if (r.midiScore?.badge === "no-stop-reading" && level != null) return { text: `LEVEL ${level} HELD`, marked: true };
      if (level != null) return { text: `LEVEL ${level}`, marked: false };
      break;
    }
  }
  if (!r.completed) return { text: "PARTIAL", marked: false };
  if (r.inputMode === "timer") return { text: "TIMER", marked: false };
  return { text: "DONE", marked: false };
}

export function resultOf(session: Session, type: BlockType): BlockResult | undefined {
  return session.blocks.find((b) => b.type === type);
}
