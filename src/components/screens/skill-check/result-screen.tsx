"use client";
import * as React from "react";
import { Button, Headline, Logo, MeterRow, Tick, keyLabel } from "@/components/ds";
import { deriveWeights, blockDurations } from "@/lib/engine/weights";
import { DISCIPLINE } from "@/lib/engine/record";
import { buildScale, prefersFlats } from "@/lib/music/scales";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { BLOCK_ORDER, type ScaleId, type SkillProfile } from "@/lib/types";
import { capitalize, numberWord } from "../onboarding/chrome";
import type { ChordsResult, EarResult, PulseResult, ReadingResult, ScalesResult } from "./shared";

function headlineFor(p: SkillProfile): string {
  const axes = [
    { id: "ear", v: p.ear, good: "A good ear", slow: "a slower ear" },
    { id: "eye", v: p.eye, good: "A quick eye", slow: "a slower eye" },
    { id: "pulse", v: p.pulse, good: "A steady pulse", slow: "an unsteady pulse" },
  ];
  const sorted = [...axes].sort((a, b) => b.v - a.v);
  const top = sorted[0], low = sorted[2];
  const block = low.id === "ear" ? "Ear" : low.id === "eye" ? "Reading" : "Timing";
  if (top.v - low.v < 12) return "Three even numbers. The time splits evenly.";
  return `${top.good}, ${low.slow}. ${block} gets the time.`;
}

/** B6 · The result. Three numbers, no total; how the minutes divide across seven stops; the starting key. */
export function ResultScreen({ name, profile, minutes, scale: scaleId, seconds, ear, reading, pulse, scales, chords, onToday }: { name: string; profile: SkillProfile; minutes: number; scale: ScaleId; seconds: number; ear: EarResult | null; reading: ReadingResult | null; pulse: PulseResult | null; scales: ScalesResult | null; chords: ChordsResult | null; onToday: () => void }) {
  const weights = deriveWeights(profile);
  const secs = blockDurations(weights, minutes);
  const rows = [...BLOCK_ORDER].filter((b) => b !== "improv").sort((a, b) => weights[b] - weights[a]);
  const scale = buildScale(scaleId);
  const key = keyLabel(scale.key, scale.mode);
  const lowest = Math.min(profile.ear, profile.eye, profile.pulse);
  const tone = (v: number) => (v === lowest && v < 50 ? "indigo" : "mint");
  const mm = Math.floor(seconds / 60), ss = seconds % 60;

  const earLine = ear ? `${capitalize(numberWord(ear.firstOrSecond))} of ${numberWord(ear.total)} phrases back on the first or second hearing.` : "Not taken this time.";
  const readingLine = reading
    ? reading.heldLevel === 0 ? "Level 1 is where it stopped; the page is the thing to spend time on."
      : (() => { const l = reading.levels.find((r) => r.level === reading.heldLevel) ?? reading.levels[reading.levels.length - 1]; return `Level ${reading.heldLevel} held — ${l && l.right > l.inTime ? "notes were right more often than in time" : "in time as often as right"}.`; })()
    : "Not taken this time.";
  const pulseLine = pulse
    ? `${pulse.clickScore >= 70 ? "Steady" : "Uneven"} at ${pulse.clickBpm}${pulse.meanOffsetMs ? `, ${Math.abs(pulse.meanOffsetMs)} ms ${pulse.meanOffsetMs < 0 ? "ahead of" : "behind"} the beat on average` : ", right on the beat"}.`
    : "Not taken this time.";

  // The starting key: the scale actually played when there was one, otherwise the roadmap's.
  const played = scales?.scales.filter((s) => s.key === scale.key && s.mode === scale.mode)[0] ?? null;
  const acc = scale.accidentals;
  const flats = prefersFlats(scaleId);
  const firstAccidental = scale.notes.find((n) => n.includes("#") || n.includes("b"));
  const accidentalName = firstAccidental ? prettyPc(midiToPc(scale.midiOneOctave[scale.notes.indexOf(firstAccidental)], flats)) : null;
  const harmonyLevel = chords?.theoryLevel ?? 1;
  const harmonyLine = harmonyLevel >= 3 ? `Harmony starts at level ${harmonyLevel}: C and G were already there.` : harmonyLevel === 2 ? `Harmony starts at level 2: ${chords?.heard[0] ?? "C"} was already there.` : "Harmony starts at level 1, with C.";
  const keyLine = played && !played.selfReported
    ? `You played it ${played.evenMs <= 40 ? "evenly" : "up and back"} at ${played.bpm}${accidentalName && profile.ear >= 60 ? ` and found ${accidentalName} by ear` : ""} — ${acc === 0 ? "so that's where the roadmap starts" : "C major would waste a week"}. ${harmonyLine}`
    : played?.selfReported
      ? `You said you know it, so that's where the roadmap starts. ${harmonyLine}`
      : acc === 0
        ? `No sharps or flats — the first key on the roadmap. G major follows it. ${harmonyLine}`
        : `${capitalize(numberWord(Math.abs(acc)))} ${acc > 0 ? "sharp" : "flat"}${Math.abs(acc) === 1 ? "" : "s"}${accidentalName && profile.ear >= 60 ? `, and you already found ${accidentalName} by ear` : ""}. ${harmonyLine}`;

  return (
    <>
      <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 22, padding: "0 30px" }}>
        <Logo href={null} />
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>Skill check · done</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-faint)" }}>{name} · {mm} minute{mm === 1 ? "" : "s"} {ss} second{ss === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
          <div style={{ flex: 1 }}>
            <Headline title={headlineFor(profile)} lede={<>This isn&apos;t a grade, and it isn&apos;t kept as one. It decides how your {numberWord(minutes)} minutes get shared out — and it runs again in four weeks.</>} />
          </div>
          <Tick mood="cheer" />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>Where you are</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[{ label: "Ear", v: profile.ear, line: earLine }, { label: "Reading", v: profile.eye, line: readingLine }, { label: "Timing", v: profile.pulse, line: pulseLine }].map((r) => (
                <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <MeterRow label={r.label} value={r.v} tone={tone(r.v)} labelWidth={86} />
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{r.line}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-faint)", marginTop: "auto" }}>Three numbers, no total. There&apos;s no single score for playing the piano.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
            <div style={{ background: "var(--kc-indigo-wash)", borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>So your {numberWord(minutes)} minutes become</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
                {rows.map((b) => { const m = Math.max(1, Math.round(secs[b] / 60)); return <MeterRow key={b} label={DISCIPLINE[b].title} value={Math.round(weights[b] * 100)} max={Math.max(35, Math.round(weights[rows[0]] * 100))} suffix={`${m} min`} labelWidth={96} />; })}
              </div>
            </div>
            <div style={{ background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 56, height: 56, flex: "none", borderRadius: 16, background: "var(--kc-indigo)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 30, fontWeight: 600 }}>{prettyPc(scale.key)}</span>
                <div>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 21, fontWeight: 600, lineHeight: 1.15 }}>Starting in {key}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{keyLine}</div>
                </div>
              </div>
              <Button size="control" icon="play_arrow" onClick={onToday} style={{ alignSelf: "flex-start" }}>See today&apos;s session</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

