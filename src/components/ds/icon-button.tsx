import * as React from "react";
import { Icon } from "./icon";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  icon: string;
  shape?: "circle" | "square";
  /** primary = indigo with a press shadow (pause, play); secondary = white with a 2px border (close, more). */
  variant?: "primary" | "secondary";
  size?: number;
  label: string;
  style?: React.CSSProperties;
}

/** An icon-only control. Circles are for transport; settings and the like are square. */
export function IconButton({ icon, shape = "circle", variant = "secondary", size, label, style, className, ...rest }: IconButtonProps) {
  const px = size ?? (variant === "primary" ? 52 : 46);
  const primary = variant === "primary";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`kc-press ${primary ? "kc-btn-primary" : "kc-btn-secondary"}${className ? " " + className : ""}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: px, height: px, flex: "none",
        borderRadius: shape === "circle" ? "50%" : "var(--kc-radius-tile)",
        background: primary ? "var(--kc-indigo)" : "var(--kc-panel)",
        border: primary ? "none" : "2px solid var(--kc-border)",
        color: primary ? "#ffffff" : "var(--kc-ink)",
        boxShadow: primary ? "0 4px 0 0 var(--kc-indigo-shadow)" : "none",
        cursor: "pointer", padding: 0, boxSizing: "border-box", ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={primary ? Math.round(px * 0.54) : Math.round(px * 0.52)} />
    </button>
  );
}
