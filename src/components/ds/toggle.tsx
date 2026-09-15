import * as React from "react";

/** A 46×26 switch. Mint when on. */
export function Toggle({ checked = false, onChange, label, disabled, style }: { checked?: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 46, height: 26, flex: "none", borderRadius: 13, boxSizing: "border-box", display: "inline-flex", alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start", padding: checked ? "0 4px" : "0 3px",
        background: checked ? "var(--kc-mint)" : "var(--kc-base)", border: checked ? "none" : "1px solid var(--kc-border-active)",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, transition: "background 140ms ease-out", ...style,
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: checked ? "var(--kc-mint-ink)" : "var(--kc-ink-muted)" }} />
    </button>
  );
}
