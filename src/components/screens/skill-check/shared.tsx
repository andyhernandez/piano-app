"use client";
import * as React from "react";
import { Button, Headline, Icon, IconButton } from "@/components/ds";
import type { ChordsHeard, ScaleHeard } from "@/lib/types";

export type PartId = "ear" | "reading" | "pulse" | "scales" | "chords";
export const PARTS: PartId[] = ["ear", "reading", "pulse", "scales", "chords"];
export const PART_LABELS: Record<PartId, string> = { ear: "Ear", reading: "Reading", pulse: "Timing", scales: "Scales", chords: "Chords" };

export type EarStatus = "FIRST TRY" | "SECOND TRY" | "THIRD TRY" | "DIRECTION" | "MISSED" | "PLAYING" | "—";
export interface EarRow { phrase: number[]; notes: number; status: EarStatus; credit: number; tries: number }
export interface EarResult { score: number; rows: EarRow[]; firstOrSecond: number; total: number }

export interface ReadingLevelResult { level: number; total: number; right: number; matched: number; inTime: number; stopped: number; held: boolean }
export interface ReadingResult { score: number; heldLevel: number; stoppedAt: number | null; levels: ReadingLevelResult[]; startedAt: number }

export interface PulseResult { score: number; clickScore: number; clickBpm: number; meanOffsetMs: number; taps: number; expected: number; patternScores: number[] }

export interface ScalesResult { scales: ScaleHeard[]; selfReported: boolean }
export interface ChordsResult extends ChordsHeard { theoryLevel: number }

/** Shared props of the parts. */
export interface PartProps<T> { paused: boolean; onDone: (r: T) => void }

/**
 * The 78px header of a check part: a round close button, "Skill check", the five part pills (done mint with a
 * check, current indigo, the rest plain), then the clock and a round indigo pause.
 */
export function CheckChrome({ part, seconds, paused, onPause, onClose }: { part: PartId; seconds: number; paused: boolean; onPause: () => void; onClose: () => void }) {
  const idx = PARTS.indexOf(part);
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return (
    <div style={{ height: 78, flex: "none", display: "flex", alignItems: "center", gap: 18, padding: "0 30px", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)" }}>
      <IconButton icon="close" label="Leave the skill check" onClick={onClose} />
      <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600 }}>Skill check</span>
      <div style={{ display: "flex", gap: 6 }}>
        {PARTS.map((p, i) => {
          const done = i < idx, now = i === idx;
          return (
            <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderRadius: 999, fontSize: 14, fontWeight: 800, background: done ? "var(--kc-mint-wash)" : now ? "var(--kc-indigo)" : "var(--kc-plain-chip)", color: done ? "var(--kc-mint-ink)" : now ? "#ffffff" : "var(--kc-ink-muted)" }}>
              {done ? <Icon name="check" size={18} /> : <span>{i + 1}</span>}
              {PART_LABELS[p]}
            </span>
          );
        })}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, color: paused ? "var(--kc-ink-faint)" : "var(--kc-ink-muted)", fontVariantNumeric: "tabular-nums" }}>{m}:{String(s).padStart(2, "0")}</span>
        <IconButton icon={paused ? "play_arrow" : "pause"} variant="primary" label={paused ? "Resume" : "Pause"} onClick={onPause} />
      </div>
    </div>
  );
}

/** The paused state. The clock has stopped; leave or pick up. */
export function PausedPanel({ onResume, onLeave, hasProfile }: { onResume: () => void; onLeave: () => void; hasProfile: boolean }) {
  return (
    <div style={{ flex: 1, minHeight: 0, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Headline title="Paused." lede={hasProfile ? "The clock has stopped. Pick up where you were, or leave — the profile from last time stays as it is." : "The clock has stopped. Pick up where you were, or leave it for another day — today's plan uses an even split until then."} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Button icon="play_arrow" onClick={onResume}>Resume</Button>
        <Button variant="quiet" size="control" onClick={onLeave}>Skip for now</Button>
      </div>
    </div>
  );
}

/** The white bottom bar of a part: stat chips and a note on the left, the actions on the right. */
export function PartBar({ children, actions }: { children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ flex: "none", background: "var(--kc-panel)", borderTop: "2px solid var(--kc-hairline)", padding: "18px 32px", display: "flex", alignItems: "center", gap: 14 }}>
      {children}
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>{actions}</div>
    </div>
  );
}

/** "once", "twice", "3×", "—". */
export function timesWord(n: number): string {
  if (n <= 0) return "—";
  if (n === 1) return "once";
  if (n === 2) return "twice";
  return `${n}×`;
}

/** "G — A — B" from note names. */
export function joinNotes(names: string[]): string {
  return names.join(" — ");
}

/** A card in the check's language. */
export const PANEL: React.CSSProperties = { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0, boxSizing: "border-box" };
export const SIDE: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, minHeight: 0 };
export const NOTE: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" };
export const CARD_TITLE: React.CSSProperties = { fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 };
