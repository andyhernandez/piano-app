"use client";
import * as React from "react";
import { Rail, RailSection, SectionLabel, WeekStrip, MeterRow, SegmentBar, Tempo, keyLabel } from "@/components/ds";
import type { Assignment, Child, Session, Teacher } from "@/lib/types";
import type { SessionPlan } from "@/lib/store/app-store";
import { weekCells, weekProgress } from "@/lib/engine/record";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { dateKey, daysBetween } from "@/lib/utils/date";
import { weekdayName } from "./words";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function restDaysSentence(rest: number[]): string {
  const names = rest.slice().sort().map((i) => DAY_NAMES[i]).filter(Boolean);
  if (!names.length) return "No rest days planned. Bars show minutes played.";
  if (names.length === 1) return `Rest day ${names[0]}. Bars show minutes played.`;
  return `Rest days ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}. Bars show minutes played.`;
}

export function TodayRail({ child, plan, sessions, assignment, teacher, today, activeToday }: { child: Child; plan: SessionPlan; sessions: Session[]; assignment: Assignment | null; teacher: Teacher | null; today: string; activeToday: boolean }) {
  const week = weekProgress(child, sessions, today);
  const days = weekCells(child, sessions, today, activeToday);
  const profile = child.skillProfile;
  const profileAge = profile ? daysBetween(dateKey(new Date(profile.assessedAt)), today) : null;
  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  const weekIndex = Math.min(child.roadmapIndex, roadmap.length - 1);
  const pinnedBy = assignment?.scaleOverride ? (teacher?.name ?? "your teacher") : child.scaleOverride ? "the household" : null;
  const teacherName = (teacher?.name ?? "your teacher").toUpperCase();

  return (
    <Rail>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>THIS WEEK</SectionLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, color: "var(--kc-mint)" }}>{week.played}</span>
          <span style={{ fontSize: 15, color: "var(--kc-ink-dim)" }}>of {week.target} days</span>
        </div>
        <WeekStrip days={days} target={child.settings.sessionMinutes} />
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{restDaysSentence(child.settings.restDays)}</p>
      </div>
      {assignment?.note && (
        <RailSection label={`FROM ${teacherName} · ${weekdayName(assignment.updatedAt).toUpperCase()}`} style={{ gap: 10 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--kc-ink-muted)" }}>{assignment.note}</p>
        </RailSection>
      )}
      <RailSection label={profile ? `SKILL PROFILE · ${profileAge === 0 ? "TODAY" : `${profileAge} DAY${profileAge === 1 ? "" : "S"} AGO`}` : "SKILL PROFILE"} style={{ gap: 11 }}>
        {profile ? (
          <>
            <MeterRow label="Ear" value={profile.ear} tone={profile.ear < 50 ? "clay" : "mint"} labelWidth={58} />
            <MeterRow label="Reading" value={profile.eye} tone={profile.eye < 50 ? "clay" : "mint"} labelWidth={58} />
            <MeterRow label="Timing" value={profile.pulse} tone={profile.pulse < 50 ? "clay" : "mint"} labelWidth={58} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>Not taken yet. Three short checks, about four minutes; the plan is evenly weighted until then.</p>
        )}
      </RailSection>
      <RailSection label="CURRENT KEY" last style={{ gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {keyLabel(plan.scale.key, plan.scale.mode)}{" "}
          <span style={{ fontSize: 15, fontWeight: 400, color: "var(--kc-ink-dim)" }}>{pinnedBy ? `· pinned by ${pinnedBy}` : `· week ${weekIndex + 1}`}</span>
        </div>
        <SegmentBar total={roadmap.length} filled={weekIndex} current={weekIndex} />
        <p style={{ margin: 0, fontSize: 13, color: "var(--kc-ink-dim)", lineHeight: 1.4 }}>
          Move on when the scale is even at <Tempo bpm={80} /> and reading holds at level {Math.min(10, child.settings.readingLevel + 1)}.
        </p>
      </RailSection>
    </Rail>
  );
}
