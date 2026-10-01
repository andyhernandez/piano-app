"use client";
import * as React from "react";
import { Avatar, Pill, WeekKeys, Button, Panel, keyLabel } from "@/components/ds";
import type { Child, Session } from "@/lib/types";
import { weekCells, weekProgress, weeksAtTarget, fmtHours, dayLabel } from "@/lib/engine/record";
import { currentScale } from "@/lib/engine/progression";
import { RowMenu } from "../today/row-menu";

/** One player: avatar, name and plan, the week as 64px piano keys, two stats, then the actions. */
export function ProfileCard({ child, sessions, active, today, onOpen, onSettings, onActivate, onRemove }: { child: Child; sessions: Session[]; active: boolean; today: string; onOpen: () => void; onSettings: () => void; onActivate: () => void; onRemove: () => void }) {
  const [confirm, setConfirm] = React.useState(false);
  const s = child.settings;
  const week = weekProgress(child, sessions, today);
  const last = sessions[0];
  const playedToday = sessions.some((x) => x.date === today);
  const scale = currentScale(child);
  const streak = weeksAtTarget(child, today);
  const days = weekCells(child, sessions, today).map((d) => ({ letter: d.letter, minutes: d.state === "played" || d.state === "playing" ? d.minutes : undefined, today: d.state === "today" || d.state === "playing", rest: d.state === "rest" }));

  const stat = (label: string, value: React.ReactNode) => (
    <div style={{ flex: 1, background: "var(--kc-base)", borderRadius: 16, padding: "10px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );

  return (
    <Panel style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initial={child.name.slice(0, 1).toUpperCase()} active={active} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{child.name}</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.mode === "guided" ? "Guided" : "Own plan"} · {s.practiceDaysPerWeek} days × {s.sessionMinutes} min · {keyLabel(scale.key, scale.mode)}
          </div>
        </div>
        {playedToday ? <Pill tone="mint">Played today</Pill> : last ? <Pill>Last played {dayLabel(last.date).slice(0, 3)}</Pill> : <Pill>Not yet</Pill>}
      </div>
      <WeekKeys days={days} target={s.sessionMinutes} height={64} />
      <div style={{ display: "flex", gap: 12 }}>
        {stat("This week", fmtHours(week.minutes))}
        {stat("Weeks at target", streak)}
      </div>
      {confirm ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.4, minWidth: 200 }}>Remove {child.name}’s profile, log and recordings from this device? It cannot be undone.</span>
          <Button variant="secondary" size="pill" onClick={onRemove}>Remove</Button>
          <Button variant="quiet" size="pill" onClick={() => setConfirm(false)}>Keep</Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="secondary" size="pill" onClick={onOpen}>Open the record</Button>
          <Button variant="quiet" size="pill" onClick={onSettings}>Settings</Button>
          <div style={{ marginLeft: "auto" }}>
            <RowMenu label={`More for ${child.name}`} size={46} items={[
              { label: active ? "Playing now" : `Switch to ${child.name}`, onClick: onActivate, disabled: active },
              { label: "Remove profile…", onClick: () => setConfirm(true), tone: "clay" },
            ]} />
          </div>
        </div>
      )}
    </Panel>
  );
}
