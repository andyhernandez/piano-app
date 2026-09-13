"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Circle, Mic, Play, Save, Square } from "lucide-react";
import type { NoteEvent, Recording } from "@/lib/types";
import type { GrooveId } from "@/lib/audio/engine";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { PianoKeyboard, keyboardRangeFor, type KeyState } from "@/components/keyboard/piano-keyboard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { isInScale, prefersFlats } from "@/lib/music/scales";
import { pcToMidi } from "@/lib/music/notes";
import { awardBadge, hasBadge } from "@/lib/engine/progression";
import { newId } from "@/lib/utils/id";
import { cn } from "@/lib/utils/cn";
import { useScheduler } from "./repertoire/use-scheduler";
import { GroovePlayer, beatsPerBarFor } from "./sandbox/groove-player";
import { IdeaPrompts } from "./sandbox/idea-prompts";
import { MySongs } from "./sandbox/my-songs";
import { AudioCapture, audioCaptureSupported } from "./sandbox/audio-capture";
import { MIDI_MIME, defaultJamTitle, formatTakeLength, isMidiRecording, replayNotes, type Take } from "./sandbox/recording";

type RecState = "idle" | "recording" | "ready";

/** Block F — Creative Sandbox (spec §4F). */
export function SandboxBlock(props: BlockComponentProps) {
  const { child, scale, plannedSec, running, inputMode } = props;
  const { audio } = useAudio();
  const { schedule, clear } = useScheduler();

  const rootMidi = pcToMidi(scale.key, 4);
  const minor = scale.mode !== "major";
  const flats = prefersFlats(scale);
  const [from, to] = React.useMemo(() => keyboardRangeFor([...scale.midiOneOctave, ...scale.midiOneOctave.map((m) => m + 12)]), [scale.midiOneOctave]);
  const unlockedGrooves = React.useMemo(() => new Set<string>(["pop", ...child.unlocks.grooves]), [child.unlocks.grooves]);

  // ---- groove ----
  const [groove, setGroove] = React.useState<GrooveId>("pop");
  const [bpm, setBpm] = React.useState(90);
  const [playing, setPlaying] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const bpmRef = React.useRef(bpm);
  const grooveOn = playing && running;

  React.useEffect(() => {
    if (!grooveOn) return;
    audio.startGroove(groove, rootMidi, bpmRef.current, minor);
    return () => audio.stopGroove();
  }, [grooveOn, groove, rootMidi, minor, audio]);
  React.useEffect(() => {
    bpmRef.current = bpm;
    if (grooveOn) audio.setGrooveBpm(bpm);
  }, [bpm, grooveOn, audio]);
  React.useEffect(() => {
    if (!grooveOn) return;
    const id = setInterval(() => setTick((t) => t + 1), 60000 / bpm);
    return () => clearInterval(id);
  }, [grooveOn, bpm, groove]);
  const beat = grooveOn ? tick % beatsPerBarFor(groove) : null;
  const toggleGroove = () => { setTick(0); setPlaying((p) => !p); };

  // ---- live keys, recording, replay ----
  const [activeKeys, setActiveKeys] = React.useState<number[]>([]);
  const [replayKeys, setReplayKeys] = React.useState<number[]>([]);
  const heldRef = React.useRef<Set<number>>(new Set());
  const [notesPlayed, setNotesPlayed] = React.useState(0);
  const [recState, setRecState] = React.useState<RecState>("idle");
  const recRef = React.useRef<{ start: number; events: NoteEvent[] } | null>(null);
  const [take, setTake] = React.useState<Take | null>(null);
  const [takeSaved, setTakeSaved] = React.useState(false);
  const [takes, setTakes] = React.useState(0);
  const [savedTitles, setSavedTitles] = React.useState<string[]>([]);
  const [replaying, setReplaying] = React.useState<"take" | string | null>(null);
  const audioElRef = React.useRef<{ el: HTMLAudioElement; url: string } | null>(null);
  const captureRef = React.useRef<AudioCapture | null>(null);
  const [captureMic, setCaptureMic] = React.useState(false);
  const [micError, setMicError] = React.useState<string | null>(null);
  const micAvailable = inputMode === "mic" && audioCaptureSupported();

  const { tap } = useInput({
    onNote: (e) => {
      if (e.kind === "on") heldRef.current.add(e.midi); else heldRef.current.delete(e.midi);
      setActiveKeys(Array.from(heldRef.current));
      if (e.kind === "on") setNotesPlayed((n) => n + 1);
      const rec = recRef.current;
      if (rec) rec.events.push({ ...e, time: Math.max(0, e.time - rec.start) });
    },
  });

  const stopAudioEl = React.useCallback(() => {
    const a = audioElRef.current;
    if (!a) return;
    a.el.pause();
    a.el.src = "";
    URL.revokeObjectURL(a.url);
    audioElRef.current = null;
  }, []);

  const stopReplay = React.useCallback(() => {
    clear();
    stopAudioEl();
    setReplaying(null);
    setReplayKeys([]);
  }, [clear, stopAudioEl]);

  // Time's up → silence playback (state reset lazily during render, side effects here).
  React.useEffect(() => { if (!running) { clear(); stopAudioEl(); } }, [running, clear, stopAudioEl]);
  const [prevRunning, setPrevRunning] = React.useState(running);
  if (prevRunning !== running) {
    setPrevRunning(running);
    if (!running) { setReplaying(null); setReplayKeys([]); }
  }

  // Unmount → stop everything.
  React.useEffect(() => () => {
    audio.stopGroove();
    captureRef.current?.dispose();
    const a = audioElRef.current;
    if (a) { a.el.pause(); URL.revokeObjectURL(a.url); }
  }, [audio]);

  const playEvents = React.useCallback((id: "take" | string, events: NoteEvent[]) => {
    stopReplay();
    const { notes, totalMs } = replayNotes(events);
    if (!notes.length) return;
    setReplaying(id);
    for (const n of notes) {
      schedule(() => {
        audio.playNote(n.midi, n.durSec, n.velocity);
        setReplayKeys((k) => (k.includes(n.midi) ? k : [...k, n.midi]));
      }, n.atMs);
      schedule(() => setReplayKeys((k) => k.filter((m) => m !== n.midi)), n.atMs + n.durSec * 1000);
    }
    schedule(() => { setReplaying(null); setReplayKeys([]); }, totalMs + 150);
  }, [audio, schedule, stopReplay]);

  const playBlob = React.useCallback((id: string, blob: Blob) => {
    stopReplay();
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    audioElRef.current = { el, url };
    el.onended = () => { stopAudioEl(); setReplaying(null); };
    el.onerror = () => { stopAudioEl(); setReplaying(null); };
    setReplaying(id);
    void el.play().catch(() => { stopAudioEl(); setReplaying(null); });
  }, [stopReplay, stopAudioEl]);

  const replayRecording = (rec: Recording) => {
    if (isMidiRecording(rec)) playEvents(rec.id, rec.midiEvents!);
    else playBlob(rec.id, rec.blob);
  };

  const startRecording = async () => {
    stopReplay();
    setTake(null);
    setTakeSaved(false);
    setMicError(null);
    recRef.current = { start: performance.now(), events: [] };
    setRecState("recording");
    if (micAvailable && captureMic) {
      try {
        const cap = captureRef.current ?? new AudioCapture();
        captureRef.current = cap;
        await cap.start();
      } catch {
        setMicError("Couldn't reach the mic — recording your keys only.");
      }
    }
  };

  const stopRecording = async () => {
    const rec = recRef.current;
    recRef.current = null;
    const captured = captureRef.current ? await captureRef.current.stop() : null;
    if (!rec) { setRecState("idle"); return; }
    const durationMs = performance.now() - rec.start;
    // Close any notes still held when Stop was pressed.
    for (const m of heldRef.current) rec.events.push({ midi: m, velocity: 0, time: durationMs, kind: "off", confidence: 1 });
    const t: Take = { events: rec.events, groove, bpm, durationMs, audio: captured };
    const hasContent = t.events.some((e) => e.kind === "on") || t.audio !== null;
    setTake(hasContent ? t : null);
    setRecState(hasContent ? "ready" : "idle");
    if (hasContent) { setTakes((n) => n + 1); audio.stinger("pop"); }
  };

  // ---- save dialog ----
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const openSave = async () => {
    const existing = (await repo.listRecordings(child.id)).filter((r) => r.blockType === "improv").length;
    setTitle(defaultJamTitle(scale.name, existing + 1));
    setSaveOpen(true);
  };
  const save = async () => {
    if (!take) return;
    const midi = take.events.some((e) => e.kind === "on");
    const name = title.trim() || defaultJamTitle(scale.name, savedTitles.length + 1);
    const rec: Recording = {
      id: newId("rec"),
      childId: child.id,
      sessionId: useAppStore.getState().activeSession?.id ?? "",
      blockType: "improv",
      createdAt: new Date().toISOString(),
      mimeType: midi ? MIDI_MIME : take.audio?.mimeType ?? "audio/webm",
      blob: midi ? new Blob([JSON.stringify(take.events)], { type: "application/json" }) : take.audio!.blob,
      midiEvents: midi ? take.events : undefined,
      title: name,
      favourite: false,
    };
    await repo.putRecording(rec);
    setSavedTitles((t) => [...t, name]);
    setTakeSaved(true);
    setSaveOpen(false);
    audio.stinger("success");
    const store = useAppStore.getState();
    if (!hasBadge(child, "improviser")) {
      await store.updateChild(child.id, (c) => (hasBadge(c, "improviser") ? c : awardBadge(c, "improviser", rec.sessionId || undefined)));
      store.pushCelebration({ kind: "badge", title: "Improviser!", detail: "You saved your first song to My Songs.", emoji: "🎶" });
    } else {
      store.pushCelebration({ kind: "unlock", title: "Saved to My Songs", detail: name, emoji: "💾" });
    }
  };

  // ---- done ----
  const finish = () => {
    stopReplay();
    audio.stopGroove();
    captureRef.current?.dispose();
    recRef.current = null;
    audio.stinger("levelup");
    props.onComplete({
      details: { groove, bpm, recordings: takes, savedTitles, notesPlayed },
      midiScore: inputMode !== "timer" && notesPlayed > 0
        ? { score: Math.min(100, notesPlayed), components: { notesPlayed, savedRecordings: savedTitles.length }, badge: null, inputMode }
        : undefined,
    });
  };

  // ---- keyboard ----
  const [showNames, setShowNames] = React.useState(true);
  const highlights: Partial<Record<number, KeyState>> = {};
  for (let m = from; m <= to; m++) if (isInScale(m, scale)) highlights[m] = "scale";
  for (const m of replayKeys) highlights[m] = "hint";
  for (const m of activeKeys) highlights[m] = "active";

  const noteCount = take ? take.events.filter((e) => e.kind === "on").length : 0;

  return (
    <BlockShell
      type="improv"
      remainingSec={props.remainingSec}
      plannedSec={plannedSec}
      onDone={finish}
      onAddMinute={() => props.addSeconds(60)}
      doneLabel="Done for today!"
      headerRight={<InputBadge mode={inputMode} />}
    >
      <IdeaPrompts />

      <GroovePlayer groove={groove} onGroove={setGroove} unlocked={unlockedGrooves} bpm={bpm} onBpm={setBpm} playing={playing} onToggle={toggleGroove} beat={beat} keyLabel={scale.name} />

      <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Safe zone</h3>
            <p className="text-sm text-muted-foreground">Lit keys are in {scale.name}. Every note is allowed.</p>
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm font-bold text-muted-foreground">
            Note names <Switch checked={showNames} onCheckedChange={setShowNames} aria-label="Show note names" />
          </label>
        </div>
        <PianoKeyboard
          from={from}
          to={to}
          highlights={highlights}
          showNoteNames={showNames}
          preferFlats={flats}
          height={150}
          onNoteOn={(m) => { audio.noteOn(m); tap.note(m, "on"); }}
          onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }}
        />

        <div className="flex flex-wrap items-center gap-2">
          {recState === "recording" ? (
            <Button size="lg" variant="destructive" onClick={() => void stopRecording()} className="min-w-36">
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="inline-flex"><Circle className="h-5 w-5 fill-current" /></motion.span> Stop
            </Button>
          ) : (
            <Button size="lg" onClick={() => void startRecording()} className="min-w-36"><Circle className="h-5 w-5 fill-destructive text-destructive" /> Record</Button>
          )}
          {take && recState === "ready" && (
            <>
              {replaying === "take" ? (
                <Button size="lg" variant="outline" onClick={stopReplay}><Square className="h-5 w-5" /> Stop</Button>
              ) : (
                <Button size="lg" variant="secondary" onClick={() => (noteCount ? playEvents("take", take.events) : take.audio && playBlob("take", take.audio.blob))}><Play className="h-5 w-5" /> Replay</Button>
              )}
              <Button size="lg" variant="accent" onClick={() => void openSave()} disabled={takeSaved}><Save className="h-5 w-5" /> {takeSaved ? "Saved!" : "Save to My Songs"}</Button>
              <span className="text-sm font-bold text-muted-foreground">
                {noteCount ? `${noteCount} notes` : "sound only"} · {formatTakeLength(take.durationMs)}
              </span>
            </>
          )}
          {recState === "recording" && <span className="text-sm font-bold text-destructive">Recording… play anything!</span>}
          {micAvailable && (
            <label className={cn("ml-auto flex items-center gap-2 text-sm font-bold text-muted-foreground", recState === "recording" && "opacity-60")}>
              <Mic className="h-4 w-4" /> Record sound too
              <Switch checked={captureMic} onCheckedChange={setCaptureMic} disabled={recState === "recording"} aria-label="Also record audio from the microphone" />
            </label>
          )}
        </div>
        {micError && <p className="text-sm text-muted-foreground">{micError}</p>}
      </div>

      <MySongs childId={child.id} playingId={replaying && replaying !== "take" ? replaying : null} onReplay={replayRecording} onStop={stopReplay} />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your song</DialogTitle>
            <DialogDescription>It goes on your My Songs shelf so you can play it again any time.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="jam-title">Title</Label>
            <Input id="jam-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Not now</Button>
            <Button variant="accent" onClick={() => void save()}><Save className="h-5 w-5" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BlockShell>
  );
}
