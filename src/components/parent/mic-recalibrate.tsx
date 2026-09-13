"use client";
import * as React from "react";
import { Mic, MicOff, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInput } from "@/lib/input/manager";
import { micPermissionState } from "@/lib/input/mic";
import { useAppStore } from "@/lib/store/app-store";

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "measuring" }
  | { kind: "done"; noiseFloor: number }
  | { kind: "denied" }
  | { kind: "error"; message: string };

/**
 * Compact microphone calibration for the grown-ups area (§10 "Re-calibrate from settings").
 * Measures the room's noise floor for ~1.5 s and stores it with the default confidence threshold.
 */
export function MicRecalibrate({ childId, onDone }: { childId: string; onDone?: () => void }) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const current = useAppStore((s) => s.children.find((c) => c.id === childId)?.settings.micCalibration ?? null);
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });

  React.useEffect(() => () => { if (getInput().micSource) getInput().stop(); }, []);

  const run = async () => {
    setPhase({ kind: "starting" });
    const input = getInput();
    try {
      await input.use("mic", null);
      const mic = input.micSource;
      if (!mic) {
        const perm = await micPermissionState();
        setPhase(perm === "denied" ? { kind: "denied" } : { kind: "error", message: "No microphone was found. Check that one is plugged in or built in, then try again." });
        return;
      }
      setPhase({ kind: "measuring" });
      const noiseFloor = await mic.measureNoiseFloor();
      await updateSettings(childId, { micCalibration: { noiseFloor, confidenceThreshold: 0.8 } });
      input.stop();
      setPhase({ kind: "done", noiseFloor });
      onDone?.();
    } catch (e) {
      input.stop();
      const name = (e as { name?: string }).name;
      if (name === "NotAllowedError" || name === "SecurityError") setPhase({ kind: "denied" });
      else setPhase({ kind: "error", message: (e as Error).message || "Something went wrong with the microphone." });
    }
  };

  const busy = phase.kind === "starting" || phase.kind === "measuring";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Keep the room as quiet as it usually is during practice and press start. We listen for about two seconds to learn the background noise so quiet notes are never marked wrong.
        {current && <> Current noise floor: <b>{current.noiseFloor.toFixed(4)}</b>.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          {phase.kind === "starting" ? "Asking for the microphone…" : phase.kind === "measuring" ? "Listening…" : current ? "Re-calibrate" : "Start calibration"}
        </Button>
        {phase.kind === "done" && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground"><CheckCircle2 className="h-4 w-4" /> Saved. Noise floor {phase.noiseFloor.toFixed(4)}, confidence 0.8.</span>
        )}
      </div>
      {phase.kind === "denied" && (
        <p className="flex items-start gap-2 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm">
          <MicOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Microphone access is blocked. Allow the microphone for this site in the browser&apos;s address-bar settings (the padlock icon), then try again. Practice still works in timer mode without it.</span>
        </p>
      )}
      {phase.kind === "error" && <p className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm">{phase.message}</p>}
    </div>
  );
}
