import * as React from "react";

export type PanelState = "resting" | "current" | "cleared" | "empty";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  padding?: "card" | "panel" | "roomy";
  state?: PanelState;
  style?: React.CSSProperties;
}

/** A card or rail block. Flat fill, 1px resting border, 11px radius, asymmetric padding. No shadow. */
export function Panel({ padding = "panel", state = "resting", children, style, ...rest }: PanelProps) {
  const pads = { card: "16px 18px", panel: "20px 22px", roomy: "24px 26px" };
  const states: Record<PanelState, React.CSSProperties> = {
    resting: { background: "var(--kc-panel)", border: "1px solid var(--kc-border)" },
    current: { background: "var(--kc-mint-wash)", border: "1.5px solid var(--kc-mint)" },
    cleared: { background: "var(--kc-mint-wash)", border: "1px solid var(--kc-mint-edge)" },
    empty: { background: "transparent", border: "1px dashed var(--kc-border-dashed)" },
  };
  return (
    <div style={{ borderRadius: "var(--kc-radius-panel)", padding: pads[padding], boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, minWidth: 0, ...states[state], ...style }} {...rest}>
      {children}
    </div>
  );
}
