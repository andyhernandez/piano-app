"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen, Button, IconButton, Icon, Pill, SheetPanel, LeadSheet, ChordChart, Tempo, Small, keyLabel } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { Assignment, Song } from "@/lib/types";
import { songById } from "@/lib/music/songs";
import { buildScale, prefersFlats } from "@/lib/music/scales";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { readingBand } from "@/components/screens/library/pieces";
import { resolveChart, chartBars, leadBars, melodyFor, loopOptions, TEMPOS, type TempoText, type Level, type View } from "./sheet-data";
import { useChartPlayer } from "./use-chart-player";

const LEVEL_WORD = ["", "One level", "Two levels", "Three levels", "Four levels"];
const LEVEL_KEYS: Level[] = [1, 2, 3, 4];
/** The four level cards, in the design's words. */
const LEVEL_CARD: Record<Level, { title: string; detail: string }> = {
  1: { title: "Bass roots", detail: "One note per bar" },
  2: { title: "Block triads", detail: "Left hand holds the chord" },
  3: { title: "Broken chords", detail: "Root, fifth, tenth" },
  4: { title: "Pop groove", detail: "Rhythm in both hands" },
};
/** What the left hand does at each level, for the hint under the sheet. */
const LEVEL_HINT: Record<Level, (chord: string) => string> = {
  1: (c) => `Play ${c.split(" – ")[0]} once and hold it for the whole bar. Right hand takes the tune.`,
  2: () => "Hold it for the whole bar. Right hand takes the tune.",
  3: () => "Root, third, fifth, third — four even quarter notes, no gaps.",
  4: () => "Root on one and three; the right hand stabs the chord on two and four.",
};

/** Reads `?id=` and loads the piece; the screen itself is below. */
export function PieceScreen() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const router = useRouter();
  const child = useActiveChild();
  const [loaded, setLoaded] = React.useState<{ song: Song | null; assignment: Assignment | null; teacherName: string | null } | null>(null);

  React.useEffect(() => {
    if (!child) router.replace("/onboarding");
  }, [child, router]);

  const childId = child?.id;
  React.useEffect(() => {
    if (!childId) return;
    let live = true;
    void (async () => {
      const builtIn = songById(id) ?? null;
      const [customs, assignment, teachers] = await Promise.all([builtIn ? Promise.resolve([] as Song[]) : repo.listCustomSongs(), repo.assignmentFor(childId), repo.listTeachers()]);
      const song = builtIn ?? customs.find((s) => s.id === id) ?? null;
      const teacherName = assignment ? teachers.find((t) => t.id === assignment.teacherId)?.name ?? null : null;
      if (live) setLoaded({ song, assignment: assignment ?? null, teacherName });
    })();
    return () => { live = false; };
  }, [childId, id]);

  if (!child) return <Screen>{null}</Screen>;
  if (!loaded) return <Screen><TopBar title="" /></Screen>;
  if (!loaded.song) {
    return (
      <Screen>
        <TopBar title="Not in the library" />
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--kc-ink-muted)", maxWidth: 520, lineHeight: 1.45 }}>There is no piece with that id. It may have been removed from this device, or the link is from another household.</p>
          <div><Button variant="secondary" size="control" onClick={() => router.push("/library")}>Back to the library</Button></div>
        </div>
      </Screen>
    );
  }
  return <PieceBody song={loaded.song} assignment={loaded.assignment} teacherName={loaded.teacherName} childId={child.id} readingLevel={child.settings.readingLevel} countIn={child.settings.countIn} pinned={child.settings.pinnedSongIds ?? []} />;
}

/** The 78px header of a piece: back, the title and what it is, then the state chip and Add to today. */
function TopBar({ title, meta, right }: { title: string; meta?: React.ReactNode; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 18, padding: "0 30px" }}>
      <IconButton icon="arrow_back" label="Back to the library" onClick={() => router.push("/library")} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {meta && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>{right}</div>
    </div>
  );
}

/**
 * The reading page for a piece: four level cards, the chord symbols over the melody staff on the white sheet,
 * a hint for the left hand, and a play-along bar. The format is stated, never apologised for.
 */
function PieceBody({ song, assignment, teacherName, childId, readingLevel, countIn, pinned }: { song: Song; assignment: Assignment | null; teacherName: string | null; childId: string; readingLevel: number; countIn: boolean; pinned: string[] }) {
  const router = useRouter();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const activeChild = useActiveChild();
  const scale = React.useMemo(() => buildScale({ key: song.key, mode: song.mode }), [song.key, song.mode]);
  const bars = React.useMemo(() => resolveChart(song, scale), [song, scale]);
  const hasChart = bars.length > 0;
  const levels = (song.leadSheetLevels.length ? song.leadSheetLevels : LEVEL_KEYS) as Level[];
  const band = readingBand(readingLevel);
  const [view, setView] = React.useState<View>(hasChart && song.leadSheetLevels.length ? "lead-sheet" : "chord-chart");
  const [level, setLevel] = React.useState<Level>(() => levels.filter((l) => l <= band).pop() ?? levels[0]);
  const [tempo, setTempo] = React.useState<TempoText>("72");
  const loops = React.useMemo(() => loopOptions(bars.length), [bars.length]);
  const [loopId, setLoopId] = React.useState("all");
  const loop = loops.find((l) => l.id === loopId) ?? loops[0];
  const bpm = Number(tempo);
  const playerOpts = React.useMemo(() => ({ bpm, level, loop: { from: loop.from, to: loop.to }, countIn }), [bpm, level, loop.from, loop.to, countIn]);
  const player = useChartPlayer(bars, playerOpts);
  const { reset } = useStopwatch(player.playing);

  const above = Math.max(0, song.level - band);
  const inAssignment = assignment?.songIds.includes(song.id) ?? false;
  const inToday = inAssignment || pinned.includes(song.id);
  const thisWeeksKey = !!activeChild && activeChild.roadmap.length > 0 && (() => { const s = activeChild.scaleOverride ?? activeChild.roadmap[Math.min(activeChild.roadmapIndex, activeChild.roadmap.length - 1)]; return s.key === song.key && s.mode === song.mode; })();
  const toggleToday = () => {
    if (inAssignment) return;
    const next = inToday ? pinned.filter((p) => p !== song.id) : [...pinned, song.id];
    void updateSettings(childId, { pinnedSongIds: next });
  };

  const lineCount = Math.ceil(bars.length / 4);
  const lineHeight = lineCount <= 1 ? 170 : lineCount === 2 ? 150 : lineCount === 3 ? 128 : 110;
  const playhead = player.bar;
  const flats = prefersFlats(scale);
  const hintBar = bars[playhead ?? 0];
  const hintChord = hintBar ? hintBar.chords[0] : null;
  const hintNotes = hintChord ? hintChord.midi.map((m) => prettyPc(midiToPc(m, flats))).join(" – ") : "";
  const format = !hasChart ? "Score at its link" : view === "lead-sheet" ? "Lead sheet" : "Chords only";
  const nextTempo = () => setTempo(TEMPOS[(TEMPOS.indexOf(tempo) + 1) % TEMPOS.length]);
  const nextLoop = () => setLoopId(loops[(loops.findIndex((l) => l.id === loop.id) + 1) % loops.length].id);
  const togglePlay = () => { if (player.playing) player.stop(); else { reset(); void player.start(); } };

  return (
    <Screen>
      <TopBar
        title={song.title}
        meta={<>{format} · {keyLabel(song.key, song.mode)} · {above > 0 ? `${LEVEL_WORD[Math.min(4, above)].toLowerCase()} above your reading` : `level ${song.level}`}</>}
        right={
          <>
            {song.externalLink && (
              <a href={song.externalLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", textDecoration: "none" }} aria-label="Open the score in a new tab">
                <IconButton icon="open_in_new" shape="square" label="Open the score" tabIndex={-1} />
              </a>
            )}
            {inToday ? <Pill tone="indigo-fill" icon="check">In today</Pill> : thisWeeksKey ? <Pill tone="sun">This week&rsquo;s key</Pill> : null}
            {!inAssignment && (
              <Button variant="secondary" size="pill" icon={inToday ? "remove" : "add"} onClick={toggleToday}>{inToday ? "Take out of today" : "Add to today"}</Button>
            )}
          </>
        }
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "22px 32px", gap: 16 }}>
        {hasChart && view === "lead-sheet" && (
          <div style={{ display: "flex", gap: 10, flex: "none" }}>
            {LEVEL_KEYS.map((l) => {
              const on = level === l;
              const available = levels.includes(l);
              return (
                <button key={l} type="button" disabled={!available} onClick={() => setLevel(l)} className="kc-press" style={{ flex: 1, borderRadius: 18, padding: "12px 14px", textAlign: "left", cursor: available ? "pointer" : "default", opacity: available ? 1 : 0.45, boxSizing: "border-box", ...(on ? { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: "0 4px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", color: "var(--kc-ink)", border: "2px solid var(--kc-border)" }) }}>
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".06em", color: on ? "#ffffff" : "var(--kc-ink-faint)" }}>LEVEL {l}</div>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{LEVEL_CARD[l].title}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: on ? "#ffffff" : "var(--kc-ink-muted)" }}>{LEVEL_CARD[l].detail}</div>
                </button>
              );
            })}
          </div>
        )}

        {!hasChart ? (
          <SheetPanel>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "var(--kc-ink-muted)", fontSize: 16, fontWeight: 700 }}>
              <span>No chords on file for this piece. Its score lives at the link.</span>
              {song.externalLink ? (
                <a href={song.externalLink} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 800 }}>Open the score</a>
              ) : (
                <span>Edit it in the Library to add a link or its chords.</span>
              )}
            </div>
          </SheetPanel>
        ) : view === "lead-sheet" ? (
          <SheetPanel padding={18} style={{ justifyContent: "center", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: lineCount > 2 ? 10 : 16, width: 1000, maxWidth: "100%" }}>
              {Array.from({ length: lineCount }, (_, li) => {
                const first = li * 4;
                const count = Math.min(4, bars.length - first);
                const lb = leadBars(bars, playhead == null ? -1 : playhead).slice(first, first + count);
                const w = 1000 * (count / 4);
                return (
                  <div key={li} style={{ width: w }}>
                    <div style={{ display: "flex", padding: "0 0 2px 28px" }}>
                      {lb.map((b, i) => {
                        const idx = first + i;
                        const current = playhead === idx;
                        return <span key={i} style={{ flex: 1, fontFamily: "var(--kc-font-display)", fontSize: lineCount > 2 ? 22 : 28, fontWeight: 600, lineHeight: 1, color: current ? "var(--kc-indigo)" : b.dim ? "var(--kc-ink-faint)" : "var(--kc-ink)" }}>{b.chord}</span>;
                      })}
                    </div>
                    <LeadSheet width={w} height={lineHeight} bars={lb.map((b) => ({ ...b, chord: "" }))} melody={melodyFor(bars, level, scale, first, count, playhead)} />
                  </div>
                );
              })}
            </div>
          </SheetPanel>
        ) : (
          <SheetPanel>
            <div style={{ width: 900, maxWidth: "100%" }}>
              <ChordChart cellHeight={bars.length > 12 ? 78 : 96} bars={chartBars(bars, playhead)} />
            </div>
          </SheetPanel>
        )}

        {hasChart && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
            <div style={{ flex: 1, background: "var(--kc-indigo-wash)", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Icon name="piano" size={26} color="var(--kc-indigo)" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{hintChord ? `Left hand: ${hintNotes}` : "Left hand plays the chords"}</div>
                <Small>{view === "lead-sheet" ? LEVEL_HINT[level](hintNotes) : "Comp along with the click, or play the roots and sing the tune — both count."}</Small>
              </div>
            </div>
            {song.leadSheetLevels.length > 0 && (
              <div style={{ display: "inline-flex", gap: 4, background: "var(--kc-cream)", borderRadius: 14, padding: 4, flex: "none" }}>
                {([["lead-sheet", "Lead sheet"], ["chord-chart", "Chords only"]] as [View, string][]).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setView(v)} style={{ height: 38, padding: "0 14px", borderRadius: 11, border: "none", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, cursor: "pointer", background: view === v ? "var(--kc-indigo)" : "transparent", color: view === v ? "#ffffff" : "var(--kc-ink-muted)" }}>{label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: "none", background: "var(--kc-panel)", borderTop: "2px solid var(--kc-hairline)", padding: "18px 32px", display: "flex", alignItems: "center", gap: 14 }}>
        {hasChart ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--kc-cream)", borderRadius: 18, padding: "10px 14px", flex: 1, minWidth: 0 }}>
              <IconButton icon={player.playing ? "stop" : "play_arrow"} variant="primary" label={player.playing ? "Stop" : "Play along"} onClick={togglePlay} />
              <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, whiteSpace: "nowrap" }}>{player.countIn > 0 ? `Count-in ${player.countIn}` : player.playing ? "Playing along" : "Play along"}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.timesThrough > 0 ? `${player.timesThrough} ${player.timesThrough === 1 ? "time" : "times"} through · ` : ""}click and the chords{loop.id === "all" ? "" : ` · bars ${loop.label}`}</span>
              <button type="button" onClick={nextTempo} aria-label="Change the tempo" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", color: "var(--kc-ink)", padding: "0 4px" }}>
                <Tempo bpm={bpm} size={17} />
              </button>
            </div>
            <Button variant="secondary" size="control" icon="repeat" onClick={nextLoop}>{loop.id === "all" ? "Loop a bar" : `Loop ${loop.label}`}</Button>
          </>
        ) : (
          inAssignment && teacherName ? <Small>{teacherName} put this in today.</Small> : <Small>Open the score, set the click, and count it in your Pieces stop.</Small>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <Button size="control" icon="play_arrow" onClick={() => { player.stop(); if (!inToday && !inAssignment) toggleToday(); router.push("/"); }}>Practise this</Button>
        </div>
      </div>
    </Screen>
  );
}
