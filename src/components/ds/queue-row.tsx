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
  /** Material icon for the stop (piano, timer, hearing, menu_book, music_note, queue_music, auto_awesome). */
  icon?: string;
  draggable?: boolean;
  /** A −/time/+ stepper or any control in place of the plain duration. */
  control?: React.ReactNode;
  menu?: React.ReactNode;
  style?: React.CSSProperties;
}

/** A stop in today's queue: drag handle, icon tile, name and detail, setting chips, the time, a menu. */
export function QueueRow({ index, title, detail, duration, state = "pending", settings = [], icon, draggable = true, control, menu, style, ...rest }: QueueRowProps) {
  const states: Record<QueueState, React.CSSProperties> = {
    pending: { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" },
    current: { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" },
    done: { background: "var(--kc-mint-wash)", border: "2px solid transparent" },
  };
  const tile: React.CSSProperties = state === "done"
    ? { background: "var(--kc-mint)", color: "var(--kc-ink)" }
    : state === "current" ? { background: "var(--kc-indigo)", color: "#ffffff" } : { background: "var(--kc-indigo-wash)", color: "var(--kc-indigo)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: "var(--kc-radius-panel)", padding: "12px 16px", boxSizing: "border-box", minHeight: 72, ...states[state], ...style }} {...rest}>
      {draggable && <Icon name="drag_indicator" size={22} color="var(--kc-ink-faint)" style={{ cursor: "grab" }} />}
      <span style={{ width: 46, height: 46, flex: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", ...tile }}>
        {icon ? <Icon name={icon} size={24} /> : <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>{index}</span>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, color: "var(--kc-ink)", lineHeight: 1.15 }}>{title}</div>
        {detail && <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.3 }}>{detail}</div>}
      </div>
      {settings.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 190, justifyContent: "flex-end" }}>
          {settings.map((s) => (
            <span key={s} style={{ fontSize: 13, fontWeight: 800, background: state === "pending" ? "var(--kc-plain-chip)" : "var(--kc-panel)", color: "var(--kc-ink-muted)", padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{s}</span>
          ))}
        </div>
      )}
      {control ?? <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, color: "var(--kc-ink)", minWidth: 52, textAlign: "right" }}>{duration}</span>}
      {menu ?? <Icon name="more_vert" size={22} color="var(--kc-ink-faint)" />}
    </div>
  );
}
