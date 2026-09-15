import * as React from "react";

/** A Material Symbols Rounded ligature glyph. Sizes: 20 inline, 26 in chrome, 34 in an empty state. Never below 20. */
export function Icon({ name, size = 20, color, style, ...rest }: { name: string; size?: number; color?: string; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLSpanElement>, "style" | "color">) {
  return (
    <span className="kc-icon" aria-hidden style={{ fontSize: size, color, lineHeight: 1, ...style }} {...rest}>
      {name}
    </span>
  );
}
