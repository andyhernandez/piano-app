import * as React from "react";
import { FormatBadge, type Format } from "./format-badge";
import { Pill, type PillTone } from "./pill";
import { Button } from "./button";

/** One piece in the Library: a format tile, the title and meta, a state chip, an Open button. Assigned rows are on the indigo wash. */
export function PieceRow({ title, meta, format, assigned = false, pill, pillTone, actionLabel = "Open", onOpen, style }: { title: string; meta: React.ReactNode; format: Format; assigned?: boolean; pill?: string; pillTone?: PillTone; actionLabel?: string; onOpen?: () => void; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: assigned ? "var(--kc-indigo-wash)" : "var(--kc-panel)", border: assigned ? "3px solid var(--kc-indigo)" : "2px solid var(--kc-border)", boxShadow: assigned ? "none" : "var(--kc-shadow-press)", borderRadius: "var(--kc-radius-panel)", padding: "14px 18px", minHeight: 88, boxSizing: "border-box", ...style }}>
      <FormatBadge format={format} assigned={assigned} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, color: "var(--kc-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{meta}</div>
      </div>
      {pill && <Pill tone={pillTone ?? (assigned ? "indigo" : "mint")}>{pill}</Pill>}
      <Button variant="secondary" size="pill" onClick={onOpen}>{actionLabel}</Button>
    </div>
  );
}
