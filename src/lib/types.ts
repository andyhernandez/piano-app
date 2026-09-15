/**
 * KeyCadence domain types. This file is the contract between the engine, the UI blocks,
 * persistence, and sync. Keep it dependency-free.
 */

// ---------- Music ----------

export type PitchClass = "C" | "C#" | "Db" | "D" | "D#" | "Eb" | "E" | "F" | "F#" | "Gb" | "G" | "G#" | "Ab" | "A" | "A#" | "Bb" | "B";
export type ScaleMode = "major" | "natural-minor" | "harmonic-minor";
export type Hand = "RH" | "LH";
export type Clef = "treble" | "bass";

/** A scale identity, e.g. { key: "Bb", mode: "major" }. */
export interface ScaleId {
  key: PitchClass;
  mode: ScaleMode;
}

export interface Triad {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  roman: string; // "I", "ii", "IV", "V", "vi" ...
  root: PitchClass;
  quality: "major" | "minor" | "diminished" | "augmented";
  /** MIDI note numbers for root position, 4th octave. */
  midi: [number, number, number];
}

export interface Scale extends ScaleId {
  /** Display name like "B♭ major". */
  name: string;
  /** Pitch classes ascending from the tonic (7 entries). */
  notes: PitchClass[];
  /** MIDI numbers for one octave ascending from tonic in octave 4 (8 entries incl. octave). */
  midiOneOctave: number[];
  /** Fingering for two octaves ascending, RH then LH (15 entries each). */
  fingeringRH: number[];
  fingeringLH: number[];
  /** Indices (0-based, into 2-octave ascending sequence) where the thumb crosses under for RH. */
  thumbUnderRH: number[];
  thumbUnderLH: number[];
  /** Number of sharps (positive) or flats (negative) in the key signature. */
  accidentals: number;
  /** VexFlow key signature string, e.g. "Bb", "Am". */
  vexKey: string;
  triads: Triad[];
}

// ---------- Input ----------

export type InputMode = "midi" | "mic" | "timer";

export interface NoteEvent {
  /** MIDI note number 0-127. */
  midi: number;
  /** 0-1. Mic input reports 1. */
  velocity: number;
  /** High-resolution timestamp in ms (performance.now() domain). */
  time: number;
  kind: "on" | "off";
  /** Detection confidence 0-1 (mic). MIDI is always 1. */
  confidence: number;
}

/** A rhythm-only onset (tap pad, MIDI key, or mic onset). */
export interface OnsetEvent {
  time: number;
  source: InputMode | "tap";
}

// ---------- Profile & progression ----------

export interface SkillProfile {
  ear: number; // 0-100
  eye: number;
  pulse: number;
  assessedAt: string; // ISO datetime
}

export type BlockType = "scales" | "rhythm" | "reading" | "theory" | "repertoire" | "improv";

export const BLOCK_ORDER: BlockType[] = ["scales", "rhythm", "reading", "theory", "repertoire", "improv"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  scales: "Warm-up & Scale Gym",
  rhythm: "Rhythm Lab",
  reading: "Sight Reading Launchpad",
  theory: "Theory & Chord Lab",
  repertoire: "Repertoire & Lead Sheets",
  improv: "Creative Sandbox",
};

/** Fraction of session time per block. Sums to 1. */
export type BlockWeights = Record<BlockType, number>;

export interface Streak {
  current: number;
  best: number;
  freezes: number; // 0-2
  /** Last date key that counted toward the streak (practice day or freeze). */
  lastActiveDate: string | null;
  /** Date keys on which a freeze was automatically consumed. */
  freezeDates: string[];
  /** Consecutive-days counter used to award a new freeze every 5 days. */
  daysSinceFreezeEarned: number;
}

export interface MapProgress {
  regionId: string; // == scale slug, e.g. "C-major"
  status: "locked" | "unlocked" | "complete";
  unlockedAt?: string;
  completedAt?: string;
  /** Rhythm Lab level reached inside this region (trail progress). */
  rhythmTrail: number;
  /** Weekly bonus challenge completed for this region. */
  chestOpened: boolean;
}

export interface ChildSettings {
  sessionMinutes: number; // 15-60
  practiceDaysPerWeek: number; // default 5
  /** Parent/teacher override of derived block weights. Null = derive from profile. */
  weightsOverride: BlockWeights | null;
  quietHours: { start: string; end: string } | null; // "HH:MM"
  inputModePreference: InputMode | "auto";
  micCalibration: { noiseFloor: number; confidenceThreshold: number } | null;
  readingLevel: number; // 1-10 (sight-reading ladder)
  rhythmLevel: number; // 1-10
  theoryLevel: number; // 1-5
  /** Consecutive "No-Stop" sessions at current reading level. */
  noStopStreak: number;
  sightReadingFactoryLink: string | null;
  /** Guided shows one next action; Own plan shows the whole editable queue and the numbers. */
  mode: "guided" | "own";
  /** Practice ends at the session length. Advisory, never a lock. */
  hardStop: boolean;
  /** Planned rest days, 0 = Monday … 6 = Sunday. */
  restDays: number[];
  /** Two bars of click before an exercise that measures timing. */
  countIn: boolean;
  /**
   * Own-plan queue order, persisted from the Today screen. The full ordered list of today's blocks; a type may
   * appear twice (a second Pieces block) or be missing (skipped). Undefined = BLOCK_ORDER.
   */
  queueOrder?: BlockType[];
  /** Blocks added beyond the standard six, in the order they were added. */
  extraBlocks?: BlockType[];
  /** Pieces the player put into today's Pieces block from the Library ("Add to today"). */
  pinnedSongIds?: string[];
}

/** What a linked teacher receives from this profile. */
export interface TeacherShare {
  log: boolean;
  figures: boolean;
  recordings: boolean;
  skillChecks: boolean;
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  avatar: string; // emoji or companion-key
  companion: CompanionState;
  skillProfile: SkillProfile | null; // null until onboarding assessment
  xp: number;
  stars: number;
  keys: number;
  streak: Streak;
  /** Index into the roadmap (0-based week). */
  roadmapIndex: number;
  /** Teacher/parent pin: overrides roadmap scale when set. */
  scaleOverride: ScaleId | null;
  roadmap: ScaleId[];
  mapProgress: MapProgress[];
  unlocks: Unlocks;
  settings: ChildSettings;
  createdAt: string;
  /** Week keys in which a full practice week (>= practiceDaysPerWeek sessions) was completed and a Key awarded. */
  completedWeeks: string[];
  /** Region ids for which the weekly bonus challenge has been claimed, keyed by week. */
  weeklyChallenges: Record<string, { regionId: string; tasks: Record<string, boolean>; claimed: boolean }>;
  /** Age band chosen at first run; drives defaults such as the hard stop. */
  ageBand?: "child" | "adult";
  /** One line shown under the name in the household: "11 · two years of lessons". */
  blurb?: string;
  teacherShare?: TeacherShare;
}

export interface CompanionState {
  species: "note-sprite" | "metronome-mouse" | "clef-cat" | "drum-dragon";
  name: string;
  level: number;
  outfit: string; // cosmetic id
}

export interface Unlocks {
  songs: string[];
  outfits: string[];
  mapThemes: string[];
  grooves: string[];
  keyboardSkins: string[];
  badges: BadgeAward[];
}

export interface BadgeAward {
  id: BadgeId;
  earnedAt: string;
  sessionId?: string;
}

export type BadgeId =
  | "clean-scale"
  | "steady-pulse"
  | "no-stop-reading"
  | "chord-detective"
  | "first-session"
  | "week-complete"
  | "region-complete"
  | "improviser"
  | "weekly-challenge"
  | "assessment-complete";

// ---------- Sessions ----------

export interface MidiScore {
  /** 0-100 overall. */
  score: number;
  /** Component scores; semantics depend on block type. */
  components: Record<string, number>;
  /** Whether a star-worthy badge threshold was met. */
  badge: BadgeId | null;
  inputMode: InputMode;
}

export interface BlockResult {
  type: BlockType;
  plannedSec: number;
  durationSec: number;
  completed: boolean;
  skipped: boolean;
  midiScore?: MidiScore;
  /** Blob key in the recordings table. */
  recordingId?: string;
  /** What measured this block; can differ from the session's mode after a mid-session switch. */
  inputMode?: InputMode;
  /** Free-form structured details (e.g. scale played, exercise seed, chords asked). */
  details?: Record<string, unknown>;
  notes?: string;
}

export interface Session {
  id: string;
  childId: string;
  date: string; // date key
  startedAt: string; // ISO
  endedAt: string | null;
  scale: ScaleId;
  weights: BlockWeights;
  plannedMinutes: number;
  inputMode: InputMode;
  blocks: BlockResult[];
  durationSec: number;
  completed: boolean;
  xpEarned: number;
  starsEarned: number;
  /** Teacher note shown at session start, if any. */
  teacherNote?: string;
  /** Presentation the session ran in. */
  mode?: "guided" | "own";
}

export interface Recording {
  id: string;
  childId: string;
  sessionId: string;
  blockType: BlockType;
  createdAt: string;
  mimeType: string;
  blob: Blob;
  /** For MIDI improv recordings: serialized note events instead of audio. */
  midiEvents?: NoteEvent[];
  title?: string;
  favourite?: boolean;
}

// ---------- Songs & assignments ----------

export type SongLevel = 1 | 2 | 3 | 4 | 5;
export type Genre = "film" | "games" | "folk" | "pop" | "classical" | "holiday";

export interface Song {
  id: string;
  title: string;
  level: SongLevel;
  genre: Genre;
  /** Region (scale slug) whose completion unlocks this song. */
  unlockedByRegion: string;
  /** Original key of the chord chart. */
  key: PitchClass;
  mode: ScaleMode;
  /** Chord chart as bars; each bar is a list of chord symbols (roman numerals so it transposes). */
  chart: string[][];
  /** Lead-sheet level cards available (1-4). */
  leadSheetLevels: (1 | 2 | 3 | 4)[];
  externalLink?: string;
  /** Teacher-uploaded PDF, stored in recordings table as blob (id). */
  uploadId?: string;
  isCustom?: boolean;
}

export interface Assignment {
  id: string;
  childId: string;
  teacherId: string;
  scaleOverride: ScaleId | null;
  roadmapOverride: ScaleId[] | null;
  songIds: string[];
  note: string;
  weightsOverride: BlockWeights | null;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  inviteCode: string;
  childIds: string[];
  createdAt: string;
}

export interface Parent {
  id: string;
  email: string | null;
  pin: string | null; // 4-digit, hashed with a cheap salt
  childIds: string[];
  createdAt: string;
  weeklyDigest: boolean;
  /** Which household actions sit behind the four-digit code. Practising never does. */
  codeFor?: { settings: boolean; teacherLink: boolean; deleteRecording: boolean };
  /**
   * Sync configuration; null = local-only. `familyCode` is the secret that scopes this family's rows in the
   * cloud (sent as the x-kc-owner header). Enter the same code on another device to share data.
   */
  sync: { provider: "supabase"; url: string; anonKey: string; familyCode: string } | null;
}

// ---------- Assessment ----------

export interface AssessmentResult {
  id: string;
  childId: string;
  takenAt: string;
  echo: number;
  flash: number;
  pulse: number;
  details: Record<string, unknown>;
}
