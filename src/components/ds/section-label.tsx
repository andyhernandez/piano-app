import * as React from "react";

/** The uppercase mono label above a group (12px, .12em) or the meta label inside a card (10px, .07em). */
export function SectionLabel({ size = "label", children, style, ...rest }: { size?: "label" | "meta"; children: React.ReactNode; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLDivElement>, "style">) {
  const sizes = {
    label: { fontSize: 12, letterSpacing: "0.12em", color: "var(--kc-ink-dim)" },
    meta: { fontSize: 10, letterSpacing: "0.07em", color: "var(--kc-ink-faint)" },
  };
  return (
    <div style={{ fontFamily: "var(--kc-font-mono)", lineHeight: 1, textTransform: "uppercase", ...sizes[size], ...style }} {...rest}>
      {children}
    </div>
  );
}
