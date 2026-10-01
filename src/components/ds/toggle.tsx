import * as React from "react";

/** A 56×34 switch. Indigo when on, with a white knob that carries a small hard shadow. */
export function Toggle({ checked = false, onChange, label, disabled, style }: { checked?: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      className="kc-press"
      style={{
        width: 56, height: 34, flex: "none", borderRadius: 999, boxSizing: "border-box", position: "relative", display: "inline-block", padding: 0,
        background: checked ? "var(--kc-indigo)" : "var(--kc-toggle-off)", border: "none",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, ...style,
      }}
    >
      <span style={{ position: "absolute", top: 5, left: checked ? 27 : 5, width: 24, height: 24, borderRadius: "50%", background: "#ffffff", boxShadow: "0 2px 0 0 rgba(31,33,64,.18)", transition: "left 120ms ease-out" }} />
    </button>
  );
}
