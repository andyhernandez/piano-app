"use client";
import * as React from "react";
import type { Clef } from "@/lib/types";
import { midiToVexKey } from "@/lib/music/notes";
import { cn } from "@/lib/utils/cn";

export interface StaffNote {
  /** MIDI numbers (chord if >1). Empty = rest. */
  midis: number[];
  /** Duration in quarter beats: 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25 */
  beats: number;
  tie?: boolean;
  /** Visual state for live feedback. */
  state?: "current" | "correct" | "wrong";
}

export interface StaffProps {
  clef: Clef;
  /** VexFlow key signature e.g. "G", "Bb", "Am". */
  keySig?: string;
  timeSig?: string;
  /** Bars, each a list of notes. */
  bars: StaffNote[][];
  /** Second staff (grand staff) bars, bass clef. */
  bassBars?: StaffNote[][];
  preferFlats?: boolean;
  width?: number;
  barsPerLine?: number;
  className?: string;
  /** Hide the key signature and show accidentals inline (for very early readers). */
  noKeySig?: boolean;
}

function durationFor(beats: number): { duration: string; dots: number } {
  switch (beats) {
    case 4: return { duration: "w", dots: 0 };
    case 3: return { duration: "h", dots: 1 };
    case 2: return { duration: "h", dots: 0 };
    case 1.5: return { duration: "q", dots: 1 };
    case 1: return { duration: "q", dots: 0 };
    case 0.75: return { duration: "8", dots: 1 };
    case 0.5: return { duration: "8", dots: 0 };
    case 0.25: return { duration: "16", dots: 0 };
    default: return { duration: "q", dots: 0 };
  }
}

/**
 * VexFlow (SVG) staff renderer (§11). Renders one or two staves, wrapping bars onto lines.
 * Imported dynamically so VexFlow stays out of the initial bundle.
 */
export function Staff({ clef, keySig = "C", timeSig = "4/4", bars, bassBars, preferFlats = false, width, barsPerLine = 4, className, noKeySig }: StaffProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = React.useState(width ?? 720);

  React.useEffect(() => {
    if (width) return;
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setMeasured(Math.max(320, el.clientWidth)));
    ro.observe(el);
    setMeasured(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, [width]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    (async () => {
      const VF = await import("vexflow");
      if (cancelled) return;
      el.innerHTML = "";
      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, StaveTie, Beam, StaveConnector } = VF;
      const lines = Math.ceil(bars.length / barsPerLine);
      const grand = !!bassBars;
      const lineH = grand ? 230 : 130;
      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(measured, lines * lineH + 20);
      const ctx = renderer.getContext();
      ctx.setFont("Nunito", 12);
      const barW = (measured - 20) / barsPerLine;

      const makeNotes = (notes: StaffNote[], staffClef: Clef) => {
        const out: InstanceType<typeof StaveNote>[] = [];
        const ties: [number, number][] = [];
        notes.forEach((n, i) => {
          const { duration, dots } = durationFor(n.beats);
          let sn: InstanceType<typeof StaveNote>;
          if (!n.midis.length) {
            sn = new StaveNote({ keys: [staffClef === "treble" ? "b/4" : "d/3"], duration: duration + "r", clef: staffClef });
          } else {
            const keys = n.midis.map((m) => midiToVexKey(m, preferFlats));
            sn = new StaveNote({ keys, duration, clef: staffClef, autoStem: true });
            keys.forEach((k, ki) => {
              const acc = k.includes("#") ? "#" : k.includes("b/") ? "b" : null;
              if (acc) sn.addModifier(new Accidental(acc), ki);
            });
          }
          for (let d = 0; d < dots; d++) Dot.buildAndAttach([sn], { all: true });
          if (n.state === "current") sn.setStyle({ fillStyle: "#4f46e5", strokeStyle: "#4f46e5" });
          if (n.state === "correct") sn.setStyle({ fillStyle: "#06d6a0", strokeStyle: "#06d6a0" });
          if (n.state === "wrong") sn.setStyle({ fillStyle: "#ef476f", strokeStyle: "#ef476f" });
          if (n.tie && i + 1 < notes.length) ties.push([i, i + 1]);
          out.push(sn);
        });
        return { notes: out, ties };
      };

      const [num, den] = timeSig.split("/").map(Number);
      for (let li = 0; li < lines; li++) {
        const y = 10 + li * lineH;
        const lineBars = bars.slice(li * barsPerLine, (li + 1) * barsPerLine);
        let x = 10;
        let prevStave: InstanceType<typeof Stave> | null = null;
        let prevBass: InstanceType<typeof Stave> | null = null;
        lineBars.forEach((bar, bi) => {
          const first = bi === 0;
          const w = barW + (first ? 0 : 0);
          const stave = new Stave(x, y, w);
          if (first) {
            stave.addClef(clef);
            if (!noKeySig) stave.addKeySignature(keySig);
            if (li === 0) stave.addTimeSignature(timeSig);
          }
          stave.setContext(ctx).draw();
          const { notes, ties } = makeNotes(bar, clef);
          const voice = new Voice({ numBeats: num, beatValue: den }).setMode(Voice.Mode.SOFT);
          voice.addTickables(notes);
          const beams = Beam.generateBeams(notes);
          new Formatter().joinVoices([voice]).format([voice], w - (first ? 90 : 30));
          voice.draw(ctx, stave);
          beams.forEach((b) => b.setContext(ctx).draw());
          ties.forEach(([a, b]) => new StaveTie({ firstNote: notes[a], lastNote: notes[b], firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw());

          if (grand) {
            const bass = new Stave(x, y + 100, w);
            if (first) { bass.addClef("bass"); if (!noKeySig) bass.addKeySignature(keySig); if (li === 0) bass.addTimeSignature(timeSig); }
            bass.setContext(ctx).draw();
            const bbar = bassBars![li * barsPerLine + bi] ?? [{ midis: [], beats: num }];
            const { notes: bnotes, ties: bties } = makeNotes(bbar, "bass");
            const bvoice = new Voice({ numBeats: num, beatValue: den }).setMode(Voice.Mode.SOFT);
            bvoice.addTickables(bnotes);
            const bbeams = Beam.generateBeams(bnotes);
            new Formatter().joinVoices([bvoice]).format([bvoice], w - (first ? 90 : 30));
            bvoice.draw(ctx, bass);
            bbeams.forEach((b) => b.setContext(ctx).draw());
            bties.forEach(([a, b]) => new StaveTie({ firstNote: bnotes[a], lastNote: bnotes[b], firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw());
            if (first) {
              new StaveConnector(stave, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
              new StaveConnector(stave, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
            }
            prevBass = bass;
          }
          prevStave = stave;
          x += w;
        });
        void prevStave; void prevBass;
      }
    })().catch((e) => console.error("Staff render failed", e));
    return () => { cancelled = true; };
  }, [bars, bassBars, clef, keySig, timeSig, preferFlats, measured, barsPerLine, noKeySig]);

  return <div ref={ref} className={cn("staff text-foreground", className)} />;
}

/** Render a single note or chord on a mini staff (used by theory tasks & Flash). */
export function MiniStaff({ midis, clef, keySig = "C", preferFlats, className, state }: { midis: number[]; clef?: Clef; keySig?: string; preferFlats?: boolean; className?: string; state?: StaffNote["state"] }) {
  const c: Clef = clef ?? (Math.min(...midis) >= 60 ? "treble" : "bass");
  return <Staff clef={c} keySig={keySig} timeSig="4/4" bars={[[{ midis, beats: 4, state }]]} preferFlats={preferFlats} width={220} barsPerLine={1} className={className} noKeySig />;
}
