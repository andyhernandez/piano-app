import * as React from "react";
import { Icon } from "./icon";

/** neutral = plain cream; mint/indigo/sun = washes; the -fill tones are solid; clay is lilac (nothing is ever red). */
export type PillTone = "neutral" | "mint" | "indigo" | "sun" | "ink" | "indigo-fill" | "mint-fill" | "sun-fill" | "clay" | "amber";

/** A chip: 36px tall, pill-shaped, Nunito 14/800. Short statuses and counts. */
export function Pill({ tone = "neutral", icon, children, style, ...rest }: { tone?: PillTone; icon?: string; children: React.ReactNode; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLSpanElement>, "style">) {
  const tones: Record<PillTone, React.CSSProperties> = {
    neutral: { background: "var(--kc-plain-chip)", color: "var(--kc-ink-muted)" },
    mint: { background: "var(--kc-mint-wash)", color: "var(--kc-mint-ink)" },
    indigo: { background: "var(--kc-indigo-wash)", color: "var(--kc-indigo-shadow)" },
    sun: { background: "var(--kc-sun-wash)", color: "var(--kc-sun-ink)" },
    amber: { background: "var(--kc-sun-wash)", color: "var(--kc-sun-ink)" },
    ink: { background: "var(--kc-ink)", color: "#ffffff" },
    "indigo-fill": { background: "var(--kc-indigo)", color: "#ffffff" },
    "mint-fill": { background: "var(--kc-mint)", color: "var(--kc-ink)" },
    "sun-fill": { background: "var(--kc-sun)", color: "var(--kc-ink)" },
    clay: { background: "var(--kc-lilac)", color: "var(--kc-indigo-shadow)", border: "2px solid var(--kc-indigo)" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "none", whiteSpace: "nowrap", height: 36, padding: "0 14px", borderRadius: "var(--kc-radius-pill)", fontFamily: "var(--kc-font-sans)", fontSize: 14, fontWeight: 800, lineHeight: 1, boxSizing: "border-box", ...tones[tone], ...style }} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </span>
  );
}
