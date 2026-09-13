"use client";
import * as React from "react";
import { Pin, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { repo } from "@/lib/db/repo";
import { useAppStore } from "@/lib/store/app-store";
import { deriveWeights } from "@/lib/engine/weights";
import { currentScale } from "@/lib/engine/progression";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { parseScaleSlug, scaleName, scaleSlug } from "@/lib/music/scales";
import { newId } from "@/lib/utils/id";
import type { Assignment, BlockWeights, Child, ScaleId, Teacher } from "@/lib/types";
import { WeightsEditor } from "@/components/parent/weights-editor";
import { TEACHER_SCALE_OPTIONS } from "@/components/parent/helpers";
import { RoadmapEditor, rebuildMapProgress, sameRoadmap } from "./roadmap-editor";
import { RepertoirePicker } from "./repertoire-picker";

/** Loads (or drafts) the assignment for a child, then hands a stable initial state to the form. */
export function AssignmentEditor({ teacher, child }: { teacher: Teacher; child: Child }) {
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  React.useEffect(() => {
    let alive = true;
    repo.assignmentFor(child.id).then((a) => {
      if (!alive) return;
      setAssignment(a ?? { id: newId("asg"), childId: child.id, teacherId: teacher.id, scaleOverride: null, roadmapOverride: null, songIds: [], note: "", weightsOverride: null, updatedAt: new Date().toISOString() });
    });
    return () => { alive = false; };
  }, [child.id, teacher.id]);
  if (!assignment) return <p className="text-sm text-muted-foreground">Loading assignment…</p>;
  return <AssignmentForm key={assignment.id} teacher={teacher} child={child} initial={assignment} />;
}

const slugOrNull = (s: ScaleId | null) => (s ? scaleSlug(s) : null);

function AssignmentForm({ teacher, child, initial }: { teacher: Teacher; child: Child; initial: Assignment }) {
  const updateChild = useAppStore((s) => s.updateChild);
  const [scaleOverride, setScaleOverride] = React.useState<ScaleId | null>(child.scaleOverride);
  const [roadmap, setRoadmap] = React.useState<ScaleId[]>(child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP);
  const [songIds, setSongIds] = React.useState<string[]>(initial.songIds);
  const [weights, setWeights] = React.useState<BlockWeights | null>(child.settings.weightsOverride);
  const [note, setNote] = React.useState(initial.note);
  const [baseline, setBaseline] = React.useState({ songIds: initial.songIds, note: initial.note });
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const derived = React.useMemo(() => deriveWeights(child.skillProfile), [child.skillProfile]);

  const dirty =
    slugOrNull(scaleOverride) !== slugOrNull(child.scaleOverride) ||
    !sameRoadmap(roadmap, child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP) ||
    songIds.join() !== baseline.songIds.join() ||
    JSON.stringify(weights) !== JSON.stringify(child.settings.weightsOverride) ||
    note !== baseline.note;

  const roadmapScale = roadmap[Math.min(child.roadmapIndex, roadmap.length - 1)];

  const save = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const roadmapChanged = !sameRoadmap(roadmap, child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP);
    await updateChild(child.id, (c) => {
      const idx = Math.min(c.roadmapIndex, roadmap.length - 1);
      return {
        ...c,
        scaleOverride,
        roadmap: roadmapChanged ? roadmap : c.roadmap,
        roadmapIndex: roadmapChanged ? idx : c.roadmapIndex,
        mapProgress: roadmapChanged ? rebuildMapProgress(c.mapProgress, roadmap, idx) : c.mapProgress,
        unlocks: { ...c.unlocks, songs: Array.from(new Set([...c.unlocks.songs, ...songIds])) },
        settings: { ...c.settings, weightsOverride: weights },
      };
    });
    await repo.putAssignment({
      ...initial,
      teacherId: teacher.id,
      scaleOverride,
      roadmapOverride: sameRoadmap(roadmap, DEFAULT_ROADMAP) ? null : roadmap,
      songIds,
      note: note.trim(),
      weightsOverride: weights,
      updatedAt: now,
    });
    setBaseline({ songIds, note: note.trim() });
    setSavedAt(now);
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b-2 bg-background/90 px-4 py-2 backdrop-blur">
        <div className="text-sm text-muted-foreground">
          {dirty ? <Badge variant="secondary">Unsaved changes</Badge> : savedAt ? <>Saved {new Date(savedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</> : <>Last updated {new Date(initial.updatedAt).toLocaleDateString()}</>}
        </div>
        <Button onClick={save} disabled={busy || !dirty}><Save className="h-5 w-5" /> {busy ? "Saving…" : "Save assignment"}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Pin className="h-5 w-5" /> Scale of the week</CardTitle>
          <CardDescription>
            The roadmap currently puts {child.name} on <b>{scaleName(roadmapScale)}</b> (week {Math.min(child.roadmapIndex, roadmap.length - 1) + 1}). Pinning a scale keeps every block on it — and while a pin is set the roadmap does not advance when a Key is spent, so a pin is how you hold a scale for several weeks. Clear it to let the roadmap move again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="scale-pin">Pinned scale</Label>
          <Select value={scaleOverride ? scaleSlug(scaleOverride) : "roadmap"} onValueChange={(v) => setScaleOverride(v === "roadmap" ? null : parseScaleSlug(v))}>
            <SelectTrigger id="scale-pin" className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="roadmap">Follow the roadmap ({scaleName(roadmapScale)})</SelectItem>
              {TEACHER_SCALE_OPTIONS.map((o) => <SelectItem key={scaleSlug(o)} value={scaleSlug(o)}>{scaleName(o)}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm text-muted-foreground">Sessions will use <b>{scaleName(scaleOverride ?? currentScale({ ...child, scaleOverride: null, roadmap }))}</b> for scales, chords, lead sheets, improv and the map region.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
          <CardDescription>Twelve weeks, one scale each. Replace or reorder freely; regions the student already finished keep their progress.</CardDescription>
        </CardHeader>
        <CardContent><RoadmapEditor value={roadmap} currentIndex={Math.min(child.roadmapIndex, roadmap.length - 1)} onChange={setRoadmap} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repertoire</CardTitle>
          <CardDescription>Assign songs from the library or add your own with a link or an uploaded PDF. Lead sheets transpose to the scale of the week automatically.</CardDescription>
        </CardHeader>
        <CardContent><RepertoirePicker child={child} selected={songIds} onChange={setSongIds} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Block weights</CardTitle>
          <CardDescription>Share of each session per block for {child.name}. Parents see and can change the same override.</CardDescription>
        </CardHeader>
        <CardContent><WeightsEditor value={weights} derived={derived} onChange={setWeights} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Note to the student</CardTitle>
          <CardDescription>Shown once at the start of each session. Keep it short and kind; there is no reply channel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder={`e.g. Great job on G major last week, ${child.name}! This week try the LH scale slowly.`} />
          <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/240</p>
        </CardContent>
      </Card>
    </div>
  );
}
