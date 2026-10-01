"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { Pill } from "./pill";
import { MiniPath } from "./stop-path";
import type { InputMode } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";

/** The screen: cream paper filling the viewport. */
export function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="kc-screen" style={{ width: "100%", minHeight: "100dvh", background: "var(--kc-base)", display: "flex", flexDirection: "column", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", ...style }}>
      {children}
    </div>
  );
}

/** The indigo piano tile and the Fredoka wordmark. */
export function Logo({ href = "/" }: { href?: string | null }) {
  const inner = (
    <span style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--kc-ink)" }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--kc-indigo)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="piano" size={24} /></span>
      <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 25, fontWeight: 600 }}>{APP_NAME}</span>
    </span>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

const NAV = [
  { id: "today", label: "Today", href: "/", icon: "today" },
  { id: "progress", label: "Progress", href: "/progress", icon: "trending_up" },
  { id: "library", label: "Library", href: "/library", icon: "library_music" },
];

/** The 78px white header: logo, Today / Progress / Library pills, then the input chip, settings and the avatar. */
export function Header({ active, right, initial = "", onProfile, avatarTone = "sun" }: { active?: "today" | "progress" | "library" | "settings" | ""; right?: React.ReactNode; initial?: string; onProfile?: () => void; avatarTone?: "sun" | "plain" }) {
  const pathname = usePathname();
  const current = active ?? (pathname === "/" ? "today" : pathname.startsWith("/progress") ? "progress" : pathname.startsWith("/library") ? "library" : "");
  return (
    <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 22, padding: "0 30px" }}>
      <Logo />
      <nav style={{ display: "flex", gap: 6 }}>
        {NAV.map((it) => {
          const on = current === it.id;
          return (
            <Link key={it.id} href={it.href} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 999, background: on ? "var(--kc-indigo)" : "transparent", color: on ? "#ffffff" : "var(--kc-ink-muted)", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>
              <Icon name={it.icon} size={22} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        {right}
        <Link href="/settings" style={{ textDecoration: "none" }} aria-label="Settings">
          <IconButton icon="settings" shape="square" size={44} label="Settings" style={{ borderColor: current === "settings" ? "var(--kc-indigo)" : undefined, color: current === "settings" ? "var(--kc-indigo)" : undefined }} tabIndex={-1} />
        </Link>
        <button type="button" onClick={onProfile} aria-label="Switch profile" style={{ padding: 0, border: "none", background: "transparent", cursor: onProfile ? "pointer" : "default" }}>
          <Avatar initial={initial} active={avatarTone === "sun"} />
        </button>
      </div>
    </div>
  );
}

/** What the app is listening to, as a chip. Mint when a keyboard is talking to us. */
export function InputStatus({ mode, device, lost }: { mode: InputMode; device?: string; lost?: boolean }) {
  const label = lost ? "Not responding" : mode === "midi" ? "Keyboard ready" : mode === "mic" ? "Listening" : "Timer only";
  const icon = mode === "midi" ? "piano" : mode === "mic" ? "mic" : "timer";
  return <Pill tone={lost ? "neutral" : mode === "midi" ? "mint" : mode === "mic" ? "indigo" : "neutral"} icon={lost ? "piano_off" : icon}>{label}{mode === "midi" && device && !lost ? "" : ""}</Pill>;
}

/**
 * The 78px practice header: a round close button, the MiniPath, the stop's title and meta, then a timer chip
 * and a round indigo pause button.
 */
export function BlockHeader({ index, total = 7, title, meta, right, timer, onClose, onPause, paused, label }: { index?: number; total?: number; title: string; meta?: React.ReactNode; right?: React.ReactNode; timer?: React.ReactNode; onClose?: () => void; onPause?: () => void; paused?: boolean; label?: string }) {
  return (
    <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 18, padding: "0 30px" }}>
      {onClose && <IconButton icon="close" label="Leave the session" onClick={onClose} />}
      {label ? <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{label}</span> : index != null && <MiniPath index={index - 1} total={total} />}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap" }}>{title}</span>
        {meta && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {right}
        {timer && <TimerChip>{timer}</TimerChip>}
        {onPause && <IconButton icon={paused ? "play_arrow" : "pause"} variant="primary" label={paused ? "Resume" : "Pause"} onClick={onPause} />}
      </div>
    </div>
  );
}

/** The indigo-wash timer chip in a practice header: "1:12 left". */
export function TimerChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 18px", borderRadius: 999, background: "var(--kc-indigo-wash)", color: "var(--kc-indigo)", fontFamily: "var(--kc-font-display)", fontSize: 23, fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      <Icon name="timer" size={22} />
      {children}
    </span>
  );
}

/** The 2px progress strip under a header. Mint fills; the `dim` state (input lost) shows the hairline only. */
export function ProgressStrip({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <div style={{ height: 4, flex: "none", background: "var(--kc-hairline)" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height: "100%", background: dim ? "var(--kc-hairline)" : "var(--kc-mint)" }} />
    </div>
  );
}

/** A figure with a label above, for bars that have not moved to StatChip yet. Fredoka 24 over Nunito 14/800. */
export function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "clay" | "mint" | "amber" | "indigo" | "sun" }) {
  const color = tone === "mint" ? "var(--kc-mint-ink)" : tone === "amber" || tone === "sun" ? "var(--kc-sun-ink)" : tone === "indigo" || tone === "clay" ? "var(--kc-indigo)" : "var(--kc-ink)";
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)", lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600, marginTop: 2, color, whiteSpace: "nowrap", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

/** The white bottom bar of a block: stat chips on the left, the actions on the right. */
export function BottomBar({ children, actions, style }: { children?: React.ReactNode; actions?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderTop: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", padding: "18px 32px", display: "flex", alignItems: "center", gap: 14, flex: "none", ...style }}>
      {children}
      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>{actions}</div>
    </div>
  );
}

/** A clock reading m:ss in Fredoka. */
export function Clock({ seconds, dim, size = 24 }: { seconds: number; dim?: boolean; size?: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return <span style={{ fontFamily: "var(--kc-font-display)", fontSize: size, fontWeight: 600, color: dim ? "var(--kc-ink-faint)" : "var(--kc-ink)", fontVariantNumeric: "tabular-nums" }}>{m}:{String(s).padStart(2, "0")}</span>;
}

/** The right rail: 340px, white, a 2px hairline on the left, context you consult. */
export function Rail({ children, width = 340, style }: { children: React.ReactNode; width?: number; style?: React.CSSProperties }) {
  return (
    <aside className="kc-rail" style={{ borderLeft: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", padding: "28px 26px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, width, flex: "none", overflowY: "auto", ...style }}>
      {children}
    </aside>
  );
}

/** A rail block with a Fredoka title and an optional right-hand count. */
export function RailSection({ label, right, children, last, style }: { label?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; last?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: last ? "auto" : undefined, ...style }}>
      {(label || right) && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          {label && <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>{label}</div>}
          {right && <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{right}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Main column + rail grid. */
export function MainWithRail({ children, rail, railWidth = 340 }: { children: React.ReactNode; rail: React.ReactNode; railWidth?: number }) {
  return (
    <div className="kc-main-rail" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${railWidth}px` }}>
      <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
      {rail}
    </div>
  );
}

/** Kicker, Fredoka headline and Nunito lede. */
export function Headline({ kicker, title, lede, size = 46, style }: { kicker?: React.ReactNode; title: React.ReactNode; lede?: React.ReactNode; size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {kicker && <div style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{kicker}</div>}
      <h1 style={{ margin: 0, fontFamily: "var(--kc-font-display)", fontSize: size, fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.01em", maxWidth: 700, textWrap: "pretty" }}>{title}</h1>
      {lede && <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.45, color: "var(--kc-ink-muted)", maxWidth: 620, textWrap: "pretty" }}>{lede}</p>}
    </div>
  );
}

/** A chunky selectable tile: "5 days" / "20 minutes". Indigo with a press shadow when chosen. */
export function ChoiceTile({ value, unit, selected, onClick, height = 96 }: { value: React.ReactNode; unit?: string; selected?: boolean; onClick?: () => void; mono?: boolean; height?: number }) {
  return (
    <button type="button" onClick={onClick} className="kc-press" style={{ flex: 1, height, borderRadius: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", padding: 0, ...(selected ? { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: "0 5px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", color: "var(--kc-ink)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" }) }}>
      <span style={{ fontFamily: "var(--kc-font-display)", fontSize: height >= 90 ? 36 : 26, fontWeight: 600, lineHeight: 1 }}>{value}</span>
      {unit && <span style={{ fontSize: 14, fontWeight: 800, color: selected ? "#ffffff" : "var(--kc-ink-faint)" }}>{unit}</span>}
    </button>
  );
}

/** A segmented choice on a cream track; the chosen option is indigo. */
export function Choice<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, background: "var(--kc-cream)", borderRadius: 14, padding: 4, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 38, padding: "0 14px", borderRadius: 11, border: "none", display: "inline-flex", alignItems: "center", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, cursor: "pointer", background: on ? "var(--kc-indigo)" : "transparent", color: on ? "#ffffff" : "var(--kc-ink-muted)" }}>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** A chunky option tab row (the "Just starting · Under a year" choices): cream tiles, indigo when chosen. */
export function OptionTabs<T extends string>({ options, value, onChange, labels, height = 46 }: { options: T[]; value: T | null; onChange: (v: T) => void; labels?: Partial<Record<T, string>>; height?: number }) {
  return (
    <div style={{ flex: 1, display: "flex", gap: 8 }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button key={o} type="button" onClick={() => onChange(o)} className="kc-press" style={{ flex: 1, height, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", boxSizing: "border-box", ...(on ? { background: "var(--kc-indigo)", color: "#ffffff", border: "none", boxShadow: "0 3px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-base)", border: "2px solid var(--kc-border)", color: "var(--kc-ink)" }) }}>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** A settings row: Fredoka title, Nunito detail, control on the right, a 2px hairline beneath. */
export function Row({ title, detail, children, last }: { title: React.ReactNode; detail?: React.ReactNode; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderBottom: last ? "none" : "2px solid var(--kc-hairline)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>{title}</div>
        {detail && <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.4, marginTop: 2 }}>{detail}</div>}
      </div>
      {children}
    </div>
  );
}

/** A −/value/+ stepper with 40px square buttons. */
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => React.ReactNode }) {
  const btn: React.CSSProperties = { width: 40, height: 40, borderRadius: 12, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", cursor: "pointer", padding: 0, color: "var(--kc-ink)" };
  return (
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" aria-label="Less" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} style={{ ...btn, opacity: value <= min ? 0.4 : 1 }}><Icon name="remove" size={22} /></button>
      <span style={{ minWidth: 62, textAlign: "center", fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600 }}>{format ? format(value) : value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} style={{ ...btn, opacity: value >= max ? 0.4 : 1 }}><Icon name="add" size={22} /></button>
    </div>
  );
}

/** The profile initial in a circle. Sunshine for the active player, plain cream otherwise. */
export function Avatar({ initial, active, size = 44 }: { initial: string; active?: boolean; size?: number }) {
  return <span style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: active ? "var(--kc-sun)" : "var(--kc-plain-chip)", color: "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: Math.round(size * 0.45), fontWeight: 600 }}>{initial}</span>;
}

/** A check / dash list item: "what gets recorded". */
export function CheckItem({ on = true, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: on ? "var(--kc-ink)" : "var(--kc-ink-faint)" }}>
      <Icon name={on ? "check_circle" : "remove"} size={22} color={on ? "var(--kc-mint-ink)" : "var(--kc-ink-faint)"} />
      <span>{children}</span>
    </div>
  );
}

/** A tilted sunshine sticky: the teacher's note. */
export function Sticky({ from, children, style }: { from?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--kc-sun-wash)", borderRadius: "6px 6px 20px 6px", padding: "18px 20px", transform: "rotate(-1.5deg)", boxShadow: "0 3px 0 0 var(--kc-sun-sticky-shadow)", display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {from && <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, color: "var(--kc-sun-ink)" }}>{from}</div>}
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

/** A small Nunito 14/700 muted line. */
export function Small({ children, color = "var(--kc-ink-muted)", style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color, ...style }}>{children}</div>;
}

/** The footnote on the right of an action row ("Four steps, then you're playing."). */
export function ActionNote({ children }: { children: React.ReactNode }) {
  return <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", maxWidth: 240, textAlign: "right" }}>{children}</span>;
}

