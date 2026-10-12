"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, SectionLabel, Button, Toggle, Tempo, Headline, Panel, Rail, RailSection, Sticky, Small, ActionNote } from "@/components/ds";
import { useAppStore, useActiveChild, DEFAULT_TEACHER_SHARE } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { newId } from "@/lib/utils/id";
import { dateKey, weekDays } from "@/lib/utils/date";
import { makeInviteCode } from "@/lib/household/pin";
import type { Assignment, Teacher, TeacherShare } from "@/lib/types";
import { AppHeader } from "../today/app-header";
import { CodePrompt, useCodeLocked } from "./code-gate";
import { useProfileData } from "../today/today-data";
import { dayMonth, stamp } from "../today/words";

const inputStyle: React.CSSProperties = { height: 46, padding: "0 14px", borderRadius: 14, background: "var(--kc-base)", border: "2px solid var(--kc-border)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", fontWeight: 700, fontSize: 16, outline: "none", minWidth: 0, boxSizing: "border-box" };

/** Split a note like "…at ♩72…" so the tempo glyph renders from the music font. */
function NoteText({ text }: { text: string }) {
  const parts = text.split(/(♩\d{2,3})/g);
  return <>{parts.map((p, i) => (/^♩\d+$/.test(p) ? <Tempo key={i} bpm={Number(p.slice(1))} size={15} /> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

function blankAssignment(childId: string, teacherId: string): Assignment {
  return { id: newId("asg"), childId, teacherId, scaleOverride: null, roadmapOverride: null, songIds: [], note: "", weightsOverride: null, updatedAt: new Date().toISOString() };
}

/** The invite code as big indigo-wash tiles, one per character. */
function CodeTiles({ code }: { code: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {code.split("").map((ch, i) => (
        <span key={i} style={{ flex: 1, height: 70, borderRadius: 18, background: "var(--kc-indigo-wash)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600, color: "var(--kc-indigo)" }}>{ch}</span>
      ))}
    </div>
  );
}

export function TeacherLinkScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const children = useAppStore((s) => s.children);
  const parent = useAppStore((s) => s.parent);
  const updateChild = useAppStore((s) => s.updateChild);
  const locked = useCodeLocked("teacherLink");
  const [version, setVersion] = React.useState(0);
  const data = useProfileData(child?.id ?? null, version);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [recordingsThisWeek, setRecordingsThisWeek] = React.useState(0);
  const [confirmUnlink, setConfirmUnlink] = React.useState(false);

  React.useEffect(() => {
    if (!parent || children.length === 0) router.replace("/onboarding");
  }, [parent, children.length, router]);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    const [from, to] = [weekDays(dateKey())[0], weekDays(dateKey())[6]];
    void repo.listRecordings(child.id).then((rs) => { if (!cancelled) setRecordingsThisWeek(rs.filter((r) => r.createdAt.slice(0, 10) >= from && r.createdAt.slice(0, 10) <= to).length); });
    return () => { cancelled = true; };
  }, [child]);

  if (!child) return <Screen><AppHeader active="" /></Screen>;

  const share: TeacherShare = child.teacherShare ?? DEFAULT_TEACHER_SHARE;
  const setShare = (key: keyof TeacherShare, v: boolean) => void updateChild(child.id, (c) => ({ ...c, teacherShare: { ...(c.teacherShare ?? DEFAULT_TEACHER_SHARE), [key]: v } }));
  const teacher = data.teacher;
  const linked = !!data.assignment && !!teacher;
  const others = children.filter((c) => c.id !== child.id).map((c) => c.name);
  const teacherName = teacher?.name ?? "Your teacher";
  const possessive = teacher ? `${teacherName}’s` : "The teacher’s";

  const attach = async (t: Teacher) => {
    const next: Teacher = { ...t, childIds: t.childIds.includes(child.id) ? t.childIds : [...t.childIds, child.id] };
    await repo.putTeacher(next);
    const existing = await repo.assignmentFor(child.id);
    if (existing) await repo.deleteAssignment(existing.id);
    await repo.putAssignment(blankAssignment(child.id, next.id));
    setVersion((v) => v + 1);
  };
  const linkByCode = async () => {
    setBusy(true); setError(null);
    try {
      const t = await repo.teacherByCode(code.trim());
      if (!t) { setError("No teacher has that code. Check it letter by letter; O and 0 are never used."); return; }
      await attach(t);
      setCode("");
    } finally { setBusy(false); }
  };
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      const t: Teacher = { id: newId("tch"), name: name.trim(), inviteCode: makeInviteCode(), childIds: [], createdAt: new Date().toISOString() };
      await attach(t);
      setName("");
    } finally { setBusy(false); }
  };
  const unlink = async () => {
    if (!data.assignment || !teacher) return;
    setBusy(true);
    try {
      await repo.deleteAssignment(data.assignment.id);
      await repo.putTeacher({ ...teacher, childIds: teacher.childIds.filter((id) => id !== child.id) });
      setConfirmUnlink(false);
      setVersion((v) => v + 1);
    } finally { setBusy(false); }
  };

  const right = <span style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-faint)" }}>{child.name}’s profile</span>;
  const headerMid = <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>Household · teacher link</span>;

  if (locked) {
    return (
      <Screen>
        <AppHeader active="" right={<>{headerMid}{right}</>} />
        <CodePrompt title="The teacher link sits behind the code" lede="Who reads the record, and what they receive, is the household’s to decide." />
      </Screen>
    );
  }

  const shareCard = (title: string, detail: React.ReactNode, key: keyof TeacherShare) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 18, padding: "14px 18px", boxShadow: "0 3px 0 0 var(--kc-border)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15, color: share[key] ? "var(--kc-ink)" : "var(--kc-ink-muted)" }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{detail}</div>
      </div>
      <Toggle checked={share[key]} onChange={(v) => setShare(key, v)} label={`Share ${title.toLowerCase()}`} />
    </div>
  );

  return (
    <Screen>
      <AppHeader active="" right={<>{headerMid}{right}</>} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 18, minHeight: 0, overflowY: "auto" }}>
          <Headline
            size={40}
            title={linked ? `${teacherName} can see the record and set next week’s work.` : "Link a teacher to share the record."}
            lede="One teacher per profile. They read what you choose below and can assign pieces — they can’t change the mode, the target or the code."
          />

          {linked && teacher ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18, background: "var(--kc-mint-wash)", border: "3px solid var(--kc-mint)", borderRadius: 22, padding: "18px 22px" }}>
              <span style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", background: "var(--kc-mint)", color: "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 23, fontWeight: 600 }}>
                {teacher.name.replace(/^(Ms|Mr|Mrs|Mx|Dr)\.?\s+/i, "").slice(0, 1).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{teacher.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-mint-ink)" }}>
                  Linked since {dayMonth(teacher.createdAt)}{data.assignment?.note ? ` · last note ${stamp(data.assignment.updatedAt).charAt(0)}${stamp(data.assignment.updatedAt).slice(1).toLowerCase()}` : " · no note yet"}
                </div>
              </div>
              {confirmUnlink ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" size="pill" onClick={() => void unlink()} disabled={busy}>Remove</Button>
                  <Button variant="quiet" size="pill" onClick={() => setConfirmUnlink(false)}>Keep</Button>
                </div>
              ) : (
                <Button variant="secondary" size="pill" onClick={() => setConfirmUnlink(true)}>Remove the link</Button>
              )}
            </div>
          ) : (
            <Panel style={{ gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Enter the code your teacher gave you</div>
                  <Small>Six letters and numbers, read out at the lesson.</Small>
                </div>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="4K7MQ2" aria-label="Invite code" maxLength={8} style={{ ...inputStyle, width: 150, fontFamily: "var(--kc-font-display)", fontWeight: 600, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase" }} />
                <Button size="pill" icon="link" onClick={() => void linkByCode()} disabled={busy || code.trim().length < 4}>Link</Button>
              </div>
              <div style={{ height: 2, background: "var(--kc-hairline)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Or add your own teacher</div>
                  <Small>Makes a code they enter on their own device to open the teacher view.</Small>
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ms. Rivera" aria-label="Teacher’s name" style={{ ...inputStyle, width: 210 }} />
                <Button size="pill" variant="secondary" onClick={() => void create()} disabled={busy || !name.trim()}>Create</Button>
              </div>
              {error && <Small color="var(--kc-indigo-shadow)">{error}</Small>}
            </Panel>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <SectionLabel size="title">What {teacher ? teacherName : "they"} receive{teacher ? "s" : ""}</SectionLabel>
            {shareCard("Minutes, stops and levels", "The session log, like they’d write it in a notebook.", "log")}
            {shareCard("Accuracy and timing", "Notes right, early or late in milliseconds, tempo held.", "figures")}
            {shareCard("Your recordings", `Only the clips you keep. ${recordingsThisWeek === 0 ? "None" : recordingsThisWeek === 1 ? "One" : recordingsThisWeek} saved this week.`, "recordings")}
            {shareCard("Skill check results", share.skillChecks ? "Ear, reading and timing from the last check." : "Off. The reading level is set at the lesson.", "skillChecks")}
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <Button size="control" icon="check" onClick={() => router.push("/household")}>Save what’s shared</Button>
            <ActionNote>Applies from the next read, not before.</ActionNote>
          </div>
        </div>

        <Rail>
          {data.assignment?.note ? (
            <Sticky from={`${possessive} note this week`}>
              <NoteText text={data.assignment.note} />
              <div style={{ fontSize: 12, fontWeight: 900, color: "var(--kc-sun-ink)", marginTop: 6 }}>{stamp(data.assignment.updatedAt)}</div>
            </Sticky>
          ) : (
            <RailSection label={linked ? `${possessive} note this week` : "The note this week"}>
              <Small>{linked ? "No note yet. It appears on Today when one is written." : "Once a teacher is linked, their note appears here and on Today."}</Small>
            </RailSection>
          )}
          <RailSection label={linked ? "The teacher’s code" : "To invite a new teacher"}>
            {teacher ? (
              <>
                <CodeTiles code={teacher.inviteCode} />
                <Small>One-time code for their device. Read it out at the lesson — nothing is emailed.</Small>
              </>
            ) : (
              <Small>Add your own teacher on the left and a code appears here to read out at the lesson.</Small>
            )}
          </RailSection>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>What {teacher ? teacherName : "they"} never see{teacher ? "s" : ""}</div>
            <Small>
              {others.length ? `${others.join("’s and ")}’s profile, ` : "Other profiles, "}the household code, or anything from before the link was made{teacher ? ` in ${new Date(teacher.createdAt).toLocaleDateString("en-GB", { month: "long" })}` : ""}.
            </Small>
          </div>
        </Rail>
      </div>
    </Screen>
  );
}
