"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { openSkillCheck } from "../skill-check/open";
import { Screen, Panel, Headline, SectionLabel, MeterRow, LogTable, SegmentBar, Button, Icon, Small, keyLabel } from "@/components/ds";
import type { LogRow } from "@/components/ds";
import { AppHeader } from "@/components/screens/today/app-header";
import { useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { BlockType, Child, Session, Teacher } from "@/lib/types";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { currentScale } from "@/lib/engine/progression";
import { weeksAtTarget, timeByDiscipline, dayLabel, sessionHeadline, completedBlocks, cleanScaleTempos, fastestClean, fmtClock, shortDate, minutesByDay } from "@/lib/engine/record";
import { dateKey } from "@/lib/utils/date";
import { TempoChart } from "./tempo-chart";
import { progressHeadline, progressFacts, tempoCaption, numberWord } from "./words";

/** Discipline names as the record writes them. */
const DISCIPLINE_LABEL: Record<BlockType, string> = { reading: "Reading", rhythm: "Timing", ear: "Ear", scales: "Technique", repertoire: "Pieces", theory: "Harmony", improv: "Own playing" };

const EMPTY: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: "var(--kc-ink-muted)" };

interface Loaded { sessions: Session[]; teacher: Teacher | null }

/** A headline figure on a card: Nunito label over a Fredoka 42. Sunshine for the fastest clean tempo. */
function Tile({ label, value, unit, sun }: { label: string; value: React.ReactNode; unit?: string; sun?: boolean }) {
  return (
    <div style={{ background: sun ? "var(--kc-sun)" : "var(--kc-panel)", border: sun ? "none" : "2px solid var(--kc-border)", borderRadius: 22, boxShadow: sun ? "var(--kc-shadow-press-sun)" : "var(--kc-shadow-press)", padding: "18px 20px", minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: sun ? "#5c3e00" : "var(--kc-ink-faint)" }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 42, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
        {unit && <span style={{ fontSize: 22 }}> {unit}</span>}
      </div>
    </div>
  );
}

interface Sticker { icon: string; title: string; detail: string; tone: "sun" | "mint" | "indigo"; at: string }

/** Stickers come only from things that happened: a best, a clean run, a steady pulse, a page read without stopping. */
function stickersFor(child: Child, sessions: Session[], weeks: number): Sticker[] {
  const out: Sticker[] = [];
  const ordered = sessions.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const fastest = fastestClean(sessions);
  if (fastest != null) {
    const run = cleanScaleTempos(sessions).filter((t) => t.bpm === fastest).pop();
    out.push({ icon: "star", title: `${fastest} bpm`, detail: `New best, ${run ? shortDate(run.date) : "clean"}`, tone: "sun", at: run?.date ?? "" });
  }
  const seen = new Set<string>();
  for (const s of ordered) {
    for (const b of s.blocks) {
      const badge = b.midiScore?.badge;
      if (!badge || seen.has(badge)) continue;
      if (badge === "steady-pulse") { seen.add(badge); out.push({ icon: "favorite", title: "Steady hands", detail: `Every tap on the click, ${shortDate(s.date)}`, tone: "mint", at: s.date }); }
      if (badge === "clean-scale") { seen.add(badge); out.push({ icon: "piano", title: "Even scale", detail: `${keyLabel(s.scale.key, s.scale.mode)}, ${shortDate(s.date)}`, tone: "mint", at: s.date }); }
      if (badge === "no-stop-reading") { seen.add(badge); out.push({ icon: "menu_book", title: "No stopping", detail: `A whole page through, ${shortDate(s.date)}`, tone: "indigo", at: s.date }); }
      if (badge === "chord-detective") { seen.add(badge); out.push({ icon: "hearing", title: "Chord detective", detail: `Every chord named, ${shortDate(s.date)}`, tone: "indigo", at: s.date }); }
    }
  }
  if (child.settings.readingLevel > 1) out.push({ icon: "menu_book", title: `Level ${child.settings.readingLevel} reader`, detail: "Earned by reading", tone: "indigo", at: "" });
  if (weeks >= 2) out.push({ icon: "local_fire_department", title: `${numberWord(weeks, true)} weeks`, detail: "At target in a row", tone: "sun", at: "" });
  const firstBlues = ordered.filter((s) => s.blocks.some((b) => b.type === "improv" && b.completed && b.details?.groove === "blues")).pop();
  if (firstBlues) out.push({ icon: "queue_music", title: "First blues", detail: `Twelve bars, ${shortDate(firstBlues.date)}`, tone: "indigo", at: firstBlues.date });
  const extra: Record<string, Omit<Sticker, "at">> = {
    "first-session": { icon: "play_arrow", title: "First session", detail: "The record starts here", tone: "mint" },
    "week-complete": { icon: "calendar_month", title: "A whole week", detail: "Every planned day", tone: "sun" },
    "region-complete": { icon: "key", title: "Key earned", detail: "A whole month in one key", tone: "sun" },
    improviser: { icon: "auto_awesome", title: "Your own", detail: "A take kept in the library", tone: "indigo" },
    "assessment-complete": { icon: "checklist", title: "Skill check", detail: "Four minutes, three figures", tone: "mint" },
  };
  for (const b of child.unlocks.badges) {
    const e = extra[b.id];
    if (e && !out.some((o) => o.title === e.title)) out.push({ ...e, at: dateKey(new Date(b.earnedAt)) });
  }
  return out.slice(0, 8);
}

const STICKER_TONES = {
  sun: { background: "var(--kc-sun)", boxShadow: "0 3px 0 0 var(--kc-sun-shadow)", icon: "#b37a00", detail: "#5c3e00" },
  mint: { background: "var(--kc-mint)", boxShadow: "0 3px 0 0 #04a37a", icon: "var(--kc-mint-ink)", detail: "#03402f" },
  indigo: { background: "var(--kc-indigo-wash)", boxShadow: "0 3px 0 0 var(--kc-lilac)", icon: "var(--kc-indigo)", detail: "var(--kc-indigo-shadow)" },
};
const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5];

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
      const [sessions, assignment, teachers] = await Promise.all([repo.listSessions(childId, 400), repo.assignmentFor(childId), repo.listTeachers()]);
      const teacher = assignment ? teachers.find((t) => t.id === assignment.teacherId) ?? null : null;
      if (live) setLoaded({ sessions, teacher });
    })();
    return () => { live = false; };
  }, [childId]);

  if (!child) return <Screen><AppHeader active="progress" /></Screen>;

  const sessions = loaded?.sessions ?? [];
  const teacher = loaded?.teacher ?? null;
  const today = dateKey();
  const tempos = cleanScaleTempos(sessions);
  const fastest = fastestClean(sessions);
  const weeks = weeksAtTarget(child, today);
  const byDiscipline = timeByDiscipline(sessions);
  const daysPlayed = Array.from(minutesByDay(sessions).values()).filter((m) => m >= 1).length;
  const totalMinutes = sessions.reduce((a, s) => a + s.durationSec / 60, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const timeAtKeys = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const stickers = stickersFor(child, sessions, weeks);
  const recent = sessions.slice(0, 5);
  const rows: LogRow[] = recent.map((s) => {
    const head = sessionHeadline(s);
    return { cells: [dayLabel(s.date), `${fmtClock(s.durationSec)} · ${completedBlocks(s)} of ${Math.max(7, s.blocks.length)} stops`, head.text], marked: head.marked };
  });
  const climb = tempos.length > 1 ? `${tempos[0].bpm} → ${fastest} bpm` : tempos.length === 1 ? `${tempos[0].bpm} bpm` : "No clean run yet";

  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  const current = currentScale(child);
  const weekIndex = Math.min(child.roadmapIndex, roadmap.length - 1);
  const profile = child.skillProfile;
  const facts = progressFacts(child, sessions);

  return (
    <Screen>
      <AppHeader active="progress" />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* First fold: the record at a glance, sized to the viewport. */}
        <div style={{ minHeight: "calc(100dvh - 78px)", boxSizing: "border-box", padding: "30px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
          <Headline size={48} title={loaded ? progressHeadline(child, sessions) : " "} lede={facts ?? "This is a scrapbook, not a score — nothing here goes down."} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
            <Tile label="Days you played" value={String(daysPlayed)} />
            <Tile label="Time at the keys" value={timeAtKeys} />
            <Tile label="Reading level" value={String(child.settings.readingLevel)} />
            <Tile label="Fastest clean" value={fastest != null ? String(fastest) : "—"} unit={fastest != null ? "bpm" : undefined} sun />
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: 16 }}>
            <Panel padding="roomy" style={{ minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <SectionLabel>Climbing the tempo</SectionLabel>
                <SectionLabel size="meta" style={{ marginLeft: "auto" }}>{climb}</SectionLabel>
              </div>
              {tempos.length ? (
                <TempoChart points={tempos} />
              ) : (
                <div style={{ flex: 1, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ ...EMPTY, textAlign: "center", maxWidth: 320 }}>Nothing yet. Your first clean run is the first step.</p>
                </div>
              )}
              <Small>{tempoCaption(sessions)}</Small>
            </Panel>

            <Panel padding="roomy" style={{ minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <SectionLabel>Sticker book</SectionLabel>
                <SectionLabel size="meta" style={{ marginLeft: "auto" }}>Earned by playing</SectionLabel>
              </div>
              {stickers.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, overflow: "hidden" }}>
                  {stickers.map((s, i) => {
                    const t = STICKER_TONES[s.tone];
                    return (
                      <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 18, padding: 12, background: t.background, boxShadow: t.boxShadow, transform: `rotate(${TILTS[i % TILTS.length]}deg)`, minWidth: 0 }}>
                        <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={24} color={t.icon} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: t.detail, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={EMPTY}>Nothing yet. Stickers come from playing: a clean scale, a steady pulse, a page read without stopping, a new fastest tempo.</p>
              )}
            </Panel>
          </div>
        </div>

        {/* Below the fold: where the minutes went, the skill profile, the key roadmap and the log. */}
        <div style={{ padding: "0 32px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Panel padding="roomy">
            <SectionLabel>Where the minutes went</SectionLabel>
            {sessions.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byDiscipline.map((d) => <MeterRow key={d.type} label={DISCIPLINE_LABEL[d.type]} value={d.pct} suffix={`${d.minutes} min`} />)}
              </div>
            ) : (
              <p style={EMPTY}>Nothing yet. Where the minutes go shows up after the first session.</p>
            )}
          </Panel>

          <Panel padding="roomy">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <SectionLabel>Skill check</SectionLabel>
              <SectionLabel size="meta" style={{ marginLeft: "auto" }}>{profile ? `Taken ${shortDate(dateKey(new Date(profile.assessedAt)))}` : "Not taken yet"}</SectionLabel>
            </div>
            {profile ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <MeterRow label="Ear" value={profile.ear} suffix={skillWord(profile.ear)} />
                  <MeterRow label="Reading" value={profile.eye} suffix={skillWord(profile.eye)} />
                  <MeterRow label="Timing" value={profile.pulse} suffix={skillWord(profile.pulse)} />
                </div>
                <Small>Three figures from the check. They set how the session is weighted; they do not change on their own.</Small>
                <div><Button variant="secondary" size="pill" onClick={() => openSkillCheck(router.push)}>Check again</Button></div>
              </>
            ) : (
              <>
                <p style={EMPTY}>The skill check takes about four minutes and sets how the session is weighted.</p>
                <div><Button variant="secondary" size="pill" onClick={() => openSkillCheck(router.push)}>Take the skill check</Button></div>
              </>
            )}
          </Panel>

          <Panel padding="roomy">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <SectionLabel>Key roadmap</SectionLabel>
              <SectionLabel size="meta" style={{ marginLeft: "auto" }}>{`Week ${weekIndex + 1} of ${roadmap.length}`}</SectionLabel>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600 }}>{keyLabel(current.key, current.mode)}</span>
                <Small>{child.scaleOverride ? "set by the household or a teacher" : "this month's key"}</Small>
              </div>
              <SegmentBar total={roadmap.length} filled={weekIndex} current={weekIndex} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 22 }}>
              {roadmap.map((s, i) => {
                const state = i < weekIndex ? "done" : i === weekIndex ? "current" : "upcoming";
                const last = i >= roadmap.length - 2;
                return (
                  <div key={`${s.key}-${s.mode}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, height: 36, borderBottom: last ? "none" : "2px solid var(--kc-hairline)", fontSize: 15, fontWeight: 700 }}>
                    <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 14, fontWeight: 600, color: "var(--kc-ink-faint)", width: 22 }}>{i + 1}</span>
                    <span style={{ flex: 1, color: state === "upcoming" ? "var(--kc-ink-muted)" : "var(--kc-ink)", fontWeight: state === "current" ? 800 : 700 }}>{keyLabel(s.key, s.mode)}</span>
                    {state === "done" && <Icon name="check_circle" size={20} color="var(--kc-mint-ink)" />}
                    {state === "current" && <span style={{ fontSize: 12, fontWeight: 900, color: "var(--kc-indigo)" }}>NOW</span>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel padding="roomy">
            <SectionLabel>Recent sessions</SectionLabel>
            {rows.length ? <LogTable rows={rows} emphasize={2} /> : <p style={EMPTY}>Nothing yet. Your first session goes here.</p>}
            <Small color="var(--kc-ink-faint)" style={{ marginTop: "auto" }}>{teacher ? `Same log the household and ${teacher.name} see.` : "Same log the household sees."}</Small>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

function skillWord(v: number): string {
  return v >= 80 ? "strong" : v >= 55 ? "steady" : v >= 30 ? "forming" : "starting";
}
