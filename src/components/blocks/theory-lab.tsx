"use client";
import * as React from "react";
import { Ear, Music } from "lucide-react";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useSoundingKeys } from "./shared/use-sounding-keys";
import { ChordsTab } from "./theory-lab/chords-tab";
import { EarEyeTab } from "./theory-lab/ear-eye-tab";
import { earEyeScore, shouldLevelUp, statsFor, type RoundRecord } from "./theory-lab/ear-eye";

const clampLevel = (n: number) => Math.max(1, Math.min(5, Math.round(n || 1)));

/**
 * Block D — Theory & Chord Lab (§4D). Tab 1 explores the primary triads; Tab 2 is the linked ear-eye task
 * that feeds the Chord Detective badge and bumps `theoryLevel` at 80%+ over 6+ rounds.
 */
export function TheoryLabBlock(props: BlockComponentProps) {
  const { scale, child, inputMode } = props;
  const level = clampLevel(child.settings.theoryLevel);
  const ear = child.skillProfile?.ear ?? 50;
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pushCelebration = useAppStore((s) => s.pushCelebration);
  const { audio } = useAudio();
  const { mode, label } = useInput();
  const keys = useSoundingKeys();
  const [tab, setTab] = React.useState("chords");
  const [history, setHistory] = React.useState<RoundRecord[]>([]);
  const bumped = React.useRef(false);

  const onRound = (r: RoundRecord) => {
    const next = [...history, r];
    setHistory(next);
    if (!bumped.current && shouldLevelUp(next, level)) {
      bumped.current = true;
      void updateSettings(child.id, { theoryLevel: level + 1 });
      pushCelebration({ kind: "levelup", title: "Theory level up!", detail: `You're a level ${level + 1} chord detective now.`, emoji: "🧪" });
      audio.stinger("levelup");
    }
  };

  const onDone = () => {
    const stats = statsFor(history);
    props.onComplete({
      midiScore: history.length ? earEyeScore(history, inputMode) : undefined,
      details: {
        level,
        leveledUp: bumped.current,
        lastTab: tab,
        rounds: stats.rounds,
        points: stats.points,
        chordsRight: stats.chordsRight,
        intervalsRight: stats.intervalsRight,
        history,
      },
    });
  };

  const headerRight = (
    <>
      <InputBadge mode={mode} label={label} />
      <Badge variant="secondary">Level {level}</Badge>
    </>
  );

  return (
    <BlockShell type="theory" remainingSec={props.remainingSec} plannedSec={props.plannedSec} onDone={onDone} onAddMinute={() => props.addSeconds(60)} headerRight={headerRight}>
      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="chords" className="flex-1 sm:flex-none"><Music className="h-4 w-4" /> Chords</TabsTrigger>
          <TabsTrigger value="ear-eye" className="flex-1 sm:flex-none"><Ear className="h-4 w-4" /> Ear + Eye</TabsTrigger>
        </TabsList>
        <TabsContent value="chords">
          <ChordsTab scale={scale} level={level} onNoteOn={keys.onNoteOn} onNoteOff={keys.onNoteOff} />
        </TabsContent>
        <TabsContent value="ear-eye">
          <EarEyeTab scale={scale} level={level} ear={ear} inputMode={inputMode} history={history} onRound={onRound} onNoteOn={keys.onNoteOn} onNoteOff={keys.onNoteOff} />
        </TabsContent>
      </Tabs>
    </BlockShell>
  );
}
