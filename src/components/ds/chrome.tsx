"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { SectionLabel } from "./section-label";
import { Button } from "./button";
import type { InputMode } from "@/lib/types";

/** The screen frame: the app fills the viewport; on a wide desktop it sits as a 1194×834 iPad frame on the canvas. */
export function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="kc-screen" style={{ width: "100%", minHeight: "100dvh", background: "var(--kc-base)", display: "flex", flexDirection: "column", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", ...style }}>
      {children}
    </div>
  );
}

const NAV = [
  { id: "today", label: "Today", href: "/" },
  { id: "progress", label: "Progress", href: "/progress" },
  { id: "library", label: "Library", href: "/library" },
];

/** 72px header: wordmark, Today / Progress / Library, then input status, settings and the profile initial. */
export function Header({ active, right, initial = "", onProfile }: { active?: "today" | "progress" | "library" | "settings" | ""; right?: React.ReactNode; initial?: string; onProfile?: () => void }) {
  const pathname = usePathname();
  const current = active ?? (pathname === "/" ? "today" : pathname.startsWith("/progress") ? "progress" : pathname.startsWith("/library") ? "library" : "");
  return (
    <div style={{ height: 72, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 28, padding: "0 34px" }}>
      <Link href="/" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--kc-ink)", border: "none" }}>KeyCadence</Link>
      <nav style={{ display: "flex", gap: 4, fontSize: 15 }}>
        {NAV.map((it) => (
          <Link key={it.id} href={it.href} style={{ padding: "9px 16px", borderRadius: "var(--kc-radius-control)", border: "none", background: current === it.id ? "var(--kc-raised)" : "transparent", color: current === it.id ? "var(--kc-ink)" : "var(--kc-ink-dim)", fontWeight: current === it.id ? 600 : 400 }}>
            {it.label}
          </Link>
        ))}
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        {right}
        <Link href="/settings" style={{ border: "none" }} aria-label="Settings">
          <IconButton icon="settings" shape="square" size={38} label="Settings" style={{ borderColor: current === "settings" ? "var(--kc-mint)" : undefined }} tabIndex={-1} />
        </Link>
        <button type="button" onClick={onProfile} aria-label="Switch profile" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--kc-raised)", border: "none", color: "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, cursor: onProfile ? "pointer" : "default", padding: 0 }}>
          {initial}
        </button>
      </div>
    </div>
  );
}

/** What the app is listening to. Mint when a keyboard is talking to us. */
export function InputStatus({ mode, device, lost }: { mode: InputMode; device?: string; lost?: boolean }) {
  const label = lost ? "No input" : mode === "midi" ? device || "MIDI keyboard" : mode === "mic" ? "Microphone" : "Timer only";
  const icon = mode === "midi" ? "piano" : mode === "mic" ? "mic" : "timer";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: lost ? "var(--kc-clay)" : mode === "midi" ? "var(--kc-mint)" : "var(--kc-ink-dim)", whiteSpace: "nowrap" }}>
      <Icon name={lost ? "error" : icon} size={20} />
      {label}
    </span>
  );
}

/** The 56px chrome of a block or a check: "03 / 06 · Sight reading · meta … timer · Pause". */
export function BlockHeader({ index, total, title, meta, right, label }: { index?: number; total?: number; title: string; meta?: React.ReactNode; right?: React.ReactNode; label?: string }) {
  return (
    <div style={{ height: 56, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 18, padding: "0 30px" }}>
      {label ? <SectionLabel size="meta">{label}</SectionLabel> : index != null && <SectionLabel size="meta">{String(index).padStart(2, "0")} / {String(total ?? 6).padStart(2, "0")}</SectionLabel>}
      <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap" }}>{title}</span>
      {meta && <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>{right}</div>
    </div>
  );
}

/** The 2px progress strip under a block header. Mint fills; the `dim` state (input lost) shows raised. */
export function ProgressStrip({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <div style={{ height: 2, flex: "none", background: "var(--kc-raised)" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height: "100%", background: dim ? "var(--kc-raised)" : "var(--kc-mint)" }} />
    </div>
  );
}

/** A mono figure with a meta label above, used in bottom bars: "NOTES RIGHT / 14 / 16". */
export function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "clay" | "mint" | "amber" }) {
  const color = tone === "clay" ? "var(--kc-clay)" : tone === "mint" ? "var(--kc-mint)" : tone === "amber" ? "var(--kc-amber)" : "var(--kc-ink)";
  return (
    <div>
      <SectionLabel size="meta">{label}</SectionLabel>
      <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 20, marginTop: 4, color, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

/** The bottom bar of a block: left content, metrics, then the actions on the right. */
export function BottomBar({ children, actions }: { children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "18px 30px 22px", display: "flex", alignItems: "center", gap: 28, flex: "none", flexWrap: "wrap" }}>
      {children}
      <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>{actions}</div>
    </div>
  );
}

/** A mono clock reading mm:ss. */
export function Clock({ seconds, dim }: { seconds: number; dim?: boolean }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 20, color: dim ? "var(--kc-ink-dim)" : "var(--kc-ink)", fontVariantNumeric: "tabular-nums" }}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

/** The right rail: 336–340px, panel fill, context you consult. Stacks below the main column on narrow screens. */
export function Rail({ children, width = 336, style }: { children: React.ReactNode; width?: number; style?: React.CSSProperties }) {
  return (
    <aside className="kc-rail" style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 26, minHeight: 0, width, flex: "none", overflowY: "auto", ...style }}>
      {children}
    </aside>
  );
}

/** A rail section separated from the previous by a rule. */
export function RailSection({ label, children, last, style }: { label?: string; children: React.ReactNode; last?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12, marginTop: last ? "auto" : undefined, ...style }}>
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </div>
  );
}

/** Main column + rail grid. */
export function MainWithRail({ children, rail, railWidth = 336 }: { children: React.ReactNode; rail: React.ReactNode; railWidth?: number }) {
  return (
    <div className="kc-main-rail" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${railWidth}px` }}>
      <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
      {rail}
    </div>
  );
}

/** Screen headline + lede. */
export function Headline({ title, lede, size = 42, style }: { title: React.ReactNode; lede?: React.ReactNode; size?: number; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <h1 style={{ margin: 0, fontSize: size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>{title}</h1>
      {lede && <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>{lede}</p>}
    </div>
  );
}

/** A large selectable tile: the "5 days" / "20 minutes" choosers. */
export function ChoiceTile({ value, unit, selected, onClick, mono = true, height = 76 }: { value: React.ReactNode; unit?: string; selected?: boolean; onClick?: () => void; mono?: boolean; height?: number }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, height, borderRadius: "var(--kc-radius-control)", background: selected ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: selected ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-border)", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", color: selected ? "var(--kc-mint)" : "var(--kc-ink)", padding: 0 }}>
      <span style={{ fontFamily: mono ? "var(--kc-font-mono)" : "var(--kc-font-sans)", fontSize: 26 }}>{value}</span>
      {unit && <span style={{ fontSize: 12, color: selected ? "var(--kc-mint)" : "var(--kc-ink-faint)" }}>{unit}</span>}
    </button>
  );
}

/** A choice made of control buttons, the selected one raised with a mint border (from SettingsScreen). */
export function Choice<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <Button key={o} size="control" variant={value === o ? "quiet" : "secondary"} onClick={() => onChange(o)} style={value === o ? { borderColor: "var(--kc-mint)", color: "var(--kc-ink)", boxShadow: "inset 0 0 0 1px var(--kc-mint)" } : undefined}>
          {labels?.[o] ?? o}
        </Button>
      ))}
    </div>
  );
}

/** A settings row: title, detail, control on the right. */
export function Row({ title, detail, children, last }: { title: React.ReactNode; detail?: React.ReactNode; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", borderBottom: last ? "none" : "1px solid var(--kc-border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        {detail && <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", marginTop: 3, lineHeight: 1.4 }}>{detail}</div>}
      </div>
      {children}
    </div>
  );
}

/** The profile initial avatar. Mint for the active player. */
export function Avatar({ initial, active, size = 44 }: { initial: string; active?: boolean; size?: number }) {
  return <span style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: active ? "var(--kc-mint)" : "var(--kc-raised)", color: active ? "var(--kc-mint-ink)" : "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 600 }}>{initial}</span>;
}

/** A check/remove list item as in the design's "what you see" lists. */
export function CheckItem({ on = true, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 15, color: on ? "var(--kc-ink-muted)" : "var(--kc-ink-dim)", lineHeight: 1.45 }}>
      <Icon name={on ? "check" : "remove"} size={20} color={on ? "var(--kc-mint)" : "var(--kc-ink-faint)"} />
      <span>{children}</span>
    </div>
  );
}
