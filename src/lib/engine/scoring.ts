import type { BadgeId, MidiScore, InputMode, NoteEvent } from "../types";
import type { Exercise } from "../generator/sightreading";
import { noteTimeline } from "../generator/sightreading";

/**
 * Timing accuracy for a set of expected onsets vs. actual onsets (ms). Greedy nearest matching.
 * Returns per-hit deviation and a 0-100 score. Window defaults to ±120 ms for "hit".
 */
export function scoreTiming(expected: number[], actual: number[], windowMs = 120): { score: number; hits: number; misses: number; extras: number; deviations: number[] } {
  const used = new Set<number>();
  const deviations: number[] = [];
  let hits = 0;
  for (const e of expected) {
    let best = -1;
    let bestDelta = Infinity;
    actual.forEach((a, i) => {
      if (used.has(i)) return;
      const d = Math.abs(a - e);
      if (d < bestDelta) { bestDelta = d; best = i; }
    });
    if (best >= 0 && bestDelta <= windowMs * 2) {
      used.add(best);
      deviations.push(actual[best] - e);
      if (bestDelta <= windowMs) hits++;
    }
  }
  const misses = expected.length - deviations.length;
  const extras = actual.length - used.size;
  // Score: hit ratio weighted by precision, minus extras penalty.
  const precision = deviations.length ? 1 - Math.min(1, avgAbs(deviations) / (windowMs * 2)) : 0;
  const hitRatio = expected.length ? hits / expected.length : 0;
  const matchedRatio = expected.length ? deviations.length / expected.length : 0;
  let score = 100 * (0.6 * hitRatio + 0.25 * matchedRatio + 0.15 * precision);
  score -= Math.min(30, extras * 5);
  return { score: clamp(Math.round(score)), hits, misses, extras, deviations };
}

function avgAbs(a: number[]) { return a.reduce((s, v) => s + Math.abs(v), 0) / a.length; }
function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

/**
 * Scale Gym scoring (§4A): compare played note-ons against the expected run.
 * accuracy = longest in-order match fraction; evenness = 1 - CV of inter-onset intervals.
 */
export function scoreScaleRun(expected: number[], played: NoteEvent[], bpm: number, inputMode: InputMode): MidiScore {
  const ons = played.filter((n) => n.kind === "on");
  const midis = ons.map((n) => n.midi);
  // Longest common subsequence (in order) between expected and played.
  const lcs = lcsLength(expected, midis);
  const accuracy = expected.length ? lcs / expected.length : 0;
  const wrongNotes = Math.max(0, midis.length - lcs);
  const intervals: number[] = [];
  for (let i = 1; i < ons.length; i++) intervals.push(ons[i].time - ons[i - 1].time);
  let evenness = 0;
  let tempoMatch = 0;
  if (intervals.length >= 3) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length);
    evenness = clamp(1 - sd / mean, 0, 1);
    const target = 60_000 / bpm;
    tempoMatch = clamp(1 - Math.abs(mean - target) / target, 0, 1);
  }
  const score = Math.round(100 * (0.55 * accuracy + 0.3 * evenness + 0.15 * tempoMatch) - Math.min(20, wrongNotes * 2));
  const badge: BadgeId | null = accuracy >= 0.95 && evenness >= 0.7 && wrongNotes <= 1 ? "clean-scale" : null;
  return { score: clamp(score), components: { accuracy: Math.round(accuracy * 100), evenness: Math.round(evenness * 100), tempo: Math.round(tempoMatch * 100), wrongNotes }, badge, inputMode };
}

export function lcsLength(a: number[], b: number[]): number {
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Sight-reading scoring (§11): continuity 60%, pitch 25%, rhythm 15%.
 * Continuity = fraction of expected notes where playback kept moving forward within 1 beat of the exercise tempo.
 * `startMs` is when the exercise began (first expected onset at beat 0).
 */
export function scoreReading(ex: Exercise, played: NoteEvent[], startMs: number, inputMode: InputMode): MidiScore {
  const beatMs = 60_000 / ex.tempo;
  const timeline = noteTimeline(ex);
  const ons = played.filter((n) => n.kind === "on").map((n) => ({ midi: n.midi, t: n.time - startMs }));
  if (!ons.length) {
    return { score: 0, components: { continuity: 0, pitch: 0, rhythm: 0 }, badge: null, inputMode };
  }
  // Continuity: walk expected notes; for each, look for any played note within [expected - 1 beat, expected + 1 beat].
  let moving = 0;
  let pitchHits = 0;
  const deviations: number[] = [];
  let cursor = 0;
  for (const n of timeline) {
    const expT = n.beat * beatMs;
    let found = -1;
    for (let i = cursor; i < ons.length; i++) {
      if (ons[i].t < expT - beatMs) continue;
      if (ons[i].t > expT + beatMs) break;
      found = i;
      break;
    }
    if (found >= 0) {
      moving++;
      cursor = found + 1;
      if (ons[found].midi === n.midi || ons[found].midi % 12 === n.midi % 12) pitchHits++;
      deviations.push(Math.abs(ons[found].t - expT));
    }
  }
  const continuity = timeline.length ? moving / timeline.length : 0;
  const pitch = timeline.length ? pitchHits / timeline.length : 0;
  const rhythm = deviations.length ? clamp(1 - avgAbs(deviations) / beatMs, 0, 1) : 0;
  const score = Math.round(100 * (0.6 * continuity + 0.25 * pitch + 0.15 * rhythm));
  const badge: BadgeId | null = continuity >= 0.9 ? "no-stop-reading" : null;
  return { score: clamp(score), components: { continuity: Math.round(continuity * 100), pitch: Math.round(pitch * 100), rhythm: Math.round(rhythm * 100) }, badge, inputMode };
}

/** Rhythm Lab scoring wrapper. */
export function scoreRhythm(expectedMs: number[], actualMs: number[], inputMode: InputMode): MidiScore {
  const r = scoreTiming(expectedMs, actualMs);
  const badge: BadgeId | null = r.hits === expectedMs.length && r.extras === 0 && expectedMs.length >= 4 ? "steady-pulse" : null;
  return { score: r.score, components: { hits: r.hits, misses: r.misses, extras: r.extras, avgDeviationMs: r.deviations.length ? Math.round(avgAbs(r.deviations)) : 0 }, badge, inputMode };
}

/** Pulse assessment: drift while tapping along to a click. */
export function scorePulseDrift(expectedMs: number[], actualMs: number[]): number {
  const r = scoreTiming(expectedMs, actualMs, 100);
  return r.score;
}

/** Star value for a badge-bearing score. */
export function starsFor(score: MidiScore | undefined): number {
  return score?.badge ? 1 : 0;
}
