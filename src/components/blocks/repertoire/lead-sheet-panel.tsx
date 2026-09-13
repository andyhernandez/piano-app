"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Ear, Play, Square, Volume2 } from "lucide-react";
import type { InputMode, Scale, Song, Triad } from "@/lib/types";
import type { AudioEngine } from "@/lib/audio/engine";
import { useInput } from "@/lib/hooks/use-input";
import { LEAD_SHEET_LEVELS } from "@/lib/music/songs";
import { isInScale, prefersFlats } from "@/lib/music/scales";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { PianoKeyboard, keyboardRangeFor, type KeyState } from "@/components/keyboard/piano-keyboard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { chartMidis, chartPlaybackEvents, levelDemoEvents, transposeChart, triadHeld, type ChartBar, type LeadLevel, type PlaybackEvent } from "./chart";
import { useScheduler } from "./use-scheduler";

export interface LeadSheetPanelProps {
  audio: AudioEngine;
  scale: Scale;
  running: boolean;
  inputMode: InputMode;
  songs: Song[];
  song: Song;
  onSelectSong: (id: string) => void;
  level: LeadLevel;
  onLevel: (l: LeadLevel) => void;
  /** Fired each time all three tones of a chart chord are held together. */
  onChordPlayed: () => void;
}

type CheckState = "listening" | "heard" | "unsure";

export function LeadSheetPanel({ audio, scale, running, inputMode, songs, song, onSelectSong, level, onLevel, onChordPlayed }: LeadSheetPanelProps) {
  const bars = React.useMemo(() => transposeChart(song, scale), [song, scale]);
  const [from, to] = React.useMemo(() => keyboardRangeFor([...chartMidis(bars), ...scale.midiOneOctave]), [bars, scale]);
  const flats = prefersFlats(scale);

  const { schedule, clear } = useScheduler();
  const [bpm, setBpm] = React.useState(80);
  const [playing, setPlaying] = React.useState<"chart" | "demo" | null>(null);
  const [playingBar, setPlayingBar] = React.useState<number | null>(null);
  const [sounding, setSounding] = React.useState<number[]>([]);
  const [selectedBar, setSelectedBar] = React.useState<number | null>(null);
  const [held, setHeld] = React.useState<number[]>([]);
  const [litBar, setLitBar] = React.useState<number | null>(null);
  const [checks, setChecks] = React.useState<Record<number, CheckState>>({});
  const heldRef = React.useRef<Set<number>>(new Set());
  const litRef = React.useRef<number | null>(null);
  const soundToken = React.useRef(0);

  const stop = React.useCallback(() => {
    clear();
    setPlaying(null);
    setPlayingBar(null);
    setSounding([]);
  }, [clear]);

  // Time's up → silence any playback. State is reset lazily in the render below.
  React.useEffect(() => { if (!running) clear(); }, [running, clear]);
  const [prevRunning, setPrevRunning] = React.useState(running);
  if (prevRunning !== running) {
    setPrevRunning(running);
    if (!running) { setPlaying(null); setPlayingBar(null); setSounding([]); }
  }
  // New song → forget the bar selection and check results.
  const [prevSongId, setPrevSongId] = React.useState(song.id);
  if (prevSongId !== song.id) {
    setPrevSongId(song.id);
    setSelectedBar(null);
    setChecks({});
    setLitBar(null);
  }

  const sound = React.useCallback((midis: number[], durMs: number) => {
    const token = ++soundToken.current;
    setSounding(midis);
    schedule(() => { if (soundToken.current === token) setSounding([]); }, durMs);
  }, [schedule]);

  const run = React.useCallback((kind: "chart" | "demo", events: PlaybackEvent[], totalMs: number) => {
    clear();
    setPlaying(kind);
    for (const ev of events) {
      schedule(() => {
        setPlayingBar(ev.bar);
        if (ev.kind === "chord") { audio.playChord(ev.midis, ev.durSec); sound(ev.midis, ev.durSec * 1000); }
        else if (ev.kind === "note") { audio.playNote(ev.midis[0], ev.durSec); sound(ev.midis, ev.durSec * 1000); }
        else {
          audio.playSequence(ev.midis, ev.gapSec, ev.durSec);
          ev.midis.forEach((m, i) => schedule(() => sound([m], ev.durSec * 1000), 50 + i * ev.gapSec * 1000));
        }
      }, ev.atMs);
    }
    schedule(() => { setPlaying(null); setPlayingBar(null); setSounding([]); }, totalMs + 100);
  }, [audio, clear, schedule, sound]);

  const playChart = () => { const { events, totalMs } = chartPlaybackEvents(bars, bpm); run("chart", events, totalMs); };
  const playDemo = (lvl: LeadLevel) => { const { events, totalMs } = levelDemoEvents(lvl, bars, bpm); run("demo", events, totalMs); };

  const tapBar = (bar: ChartBar) => {
    setSelectedBar(bar.index);
    const chord = bar.chords[0];
    if (!chord) return;
    audio.playChord(chord.triad.midi);
    sound([...chord.triad.midi], 1200);
  };

  // Chord detection from any input (MIDI, on-screen multi-touch, mic).
  const { input, tap } = useInput({
    onNote: (e) => {
      if (e.kind === "on") heldRef.current.add(e.midi); else heldRef.current.delete(e.midi);
      const arr = Array.from(heldRef.current);
      setHeld(arr);
      const matches = (b: ChartBar) => b.chords.some((c) => triadHeld(c.triad, arr));
      let match: number | null = null;
      if (selectedBar !== null && bars[selectedBar] && matches(bars[selectedBar])) match = selectedBar;
      else { const idx = bars.findIndex(matches); match = idx >= 0 ? idx : null; }
      if (match !== null && litRef.current === null) { onChordPlayed(); audio.stinger("pop"); }
      litRef.current = match;
      setLitBar(match);
    },
  });

  const checkChord = async (barIdx: number, triad: Triad) => {
    setChecks((c) => ({ ...c, [barIdx]: "listening" }));
    const result = await input.verifyChord([...triad.midi]);
    const state: CheckState = result === "heard" ? "heard" : "unsure";
    setChecks((c) => ({ ...c, [barIdx]: state }));
    if (state === "heard") { audio.stinger("success"); onChordPlayed(); }
  };

  // Keyboard highlights: scale → sounding → held (green when a chord is lit).
  const highlights: Partial<Record<number, KeyState>> = {};
  for (let m = from; m <= to; m++) if (isInScale(m, scale)) highlights[m] = "scale";
  if (selectedBar !== null && playing === null) for (const c of bars[selectedBar]?.chords ?? []) for (const m of c.triad.midi) highlights[m] = "hint";
  for (const m of sounding) highlights[m] = "active";
  for (const m of held) highlights[m] = litBar !== null ? "correct" : "active";

  const levels = song.leadSheetLevels;
  const selected = selectedBar !== null ? bars[selectedBar] : undefined;
  const selectedCheck = selectedBar !== null ? checks[selectedBar] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {songs.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {songs.map((s) => (
            <button key={s.id} type="button" onClick={() => onSelectSong(s.id)} aria-pressed={s.id === song.id}
              className={cn("min-h-12 shrink-0 rounded-2xl border-2 px-4 font-bold transition-colors", s.id === song.id ? "border-primary bg-primary/10" : "border-border bg-card")}>
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold">{song.title}</h3>
            <p className="text-sm text-muted-foreground">Chord chart in {scale.name} · tap a bar to hear it</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-40 sm:block">
              <div className="flex justify-between text-xs font-bold text-muted-foreground"><span>Tempo</span><span className="font-mono text-foreground">{bpm}</span></div>
              <Slider value={[bpm]} min={50} max={140} step={5} onValueChange={(v) => setBpm(v[0])} aria-label="Chart tempo" className="py-1" />
            </div>
            {playing ? (
              <Button variant="outline" onClick={stop}><Square className="h-5 w-5" /> Stop</Button>
            ) : (
              <Button onClick={playChart}><Play className="h-5 w-5" /> Play chart</Button>
            )}
          </div>
        </div>
        <div className="w-full sm:hidden">
          <div className="flex justify-between text-xs font-bold text-muted-foreground"><span>Tempo</span><span className="font-mono text-foreground">{bpm} BPM</span></div>
          <Slider value={[bpm]} min={50} max={140} step={5} onValueChange={(v) => setBpm(v[0])} aria-label="Chart tempo" className="py-1" />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {bars.map((bar) => {
            const isSel = selectedBar === bar.index;
            const isPlaying = playingBar === bar.index;
            const isLit = litBar === bar.index;
            return (
              <motion.button
                key={bar.index}
                type="button"
                onClick={() => tapBar(bar)}
                animate={isPlaying ? { scale: 1.04 } : { scale: 1 }}
                whileTap={{ scale: 0.95 }}
                aria-pressed={isSel}
                aria-label={`Bar ${bar.index + 1}: ${bar.chords.map((c) => c.symbol).join(" ") || "rest"}`}
                className={cn(
                  "relative flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 transition-colors",
                  isLit ? "border-accent bg-accent/30" : isPlaying ? "border-secondary bg-secondary/30" : isSel ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <span className="absolute left-2 top-1 text-[10px] font-bold text-muted-foreground">{bar.index + 1}</span>
                <span className={cn("font-display font-bold leading-none", bar.chords.length > 1 ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl")}>
                  {bar.chords.map((c) => c.symbol).join(" · ") || "—"}
                </span>
                <span className="mt-1 text-xs font-bold text-muted-foreground">{bar.chords.map((c) => c.roman).join(" ")}</span>
              </motion.button>
            );
          })}
        </div>

        {selected && selected.chords[0] && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Bar {selected.index + 1}: {selected.chords.map((c) => c.symbol).join(" then ")}</span>
            <span className="text-muted-foreground">— notes {selected.chords[0].triad.midi.map((m) => noteLabel(m, flats)).join(" · ")}</span>
            {inputMode === "mic" && (
              <span className="ml-auto flex items-center gap-2">
                {selectedCheck === "heard" && <span className="font-bold text-accent-foreground">Heard it! 🎉</span>}
                {selectedCheck === "unsure" && <span className="font-bold text-muted-foreground">Not sure — try again</span>}
                <Button size="sm" variant="outline" disabled={selectedCheck === "listening"} onClick={() => void checkChord(selected.index, selected.chords[0].triad)}>
                  <Ear className="h-4 w-4" /> {selectedCheck === "listening" ? "Listening…" : "Check this chord"}
                </Button>
              </span>
            )}
            {inputMode === "midi" && litBar === selected.index && <span className="ml-auto font-bold text-accent-foreground">Got it! 🎉</span>}
          </div>
        )}

        <PianoKeyboard
          from={from}
          to={to}
          highlights={highlights}
          showNoteNames
          preferFlats={flats}
          height={130}
          onNoteOn={(m) => { audio.noteOn(m); tap.note(m, "on"); }}
          onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }}
        />
      </div>

      <Tabs value={String(level)} onValueChange={(v) => onLevel(Number(v) as LeadLevel)}>
        <TabsList className="flex w-full justify-start overflow-x-auto">
          {levels.map((l) => <TabsTrigger key={l} value={String(l)} className="flex-1">L{l}</TabsTrigger>)}
        </TabsList>
        {levels.map((l) => {
          const meta = LEAD_SHEET_LEVELS[l];
          const isDemo = playing === "demo" && level === l;
          return (
            <TabsContent key={l} value={String(l)}>
              <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold">{meta.title}</h3>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{LEVEL_HINT[l]}</p>
                </div>
                {isDemo ? (
                  <Button variant="outline" size="lg" onClick={stop}><Square className="h-5 w-5" /> Stop</Button>
                ) : (
                  <Button variant="secondary" size="lg" onClick={() => playDemo(l)}><Play className="h-5 w-5" /> Show me</Button>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

const LEVEL_HINT: Record<LeadLevel, string> = {
  1: "Demo: the first two bars, one bass note each.",
  2: "Demo: the first two bars, one block chord each.",
  3: "Demo: root – third – fifth – third, four quarter notes per bar.",
  4: "Demo: bass on 1 and 3, chord stabs on 2 and 4.",
};

function noteLabel(midi: number, flats: boolean): string {
  return prettyPc(midiToPc(midi, flats));
}
