"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { repo } from "@/lib/db/repo";
import { useAppStore } from "@/lib/store/app-store";
import type { Child } from "@/lib/types";

/** Destructive actions, each behind a confirm dialog. */
export function DangerZone({ child }: { child: Child }) {
  const router = useRouter();
  const { parent, children, updateParent, refreshChildren, setActiveChild } = useAppStore();
  const [confirmChild, setConfirmChild] = React.useState(false);
  const [confirmAll, setConfirmAll] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const deleteChild = async () => {
    setBusy(true);
    await repo.deleteChild(child.id);
    if (parent) await updateParent({ childIds: parent.childIds.filter((id) => id !== child.id) });
    await refreshChildren();
    const remaining = children.filter((c) => c.id !== child.id);
    await setActiveChild(remaining[0]?.id ?? null);
    setBusy(false);
    setConfirmChild(false);
    if (!remaining.length) router.replace("/onboarding");
  };

  const eraseAll = async () => {
    setBusy(true);
    await repo.nuke();
    try { localStorage.removeItem("kc.theme"); } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger zone</CardTitle>
        <CardDescription>These cannot be undone. Progress, badges, recordings and settings are removed together.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3">
          <div>
            <div className="font-bold">Delete {child.name}&apos;s profile</div>
            <div className="text-sm text-muted-foreground">Removes this child, their sessions, recordings, assessments and assignments from this device.</div>
          </div>
          <Button variant="destructive" onClick={() => setConfirmChild(true)}><Trash2 className="h-5 w-5" /> Delete profile</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3">
          <div>
            <div className="font-bold">Erase all data on this device</div>
            <div className="text-sm text-muted-foreground">Every profile, the parent account, sync settings and teacher links. The app restarts at onboarding.</div>
          </div>
          <Button variant="destructive" onClick={() => { setTyped(""); setConfirmAll(true); }}><Trash2 className="h-5 w-5" /> Erase everything</Button>
        </div>
      </CardContent>

      <Dialog open={confirmChild} onOpenChange={setConfirmChild}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {child.name}&apos;s profile?</DialogTitle>
            <DialogDescription>{child.xp} XP, {child.unlocks.badges.length} badges and every session will be gone from this device. If cloud sync is on, the deletion syncs too.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmChild(false)}>Keep profile</Button>
            <Button variant="destructive" disabled={busy} onClick={deleteChild}>Yes, delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erase all data?</DialogTitle>
            <DialogDescription>Type <b>ERASE</b> to confirm. This clears the whole KeyCadence database on this device.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="erase-confirm" className="sr-only">Type ERASE to confirm</Label>
          <Input id="erase-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ERASE" autoComplete="off" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy || typed.trim().toUpperCase() !== "ERASE"} onClick={eraseAll}>Erase everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
