import * as React from "react";

export type DayState = "played" | "playing" | "today" | "rest" | "future";
export interface WeekDay { letter: string; state: DayState; minutes?: number }

/** Seven days of practice. Minutes as fill height with the number inside; rest days dashed. */
export function WeekStrip({ days, height = 44, target, onDay, style }: { days: WeekDay[]; height?: number; target?: number; onDay?: (index: number) => void; style?: React.CSSProperties }) {
  const cell = (d: WeekDay, i: number) => {
    const box: React.CSSProperties = { width: "100%", height, borderRadius: "var(--kc-radius-cell)", boxSizing: "border-box", display: "flex", justifyContent: "center", position: "relative", overflow: "hidden" };
    let tile: React.ReactNode;
    if (d.state === "played" || d.state === "playing") {
      const pct = target ? Math.min(100, ((d.minutes ?? 0) / target) * 100) : 100;
      tile = (
        <div style={{ ...box, alignItems: "flex-end", background: "var(--kc-mint-wash)", border: d.state === "playing" ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-mint-edge)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: pct + "%", background: "var(--kc-mint)" }} />
          <span style={{ position: "relative", fontFamily: "var(--kc-font-mono)", fontSize: 10, fontWeight: 600, color: "var(--kc-mint-ink)", paddingBottom: 3 }}>{d.minutes}</span>
        </div>
      );
    } else if (d.state === "today") {
      tile = (
        <div style={{ ...box, alignItems: "center", background: "var(--kc-mint-wash)", border: "1.5px solid var(--kc-mint)" }}>
          <span style={{ fontFamily: "var(--kc-font-music)", fontSize: 17, lineHeight: 1, color: "var(--kc-mint)" }}>{"\u{1D160}"}</span>
        </div>
      );
    } else if (d.state === "rest") {
      tile = (
        <div style={{ ...box, alignItems: "center", background: "transparent", border: "1px dashed var(--kc-border-dashed)" }}>
          <span style={{ width: 12, height: 1.5, borderRadius: 1, background: "var(--kc-cell-dash-mark)" }} />
        </div>
      );
    } else {
      tile = <div style={{ ...box, background: "var(--kc-cell-future)", border: "1px solid var(--kc-cell-future-bd)" }} />;
    }
    const lit = d.state === "played" || d.state === "today" || d.state === "playing";
    return (
      <div key={i} onClick={onDay ? () => onDay(i) : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: onDay ? "pointer" : "default" }}>
        {tile}
        <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.06em", color: lit ? "var(--kc-ink-muted)" : "var(--kc-cell-letter)", fontWeight: d.state === "today" ? 700 : 500 }}>{d.letter}</span>
      </div>
    );
  };
  return <div style={{ display: "flex", gap: 6, ...style }}>{days.map(cell)}</div>;
}
