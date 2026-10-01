import * as React from "react";

export interface WeekKeyDay {
  /** Day letter, M T W T F S S. */
  letter: string;
  minutes?: number;
  today?: boolean;
  rest?: boolean;
}

/**
 * The practice week as an octave of piano keys: seven white keys (Mon–Sun) with the five black keys on top.
 * A played day fills mint from the bottom in proportion to its minutes against the target, with the count
 * inside. Today has a 3px indigo border on the indigo wash. Rest days are dashed; future days plain white.
 */
export function WeekKeys({ days, target = 20, height = 124, onDay, style }: { days: WeekKeyDay[]; target?: number; height?: number; onDay?: (index: number) => void; style?: React.CSSProperties }) {
  const n = days.length || 7;
  const small = height < 90;
  return (
    <div style={{ position: "relative", height, display: "flex", gap: 4, ...style }}>
      {days.map((d, i) => {
        const fill = d.minutes ? Math.min(1, d.minutes / target) : 0;
        const box: React.CSSProperties = d.today
          ? { border: "3px solid var(--kc-indigo)", background: "var(--kc-indigo-wash)" }
          : d.rest ? { border: "2px dashed var(--kc-border-dashed)", background: "var(--kc-base)" } : { border: "2px solid var(--kc-border)", background: "var(--kc-panel)" };
        const label = d.minutes ? String(d.minutes) : d.today ? "now" : d.rest ? "rest" : "";
        const labelStyle: React.CSSProperties = d.minutes ? { fontSize: small ? 13 : 18, color: "var(--kc-ink)" } : { fontSize: small ? 10 : 12, color: d.today ? "var(--kc-indigo)" : "var(--kc-ink-faint)" };
        return (
          <div key={i} onClick={onDay ? () => onDay(i) : undefined} style={{ position: "relative", flex: 1, borderRadius: "0 0 12px 12px", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: small ? 2 : 4, paddingBottom: small ? 5 : 8, boxSizing: "border-box", cursor: onDay ? "pointer" : "default", ...box }}>
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.round(fill * 100)}%`, background: "var(--kc-mint)" }} />
            <span style={{ position: "relative", fontFamily: "var(--kc-font-display)", fontWeight: 600, lineHeight: 1, ...labelStyle }}>{label}</span>
            <span style={{ position: "relative", fontSize: small ? 11 : 13, fontWeight: 900, color: "var(--kc-ink-faint)", lineHeight: 1 }}>{d.letter}</span>
          </div>
        );
      })}
      {[0, 1, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden style={{ position: "absolute", top: 0, width: small ? 14 : 24, height: Math.round(height * 0.45), marginLeft: small ? -7 : -12, borderRadius: "0 0 7px 7px", background: "var(--kc-ink)", left: `calc(${(((i + 1) / n) * 100).toFixed(3)}% - ${(((i + 1) / n) * 4 - 2).toFixed(2)}px)` }} />
      ))}
    </div>
  );
}
