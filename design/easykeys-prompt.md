# Prompt for Claude Code — implement the EasyKeys 1a design

Paste everything below the line into Claude Code, run from the root of `andyhernandez/piano-app` on branch `claude/keycadence-product-spec-qsvc9t`. Put `EasyKeys All Screens.dc.html` (exported from the design project) at `design/EasyKeys All Screens.dc.html` first. It is the visual source of truth.

---

You are re-skinning and extending the KeyCadence app (Next.js App Router, React, TypeScript, Tailwind v4) to match the design in `design/EasyKeys All Screens.dc.html`. Open that file and read it before you change anything. Every screen in it is a 1194 × 834 iPad-landscape frame with a `data-screen-label` (A1…H1). All styling is inline, so you can read exact values straight from the markup.

Read `AGENTS.md` first. This Next.js version has breaking changes, so check `node_modules/next/dist/docs/` before writing routing or config code.

## 1. What changes, in one paragraph

The app becomes **EasyKeys**. It moves from the dark v14 look (indigo night, Instrument Sans, mint/amber/clay) to a warm, playful light theme. That means cream paper, Fredoka for display and Nunito for body, chunky pressable buttons, and a metronome mascot called **Tick**. Practice days are shown as an octave of piano keys, and the session is a path of stops. Copy stays plain, specific and second-person: "You held the pulse through bar 6", never generic praise. There are three functional additions: an **Ear** practice block (seven stops instead of six), two new skill-check parts (**Scales** and **Chords**), and an **experience question** in onboarding.

## 2. Design tokens — replace, don't add alongside

Rewrite the tokens in `src/app/globals.css` (the `--kc-*` custom properties) and the components in `src/components/ds/` to these values. Keep the variable names where a role maps one-to-one, so screens don't all need touching.

| Role | Value |
|---|---|
| Canvas (behind screens) | `#e4ded1` |
| Screen / paper | `#fbf7ef` |
| Card / header / rail surface | `#ffffff` |
| Card border + press shadow | `#e6dfd0` (2px border, `0 4px 0 0 #e6dfd0`) |
| Hairline / dividers | `#efe8da` |
| Dashed (planned absence, rest days) | `#d8cfbd` |
| Cream inset | `#f6f1e6` |
| Ink | `#1f2140` |
| Muted ink | `#5b5e7e` |
| Faint ink (labels) | `#6e7090` |
| **Indigo — act / current** | `#4f46e5`, wash `#eeecff`, press shadow `#2f28a8`, lilac `#c9c4fb` |
| **Mint — done / cleared** | `#06d6a0`, wash `#e0faf2`, ink `#03795c` |
| **Sunshine — personal best / teacher note** | `#ffc94d`, wash `#fff4d6`, ink `#7a5200`, shadow `#d9a52a` |
| **Lilac — worth a look** (replaces clay; nothing is ever red) | `#c9c4fb` fill with an indigo `#4f46e5` 2px border |

These are the four accents, and each has one job. Do not introduce others.

- **Type:** Fredoka 400–700 for headings, numbers, buttons and labels. Nunito 400–900 for body (700 is the default body weight). Keep JetBrains Mono only for the family sync code. Notation stays Noto Music, and Material Symbols Rounded stays for icons.
- **Radii:** screen 28, card 22, button 18–22, small tile 12–16, pill 999. Circles are for avatars, transport, path stops and Tick.
- **Buttons:**
  - Primary: indigo fill, white Fredoka 600, a 6px hard bottom shadow in `#2f28a8`. On press it moves `translateY(4px)` and the shadow drops to 1–2px. Sizes are 72px (screen action) and 60px (bar action).
  - Secondary: white, 2px `#e6dfd0` border, a 4px shadow in the same colour, and an indigo border on hover.
  - Quiet: text only.
- **No gradients, no blur, no emoji.** The one exception is ruled notebook lines, which are not used in 1a.

## 3. New shared components (in `src/components/ds/`)

- **`Tick`** — the metronome mascot, drawn in CSS exactly as in the design: an indigo trapezoid (`clip-path: polygon(32% 0,68% 0,100% 100%,0 100%)`), an ink base, white eyes, and a white smile or "cheer" eyes. Its pendulum swings at the session tempo (`@keyframes` rotate ±20°, duration `60 / bpm` s). Props: `mood: "happy" | "cheer"`, `size: "full" | "mini"` (mini is the 52px rounded-square face). Respect `prefers-reduced-motion`.
- **`TickSays`** — Tick plus a white speech bubble with a "Tick says" label. Guided mode shows one at the top of Today, the setup steps and the skill check.
- **`WeekKeys`** — replaces `WeekStrip` everywhere. It shows seven white keys (Mon–Sun) with the five black keys of an octave on top. A played day fills mint from the bottom in proportion to its minutes against the target, with the minute count inside. Today has a 3px indigo border on the indigo wash. Rest days are dashed. Future days are plain white.
- **`StopPath`** — today's stops as circles on a dotted connector. The first stop is indigo with a sunshine "START HERE" tag. "Your own" is dashed. In the done state the connector is solid mint, the circles are mint, and a personal best is sunshine with a star. Under each circle go its name and minutes (before) or result (after). It must lay out 7 stops in a ~790px column.
- **`MiniPath`** — the header progress pills: done mint 14px, current indigo 38px, upcoming `#e6dfd0`.
- **`BarPips`** — 12 rounded bar cells: done mint, current indigo with a press shadow, a missed bar lilac with an indigo border, upcoming white.
- **`StatChip`** — the practice bottom-bar readouts: a mint wash with a big Fredoka number, or an indigo wash with an icon and two lines.
- **`PianoStrip`** — a decorative keyboard of N white keys with lit keys and labels. Used in ear, scales, chords and "your own".
- Restyle the existing `Button`, `Pill` (now "chip"), `Panel`, `Toggle`, `MeterRow`, `StatTile`, `LogTable`, `Waveform`, `FormatBadge` and `QueueRow` to the tokens above. Keep their props.

## 4. Screens — route → design frame → what to change

Match each frame's layout, copy and states. The sample data is Nico, week 3 of G major, Ms. Rivera as teacher. Wire every screen to real store data the way the current screens already do. Never hard-code Nico.

| Frame | Route / file | Notes |
|---|---|---|
| A1 Who's playing | `onboarding/step-who.tsx` | **New:** the "How long has {name} played?" row with *Just starting · Under a year · 1–3 years · More than 3 · Coming back*. Store it as `child.settings.experience`. Tick sits beside the headline. |
| A2 Your keyboard | `onboarding/step-input.tsx` | The three input cards say "All seven stops / Six of seven / Four of seven". |
| A3 Guided or own plan | `onboarding/step-mode.tsx` | Two big cards. The chosen one gets a 3px indigo border on the indigo wash. |
| A4 How often | `onboarding/step-target.tsx` | Days and minutes as chunky choice tiles. The rail preview uses `WeekKeys`. |
| B1 Ear · B2 Reading · B3 Timing | `skill-check/*-part.tsx` | The header shows **five** part pills (Ear, Reading, Timing, Scales, Chords). B2's reading ladder starts at a level derived from `experience`; the copy says so ("Started at level 3 because you said one to three years"). |
| **B4 Scales (new)** | new `skill-check/scales-part.tsx` | "Play any scale you know." Detect key and mode from the MIDI notes (use `src/lib/music/scales.ts`). Measure evenness per note, record bpm and hand, and list the scales heard. The result sets `currentScale` and the starting technique tempo. |
| **B5 Chords (new)** | new `skill-check/chords-part.tsx` | Ask for C major, then G major, with F optional. Mark a chord heard when all its tones sound together. Use the expected-chord verification in `input/mic.ts` for the mic. "Not yet" always skips. The result sets `theoryLevel`. On timer input, ask three self-report questions instead and store them flagged `selfReported: true`. |
| B6 Result | `skill-check/result-screen.tsx` | Three meters (ear, reading, timing), no total. The split of the minutes now includes Ear. The starting-key copy refers to the scale actually played. |
| C1 Today (guided) | `today/today-screen.tsx` | Headline "Hi {name} — {n} stops, {minutes} minutes.", a TickSays line naming the reason for today's weighting, `StopPath`, a big Start button. The rail holds WeekKeys, the teacher note as a tilted sunshine sticky, the key-of-the-month tile, and weeks at target. |
| C2 Today (own plan) | `today/queue-editor.tsx` | Seven compact rows: drag handle, icon tile, name and detail, setting chips, a −/time/+ stepper, and a menu. A segmented total bar sits underneath. |
| D1 Technique · D2 Timing · **D3 Ear + D3b Find it on the staff** · D4 Sight reading · D5 Pieces · D6 Harmony · D7 Your own | `blocks/*.tsx`, `session/session-runner.tsx` | The runner header has a close button, `MiniPath` (7), title and meta, a timer chip and a pause circle. Under it a mini Tick plus a one-line instruction, then the block's page, then a white bottom bar with stat chips and actions. The Staff component is unchanged except for its card (white, radius 26, 2px border, 5px press shadow). |
| D8 Session done | `session/session-done.tsx` | Tick "cheer". The headline counts stops and minutes, a done `StopPath`, and "Stickers from today" (only real badges earned this session: `clean-scale`, `steady-pulse`, `no-stop-reading` and new personal bests). |
| E1 Keyboard went quiet | `session/input-lost.tsx` | Three cards. The mic card is the recommended one (indigo). "Not responding" is a plain chip, not clay. |
| F1 Progress | `progress/progress-screen.tsx` | Four tiles, with the fastest clean tempo on sunshine. The tempo "staircase" bar chart goes lilac on plateau weeks and sunshine for the latest best. The "Sticker book" shows earned badges only, never locked slots. |
| F2 Library | `library/library-screen.tsx` | Filter pills, piece rows with format badge tiles and state chips. The rail holds recordings and a "Try next" sunshine card. |
| F3 Lead sheet | `piece/piece-screen.tsx` | Four level cards (bass roots, block triads, broken chords, pop groove), chord symbols above the melody staff, and a play-along bar. |
| G1 Code gate | `household/code-gate.tsx` | Four big code boxes and an on-screen keypad. |
| G2 Household | `household/household-screen.tsx`, `profile-card.tsx`, `code-panel.tsx` | Profile cards with WeekKeys (64px) and two stats. "Starting a session" is a footnote, not a toggle. |
| G3 Teacher link | `household/teacher-link-screen.tsx` | Share toggles as cards. The invite code is in four indigo-wash tiles. |
| G4 Teacher view | `teacher/teacher-screen.tsx` | Student pills in the header. A note composer on a sunshine sticky. |
| H1 Settings | `settings/settings-screen.tsx`, `sync-panel.tsx` | A 2 × 2 grid of cards (session, listening, levels, sound). The rail holds the profile, the skill-check retake, sync and data. |

## 5. The Ear block — engine and types

1. Add `"ear"` to `BlockType` in `src/lib/types.ts` and to `BLOCK_ORDER` as the third block: technique, timing, **ear**, reading, pieces, harmony, own.
2. Add `DISCIPLINE.ear` (title "Ear", short "Ear") in `src/lib/engine/record.ts`.
3. In `src/lib/engine/weights.ts`, weight Ear from `skillProfile.ear`: a lower ear score gets more time, the same as the others. Re-balance so the defaults still sum to the session length. Update `engine.test.ts` and `progression.test.ts`.
4. Write `src/components/blocks/ear.tsx` against `BlockProps`. It runs three phases per phrase:
   - **Listen** — play 3–5 notes from the current scale with the audio engine. The phrase generator is new, and you should seed it like the sight-reading generator. "Hear it again" is unlimited, and "Play it slower" halves the tempo.
   - **Play it back** — compare MIDI or mic notes in order. Show the contour as dots placed by pitch. A wrong note is shown as "higher than B" style guidance and is never marked red. "Give me the first note" reveals note 1.
   - **Find it on the staff** (frame D3b) — the staff shows the notes found so far. The current slot is highlighted, with a numbered slot row underneath. The player taps a line or space, or plays the note to see it appear. A sunshine hint names the step from the previous note ("A sits in the space just above G"). Both halves are required to count the phrase (spec §1.3).
   - **Result:** `{ phrases, byEarFirstTry, foundOnStaff }`, with a headline like `"5 OF 5 BY EAR"` in `session/words.ts → blockHeadline`.
   - On the timer, Ear is unavailable, and the input cards already say "Four of seven".
5. Register it in `blocks/index.ts` and update the session runner's header meta.

## 6. Copy

- The product name is **EasyKeys** everywhere the user sees it: the header wordmark, the `layout.tsx` title, the manifest, `capacitor.config.ts` app name and the iOS display name. Keep the bundle id unless asked.
- Counts are seven stops: "Seven of seven stops", "All seven stops".
- Keep the existing number-to-words helpers ("twenty-two minutes").
- Sentence case. Guided mode speaks through Tick in short lines that name a bar, a note or milliseconds.

## 7. Acceptance

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build && npm run e2e` all pass. Update the Playwright smoke test for seven blocks and the two new skill-check parts.
- At 1194 × 834, every route visually matches its frame in the design file: no clipped content and no horizontal scroll.
- No red anywhere. No gradients. Tick's motion stops under `prefers-reduced-motion`.
- Nothing is hard-coded to the sample data.

Work in this order and commit after each step:
1. tokens and ds components
2. Today and the session runner
3. the Ear block and engine
4. the skill-check additions and onboarding experience
5. the remaining screens
6. the rename

At the end, list anything in the design you could not implement and why.
