"use client";
import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { GraduationCap, LogOut } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { repo } from "@/lib/db/repo";
import { cn } from "@/lib/utils/cn";
import type { Child, Teacher } from "@/lib/types";
import { SessionLog } from "@/components/parent/session-log";
import { AssignmentEditor } from "@/components/teacher/assignment-editor";

const ACTIVE_KEY = "teacher.activeId";

/** Teacher mode (§7): link with an invite code, then edit assignments and read the session log. */
export default function TeacherPage() {
  const [teacher, setTeacher] = React.useState<Teacher | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const id = await repo.getKV<string>(ACTIVE_KEY);
      const t = id ? (await repo.listTeachers()).find((x) => x.id === id) ?? null : null;
      if (!alive) return;
      setTeacher(t);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    await repo.setKV(ACTIVE_KEY, null);
    setTeacher(null);
  };

  return (
    <AppShell title="Teacher" wide>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !teacher ? (
        <CodeEntry onLinked={async (t) => { await repo.setKV(ACTIVE_KEY, t.id); setTeacher(t); }} />
      ) : (
        <TeacherHome teacher={teacher} onTeacherChange={setTeacher} onSignOut={signOut} />
      )}
    </AppShell>
  );
}

function CodeEntry({ onLinked }: { onLinked: (t: Teacher) => Promise<void> }) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 6) { setError("Codes are 6 letters and numbers."); return; }
    setBusy(true);
    const t = await repo.teacherByCode(clean);
    setBusy(false);
    if (!t) { setError("That code isn't recognised on this device. Ask the family to generate one in Grown-ups → Teachers, and to turn on cloud sync if you are on your own device."); return; }
    setError(null);
    await onLinked(t);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-6">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted"><GraduationCap className="h-7 w-7 text-muted-foreground" /></div>
          <CardTitle className="text-3xl">Teacher mode</CardTitle>
          <CardDescription>Enter the 6-character invite code the family shared with you.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="invite-code" className="sr-only">Invite code</Label>
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 6)); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="h-16 text-center font-mono text-3xl font-bold tracking-[0.4em]"
            aria-invalid={!!error}
          />
          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
          <Button size="lg" onClick={submit} disabled={busy || code.length < 6}>Link to student</Button>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Not a teacher? <Link href="/" className="font-bold text-primary underline-offset-4 hover:underline">Back home</Link>
      </p>
    </div>
  );
}

function TeacherHome({ teacher, onTeacherChange, onSignOut }: { teacher: Teacher; onTeacherChange: (t: Teacher) => void; onSignOut: () => void }) {
  const [name, setName] = React.useState(teacher.name);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const idsKey = teacher.childIds.join(",");
  const kids = useLiveQuery(async () => {
    const rows = await Promise.all(idsKey.split(",").filter(Boolean).map((id) => repo.getChild(id)));
    return rows.filter((c): c is Child => !!c);
  }, [idsKey]);
  const child = kids?.find((c) => c.id === selectedId) ?? kids?.[0] ?? null;

  const saveName = async () => {
    const next = { ...teacher, name: name.trim() };
    await repo.putTeacher(next);
    onTeacherChange(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Teacher mode</h1>
          <p className="text-sm text-muted-foreground">Invite code <span className="font-mono font-bold tracking-widest">{teacher.inviteCode}</span></p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="teacher-name">Your display name</Label>
            <div className="flex gap-2">
              <Input id="teacher-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ms. Rivera" className="w-48" />
              <Button variant="outline" onClick={saveName} disabled={name.trim() === teacher.name}>Save</Button>
            </div>
          </div>
          <Button variant="ghost" onClick={onSignOut}><LogOut className="h-5 w-5" /> Leave teacher mode</Button>
        </div>
      </div>

      {!kids ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : kids.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No students linked</CardTitle>
            <CardDescription>The family may have removed access, or the child profile isn&apos;t on this device yet. Ask them for a fresh code.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Choose a student">
            {kids.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={child?.id === c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn("flex h-12 items-center gap-2 rounded-2xl border-2 px-4 font-bold transition-colors", child?.id === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
              >
                <span aria-hidden className="text-xl">{c.avatar}</span> {c.name}
              </button>
            ))}
          </div>
          {child && (
            <Tabs defaultValue="assignment" className="w-full">
              <TabsList>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="sessions">Session log</TabsTrigger>
              </TabsList>
              <TabsContent value="assignment"><AssignmentEditor teacher={teacher} child={child} /></TabsContent>
              <TabsContent value="sessions"><SessionLog childId={child.id} /></TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
