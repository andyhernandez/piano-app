"use client";
import * as React from "react";
import { Play, Square, Star, Music } from "lucide-react";
import type { Child, NoteEvent, Recording } from "@/lib/types";
import { repo } from "@/lib/db/repo";
import { useAudio } from "@/lib/hooks/use-audio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/** "My Songs" shelf: improvisations recorded in the Creative Sandbox. */
export function MySongs({ child }: { child: Child }) {
  const { audio, unlock } = useAudio();
  const [recordings, setRecordings] = React.useState<Recording[] | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<{ id: string; url: string } | null>(null);
  const timers = React.useRef<number[]>([]);

  const load = React.useCallback(async () => {
    const all = await repo.listRecordings(child.id);
    setRecordings(all.filter((r) => r.blockType === "improv"));
  }, [child.id]);

  React.useEffect(() => {
    let cancelled = false;
    repo.listRecordings(child.id).then((all) => { if (!cancelled) setRecordings(all.filter((r) => r.blockType === "improv")); });
    return () => { cancelled = true; };
  }, [child.id]);

  const stop = React.useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setPlayingId(null);
  }, []);

  React.useEffect(() => stop, [stop]);
  // Release object URLs when they change or on unmount.
  React.useEffect(() => {
    if (!audioUrl) return;
    const url = audioUrl.url;
    return () => URL.revokeObjectURL(url);
  }, [audioUrl]);

  async function replay(r: Recording) {
    if (playingId === r.id) { stop(); return; }
    stop();
    await unlock();
    if (r.midiEvents?.length) {
      const total = scheduleMidi(r.midiEvents, (midi, dur, vel, atMs) => {
        timers.current.push(window.setTimeout(() => audio.playNote(midi, dur, vel), atMs));
      });
      setPlayingId(r.id);
      timers.current.push(window.setTimeout(() => setPlayingId(null), total + 300));
    } else if (r.blob && r.blob.size > 0) {
      setAudioUrl({ id: r.id, url: URL.createObjectURL(r.blob) });
      setPlayingId(r.id);
    }
  }

  async function toggleFavourite(r: Recording) {
    await repo.putRecording({ ...r, favourite: !r.favourite });
    await load();
  }

  if (recordings === null) return <p className="text-muted-foreground">Loading your songs…</p>;
  if (!recordings.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Music className="h-10 w-10 text-primary" />
          <p className="font-display text-xl font-semibold">No songs saved yet</p>
          <p className="text-sm text-muted-foreground">Make up a tune in the Creative Sandbox at the end of a session and save it here.</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...recordings].sort((a, b) => Number(!!b.favourite) - Number(!!a.favourite) || b.createdAt.localeCompare(a.createdAt));

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((r) => {
        const playing = playingId === r.id;
        const isMidi = !!r.midiEvents?.length;
        return (
          <li key={r.id} className={cn("flex flex-col gap-2 rounded-2xl border-2 bg-card p-4", playing && "border-primary")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg font-semibold leading-tight">{r.title || "My improv"}</div>
                <div className="text-sm text-muted-foreground">{formatDate(r.createdAt)} · {isMidi ? `${r.midiEvents!.filter((e) => e.kind === "on").length} notes` : "audio"}</div>
              </div>
              <button type="button" className="h-12 w-12 shrink-0 rounded-full hover:bg-muted" onClick={() => toggleFavourite(r)} aria-pressed={!!r.favourite} aria-label={r.favourite ? "Remove from favourites" : "Mark as favourite"}>
                <Star className={cn("mx-auto h-7 w-7", r.favourite ? "text-secondary-foreground" : "text-muted-foreground")} fill={r.favourite ? "#ffd166" : "none"} />
              </button>
            </div>
            {playing && audioUrl?.id === r.id && !isMidi ? (
              <audio controls autoPlay src={audioUrl.url} className="w-full" onEnded={() => setPlayingId(null)} />
            ) : null}
            <Button variant={playing ? "outline" : "default"} onClick={() => replay(r)} disabled={!isMidi && !(r.blob && r.blob.size > 0)}>
              {playing ? <><Square className="h-5 w-5" /> Stop</> : <><Play className="h-5 w-5" /> Play</>}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** Schedule note-ons at their recorded relative times; returns total length in ms. */
function scheduleMidi(events: NoteEvent[], schedule: (midi: number, dur: number, vel: number, atMs: number) => void): number {
  if (!events.length) return 0;
  const t0 = Math.min(...events.map((e) => e.time));
  let end = 0;
  events.forEach((e, i) => {
    if (e.kind !== "on") return;
    const off = events.slice(i + 1).find((x) => x.midi === e.midi && x.kind === "off");
    const dur = off ? Math.max(0.1, (off.time - e.time) / 1000) : 0.5;
    const at = e.time - t0;
    schedule(e.midi, dur, Math.max(0.2, e.velocity || 0.8), at);
    end = Math.max(end, at + dur * 1000);
  });
  return end;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
