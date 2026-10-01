import * as React from "react";

/**
 * The title above a group: Fredoka 20/600 ("This week"). `meta` is the small Nunito 14/800 faint line used for
 * kickers and counts ("3 of 5 days"). `title` is the 18px card title.
 */
export function SectionLabel({ size = "label", children, style, ...rest }: { size?: "label" | "meta" | "title"; children: React.ReactNode; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLDivElement>, "style">) {
  const sizes: Record<string, React.CSSProperties> = {
    label: { fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15, color: "var(--kc-ink)" },
    title: { fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15, color: "var(--kc-ink)" },
    meta: { fontFamily: "var(--kc-font-sans)", fontSize: 14, fontWeight: 800, lineHeight: 1.2, color: "var(--kc-ink-faint)" },
  };
  return (
    <div style={{ ...sizes[size], ...style }} {...rest}>
      {children}
    </div>
  );
}
