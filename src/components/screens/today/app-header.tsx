"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Header, Avatar, Icon } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";

/**
 * The 78px app header with the active profile's initial on the right. Tapping the initial opens a small
 * popover: switch profile, open the household, add someone.
 */
export function AppHeader({ active, right }: { active?: "today" | "progress" | "library" | "settings" | ""; right?: React.ReactNode }) {
  const child = useActiveChild();
  const [open, setOpen] = React.useState(false);
  const initial = child ? child.name.slice(0, 1).toUpperCase() : "";
  return (
    <div style={{ position: "relative", flex: "none" }}>
      <Header active={active} right={right} initial={initial} onProfile={() => setOpen((o) => !o)} />
      {open && <ProfilePopover onClose={() => setOpen(false)} />}
    </div>
  );
}

function ProfilePopover({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const children = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // Defer so the opening tap does not close it immediately.
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const go = (href: string) => { onClose(); router.push(href); };
  const item: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 14, background: "transparent", border: "none", color: "var(--kc-ink)", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left", fontFamily: "inherit" };

  return (
    <div ref={ref} role="menu" style={{ position: "absolute", top: 68, right: 30, width: 272, zIndex: 20, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, padding: 8, boxShadow: "var(--kc-shadow-press)", display: "flex", flexDirection: "column", gap: 2 }}>
      {children.map((c) => {
        const active = c.id === activeChildId;
        return (
          <button key={c.id} type="button" role="menuitem" style={{ ...item, background: active ? "var(--kc-indigo-wash)" : "transparent" }} onClick={() => { if (!active) void setActiveChild(c.id); onClose(); }}>
            <Avatar initial={c.name.slice(0, 1).toUpperCase()} active={active} size={32} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: active ? 600 : 500 }}>{c.name}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: active ? "var(--kc-indigo)" : "var(--kc-ink-faint)" }}>{active ? "Playing" : "Switch"}</span>
          </button>
        );
      })}
      <div style={{ height: 2, background: "var(--kc-hairline)", margin: "6px 4px" }} />
      <button type="button" role="menuitem" style={item} onClick={() => go("/household")}>
        <Icon name="group" size={22} color="var(--kc-ink-muted)" />
        <span style={{ flex: 1 }}>Household</span>
      </button>
      <button type="button" role="menuitem" style={item} onClick={() => go("/onboarding")}>
        <Icon name="person_add" size={22} color="var(--kc-ink-muted)" />
        <span style={{ flex: 1 }}>Add someone</span>
      </button>
    </div>
  );
}
