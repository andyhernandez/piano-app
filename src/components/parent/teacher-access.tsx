"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, GraduationCap, UserMinus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { repo } from "@/lib/db/repo";
import { newId } from "@/lib/utils/id";
import type { Child, Teacher } from "@/lib/types";
import { makeInviteCode } from "./helpers";

/** Teacher access for one child (§7): list linked teachers, revoke, and mint invite codes. */
export function TeacherAccess({ child }: { child: Child }) {
  const teachers = useLiveQuery(() => repo.listTeachers(), []);
  const linked = (teachers ?? []).filter((t) => t.childIds.includes(child.id));
  const [freshCode, setFreshCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const generate = async () => {
    let code = makeInviteCode();
    while (await repo.teacherByCode(code)) code = makeInviteCode();
    const t: Teacher = { id: newId("tch"), name: "", inviteCode: code, childIds: [child.id], createdAt: new Date().toISOString() };
    await repo.putTeacher(t);
    setFreshCode(code);
    setCopied(false);
  };

  const remove = async (t: Teacher) => {
    const next = { ...t, childIds: t.childIds.filter((id) => id !== child.id) };
    await repo.putTeacher(next);
    if (freshCode === t.inviteCode) setFreshCode(null);
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable; code is on screen */ }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Teachers with access to {child.name}</CardTitle>
          <CardDescription>A teacher can pin the scale of the week, edit the roadmap, assign songs, adjust block weights and leave a note. They see the same session log you do. No chat, no messaging.</CardDescription>
        </CardHeader>
        <CardContent>
          {!teachers ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher is linked yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linked.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3">
                  <div>
                    <div className="font-bold">{t.name || <span className="text-muted-foreground">Teacher hasn&apos;t set a name yet</span>}</div>
                    <div className="text-xs text-muted-foreground">Code <span className="font-mono font-bold tracking-widest">{t.inviteCode}</span> · linked {new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => remove(t)}><UserMinus className="h-4 w-4" /> Remove access</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invite a teacher</CardTitle>
          <CardDescription>Generate a code and share it in person or by text. The teacher opens KeyCadence, taps <b>Teacher</b> on the start screen (or visits <span className="font-mono">/teacher</span>) and enters the code. Codes only work on devices that share this data, so turn on cloud sync if the teacher uses their own device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="secondary" onClick={generate}>Generate invite code</Button>
          {freshCode && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-secondary bg-secondary/20 p-4">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Share this code</div>
                <div className="font-mono text-3xl font-bold tracking-[0.3em]">{freshCode}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(freshCode)}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
