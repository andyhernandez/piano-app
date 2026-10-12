"use client";
import * as React from "react";
import { Icon } from "@/components/ds";

export interface MenuItem { label: string; onClick: () => void; disabled?: boolean; tone?: "clay" }

/** A more_vert button with a small white popover of actions beneath it. */
export function RowMenu({ items, label = "More", size = 30, icon = "more_vert" }: { items: MenuItem[]; label?: string; size?: number; icon?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button type="button" aria-label={label} title={label} onClick={() => setOpen((o) => !o)} style={{ width: size, height: size, borderRadius: 10, border: "none", background: "transparent", color: open ? "var(--kc-indigo)" : "var(--kc-ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer" }}>
        <Icon name={icon} size={22} />
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", top: size + 6, right: 0, minWidth: 176, zIndex: 20, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 16, padding: 6, boxShadow: "var(--kc-shadow-press)", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, border: "none", background: "transparent", color: it.tone === "clay" ? "var(--kc-indigo)" : "var(--kc-ink)", fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 500, cursor: it.disabled ? "default" : "pointer", opacity: it.disabled ? 0.4 : 1, whiteSpace: "nowrap" }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
