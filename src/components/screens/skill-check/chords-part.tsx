"use client";
import * as React from "react";
import { Button, Icon, Keyboard, PianoStrip, Pill, StatChip, Instruction, type PianoStripLit } from "@/components/ds";
import { useInput } from "@/lib/hooks/use-input";
import { getInput } from "@/lib/input/manager";
import { isBlackKey } from "@/lib/music/notes";
import { CARD_TITLE, NOTE, PartBar, type ChordsResult, type PartProps } from "./shared";

interface Target { name: string; notes: string[]; pcs: number[]; midis: number[]; optional?: boolean }
const TARGETS: Target[] = [
  { name: "C major", notes: ["C", "E", "G"], pcs: [0, 4, 7], midis: [60, 64, 67] },
  { name: "G major", notes: ["G", "B", "D"], pcs: [7, 11, 2], midis: [55, 59, 62] },
  { name: "F major", notes: ["F", "A", "C"], pcs: [5, 9, 0], midis: [53, 57, 60], optional: true },
];
const QUESTIONS = TARGETS.map((t) => `Can you play ${t.name}${t.optional ? "" : " hands together"}?`);
const MIC_WINDOW_MS = 600;

function stripIndex(midi: number): number | null {
  if (isBlackKey(midi) || midi < 48) return null;
  let i = 0;
  for (let m = 48; m < midi; m++) if (!isBlackKey(m)) i++;
  return i < 15 ? i : null;
}

/** Harmony's starting level from what was heard: nothing → 1, C → 2, C and G → 3, all three → 4. */
function theoryLevelFor(heard: string[]): number {
  if (heard.includes("C major") && heard.includes("G major") && heard.includes("F major")) return 4;
  if (heard.includes("C major") && heard.includes("G major")) return 3;
  if (heard.includes("C major") || heard.includes("G major")) return 2;
  return 1;
}

/**
 * B5 · Chords. Ask for C major, then G, with F optional. A chord counts when all its tones sound together: on
 * MIDI from the keys held down, on the microphone from the expected-chord check. "Not yet" always skips. On the
 * timer the part becomes three questions, stored as the player's own answer.
 */
export function ChordsPart({ paused, onDone }: PartProps<ChordsResult>) {
  const [heard, setHeard] = React.useState<string[]>([]);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [held, setHeld] = React.useState<number[]>([]);
  const [answers, setAnswers] = React.useState<(boolean | null)[]>(() => TARGETS.map(() => null));
  const heldRef = React.useRef(new Set<number>());
  const pausedRef = React.useRef(paused);
  React.useEffect(() => { pausedRef.current = paused; });

  const current = TARGETS.find((t) => !heard.includes(t.name) && !skipped.includes(t.name)) ?? null;
  const currentRef = React.useRef(current);
  React.useEffect(() => { currentRef.current = current; });

  const markHeard = React.useCallback((name: string) => { setHeard((h) => (h.includes(name) ? h : [...h, name])); }, []);

  const { tap, mode } = useInput({
    onNote: (e) => {
      if (pausedRef.current) return;
      if (e.kind === "on") heldRef.current.add(e.midi); else heldRef.current.delete(e.midi);
      const now = Array.from(heldRef.current);
      setHeld(now);
      const t = currentRef.current;
      if (!t || mode === "mic") return;
      const pcs = new Set(now.map((m) => ((m % 12) + 12) % 12));
      if (t.pcs.every((p) => pcs.has(p))) markHeard(t.name);
    },
  });

  // On the microphone the chord is verified from the spectrum, not from note events.
  React.useEffect(() => {
    if (mode !== "mic" || !current) return;
    let live = true;
    const loop = async () => {
      while (live) {
        if (!pausedRef.current) {
          const r = await getInput().verifyChord(current.midis, MIC_WINDOW_MS);
          if (!live) return;
          if (r === "heard") { markHeard(current.name); return; }
        }
        await new Promise((res) => setTimeout(res, 250));
      }
    };
    void loop();
    return () => { live = false; };
  }, [mode, current, markHeard]);

  const timerOnly = mode === "timer";
  const skip = () => { if (current) setSkipped((s) => [...s, current.name]); };
  const finish = () => {
    if (timerOnly) {
      const yes = TARGETS.filter((_, i) => answers[i] === true).map((t) => t.name);
      onDone({ heard: yes, selfReported: true, theoryLevel: theoryLevelFor(yes) });
      return;
    }
    onDone({ heard, selfReported: false, theoryLevel: theoryLevelFor(heard) });
  };

  const heldPcs = new Set(held.map((m) => ((m % 12) + 12) % 12));
  const lit: PianoStripLit = { whites: {}, blacks: {}, labels: {} };
  held.forEach((m) => { const w = stripIndex(m); if (w !== null) { lit.whites![w] = "var(--kc-mint)"; lit.labels![w] = noteName(m); } else { const b = stripIndex(m - 1); if (b !== null) lit.blacks![b] = "var(--kc-mint-ink)"; } });
  if (current) current.midis.forEach((m, i) => { if (!heldPcs.has(current.pcs[i])) { const w = stripIndex(m); if (w !== null && !lit.whites![w]) { lit.whites![w] = "var(--kc-indigo-wash)"; lit.labels![w] = `${current.notes[i]}?`; } } });

  const required = TARGETS.filter((t) => !t.optional).length;
  const requiredHeard = heard.filter((n) => TARGETS.find((t) => t.name === n && !t.optional)).length;
  const requiredAnswered = TARGETS.filter((t, i) => !t.optional && answers[i] === true).length;
  const instruction = timerOnly ? "On the timer, three quick questions — your own answer, not measured." : current ? `Play a ${current.name} chord${current.optional ? " if you know it" : ""}. Then any others you know — or tap “Not yet”.` : "That's every chord we ask for. See your result when you're ready.";

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, padding: "22px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Instruction>{instruction}</Instruction>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, ...(timerOnly ? { flex: 1, minHeight: 0, alignContent: "center", gridAutoRows: 300 } : null) }}>
          {TARGETS.map((t, ti) => {
            const isHeard = timerOnly ? answers[ti] === true : heard.includes(t.name);
            const isCurrent = !timerOnly && current?.name === t.name;
            const isSkipped = timerOnly ? answers[ti] === false : skipped.includes(t.name);
            const card: React.CSSProperties = isHeard ? { background: "var(--kc-mint-wash)", border: "3px solid var(--kc-mint)" } : isCurrent ? { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" } : { background: "var(--kc-base)", border: "3px dashed var(--kc-border-dashed)" };
            const n = t.notes.filter((_, i) => heldPcs.has(t.pcs[i])).length;
            return (
              <div key={t.name} style={{ borderRadius: 22, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, boxSizing: "border-box", ...(timerOnly ? { justifyContent: "center", gap: 16 } : null), ...card }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{t.name}</div>
                  <span style={{ marginLeft: "auto" }}>
                    {isHeard ? <Pill tone="mint-fill" icon="check">{timerOnly ? "Yes" : "Heard"}</Pill> : isCurrent ? <Pill tone="indigo-fill" icon="hearing">Listening</Pill> : isSkipped ? <Pill>Not yet</Pill> : t.optional ? <Pill>Optional</Pill> : timerOnly ? null : <Pill>Next</Pill>}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {t.notes.map((name, i) => {
                    const on = isHeard || (isCurrent && heldPcs.has(t.pcs[i]));
                    const want = isCurrent && !on;
                    return <span key={name} style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, boxSizing: "border-box", background: on ? "var(--kc-mint)" : "var(--kc-panel)", border: on ? "none" : want ? "2px dashed var(--kc-indigo)" : "2px solid var(--kc-border)", color: on ? "var(--kc-ink)" : want ? "var(--kc-indigo)" : "var(--kc-ink-faint)" }}>{name}</span>;
                  })}
                </div>
                {timerOnly ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    <Button size="pill" variant={answers[ti] === true ? "primary" : "secondary"} onClick={() => setAnswers((a) => a.map((v, i) => (i === ti ? true : v)))}>Yes</Button>
                    <Button size="pill" variant={answers[ti] === false ? "primary" : "secondary"} onClick={() => setAnswers((a) => a.map((v, i) => (i === ti ? false : v)))}>Not yet</Button>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: isHeard ? "var(--kc-mint-ink)" : isCurrent ? "var(--kc-indigo-shadow)" : "var(--kc-ink-faint)" }}>
                    {isHeard ? "All three notes together." : isCurrent ? (n === 0 ? "Hold all three keys down together." : n === 3 ? "All three — hold them a moment." : `${n === 1 ? "One" : "Two"} of three so far — add the ${t.notes.filter((_, i) => !heldPcs.has(t.pcs[i])).join(" and ")}.`) : isSkipped ? "Skipped for now — nothing lost." : "“Not yet” is a perfectly good answer."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {timerOnly ? (
          <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--kc-indigo-wash)", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="timer" size={24} color="var(--kc-indigo)" />
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-indigo-shadow)" }}>{QUESTIONS.join(" · ")} — marked as your own answer, not measured.</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={CARD_TITLE}>What we hear right now</div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>hold the keys down together</span>
            </div>
            {mode === "midi"
              ? <PianoStrip keys={15} height={150} lit={lit} />
              : <Keyboard from={48} to={72} height={150} disabled={paused} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} style={{ flex: "none" }} />}
            <div style={{ background: "var(--kc-indigo-wash)", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="timer" size={24} color="var(--kc-indigo)" />
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-indigo-shadow)" }}>On the timer, this part becomes three quick questions — “Can you play G major hands together?” — marked as your own answer, not measured.</div>
            </div>
          </div>
        )}
      </div>
      <PartBar actions={
        <>
          {!timerOnly && current && <Button variant="secondary" size="control" icon="skip_next" disabled={paused} onClick={skip}>Not yet</Button>}
          <Button size="control" iconAfter icon="arrow_forward" disabled={paused || (timerOnly && answers.some((a, i) => a === null && !TARGETS[i].optional))} onClick={finish}>See my result</Button>
        </>
      }>
        <StatChip tone="mint" value={timerOnly ? requiredAnswered : requiredHeard} unit={`/${required}`} label={<>chords<br />so far</>} />
        <div style={{ ...NOTE, maxWidth: 260 }}>Sets where the harmony stop starts. Most people begin with C, F and G.</div>
      </PartBar>
    </>
  );
}

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
function noteName(midi: number): string { return NAMES[((midi % 12) + 12) % 12]; }
