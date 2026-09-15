"use client";
import * as React from "react";
import { IconButton, Waveform, SectionLabel, Button, Icon } from "@/components/ds";
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
 * YOUR OWN RECORDINGS: each take drawn as its own waveform with a play control. Audio plays through an
 * <audio> element from the blob; MIDI takes are replayed through the audio engine. Deleting sits behind the
 * household code when the household has put it there.
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionLabel>YOUR OWN RECORDINGS</SectionLabel>
      <audio ref={audioRef} onEnded={stop} onError={stop} hidden />
      {recordings.length === 0 && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--kc-ink-dim)" }}>Nothing yet. The Your own block keeps what you play when a keyboard or a microphone is listening.</p>
      )}
      {recordings.map((r) => {
        const shape = shapes[r.id];
        const isPlaying = playing === r.id;
        const title = r.title?.trim() || DISCIPLINE[r.blockType].title;
        const meta = `${shape && shape.seconds > 0 ? `${fmtSeconds(shape.seconds)} · ` : ""}${dayLabel(dateKey(new Date(r.createdAt)))}`;
        return (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <IconButton icon={isPlaying ? "stop" : "play_arrow"} label={`${isPlaying ? "Stop" : "Play"} ${title}`} onClick={() => void play(r)} style={isPlaying ? { border: "1px solid var(--kc-mint)", color: "var(--kc-mint)" } : undefined} />
              <div style={{ flex: "none", width: 132, cursor: "pointer" }} onClick={() => setSelected((s) => (s === r.id ? null : r.id))} role="button" aria-expanded={selected === r.id}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 12, color: "var(--kc-ink-dim)" }}>{meta}</div>
              </div>
              <Waveform bars={shape?.bars ?? Array(WAVE_BINS).fill(8)} tone={isPlaying ? "mint" : "resting"} />
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

  const kind = isMidi(recording) ? "MIDI take" : "Audio take";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 0 4px 47px" }}>
      <span style={{ fontSize: 13, color: "var(--kc-ink-dim)" }}>{kind} from the {DISCIPLINE[recording.blockType].title} block. Kept on this device{parent?.sync ? " and in the household's sync" : ""}.</span>
      {!confirm ? (
        <div><Button variant="secondary" size="pill" icon="delete" onClick={() => setConfirm(true)}>Delete</Button></div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {gated && (
            <TextField value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setWrong(false); }} inputMode="numeric" placeholder="Household code" aria-label="Household code" autoFocus style={{ width: 132, fontFamily: "var(--kc-font-mono)", letterSpacing: "0.2em", height: 32 }} />
          )}
          <Button variant="secondary" size="pill" onClick={remove} disabled={gated && code.length < 4} style={{ border: "1px solid var(--kc-clay)", color: "var(--kc-clay)" }}>Delete {title}</Button>
          <Button variant="quiet" size="pill" onClick={() => { setConfirm(false); setCode(""); setWrong(false); }}>Keep</Button>
          {wrong && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--kc-clay)" }}><Icon name="error" size={16} />Not the code.</span>}
        </div>
      )}
    </div>
  );
}
