"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { Recording, Scale, Song, Triad } from "@/lib/types";
import { BottomBar, Button, Choice, ChordChart, FormatBadge, IconButton, Keyboard, LeadSheet, Metric, Pill, SectionLabel, SheetPanel, Tempo, midiToStep, type ChordBar, type KeyTone, type LeadMelodyNote, type LeadSheetBar, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { repo } from "@/lib/db/repo";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { LEAD_SHEET_LEVELS, SONGS } from "@/lib/music/songs";
import { chordSymbol, romanToTriad } from "@/lib/music/chords";
import { prefersFlats, scaleSlug } from "@/lib/music/scales";
import { pcToMidi } from "@/lib/music/notes";
import { newId } from "@/lib/utils/id";

/*
 * Pieces (the kit's LeadSheetScreen, inside the runner). The assigned or suggested piece as a lead sheet in the
 * session key at one of the four level cards, or chords only; a metronome that loops a bar range, a
 * times-through count, and an optional take saved to the library. A custom piece (teacher upload, link) is a
 * plain timed practice card with notes.
 */

type LeadLevel = 1 | 2 | 3 | 4;
type View = "lead-sheet" | "chord-chart";
type RecState = "idle" | "recording" | "saving" | "saved" | "failed";

interface ChartBar { index: number; chords: { roman: string; triad: Triad; symbol: string }[] }

function transposeChart(song: Song, scale: Scale): ChartBar[] {
  return (song.chart ?? []).map((bar, index) => ({
    index,
    chords: bar.map((roman) => { const triad = romanToTriad(roman, scale); return triad ? { roman, triad, symbol: chordSymbol(triad) } : null; }).filter((c): c is ChartBar["chords"][number] => c !== null),
  }));
}

function isCustomPiece(song: Song): boolean {
  return !!song.isCustom || !song.chart?.length || !song.leadSheetLevels?.length;
}

/** The assigned pieces, else what fits: this key's songs first, then anything at or under the reading level. */
function candidatesFor(scale: Scale, readingLevel: number, assigned: string[], custom: Song[]): Song[] {
  const all = [...SONGS, ...custom];
  const fromAssignment = assigned.map((id) => all.find((s) => s.id === id)).filter((s): s is Song => !!s);
  if (fromAssignment.length) return fromAssignment;
  const region = scaleSlug(scale);
  const lvl = Math.max(1, Math.min(5, Math.ceil(readingLevel / 2)));
  const inKey = SONGS.filter((s) => s.unlockedByRegion === region);
  const byLevel = SONGS.filter((s) => s.level <= lvl && !inKey.includes(s)).sort((a, b) => b.level - a.level);
  return [...inKey, ...byLevel].slice(0, 6);
}

/** What the left hand plays in a bar at a level card: L1 bass roots, L2 block triads, L3 broken, L4 pop groove. */
function levelPattern(level: LeadLevel, triad: Triad): { beat: number; midis: number[] }[] {
  const [root, third, fifth] = triad.midi;
  switch (level) {
    case 1: return [{ beat: 0, midis: [root - 12] }];
    case 2: return [{ beat: 0, midis: [root, third, fifth] }];
    case 3: return [{ beat: 0, midis: [root] }, { beat: 1, midis: [third] }, { beat: 2, midis: [fifth] }, { beat: 3, midis: [third] }];
    case 4: return [{ beat: 0, midis: [root - 12] }, { beat: 1, midis: [root, third, fifth] }, { beat: 2, midis: [root - 12] }, { beat: 3, midis: [root, third, fifth] }];
  }
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(1000);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { const w = entries[0]?.contentRect.width; if (w) setWidth(Math.floor(w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Shift a voicing by whole octaves until it sits inside the on-screen keyboard. */
function foldInto(midis: number[], from: number, to: number): number[] {
  let shift = 0;
  while (Math.max(...midis) + shift > to) shift -= 12;
  while (Math.min(...midis) + shift < from) shift += 12;
  return midis.map((m) => m + shift);
}

/** "L2 · Block Triads" as the library stores it, in sentence case. */
function levelTitle(level: LeadLevel): string {
  const [code, name] = LEAD_SHEET_LEVELS[level].title.split(" · ");
  return `${code} · ${name[0]}${name.slice(1).toLowerCase()}`;
}

function dateLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PiecesBlock({ child, session, scale, inputMode, nextTitle, paused, timeUp, onDone, setPrimaryLabel }: BlockProps) {
  const { audio, unlock } = useAudio();
  React.useEffect(() => { setPrimaryLabel?.(null); }, [setPrimaryLabel]);

  // ---- the piece ----
  const [loaded, setLoaded] = React.useState<{ assigned: string[]; note: string; custom: Song[] }>({ assigned: [], note: "", custom: [] });
  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([repo.assignmentFor(child.id), repo.listCustomSongs()]).then(([a, custom]) => {
      if (!cancelled) setLoaded({ assigned: a?.songIds ?? [], note: a?.note ?? "", custom: custom ?? [] });
    });
    return () => { cancelled = true; };
  }, [child.id]);
  const candidates = React.useMemo(() => candidatesFor(scale, child.settings.readingLevel, loaded.assigned, loaded.custom), [scale, child.settings.readingLevel, loaded]);
  const [pickIndex, setPickIndex] = React.useState(0);
  const song = candidates[pickIndex % Math.max(1, candidates.length)];
  const custom = song ? isCustomPiece(song) : false;
  const bars = React.useMemo(() => (song && !custom ? transposeChart(song, scale) : []), [song, custom, scale]);
  const flats = prefersFlats(scale);

  const [levelPref, setLevelPref] = React.useState<LeadLevel>(2);
  const levels: LeadLevel[] = song?.leadSheetLevels?.length ? song.leadSheetLevels : [1];
  const level: LeadLevel = levels.includes(levelPref) ? levelPref : levels[0];
  const [view, setView] = React.useState<View>("lead-sheet");

  // ---- loop, tempo, metronome ----
  const chunks = React.useMemo(() => { const out: number[] = []; for (let s = 0; s < bars.length; s += 4) out.push(s); return out; }, [bars.length]);
  const [loopPref, setLoopPref] = React.useState("all");
  const loop = React.useMemo(() => {
    const start = Number(loopPref);
    if (loopPref === "all" || Number.isNaN(start) || start >= bars.length) return { from: 0, to: Math.max(0, bars.length - 1) };
    return { from: start, to: Math.min(bars.length - 1, start + 3) };
  }, [loopPref, bars.length]);
  const loopOptions = ["all", ...chunks.map(String)];
  const loopLabels = Object.fromEntries([["all", "All"], ...chunks.map((s) => [String(s), `${s + 1}–${Math.min(bars.length, s + 4)}`])]) as Record<string, string>;

  const [bpm, setBpm] = React.useState(76);
  const bpmRef = React.useRef(bpm);
  const [running, setRunning] = React.useState(false);
  const [bar, setBar] = React.useState<number | null>(null);
  const [beat, setBeat] = React.useState(-1);
  const [times, setTimes] = React.useState(0);
  const barRef = React.useRef<number | null>(null);
  const loopRef = React.useRef(loop);
  React.useEffect(() => { loopRef.current = loop; }, [loop]);

  const onBeat = (b: number) => {
    if (b === 0) {
      const { from, to } = loopRef.current;
      const prev = barRef.current;
      let nb: number;
      if (prev === -2) nb = -1; // count-in bar
      else if (prev === null || prev === -1 || prev < from) nb = from;
      else if (prev >= to) { nb = from; setTimes((t) => t + 1); }
      else nb = prev + 1;
      barRef.current = nb;
      setBar(nb);
    }
    setBeat(b);
  };
  const onBeatRef = React.useRef(onBeat);
  React.useEffect(() => { onBeatRef.current = onBeat; });

  React.useEffect(() => {
    if (!running || paused || custom) return;
    audio.startMetronome({ bpm: bpmRef.current, beatsPerBar: 4, onBeat: (b) => onBeatRef.current(b) });
    return () => audio.stopMetronome();
  }, [running, paused, custom, audio]);
  React.useEffect(() => { bpmRef.current = bpm; if (running) audio.setMetronomeBpm(bpm); }, [bpm, running, audio]);

  const toggleMetronome = () => {
    void unlock();
    if (running) { setRunning(false); setBeat(-1); setBar(null); barRef.current = null; return; }
    barRef.current = child.settings.countIn ? -2 : null;
    setRunning(true);
  };

  // ---- the keys ----
  const [held, setHeld] = React.useState<number[]>([]);
  const heldRef = React.useRef<Set<number>>(new Set());
  const { tap } = useInput({
    onNote: (e) => {
      if (e.kind === "on") heldRef.current.add(e.midi); else heldRef.current.delete(e.midi);
      setHeld(Array.from(heldRef.current));
    },
  });
  const tonic = pcToMidi(scale.key, 4);
  const kbFrom = tonic - 12;
  const kbTo = tonic + 12;
  const tones: Partial<Record<number, KeyTone>> = {};
  if (bar !== null && bars[bar]?.chords[0]) {
    const pattern = levelPattern(level, bars[bar].chords[0].triad);
    for (const m of foldInto(pattern.flatMap((p) => p.midis), kbFrom, kbTo)) tones[m] = "mint";
  }
  for (const m of held) tones[m] = "mint";

  // ---- recording ----
  const recorder = React.useRef<AudioRecorder | null>(null);
  const [rec, setRec] = React.useState<RecState>("idle");
  const [recordingId, setRecordingId] = React.useState<string | null>(null);
  const canRecord = AudioRecorder.supported();
  React.useEffect(() => () => { recorder.current?.cancel(); }, []);
  const toggleRecord = async () => {
    if (rec === "recording") {
      setRec("saving");
      const r = recorder.current;
      recorder.current = null;
      const blob = r ? await r.stop() : new Blob();
      if (!blob.size || !song) { setRec("failed"); return; }
      const row: Recording = { id: newId("rec"), childId: child.id, sessionId: session.id, blockType: "repertoire", createdAt: new Date().toISOString(), mimeType: blob.type || r?.mimeType || "audio/webm", blob, title: `${song.title} · ${dateLabel()}` };
      try { await repo.putRecording(row); setRecordingId(row.id); setRec("saved"); } catch { setRec("failed"); }
      return;
    }
    try {
      const r = new AudioRecorder();
      await r.start();
      recorder.current = r;
      setRec("recording");
    } catch { setRec("failed"); }
  };

  // ---- custom piece ----
  const [notes, setNotes] = React.useState("");
  const [throughs, setThroughs] = React.useState(0);

  const finish = () => {
    audio.stopMetronome();
    recorder.current?.cancel();
    onDone({
      completed: true,
      skipped: false,
      inputMode,
      recordingId: recordingId ?? undefined,
      notes: custom && notes.trim() ? notes.trim() : undefined,
      details: { songId: song?.id ?? null, title: song?.title ?? null, level: custom ? null : level, timesThrough: custom ? throughs : times, bpm, loop: custom ? null : [loop.from + 1, loop.to + 1], view, custom },
    });
  };

  // ---- the sheet ----
  const [sheetRef, sheetWidth] = useWidth<HTMLDivElement>();
  const perRow = bars.length > 8 ? 8 : 4;
  const rowsOfBars: ChartBar[][] = [];
  for (let s = 0; s < bars.length; s += perRow) rowsOfBars.push(bars.slice(s, s + perRow));
  const leadWidth = Math.max(560, Math.min(1040, sheetWidth - 8));
  const stateFor = (b: ChartBar): NoteState => (b.index < loop.from || b.index > loop.to ? "upcoming" : bar === b.index ? "current" : undefined);
  const leadRow = (row: ChartBar[]) => {
    const padded: LeadSheetBar[] = row.map((b) => ({ chord: b.chords.map((c) => c.symbol).join(" "), dim: b.index < loop.from || b.index > loop.to }));
    while (padded.length < perRow) padded.push({ chord: "" });
    const melody: LeadMelodyNote[] = [];
    row.forEach((b, i) => {
      const chord = b.chords[0];
      if (!chord) return;
      for (const p of levelPattern(level, chord.triad)) for (const m of p.midis) melody.push({ bar: i, beat: p.beat, step: midiToStep(m, "treble", flats), value: level === 1 || level === 2 ? "whole" : "quarter", stem: "up", state: stateFor(b) });
    });
    return { bars: padded, melody };
  };
  const chartBars: ChordBar[] = bars.map((b) => ({ chord: b.chords.map((c) => c.symbol).join(" "), current: bar === b.index, played: b.index < loop.from || b.index > loop.to ? false : undefined }));

  const meta = song ? (custom ? `Your own copy · ${loaded.assigned.includes(song.id) ? "assigned" : "from the library"}` : `${levelTitle(level)} · ${scale.name}`) : "";
  const lede = custom
    ? "Your own piece. Practise from the score you have; count each time through here and leave a note for next time."
    : view === "lead-sheet"
      ? LEAD_SHEET_LEVELS[level].description
      : "Chords only. Comp the changes on the first beat of each bar, or play the tune over them.";

  if (!song) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kc-ink-dim)" }}>
        <span>No pieces yet.</span>
        <Button size="control" style={{ marginLeft: 16 }} onClick={finish}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 30px 0", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FormatBadge format={custom ? "full-notation" : view} assigned={loaded.assigned.includes(song.id)} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", marginTop: 2 }}>{meta}</div>
          </div>
          <p style={{ margin: "0 0 0 10px", fontSize: 15, color: "var(--kc-ink-muted)", maxWidth: 460, lineHeight: 1.4 }}>{lede}</p>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flex: "none" }}>
            {candidates.length > 1 && <Button variant="secondary" size="control" onClick={() => { setPickIndex((i) => i + 1); setLoopPref("all"); }}>Another piece</Button>}
            {!custom && <Button variant={view === "lead-sheet" ? "quiet" : "secondary"} size="control" onClick={() => setView("lead-sheet")}>Lead sheet</Button>}
            {!custom && <Button variant={view === "chord-chart" ? "quiet" : "secondary"} size="control" onClick={() => setView("chord-chart")}>Chords only</Button>}
          </div>
        </div>

        {custom ? (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, paddingBottom: 20 }}>
            <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              <SectionLabel>Notes for next time</SectionLabel>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Which bars, which hand, what to fix." style={{ flex: 1, minHeight: 120, resize: "none", background: "var(--kc-base)", color: "var(--kc-ink)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-control)", padding: 12, fontFamily: "var(--kc-font-sans)", fontSize: 15, lineHeight: 1.45, outline: "none" }} />
              {song.externalLink && <Button variant="quiet" size="pill" icon="link" onClick={() => window.open(song.externalLink, "_blank", "noopener")} style={{ alignSelf: "flex-start" }}>Open the score</Button>}
            </div>
            <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              <SectionLabel>Times through</SectionLabel>
              <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32 }}>{throughs}</span>
              <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Nothing is listening to the page; mark each run yourself.</span>
              <Button size="control" icon="check" onClick={() => setThroughs((t) => t + 1)} style={{ alignSelf: "flex-start", marginTop: "auto" }}>I played it through</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <Choice options={levels.map(String)} value={String(level)} onChange={(v) => setLevelPref(Number(v) as LeadLevel)} labels={Object.fromEntries(levels.map((l) => [String(l), levelTitle(l)])) as Record<string, string>} />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <SectionLabel>Loop bars</SectionLabel>
                <Choice options={loopOptions} value={loopPref} onChange={setLoopPref} labels={loopLabels} />
              </div>
            </div>
            <SheetPanel padding={22} style={{ flex: 1, minHeight: 0 }}>
              <div ref={sheetRef} style={{ width: "100%", maxHeight: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
                {view === "lead-sheet"
                  ? rowsOfBars.map((row, r) => { const { bars: lb, melody } = leadRow(row); return <LeadSheet key={r} width={leadWidth} height={perRow === 8 ? 132 : 150} bars={lb} melody={melody} />; })
                  : <ChordChart bars={chartBars} perRow={4} cellHeight={bars.length > 12 ? 64 : 80} style={{ maxWidth: 900 }} />}
              </div>
            </SheetPanel>
            <Keyboard from={kbFrom} to={kbTo} height={104} tones={tones} onNoteOn={(m) => { void unlock(); audio.noteOn(m); tap.note(m, "on"); }} onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }} style={{ flex: "none", marginBottom: 20 }} />
          </>
        )}
      </div>

      <BottomBar
        actions={
          <>
            {timeUp && <Pill tone="amber">Time</Pill>}
            {!custom && <Button variant="secondary" size="control" onClick={() => setBpm((b) => Math.max(40, b - 6))}>Slower</Button>}
            {!custom && <Button variant="secondary" size="control" onClick={() => setBpm((b) => Math.min(160, b + 6))}>Faster</Button>}
            {!custom && <IconButton icon={running ? "stop" : "play_arrow"} label={running ? "Stop the metronome" : "Start the metronome"} size={40} onClick={toggleMetronome} style={running ? { borderColor: "var(--kc-mint)", color: "var(--kc-mint)" } : undefined} />}
            {canRecord && <IconButton icon={rec === "recording" ? "stop" : "mic"} label={rec === "recording" ? "Stop recording" : "Record this"} size={40} disabled={rec === "saving"} onClick={() => { void toggleRecord(); }} style={rec === "recording" ? { borderColor: "var(--kc-clay)", color: "var(--kc-clay)" } : undefined} />}
            <Button size="control" onClick={finish}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 26 }}>
          {!custom && <Metric label="Tempo" value={<Tempo bpm={bpm} size={15} />} />}
          {!custom && <Metric label="Loop" value={loop.from === 0 && loop.to === bars.length - 1 ? "whole piece" : <span><span style={{ fontFamily: "var(--kc-font-music)" }}>𝄆</span> bars {loop.from + 1}–{loop.to + 1} <span style={{ fontFamily: "var(--kc-font-music)" }}>𝄇</span></span>} />}
          <Metric label="Times through" value={custom ? throughs : times} />
          {!custom && running && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingBottom: 6 }}>
              {[0, 1, 2, 3].map((b) => <span key={b} style={{ width: 10, height: 10, borderRadius: "50%", background: beat === b ? "var(--kc-mint)" : "var(--kc-raised)" }} />)}
            </div>
          )}
        </div>
        <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", maxWidth: 300, lineHeight: 1.4 }}>
          {rec === "recording" ? "Recording. Stop to keep the take." : rec === "saved" ? `Kept as “${song.title} · ${dateLabel()}”.` : rec === "failed" ? "The microphone was not available." : loaded.note || (custom ? "" : "Play it through at this tempo before going faster.")}
        </span>
      </BottomBar>
    </div>
  );
}
