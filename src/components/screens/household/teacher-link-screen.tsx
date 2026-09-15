"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, SectionLabel, Avatar, Button, Toggle, Tempo } from "@/components/ds";
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

const inputStyle: React.CSSProperties = { height: 40, padding: "0 14px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)", border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", fontSize: 15, outline: "none", minWidth: 0 };

/** Split a note like "…at ♩72…" so the tempo glyph renders from the music font. */
function NoteText({ text }: { text: string }) {
  const parts = text.split(/(♩\d{2,3})/g);
  return <>{parts.map((p, i) => (/^♩\d+$/.test(p) ? <Tempo key={i} bpm={Number(p.slice(1))} size={14} /> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

function blankAssignment(childId: string, teacherId: string): Assignment {
  return { id: newId("asg"), childId, teacherId, scaleOverride: null, roadmapOverride: null, songIds: [], note: "", weightsOverride: null, updatedAt: new Date().toISOString() };
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
  const upper = teacherName.toUpperCase();

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

  const right = (
    <>
      <SectionLabel>HOUSEHOLD · TEACHER LINK</SectionLabel>
      <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{child.name}&apos;s profile</span>
    </>
  );

  if (locked) {
    return (
      <Screen>
        <AppHeader active="" right={right} />
        <CodePrompt title="The teacher link sits behind the code" lede="Who reads the record, and what they receive, is the household's to decide." />
      </Screen>
    );
  }

  const shareCard = (title: string, detail: React.ReactNode, key: keyof TeacherShare) => (
    <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "14px 22px", display: "flex", alignItems: "center", gap: 22 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: share[key] ? "var(--kc-ink)" : "var(--kc-ink-muted)" }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{detail}</div>
      </div>
      <Toggle checked={share[key]} onChange={(v) => setShare(key, v)} label={`Share ${title.toLowerCase()}`} />
    </div>
  );

  return (
    <Screen>
      <AppHeader active="" right={right} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 336px" }}>
        <div style={{ padding: "32px 34px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>
              {linked ? `${teacherName} can see the record and set next week's work.` : "Link a teacher to share the record."}
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>
              One teacher per profile. They read what you choose below, and they can assign — they can&apos;t change the mode, the target or the code.
            </p>
          </div>

          {linked && teacher ? (
            <div style={{ background: "var(--kc-mint-wash)", border: "1px solid var(--kc-mint-edge)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", alignItems: "center", gap: 22 }}>
              <Avatar initial={teacher.name.replace(/^(Ms|Mr|Mrs|Mx|Dr)\.?\s+/i, "").slice(0, 1).toUpperCase()} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 600 }}>{teacher.name}</div>
                <div style={{ fontSize: 14, color: "var(--kc-ink-muted)" }}>
                  Linked since {dayMonth(teacher.createdAt)} · invite code <span style={{ fontFamily: "var(--kc-font-mono)" }}>{teacher.inviteCode}</span>{data.assignment?.note ? ` · last note ${stamp(data.assignment.updatedAt).charAt(0)}${stamp(data.assignment.updatedAt).slice(1).toLowerCase()}` : " · no note yet"}
                </div>
              </div>
              {confirmUnlink ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" size="control" onClick={() => void unlink()} disabled={busy} style={{ color: "var(--kc-clay)", borderColor: "var(--kc-clay)" }}>Remove</Button>
                  <Button variant="quiet" size="control" onClick={() => setConfirmUnlink(false)}>Keep</Button>
                </div>
              ) : (
                <Button variant="secondary" size="control" onClick={() => setConfirmUnlink(true)}>Remove the link</Button>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>Enter the code your teacher gave you</div>
                  <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Six letters and numbers, read out at the lesson.</div>
                </div>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="4K7MQ2" aria-label="Invite code" maxLength={8} style={{ ...inputStyle, width: 140, fontFamily: "var(--kc-font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }} />
                <Button size="control" icon="link" onClick={() => void linkByCode()} disabled={busy || code.trim().length < 4}>Link</Button>
              </div>
              <div style={{ height: 1, background: "var(--kc-border)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>Or add your own teacher</div>
                  <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Makes a code they enter on their own device to open the teacher view.</div>
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ms. Rivera" aria-label="Teacher's name" style={{ ...inputStyle, width: 200 }} />
                <Button size="control" variant="secondary" onClick={() => void create()} disabled={busy || !name.trim()}>Create</Button>
              </div>
              {error && <span style={{ fontSize: 14, color: "var(--kc-clay)" }}>{error}</span>}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>WHAT {upper} RECEIVES</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shareCard("Minutes, blocks and levels", "The session log, as they'd write it in a notebook.", "log")}
              {shareCard("Accuracy and timing figures", "Notes right, drift in milliseconds, tempo held.", "figures")}
              {shareCard("Your recordings", `Only the clips you keep. ${recordingsThisWeek === 0 ? "None" : recordingsThisWeek === 1 ? "One" : recordingsThisWeek} saved this week.`, "recordings")}
              {shareCard("Skill check results", share.skillChecks ? "Ear, reading and timing from the last check." : "Off. The reading level is set at the lesson.", "skillChecks")}
            </div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <Button icon="check" onClick={() => router.push("/household")}>Save what&apos;s shared</Button>
            <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Changes apply to the next read, not retroactively.</span>
          </div>
        </div>

        <div style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 26, minHeight: 0, overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>{linked ? `${upper}'S NOTE THIS WEEK` : "THE NOTE THIS WEEK"}</SectionLabel>
            {data.assignment?.note ? (
              <>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--kc-ink)" }}><NoteText text={data.assignment.note} /></p>
                <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--kc-ink-faint)" }}>{stamp(data.assignment.updatedAt)}</span>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{linked ? "No note yet. It appears on Today when one is written." : "Once a teacher is linked, their note appears here and on Today."}</p>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>{linked ? "THE TEACHER'S CODE" : "TO INVITE A NEW TEACHER"}</SectionLabel>
            {teacher ? (
              <>
                <div style={{ background: "var(--kc-base)", border: "1px solid var(--kc-border)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <SectionLabel size="meta">INVITE CODE</SectionLabel>
                  <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, letterSpacing: "0.08em" }}>{teacher.inviteCode}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>Opens the teacher view on their device. Read it out at the lesson — nothing is emailed.</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>Add your own teacher on the left and a code appears here to read out at the lesson.</p>
            )}
          </div>
          <div style={{ marginTop: "auto", borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>WHAT {upper} NEVER SEES</SectionLabel>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>
              {others.length ? `${others.join("'s and ")}'s profile, ` : "Other profiles, "}the household code, or anything from before the link was made{teacher ? ` in ${new Date(teacher.createdAt).toLocaleDateString("en-GB", { month: "long" })}` : ""}.
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}
