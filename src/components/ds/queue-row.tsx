import * as React from "react";
import { Icon } from "./icon";

export type QueueState = "pending" | "current" | "done";

export interface QueueRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "title"> {
  index: number;
  title: React.ReactNode;
  detail?: React.ReactNode;
  duration: string;
  state?: QueueState;
  settings?: string[];
  draggable?: boolean;
  menu?: React.ReactNode;
  style?: React.CSSProperties;
}

/** An exercise in today's session. */
export function QueueRow({ index, title, detail, duration, state = "pending", settings = [], draggable = true, menu, style, ...rest }: QueueRowProps) {
  const states: Record<QueueState, React.CSSProperties> = {
    pending: { background: "var(--kc-panel)", border: "1px solid var(--kc-border)" },
    current: { background: "var(--kc-mint-wash)", border: "1.5px solid var(--kc-mint)" },
    done: { background: "var(--kc-mint-wash)", border: "1px solid var(--kc-mint-edge)" },
  };
  const numberColor = state === "pending" ? "var(--kc-ink-faint)" : "var(--kc-mint)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: "var(--kc-radius-panel)", padding: "16px 20px", boxSizing: "border-box", minHeight: 84, ...states[state], ...style }} {...rest}>
      {draggable && <Icon name="drag_indicator" size={20} color="var(--kc-ink-faint)" style={{ cursor: "grab" }} />}
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 14, color: numberColor, width: 20 }}>{String(index).padStart(2, "0")}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--kc-ink)" }}>{title}</div>
        {detail && <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{detail}</div>}
      </div>
      {settings.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 150, justifyContent: "flex-end" }}>
          {settings.map((s) => (
            <span key={s} style={{ fontFamily: "var(--kc-font-mono)", fontSize: 11, background: state === "pending" ? "var(--kc-raised)" : "rgba(90,209,192,0.12)", color: state === "pending" ? "var(--kc-ink-muted)" : "var(--kc-mint)", padding: "3px 7px", borderRadius: 3, textTransform: "uppercase" }}>{s}</span>
          ))}
        </div>
      )}
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 16, color: "var(--kc-ink)" }}>{duration}</span>
      {menu ?? <Icon name="more_vert" size={20} color="var(--kc-ink-faint)" />}
    </div>
  );
}
