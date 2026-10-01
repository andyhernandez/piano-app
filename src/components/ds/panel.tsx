import * as React from "react";

export type PanelState = "resting" | "current" | "cleared" | "empty";
export type PanelTone = "indigo" | "mint" | "sun" | "cream";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  padding?: "card" | "panel" | "roomy";
  state?: PanelState;
  /** A soft wash block with no border or shadow (the "key of the month" tile, a hint). */
  tone?: PanelTone;
  style?: React.CSSProperties;
}

/**
 * A card: white, 2px border, 22px radius and a 4px press shadow in the border colour. `current` is the indigo
 * wash with a 3px indigo border; `cleared` is the mint wash; `empty` is a 3px dashed outline. A `tone` makes it a
 * borderless wash block instead.
 */
export function Panel({ padding = "panel", state = "resting", tone, children, style, ...rest }: PanelProps) {
  const pads = { card: "16px 20px", panel: "20px 22px", roomy: "22px 24px" };
  const states: Record<PanelState, React.CSSProperties> = {
    resting: { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" },
    current: { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" },
    cleared: { background: "var(--kc-mint-wash)", border: "2px solid transparent" },
    empty: { background: "transparent", border: "3px dashed var(--kc-border-dashed)" },
  };
  const tones: Record<PanelTone, React.CSSProperties> = {
    indigo: { background: "var(--kc-indigo-wash)" },
    mint: { background: "var(--kc-mint-wash)" },
    sun: { background: "var(--kc-sun-wash)" },
    cream: { background: "var(--kc-cream)" },
  };
  const look = tone ? { ...tones[tone], border: "none", borderRadius: "var(--kc-radius-soft)", padding: "18px 20px", gap: 8 } : { ...states[state], borderRadius: "var(--kc-radius-panel)", padding: pads[padding], gap: 12 };
  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", minWidth: 0, ...look, ...style }} {...rest}>
      {children}
    </div>
  );
}
