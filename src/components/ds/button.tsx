import * as React from "react";
import { Icon } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "primary" | "control" | "pill";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  style?: React.CSSProperties;
}

/** One mint primary per screen, at the bottom of the main column. Secondary is outlined; quiet is raised. */
export function Button({ variant = "primary", size = "primary", icon, disabled = false, children, style, ...rest }: ButtonProps) {
  const heights: Record<ButtonSize, number> = { primary: 48, control: 40, pill: 32 };
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: heights[size],
    padding: size === "pill" ? "0 12px" : "0 20px",
    borderRadius: size === "pill" ? "var(--kc-radius-pill)" : "var(--kc-radius-control)",
    fontFamily: "var(--kc-font-sans)",
    fontSize: size === "primary" ? 16 : 14,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    whiteSpace: "nowrap",
    transition: "background 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out",
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--kc-mint)", color: "var(--kc-mint-ink)", border: "none", fontWeight: 700 },
    secondary: { background: "transparent", color: "var(--kc-ink-muted)", border: "1px solid var(--kc-border-active)", fontWeight: 600 },
    quiet: { background: "var(--kc-raised)", color: "var(--kc-ink-muted)", border: "none", fontWeight: 600 },
  };
  return (
    <button type="button" disabled={disabled} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}
