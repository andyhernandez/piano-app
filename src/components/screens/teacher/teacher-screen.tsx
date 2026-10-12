"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, SectionLabel, Button, LogTable, MeterRow, Icon, Headline, Panel, Rail, Small, ActionNote } from "@/components/ds";
import { repo } from "@/lib/db/repo";
import { DEFAULT_TEACHER_SHARE } from "@/lib/store/app-store";
import type { Assignment, Child, Session, Teacher } from "@/lib/types";
import { dateKey } from "@/lib/utils/date";
import { dayLabel, fmtClock, fmtHours, sessionHeadline, DISCIPLINE } from "@/lib/engine/record";
import { AppHeader } from "../today/app-header";
import { words, capitalize, stamp } from "../today/words";
import { fourWeeks } from "./teacher-stats";
import { AssignmentEditor, draftFrom, assignmentFrom, type Draft } from "./assignment-editor";

interface Student { child: Child; sessions: Session[]; assignment: Assignment | null }

const inputStyle: React.CSSProperties = { height: 60, padding: "0 18px", borderRadius: 18, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-display)", fontWeight: 600, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", outline: "none", width: 230, boxSizing: "border-box" };

/** Code entry when the teacher view is opened without a code. */
function CodeEntry({ error }: { error?: string | null }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const open = () => { if (code.trim().length >= 4) router.push(`/teacher?code=${encodeURIComponent(code.trim().toUpperCase())}`); };
  return (
    <div style={{ padding: "34px 40px", display: "flex", flexDirection: "column", gap: 26, flex: 1 }}>
      <Headline kicker="Teacher view" title="Enter your invite code." lede="The household made it on the teacher link screen and read it out at the lesson. It opens the record of every student linked to you on this device." />
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") open(); }} placeholder="4K7MQ2" aria-label="Invite code" maxLength={8} style={inputStyle} />
        <Button size="control" icon="arrow_forward" iconAfter onClick={open} disabled={code.trim().length < 4}>Open</Button>
      </div>
      {error && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "var(--kc-indigo-shadow)" }}><Icon name="info" size={22} color="var(--kc-indigo)" />{error}</span>}
    </div>
  );
}

/** A four-week figure on a small card. */
function Figure({ label, value, sub, sun }: { label: string; value: React.ReactNode; sub: string; sun?: boolean }) {
  return (
    <div style={{ background: sun ? "var(--kc-sun)" : "var(--kc-panel)", border: sun ? "none" : "2px solid var(--kc-border)", borderRadius: 20, boxShadow: sun ? "var(--kc-shadow-press-sun)" : "var(--kc-shadow-press)", padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: sun ? "var(--kc-sun-ink)" : "var(--kc-ink-faint)" }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 32, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: sun ? "var(--kc-sun-ink)" : "var(--kc-ink-faint)" }}>{sub}</div>
    </div>
  );
}

interface Loaded { code: string; teacher: Teacher | null; students: Student[] }

export function TeacherScreen({ code }: { code: string | null }) {
  const [today] = React.useState(() => dateKey());
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [index, setIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [sent, setSent] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      const t = await repo.teacherByCode(code);
      if (!t) { if (!cancelled) setLoaded({ code, teacher: null, students: [] }); return; }
      const kids = (await repo.listChildren()).filter((c) => t.childIds.includes(c.id));
      const rows = await Promise.all(kids.map(async (child) => ({ child, sessions: await repo.listSessions(child.id, 200), assignment: (await repo.assignmentFor(child.id)) ?? null })));
      if (cancelled) return;
      setLoaded({ code, teacher: t, students: rows });
      setIndex(0);
      setDraft(draftFrom(rows[0]?.assignment ?? null));
      setSent(null);
    })();
    return () => { cancelled = true; };
  }, [code]);

  // Only the load for the current code counts; a stale one reads as "still loading".
  const current = loaded && loaded.code === code ? loaded : null;
  const teacher: Teacher | null | undefined = code ? (current ? current.teacher : undefined) : undefined;
  const students = current?.students ?? [];
  const setStudents = (fn: (all: Student[]) => Student[]) => setLoaded((l) => (l ? { ...l, students: fn(l.students) } : l));
  const student = students[index];
  const pick = (i: number) => { setIndex(i); setDraft(draftFrom(students[i].assignment)); setSent(null); };
  const shortName = (c: Child) => c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name;
  const right = teacher ? (
    <>
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>Teacher · {teacher.name}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {students.map((s, i) => (
          <button key={s.child.id} type="button" onClick={() => pick(i)} aria-pressed={i === index} style={{ height: 40, padding: "0 14px", borderRadius: 999, border: "none", display: "inline-flex", alignItems: "center", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === index ? "var(--kc-indigo)" : "transparent", color: i === index ? "#ffffff" : "var(--kc-ink-muted)" }}>
            {shortName(s.child)}
          </button>
        ))}
      </div>
    </>
  ) : <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>Teacher view</span>;

  if (!code || teacher === null) {
    return (
      <Screen>
        <AppHeader active="" right={right} />
        <CodeEntry error={teacher === null ? "No teacher has that code on this device. Check it letter by letter." : null} />
      </Screen>
    );
  }
  if (!teacher || !draft) return <Screen><AppHeader active="" right={right} /></Screen>;
  if (!student) {
    return (
      <Screen>
        <AppHeader active="" right={right} />
        <div style={{ padding: "34px 40px" }}>
          <Headline title="No students linked yet." lede={<>A household links a profile to you by entering <span style={{ fontFamily: "var(--kc-font-display)", fontWeight: 600, letterSpacing: "0.08em" }}>{teacher.inviteCode}</span> on their teacher link screen.</>} />
        </div>
      </Screen>
    );
  }

  const { child, sessions, assignment } = student;
  const share = child.teacherShare ?? DEFAULT_TEACHER_SHARE;
  const f = fourWeeks(child, sessions, today);
  const name = child.name;
  const drifting = f.driftMs != null && f.driftMs > 20;
  const held = f.weeksHeld >= 2;
  const headline = f.window.length === 0
    ? "Nothing recorded yet."
    : `Reading ${held ? "held" : "moving"}, timing ${f.driftMs == null ? "not measured" : drifting ? "drifting early" : "steady"}.`;
  const rows = f.window.slice(0, 6).map((s) => {
    const h = sessionHeadline(s);
    const level = s.blocks.find((b) => b.type === "reading")?.details?.level;
    const drift = s.blocks.find((b) => b.type === "rhythm")?.midiScore?.components?.avgDeviationMs;
    const fact = h.marked || !h.text.startsWith("LEVEL") ? h.text.toLowerCase() : typeof drift === "number" ? `${drift} ms drift` : s.completed ? "done" : "partial";
    return { cells: [dayLabel(s.date), fmtClock(s.durationSec), `level ${typeof level === "number" ? level : child.settings.readingLevel}`, share.figures ? fact : s.completed ? "done" : "partial"], marked: share.figures && h.marked };
  });
  const smallest = f.smallest ? (f.smallest === "improv" ? "Own" : DISCIPLINE[f.smallest].title) : null;
  const timeNote = !smallest ? "Nothing to weigh yet." : drifting && f.smallest === "rhythm" ? "Timing is the smallest stop and the one drifting. Raise it at the lesson." : drifting ? `Timing is drifting; ${smallest.toLowerCase()} is the smallest stop.` : `${smallest} is the smallest stop. Even, otherwise.`;

  const send = async () => {
    setBusy(true);
    try {
      const next = assignmentFrom(draft, assignment, child.id, teacher.id);
      await repo.putAssignment(next);
      setStudents((all) => all.map((s, i) => (i === index ? { ...s, assignment: next } : s)));
      setSent(next.updatedAt);
    } finally { setBusy(false); }
  };
  const exportWeeks = () => {
    const payload = { student: name, teacher: teacher.name, exportedAt: new Date().toISOString(), days: f.daysPracticed, minutes: f.minutes, readingLevel: f.readingLevel, driftMs: f.driftMs, sessions: share.log ? f.window.map((s) => ({ date: s.date, minutes: Math.round(s.durationSec / 60), completed: s.completed, blocks: s.blocks.map((b) => ({ type: b.type, minutes: Math.round(b.durationSec / 60), completed: b.completed, score: share.figures ? b.midiScore?.score ?? null : null })) })) : [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${name.toLowerCase()}-four-weeks.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen>
      <AppHeader active="" right={right} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 18, minHeight: 0, overflowY: "auto" }}>
          <Headline size={40} kicker="Four weeks · read before the lesson" title={headline} lede={<>Minutes and measurements, not a grade. What {name} practised is below.</>} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            <Figure label="Days played" value={f.daysPracticed} sub="of 28" />
            <Figure label="Time" value={`${Math.floor(f.minutes / 60)}h ${String(f.minutes % 60).padStart(2, "0")}m`} sub="four weeks" />
            <Figure label="Reading" value={f.readingLevel} sub={f.weeksHeld > 0 ? `held ${words(f.weeksHeld)} week${f.weeksHeld === 1 ? "" : "s"}` : "new this week"} />
            {share.figures ? (
              <Figure label="Ahead of beat" value={f.driftMs ?? "—"} sub={f.driftMs == null ? "not measured" : "ms average"} />
            ) : (
              <Figure label="Ahead of beat" value="—" sub="not shared" />
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel style={{ padding: "16px 20px", gap: 2, minHeight: 0, overflowY: "auto" }}>
              <SectionLabel size="title" style={{ fontSize: 17 }}>Last six sessions</SectionLabel>
              {!share.log ? (
                <Small>The household keeps the log private. Minutes and days still count above.</Small>
              ) : rows.length ? <LogTable rows={rows} emphasize={1} /> : <Small>No sessions in the last four weeks.</Small>}
            </Panel>
            <Panel style={{ padding: "16px 20px", gap: 12, minHeight: 0 }}>
              <SectionLabel size="title" style={{ fontSize: 17 }}>Where the time went</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {f.byDiscipline.map((d) => (
                  <MeterRow key={d.type} label={d.type === "improv" ? "Own" : DISCIPLINE[d.type].title} value={d.pct} suffix={fmtHours(d.minutes).replace(/ /g, "")} tone={drifting && d.type === "rhythm" ? "lilac" : "indigo"} labelWidth={86} />
                ))}
              </div>
              <Small color="var(--kc-indigo-shadow)" style={{ marginTop: "auto" }}>{timeNote}</Small>
            </Panel>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Button variant="secondary" size="pill" icon="download" onClick={exportWeeks}>Export four weeks</Button>
            <ActionNote>{sent ? `Sent · ${stamp(sent)}` : `${capitalize(name)} sees it as a note on Today, not a notification.`}</ActionNote>
          </div>
        </div>
        <Rail>
          <AssignmentEditor key={child.id} child={child} draft={draft} onChange={(d) => { setDraft(d); setSent(null); }} profile={child.skillProfile} showProfile={share.skillChecks} />
          <Button size="control" icon="send" onClick={() => void send()} disabled={busy} style={{ alignSelf: "stretch" }}>{assignment ? "Send the assignment" : "Send the first assignment"}</Button>
        </Rail>
      </div>
    </Screen>
  );
}
