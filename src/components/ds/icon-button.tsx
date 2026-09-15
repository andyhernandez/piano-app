import * as React from "react";
import { Icon } from "./icon";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  icon: string;
  shape?: "circle" | "square";
  size?: number;
  label: string;
  style?: React.CSSProperties;
}

/** An icon-only control. Circles are reserved for transport; settings and the like are square. */
export function IconButton({ icon, shape = "circle", size = 34, label, style, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flex: "none",
        borderRadius: shape === "circle" ? "50%" : "var(--kc-radius-control)",
        background: "transparent", border: "1px solid var(--kc-border-active)", color: "var(--kc-ink-muted)",
        cursor: "pointer", padding: 0, transition: "border-color 140ms ease-out, color 140ms ease-out", ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}
