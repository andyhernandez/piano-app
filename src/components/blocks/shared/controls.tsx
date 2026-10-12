"use client";
import * as React from "react";
import type { BlockType, Child, Session } from "@/lib/types";
import { Button, Icon } from "@/components/ds";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { repo } from "@/lib/db/repo";
import { newId } from "@/lib/utils/id";

/** The four beat dots of the metronome row; the current beat is indigo. */
export function MetronomeDots({ beat, size = 10, count = 4 }: { beat: number | null; size?: number; count?: number }) {
  return (
    <div style={{ display: "flex", gap: 8, flex: "none" }}>
      {Array.from({ length: count }, (_, i) => <span key={i} style={{ width: size, height: size, borderRadius: "50%", background: beat === i ? "var(--kc-indigo)" : "var(--kc-border)" }} />)}
    </div>
  );
}

/** Slower · 𝅘𝅥76 · Faster, as 46px pills with the tempo in Fredoka between them. */
export function TempoControls({ bpm, onChange, step = 4, min = 40, max = 160, disabled }: { bpm: number; onChange: (bpm: number) => void; step?: number; min?: number; max?: number; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
      <Button variant="secondary" size="pill" disabled={disabled || bpm <= min} onClick={() => onChange(Math.max(min, bpm - step))}>Slower</Button>
      <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, minWidth: 54, textAlign: "center" }}><span style={{ fontFamily: "var(--kc-font-music)", fontSize: 15 }}>{"\u{1D15F}"}</span>{bpm}</span>
      <Button variant="secondary" size="pill" disabled={disabled || bpm >= max} onClick={() => onChange(Math.min(max, bpm + step))}>Faster</Button>
    </div>
  );
}

/** Record / Stop. Recording only ever starts from this tap; the runner shows the Recording chip meanwhile. */
export function RecordControl({ recording, supported, onToggle }: { recording: boolean; supported: boolean; onToggle: () => void }) {
  if (!supported) return null;
  return (
    <Button variant={recording ? "sun" : "secondary"} size="pill" onClick={onToggle} icon={recording ? "stop" : "fiber_manual_record"}>
      {recording ? "Stop" : "Record"}
    </Button>
  );
}

/** The bar's primary action: "Next stop →", or "Done for today!" on the last stop. */
export function NextStopButton({ nextTitle, onClick, disabled, label }: { nextTitle: string | null; onClick: () => void; disabled?: boolean; label?: string }) {
  return nextTitle
    ? <Button size="control" icon="arrow_forward" iconAfter onClick={onClick} disabled={disabled}>{label ?? "Next stop"}</Button>
    : <Button size="control" icon="celebration" onClick={onClick} disabled={disabled}>Done for today!</Button>;
}

/** A row of rounded cells: done mint, current indigo, missed lilac, the rest white. Times through, bars, questions. */
export function Cells({ count, current, missed = [], height = 34, labels }: { count: number; current: number; missed?: number[]; height?: number; labels?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: count }, (_, i) => {
        const s: React.CSSProperties = i === current
          ? { background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 3px 0 0 var(--kc-indigo-shadow)" }
          : missed.includes(i) ? { background: "var(--kc-lilac)", color: "var(--kc-indigo-shadow)", border: "2px solid var(--kc-indigo)" }
          : i < current ? { background: "var(--kc-mint)", color: "var(--kc-ink)" }
          : { background: "var(--kc-panel)", color: "var(--kc-ink-faint)", border: "2px solid var(--kc-border)" };
        return <span key={i} style={{ flex: 1, height, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, boxSizing: "border-box", ...s }}>{labels === false ? "" : i + 1}</span>;
      })}
    </div>
  );
}

/** A card title with an optional meta on the right. */
export function CardTitle({ children, meta, size = 18 }: { children: React.ReactNode; meta?: React.ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: size, fontWeight: 600, lineHeight: 1.15 }}>{children}</div>
      {meta && <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)", textAlign: "right" }}>{meta}</span>}
    </div>
  );
}

/** The frame page under the runner header: 22px top, 32px sides. */
export const PAGE: React.CSSProperties = { flex: 1, minHeight: 0, padding: "22px 32px", display: "flex", flexDirection: "column", gap: 16 };

/** The white card. */
export const CARD: React.CSSProperties = { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box", minHeight: 0 };

/** A note line in the indigo ink the design uses for "what to do next". */
export const NOTE: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-indigo-shadow)" };
export const SMALL: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" };

/** An icon-only round button inline (the frame's 52px indigo transport). */
export function RoundButton({ icon, primary, label, onClick, disabled, size }: { icon: string; primary?: boolean; label: string; onClick?: () => void; disabled?: boolean; size?: number }) {
  const px = size ?? (primary ? 52 : 46);
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`kc-press ${primary ? "kc-btn-primary" : "kc-btn-secondary"}`} style={{ width: px, height: px, flex: "none", border: primary ? "none" : "2px solid var(--kc-border)", borderRadius: "50%", background: primary ? "var(--kc-indigo)" : "var(--kc-panel)", color: primary ? "#ffffff" : "var(--kc-ink)", boxShadow: primary ? "0 4px 0 0 var(--kc-indigo-shadow)" : "none", cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: 0, opacity: disabled ? 0.45 : 1 }}>
      <Icon name={icon} size={primary ? 28 : 24} />
    </button>
  );
}

/**
 * One-tap audio recording for a block. `toggle` must run from a user gesture. The blob is stored in the
 * recordings table; `recordingId` is the id of the last saved take, for the block result.
 */
export function useBlockRecorder({ child, session, type, title, setRecording }: { child: Child; session: Session; type: BlockType; title: string; setRecording?: (on: boolean) => void }) {
  const recRef = React.useRef<AudioRecorder | null>(null);
  const [recording, setRec] = React.useState(false);
  const [recordingId, setRecordingId] = React.useState<string | undefined>(undefined);
  const [supported] = React.useState(() => AudioRecorder.supported());
  const setRecordingRef = React.useRef(setRecording);
  React.useEffect(() => { setRecordingRef.current = setRecording; });

  const stop = React.useCallback(async () => {
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    setRec(false);
    setRecordingRef.current?.(false);
    const blob = await rec.stop();
    if (blob.size === 0) return;
    const id = newId("rec");
    await repo.putRecording({ id, childId: child.id, sessionId: session.id, blockType: type, createdAt: new Date().toISOString(), mimeType: blob.type || rec.mimeType || "audio/webm", blob, title });
    setRecordingId(id);
  }, [child.id, session.id, type, title]);

  const toggle = React.useCallback(async () => {
    if (recRef.current) { await stop(); return; }
    const rec = new AudioRecorder();
    try {
      await rec.start();
      recRef.current = rec;
      setRec(true);
      setRecordingRef.current?.(true);
    } catch {
      rec.cancel();
    }
  }, [stop]);

  // Unmount: stop and keep the take.
  React.useEffect(() => () => { if (recRef.current) { void stop(); } }, [stop]);

  return { recording, recordingId, supported, toggle, stop };
}

/** "1 / 4"-style fraction. */
export function frac(a: number, b: number): string {
  return `${a} / ${b}`;
}
