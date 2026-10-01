"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { Recording, Scale, Song, Triad } from "@/lib/types";
import { BottomBar, Button, Choice, ChordChart, FormatBadge, Instruction, LeadSheet, Pill, SheetPanel, StatChip, midiToStep, type ChordBar, type LeadMelodyNote, type LeadSheetBar, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { repo } from "@/lib/db/repo";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { LEAD_SHEET_LEVELS, SONGS } from "@/lib/music/songs";
import { chordSymbol, romanToTriad } from "@/lib/music/chords";
import { prefersFlats, scaleSlug } from "@/lib/music/scales";
import { pcToMidi } from "@/lib/music/notes";
import { newId } from "@/lib/utils/id";
import { CARD, CardTitle, Cells, MetronomeDots, NextStopButton, PAGE, RoundButton, SMALL } from "./shared/controls";
import { PlayStrip, type StripTone } from "./shared/play-strip";

/*
 * Pieces (D5). The assigned or suggested piece as a lead sheet in the session key at one of the four level
 * cards, or chords only; a metronome that loops a bar range, a times-through count, the teacher's note, and
 * an optional take saved to the library. A custom piece (teacher upload, link) is a plain timed practice card
 * with notes.
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

/** The live size of the sheet card's inner box, so the staves can be cut to whatever height is left. */
function useBox<T extends HTMLElement>(): [React.RefObject<T | null>, number, number] {
  const ref = React.useRef<T>(null);
  const [box, setBox] = React.useState({ w: 1000, h: 300 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box.w, box.h];
}

/** Shift a voicing by whole octaves until it sits inside the on-screen keyboard. */
function foldInto(midis: number[], from: number, to: number): number[] {
  let shift = 0;
  while (Math.max(...midis) + shift > to) shift -= 12;
  while (Math.min(...midis) + shift < from) shift += 12;
  return midis.map((m) => m + shift);
}

/** "L2 · Block triads" as the library stores it, in sentence case. */
function levelTitle(level: LeadLevel): string {
  const [code, name] = LEAD_SHEET_LEVELS[level].title.split(" · ");
  return `${code} · ${name[0]}${name.slice(1).toLowerCase()}`;
}

/** The short name of a level card for a segmented choice: "Bass roots". */
/** One-word chip labels so the four levels fit one row of the settings card. */
const LEVEL_CHIP: Record<number, string> = { 1: "Roots", 2: "Triads", 3: "Broken", 4: "Groove" };

function levelShort(level: LeadLevel): string {
  const name = LEAD_SHEET_LEVELS[level].title.split(" · ")[1] ?? `L${level}`;
  return `${name[0]}${name.slice(1).toLowerCase()}`;
}

function dateLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PiecesBlock({ child, session, scale, inputMode, nextTitle, paused, timeUp, onDone, setPrimaryLabel, setMeta, setRecording }: BlockProps) {
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
  const assigned = !!song && loaded.assigned.includes(song.id);
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

  React.useEffect(() => {
    if (!song) return;
    setMeta?.(custom ? `${song.title} · your own copy` : `${song.title} · ${levelTitle(level)} · bars ${loop.from + 1}–${loop.to + 1}`);
    return () => setMeta?.(null);
  }, [setMeta, song, custom, level, loop.from, loop.to]);

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
  const tones: Partial<Record<number, StripTone>> = {};
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
  React.useEffect(() => { setRecording?.(rec === "recording"); return () => setRecording?.(false); }, [rec, setRecording]);
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
  const [sheetRef, sheetWidth, sheetHeight] = useBox<HTMLDivElement>();
  const perRow = bars.length > 8 ? 8 : 4;
  const rowsOfBars: ChartBar[][] = [];
  for (let s = 0; s < bars.length; s += perRow) rowsOfBars.push(bars.slice(s, s + perRow));
  const leadWidth = Math.max(560, Math.min(1040, sheetWidth - 8));
  // The staves take whatever the card has left: full height for one row, cut down when two must share it.
  const rowCount = Math.max(1, rowsOfBars.length);
  const rowGap = rowCount > 1 ? 24 : 0;
  const leadHeight = Math.max(88, Math.min(perRow === 8 ? 124 : 150, Math.floor((sheetHeight - rowGap * (rowCount - 1)) / rowCount)));
  const chartRows = Math.max(1, Math.ceil(bars.length / 4));
  const chartCellHeight = Math.max(44, Math.min(bars.length > 12 ? 60 : 76, Math.floor((sheetHeight - 6 * (chartRows - 1)) / chartRows)));
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

  const instruction = custom
    ? "Your own piece. Practise from the score you have; count each time through here."
    : running
      ? `Bar ${(bar ?? loop.from) + 1}. ${LEAD_SHEET_LEVELS[level].description}`
      : view === "lead-sheet"
        ? LEAD_SHEET_LEVELS[level].description
        : "Chords only. Comp the changes on the first beat of each bar, or play the tune over them.";
  const timesCount = custom ? throughs : times;
  const cells = Math.max(5, timesCount + 2);
  const loopText = loop.from === 0 && loop.to === bars.length - 1 ? "the whole piece" : `bars ${loop.from + 1}–${loop.to + 1}`;
  const recLine = rec === "recording" ? "Recording. Stop to keep the take." : rec === "saved" ? `Kept as “${song?.title} · ${dateLabel()}”.` : rec === "failed" ? "The microphone was not available." : null;

  if (!song) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--kc-ink-muted)", fontWeight: 700 }}>
        <span>No pieces yet.</span>
        <NextStopButton nextTitle={nextTitle} onClick={finish} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={PAGE}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Instruction style={{ flex: 1, minWidth: 0 }}>{instruction}</Instruction>
          {assigned && <Pill tone="sun" icon="push_pin">Assigned</Pill>}
          {!custom && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 16px", borderRadius: 999, background: "var(--kc-indigo)", color: "#ffffff", whiteSpace: "nowrap", flex: "none" }}>
              <span style={{ fontFamily: "var(--kc-font-music)", fontSize: 20, lineHeight: 1 }}>𝄆</span>
              <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600 }}>{loopText}</span>
              <span style={{ fontFamily: "var(--kc-font-music)", fontSize: 20, lineHeight: 1 }}>𝄇</span>
            </span>
          )}
        </div>

        {custom ? (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16 }}>
            <div style={CARD}>
              <CardTitle>Note for next time</CardTitle>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Which bars, which hand, what to fix." style={{ flex: 1, minHeight: 120, resize: "none", background: "var(--kc-base)", color: "var(--kc-ink)", border: "2px dashed var(--kc-border)", borderRadius: 14, padding: "10px 12px", fontFamily: "var(--kc-font-sans)", fontSize: 15, fontWeight: 700, lineHeight: 1.45, outline: "none" }} />
              {song.externalLink && <Button variant="secondary" size="pill" icon="link" onClick={() => window.open(song.externalLink, "_blank", "noopener")} style={{ alignSelf: "flex-start" }}>Open the score</Button>}
            </div>
            <div style={CARD}>
              <CardTitle>Times through</CardTitle>
              <Cells count={cells} current={throughs} />
              <div style={SMALL}>Nothing is listening to the page; mark each run yourself.</div>
              <Button size="control" icon="check" onClick={() => setThroughs((t) => t + 1)} style={{ alignSelf: "flex-start", marginTop: "auto" }}>I played it through</Button>
            </div>
          </div>
        ) : (
          <>
            <SheetPanel padding={16} style={{ flex: 1, minHeight: 0 }}>
              <div ref={sheetRef} style={{ width: "100%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "safe center", gap: view === "lead-sheet" ? rowGap : 0 }}>
                {view === "lead-sheet"
                  ? rowsOfBars.map((row, r) => { const { bars: lb, melody } = leadRow(row); return <LeadSheet key={r} width={leadWidth} height={leadHeight} bars={lb} melody={melody} />; })
                  : <ChordChart bars={chartBars} perRow={4} cellHeight={chartCellHeight} style={{ maxWidth: 900 }} />}
              </div>
            </SheetPanel>
            {inputMode === "timer" && <PlayStrip from={kbFrom} to={kbTo} height={84} tones={tones} onNoteOn={(m) => { void unlock(); audio.noteOn(m); tap.note(m, "on"); }} onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }} />}
            {/* One short row of settings, so the sheet above keeps the height it needs. */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.5fr) minmax(0, 1.05fr)", gap: 12, flex: "none" }}>
              <div style={{ ...CARD, padding: "11px 15px", gap: 7, justifyContent: "center" }}>
                <CardTitle size={16}>Times through</CardTitle>
                <Cells count={cells} current={timesCount} labels={false} height={22} />
                <div style={{ ...SMALL, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{running ? `Looping ${loopText} at ${bpm}.` : "The click counts each loop."}</div>
              </div>
              <div style={{ ...CARD, padding: "11px 15px", gap: 7, justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CardTitle size={16}>Left hand</CardTitle>
                    <div style={{ ...SMALL, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{levelTitle(level)}</div>
                  </div>
                  <Choice size="compact" options={levels.map(String)} value={String(level)} onChange={(v) => setLevelPref(Number(v) as LeadLevel)} labels={Object.fromEntries(levels.map((l) => [String(l), LEVEL_CHIP[l] ?? levelShort(l)])) as Record<string, string>} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)", flex: "none" }}>Loop</span>
                  <Choice size="compact" options={loopOptions} value={loopPref} onChange={setLoopPref} labels={loopLabels} style={{ flexWrap: "nowrap", overflowX: "auto", minWidth: 0, flex: "0 1 auto" }} />
                  <Choice size="compact" options={["lead-sheet", "chord-chart"] as View[]} value={view} onChange={setView} labels={{ "lead-sheet": "Sheet", "chord-chart": "Chords" }} style={{ marginLeft: "auto", flexWrap: "nowrap" }} />
                </div>
              </div>
              <div style={{ ...CARD, padding: "11px 15px", gap: 6, justifyContent: "center" }}>
                <CardTitle size={16} meta={candidates.length > 1 ? <Button variant="quiet" size="pill" icon="swap_horiz" onClick={() => { setPickIndex((i) => i + 1); setLoopPref("all"); }} style={{ height: 28, padding: "0 8px", fontSize: 14, gap: 5 }}>Another piece</Button> : undefined}>Note for next time</CardTitle>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--kc-ink-muted)", border: "2px dashed var(--kc-border)", borderRadius: 12, padding: "6px 10px", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{loaded.note || (assigned ? "No note from your teacher this week." : "Play it through at this tempo before going faster.")}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomBar
        actions={
          <>
            {timeUp && <Pill tone="sun">Time</Pill>}
            {!custom && <Button variant="secondary" size="control" icon="slow_motion_video" onClick={() => setBpm((b) => Math.max(40, b - 6))}>Slower</Button>}
            {!custom && <Button variant="secondary" size="control" icon="speed" onClick={() => setBpm((b) => Math.min(160, b + 6))}>Faster</Button>}
            {!custom && <RoundButton icon={running ? "stop" : "play_arrow"} primary label={running ? "Stop the click" : "Start the click"} onClick={toggleMetronome} />}
            {canRecord && <RoundButton icon={rec === "recording" ? "stop" : "mic"} label={rec === "recording" ? "Stop recording" : "Record this"} disabled={rec === "saving"} onClick={() => { void toggleRecord(); }} />}
            <NextStopButton nextTitle={nextTitle} onClick={finish} />
          </>
        }
      >
        <StatChip tone="mint" value={timesCount} label={<>times<br />through</>} />
        {!custom && <StatChip tone="indigo" icon="speed" line1={<><span style={{ fontFamily: "var(--kc-font-music)" }}>𝅘𝅥</span>{bpm} · {loopText}</>} line2={recLine ?? (running ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MetronomeDots beat={beat} size={8} /> looping</span> : "click is off")} />}
        {custom && recLine && <StatChip tone="indigo" icon="mic" line1={recLine} line2={song.title} />}
        <FormatBadge format={custom ? "full-notation" : view} assigned={assigned} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{song.title}</div>
          <div style={{ ...SMALL, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{custom ? "Your own copy" : `${scale.name}`}</div>
        </div>
      </BottomBar>
    </div>
  );
}
