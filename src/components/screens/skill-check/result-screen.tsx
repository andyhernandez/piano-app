"use client";
import * as React from "react";
import { Button, MeterRow, SectionLabel, keyLabel } from "@/components/ds";
import { deriveWeights, blockDurations } from "@/lib/engine/weights";
import { DISCIPLINE } from "@/lib/engine/record";
import { buildScale, prefersFlats } from "@/lib/music/scales";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { BLOCK_ORDER, type ScaleId, type SkillProfile } from "@/lib/types";
import { capitalize, numberWord } from "../onboarding/chrome";
import type { EarResult, PulseResult, ReadingResult } from "./shared";

function headlineFor(p: SkillProfile): string {
  const axes = [
    { id: "ear", v: p.ear, good: "A good ear", slow: "a slower ear" },
    { id: "eye", v: p.eye, good: "A quick eye", slow: "a slower eye" },
    { id: "pulse", v: p.pulse, good: "A steady pulse", slow: "an unsteady pulse" },
  ];
  const sorted = [...axes].sort((a, b) => b.v - a.v);
  const top = sorted[0], low = sorted[2];
  const block = low.id === "ear" ? "Harmony" : low.id === "eye" ? "Reading" : "Timing";
  if (top.v - low.v < 12) return "Three even numbers. The time splits evenly.";
  return `${top.good}, ${low.slow}. ${block} gets the time.`;
}

function dateWords(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/** B3 · The result. Three numbers, no total; how the minutes divide; the starting key. */
export function ResultScreen({ name, profile, minutes, scale: scaleId, seconds, ear, reading, pulse, onToday }: { name: string; profile: SkillProfile; minutes: number; scale: ScaleId; seconds: number; ear: EarResult | null; reading: ReadingResult | null; pulse: PulseResult | null; onToday: () => void }) {
  const weights = deriveWeights(profile);
  const secs = blockDurations(weights, minutes);
  const rows = [...BLOCK_ORDER].sort((a, b) => weights[b] - weights[a]);
  const scale = buildScale(scaleId);
  const key = keyLabel(scale.key, scale.mode);
  const lowest = Math.min(profile.ear, profile.eye, profile.pulse);
  const tone = (v: number) => (v === lowest && v < 50 ? "clay" : "mint");
  const mm = Math.floor(seconds / 60), ss = seconds % 60;

  const earLine = ear ? `${capitalize(numberWord(ear.firstOrSecond))} of ${numberWord(ear.total)} phrases back on the first or second hearing.` : "Not taken this time.";
  const readingLine = reading
    ? reading.heldLevel === 0 ? "Level 1 is where it stopped; the page is the thing to spend time on."
      : (() => { const l = reading.levels.find((r) => r.level === reading.heldLevel) ?? reading.levels[reading.levels.length - 1]; return `Level ${reading.heldLevel} held; ${l && l.right > l.inTime ? "notes were right more often than they were in time" : "in time as often as right"}.`; })()
    : "Not taken this time.";
  const pulseLine = pulse
    ? `${pulse.clickScore >= 70 ? "Steady" : "Uneven"} at ${pulse.clickBpm}${pulse.meanOffsetMs ? `, ${Math.abs(pulse.meanOffsetMs)} ms ${pulse.meanOffsetMs < 0 ? "ahead of" : "behind"} the beat on average` : ", right on the beat"}.`
    : "Not taken this time.";

  const acc = scale.accidentals;
  const flats = prefersFlats(scaleId);
  const firstAccidental = scale.notes.find((n) => n.includes("#") || n.includes("b"));
  const keyLine = acc === 0
    ? "No sharps or flats — the first key on the roadmap. G major follows it."
    : `${capitalize(numberWord(Math.abs(acc)))} ${acc > 0 ? "sharp" : "flat"}${Math.abs(acc) === 1 ? "" : "s"}${firstAccidental && profile.ear >= 60 ? `, and you already found ${prettyPc(midiToPc(scale.midiOneOctave[scale.notes.indexOf(firstAccidental)], flats))} by ear` : ""}. C major would waste a week.`;

  return (
    <>
      <div style={{ height: 72, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 22, padding: "0 34px" }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>KeyCadence</span>
        <SectionLabel>Skill check · done</SectionLabel>
        <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--kc-ink-dim)" }}>{name} · {dateWords(profile.assessedAt)} · {mm} minute{mm === 1 ? "" : "s"} {ss} second{ss === 1 ? "" : "s"}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 38, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>{headlineFor(profile)}</h1>
            <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>This isn&apos;t a grade and it isn&apos;t stored as one. It sets how today&apos;s {numberWord(minutes)} minutes get divided, and it re-runs every four weeks.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 22 }}>
            <SectionLabel>Where you are</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {[{ label: "Ear", v: profile.ear, line: earLine }, { label: "Reading", v: profile.eye, line: readingLine }, { label: "Timing", v: profile.pulse, line: pulseLine }].map((r) => (
                <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <MeterRow label={r.label} value={r.v} tone={tone(r.v)} labelWidth={86} />
                  <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", paddingLeft: 97 }}>{r.line}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "auto 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-faint)" }}>Three numbers, no total. There is no single score for playing the piano.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
            <div style={{ background: "var(--kc-mint-wash)", border: "1px solid var(--kc-mint-edge)", borderRadius: 11, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
              <SectionLabel>So your {numberWord(minutes)} minutes become</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {rows.map((b) => { const m = Math.max(1, Math.round(secs[b] / 60)); return <MeterRow key={b} label={DISCIPLINE[b].title} value={Math.round(weights[b] * 100)} suffix={`${m} minute${m === 1 ? "" : "s"}`} labelWidth={86} />; })}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionLabel>Starting key</SectionLabel>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{key}</div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>{keyLine}</p>
              <div style={{ marginTop: "auto" }}>
                <Button icon="play_arrow" style={{ width: "100%" }} onClick={onToday}>See today&apos;s session</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
