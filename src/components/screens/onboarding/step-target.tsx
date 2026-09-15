"use client";
import * as React from "react";
import { Button, ChoiceTile, Headline, Rail, RailSection, SectionLabel, Toggle, WeekStrip, type WeekDay } from "@/components/ds";
import { DAY_LETTERS, fmtHours } from "@/lib/engine/record";
import { StepActions, capitalize, numberWord } from "./chrome";

export interface Target { days: number; minutes: number; restDays: number[]; hardStop: boolean; countIn: boolean }

const DAY_OPTIONS = [3, 4, 5, 6, 7];
const MINUTE_OPTIONS = [10, 15, 20, 30];
/** Which days become rest days as the target drops: Sunday first, then midweek, then Saturday. */
const REST_ORDER = [6, 2, 5, 3, 0, 4, 1];

export function restDaysFor(days: number): number[] {
  return REST_ORDER.slice(0, Math.max(0, 7 - days)).sort((a, b) => a - b);
}

/** A4 · Weekly target. Days, minutes, the hard stop, and a preview of the week on the rail. */
export function StepTarget({ target, onTarget, onContinue, onSkip }: { target: Target; onTarget: (t: Target) => void; onContinue: () => void; onSkip: () => void }) {
  const { days, minutes, restDays, hardStop, countIn } = target;
  const weekMinutes = days * minutes;
  const monthHours = Math.round((weekMinutes * 52) / 12 / 60);
  const preview: WeekDay[] = DAY_LETTERS.map((letter, i) => ({ letter, state: restDays.includes(i) ? "rest" : "future" }));

  const setDays = (n: number) => onTarget({ ...target, days: n, restDays: restDaysFor(n) });
  const toggleDay = (i: number) => {
    const next = restDays.includes(i) ? restDays.filter((d) => d !== i) : [...restDays, i].sort((a, b) => a - b);
    if (next.length > 4) return; // three days a week is the floor
    onTarget({ ...target, restDays: next, days: 7 - next.length });
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 336px" }}>
      <div style={{ padding: 38, display: "flex", flexDirection: "column", gap: 28, minHeight: 0 }}>
        <Headline title="How often, and for how long?" lede="Pick something you'll actually hit. Five days beats seven you resent, and the streak counts weeks at target — so a rest day costs nothing." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Days a week</SectionLabel>
          <div style={{ display: "flex", gap: 10 }}>
            {DAY_OPTIONS.map((n) => <ChoiceTile key={n} value={n} unit="days" selected={days === n} onClick={() => setDays(n)} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Session length</SectionLabel>
          <div style={{ display: "flex", gap: 10 }}>
            {MINUTE_OPTIONS.map((n) => <ChoiceTile key={n} value={n} unit="minutes" selected={minutes === n} onClick={() => onTarget({ ...target, minutes: n })} />)}
          </div>
        </div>
        <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "6px 22px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 0", borderBottom: "1px solid var(--kc-border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Stop me at {numberWord(minutes)} minutes</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.4 }}>Off by default for adults, on by default under thirteen. Either way the timer is advisory, never a lock.</div>
            </div>
            <Toggle checked={hardStop} onChange={(v) => onTarget({ ...target, hardStop: v })} label="Hard stop at session length" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 0" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Count me in</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.4 }}>Two bars of click before anything that measures timing.</div>
            </div>
            <Toggle checked={countIn} onChange={(v) => onTarget({ ...target, countIn: v })} label="Count in before timed exercises" />
          </div>
        </div>
        <StepActions>
          <Button icon="arrow_forward" onClick={onContinue}>Take the skill check</Button>
          <Button variant="quiet" size="control" onClick={onSkip}>Skip for now</Button>
        </StepActions>
      </div>
      <Rail>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>What a week will look like</SectionLabel>
          <WeekStrip days={preview} target={minutes} height={60} onDay={toggleDay} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{capitalize(numberWord(days))} filled, {numberWord(7 - days)} dashed. Choose which days are rest days now or leave it — the app learns them from what you actually do.</p>
        </div>
        <RailSection label="Adds up to">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, color: "var(--kc-mint)" }}>{fmtHours(weekMinutes)}</span></div>
          <div style={{ fontSize: 15, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>a week, or about {monthHours} hours a month. Most teachers ask for five days of twenty minutes.</div>
        </RailSection>
        <RailSection label="About the streak" last style={{ gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>It counts <b>weeks you hit {numberWord(days)} days</b>, not days in a row. Miss a Tuesday and Wednesday covers it. Nothing you have earned can be taken away.</p>
        </RailSection>
      </Rail>
    </div>
  );
}
