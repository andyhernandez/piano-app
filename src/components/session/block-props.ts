import type { BlockResult, BlockType, Child, InputMode, Scale } from "@/lib/types";

/**
 * Every block component receives these props from the session runner and must call `onComplete` when the
 * kid presses "Done" (or the block auto-completes). Blocks manage their own inner UI; the shell renders
 * the title, countdown, rules banner and the Done button via `BlockShell`.
 */
export interface BlockComponentProps {
  child: Child;
  scale: Scale;
  /** Seconds allotted from the session plan. */
  plannedSec: number;
  inputMode: InputMode;
  /** Whether the countdown is running (false while a modal/interstitial is up). */
  running: boolean;
  /** Called when the block is finished. `partial` may carry midiScore, recordingId, details, notes. */
  onComplete: (partial?: Partial<Pick<BlockResult, "midiScore" | "recordingId" | "details" | "notes">>) => void;
  /** Seconds remaining, provided by the runner so blocks can react to the countdown. */
  remainingSec: number;
  /** Ask the runner to extend the block (e.g. +1 minute). */
  addSeconds: (s: number) => void;
}

export interface BlockDefinition {
  type: BlockType;
  title: string;
  emoji: string;
  /** Rules pinned on screen for this block. */
  rules: string[];
  /** Short kid-facing intro shown on the interstitial card. */
  intro: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDefinition> = {
  scales: { type: "scales", title: "Warm-up & Scale Gym", emoji: "🏋️", rules: ["Sit tall, relaxed wrists", "Follow the fingering numbers", "Stay with the click"], intro: "Wake up your fingers with the scale of the week." },
  rhythm: { type: "rhythm", title: "Rhythm Lab", emoji: "🥁", rules: ["Feel the pulse first", "Tap big and clear", "Keep going if you slip"], intro: "Tap along and echo rhythms back." },
  reading: { type: "reading", title: "Sight Reading Launchpad", emoji: "🚀", rules: ["No listening first", "Keep going through mistakes", "Eyes on the page"], intro: "Read a brand-new piece straight off the page." },
  theory: { type: "theory", title: "Theory & Chord Lab", emoji: "🧪", rules: ["Listen, then look", "Find it on the staff", "Both halves count"], intro: "Hear chords and intervals, then find them." },
  repertoire: { type: "repertoire", title: "Repertoire & Lead Sheets", emoji: "🎼", rules: ["Split your time: piece, then lead sheet", "Slow and correct beats fast and messy", "Loop the tricky bar"], intro: "Work on your piece and a lead sheet." },
  improv: { type: "improv", title: "Creative Sandbox", emoji: "🎨", rules: ["There are no wrong notes here", "Stay in the safe zone if you like", "Save anything you love"], intro: "Jam over a backing loop in the key of the week." },
};
