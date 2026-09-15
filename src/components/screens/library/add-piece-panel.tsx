"use client";
import * as React from "react";
import { Panel, SectionLabel, Button, Choice, Icon, keyLabel } from "@/components/ds";
import type { PitchClass, ScaleMode, Song, SongLevel } from "@/lib/types";
import { scaleSlug } from "@/lib/music/scales";
import { newId } from "@/lib/utils/id";
import { TextField, SelectField, TextArea, Field } from "./fields";
import { parseChart, chartProblem } from "./pieces";

const KEYS: PitchClass[] = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const LEVELS = ["1", "2", "3", "4", "5"] as const;
type LevelText = (typeof LEVELS)[number];
type ModeText = "Major" | "Minor";

/**
 * The inline form for a piece of your own: a title, its key and level, a link to the score and, if you know it,
 * the chords as roman numerals per bar so the app can play them in any key.
 */
export function AddPiecePanel({ onSave, onCancel }: { onSave: (song: Song) => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState("");
  const [key, setKey] = React.useState<PitchClass>("C");
  const [mode, setMode] = React.useState<ModeText>("Major");
  const [level, setLevel] = React.useState<LevelText>("2");
  const [link, setLink] = React.useState("");
  const [chart, setChart] = React.useState("");
  const [problem, setProblem] = React.useState<string | null>(null);

  const scaleMode: ScaleMode = mode === "Major" ? "major" : "natural-minor";
  const bars = parseChart(chart);

  const save = () => {
    const name = title.trim();
    if (!name) { setProblem("Give the piece a title."); return; }
    const bad = chartProblem(bars);
    if (bad) { setProblem(bad); return; }
    const href = link.trim();
    if (href && !/^https?:\/\//i.test(href)) { setProblem("The link needs to start with http:// or https://."); return; }
    onSave({
      id: newId("song"),
      title: name,
      level: Number(level) as SongLevel,
      genre: "pop",
      unlockedByRegion: scaleSlug({ key, mode: scaleMode }),
      key,
      mode: scaleMode,
      chart: bars,
      leadSheetLevels: bars.length ? [1, 2, 3, 4] : [],
      externalLink: href || undefined,
      isCustom: true,
    });
  };

  return (
    <Panel padding="panel" state="current" style={{ flex: "none", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Add a piece</span>
        <SectionLabel size="meta">YOUR OWN · {keyLabel(key, scaleMode)}</SectionLabel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 14 }}>
        <Field label="Title"><TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the piece is called" autoFocus /></Field>
        <Field label="Link to the score (optional)"><TextField value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" /></Field>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 22, flexWrap: "wrap" }}>
        <Field label="Key" style={{ width: 96 }}>
          <SelectField value={key} onChange={(e) => setKey(e.target.value as PitchClass)}>
            {KEYS.map((k) => <option key={k} value={k}>{k.replace("#", "♯").replace("b", "♭")}</option>)}
          </SelectField>
        </Field>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel size="meta">MODE</SectionLabel>
          <Choice<ModeText> options={["Major", "Minor"]} value={mode} onChange={setMode} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel size="meta">LEVEL</SectionLabel>
          <Choice<LevelText> options={[...LEVELS]} value={level} onChange={setLevel} />
        </div>
      </div>
      <Field label="Chords, one bar per | (optional)">
        <TextArea value={chart} onChange={(e) => setChart(e.target.value)} placeholder="I | IV | V | I  — roman numerals, lower case for minor, two chords in a bar with a space" spellCheck={false} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{bars.length ? `${bars.length} ${bars.length === 1 ? "bar" : "bars"}. With chords, the piece plays back in any key.` : "Without chords, the piece opens its link and counts in your Pieces block."}</span>
        {problem && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--kc-clay)" }}><Icon name="error" size={18} />{problem}</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Button variant="secondary" size="control" onClick={onCancel}>Cancel</Button>
          <Button size="control" onClick={save}>Save piece</Button>
        </div>
      </div>
    </Panel>
  );
}
