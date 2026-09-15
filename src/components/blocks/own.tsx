"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { NoteEvent, Recording } from "@/lib/types";
import type { GrooveId } from "@/lib/audio/engine";
import { BottomBar, Button, Choice, ChoiceTile, Clock, Keyboard, Metric, Pill, SectionLabel, Tempo, type KeyTone } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput, useNoteRecorder } from "@/lib/hooks/use-input";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { repo } from "@/lib/db/repo";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { isInScale } from "@/lib/music/scales";
import { pcToMidi, prettyPc } from "@/lib/music/notes";
import { CheckItem } from "@/components/ds";
import { newId } from "@/lib/utils/id";

/*
 * Your own. A backing groove in the session key, the keys outside the key dimmed, a clock that just runs, and an
 * optional take kept in the library when the player says so. Nothing is scored and nothing is praised.
 */

const GROOVES: GrooveId[] = ["pop", "waltz", "blues", "lofi"];
const GROOVE_LABELS: Record<GrooveId, string> = { pop: "Pop", waltz: "Waltz", blues: "Blues", lofi: "Lo-fi" };
const TEMPOS = [72, 84, 96, 112];
const MIDI_MIME = "application/x-keycadence-midi";

type TakeState = "idle" | "recording" | "ready" | "saving" | "kept" | "failed";
interface Take { blob: Blob | null; mimeType: string; events: NoteEvent[] | null; seconds: number }

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

export function OwnBlock({ child, session, scale, inputMode, nextTitle, paused, timeUp, onDone, setPrimaryLabel }: BlockProps) {
  const { audio, unlock } = useAudio();
  React.useEffect(() => { setPrimaryLabel?.(null); }, [setPrimaryLabel]);

  const rootMidi = pcToMidi(scale.key, 3);
  const minor = scale.mode !== "major";
  const tonic = pcToMidi(scale.key, 4);
  const kbFrom = tonic - 12;
  const kbTo = tonic + 12;

  // ---- the groove ----
  const [groove, setGroove] = React.useState<GrooveId>("pop");
  const [bpm, setBpm] = React.useState(84);
  const bpmRef = React.useRef(bpm);
  const [playing, setPlaying] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const grooveOn = playing && !paused;
  const beatsPerBar = groove === "waltz" ? 3 : 4;
  React.useEffect(() => {
    if (!grooveOn) return;
    audio.startGroove(groove, rootMidi, bpmRef.current, minor);
    return () => audio.stopGroove();
  }, [grooveOn, groove, rootMidi, minor, audio]);
  React.useEffect(() => { bpmRef.current = bpm; if (grooveOn) audio.setGrooveBpm(bpm); }, [bpm, grooveOn, audio]);
  React.useEffect(() => {
    if (!grooveOn) return;
    const id = setInterval(() => setTick((t) => t + 1), 60000 / bpm);
    return () => clearInterval(id);
  }, [grooveOn, bpm, groove]);
  const beat = grooveOn ? tick % beatsPerBar : -1;
  const toggleGroove = () => { void unlock(); setTick(0); setPlaying((p) => !p); };

  // ---- the clock ----
  const { seconds } = useStopwatch(!paused);

  // ---- the keys ----
  const [held, setHeld] = React.useState<number[]>([]);
  const heldRef = React.useRef<Set<number>>(new Set());
  const { tap } = useInput({
    onNote: (e) => {
      if (e.kind === "on") heldRef.current.add(e.midi); else heldRef.current.delete(e.midi);
      setHeld(Array.from(heldRef.current));
    },
  });
  const tones: Partial<Record<number, KeyTone>> = {};
  for (let m = kbFrom; m <= kbTo; m++) if (!isInScale(m, scale)) tones[m] = "dim";
  for (const m of held) tones[m] = "mint";

  // ---- the take ----
  const useMidi = inputMode === "midi" || !AudioRecorder.supported();
  const [takeState, setTakeState] = React.useState<TakeState>("idle");
  const [take, setTake] = React.useState<Take | null>(null);
  const [takeStart, setTakeStart] = React.useState<number | null>(null);
  const [recordingId, setRecordingId] = React.useState<string | null>(null);
  const [kept, setKept] = React.useState(0);
  const recorder = React.useRef<AudioRecorder | null>(null);
  const { events, reset } = useNoteRecorder(takeState === "recording");
  const { seconds: recSeconds, reset: resetRec } = useStopwatch(takeState === "recording");
  React.useEffect(() => () => { recorder.current?.cancel(); }, []);

  const startTake = async () => {
    void unlock();
    reset();
    resetRec();
    setTake(null);
    setRecordingId(null);
    if (useMidi) { setTakeStart(performance.now()); setTakeState("recording"); return; }
    try {
      const r = new AudioRecorder();
      await r.start();
      recorder.current = r;
      setTakeStart(performance.now());
      setTakeState("recording");
    } catch { setTakeState("failed"); }
  };
  const stopTake = async () => {
    const started = takeStart ?? performance.now();
    const secs = Math.max(1, Math.round((performance.now() - started) / 1000));
    if (useMidi) {
      const list = events.current.map((e) => ({ ...e, time: Math.max(0, e.time - started) }));
      setTake({ blob: null, mimeType: MIDI_MIME, events: list, seconds: secs });
      setTakeState(list.some((e) => e.kind === "on") ? "ready" : "idle");
      return;
    }
    const r = recorder.current;
    recorder.current = null;
    const blob = r ? await r.stop() : new Blob();
    if (!blob.size) { setTakeState("failed"); return; }
    setTake({ blob, mimeType: blob.type || r?.mimeType || "audio/webm", events: null, seconds: secs });
    setTakeState("ready");
  };
  const keepTake = async () => {
    if (!take) return;
    setTakeState("saving");
    const title = `Your own · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    const row: Recording = {
      id: newId("rec"), childId: child.id, sessionId: session.id, blockType: "improv", createdAt: new Date().toISOString(),
      mimeType: take.mimeType, blob: take.blob ?? new Blob([JSON.stringify(take.events ?? [])], { type: MIDI_MIME }), midiEvents: take.events ?? undefined, title,
    };
    try { await repo.putRecording(row); setRecordingId(row.id); setKept((k) => k + 1); setTakeState("kept"); } catch { setTakeState("failed"); }
  };
  const discardTake = () => { setTake(null); setTakeState("idle"); };

  const finish = () => {
    audio.stopGroove();
    recorder.current?.cancel();
    onDone({ completed: true, skipped: false, inputMode, recordingId: recordingId ?? undefined, details: { groove, bpm, recordingId: recordingId ?? undefined, seconds, kept } });
  };

  const takeLine = takeState === "recording"
    ? `Recording · ${fmt(recSeconds)}`
    : takeState === "ready" && take ? `A ${fmt(take.seconds)} take. Keep it, or let it go.`
    : takeState === "kept" ? "Kept in the library."
    : takeState === "failed" ? (useMidi ? "Nothing was played." : "The microphone was not available.")
    : useMidi ? "Records what the keys send. Kept only when you say so." : "Records the room. Kept only when you say so.";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "22px 30px 0", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)" }}>
          Play whatever you like in {scale.name}. The groove keeps time; the dimmed keys are the ones outside the key.
        </p>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14 }}>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
            <SectionLabel>Backing</SectionLabel>
            <Choice options={GROOVES} value={groove} onChange={setGroove} labels={GROOVE_LABELS} />
            <div style={{ display: "flex", gap: 8 }}>
              {TEMPOS.map((t) => <ChoiceTile key={t} value={t} unit="bpm" selected={bpm === t} height={56} onClick={() => setBpm(t)} />)}
            </div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.45, marginTop: 2 }}>
              {scale.name}: <span style={{ fontFamily: "var(--kc-font-mono)", color: "var(--kc-ink-muted)" }}>{scale.notes.map((n) => prettyPc(n)).join("  ")}</span>. The bass sits on {prettyPc(scale.key)}; the drums are the same in every key.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
              <Button variant={playing ? "secondary" : "primary"} size="control" icon={playing ? "stop" : "play_arrow"} onClick={toggleGroove}>{playing ? "Stop the groove" : "Start the groove"}</Button>
              <div style={{ display: "flex", gap: 8 }}>
                {Array.from({ length: beatsPerBar }).map((_, b) => <span key={b} style={{ width: 10, height: 10, borderRadius: "50%", background: beat === b ? "var(--kc-mint)" : "var(--kc-raised)" }} />)}
              </div>
              <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--kc-ink-dim)" }}>{GROOVE_LABELS[groove]} · <Tempo bpm={bpm} /></span>
            </div>
          </div>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <SectionLabel>Recording</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {takeState === "recording" && <Pill tone="clay">Rec</Pill>}
              {takeState === "kept" && <Pill tone="mint">Kept</Pill>}
              <span style={{ fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.4 }}>{takeLine}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <SectionLabel>What gets recorded</SectionLabel>
              <CheckItem>Minutes, the groove and the tempo</CheckItem>
              <CheckItem>A take, only when you keep it</CheckItem>
              <CheckItem on={false}>Notes right, drift, evenness</CheckItem>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
              {takeState === "recording"
                ? <Button variant="secondary" size="control" icon="stop" onClick={() => { void stopTake(); }}>Stop</Button>
                : takeState === "ready"
                  ? <>
                      <Button size="control" icon="check" onClick={() => { void keepTake(); }}>Keep this</Button>
                      <Button variant="quiet" size="control" onClick={discardTake}>Let it go</Button>
                    </>
                  : <Button variant="secondary" size="control" icon="mic" disabled={takeState === "saving"} onClick={() => { void startTake(); }}>{takeState === "kept" ? "Record another" : "Record"}</Button>}
            </div>
          </div>
        </div>
        <Keyboard from={kbFrom} to={kbTo} height={200} tones={tones} onNoteOn={(m) => { void unlock(); audio.noteOn(m); tap.note(m, "on"); }} onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }} style={{ flex: "none", marginBottom: 20 }} />
      </div>
      <BottomBar
        actions={
          <>
            {timeUp && <Pill tone="amber">Time</Pill>}
            <Button size="control" onClick={finish}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 26 }}>
          <Metric label="Time playing" value={<Clock seconds={seconds} />} />
          <Metric label="Tempo" value={<Tempo bpm={bpm} size={15} />} />
          <Metric label="Groove" value={GROOVE_LABELS[groove]} />
          <Metric label="Takes kept" value={kept} />
        </div>
      </BottomBar>
    </div>
  );
}
