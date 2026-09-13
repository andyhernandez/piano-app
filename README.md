# KeyCadence

A gamified daily practice companion for young piano beginners (ages 6–12). The piano is the controller; the app is a coach, a timer, and an adventure map.

- **Spec:** [docs/product-spec.md](docs/product-spec.md)
- **Stack:** Next.js (App Router) · React · TypeScript · Tailwind v4 · Radix primitives · Framer Motion · Tone.js · VexFlow · Dexie (IndexedDB) · Zustand · Vitest

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Audio and MIDI need a user gesture; the app unlocks the audio engine on the first tap. Web MIDI works in Chrome/Edge/Android Chrome. Safari uses the microphone or timer mode.

## What's inside

| Area | Where |
|---|---|
| Domain types (the contract) | `src/lib/types.ts` |
| Music theory: notes, 12 roadmap scales with fingerings, triads, intervals, song charts | `src/lib/music/` |
| Progression: adaptive block weights, XP, streaks + freezes, keys, badges, region unlocks | `src/lib/engine/` |
| Scoring: scale runs, rhythm timing, sight-reading continuity | `src/lib/engine/scoring.ts` |
| Generators: sight-reading exercises (10 levels), rhythm patterns (10 levels) | `src/lib/generator/` |
| Audio engine interface + Tone.js implementation (sampler, metronome, grooves) | `src/lib/audio/` |
| Input layer: Web MIDI, microphone (YIN pitch, onset detection, expected-chord verification), tap pad, auto-detection | `src/lib/input/` |
| Persistence: Dexie schema, repository, sync outbox, Supabase provider | `src/lib/db/`, `src/lib/sync/` |
| App state | `src/lib/store/app-store.ts` |
| Session runner (six blocks, interstitials, hard-stop countdown, summary) | `src/app/session/page.tsx`, `src/components/session/` |
| Blocks A–F | `src/components/blocks/` |
| Onboarding + skill assessment (Echo / Flash / Pulse) | `src/app/onboarding/`, `src/components/assessment/` |
| Adventure map, companion, weekly challenge, song library | `src/app/map/`, `src/app/library/`, `src/components/map/` |
| Parent dashboard, teacher mode, settings | `src/app/parent/`, `src/app/teacher/`, `src/app/settings/`, `src/components/parent/` |
| SVG piano keyboard, VexFlow staff | `src/components/keyboard/`, `src/components/staff/` |
| Tests | `src/lib/__tests__/` |

## Design rules baked into the code

- XP and streaks reward effort (finishing blocks); accuracy earns badges and stars but never gates progress.
- Ear tasks always finish with "find it on the staff" (Theory & Chord Lab).
- Sessions are short and hard-stopped: a bell rings, the kid finishes their thought, the block ends.
- Input degrades gracefully: MIDI → microphone → timer + self-report, auto-detected at session start.
- Local-first. Everything lives in IndexedDB; cloud sync (Supabase) is opt-in from the parent dashboard.
- No leaderboards, no comparison, no loss of earned rewards, no guilt mechanics.

## Cloud sync (optional)

The parent dashboard accepts a Supabase URL and anon key. The provider expects a table

```sql
create table kc_rows (
  owner uuid not null,
  table_name text not null,
  key text not null,
  payload jsonb,
  deleted boolean default false,
  updated_at timestamptz default now(),
  primary key (owner, table_name, key)
);
```

and a storage bucket named `recordings`, with row-level security keyed on `owner`.

## Native wrapper (Phase 2)

The audio (`src/lib/audio/engine.ts`) and input (`src/lib/input/source.ts`) layers are interfaces, so a Capacitor/Expo shell can swap in native implementations without touching the blocks.
