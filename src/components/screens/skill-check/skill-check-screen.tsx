"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ds";
import { useAppStore, useActiveChild, type AssessmentApply } from "@/lib/store/app-store";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { currentScale } from "@/lib/engine/progression";
import type { ScaleId, SkillProfile } from "@/lib/types";
import { CheckChrome, PausedPanel, type ChordsResult, type EarResult, type PartId, type PulseResult, type ReadingResult, type ScalesResult } from "./shared";
import { EarPart } from "./ear-part";
import { ReadingPart } from "./reading-part";
import { PulsePart } from "./pulse-part";
import { ScalesPart, readingStartFor } from "./scales-part";
import { ChordsPart } from "./chords-part";
import { ResultScreen } from "./result-screen";

/**
 * The skill check: ear, reading, timing, scales, chords, then the result. Five minutes or so, re-taken every
 * four weeks (Settings links here). Skipping leaves the profile as it was — null on a first run, so the plan
 * uses base weights.
 */
export function SkillCheckScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const saveAssessment = useAppStore((s) => s.saveAssessment);
  const { audio } = useAudio();
  const [part, setPart] = React.useState<PartId | "result">("ear");
  const [paused, setPaused] = React.useState(false);
  const [ear, setEar] = React.useState<EarResult | null>(null);
  const [reading, setReading] = React.useState<ReadingResult | null>(null);
  const [pulse, setPulse] = React.useState<PulseResult | null>(null);
  const [scales, setScales] = React.useState<ScalesResult | null>(null);
  const [chords, setChords] = React.useState<ChordsResult | null>(null);
  const [profile, setProfile] = React.useState<SkillProfile | null>(null);
  const [startingScale, setStartingScale] = React.useState<ScaleId | null>(null);
  const [tookSec, setTookSec] = React.useState(0);
  const { seconds } = useStopwatch(!paused && part !== "result");
  const saving = React.useRef(false);

  React.useEffect(() => { if (!child) router.replace("/onboarding"); }, [child, router]);

  // Listen on whatever the profile prefers; release it on the way out.
  const pref = child?.settings.inputModePreference;
  const calibration = child?.settings.micCalibration ?? null;
  React.useEffect(() => {
    if (!pref) return;
    void getInput().autoDetect(pref, calibration);
    return () => { getInput().stop(); audio.stopMetronome(); };
  }, [pref, calibration, audio]);

  const finish = async (c: ChordsResult) => {
    if (!child || saving.current) return;
    saving.current = true;
    setChords(c);
    // The scale actually played, when there was one, becomes the starting key; its tempo seeds technique.
    const played = scales?.scales.filter((s) => !s.selfReported) ?? [];
    const best = played.length ? played[played.length - 1] : scales?.scales[scales.scales.length - 1];
    const scale: ScaleId | null = best ? { key: best.key, mode: best.mode } : null;
    const apply: AssessmentApply = {
      scale: scale ?? undefined,
      techniqueTempo: best && !best.selfReported ? Math.max(40, Math.min(120, Math.round(best.bpm))) : undefined,
      theoryLevel: c.theoryLevel,
      readingLevel: reading ? Math.max(1, reading.heldLevel || reading.startedAt) : undefined,
      scales: scales?.scales,
      chords: { heard: c.heard, selfReported: c.selfReported },
    };
    const p = await saveAssessment(child.id, {
      echo: ear?.score ?? 0,
      flash: reading?.score ?? 0,
      pulse: pulse?.score ?? 0,
      details: { ear, reading, pulse, scales, chords: c, inputMode: getInput().mode, seconds },
    }, apply);
    setStartingScale(scale);
    setTookSec(seconds);
    setProfile(p);
    setPart("result");
    getInput().stop();
  };

  const leave = () => { getInput().stop(); audio.stopMetronome(); router.push("/"); };

  if (!child) return null;
  const scale = startingScale ?? currentScale(child);
  const start = readingStartFor(child.settings.experience);

  return (
    <Screen style={{ height: "100dvh", overflow: "hidden" }}>
      {part === "result" && profile ? (
        <ResultScreen name={child.name} profile={profile} minutes={child.settings.sessionMinutes} scale={scale} seconds={tookSec} ear={ear} reading={reading} pulse={pulse} scales={scales} chords={chords} onToday={() => router.push("/")} />
      ) : (
        <>
          <CheckChrome part={part as PartId} seconds={seconds} paused={paused} onPause={() => setPaused((p) => !p)} onClose={leave} />
          {paused ? (
            <PausedPanel hasProfile={!!child.skillProfile} onResume={() => setPaused(false)} onLeave={leave} />
          ) : part === "ear" ? (
            <EarPart scale={scale} paused={paused} onDone={(r) => { setEar(r); setPart("reading"); }} />
          ) : part === "reading" ? (
            <ReadingPart scale={scale} start={start} experience={child.settings.experience} paused={paused} onDone={(r) => { setReading(r); setPart("pulse"); }} />
          ) : part === "pulse" ? (
            <PulsePart paused={paused} onDone={(r) => { setPulse(r); setPart("scales"); }} />
          ) : part === "scales" ? (
            <ScalesPart scale={scale} paused={paused} onDone={(r) => { setScales(r); setPart("chords"); }} />
          ) : (
            <ChordsPart paused={paused} onDone={(r) => void finish(r)} />
          )}
        </>
      )}
    </Screen>
  );
}
