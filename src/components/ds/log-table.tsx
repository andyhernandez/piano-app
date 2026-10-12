import * as React from "react";

export interface LogRow { cells: React.ReactNode[]; marked?: boolean }

/** The session log. First column is a fixed 72px, the last sits right; rows are divided by a 2px hairline. */
export function LogTable({ rows, emphasize = 1, style }: { rows: LogRow[]; emphasize?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "2px solid var(--kc-hairline)" }}>
          {row.cells.map((cell, c) => {
            const last = c === row.cells.length - 1;
            return (
              <span key={c} style={{ width: c === 0 ? 72 : undefined, flex: c === 0 || last ? "none" : 1, marginLeft: last ? "auto" : undefined, textAlign: last ? "right" : "left", fontSize: c === 1 ? 16 : 14, fontWeight: c === 1 ? 800 : 700, color: c === emphasize || row.marked ? "var(--kc-ink)" : "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
