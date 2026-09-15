"use client";
import * as React from "react";
import { Avatar, Pill, WeekStrip, StatTile, Button, keyLabel } from "@/components/ds";
import type { Child, Session } from "@/lib/types";
import { weekCells, weekProgress, weeksAtTarget, fmtHours, dayLabel } from "@/lib/engine/record";
import { currentScale } from "@/lib/engine/progression";
import { RowMenu } from "../today/row-menu";

export function ProfileCard({ child, sessions, active, today, onOpen, onSettings, onActivate, onRemove }: { child: Child; sessions: Session[]; active: boolean; today: string; onOpen: () => void; onSettings: () => void; onActivate: () => void; onRemove: () => void }) {
  const [confirm, setConfirm] = React.useState(false);
  const s = child.settings;
  const week = weekProgress(child, sessions, today);
  const last = sessions[0];
  const playedToday = sessions.some((x) => x.date === today);
  const scale = currentScale(child);
  const streak = weeksAtTarget(child, today);

  return (
    <div style={{ background: "var(--kc-panel)", border: active ? "1px solid var(--kc-mint-edge)" : "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initial={child.name.slice(0, 1).toUpperCase()} active={active} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{child.name}</div>
          <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.mode === "guided" ? "Guided" : "Own plan"} · {s.practiceDaysPerWeek} days × {s.sessionMinutes} minutes · {keyLabel(scale.key, scale.mode)}
          </div>
        </div>
        {playedToday ? <Pill tone="mint">PLAYED TODAY</Pill> : last ? <Pill>LAST PLAYED {dayLabel(last.date).slice(0, 3)}</Pill> : <Pill>NOT YET</Pill>}
      </div>
      <WeekStrip days={weekCells(child, sessions, today)} target={s.sessionMinutes} height={44} />
      <div style={{ display: "flex", gap: 14 }}>
        <StatTile label={`THIS WEEK · OF ${fmtHours(week.targetMinutes)}`} value={fmtHours(week.minutes)} style={{ flex: 1 }} />
        <StatTile label="WEEKS AT TARGET" value={streak} unit="in a row" tone={streak > 0 ? "mint" : "default"} style={{ flex: 1 }} />
      </div>
      {confirm ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.4 }}>Remove {child.name}&apos;s profile, log and recordings from this device? It cannot be undone.</span>
          <Button variant="secondary" size="control" onClick={onRemove} style={{ color: "var(--kc-clay)", borderColor: "var(--kc-clay)" }}>Remove</Button>
          <Button variant="quiet" size="control" onClick={() => setConfirm(false)}>Keep</Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="secondary" size="control" onClick={onOpen}>Open the record</Button>
          <Button variant="quiet" size="control" onClick={onSettings}>Settings</Button>
          <div style={{ marginLeft: "auto" }}>
            <RowMenu label={`More for ${child.name}`} size={40} items={[
              { label: active ? "Playing now" : `Switch to ${child.name}`, onClick: onActivate, disabled: active },
              { label: "Remove profile…", onClick: () => setConfirm(true), tone: "clay" },
            ]} />
          </div>
        </div>
      )}
    </div>
  );
}
