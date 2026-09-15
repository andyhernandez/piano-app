"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen, Button, IconButton, Icon, Pill, SectionLabel, FormatBadge, SheetPanel, LeadSheet, ChordChart, Choice, Tempo, keyLabel } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { Assignment, Song } from "@/lib/types";
import { songById, LEAD_SHEET_LEVELS } from "@/lib/music/songs";
import { buildScale } from "@/lib/music/scales";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { readingBand } from "@/components/screens/library/pieces";
import { resolveChart, chartBars, leadBars, melodyFor, loopOptions, TEMPOS, type TempoText, type Level, type View } from "./sheet-data";
import { useChartPlayer } from "./use-chart-player";

const LEVEL_WORD = ["", "One level", "Two levels", "Three levels", "Four levels"];
const LEVEL_SHORT: Record<Level, string> = { 1: "L1 · Roots", 2: "L2 · Triads", 3: "L3 · Broken", 4: "L4 · Groove" };
const LEVEL_KEYS: Level[] = [1, 2, 3, 4];

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
        <div style={{ padding: "32px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 16, color: "var(--kc-ink-muted)", maxWidth: 520 }}>There is no piece with that id. It may have been removed from this device, or the link is from another household.</p>
          <div><Button variant="secondary" size="control" onClick={() => router.push("/library")}>Back to the library</Button></div>
        </div>
      </Screen>
    );
  }
  return <PieceBody song={loaded.song} assignment={loaded.assignment} teacherName={loaded.teacherName} childId={child.id} readingLevel={child.settings.readingLevel} countIn={child.settings.countIn} pinned={child.settings.pinnedSongIds ?? []} />;
}

function TopBar({ title, meta, right }: { title: string; meta?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ height: 56, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 16, padding: "0 30px" }}>
      <Link href="/library" aria-label="Back to the library" style={{ display: "inline-flex", color: "var(--kc-ink-dim)", border: "none" }}>
        <Icon name="chevron_left" size={26} />
      </Link>
      <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap" }}>{title}</span>
      {meta && <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>{right}</div>
    </div>
  );
}

/**
 * The reading page for a piece: its lead sheet or chord chart on the cream sheet, played back against the click.
 * Same chrome as a practice block; the format is stated, never apologised for.
 */
function PieceBody({ song, assignment, teacherName, childId, readingLevel, countIn, pinned }: { song: Song; assignment: Assignment | null; teacherName: string | null; childId: string; readingLevel: number; countIn: boolean; pinned: string[] }) {
  const router = useRouter();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const scale = React.useMemo(() => buildScale({ key: song.key, mode: song.mode }), [song.key, song.mode]);
  const bars = React.useMemo(() => resolveChart(song, scale), [song, scale]);
  const hasChart = bars.length > 0;
  const levels = (song.leadSheetLevels.length ? song.leadSheetLevels : LEVEL_KEYS) as Level[];
  const band = readingBand(readingLevel);
  const [view, setView] = React.useState<View>(hasChart && song.leadSheetLevels.length ? "lead-sheet" : "chord-chart");
  const [level, setLevel] = React.useState<Level>(() => levels.filter((l) => l <= band).pop() ?? levels[0]);
  const [tempo, setTempo] = React.useState<TempoText>("84");
  const loops = React.useMemo(() => loopOptions(bars.length), [bars.length]);
  const [loopId, setLoopId] = React.useState("all");
  const loop = loops.find((l) => l.id === loopId) ?? loops[0];
  const bpm = Number(tempo);
  const playerOpts = React.useMemo(() => ({ bpm, level, loop: { from: loop.from, to: loop.to }, countIn }), [bpm, level, loop.from, loop.to, countIn]);
  const player = useChartPlayer(bars, playerOpts);
  const { seconds, reset } = useStopwatch(player.playing);

  const above = Math.max(0, song.level - band);
  const inAssignment = assignment?.songIds.includes(song.id) ?? false;
  const inToday = inAssignment || pinned.includes(song.id);
  const toggleToday = () => {
    if (inAssignment) return;
    const next = inToday ? pinned.filter((p) => p !== song.id) : [...pinned, song.id];
    void updateSettings(childId, { pinnedSongIds: next });
  };

  const lineCount = Math.ceil(bars.length / 4);
  const lineHeight = lineCount <= 2 ? 160 : lineCount === 3 ? 150 : 124;
  const playhead = player.bar;
  const viewLabel = view === "lead-sheet" ? LEAD_SHEET_LEVELS[level].description : "The chords only, four bars to a row. Comp along with the click, or play the roots and sing the tune — both count.";
  const loopLabel = loop.id === "all" ? `ALL ${bars.length} BARS` : `BARS ${loop.from + 1}–${loop.to + 1}`;

  return (
    <Screen>
      <TopBar
        title={song.title}
        meta={<>{above > 0 ? `${LEVEL_WORD[Math.min(4, above)]} above your reading · ` : `Level ${song.level} · `}{keyLabel(song.key, song.mode)} · <Tempo bpm={bpm} /></>}
        right={
          <>
            {song.externalLink && (
              <a href={song.externalLink} target="_blank" rel="noopener noreferrer" style={{ border: "none", display: "inline-flex" }} aria-label="Open the score in a new tab">
                <IconButton icon="open_in_new" shape="square" size={38} label="Open the score" tabIndex={-1} />
              </a>
            )}
            {hasChart && <Pill tone={player.playing ? "mint" : "neutral"}>{player.countIn > 0 ? `COUNT-IN ${player.countIn}` : `\u{1D106} ${loopLabel} \u{1D107}`}</Pill>}
            <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
            {hasChart && (
              <Button variant="secondary" size="control" icon={player.playing ? "stop" : "play_arrow"} onClick={() => { if (player.playing) player.stop(); else { reset(); void player.start(); } }}>
                {player.playing ? "Stop" : "Play"}
              </Button>
            )}
          </>
        }
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 30px 0", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FormatBadge format={hasChart ? (view === "lead-sheet" ? "lead-sheet" : "chord-chart") : "full-notation"} assigned={inToday} size={44} />
          <p style={{ margin: 0, fontSize: 16, color: "var(--kc-ink-muted)", maxWidth: 620, lineHeight: 1.4 }}>
            {hasChart ? viewLabel : "Your own piece, read from its score. Open the score, set the click, and count it in your Pieces block."}
          </p>
          {hasChart && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
              {view === "lead-sheet" && levels.length > 1 && <Choice options={levels.map(String)} value={String(level)} onChange={(v) => setLevel(Number(v) as Level)} labels={Object.fromEntries(levels.map((l) => [String(l), LEVEL_SHORT[l]]))} />}
              {view === "lead-sheet" && levels.length > 1 && <span style={{ width: 1, height: 24, background: "var(--kc-border)", margin: "0 6px" }} />}
              <Button variant={view === "lead-sheet" ? "quiet" : "secondary"} size="control" onClick={() => setView("lead-sheet")} disabled={!song.leadSheetLevels.length}>Lead sheet</Button>
              <Button variant={view === "chord-chart" ? "quiet" : "secondary"} size="control" onClick={() => setView("chord-chart")}>Chords only</Button>
            </div>
          )}
        </div>

        {!hasChart ? (
          <SheetPanel>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "var(--kc-paper-ink-dim)", fontSize: 15 }}>
              <span>No chords on file for this piece. Its score lives at the link.</span>
              {song.externalLink ? (
                <a href={song.externalLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--kc-paper-ink)", fontWeight: 600 }}>Open the score</a>
              ) : (
                <span>Edit it in the Library to add a link or its chords.</span>
              )}
            </div>
          </SheetPanel>
        ) : view === "lead-sheet" ? (
          <SheetPanel>
            <div style={{ display: "flex", flexDirection: "column", gap: lineCount > 2 ? 12 : 20, width: 980 }}>
              {Array.from({ length: lineCount }, (_, li) => {
                const first = li * 4;
                const count = Math.min(4, bars.length - first);
                const lb = leadBars(bars, playhead == null ? -1 : playhead).slice(first, first + count);
                return <LeadSheet key={li} width={980 * (count / 4)} height={lineHeight} bars={lb} melody={melodyFor(bars, level, scale, first, count, playhead)} />;
              })}
            </div>
          </SheetPanel>
        ) : (
          <SheetPanel>
            <div style={{ width: 860 }}>
              <ChordChart cellHeight={bars.length > 12 ? 78 : 92} bars={chartBars(bars, playhead)} />
            </div>
          </SheetPanel>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--kc-border)", padding: "16px 30px 20px", display: "flex", alignItems: "center", gap: 28, flex: "none", background: "var(--kc-panel)" }}>
        {hasChart && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel size="meta">TEMPO</SectionLabel>
              <Choice<TempoText> options={[...TEMPOS]} value={tempo} onChange={setTempo} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel size="meta">LOOP</SectionLabel>
              <Choice options={loops.map((l) => l.id)} value={loop.id} onChange={setLoopId} labels={Object.fromEntries(loops.map((l) => [l.id, l.label]))} />
            </div>
            <div>
              <SectionLabel size="meta">TIMES THROUGH</SectionLabel>
              <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 20, marginTop: 4 }}>{player.timesThrough}</div>
            </div>
          </>
        )}
        {inAssignment && teacherName && <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", maxWidth: 240 }}>{teacherName} put this in today.</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Button variant="secondary" size="control" icon={inToday ? "check" : "add"} onClick={toggleToday} disabled={inAssignment} style={inToday ? { border: "1px solid var(--kc-mint)", color: "var(--kc-mint)" } : undefined}>{inToday ? "In today" : "Add to today"}</Button>
          <Button size="control" onClick={() => { player.stop(); router.push("/library"); }}>Done</Button>
        </div>
      </div>
    </Screen>
  );
}
