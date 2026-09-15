import * as React from "react";

export interface LogRow { cells: React.ReactNode[]; marked?: boolean }

/** The mono session log. Columns are spaced by justify-content, not fixed widths. */
export function LogTable({ rows, emphasize = 1, style }: { rows: LogRow[]; emphasize?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, fontFamily: "var(--kc-font-mono)", fontSize: 12, color: "var(--kc-ink-dim)", textTransform: "uppercase", ...style }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--kc-border)", paddingBottom: 6 }}>
          {row.cells.map((cell, c) => (
            <span key={c} style={{ color: row.marked && c === row.cells.length - 1 ? "var(--kc-mint)" : c === emphasize ? "var(--kc-ink)" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
