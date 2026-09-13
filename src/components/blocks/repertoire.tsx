"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeftRight } from "lucide-react";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/hooks/use-audio";
import { repo } from "@/lib/db/repo";
import { SplitTimer, budgetFor, type SplitSide } from "./repertoire/split-timer";
import { PiecePanel } from "./repertoire/piece-panel";
import { LeadSheetPanel } from "./repertoire/lead-sheet-panel";
import { allLibrarySongs, starterSongs, unlockedSongs, type LeadLevel } from "./repertoire/chart";

const OTHER: Record<SplitSide, SplitSide> = { piece: "lead", lead: "piece" };
const SIDE_LABEL: Record<SplitSide, string> = { piece: "piece", lead: "lead sheet" };

/** Block E — Repertoire & Lead Sheets (spec §4E). */
export function RepertoireBlock(props: BlockComponentProps) {
  const { child, scale, plannedSec, running, inputMode } = props;
  const { audio } = useAudio();

  // ---- data ----
  const assignment = useLiveQuery(() => repo.assignmentFor(child.id), [child.id]);
  const customSongs = useLiveQuery(() => repo.listCustomSongs(), []);
  const library = React.useMemo(() => allLibrarySongs(customSongs ?? []), [customSongs]);
  const unlocked = React.useMemo(() => unlockedSongs(child.unlocks.songs), [child.unlocks.songs]);
  const leadSongs = React.useMemo(() => (unlocked.length ? unlocked : starterSongs()), [unlocked]);

  // ---- split timer ----
  const [split, setSplit] = React.useState(50);
  const [started, setStarted] = React.useState(false);
  const [active, setActive] = React.useState<SplitSide>("piece");
  const [times, setTimes] = React.useState<Record<SplitSide, number>>({ piece: 0, lead: 0 });
  const timesRef = React.useRef<Record<SplitSide, number>>({ piece: 0, lead: 0 });
  const nudgedRef = React.useRef(false);
  const [nudge, setNudge] = React.useState<SplitSide | null>(null);

  React.useEffect(() => {
    if (!started || !running) return;
    const budget = budgetFor(plannedSec, split);
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      const next = { ...timesRef.current, [active]: timesRef.current[active] + dt };
      timesRef.current = next;
      setTimes(next);
      if (!nudgedRef.current && next[active] >= budget[active] && next[OTHER[active]] < budget[OTHER[active]]) {
        nudgedRef.current = true;
        setNudge(OTHER[active]);
        audio.stinger("pop");
      }
    }, 250);
    return () => clearInterval(id);
  }, [started, running, active, plannedSec, split, audio]);

  const select = (side: SplitSide) => {
    setStarted(true);
    setActive(side);
    if (nudge === side) setNudge(null);
  };

  // ---- piece state ----
  const [pieceId, setPieceId] = React.useState<string | null>(() => assignment?.songIds[0] ?? null);
  const [pieceText, setPieceText] = React.useState("");
  const kvKey = `repertoire.piece.${child.id}`;
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    void repo.getKV<string>(kvKey).then((v) => { if (!cancelled && typeof v === "string") setPieceText(v); });
    return () => { cancelled = true; };
  }, [kvKey]);
  React.useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const onPieceText = (v: string) => {
    setPieceText(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void repo.setKV(kvKey, v.trim()); }, 400);
  };
  const [reps, setReps] = React.useState(0);

  // ---- lead sheet state ----
  const [leadSongPref, setLeadSongPref] = React.useState<string | null>(null);
  const leadSong = leadSongs.find((s) => s.id === leadSongPref) ?? leadSongs[leadSongs.length - 1];
  const [levelPref, setLevelPref] = React.useState<LeadLevel>(1);
  const level: LeadLevel = leadSong.leadSheetLevels.includes(levelPref) ? levelPref : leadSong.leadSheetLevels[0];
  const [chordsPlayed, setChordsPlayed] = React.useState(0);

  // ---- time's up / unmount → silence ----
  React.useEffect(() => { if (!running) audio.stopMetronome(); }, [running, audio]);
  React.useEffect(() => () => audio.stopMetronome(), [audio]);

  const finish = () => {
    audio.stopMetronome();
    if (saveTimer.current) { clearTimeout(saveTimer.current); void repo.setKV(kvKey, pieceText.trim()); }
    const pieceSong = pieceId ? library.find((s) => s.id === pieceId) : undefined;
    const details = {
      piece: pieceText.trim() || pieceSong?.title || null,
      pieceSongId: pieceId,
      song: leadSong.id,
      leadSheetLevel: level,
      pieceSec: Math.round(times.piece),
      leadSec: Math.round(times.lead),
      reps,
      chordsPlayed,
      split,
    };
    props.onComplete({
      details,
      midiScore: inputMode === "midi" ? { score: Math.min(100, chordsPlayed * 10), components: { chordsPlayed }, badge: null, inputMode } : undefined,
    });
  };

  return (
    <BlockShell
      type="repertoire"
      remainingSec={props.remainingSec}
      plannedSec={plannedSec}
      onDone={finish}
      onAddMinute={() => props.addSeconds(60)}
      headerRight={<InputBadge mode={inputMode} />}
    >
      <SplitTimer plannedSec={plannedSec} split={split} onSplitChange={setSplit} started={started} active={active} running={running} times={times} onSelect={select} />

      <AnimatePresence>
        {nudge && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-secondary bg-secondary/20 px-4 py-3">
            <span className="text-2xl" aria-hidden>🔔</span>
            <span className="font-display text-lg font-semibold">Switch to your {SIDE_LABEL[nudge]}?</span>
            <span className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNudge(null)}>Keep going</Button>
              <Button variant="secondary" size="sm" onClick={() => select(nudge)}><ArrowLeftRight className="h-4 w-4" /> Switch</Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div key={active} initial={{ opacity: 0, x: active === "piece" ? -12 : 12 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
        {active === "piece" ? (
          <PiecePanel
            audio={audio}
            running={running}
            assignment={assignment ?? undefined}
            library={library}
            assignedIds={assignment?.songIds ?? []}
            unlockedIds={child.unlocks.songs}
            selectedId={pieceId}
            onSelect={setPieceId}
            pieceText={pieceText}
            onPieceText={onPieceText}
            onRep={() => setReps((r) => r + 1)}
          />
        ) : (
          <LeadSheetPanel
            audio={audio}
            scale={scale}
            running={running}
            inputMode={inputMode}
            songs={leadSongs}
            song={leadSong}
            onSelectSong={setLeadSongPref}
            level={level}
            onLevel={setLevelPref}
            onChordPlayed={() => setChordsPlayed((c) => c + 1)}
          />
        )}
      </motion.div>
    </BlockShell>
  );
}
