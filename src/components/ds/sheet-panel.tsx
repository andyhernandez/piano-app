import * as React from "react";

/** The reading page. Cream, and the only light surface in the app. Only music you play from goes here. */
export function SheetPanel({ children, padding = 18, style }: { children: React.ReactNode; padding?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: 1, minHeight: 0, background: "var(--kc-paper)", borderRadius: "var(--kc-radius-panel)", display: "flex", alignItems: "center", justifyContent: "center", padding, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}
