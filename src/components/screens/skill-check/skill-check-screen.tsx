"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { currentScale } from "@/lib/engine/progression";
import type { SkillProfile } from "@/lib/types";
import { CheckChrome, PARTS, PausedPanel, type EarResult, type PartId, type PulseResult, type ReadingResult } from "./shared";
import { EarPart } from "./ear-part";
import { ReadingPart } from "./reading-part";
import { PulsePart } from "./pulse-part";
import { ResultScreen } from "./result-screen";

const META: Record<PartId, { title: string; meta: string }> = {
  ear: { title: "Ear", meta: "Six phrases · two to five notes · no page" },
  reading: { title: "Reading", meta: "Getting harder until you stop · right hand only" },
  pulse: { title: "Timing", meta: "Tap along to the click · then three written rhythms" },
};

/**
 * The skill check: ear, reading, timing, then the result. Five minutes or so, re-taken every four weeks
 * (Settings links here). Skipping leaves the profile as it was — null on a first run, so the plan uses base weights.
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
  const [profile, setProfile] = React.useState<SkillProfile | null>(null);
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

  const finishPulse = async (r: PulseResult) => {
    if (!child || saving.current) return;
    saving.current = true;
    setPulse(r);
    const p = await saveAssessment(child.id, {
      echo: ear?.score ?? 0,
      flash: reading?.score ?? 0,
      pulse: r.score,
      details: { ear, reading, pulse: r, inputMode: getInput().mode, seconds },
    });
    setTookSec(seconds);
    setProfile(p);
    setPart("result");
    getInput().stop();
  };

  if (!child) return null;
  const scale = currentScale(child);
  const idx = part === "result" ? PARTS.length : PARTS.indexOf(part);
  const progress = part === "result" ? 1 : (idx + (part === "ear" ? 0 : part === "reading" ? 0 : 0)) / PARTS.length + 1 / (PARTS.length * 2);

  return (
    <Screen style={{ height: "100dvh", overflow: "hidden" }}>
      {part === "result" && profile ? (
        <ResultScreen name={child.name} profile={profile} minutes={child.settings.sessionMinutes} scale={scale} seconds={tookSec} ear={ear} reading={reading} pulse={pulse} onToday={() => router.push("/")} />
      ) : (
        <>
          <CheckChrome index={idx + 1} title={META[part as PartId].title} meta={META[part as PartId].meta} seconds={seconds} progress={progress} paused={paused} onPause={() => setPaused((p) => !p)} />
          {paused ? (
            <PausedPanel hasProfile={!!child.skillProfile} onResume={() => setPaused(false)} onLeave={() => { getInput().stop(); router.push("/"); }} />
          ) : part === "ear" ? (
            <EarPart scale={scale} paused={paused} onDone={(r) => { setEar(r); setPart("reading"); }} />
          ) : part === "reading" ? (
            <ReadingPart scale={scale} paused={paused} onDone={(r) => { setReading(r); setPart("pulse"); }} />
          ) : (
            <PulsePart paused={paused} onDone={(r) => void finishPulse(r)} />
          )}
        </>
      )}
    </Screen>
  );
}
