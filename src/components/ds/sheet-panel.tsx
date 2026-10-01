import * as React from "react";

/** The staff card: white, 26px radius, 2px border and a 5px press shadow. Only music you play from goes here. */
export function SheetPanel({ children, padding = 18, style }: { children: React.ReactNode; padding?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: 1, minHeight: 0, background: "var(--kc-paper)", border: "2px solid var(--kc-border)", borderRadius: "var(--kc-radius-sheet)", boxShadow: "var(--kc-shadow-press-sheet)", display: "flex", alignItems: "center", justifyContent: "center", padding, overflow: "hidden", position: "relative", boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}
