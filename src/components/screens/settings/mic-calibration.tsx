"use client";
import * as React from "react";
import { Panel, SectionLabel, Button, Icon, ProgressStrip } from "@/components/ds";
import { getInput } from "@/lib/input/manager";
import { micPermissionState } from "@/lib/input/mic";
import { useAppStore } from "@/lib/store/app-store";

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "measuring"; started: number }
  | { kind: "done"; noiseFloor: number }
  | { kind: "denied" }
  | { kind: "error"; message: string };

const MEASURE_MS = 3000;

/**
 * Inline microphone calibration. Listens to the room for three seconds with the mic source, keeps the noise
 * floor with the default confidence threshold, and releases the microphone.
 */
export function MicCalibrationPanel({ childId, onClose }: { childId: string; onClose: () => void }) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => () => { if (getInput().micSource) getInput().stop(); }, []);

  React.useEffect(() => {
    if (phase.kind !== "measuring") return;
    const started = phase.started;
    const id = window.setInterval(() => setProgress(Math.min(1, (performance.now() - started) / MEASURE_MS)), 50);
    return () => window.clearInterval(id);
  }, [phase]);

  const run = async () => {
    setPhase({ kind: "starting" });
    const input = getInput();
    try {
      await input.use("mic", null);
      const mic = input.micSource;
      if (!mic) {
        const perm = await micPermissionState();
        setPhase(perm === "denied" ? { kind: "denied" } : { kind: "error", message: "No microphone was found. Check that one is built in or plugged in, then try again." });
        return;
      }
      setPhase({ kind: "measuring", started: performance.now() });
      const noiseFloor = await mic.measureNoiseFloor(MEASURE_MS);
      await updateSettings(childId, { micCalibration: { noiseFloor, confidenceThreshold: 0.8 } });
      input.stop();
      setPhase({ kind: "done", noiseFloor });
    } catch (e) {
      input.stop();
      const name = (e as { name?: string }).name;
      if (name === "NotAllowedError" || name === "SecurityError") setPhase({ kind: "denied" });
      else setPhase({ kind: "error", message: (e as Error).message || "The microphone did not open." });
    }
  };

  const busy = phase.kind === "starting" || phase.kind === "measuring";

  return (
    <Panel state="current" padding="card" style={{ gap: 12 }}>
      <SectionLabel size="meta">MICROPHONE CALIBRATION</SectionLabel>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>
        Keep the room as quiet as it usually is during practice. The app listens for three seconds to learn the background noise, so a quiet note is never marked wrong.
      </p>
      {phase.kind === "measuring" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ProgressStrip value={progress} />
          <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="mic" size={20} color="var(--kc-mint)" />Listening…</span>
        </div>
      )}
      {phase.kind === "done" && (
        <span style={{ fontSize: 14, color: "var(--kc-mint)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={20} />
          Saved. Noise floor <span style={{ fontFamily: "var(--kc-font-mono)" }}>{phase.noiseFloor.toFixed(4)}</span>, confidence 0.80.
        </span>
      )}
      {phase.kind === "denied" && (
        <span style={{ fontSize: 14, color: "var(--kc-clay)", display: "inline-flex", alignItems: "flex-start", gap: 8, lineHeight: 1.45 }}>
          <Icon name="error" size={20} />
          <span>Microphone access is blocked. Allow it for this site in the browser&apos;s address-bar settings, then try again. Practice still works on the timer.</span>
        </span>
      )}
      {phase.kind === "error" && <span style={{ fontSize: 14, color: "var(--kc-clay)", lineHeight: 1.45 }}>{phase.message}</span>}
      <div style={{ display: "flex", gap: 10 }}>
        <Button size="control" variant={phase.kind === "done" ? "secondary" : "primary"} icon="mic" onClick={() => void run()} disabled={busy}>
          {phase.kind === "starting" ? "Asking for the microphone…" : phase.kind === "measuring" ? "Listening…" : phase.kind === "done" ? "Measure again" : "Measure for 3 seconds"}
        </Button>
        <Button size="control" variant="quiet" onClick={onClose} disabled={busy}>{phase.kind === "done" ? "Done" : "Cancel"}</Button>
      </div>
    </Panel>
  );
}
