"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, SectionLabel, Pill, Button, LogTable, Icon } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { dateKey } from "@/lib/utils/date";
import { dayLabel, fmtClock, completedBlocks, weekProgress } from "@/lib/engine/record";
import { AppHeader } from "../today/app-header";
import { CodePrompt, useCodeLocked } from "./code-gate";
import { ProfileCard } from "./profile-card";
import { CodePanel } from "./code-panel";
import { useHouseholdSessions } from "./household-data";
import { words, capitalize } from "../today/words";

export function HouseholdScreen() {
  const router = useRouter();
  const parent = useAppStore((s) => s.parent);
  const children = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const updateParent = useAppStore((s) => s.updateParent);
  const refreshChildren = useAppStore((s) => s.refreshChildren);
  const setParentUnlocked = useAppStore((s) => s.setParentUnlocked);
  const locked = useCodeLocked("household");
  const [today] = React.useState(() => dateKey());
  const [version, setVersion] = React.useState(0);
  const sessions = useHouseholdSessions(children, version);

  React.useEffect(() => {
    if (!parent || children.length === 0) router.replace("/onboarding");
  }, [parent, children.length, router]);

  const go = async (id: string, href: string) => { if (id !== activeChildId) await setActiveChild(id); router.push(href); };
  const remove = async (id: string) => {
    await repo.deleteChild(id);
    if (parent) await updateParent({ childIds: parent.childIds.filter((x) => x !== id) });
    await refreshChildren();
    const remaining = useAppStore.getState().children;
    if (activeChildId === id) await setActiveChild(remaining[0]?.id ?? null);
    setVersion((v) => v + 1);
    if (!remaining.length) router.replace("/onboarding");
  };

  const rows = children
    .flatMap((c) => (sessions.get(c.id) ?? []).map((s) => ({ c, s })))
    .sort((a, b) => b.s.startedAt.localeCompare(a.s.startedAt))
    .slice(0, 6)
    .map(({ c, s }) => ({ cells: [dayLabel(s.date), c.name.toUpperCase(), fmtClock(s.durationSec), s.mode === "own" ? "OWN PLAN" : `${completedBlocks(s)} / 6 BLOCKS`] }));

  const n = children.length;
  const title = n === 1 ? "One player, one keyboard" : `${capitalize(words(n))} players, one keyboard`;
  const lede = (() => {
    if (n >= 2) {
      const [a, b] = children;
      const am = weekProgress(a, sessions.get(a.id) ?? [], today).minutes;
      const bm = weekProgress(b, sessions.get(b.id) ?? [], today).minutes;
      if (am > 0 && bm > 0) return `Separate records, separate targets, separate keys. Nothing here is a comparison — ${a.name}'s ${words(am)} minutes and ${b.name}'s ${words(bm)} are not the same measurement.`;
      return `Separate records, separate targets, separate keys. Nothing here is a comparison — ${a.name}'s ${a.settings.sessionMinutes} minutes and ${b.name}'s ${b.settings.sessionMinutes} are not the same measurement.`;
    }
    return "One record, one target, one key. Add someone and each gets their own; nothing here is ever a comparison.";
  })();

  const right = (
    <>
      <SectionLabel>HOUSEHOLD</SectionLabel>
      {parent?.pin && !locked && <Pill icon="check">CODE ENTERED</Pill>}
      {parent?.pin && !locked && <Button variant="quiet" size="control" onClick={() => setParentUnlocked(false)}>Lock again</Button>}
      {n >= 2 && !locked && <Button variant="secondary" size="control" icon="person_add" onClick={() => router.push("/onboarding")}>Add someone</Button>}
    </>
  );

  if (locked) {
    return (
      <Screen>
        <AppHeader active="" right={right} />
        <CodePrompt title="The household sits behind the code" lede="Profiles, what the code protects and the teacher link. Practising never asks for it." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader active="" right={right} />
      <div style={{ flex: 1, minHeight: 0, padding: "32px 34px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{title}</h1>
          <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>{lede}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {children.map((c) => (
            <ProfileCard key={c.id} child={c} sessions={sessions.get(c.id) ?? []} active={c.id === activeChildId} today={today} onOpen={() => void go(c.id, "/progress")} onSettings={() => void go(c.id, "/settings")} onActivate={() => void setActiveChild(c.id)} onRemove={() => void remove(c.id)} />
          ))}
          {n === 1 && (
            <button type="button" onClick={() => router.push("/onboarding")} style={{ border: "1px dashed var(--kc-border-dashed)", borderRadius: "var(--kc-radius-panel)", padding: "24px 26px", background: "transparent", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, cursor: "pointer", color: "inherit", fontFamily: "inherit" }}>
              <Icon name="person_add" size={34} color="var(--kc-ink-faint)" />
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--kc-ink-muted)" }}>Add someone</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-faint)", textAlign: "center", lineHeight: 1.4 }}>Takes about a minute</div>
            </button>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 11, minHeight: 0 }}>
            <SectionLabel>WHO PLAYED, WHEN</SectionLabel>
            {rows.length ? <LogTable rows={rows} emphasize={2} /> : <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-dim)" }}>Nothing yet. The first session will appear here.</p>}
          </div>
          <CodePanel />
        </div>
      </div>
    </Screen>
  );
}
