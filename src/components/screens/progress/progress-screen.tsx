"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, Panel, StatTile, SectionLabel, MeterRow, LogTable, SegmentBar, Button, Icon, keyLabel } from "@/components/ds";
import type { LogRow } from "@/components/ds";
import { AppHeader } from "@/components/screens/today/app-header";
import { useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { BlockType, Session, Teacher } from "@/lib/types";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { currentScale } from "@/lib/engine/progression";
import { weekProgress, weeksAtTarget, timeByDiscipline, dayLabel, sessionHeadline, completedBlocks, cleanScaleTempos, fastestClean, aheadOfBeatMs, fmtClock, fmtMinutes, shortDate } from "@/lib/engine/record";
import { dateKey } from "@/lib/utils/date";
import { TempoChart } from "./tempo-chart";
import { progressHeadline, tempoCaption } from "./words";
import { openSkillCheck } from "../skill-check/open";

/** Discipline names as the Progress panel writes them (the kit's labels). */
const DISCIPLINE_LABEL: Record<BlockType, string> = { reading: "Reading", rhythm: "Timing", scales: "Technique", repertoire: "Pieces", theory: "Harmony", improv: "Own playing" };

const H3: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 600 };
const EMPTY: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--kc-ink-dim)" };

interface Loaded { sessions: Session[]; teacher: Teacher | null }

export function ProgressScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);

  React.useEffect(() => {
    if (!child) { router.replace("/onboarding"); }
  }, [child, router]);

  const childId = child?.id;
  React.useEffect(() => {
    if (!childId) return;
    let live = true;
    void (async () => {
      const [sessions, assignment, teachers] = await Promise.all([repo.listSessions(childId, 200), repo.assignmentFor(childId), repo.listTeachers()]);
      const teacher = assignment ? teachers.find((t) => t.id === assignment.teacherId) ?? null : null;
      if (live) setLoaded({ sessions, teacher });
    })();
    return () => { live = false; };
  }, [childId]);

  if (!child) return <Screen><AppHeader active="progress" /></Screen>;

  const sessions = loaded?.sessions ?? [];
  const teacher = loaded?.teacher ?? null;
  const today = dateKey();
  const week = weekProgress(child, sessions, today);
  const tempos = cleanScaleTempos(sessions);
  const fastest = fastestClean(sessions);
  const tempoDelta = tempos.length > 1 && fastest != null ? fastest - tempos[0].bpm : 0;
  const ahead = aheadOfBeatMs(sessions);
  const weeks = weeksAtTarget(child, today);
  const byDiscipline = timeByDiscipline(sessions);
  const recent = sessions.slice(0, 5);
  const rows: LogRow[] = recent.map((s) => {
    const head = sessionHeadline(s);
    // Fixed widths on the first three cells so the columns line up from row to row; the headline takes the rest.
    const cell = (text: string, width: number, right = false) => <span style={{ display: "block", width, textAlign: right ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>;
    return { cells: [cell(dayLabel(s.date), 58), cell(fmtClock(s.durationSec), 48), cell(`${completedBlocks(s)}/${Math.max(6, s.blocks.length)}`, 30), cell(head.text, 176, true)], marked: head.marked };
  });
  const firstKey = tempos[0]?.scale;
  const lastKey = tempos[tempos.length - 1]?.scale;
  const chartMeta = tempos.length
    ? `BPM · ${tempos.length} ${tempos.length === 1 ? "RUN" : "RUNS"} · ${firstKey && lastKey && (firstKey.key !== lastKey.key || firstKey.mode !== lastKey.mode) ? `${keyLabel(firstKey.key, firstKey.mode)} → ${keyLabel(lastKey.key, lastKey.mode)}` : keyLabel(lastKey.key, lastKey.mode)}`
    : "BPM · CLEAN RUNS";

  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  const current = currentScale(child);
  const weekIndex = Math.min(child.roadmapIndex, roadmap.length - 1);
  const profile = child.skillProfile;

  return (
    <Screen>
      <AppHeader active="progress" />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* First fold: the kit's Progress screen, sized to the viewport. */}
        <div style={{ minHeight: "calc(100dvh - 72px)", boxSizing: "border-box", padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 560 }}>{loaded ? progressHeadline(child, sessions) : " "}</h1>
            <p style={{ margin: "0 0 4px auto", fontSize: 14, lineHeight: 1.5, color: "var(--kc-ink-dim)", maxWidth: 300 }}>A record of what happened, not a score. Nothing here drops because of a missed day.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 11 }}>
            <StatTile label="DAYS PRACTISED" value={String(week.played)} unit={`of ${week.target} this week`} />
            <StatTile label="TIME THIS WEEK" value={fmtMinutes(week.minutes)} unit={week.minutes < 60 ? `of ${week.targetMinutes} min` : `of ${fmtMinutes(week.targetMinutes)} h`} />
            <StatTile label="SCALE TEMPO" value={fastest != null ? String(fastest) : "—"} unit={fastest != null ? "bpm" : "no clean run yet"} delta={tempoDelta > 0 ? `+${tempoDelta}` : undefined} />
            <StatTile label="AHEAD OF BEAT" value={ahead != null ? String(ahead) : "—"} unit={ahead != null ? "ms" : "not measured yet"} tone={ahead != null && Math.abs(ahead) > 40 ? "amber" : "default"} />
            <StatTile label="WEEKS AT TARGET" value={String(weeks)} unit={weeks === 1 ? "so far" : "in a row"} tone={weeks > 0 ? "mint" : "default"} />
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
            <Panel padding="panel" style={{ minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <h3 style={H3}>Clean scale tempo</h3>
                <SectionLabel size="meta">{chartMeta}</SectionLabel>
              </div>
              {tempos.length ? (
                <TempoChart points={tempos} />
              ) : (
                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ ...EMPTY, textAlign: "center", maxWidth: 320 }}>Nothing yet. Your first clean run goes here.</p>
                </div>
              )}
              <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-dim)" }}>{tempoCaption(sessions)}</p>
            </Panel>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
              <Panel padding="panel">
                <h3 style={H3}>Time by discipline</h3>
                {sessions.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {byDiscipline.map((d) => (
                      <MeterRow key={d.type} label={DISCIPLINE_LABEL[d.type]} value={d.pct} labelWidth={86} />
                    ))}
                  </div>
                ) : (
                  <p style={EMPTY}>Nothing yet. Where the minutes go shows up after the first session.</p>
                )}
              </Panel>

              <Panel padding="panel" style={{ flex: 1, minHeight: 0 }}>
                <h3 style={H3}>Recent sessions</h3>
                {rows.length ? <LogTable rows={rows} /> : <p style={EMPTY}>Nothing yet. Your first session goes here.</p>}
                <p style={{ margin: "auto 0 0", fontSize: 12, color: "var(--kc-ink-faint)" }}>{teacher ? `Same log the household and ${teacher.name} see.` : "Same log the household sees."}</p>
              </Panel>
            </div>
          </div>
        </div>

        {/* Below the fold: the skill profile and the key roadmap. */}
        <div style={{ padding: "0 36px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel padding="panel">
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h3 style={H3}>Skill profile</h3>
              <SectionLabel size="meta">{profile ? `SKILL CHECK · ${shortDate(dateKey(new Date(profile.assessedAt)))}` : "NO SKILL CHECK YET"}</SectionLabel>
            </div>
            {profile ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <MeterRow label="Ear" value={profile.ear} labelWidth={86} suffix={skillWord(profile.ear)} />
                  <MeterRow label="Reading" value={profile.eye} labelWidth={86} suffix={skillWord(profile.eye)} />
                  <MeterRow label="Pulse" value={profile.pulse} labelWidth={86} suffix={skillWord(profile.pulse)} />
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.5 }}>Three figures from the four-minute check. They set how the session is weighted; they do not change on their own.</p>
                <div><Button variant="secondary" size="control" onClick={() => openSkillCheck(router.push)}>Check again</Button></div>
              </>
            ) : (
              <>
                <p style={EMPTY}>Nothing yet. The skill check takes about four minutes and sets how the session is weighted.</p>
                <div><Button variant="secondary" size="control" onClick={() => openSkillCheck(router.push)}>Take the skill check</Button></div>
              </>
            )}
          </Panel>

          <Panel padding="panel">
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h3 style={H3}>Key roadmap</h3>
              <SectionLabel size="meta">{`WEEK ${String(weekIndex + 1).padStart(2, "0")} OF ${String(roadmap.length).padStart(2, "0")}`}</SectionLabel>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>{keyLabel(current.key, current.mode)}</span>
                <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{child.scaleOverride ? "set by the household or a teacher" : "this week's key"}</span>
              </div>
              <SegmentBar total={roadmap.length} filled={weekIndex} current={weekIndex} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 22, rowGap: 0 }}>
              {roadmap.map((s, i) => {
                const state = i < weekIndex ? "done" : i === weekIndex ? "current" : "upcoming";
                const color = state === "upcoming" ? "var(--kc-ink-dim)" : "var(--kc-ink)";
                const last = i >= roadmap.length - 2;
                return (
                  <div key={`${s.key}-${s.mode}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, height: 34, borderBottom: last ? "none" : "1px solid var(--kc-border)", fontSize: 14 }}>
                    <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 12, color: "var(--kc-ink-faint)", width: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ flex: 1, color, fontWeight: state === "current" ? 600 : 400 }}>{keyLabel(s.key, s.mode)}</span>
                    {state === "done" && <Icon name="check" size={18} color="var(--kc-mint)" />}
                    {state === "current" && <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.07em", color: "var(--kc-mint)" }}>NOW</span>}
                    {state === "upcoming" && <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.07em", color: "var(--kc-ink-faint)" }}>WEEK {i + 1}</span>}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

function skillWord(v: number): string {
  return v >= 80 ? "strong" : v >= 55 ? "steady" : v >= 30 ? "forming" : "starting";
}
