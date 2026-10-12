"use client";
import * as React from "react";
import { Button, Icon, Instruction, Keyboard, PianoStrip, Pill, StatChip, type PianoStripLit } from "@/components/ds";
import { useInput } from "@/lib/hooks/use-input";
import { buildScale, prefersFlats, scaleName } from "@/lib/music/scales";
import { FLAT_NAMES, SHARP_NAMES, isBlackKey, midiToPc, pcIndex, prettyPc } from "@/lib/music/notes";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import type { Experience, PitchClass, ScaleHeard, ScaleId, ScaleMode } from "@/lib/types";
import { CARD_TITLE, NOTE, PANEL, PartBar, type PartProps, type ScalesResult } from "./shared";

const INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
};
const MODES: ScaleMode[] = ["major", "natural-minor", "harmonic-minor"];
/** A scale is over when the keys have been quiet this long. */
const SILENCE_MS = 1400;
const MIN_NOTES = 7;
/** Keys the timer-only player can tick off. */
const SELF_REPORT: ScaleId[] = [{ key: "C", mode: "major" }, { key: "G", mode: "major" }, { key: "D", mode: "major" }, { key: "F", mode: "major" }, { key: "A", mode: "natural-minor" }];

/** Where the reading ladder starts, by how long the player has played. */
export function readingStartFor(e: Experience | undefined): number {
  switch (e) {
    case "under-year": return 2;
    case "one-to-three": return 3;
    case "more-than-three": return 5;
    case "returning": return 3;
    default: return 1;
  }
}

/** "No sharps or flats", "One sharp", "Two flats" — the hint under a scale's name. */
function accidentalWord(id: ScaleId): string {
  const acc = buildScale(id).accidentals;
  const n = Math.abs(acc);
  if (n === 0) return "No sharps or flats";
  return `${["", "One", "Two", "Three", "Four", "Five", "Six"][n] ?? n} ${acc > 0 ? "sharp" : "flat"}${n === 1 ? "" : "s"}`;
}

interface Played { midi: number; time: number }

/** Which key and mode the played notes belong to: every played pitch class in the scale, and most of the scale played. */
function detectScale(notes: Played[]): ScaleId | null {
  const pcs = new Set(notes.map((n) => ((n.midi % 12) + 12) % 12));
  if (pcs.size < 5) return null;
  const first = ((notes[0].midi % 12) + 12) % 12;
  const low = Math.min(...notes.map((n) => n.midi));
  const lowPc = ((low % 12) + 12) % 12;
  let best: { id: ScaleId; score: number } | null = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of MODES) {
      const set = new Set(INTERVALS[mode].map((i) => (tonic + i) % 12));
      let outside = 0;
      for (const p of pcs) if (!set.has(p)) outside++;
      if (outside > 0) continue;
      const covered = [...set].filter((p) => pcs.has(p)).length;
      let score = covered * 10;
      if (tonic === first) score += 6;
      if (tonic === lowPc) score += 6;
      if (mode === "major") score += 2; else if (mode === "natural-minor") score += 1;
      if (!best || score > best.score) {
        const flats = [1, 3, 5, 8, 10].includes(tonic) && !(tonic === 10 && mode !== "major") ? true : false;
        const name = (flats ? FLAT_NAMES : SHARP_NAMES)[tonic];
        best = { id: { key: name, mode }, score };
      }
    }
  }
  return best ? best.id : null;
}

/** Pick the usual spelling for a tonic once the mode is known (B♭ major but A♯ never; F♯ minor, not G♭). */
function spell(id: ScaleId): ScaleId {
  const idx = pcIndex(id.key);
  const flatsMajor = [1, 3, 5, 8, 10];
  const flatsMinor = [1, 3, 5, 10];
  const useFlats = id.mode === "major" ? flatsMajor.includes(idx) : flatsMinor.includes(idx);
  return { key: (useFlats ? FLAT_NAMES : SHARP_NAMES)[idx] as PitchClass, mode: id.mode };
}

function analyse(notes: Played[]): ScaleHeard | null {
  const id = detectScale(notes);
  if (!id) return null;
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].time - sorted[i - 1].time);
  const steady = gaps.filter((g) => g > 60 && g < 2000);
  const med = [...steady].sort((a, b) => a - b)[Math.floor(steady.length / 2)] ?? 500;
  const sd = steady.length ? Math.sqrt(steady.reduce((s, g) => s + (g - med) ** 2, 0) / steady.length) : 0;
  const below = sorted.filter((n) => n.midi < 60).length;
  const together = gaps.filter((g) => g <= 60).length;
  const hand: ScaleHeard["hand"] = together >= sorted.length / 4 ? "both" : below > sorted.length / 2 ? "LH" : "RH";
  const spelled = spell(id);
  return { key: spelled.key, mode: spelled.mode, hand, bpm: Math.round(60_000 / med), evenMs: Math.round(sd) };
}

function stripIndex(midi: number, from: number, keys: number): number | null {
  if (isBlackKey(midi) || midi < from) return null;
  let i = 0;
  for (let m = from; m < midi; m++) if (!isBlackKey(m)) i++;
  return i < keys ? i : null;
}

/**
 * B4 · Scales. "Play any scale you know." The notes are read from MIDI (or the keys below), the key and mode are
 * worked out from the pitch classes, and each note's evenness is measured. Nothing here is marked wrong: the
 * result only decides the starting key and how fast the technique stop begins.
 */
export function ScalesPart({ scale: roadmapScale, paused, onDone }: PartProps<ScalesResult> & { scale: ScaleId }) {
  const [heard, setHeard] = React.useState<ScaleHeard[]>([]);
  const [notes, setNotes] = React.useState<Played[]>([]);
  const [lastGaps, setLastGaps] = React.useState<number[]>([]);
  const [lastNotes, setLastNotes] = React.useState<number[]>([]);
  const [picked, setPicked] = React.useState<string[]>([]);
  const notesRef = React.useRef<Played[]>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = React.useRef(paused);
  React.useEffect(() => { pausedRef.current = paused; });
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const settle = React.useCallback(() => {
    const played = notesRef.current;
    if (played.length < MIN_NOTES) return;
    const result = analyse(played);
    notesRef.current = [];
    setNotes([]);
    if (!result) { setLastNotes([]); return; }
    const sorted = [...played].sort((a, b) => a.time - b.time);
    setLastGaps(sorted.slice(1).map((n, i) => n.time - sorted[i].time));
    setLastNotes(sorted.map((n) => n.midi));
    setHeard((h) => [...h.filter((s) => !(s.key === result.key && s.mode === result.mode)), result]);
  }, []);

  const { tap, mode } = useInput({
    onNote: (e) => {
      if (e.kind !== "on" || pausedRef.current) return;
      notesRef.current = [...notesRef.current, { midi: e.midi, time: e.time }];
      setNotes(notesRef.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(settle, SILENCE_MS);
    },
  });

  const timerOnly = mode === "timer";
  // On the timer nothing is heard, so the side column lists what has been ticked instead.
  const listed: ScaleHeard[] = timerOnly
    ? SELF_REPORT.filter((s) => picked.includes(`${s.key}-${s.mode}`)).map((s) => ({ key: s.key, mode: s.mode, hand: "RH", bpm: 60, evenMs: 0, selfReported: true }))
    : heard;
  const latest = heard[heard.length - 1] ?? null;
  const latestScale = latest ? buildScale({ key: latest.key, mode: latest.mode }) : null;
  const flats = latest ? prefersFlats({ key: latest.key, mode: latest.mode }) : false;

  // The strip: the latest scale's octave lit mint with its fingering, the heaviest note lilac.
  const lit: PianoStripLit = { whites: {}, blacks: {}, labels: {} };
  let heavy: number | null = null;
  let heavyName = "";
  const upGaps = lastGaps.slice(0, Math.max(0, Math.ceil(lastNotes.length / 2) - 1));
  if (upGaps.length >= 3) {
    const med = [...upGaps].sort((a, b) => a - b)[Math.floor(upGaps.length / 2)];
    let worst = 0, wi = -1;
    upGaps.forEach((g, i) => { if (g - med > worst) { worst = g - med; wi = i; } });
    if (wi >= 0 && worst > med * 0.3) { heavy = lastNotes[wi + 1]; heavyName = prettyPc(midiToPc(heavy, flats)); }
  }
  // The strip starts on the C below the lowest note played, so the scale sits inside its fifteen keys.
  const lowest = latestScale ? Math.min(latestScale.midiOneOctave[0], ...(lastNotes.length ? lastNotes : [60])) : 60;
  const base = Math.max(36, lowest - (((lowest % 12) + 12) % 12));
  if (latestScale) {
    latestScale.midiOneOctave.forEach((m, i) => {
      const color = m === heavy ? "var(--kc-lilac)" : "var(--kc-mint)";
      const label = String(latestScale.fingeringRH[i] ?? "");
      const w = stripIndex(m, base, 15);
      if (w !== null) { lit.whites![w] = color; lit.labels![w] = label; }
      else if (isBlackKey(m)) { const b = stripIndex(m - 1, base, 15); if (b !== null) lit.blacks![b] = m === heavy ? "var(--kc-indigo)" : "var(--kc-mint-ink)"; }
    });
  } else {
    notes.forEach((n) => { const w = stripIndex(n.midi, 48, 15); if (w !== null) lit.whites![w] = "var(--kc-indigo-wash)"; });
  }

  // Per-note bars, going up: the gap into each note against the median.
  const bars = latestScale && upGaps.length >= 3 ? (() => {
    const med = [...upGaps].sort((a, b) => a - b)[Math.floor(upGaps.length / 2)];
    return lastNotes.slice(0, upGaps.length + 1).map((m, i) => ({ name: prettyPc(midiToPc(m, flats)), pct: i === 0 ? 62 : Math.max(30, Math.min(100, Math.round(60 * (upGaps[i - 1] / med)))), heavy: m === heavy && i > 0 }));
  })() : null;

  const handWord = (h: ScaleHeard["hand"]) => (h === "both" ? "Both hands" : h === "LH" ? "Left hand" : "Right hand");
  const suggestion = (() => {
    const known = new Set(heard.map((s) => `${s.key}-${s.mode}`));
    const next = DEFAULT_ROADMAP.find((s) => !known.has(`${s.key}-${s.mode}`) && !(s.key === roadmapScale.key && s.mode === roadmapScale.mode)) ?? DEFAULT_ROADMAP.find((s) => !known.has(`${s.key}-${s.mode}`));
    if (!next) return null;
    const b = buildScale(next);
    const acc = Math.abs(b.accidentals);
    const word = acc === 0 ? "No sharps or flats" : `${["", "One", "Two", "Three", "Four", "Five", "Six"][acc] ?? acc} ${b.accidentals > 0 ? "sharp" : "flat"}${acc === 1 ? "" : "s"}`;
    return { name: scaleName(next), word };
  })();

  const finish = () => {
    if (timer.current) clearTimeout(timer.current);
    if (timerOnly) {
      onDone({ scales: listed, selfReported: true });
      return;
    }
    onDone({ scales: heard, selfReported: false });
  };

  const instruction = timerOnly
    ? "On the timer we can't hear a scale — tick the ones you know."
    : latest ? `That was ${scaleName({ key: latest.key, mode: latest.mode })}. Play another, or say that's all.` : notes.length ? "Listening… keep going to the top and back." : "Play any scale you know — up and back, either hand.";

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, padding: "24px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          <Instruction>{instruction}</Instruction>
          {timerOnly ? (
            <div style={{ ...PANEL, flex: 1 }}>
              <div style={CARD_TITLE}>Which scales can you play, hands separately?</div>
              <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridAutoRows: "1fr", gap: 12 }}>
                {SELF_REPORT.map((s) => {
                  const id = `${s.key}-${s.mode}`;
                  const on = picked.includes(id);
                  return (
                    <button key={id} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== id) : [...p, id]))} className="kc-press" style={{ minHeight: 86, padding: "14px 18px", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 4, textAlign: "left", cursor: "pointer", boxSizing: "border-box", ...(on ? { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: "0 4px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", color: "var(--kc-ink)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" }) }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>
                        {on && <Icon name="check" size={20} />}{scaleName(s)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: on ? "rgba(255,255,255,.82)" : "var(--kc-ink-faint)" }}>{accidentalWord(s)}</span>
                    </button>
                  );
                })}
              </div>
              <div style={NOTE}>Marked as your own answer, not measured. The scale stop starts gently either way.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 18, background: latest ? "var(--kc-mint-wash)" : "var(--kc-indigo-wash)", border: latest ? "3px solid var(--kc-mint)" : "3px solid var(--kc-lilac)", borderRadius: 22, padding: "18px 22px" }}>
                <span style={{ width: 64, height: 64, flex: "none", borderRadius: 18, background: latest ? "var(--kc-mint)" : "var(--kc-indigo)", color: latest ? "var(--kc-ink)" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600 }}>
                  {latest ? prettyPc(latest.key) : <Icon name="hearing" size={32} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 26, fontWeight: 600, lineHeight: 1.15 }}>{latest ? `That was ${scaleName({ key: latest.key, mode: latest.mode })}` : notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"} so far` : "Nothing heard yet"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: latest ? "var(--kc-mint-ink)" : "var(--kc-indigo-shadow)" }}>{latest ? `${handWord(latest.hand)} · up and back at ${latest.bpm} bpm` : "Any key, any speed. Start on the key note and come back down."}</div>
                </div>
                {latest && <Pill tone={latest.evenMs <= 40 ? "mint-fill" : "indigo"} icon={latest.evenMs <= 40 ? "check" : "speed"}>{latest.evenMs <= 40 ? "Even" : `Even to ${latest.evenMs} ms`}</Pill>}
              </div>
              {mode === "midi"
                ? <PianoStrip keys={15} height={140} lit={lit} />
                : <Keyboard from={48} to={72} height={140} disabled={paused} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} style={{ flex: "none" }} />}
              <div style={{ ...PANEL, flex: 1, padding: "16px 20px", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ ...CARD_TITLE, fontSize: 17 }}>How even each note was</div>
                  <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>going up</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 8 }}>
                  {bars ? bars.map((b, i) => (
                    <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "block", width: "100%", height: `${b.pct}%`, borderRadius: "10px 10px 4px 4px", background: b.heavy ? "var(--kc-lilac)" : "var(--kc-mint)", border: b.heavy ? "2px solid var(--kc-indigo)" : "none", boxSizing: "border-box" }} />
                      <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 14, fontWeight: 600, color: b.heavy ? "var(--kc-indigo)" : "var(--kc-ink-faint)" }}>{b.name}</span>
                    </div>
                  )) : <div style={{ ...NOTE, alignSelf: "center", width: "100%", textAlign: "center" }}>The bars fill in after a scale.</div>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-indigo-shadow)" }}>
                  {bars ? (heavy !== null ? `Smooth most of the way up — the ${heavyName} landed a little heavy, which is normal for a fourth finger.` : "Smooth all the way up. Nothing landed heavier than its neighbours.") : "Each bar is the gap into that note. A taller one means a longer wait."}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
          <div style={CARD_TITLE}>{timerOnly ? "Scales you've ticked" : "Scales we've heard"}</div>
          {listed.length === 0 && <div style={{ ...NOTE, padding: "10px 14px", borderRadius: 16, background: "var(--kc-cream)" }}>{timerOnly ? "Nothing ticked yet. Tick any you can play." : "Nothing yet. Up and back is enough."}</div>}
          {listed.map((s, i) => {
            const isLatest = i === listed.length - 1;
            return (
              <div key={`${s.key}-${s.mode}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 16, background: isLatest ? "var(--kc-indigo-wash)" : "var(--kc-mint-wash)", border: isLatest ? "2px solid var(--kc-indigo)" : "2px solid transparent" }}>
                <Icon name="check_circle" size={22} color={isLatest ? "var(--kc-indigo)" : "var(--kc-mint-ink)"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{scaleName({ key: s.key, mode: s.mode })}</div>
                  <div style={NOTE}>{s.selfReported ? "Your own answer" : `${handWord(s.hand)} · ${s.bpm} bpm`}</div>
                </div>
              </div>
            );
          })}
          {suggestion && !timerOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 16, border: "2px dashed var(--kc-border-dashed)" }}>
              <Icon name="add" size={22} color="var(--kc-ink-faint)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15, color: "var(--kc-ink-muted)" }}>{suggestion.name}?</div>
                <div style={{ ...NOTE, color: "var(--kc-ink-faint)" }}>{suggestion.word} — try it if you know it</div>
              </div>
            </div>
          )}
          <div style={{ marginTop: "auto" }}>
            <div style={{ ...NOTE, color: "var(--kc-ink-faint)" }}>This sets the starting key and how fast the scale stop begins. Nothing here is marked wrong.</div>
          </div>
        </div>
      </div>
      <PartBar actions={
        <>
          {!timerOnly && <Button variant="secondary" size="control" icon="add" disabled={paused} onClick={() => { notesRef.current = []; setNotes([]); }}>Play another</Button>}
          <Button size="control" iconAfter icon="arrow_forward" disabled={paused} onClick={finish}>{heard.length || picked.length ? "That's all I know" : "I don't know any yet"}</Button>
        </>
      }>
        <StatChip tone="mint" value={timerOnly ? picked.length : heard.length} label={<>scales<br />{timerOnly ? "ticked" : "heard"}</>} />
        {latest && <StatChip tone="indigo" icon="speed" line1={`${latest.bpm} bpm`} line2={`even to within ${Math.max(5, latest.evenMs)} ms`} />}
      </PartBar>
    </>
  );
}
