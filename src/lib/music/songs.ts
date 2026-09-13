import type { Song } from "../types";

/**
 * Song library metadata. Charts are roman numerals per bar so they transpose to the scale of the week.
 * Titles are public-domain folk/classical melodies or generic kid-friendly descriptors; no copyrighted
 * scores are embedded (spec §4E). Families and teachers can attach links or upload their own PDFs.
 */
export const SONGS: Song[] = [
  // ---- C major region ----
  { id: "twinkle", title: "Twinkle, Twinkle, Little Star", level: 1, genre: "folk", unlockedByRegion: "C-major", key: "C", mode: "major",
    chart: [["I"], ["I"], ["IV"], ["I"], ["IV"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "mary-lamb", title: "Mary Had a Little Lamb", level: 1, genre: "folk", unlockedByRegion: "C-major", key: "C", mode: "major",
    chart: [["I"], ["I"], ["V"], ["I"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  { id: "hot-cross", title: "Hot Cross Buns", level: 1, genre: "folk", unlockedByRegion: "C-major", key: "C", mode: "major",
    chart: [["I"], ["V"], ["I"], ["I"], ["V"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2] },
  // ---- G major ----
  { id: "ode-to-joy", title: "Ode to Joy", level: 2, genre: "classical", unlockedByRegion: "G-major", key: "G", mode: "major",
    chart: [["I"], ["I"], ["V"], ["I"], ["I"], ["I"], ["V"], ["I"], ["I"], ["V"], ["I"], ["V"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "london-bridge", title: "London Bridge", level: 1, genre: "folk", unlockedByRegion: "G-major", key: "G", mode: "major",
    chart: [["I"], ["I"], ["V"], ["I"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  { id: "pirate-theme", title: "Pirate Ship Theme", level: 2, genre: "film", unlockedByRegion: "G-major", key: "G", mode: "major",
    chart: [["vi"], ["vi"], ["IV"], ["V"], ["vi"], ["vi"], ["IV"], ["V"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- D major ----
  { id: "yankee-doodle", title: "Yankee Doodle", level: 2, genre: "folk", unlockedByRegion: "D-major", key: "D", mode: "major",
    chart: [["I"], ["V"], ["I"], ["V"], ["I"], ["IV"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  { id: "canon-d", title: "Canon in D (chords)", level: 3, genre: "classical", unlockedByRegion: "D-major", key: "D", mode: "major",
    chart: [["I"], ["V"], ["vi"], ["iii"], ["IV"], ["I"], ["IV"], ["V"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "space-quest", title: "Space Quest", level: 2, genre: "games", unlockedByRegion: "D-major", key: "D", mode: "major",
    chart: [["I"], ["vi"], ["IV"], ["V"], ["I"], ["vi"], ["IV"], ["V"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- A major ----
  { id: "happy-birthday", title: "Happy Birthday", level: 2, genre: "folk", unlockedByRegion: "A-major", key: "A", mode: "major",
    chart: [["I"], ["V"], ["I"], ["I"], ["V"], ["I"], ["IV"], ["I", "V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  { id: "kingdom-march", title: "Kingdom March", level: 3, genre: "games", unlockedByRegion: "A-major", key: "A", mode: "major",
    chart: [["I"], ["IV"], ["V"], ["I"], ["vi"], ["IV"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- E major ----
  { id: "sunrise-hero", title: "Sunrise Hero", level: 3, genre: "film", unlockedByRegion: "E-major", key: "E", mode: "major",
    chart: [["I"], ["V"], ["vi"], ["IV"], ["I"], ["V"], ["vi"], ["IV"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "skip-to-my-lou", title: "Skip to My Lou", level: 2, genre: "folk", unlockedByRegion: "E-major", key: "E", mode: "major",
    chart: [["I"], ["I"], ["V"], ["V"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  // ---- F major ----
  { id: "row-your-boat", title: "Row, Row, Row Your Boat", level: 1, genre: "folk", unlockedByRegion: "F-major", key: "F", mode: "major",
    chart: [["I"], ["I"], ["I"], ["I"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2] },
  { id: "pop-anthem", title: "Stadium Pop Anthem", level: 3, genre: "pop", unlockedByRegion: "F-major", key: "F", mode: "major",
    chart: [["I"], ["V"], ["vi"], ["IV"], ["I"], ["V"], ["vi"], ["IV"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "lullaby-f", title: "Brahms' Lullaby", level: 2, genre: "classical", unlockedByRegion: "F-major", key: "F", mode: "major",
    chart: [["I"], ["I"], ["V"], ["V"], ["I"], ["IV"], ["I", "V"], ["I"]], leadSheetLevels: [1, 2, 3] },
  // ---- Bb major ----
  { id: "jingle-bells", title: "Jingle Bells", level: 2, genre: "holiday", unlockedByRegion: "Bb-major", key: "Bb", mode: "major",
    chart: [["I"], ["I"], ["I"], ["IV"], ["I"], ["V"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "jazz-cat", title: "Jazz Cat Strut", level: 4, genre: "pop", unlockedByRegion: "Bb-major", key: "Bb", mode: "major",
    chart: [["I"], ["IV"], ["I"], ["I"], ["IV"], ["IV"], ["I"], ["I"], ["V"], ["IV"], ["I"], ["V"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- Eb major ----
  { id: "amazing-grace", title: "Amazing Grace", level: 3, genre: "folk", unlockedByRegion: "Eb-major", key: "Eb", mode: "major",
    chart: [["I"], ["I"], ["IV"], ["I"], ["I"], ["I"], ["V"], ["V"], ["I"], ["I"], ["IV"], ["I"], ["I"], ["V"], ["I"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "dragon-flight", title: "Dragon Flight", level: 4, genre: "games", unlockedByRegion: "Eb-major", key: "Eb", mode: "major",
    chart: [["I"], ["iii"], ["IV"], ["V"], ["vi"], ["IV"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- Ab major ----
  { id: "moonlight-lo-fi", title: "Moonlight Lo-fi", level: 4, genre: "pop", unlockedByRegion: "Ab-major", key: "Ab", mode: "major",
    chart: [["I"], ["vi"], ["ii"], ["V"], ["I"], ["vi"], ["ii"], ["V"]], leadSheetLevels: [2, 3, 4] },
  { id: "silent-night", title: "Silent Night", level: 3, genre: "holiday", unlockedByRegion: "Ab-major", key: "Ab", mode: "major",
    chart: [["I"], ["I"], ["V"], ["I"], ["IV"], ["I"], ["IV"], ["I"], ["V"], ["I"], ["I"], ["V"], ["I"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- Db major ----
  { id: "starlight-waltz", title: "Starlight Waltz", level: 5, genre: "film", unlockedByRegion: "Db-major", key: "Db", mode: "major",
    chart: [["I"], ["V"], ["I"], ["V"], ["IV"], ["I"], ["V"], ["I"]], leadSheetLevels: [2, 3, 4] },
  { id: "castle-gates", title: "Castle Gates", level: 5, genre: "games", unlockedByRegion: "Db-major", key: "Db", mode: "major",
    chart: [["I"], ["IV"], ["vi"], ["V"], ["I"], ["IV"], ["vi"], ["V"]], leadSheetLevels: [2, 3, 4] },
  // ---- A minor ----
  { id: "greensleeves", title: "Greensleeves", level: 3, genre: "folk", unlockedByRegion: "A-natural-minor", key: "A", mode: "natural-minor",
    chart: [["i"], ["VII"], ["i"], ["V"], ["i"], ["VII"], ["i", "V"], ["i"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "haunted-hall", title: "Haunted Hall", level: 3, genre: "games", unlockedByRegion: "A-natural-minor", key: "A", mode: "natural-minor",
    chart: [["i"], ["i"], ["iv"], ["i"], ["VI"], ["VII"], ["i"], ["i"]], leadSheetLevels: [1, 2, 3, 4] },
  // ---- E minor ----
  { id: "scarborough", title: "Scarborough Fair", level: 4, genre: "folk", unlockedByRegion: "E-natural-minor", key: "E", mode: "natural-minor",
    chart: [["i"], ["i"], ["VII"], ["i"], ["III"], ["VII"], ["i"], ["i"]], leadSheetLevels: [1, 2, 3, 4] },
  { id: "stormy-sea", title: "Stormy Sea", level: 5, genre: "film", unlockedByRegion: "E-natural-minor", key: "E", mode: "natural-minor",
    chart: [["i"], ["VI"], ["III"], ["VII"], ["i"], ["VI"], ["III"], ["VII"]], leadSheetLevels: [2, 3, 4] },
];

export const LEAD_SHEET_LEVELS: Record<1 | 2 | 3 | 4, { title: string; description: string }> = {
  1: { title: "L1 · Bass Roots", description: "Left hand plays the root of each chord as a whole note. Right hand plays the melody or the chord root an octave up." },
  2: { title: "L2 · Block Triads", description: "Left hand plays the full triad once per bar. Keep it steady with the metronome." },
  3: { title: "L3 · Broken Chords", description: "Left hand plays root–third–fifth–third as quarter notes. Smooth, even, no gaps." },
  4: { title: "L4 · Pop Groove", description: "Left hand root on beats 1 and 3, right hand chord stabs on 2 and 4. Lock in with the backing loop." },
};

export function songsForRegion(regionId: string): Song[] {
  return SONGS.filter((s) => s.unlockedByRegion === regionId);
}

export function songById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
