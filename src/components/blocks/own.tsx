"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { NoteEvent, Recording } from "@/lib/types";
import type { GrooveId } from "@/lib/audio/engine";
import { BottomBar, Button, Choice, Icon, Pill, TickSays, Waveform } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput, useNoteRecorder } from "@/lib/hooks/use-input";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { repo } from "@/lib/db/repo";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { isInScale } from "@/lib/music/scales";
import { isBlackKey, midiToName, pcToMidi, prettyPc } from "@/lib/music/notes";
import { newId } from "@/lib/utils/id";
import { useAppStore } from "@/lib/store/app-store";
import { SongPlayer } from "./shared/song-player";
import { CardTitle, PAGE, RoundButton } from "./shared/controls";
import { PlayStrip, type StripTone } from "./shared/play-strip";

/*
 * Your own (D7). Tick hands over: a backing groove in the session key (or a real song to play along with), the
 * safe-zone keys lit, a clock that just runs, and an optional take saved to My Songs when the player says so.
 * Nothing is scored and nothing is praised.
 */

type Backing = "groove" | "song";
const BACKINGS: Backing[] = ["groove", "song"];
const BACKING_LABELS: Record<Backing, string> = { groove: "Groove", song: "A song in this key" };
const GROOVES: GrooveId[] = ["pop", "waltz", "blues", "lofi"];
const GROOVE_LABELS: Record<GrooveId, string> = { pop: "Pop", waltz: "Waltz", blues: "Blues", lofi: "Lo-fi" };
const GROOVE_ICONS: Record<GrooveId, string> = { pop: "music_note", waltz: "waves", blues: "queue_music", lofi: "nightlight" };
const TEMPOS = [72, 84, 96, 112];
const MIDI_MIME = "application/x-keycadence-midi";

type TakeState = "idle" | "recording" | "ready" | "saving" | "kept" | "failed";
interface Take { blob: Blob | null; mimeType: string; events: NoteEvent[] | null; seconds: number }

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

/** A pseudo-waveform for a take of n seconds: the same shape every time it is drawn. */
function waveFor(seconds: number, n = 40): number[] {
  return Array.from({ length: n }, (_, i) => 20 + Math.round(Math.abs(Math.sin((i + 1) * 1.37 + seconds * 0.11) * 60 + Math.cos(i * 0.53) * 20)));
}

export function OwnBlock({ child, session, scale, inputMode, nextTitle, paused, timeUp, onDone, setPrimaryLabel, setMeta, setRecording, seconds: planned }: BlockProps) {
  const { audio, unlock } = useAudio();
  React.useEffect(() => { setPrimaryLabel?.(null); }, [setPrimaryLabel]);
  React.useEffect(() => {
    setMeta?.(`${planned >= 120 ? `${Math.round(planned / 60)} minutes` : "One minute"} · nothing is measured`);
    return () => setMeta?.(null);
  }, [setMeta, planned]);

  const rootMidi = pcToMidi(scale.key, 3);
  const minor = scale.mode !== "major";
  const tonic = pcToMidi(scale.key, 4);
  const kbFrom = tonic - 12;
  const kbTo = tonic + 12;

  // ---- the backing: the built-in groove, or a real song to play along with ----
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [backing, setBacking] = React.useState<Backing>("groove");
  const jamVideos = React.useMemo(() => child.settings.jamVideos ?? {}, [child.settings.jamVideos]);
  const saveVideo = React.useCallback((songId: string, videoId: string | null) => {
    const next = { ...(child.settings.jamVideos ?? {}) };
    if (videoId) next[songId] = videoId; else delete next[songId];
    void updateSettings(child.id, { jamVideos: next });
  }, [child.id, child.settings.jamVideos, updateSettings]);

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
  const stopGroove = React.useCallback(() => setPlaying(false), []);
  const chooseBacking = (b: Backing) => { if (b === "song") stopGroove(); setBacking(b); };
  const pickGroove = (g: GrooveId) => { void unlock(); setGroove(g); if (!playing) { setTick(0); setPlaying(true); } };

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
  const tones: Partial<Record<number, StripTone>> = {};
  const labels: Partial<Record<number, string>> = {};
  for (let m = kbFrom; m <= kbTo; m++) {
    tones[m] = isInScale(m, scale) ? "wash" : "dim";
    if (m % 12 === tonic % 12) { tones[m] = "mint"; labels[m] = prettyPc(scale.key); }
  }
  for (const m of held) tones[m] = "mint";
  const outside = [] as string[];
  const inBlack = [] as string[];
  for (let m = tonic; m < tonic + 12; m++) {
    const inKey = isInScale(m, scale);
    if (!isBlackKey(m) && !inKey) outside.push(midiToName(m).replace(/\d+$/, ""));
    if (isBlackKey(m) && inKey) inBlack.push(prettyPc(scale.notes.find((n) => pcToMidi(n, 4) % 12 === m % 12) ?? "C"));
  }
  const safeZone = `${scale.name} — ${outside.length ? `every white key but ${outside.join(" and ")}` : "every white key"}${inBlack.length ? `, plus ${inBlack.join(", ")}` : ""}`;

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
  React.useEffect(() => { setRecording?.(takeState === "recording"); return () => setRecording?.(false); }, [takeState, setRecording]);

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
    ? "Recording"
    : takeState === "ready" && take ? "Keep it, or let it go"
    : takeState === "kept" ? "Kept in My Songs"
    : takeState === "failed" ? (useMidi ? "Nothing was played" : "The microphone was not available")
    : useMidi ? "Record what the keys send" : "Record the room";
  const takeSeconds = takeState === "recording" ? recSeconds : take?.seconds ?? 0;
  const tickSays = backing === "song"
    ? "Pick a song in this key and play along. The green keys always sound right."
    : "Your minute. Play whatever you like over the loop — the green keys always sound right.";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...PAGE, gap: 18 }}>
        <TickSays mood="cheer" bpm={bpm}>{tickSays}</TickSays>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: backing === "song" ? 1 : "none", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <CardTitle>{backing === "song" ? "Play along" : "Pick a groove"}</CardTitle>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {backing === "groove" && <Choice options={TEMPOS.map(String)} value={String(bpm)} onChange={(v) => setBpm(Number(v))} labels={Object.fromEntries(TEMPOS.map((t) => [String(t), `${t}`])) as Record<string, string>} />}
              <Choice options={BACKINGS} value={backing} onChange={chooseBacking} labels={BACKING_LABELS} />
            </div>
          </div>
          {backing === "song" ? (
            <SongPlayer scale={scale} videos={jamVideos} onSaveVideo={saveVideo} onPlay={stopGroove} />
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              {GROOVES.map((g) => {
                const on = groove === g && playing;
                return (
                  <button key={g} type="button" onClick={() => (groove === g && playing ? toggleGroove() : pickGroove(g))} className="kc-press" style={{ flex: 1, height: 92, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxSizing: "border-box", cursor: "pointer", padding: 0, ...(on ? { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: "0 5px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", color: "var(--kc-ink)", border: groove === g ? "3px solid var(--kc-indigo)" : "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" }) }}>
                    <Icon name={on ? "graphic_eq" : GROOVE_ICONS[g]} size={28} />
                    <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>{GROOVE_LABELS[g]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ flex: backing === "song" ? "none" : 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
          <CardTitle meta={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{safeZone}{playing && <span style={{ display: "inline-flex", gap: 5 }}>{Array.from({ length: beatsPerBar }).map((_, b) => <span key={b} style={{ width: 8, height: 8, borderRadius: "50%", background: beat === b ? "var(--kc-indigo)" : "var(--kc-border)" }} />)}</span>}</span>}>The safe zone</CardTitle>
          <PlayStrip from={kbFrom} to={kbTo} height={backing === "song" ? 96 : 130} tones={tones} labels={labels} onNoteOn={(m) => { void unlock(); audio.noteOn(m); tap.note(m, "on"); }} onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }} disabled={paused} />
        </div>
      </div>
      <BottomBar
        actions={
          <>
            {timeUp && <Pill tone="sun">Time</Pill>}
            {takeState === "ready"
              ? <>
                  <Button variant="secondary" size="control" icon="bookmark_add" onClick={() => { void keepTake(); }}>Save to My Songs</Button>
                  <Button variant="quiet" size="control" onClick={discardTake}>Let it go</Button>
                </>
              : takeState === "kept"
                ? <Pill tone="mint" icon="bookmark_added">Saved to My Songs</Pill>
                : null}
            <Button size="control" icon={nextTitle ? "arrow_forward" : "celebration"} iconAfter={!!nextTitle} onClick={finish}>{nextTitle ? "Next stop" : "Done for today!"}</Button>
          </>
        }
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "var(--kc-cream)", borderRadius: 18, padding: "10px 14px", minWidth: 0 }}>
          {takeState === "recording"
            ? <RoundButton icon="stop" primary label="Stop recording" onClick={() => { void stopTake(); }} />
            : <RoundButton icon="mic" primary label={takeState === "kept" ? "Record another" : "Record"} disabled={takeState === "saving"} onClick={() => { void startTake(); }} />}
          {takeState === "recording" || take
            ? <Waveform bars={waveFor(takeSeconds)} height={34} tone="indigo" split={takeState === "recording" ? Math.min(1, (recSeconds % 20) / 20) : 1} />
            : <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)" }}>{takeLine}. Kept only when you say so.</span>}
          {(takeState === "recording" || take) && <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(takeSeconds)}</span>}
          {(takeState === "recording" || take) && <span style={{ fontSize: 13, fontWeight: 800, color: takeState === "recording" ? "var(--kc-sun-ink)" : "var(--kc-ink-faint)", whiteSpace: "nowrap" }}>{takeLine}</span>}
        </div>
        <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, color: "var(--kc-ink-faint)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmt(seconds)} played</span>
      </BottomBar>
    </div>
  );
}
