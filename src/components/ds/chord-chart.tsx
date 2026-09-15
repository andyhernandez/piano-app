import * as React from "react";

export interface ChordBar { chord: string; current?: boolean; played?: boolean }

/** Chords only, no staff. A grid of bars, four to a row. Lives on the cream page. */
export function ChordChart({ bars, perRow = 4, cellHeight = 64, onBar, style }: { bars: ChordBar[]; perRow?: number; cellHeight?: number; onBar?: (i: number) => void; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, gap: 6, width: "100%", ...style }}>
      {bars.map((b, i) => (
        <div key={i} onClick={onBar ? () => onBar(i) : undefined} style={{ height: cellHeight, borderRadius: "var(--kc-radius-control)", border: (b.current ? "1.5px" : "1px") + " solid " + (b.current ? "#2f9f77" : "var(--kc-paper-ink-dim)"), background: b.current ? "rgba(90,209,192,.28)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-mono)", fontSize: 22, fontWeight: 600, color: b.played === false ? "var(--kc-paper-ink-dim)" : "var(--kc-paper-ink)", cursor: onBar ? "pointer" : "default" }}>
          {b.chord}
        </div>
      ))}
    </div>
  );
}
