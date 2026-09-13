"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, Pause, Play, SkipForward, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { repo } from "@/lib/db/repo";
import { useAudio } from "@/lib/hooks/use-audio";
import { BADGE_META } from "@/lib/engine/progression";
import { scaleName } from "@/lib/music/scales";
import { BLOCK_LABELS, BLOCK_ORDER, type BlockResult, type BlockType, type NoteEvent, type Recording, type Session } from "@/lib/types";
import { formatDuration, weekDays, weekKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { MIDI_RECORDING_MIME, formatDateLong, formatTime, friendlyKey, friendlyValue } from "./helpers";

const SHORT: Record<BlockType, string> = { scales: "Scales", rhythm: "Rhythm", reading: "Reading", theory: "Theory", repertoire: "Repertoire", improv: "Improv" };

/**
 * Session log shared by the parent dashboard and teacher mode (§7): what was done, not just how long.
 * Sessions are grouped by week, newest first; each expands to its block details and recordings.
 */
export function SessionLog({ childId }: { childId: string }) {
  const sessions = useLiveQuery(() => repo.listSessions(childId, 60), [childId]);
  const groups = React.useMemo(() => groupByWeek(sessions ?? []), [sessions]);

  if (!sessions) return <p className="text-sm text-muted-foreground">Loading sessions…</p>;
  if (!sessions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sessions yet</CardTitle>
          <CardDescription>Once a practice session is finished it appears here with every block, score and recording.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.week} aria-labelledby={`week-${g.week}`}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`week-${g.week}`} className="font-display text-lg font-semibold">{g.label}</h3>
            <p className="text-sm text-muted-foreground">{g.sessions.length} session{g.sessions.length === 1 ? "" : "s"} · {Math.round(g.minutes)} min · {g.completed} completed</p>
          </div>
          <ul className="flex flex-col gap-2">
            {g.sessions.map((s) => <SessionRow key={s.id} session={s} />)}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Showing the last {sessions.length} sessions.</p>
    </div>
  );
}

function groupByWeek(sessions: Session[]) {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const wk = weekKey(s.date);
    if (!map.has(wk)) map.set(wk, []);
    map.get(wk)!.push(s);
  }
  return Array.from(map.entries()).map(([week, list]) => {
    const days = weekDays(list[0].date);
    return {
      week,
      label: `Week of ${formatDateLong(days[0])}`,
      sessions: list,
      minutes: list.reduce((acc, s) => acc + s.durationSec / 60, 0),
      completed: list.filter((s) => s.completed).length,
    };
  });
}

function SessionRow({ session }: { session: Session }) {
  const [open, setOpen] = React.useState(false);
  const byType = new Map(session.blocks.map((b) => [b.type, b]));
  const scored = session.blocks.filter((b) => b.midiScore);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + (b.midiScore?.score ?? 0), 0) / scored.length) : null;
  return (
    <li className="rounded-2xl border-2 bg-card">
      <button type="button" className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="min-w-[9rem]">
          <div className="font-bold">{formatDateLong(session.date)}</div>
          <div className="text-xs text-muted-foreground">{formatTime(session.startedAt)} · {scaleName(session.scale)} · {session.inputMode === "midi" ? "MIDI" : session.inputMode === "mic" ? "Mic" : "Timer"}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {BLOCK_ORDER.map((t) => {
            const b = byType.get(t);
            const state = !b ? "none" : b.completed ? "done" : b.skipped ? "skipped" : "partial";
            return (
              <span
                key={t}
                title={`${BLOCK_LABELS[t]}: ${state === "done" ? "completed" : state === "skipped" ? "skipped" : state === "partial" ? "started" : "not reached"}${b?.midiScore ? ` · ${b.midiScore.score}/100` : ""}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-bold",
                  state === "done" && "border-transparent bg-accent/30 text-accent-foreground",
                  state === "skipped" && "border-transparent bg-muted text-muted-foreground line-through",
                  state === "partial" && "border-secondary bg-secondary/20",
                  state === "none" && "border-dashed text-muted-foreground opacity-60",
                )}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : state === "skipped" ? <SkipForward className="h-3 w-3" /> : state === "partial" ? <Pause className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {SHORT[t]}
                {b?.midiScore && <span className="tabular-nums">{b.midiScore.score}</span>}
                {b?.midiScore?.badge && <span aria-label={BADGE_META[b.midiScore.badge].title}>{BADGE_META[b.midiScore.badge].emoji}</span>}
              </span>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="tabular-nums font-bold">{formatDuration(session.durationSec)}</span>
          {session.completed ? <Badge variant="accent">Completed</Badge> : <Badge variant="muted">{session.endedAt ? "Partial" : "In progress"}</Badge>}
          {avg !== null && <span className="text-muted-foreground" title="Average MIDI/mic score">avg {avg}</span>}
          <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div className="border-t-2 px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Planned {session.plannedMinutes} min</span>
            <span>+{session.xpEarned} XP</span>
            <span>{session.starsEarned} ✨</span>
            {session.teacherNote && <span>Teacher note shown: “{session.teacherNote}”</span>}
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {BLOCK_ORDER.map((t) => {
              const b = byType.get(t);
              return <BlockDetail key={t} type={t} block={b} />;
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

function BlockDetail({ type, block }: { type: BlockType; block?: BlockResult }) {
  if (!block) {
    return <li className="rounded-2xl border-2 border-dashed p-3 text-sm text-muted-foreground"><b className="text-foreground">{BLOCK_LABELS[type]}</b> — not reached</li>;
  }
  const details = Object.entries(block.details ?? {});
  return (
    <li className="rounded-2xl border-2 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>{BLOCK_LABELS[type]}</b>
        <span className="text-muted-foreground tabular-nums">{formatDuration(block.durationSec)} / {formatDuration(block.plannedSec)} · {block.completed ? "completed" : block.skipped ? "skipped" : "started"}</span>
      </div>
      {block.midiScore && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge>{block.midiScore.score}/100</Badge>
          {block.midiScore.badge && <Badge variant="secondary">{BADGE_META[block.midiScore.badge].emoji} {BADGE_META[block.midiScore.badge].title}</Badge>}
          {Object.entries(block.midiScore.components).map(([k, v]) => (
            <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs">{friendlyKey(k)} {Math.round(v)}</span>
          ))}
        </div>
      )}
      {details.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {details.map(([k, v]) => (
            <span key={k} className="rounded-full border-2 px-2 py-0.5 text-xs"><span className="text-muted-foreground">{friendlyKey(k)}:</span> {friendlyValue(v)}</span>
          ))}
        </div>
      )}
      {block.notes && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">{block.notes}</p>}
      {block.recordingId && <RecordingPlayer recordingId={block.recordingId} />}
    </li>
  );
}

/**
 * Plays a stored recording. Audio blobs stream through <audio>; MIDI improv recordings are replayed on the app's
 * piano by scheduling each note-on with its measured duration.
 */
export function RecordingPlayer({ recordingId }: { recordingId: string }) {
  const { audio, unlock } = useAudio();
  const [state, setState] = React.useState<{ kind: "idle" } | { kind: "loading" } | { kind: "audio"; url: string } | { kind: "midi"; playing: boolean; notes: number; seconds: number } | { kind: "missing" }>({ kind: "idle" });
  const urlsRef = React.useRef<string[]>([]);
  const timersRef = React.useRef<number[]>([]);
  const recRef = React.useRef<Recording | null>(null);

  React.useEffect(() => {
    return () => {
      for (const u of urlsRef.current) URL.revokeObjectURL(u);
      urlsRef.current = [];
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };
  }, []);

  const stopMidi = React.useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    setState((s) => (s.kind === "midi" ? { ...s, playing: false } : s));
  }, []);

  const playMidi = React.useCallback(async (events: NoteEvent[]) => {
    await unlock();
    const scheduled = scheduleNotes(events);
    for (const n of scheduled) {
      timersRef.current.push(window.setTimeout(() => audio.playNote(n.midi, n.duration, n.velocity), n.offsetMs));
    }
    const total = scheduled.reduce((m, n) => Math.max(m, n.offsetMs + n.duration * 1000), 0);
    timersRef.current.push(window.setTimeout(() => setState((s) => (s.kind === "midi" ? { ...s, playing: false } : s)), total + 50));
    setState({ kind: "midi", playing: true, notes: scheduled.length, seconds: Math.round(total / 1000) });
  }, [audio, unlock]);

  const load = async () => {
    setState({ kind: "loading" });
    const rec = recRef.current ?? (await repo.getRecording(recordingId)) ?? null;
    recRef.current = rec;
    if (!rec) { setState({ kind: "missing" }); return; }
    const isMidi = rec.mimeType === MIDI_RECORDING_MIME || (rec.midiEvents && rec.midiEvents.length > 0);
    if (isMidi) {
      await playMidi(rec.midiEvents ?? []);
    } else {
      const url = URL.createObjectURL(rec.blob);
      urlsRef.current.push(url);
      setState({ kind: "audio", url });
    }
  };

  if (state.kind === "missing") return <p className="mt-2 text-xs text-muted-foreground">Recording is no longer on this device.</p>;
  if (state.kind === "audio") {
    return (
      <div className="mt-2">
        <audio controls autoPlay src={state.url} className="w-full" />
      </div>
    );
  }
  if (state.kind === "midi") {
    return (
      <div className="mt-2 flex items-center gap-2">
        {state.playing ? (
          <Button size="sm" variant="outline" onClick={stopMidi}><Pause className="h-4 w-4" /> Stop</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => recRef.current && playMidi(recRef.current.midiEvents ?? [])}><Play className="h-4 w-4" /> Replay</Button>
        )}
        <span className="text-xs text-muted-foreground">MIDI improvisation · {state.notes} notes · ~{state.seconds}s</span>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={load} disabled={state.kind === "loading"}>
        <Play className="h-4 w-4" /> {state.kind === "loading" ? "Loading…" : "Play recording"}
      </Button>
    </div>
  );
}

function scheduleNotes(events: NoteEvent[]): { midi: number; velocity: number; duration: number; offsetMs: number }[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const t0 = sorted[0].time;
  const open = new Map<number, { midi: number; velocity: number; offsetMs: number }>();
  const out: { midi: number; velocity: number; duration: number; offsetMs: number }[] = [];
  for (const e of sorted) {
    if (e.kind === "on") {
      open.set(e.midi, { midi: e.midi, velocity: e.velocity || 0.8, offsetMs: e.time - t0 });
    } else {
      const start = open.get(e.midi);
      if (start) {
        out.push({ ...start, duration: Math.min(4, Math.max(0.08, (e.time - t0 - start.offsetMs) / 1000)) });
        open.delete(e.midi);
      }
    }
  }
  for (const start of open.values()) out.push({ ...start, duration: 0.5 });
  return out.sort((a, b) => a.offsetMs - b.offsetMs);
}
