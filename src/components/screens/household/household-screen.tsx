"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, Pill, Button, LogTable, Icon, Headline, Panel, SectionLabel } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { dateKey } from "@/lib/utils/date";
import { dayLabel, fmtClock, completedBlocks, weekProgress } from "@/lib/engine/record";
import { BLOCK_ORDER } from "@/lib/types";
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
    .slice(0, 5)
    .map(({ c, s }) => ({ cells: [dayLabel(s.date), c.name, fmtClock(s.durationSec), s.mode === "own" ? "own plan" : `${completedBlocks(s)} of ${BLOCK_ORDER.length}`] }));

  const n = children.length;
  const title = n === 1 ? "One player, one keyboard" : `${capitalize(words(n))} players, one keyboard`;
  const lede = (() => {
    if (n >= 2) {
      const [a, b] = children;
      const am = weekProgress(a, sessions.get(a.id) ?? [], today).minutes;
      const bm = weekProgress(b, sessions.get(b.id) ?? [], today).minutes;
      if (am > 0 && bm > 0) return `Separate records, separate targets, separate keys. Nothing here is a comparison — ${a.name}’s ${words(am)} minutes and ${b.name}’s ${words(bm)} aren’t the same measurement.`;
      return `Separate records, separate targets, separate keys. Nothing here is a comparison — ${a.name}’s ${a.settings.sessionMinutes} minutes and ${b.name}’s ${b.settings.sessionMinutes} aren’t the same measurement.`;
    }
    return "One record, one target, one key. Add someone and each gets their own; nothing here is ever a comparison.";
  })();

  const right = (
    <>
      {parent?.pin && !locked && <Pill tone="mint" icon="check">Code entered</Pill>}
      {parent?.pin && locked && <Pill icon="home">Household</Pill>}
      {n >= 2 && !locked && <Button variant="secondary" size="pill" icon="person_add" onClick={() => router.push("/onboarding")} style={{ height: 44 }}>Add someone</Button>}
      {parent?.pin && !locked && <Button variant="quiet" size="pill" onClick={() => setParentUnlocked(false)}>Lock again</Button>}
    </>
  );

  if (locked) {
    return (
      <Screen>
        <AppHeader active="" right={right} />
        <CodePrompt title="The grown-up bit sits behind a code" lede="Profiles, settings and the teacher link. Practising never asks for it." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader active="" right={right} />
      <div style={{ flex: 1, minHeight: 0, padding: "26px 32px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
        <Headline title={title} lede={lede} size={44} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {children.map((c) => (
            <ProfileCard key={c.id} child={c} sessions={sessions.get(c.id) ?? []} active={c.id === activeChildId} today={today} onOpen={() => void go(c.id, "/progress")} onSettings={() => void go(c.id, "/settings")} onActivate={() => void setActiveChild(c.id)} onRemove={() => void remove(c.id)} />
          ))}
          {n === 1 && (
            <button type="button" onClick={() => router.push("/onboarding")} style={{ border: "3px dashed var(--kc-border-dashed)", borderRadius: 22, padding: "24px 26px", background: "transparent", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8, cursor: "pointer", color: "inherit", fontFamily: "inherit", minHeight: 168 }}>
              <Icon name="person_add" size={36} color="var(--kc-ink-faint)" />
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, color: "var(--kc-ink-muted)" }}>Add someone</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", textAlign: "center", lineHeight: 1.4 }}>Takes about a minute</div>
            </button>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16 }}>
          <Panel style={{ padding: "18px 22px", gap: 4, minHeight: 0 }}>
            <SectionLabel size="title">Who played, when</SectionLabel>
            {rows.length ? <LogTable rows={rows} emphasize={1} /> : <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)" }}>Nothing yet. The first session will appear here.</p>}
          </Panel>
          <CodePanel />
        </div>
      </div>
    </Screen>
  );
}
