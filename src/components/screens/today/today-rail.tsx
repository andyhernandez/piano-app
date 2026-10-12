"use client";
import * as React from "react";
import { Rail, RailSection, WeekKeys, Small, Sticky, Panel, keyLabel } from "@/components/ds";
import type { Assignment, Child, Session, Teacher } from "@/lib/types";
import type { SessionPlan } from "@/lib/store/app-store";
import { weekCells, weekProgress, weeksAtTarget, fastestClean } from "@/lib/engine/record";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { prettyPc } from "@/lib/music/notes";
import { keySignatureWords } from "./today-copy";
import { words, capitalize } from "./words";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** "Wednesday and Sunday are rest days. Two more keys light up the octave." */
function weekLine(child: Child, played: number, target: number): string {
  const rest = child.settings.restDays.slice().sort().map((i) => DAY_NAMES[i]).filter(Boolean);
  const restText = !rest.length ? "" : rest.length === 1 ? `${rest[0]} is a rest day. ` : `${rest.slice(0, -1).join(", ")} and ${rest[rest.length - 1]} are rest days. `;
  const left = target - played;
  const keys = left <= 0 ? "The whole octave's lit this week." : left === 1 ? "One more key makes the week." : `${capitalize(words(left))} more keys light up the octave.`;
  return restText + keys;
}

export function TodayRail({ child, plan, sessions, assignment, teacher, today, activeToday, variant = "guided" }: { child: Child; plan: SessionPlan; sessions: Session[]; assignment: Assignment | null; teacher: Teacher | null; today: string; activeToday: boolean; variant?: "guided" | "own" }) {
  const week = weekProgress(child, sessions, today);
  const cells = weekCells(child, sessions, today, activeToday);
  const days = cells.map((d) => ({ letter: d.letter, minutes: d.state === "played" || d.state === "playing" ? d.minutes : undefined, today: d.state === "today" || d.state === "playing", rest: d.state === "rest" }));
  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  const weekIndex = Math.min(child.roadmapIndex, roadmap.length - 1);
  const pinnedBy = assignment?.scaleOverride ? (teacher?.name ?? "your teacher") : child.scaleOverride ? "the household" : null;
  const atTarget = weeksAtTarget(child, today);
  const keyName = keyLabel(plan.scale.key, plan.scale.mode);

  const last = sessions.find((s) => s.endedAt !== null);
  const lastScales = last?.blocks.find((b) => b.type === "scales");
  const lastRhythm = last?.blocks.find((b) => b.type === "rhythm");
  const lastReading = last?.blocks.find((b) => b.type === "reading");
  const cleanBpm = lastScales?.midiScore?.badge === "clean-scale" ? num(lastScales.details?.tempoBest) ?? num(lastScales.details?.bpm) : fastestClean(sessions);
  const ahead = num(lastRhythm?.details?.aheadMs);
  const notesRight = num(lastReading?.details?.notesRight);
  const notesTotal = num(lastReading?.details?.total);

  return (
    <Rail>
      <RailSection label="This week" right={`${week.played} of ${week.target} days`}>
        <WeekKeys days={days} target={child.settings.sessionMinutes} />
        <Small>{weekLine(child, week.played, week.target)}</Small>
      </RailSection>
      {assignment?.note && (
        <Sticky from={`From ${teacher?.name ?? "your teacher"}`}>{assignment.note}</Sticky>
      )}
      {variant === "guided" ? (
        <>
          <Panel tone="indigo" style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: "16px 18px" }}>
            <span style={{ width: 56, height: 56, flex: "none", borderRadius: 16, background: "var(--kc-indigo)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 30, fontWeight: 600 }}>{prettyPc(plan.scale.key)}</span>
            <div>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>{keyName}</div>
              <Small>{pinnedBy ? `${keySignatureWords(plan.scale)} · pinned by ${pinnedBy}` : `${keySignatureWords(plan.scale)} · week ${weekIndex + 1} of ${roadmap.length}`}</Small>
            </div>
          </Panel>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 62, height: 62, flex: "none", borderRadius: "50%", background: "var(--kc-mint-wash)", border: "3px solid var(--kc-mint)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 28, fontWeight: 600, color: "var(--kc-mint-ink)" }}>{atTarget}</span>
            <div>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>Weeks at target</div>
              <Small>Rest days count. Nothing to lose.</Small>
            </div>
          </div>
        </>
      ) : (
        <Panel style={{ marginTop: "auto" }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{last ? "Last session, in numbers" : "Nothing in the record yet"}</div>
          {last ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Figure value={cleanBpm ?? "—"} label={cleanBpm != null ? "bpm, clean scale" : "no clean scale yet"} />
              <Figure value={ahead != null ? Math.abs(ahead) : "—"} unit={ahead != null ? "ms" : undefined} label={ahead == null ? "timing not measured" : ahead > 0 ? "early on the click" : ahead < 0 ? "late on the click" : "right on the click"} />
              <Figure value={notesRight != null && notesTotal != null ? `${notesRight}/${notesTotal}` : "—"} label="reading notes" />
              <Figure value={child.settings.readingLevel} label="reading level" />
            </div>
          ) : (
            <Small>The first session fills this in: tempo, timing, reading notes and level.</Small>
          )}
        </Panel>
      )}
    </Rail>
  );
}

function Figure({ value, unit, label }: { value: React.ReactNode; unit?: string; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{value}{unit && <span style={{ fontSize: 16 }}>{unit}</span>}</div>
      <Small>{label}</Small>
    </div>
  );
}
