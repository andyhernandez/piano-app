"use client";
import * as React from "react";
import type { BlockType, Child, Session } from "@/lib/types";
import { Button, Icon } from "@/components/ds";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { repo } from "@/lib/db/repo";
import { newId } from "@/lib/utils/id";

/** The four beat dots of the design's metronome row; the current beat is mint. */
export function MetronomeDots({ beat, size = 10 }: { beat: number | null; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: size, height: size, borderRadius: "50%", background: beat === i ? "var(--kc-mint)" : "var(--kc-raised)" }} />)}
    </div>
  );
}

/** Slower · 𝅘𝅥76 · Faster, as control-height buttons. */
export function TempoControls({ bpm, onChange, step = 4, min = 40, max = 160, disabled }: { bpm: number; onChange: (bpm: number) => void; step?: number; min?: number; max?: number; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Button variant="secondary" size="control" disabled={disabled || bpm <= min} onClick={() => onChange(Math.max(min, bpm - step))}>Slower</Button>
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 15, minWidth: 44, textAlign: "center" }}><span style={{ fontFamily: "var(--kc-font-music)", fontSize: 13 }}>{"\u{1D15F}"}</span>{bpm}</span>
      <Button variant="secondary" size="control" disabled={disabled || bpm >= max} onClick={() => onChange(Math.min(max, bpm + step))}>Faster</Button>
    </div>
  );
}

/** Record / Stop pill. Recording only ever starts from this tap; the runner shows the REC pill meanwhile. */
export function RecordControl({ recording, supported, onToggle }: { recording: boolean; supported: boolean; onToggle: () => void }) {
  if (!supported) return null;
  return (
    <Button variant="quiet" size="pill" onClick={onToggle} style={recording ? { color: "var(--kc-clay)" } : undefined}>
      <Icon name={recording ? "stop" : "fiber_manual_record"} size={20} color={recording ? "var(--kc-clay)" : undefined} />
      {recording ? "Stop" : "Record"}
    </Button>
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

/** "1 / 4"-style mono fraction for a Metric. */
export function frac(a: number, b: number): string {
  return `${a} / ${b}`;
}
