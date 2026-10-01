import * as React from "react";
import { Icon } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "sun";
/** primary = the 72px screen action, control = the 60px bar action, pill = the 46px compact control. */
export type ButtonSize = "primary" | "control" | "pill";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  /** Put the icon after the label ("Continue →"). */
  iconAfter?: boolean;
  style?: React.CSSProperties;
}

/**
 * Chunky, pressable. Primary is indigo with a hard bottom shadow that collapses on press; secondary is white
 * with a 2px border and a 4px shadow; quiet is text only. All labels are Fredoka.
 */
export function Button({ variant = "primary", size = "primary", icon, iconAfter = false, disabled = false, children, style, className, ...rest }: ButtonProps) {
  const big = size === "primary";
  const heights: Record<ButtonSize, number> = { primary: 72, control: 60, pill: 46 };
  const fontSizes: Record<ButtonSize, number> = { primary: 25, control: 20, pill: 16 };
  const iconSizes: Record<ButtonSize, number> = { primary: 30, control: 24, pill: 22 };
  const pads: Record<ButtonSize, number> = { primary: 34, control: 26, pill: 18 };
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: big ? 10 : 8,
    height: heights[size],
    padding: `0 ${variant === "primary" ? pads[size] : Math.max(16, pads[size] - 8)}px`,
    borderRadius: big ? "var(--kc-radius-button)" : "var(--kc-radius-control)",
    fontFamily: "var(--kc-font-display)",
    fontSize: variant === "primary" ? fontSizes[size] : Math.min(fontSizes[size], 18),
    fontWeight: variant === "primary" ? 600 : 500,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
    flex: "none",
    boxSizing: "border-box",
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: big ? "var(--kc-shadow-press-indigo)" : "var(--kc-shadow-press-bar)" },
    secondary: { background: "var(--kc-panel)", color: "var(--kc-ink)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" },
    quiet: { background: "transparent", color: "var(--kc-ink-muted)", border: "none", height: Math.min(heights[size], 52) },
    sun: { background: "var(--kc-sun)", color: "var(--kc-ink)", border: "none", boxShadow: "var(--kc-shadow-press-sun)", fontWeight: 600 },
  };
  const cls = `kc-press kc-btn-${variant}${className ? " " + className : ""}`;
  const glyph = icon ? <Icon name={icon} size={iconSizes[size]} /> : null;
  return (
    <button type="button" disabled={disabled} className={cls} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {!iconAfter && glyph}
      {children}
      {iconAfter && glyph}
    </button>
  );
}
