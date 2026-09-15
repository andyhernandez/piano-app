"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, SectionLabel, Button, StatTile, LogTable, MeterRow, Icon } from "@/components/ds";
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

const inputStyle: React.CSSProperties = { height: 48, padding: "0 16px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-panel)", border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-mono)", fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", outline: "none", width: 220 };

/** Code entry when the teacher view is opened without a code. */
function CodeEntry({ error }: { error?: string | null }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const open = () => { if (code.trim().length >= 4) router.push(`/teacher?code=${encodeURIComponent(code.trim().toUpperCase())}`); };
  return (
    <div style={{ padding: "36px 38px", display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
      <div>
        <SectionLabel>TEACHER VIEW</SectionLabel>
        <h1 style={{ margin: "8px 0 0", fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>Enter your invite code.</h1>
        <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 520 }}>The household made it on the teacher link screen and read it out at the lesson. It opens the record of every student linked to you on this device.</p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") open(); }} placeholder="4K7MQ2" aria-label="Invite code" maxLength={8} style={inputStyle} />
        <Button icon="arrow_forward" onClick={open} disabled={code.trim().length < 4}>Open</Button>
      </div>
      {error && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--kc-clay)" }}><Icon name="error" size={20} />{error}</span>}
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
  const upper = teacher ? teacher.name.toUpperCase() : "";
  const student = students[index];
  const right = teacher ? (
    <>
      <SectionLabel>TEACHER · {upper}</SectionLabel>
      <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{students.length} student{students.length === 1 ? "" : "s"}</span>
      {student && <span style={{ fontSize: 15, fontWeight: 600 }}>{student.child.name}</span>}
      {students.length > 1 && <Button variant="quiet" size="control" onClick={() => { const i = (index + 1) % students.length; setIndex(i); setDraft(draftFrom(students[i].assignment)); setSent(null); }}>Next student</Button>}
    </>
  ) : <SectionLabel>TEACHER VIEW</SectionLabel>;

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
        <div style={{ padding: "36px 38px" }}>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>No students linked yet.</h1>
          <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>A household links a profile to you by entering <span style={{ fontFamily: "var(--kc-font-mono)" }}>{teacher.inviteCode}</span> on their teacher link screen.</p>
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
    ? `Four weeks: nothing recorded yet.`
    : `Four weeks: reading ${held ? "held" : "moving"}, timing ${f.driftMs == null ? "not measured" : drifting ? "drifting early" : "steady"}.`;
  const rows = f.window.slice(0, 6).map((s) => {
    const h = sessionHeadline(s);
    const level = s.blocks.find((b) => b.type === "reading")?.details?.level;
    const drift = s.blocks.find((b) => b.type === "rhythm")?.midiScore?.components?.avgDeviationMs;
    const fact = h.marked || !h.text.startsWith("LEVEL") ? h.text : typeof drift === "number" ? `${drift} MS DRIFT` : s.completed ? "DONE" : "PARTIAL";
    return { cells: [dayLabel(s.date), fmtClock(s.durationSec), `LEVEL ${typeof level === "number" ? level : child.settings.readingLevel}`, share.figures ? fact : s.completed ? "DONE" : "PARTIAL"], marked: share.figures && h.marked };
  });
  const smallest = f.smallest ? (f.smallest === "improv" ? "Their own" : DISCIPLINE[f.smallest].title) : null;
  const timeNote = !smallest ? "Nothing to weigh yet." : drifting && f.smallest === "rhythm" ? "Timing is the smallest block and the one drifting. Raise it at the lesson." : drifting ? `Timing is drifting; ${smallest.toLowerCase()} is the smallest block.` : `${smallest} is the smallest block. Even, otherwise.`;

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
    a.href = url; a.download = `keycadence-${name.toLowerCase()}-four-weeks.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen>
      <AppHeader active="" right={right} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        <div style={{ padding: "32px 34px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>{headline}</h1>
            <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>Read before the lesson. These are minutes and measurements, not a grade — what {name} practised is at the bottom.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            <StatTile label="DAYS PRACTICED" value={f.daysPracticed} unit="of 28" />
            <StatTile label="TIME PLAYED" value={`${Math.floor(f.minutes / 60)}h ${String(f.minutes % 60).padStart(2, "0")}m`} unit="four weeks" />
            <StatTile label={f.weeksHeld > 0 ? `READING LEVEL · HELD ${words(f.weeksHeld)} WEEK${f.weeksHeld === 1 ? "" : "S"}` : "READING LEVEL · NEW THIS WEEK"} value={f.readingLevel} />
            {share.figures ? (
              <StatTile label="TIMING DRIFT" value={f.driftMs ?? "—"} unit={f.driftMs == null ? "not measured" : "ms average"} tone={drifting ? "clay" : f.driftMs != null && f.driftMs > 10 ? "amber" : "default"} />
            ) : (
              <StatTile label="TIMING DRIFT" value="—" unit="not shared" />
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 11, minHeight: 0 }}>
              <SectionLabel>{name.toUpperCase()}&apos;S LAST SIX SESSIONS</SectionLabel>
              {!share.log ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>The household keeps the log private. Minutes and days still count above.</p>
              ) : rows.length ? <LogTable rows={rows} emphasize={1} /> : <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-dim)" }}>No sessions in the last four weeks.</p>}
            </div>
            <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
              <SectionLabel>WHERE THE TIME WENT</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {f.byDiscipline.map((d) => (
                  <MeterRow key={d.type} label={d.type === "improv" ? "Their own" : DISCIPLINE[d.type].title} value={d.pct} suffix={fmtHours(d.minutes)} tone={drifting && d.type === "rhythm" ? "clay" : "mint"} labelWidth={86} />
                ))}
              </div>
              <p style={{ margin: "auto 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{timeNote}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button icon="check" onClick={() => void send()} disabled={busy}>{assignment ? "Send the assignment" : "Send the first assignment"}</Button>
            <Button variant="secondary" size="control" icon="download" onClick={exportWeeks}>Export four weeks</Button>
            <span style={{ marginLeft: "auto", fontSize: 14, color: sent ? "var(--kc-mint)" : "var(--kc-ink-faint)" }}>{sent ? `Sent · ${stamp(sent)}` : `${capitalize(name)} sees it as a note on Today, not a notification.`}</span>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto" }}>
          <AssignmentEditor key={child.id} child={child} draft={draft} onChange={(d) => { setDraft(d); setSent(null); }} profile={child.skillProfile} showProfile={share.skillChecks} />
        </div>
      </div>
    </Screen>
  );
}
