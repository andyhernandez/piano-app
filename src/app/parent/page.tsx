"use client";
import * as React from "react";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils/cn";
import { PinGate } from "@/components/parent/pin-gate";
import { SessionLog } from "@/components/parent/session-log";
import { WeeklyOverview } from "@/components/parent/weekly-overview";
import { ChildSettingsPanel } from "@/components/parent/child-settings-panel";
import { TeacherAccess } from "@/components/parent/teacher-access";
import { DigestPanel } from "@/components/parent/digest";
import { SyncPanel } from "@/components/parent/sync-panel";
import { DangerZone } from "@/components/parent/danger-zone";
import { PinSettings } from "@/components/parent/pin-settings";

/** Parent dashboard (§7), behind the grown-ups gate. */
export default function ParentPage() {
  return (
    <AppShell title="Grown-ups" wide>
      <PinGate>
        <Dashboard />
      </PinGate>
    </AppShell>
  );
}

function Dashboard() {
  const children = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setParentUnlocked = useAppStore((s) => s.setParentUnlocked);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Grown-ups</h1>
          <p className="text-sm text-muted-foreground">Session history, settings, teachers and your account.</p>
        </div>
        <Button variant="outline" onClick={() => setParentUnlocked(false)}><Lock className="h-5 w-5" /> Lock</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Choose a child">
        {children.map((c) => (
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
        <Button variant="ghost" asChild><Link href="/onboarding"><Plus className="h-5 w-5" /> Add a child</Link></Button>
      </div>

      {!child ? (
        <Card>
          <CardHeader>
            <CardTitle>No child profiles yet</CardTitle>
            <CardDescription>Create one to start practising; everything here fills in after the first session.</CardDescription>
          </CardHeader>
          <CardContent><Button asChild><Link href="/onboarding">Set up a child</Link></Button></CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="sessions" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="sessions"><SessionLog childId={child.id} /></TabsContent>
          <TabsContent value="overview"><WeeklyOverview child={child} /></TabsContent>
          <TabsContent value="settings"><ChildSettingsPanel child={child} /></TabsContent>
          <TabsContent value="teachers"><TeacherAccess child={child} /></TabsContent>
          <TabsContent value="account" className="flex flex-col gap-4">
            <PinSettings />
            <DigestPanel child={child} />
            <SyncPanel />
            <DangerZone child={child} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
