import * as React from "react";
import { Icon } from "./icon";

export type StopState = "first" | "upcoming" | "new" | "own" | "done" | "best" | "current";

export interface Stop {
  icon: string;
  name: string;
  /** "3 min" before the session, "15 of 16 even" after. */
  detail?: string;
  state?: StopState;
}

/**
 * Today's stops as circles on a dotted connector. Before the session the first stop is indigo with a sunshine
 * START HERE tag and "Your own" is dashed. Done, the connector is solid mint, circles are mint, and a personal
 * best is sunshine with a star. Lays out seven stops in a ~790px column.
 */
export function StopPath({ stops, done = false, style }: { stops: Stop[]; done?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", ...style }}>
      <span aria-hidden style={{ position: "absolute", top: 68, left: 46, right: 46, borderTop: done ? "5px solid var(--kc-mint)" : "5px dotted var(--kc-border-dashed)" }} />
      {stops.map((s, i) => {
        const state: StopState = s.state ?? (done ? "done" : i === 0 ? "first" : "upcoming");
        const circle: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: 68, height: 68, fontSize: 28, boxSizing: "border-box", background: "var(--kc-panel)", border: "3px solid var(--kc-border)", color: "var(--kc-ink)" };
        let look: React.CSSProperties = circle;
        let detailColor = "var(--kc-ink-faint)";
        if (state === "first" || state === "current") look = { ...circle, width: 76, height: 76, marginTop: -2, fontSize: 34, background: "var(--kc-indigo)", border: "none", color: "#ffffff", boxShadow: "0 5px 0 0 var(--kc-indigo-shadow)" };
        else if (state === "new") { look = { ...circle, border: "3px solid var(--kc-indigo)", color: "var(--kc-indigo)" }; detailColor = "var(--kc-indigo)"; }
        else if (state === "own") look = { ...circle, background: "var(--kc-base)", border: "3px dashed var(--kc-border-dashed)", color: "var(--kc-ink-faint)" };
        else if (state === "done") { look = { ...circle, background: "var(--kc-mint)", border: "none", color: "var(--kc-ink)" }; detailColor = "var(--kc-mint-ink)"; }
        else if (state === "best") { look = { ...circle, width: 76, height: 76, marginTop: -2, fontSize: 34, background: "var(--kc-sun)", border: "none", color: "var(--kc-ink)", boxShadow: "0 5px 0 0 var(--kc-sun-shadow)" }; detailColor = "var(--kc-sun-ink)"; }
        return (
          <div key={i} style={{ position: "relative", width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
            {state === "first" && (
              <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%) rotate(-6deg)", background: "var(--kc-sun)", color: "var(--kc-ink)", fontSize: 12, fontWeight: 900, letterSpacing: ".06em", padding: "3px 9px", borderRadius: 8, whiteSpace: "nowrap" }}>START HERE</span>
            )}
            {state === "best" && (
              <span style={{ position: "absolute", top: -14, right: 2, width: 30, height: 30, borderRadius: "50%", background: "var(--kc-panel)", border: "2px solid var(--kc-sun)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><Icon name="star" size={18} color="var(--kc-sun-ink)" /></span>
            )}
            <span style={look}><Icon name={s.icon} size={look.fontSize as number} /></span>
            <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 500, lineHeight: 1.1 }}>{s.name}</span>
            {s.detail && <span style={{ fontSize: 13, fontWeight: 800, color: detailColor, lineHeight: 1.2 }}>{s.detail}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** The header progress pills of a session: done mint 14px, current indigo 38px, upcoming hairline. */
export function MiniPath({ index, total = 7, style }: { index: number; total?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, ...style }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ display: "block", height: 14, borderRadius: 999, width: i === index ? 38 : 14, background: i < index ? "var(--kc-mint)" : i === index ? "var(--kc-indigo)" : "var(--kc-border)", transition: "width 160ms ease-out" }} />
      ))}
    </div>
  );
}

/** Rounded bar cells: done mint, current indigo with a press shadow, a missed bar lilac with an indigo border, upcoming white. */
export function BarPips({ count, current, missed = [], title, meta, style }: { count: number; current: number; missed?: number[]; title?: string; meta?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {(title || meta) && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          {title && <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>{title}</span>}
          {meta && <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{meta}</span>}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: count }, (_, i) => {
          const s: React.CSSProperties = i === current
            ? { background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 3px 0 0 var(--kc-indigo-shadow)" }
            : missed.includes(i) ? { background: "var(--kc-lilac)", color: "var(--kc-indigo-shadow)", border: "2px solid var(--kc-indigo)" }
            : i < current ? { background: "var(--kc-mint)", color: "var(--kc-ink)" }
            : { background: "var(--kc-panel)", color: "var(--kc-ink-faint)", border: "2px solid var(--kc-border)" };
          return <span key={i} style={{ flex: 1, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, boxSizing: "border-box", ...s }}>{i + 1}</span>;
        })}
      </div>
    </div>
  );
}

/**
 * A bottom-bar readout. `mint`: a big Fredoka number ("13/16") with a two-line label. `indigo`/`sun`: an icon
 * and two lines of text.
 */
export function StatChip({ tone = "mint", value, unit, label, icon, line1, line2, style }: { tone?: "mint" | "indigo" | "sun"; value?: React.ReactNode; unit?: React.ReactNode; label?: React.ReactNode; icon?: string; line1?: React.ReactNode; line2?: React.ReactNode; style?: React.CSSProperties }) {
  if (tone === "mint") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--kc-mint-wash)", borderRadius: 20, padding: "12px 18px", flex: "none", ...style }}>
        <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600, color: "var(--kc-mint-ink)", lineHeight: 1, whiteSpace: "nowrap" }}>{value}{unit && <span style={{ fontSize: 20 }}>{unit}</span>}</span>
        {label && <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-mint-ink)", lineHeight: 1.2 }}>{label}</span>}
      </div>
    );
  }
  const sun = tone === "sun";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: sun ? "var(--kc-sun)" : "var(--kc-indigo-wash)", borderRadius: 20, padding: "12px 18px", flex: "none", boxShadow: sun ? "var(--kc-shadow-press-sun)" : undefined, ...style }}>
      {icon && <Icon name={icon} size={28} color={sun ? "var(--kc-ink)" : "var(--kc-indigo)"} />}
      <span style={{ fontSize: 15, fontWeight: 800, color: sun ? "var(--kc-ink)" : "var(--kc-indigo-shadow)", lineHeight: 1.25 }}>
        {line1 ?? value}
        {(line2 ?? label) && <><br /><span style={{ fontWeight: 700, color: sun ? "#5c3e00" : "var(--kc-ink-muted)" }}>{line2 ?? label}</span></>}
      </span>
    </div>
  );
}
