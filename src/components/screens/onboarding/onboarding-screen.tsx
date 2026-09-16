"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ds";
import { useAppStore, defaultSettings } from "@/lib/store/app-store";
import { currentScale } from "@/lib/engine/progression";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import type { ChildSettings, InputMode } from "@/lib/types";
import { SetupHeader } from "./chrome";
import { StepWho, type NewPerson } from "./step-who";
import { StepInput } from "./step-input";
import { StepMode } from "./step-mode";
import { StepTarget, restDaysFor, type Target } from "./step-target";
import { openSkillCheck } from "../skill-check/open";

/**
 * Setting up: four steps in one client page. Step 1 chooses or creates the person; the others fill in that
 * person's settings. Nothing is written until the last step, so backing out costs nothing.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const parent = useAppStore((s) => s.parent);
  const profiles = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const createParent = useAppStore((s) => s.createParent);
  const createChild = useAppStore((s) => s.createChild);
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const updateChild = useAppStore((s) => s.updateChild);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateParent = useAppStore((s) => s.updateParent);

  const [step, setStep] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(() => activeChildId ?? profiles[0]?.id ?? null);
  const [adding, setAdding] = React.useState(() => profiles.length === 0);
  const [person, setPerson] = React.useState<NewPerson>({ name: "", ageBand: "child", blurb: "" });
  const [requireCode, setRequireCode] = React.useState(() => !!parent?.pin);
  const [code, setCode] = React.useState("");
  const [inputChoice, setInputChoice] = React.useState<InputMode>("timer");
  const [mode, setMode] = React.useState<ChildSettings["mode"]>("guided");
  const [target, setTarget] = React.useState<Target>(() => {
    const d = defaultSettings();
    return { days: d.practiceDaysPerWeek, minutes: d.sessionMinutes, restDays: d.restDays, hardStop: d.hardStop, countIn: d.countIn };
  });
  const [saving, setSaving] = React.useState(false);

  const selected = adding ? null : profiles.find((c) => c.id === selectedId) ?? null;
  const scale = selected ? currentScale(selected) : DEFAULT_ROADMAP[0];

  /** Leaving step 1 loads the chosen person's settings into the later steps. */
  const leaveWho = () => {
    if (selected) {
      const s = selected.settings;
      setInputChoice(s.inputModePreference === "auto" ? "timer" : s.inputModePreference);
      setMode(s.mode);
      setTarget({ days: s.practiceDaysPerWeek, minutes: s.sessionMinutes, restDays: s.restDays, hardStop: s.hardStop, countIn: s.countIn });
    } else {
      setTarget((t) => ({ ...t, hardStop: person.ageBand === "child" }));
    }
    setStep(2);
  };

  const finish = async (skillCheck: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const settings: Partial<ChildSettings> = {
        inputModePreference: inputChoice,
        mode,
        sessionMinutes: target.minutes,
        practiceDaysPerWeek: target.days,
        restDays: target.restDays.length ? target.restDays : restDaysFor(target.days),
        hardStop: target.hardStop,
        countIn: target.countIn,
      };
      const pin = requireCode ? code : null;
      if (!parent) await createParent(pin);
      else if ((parent.pin != null) !== requireCode) await updateParent({ pin: requireCode ? (code || parent.pin) : null });
      let childId: string;
      if (selected) {
        childId = selected.id;
        await updateSettings(childId, settings);
        await setActiveChild(childId);
      } else {
        const child = await createChild({ name: person.name.trim(), ageBand: person.ageBand, blurb: person.blurb.trim() || undefined, settings });
        childId = child.id;
      }
      const current = useAppStore.getState().children.find((c) => c.id === childId);
      if (!skillCheck && current && !current.skillProfile) {
        // Skipping the check leaves a null profile; the store derives the base weights from it.
        await updateChild(childId, { skillProfile: null });
      }
      if (skillCheck) openSkillCheck(router.push); else router.push("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen style={{ height: "100dvh", overflow: "hidden" }}>
      <SetupHeader step={step} />
      {step === 1 && (
        <StepWho
          profiles={profiles}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setAdding(false); }}
          adding={adding}
          onAdd={() => setAdding(true)}
          person={person}
          onPerson={setPerson}
          requireCode={requireCode}
          onRequireCode={setRequireCode}
          code={code}
          onCode={setCode}
          hasParent={!!parent}
          onContinue={leaveWho}
        />
      )}
      {step === 2 && <StepInput choice={inputChoice} onChoice={setInputChoice} onContinue={() => setStep(3)} />}
      {step === 3 && <StepMode mode={mode} onMode={setMode} scale={scale} minutes={target.minutes} onContinue={() => setStep(4)} />}
      {step === 4 && <StepTarget target={target} onTarget={setTarget} onContinue={() => void finish(true)} onSkip={() => void finish(false)} />}
    </Screen>
  );
}
