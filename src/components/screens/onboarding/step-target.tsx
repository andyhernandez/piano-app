"use client";
import * as React from "react";
import { Button, ChoiceTile, Headline, Icon, Rail, RailSection, Row, Toggle, WeekKeys, type WeekKeyDay } from "@/components/ds";
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

/** A4 · How often. Days and minutes as chunky tiles, the hard stop and count-in, and the week as piano keys on the rail. */
export function StepTarget({ target, onTarget, onContinue, onSkip }: { target: Target; onTarget: (t: Target) => void; onContinue: () => void; onSkip: () => void }) {
  const { days, minutes, restDays, hardStop, countIn } = target;
  const weekMinutes = days * minutes;
  const monthHours = Math.round((weekMinutes * 52) / 12 / 60);
  const preview: WeekKeyDay[] = DAY_LETTERS.map((letter, i) => ({ letter, rest: restDays.includes(i) }));

  const setDays = (n: number) => onTarget({ ...target, days: n, restDays: restDaysFor(n) });
  const toggleDay = (i: number) => {
    const next = restDays.includes(i) ? restDays.filter((d) => d !== i) : [...restDays, i].sort((a, b) => a - b);
    if (next.length > 4) return; // three days a week is the floor
    onTarget({ ...target, restDays: next, days: 7 - next.length });
  };
  const sectionTitle: React.CSSProperties = { fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
      <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0 }}>
        <Headline title="How often, and for how long?" lede="Pick something you'll actually hit. Five days beats seven you resent — and a rest day costs nothing." />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionTitle}>Days a week</div>
          <div style={{ display: "flex", gap: 10 }}>
            {DAY_OPTIONS.map((n) => <ChoiceTile key={n} value={n} unit="days" selected={days === n} onClick={() => setDays(n)} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionTitle}>Session length</div>
          <div style={{ display: "flex", gap: 10 }}>
            {MINUTE_OPTIONS.map((n) => <ChoiceTile key={n} value={n} unit="minutes" selected={minutes === n} onClick={() => onTarget({ ...target, minutes: n })} />)}
          </div>
        </div>
        <div style={{ background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", padding: "4px 22px", display: "flex", flexDirection: "column" }}>
          <Row title={`Stop me at ${numberWord(minutes)} minutes`} detail="On for under-thirteens, off for adults. The timer is advisory, never a lock.">
            <Toggle checked={hardStop} onChange={(v) => onTarget({ ...target, hardStop: v })} label="Hard stop at session length" />
          </Row>
          <Row title="Count me in" detail="Two bars of click before anything that measures timing." last>
            <Toggle checked={countIn} onChange={(v) => onTarget({ ...target, countIn: v })} label="Count in before timed exercises" />
          </Row>
        </div>
        <StepActions>
          <Button icon="arrow_forward" iconAfter onClick={onContinue}>Take the skill check</Button>
          <Button variant="quiet" size="control" onClick={onSkip}>Skip for now</Button>
        </StepActions>
      </div>
      <Rail>
        <RailSection label="This week" right={`${days} days`}>
          <WeekKeys days={preview} target={minutes} onDay={toggleDay} />
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{capitalize(numberWord(days))} keys to light, {numberWord(7 - days)} dashed. Tap a key to move a rest day — or let the app learn them.</div>
        </RailSection>
        <div style={{ background: "var(--kc-indigo-wash)", borderRadius: 20, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-indigo-shadow)" }}>Adds up to</div>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 40, fontWeight: 600, lineHeight: 1, color: "var(--kc-indigo)" }}>{fmtHours(weekMinutes)}</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>a week — about {numberWord(monthHours)} hours a month. Most teachers ask for five days of twenty minutes.</div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Icon name="local_fire_department" size={30} color="var(--kc-sun-ink)" />
          <div>
            <div style={sectionTitle}>About the streak</div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>It counts <b>weeks you hit {numberWord(days)} days</b>, not days in a row. Miss a Tuesday and Wednesday covers it. Nothing you&apos;ve earned is ever taken away.</div>
          </div>
        </div>
      </Rail>
    </div>
  );
}
