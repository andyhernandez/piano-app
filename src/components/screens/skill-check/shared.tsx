"use client";
import * as React from "react";
import { BlockHeader, Button, Clock, Headline, ProgressStrip } from "@/components/ds";

export type PartId = "ear" | "reading" | "pulse";
export const PARTS: PartId[] = ["ear", "reading", "pulse"];

export type EarStatus = "FIRST TRY" | "SECOND TRY" | "THIRD TRY" | "DIRECTION" | "MISSED" | "PLAYING" | "—";
export interface EarRow { phrase: number[]; notes: number; status: EarStatus; credit: number; tries: number }
export interface EarResult { score: number; rows: EarRow[]; firstOrSecond: number; total: number }

export interface ReadingLevelResult { level: number; total: number; right: number; matched: number; inTime: number; stopped: number; held: boolean }
export interface ReadingResult { score: number; heldLevel: number; stoppedAt: number | null; levels: ReadingLevelResult[] }

export interface PulseResult { score: number; clickScore: number; clickBpm: number; meanOffsetMs: number; taps: number; expected: number; patternScores: number[] }

/** Shared props of the three parts. */
export interface PartProps<T> { paused: boolean; onDone: (r: T) => void }

/** Header of a check part: SKILL CHECK · n OF 3 · title · meta … clock · Pause, then the mint strip. */
export function CheckChrome({ index, title, meta, seconds, progress, paused, onPause }: { index: number; title: string; meta: string; seconds: number; progress: number; paused: boolean; onPause: () => void }) {
  return (
    <>
      <BlockHeader label={`Skill check · ${index} of ${PARTS.length}`} title={title} meta={meta} right={<><Clock seconds={seconds} dim={paused} /><Button variant="secondary" size="control" onClick={onPause}>{paused ? "Resume" : "Pause"}</Button></>} />
      <ProgressStrip value={progress} dim={paused} />
    </>
  );
}

/** The paused state. The clock has stopped; leave or pick up. */
export function PausedPanel({ onResume, onLeave, hasProfile }: { onResume: () => void; onLeave: () => void; hasProfile: boolean }) {
  return (
    <div style={{ flex: 1, minHeight: 0, padding: "34px 38px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Headline size={34} title="Paused." lede={hasProfile ? "The clock has stopped. Pick up where you were, or leave — the profile from last time stays as it is." : "The clock has stopped. Pick up where you were, or leave it for another day — today's plan uses an even split until then."} />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Button icon="play_arrow" onClick={onResume}>Resume</Button>
        <Button variant="quiet" size="control" onClick={onLeave}>Skip for now</Button>
      </div>
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

/** "G — A — B" from midi notes. */
export function joinNotes(names: string[]): string {
  return names.join(" — ");
}

/** A panel in the check's language. */
export const PANEL: React.CSSProperties = { background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 20, minHeight: 0 };
export const SIDE: React.CSSProperties = { background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 };
