import * as React from "react";
import { Icon } from "./icon";

export type PillTone = "neutral" | "mint" | "amber" | "clay";

/** A short uppercase status. Mono, 0.1em tracking, 32px tall. */
export function Pill({ tone = "neutral", icon, children, style, ...rest }: { tone?: PillTone; icon?: string; children: React.ReactNode; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLSpanElement>, "style">) {
  const tones: Record<PillTone, React.CSSProperties> = {
    neutral: { background: "var(--kc-raised)", color: "var(--kc-ink-muted)", border: "none" },
    mint: { background: "var(--kc-mint-wash)", color: "var(--kc-mint)", border: "1px solid var(--kc-mint-edge)" },
    amber: { background: "#3a2a12", color: "var(--kc-amber)", border: "1px solid #7a5f2a" },
    clay: { background: "transparent", color: "var(--kc-clay)", border: "1px solid #6b4a3f" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "none", whiteSpace: "nowrap", height: 32, padding: "0 12px", borderRadius: "var(--kc-radius-pill)", fontFamily: "var(--kc-font-mono)", fontSize: 12, letterSpacing: "0.1em", lineHeight: 1, textTransform: "uppercase", ...tones[tone], ...style }} {...rest}>
      {icon && <Icon name={icon} size={15} />}
      {children}
    </span>
  );
}
