"use client";
import * as React from "react";
import { IconButton } from "@/components/ds";

export interface MenuItem { label: string; onClick: () => void; disabled?: boolean; tone?: "clay" }

/** A more_vert button with a small popover of actions beneath it. */
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
      <IconButton icon={icon} shape="square" size={size} label={label} onClick={() => setOpen((o) => !o)} style={open ? { borderColor: "var(--kc-mint)", color: "var(--kc-ink)" } : undefined} />
      {open && (
        <div role="menu" style={{ position: "absolute", top: size + 6, right: 0, minWidth: 168, zIndex: 20, background: "var(--kc-panel)", border: "1px solid var(--kc-border-active)", borderRadius: "var(--kc-radius-control)", padding: 6, boxShadow: "var(--kc-shadow-screen)", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 7, border: "none", background: "transparent", color: it.tone === "clay" ? "var(--kc-clay)" : "var(--kc-ink)", fontSize: 14, cursor: it.disabled ? "default" : "pointer", opacity: it.disabled ? 0.4 : 1, whiteSpace: "nowrap" }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
