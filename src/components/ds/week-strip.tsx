import * as React from "react";
import { WeekKeys } from "./week-keys";

export type DayState = "played" | "playing" | "today" | "rest" | "future";
export interface WeekDay { letter: string; state: DayState; minutes?: number }

/** @deprecated The week is an octave of piano keys now: use WeekKeys. This maps the old day states onto it. */
export function WeekStrip({ days, height = 124, target = 20, onDay, style }: { days: WeekDay[]; height?: number; target?: number; onDay?: (index: number) => void; style?: React.CSSProperties }) {
  return (
    <WeekKeys
      days={days.map((d) => ({ letter: d.letter, minutes: d.state === "played" || d.state === "playing" ? d.minutes : undefined, today: d.state === "today" || d.state === "playing", rest: d.state === "rest" }))}
      height={Math.max(height, 64)}
      target={target}
      onDay={onDay}
      style={style}
    />
  );
}
