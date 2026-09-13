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
npm run build && npm run e2e   # Playwright end-to-end smoke (desktop + tablet)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, the production build, and the e2e suite on every push and pull request.

## Deploy

- **GitHub Pages (live):** every push to `main` runs `.github/workflows/pages.yml`, which builds a static export under the repository path and publishes it. On an iPad, open the site in Safari, tap Share → **Add to Home Screen** to run it full-screen.
- **Vercel / any Node host:** `npm run build && npm start`.
- **Docker:** `docker build -t keycadence . && docker run -p 3000:3000 keycadence` (Next.js standalone output).
- **Cloud sync + weekly digest email:** see [supabase/README.md](supabase/README.md).

## Device checklist before a release

These paths cannot be exercised in CI and need a real instrument:

- MIDI keyboard in Chrome or Edge: Scale Gym check, Rhythm Lab taps from keys, Sight Reading scoring, Theory Lab "play it" answers, Sandbox recording.
- Acoustic piano with the microphone: onboarding calibration, Echo and Flash detection, chord verification in Theory Lab and Repertoire. Tune `confidenceThreshold` and the onset sensitivity in `src/lib/input/mic.ts` if the room is noisy.
- iPad Safari and Android Chrome: multi-touch on the keyboard, tap-pad latency, audio unlock on first tap.

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

Grown-ups → Account → Cloud sync → **Turn on sync** mirrors the household to the hosted KeyCadence cloud and gives you a secret family code to enter on other devices. Rows are locked behind that code by row-level security. Details, the weekly digest email, and using your own Supabase project are in [`supabase/README.md`](supabase/README.md).

## Native wrapper (Phase 2)

The audio (`src/lib/audio/engine.ts`) and input (`src/lib/input/source.ts`) layers are interfaces, so a Capacitor/Expo shell can swap in native implementations without touching the blocks.
