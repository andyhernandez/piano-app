"use client";
import * as React from "react";
import { IconButton, Waveform, SectionLabel, Button, Pill } from "@/components/ds";
import type { Recording } from "@/lib/types";
import { useAudio } from "@/lib/hooks/use-audio";
import { useAppStore } from "@/lib/store/app-store";
import { pinMatches } from "@/lib/household/pin";
import { DISCIPLINE, dayLabel } from "@/lib/engine/record";
import { dateKey } from "@/lib/utils/date";
import { midiBars, audioBars, fmtSeconds, WAVE_BINS } from "./waveform-data";
import { TextField } from "./fields";

interface Shape { bars: number[]; seconds: number }

function isMidi(r: Recording): boolean {
  return !!r.midiEvents && r.midiEvents.length > 0;
}

/**
 * Your recordings: each take on its own cream card with a round indigo play button and its waveform. Audio
 * plays through an <audio> element from the blob; MIDI takes are replayed through the audio engine. Deleting
 * sits behind the household code when the household has put it there.
 */
export function RecordingsRail({ recordings, onDeleted }: { recordings: Recording[]; onDeleted: (id: string) => void }) {
  const { audio, unlock } = useAudio();
  const [shapes, setShapes] = React.useState<Record<string, Shape>>({});
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const urlRef = React.useRef<string | null>(null);
  const timersRef = React.useRef<number[]>([]);

  // Draw each take once: MIDI from its velocities, audio from the decoded samples.
  React.useEffect(() => {
    let live = true;
    void (async () => {
      const next: Record<string, Shape> = {};
      for (const r of recordings) next[r.id] = isMidi(r) ? midiBars(r.midiEvents!) : await audioBars(r.blob);
      if (live) setShapes(next);
    })();
    return () => { live = false; };
  }, [recordings]);

  const stop = React.useCallback(() => {
    const el = audioRef.current;
    if (el) { el.pause(); el.removeAttribute("src"); el.load(); }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    setPlaying(null);
  }, []);

  React.useEffect(() => stop, [stop]);

  const play = async (r: Recording) => {
    if (playing === r.id) { stop(); return; }
    stop();
    setPlaying(r.id);
    if (isMidi(r)) {
      await unlock();
      const events = r.midiEvents!;
      const t0 = Math.min(...events.map((e) => e.time));
      let end = 0;
      for (const e of events) {
        if (e.kind !== "on") continue;
        const off = events.find((o) => o.kind === "off" && o.midi === e.midi && o.time > e.time);
        const dur = off ? Math.max(0.1, (off.time - e.time) / 1000) : 0.5;
        const at = e.time - t0;
        end = Math.max(end, at + dur * 1000);
        timersRef.current.push(window.setTimeout(() => audio.playNote(e.midi, dur, Math.max(0.2, e.velocity || 0.8)), at));
      }
      timersRef.current.push(window.setTimeout(() => setPlaying(null), end + 200));
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    const url = URL.createObjectURL(r.blob);
    urlRef.current = url;
    el.src = url;
    try { await el.play(); } catch { stop(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionLabel>Your recordings</SectionLabel>
      <audio ref={audioRef} onEnded={stop} onError={stop} hidden />
      {recordings.length === 0 && (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: "var(--kc-ink-muted)" }}>Nothing yet. The Your own stop keeps what you play when a keyboard or a microphone is listening.</p>
      )}
      {recordings.map((r) => {
        const shape = shapes[r.id];
        const isPlaying = playing === r.id;
        const title = r.title?.trim() || DISCIPLINE[r.blockType].title;
        const when = dayLabel(dateKey(new Date(r.createdAt)));
        const meta = `${when}${shape && shape.seconds > 0 ? ` · ${fmtSeconds(shape.seconds)}` : ""}`;
        return (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--kc-base)", border: "2px solid var(--kc-hairline)", borderRadius: 18, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, cursor: "pointer" }} onClick={() => setSelected((s) => (s === r.id ? null : r.id))} role="button" aria-expanded={selected === r.id}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{title}</div>
              <span style={{ marginLeft: "auto", flex: "none", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{meta}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconButton icon={isPlaying ? "stop" : "play_arrow"} variant="primary" label={`${isPlaying ? "Stop" : "Play"} ${title}`} onClick={() => void play(r)} />
              <Waveform bars={shape?.bars ?? Array(WAVE_BINS).fill(20)} height={30} tone={isPlaying ? "mint" : "indigo"} />
            </div>
            {selected === r.id && <DeleteRow recording={r} title={title} onDeleted={(id) => { if (playing === id) stop(); setSelected(null); onDeleted(id); }} />}
          </div>
        );
      })}
    </div>
  );
}

/** The row under a selected take: what it is, and the way to remove it. */
function DeleteRow({ recording, title, onDeleted }: { recording: Recording; title: string; onDeleted: (id: string) => void }) {
  const parent = useAppStore((s) => s.parent);
  const unlocked = useAppStore((s) => s.parentUnlocked);
  const setParentUnlocked = useAppStore((s) => s.setParentUnlocked);
  const gated = !!parent?.pin && !unlocked && parent.codeFor?.deleteRecording !== false;
  const [code, setCode] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);

  const remove = () => {
    if (gated) {
      if (!pinMatches(parent?.pin, code)) { setWrong(true); setCode(""); return; }
      setParentUnlocked(true);
    }
    onDeleted(recording.id);
  };

  const kind = isMidi(recording) ? "A keyboard take" : "A room recording";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.4 }}>{kind} from the {DISCIPLINE[recording.blockType].title} stop. Kept on this device{parent?.sync ? " and in the household's sync" : ""}.</span>
      {!confirm ? (
        <div><Button variant="secondary" size="pill" icon="delete" onClick={() => setConfirm(true)}>Delete</Button></div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {gated && (
            <TextField value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setWrong(false); }} inputMode="numeric" placeholder="Household code" aria-label="Household code" autoFocus style={{ width: 150, fontFamily: "var(--kc-font-display)", letterSpacing: "0.2em" }} />
          )}
          <Button variant="secondary" size="pill" onClick={remove} disabled={gated && code.length < 4} style={{ borderColor: "var(--kc-indigo)", color: "var(--kc-indigo)" }}>Delete {title}</Button>
          <Button variant="quiet" size="pill" onClick={() => { setConfirm(false); setCode(""); setWrong(false); }}>Keep</Button>
          {wrong && <Pill tone="clay" icon="info">Not the code</Pill>}
        </div>
      )}
    </div>
  );
}
