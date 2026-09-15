import * as React from "react";
import { FormatBadge, type Format } from "./format-badge";
import { Pill } from "./pill";
import { Button } from "./button";

/** One piece in the Library. Assigned rows sit on the mint wash. */
export function PieceRow({ title, meta, format, assigned = false, pill, actionLabel = "Open", onOpen, style }: { title: string; meta: React.ReactNode; format: Format; assigned?: boolean; pill?: string; actionLabel?: string; onOpen?: () => void; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: assigned ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: "1px solid " + (assigned ? "var(--kc-mint-edge)" : "var(--kc-border)"), borderRadius: "var(--kc-radius-panel)", padding: "14px 18px", height: 84, boxSizing: "border-box", ...style }}>
      <FormatBadge format={format} assigned={assigned} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--kc-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>
      </div>
      {pill && <Pill tone="mint">{pill}</Pill>}
      <Button variant="secondary" size="control" onClick={onOpen}>{actionLabel}</Button>
    </div>
  );
}
