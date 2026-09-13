# KeyCadence — Product Spec v2

A gamified daily practice companion for young piano beginners (ages 6–12). The piano is the controller. The app is a coach, a timer, and an adventure map — not a stopwatch with decorations.

---

## 1. Design principles

1. **Reward effort, not correctness.** XP and streaks come from showing up and finishing blocks. Accuracy earns badges, never gates progress.
2. **Adaptive, not fixed.** An onboarding assessment profiles the kid (ear vs. eye vs. rhythm) and the session tilts toward their weakest skill.
3. **Ear and eye always linked.** No standalone ear quiz. Every listening task ends with "now find it on the staff."
4. **Short and hard-stopped.** Default 20-minute sessions, 5 days a week. Parent-adjustable 15–60 min.
5. **Piano as input when available.** Web MIDI turns every block into a real game. Without MIDI, the app falls back to timers plus self-report.
6. **Parent sees what was done, not just time elapsed.**

---

## 2. Platform & stack

- **Phase 1:** Web app — Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Framer Motion, lucide-react. Must run well on iPad Safari and Android Chrome.
- **Phase 2:** Native wrapper (Capacitor or Expo) reusing the web core. Design the audio and MIDI layers behind interfaces so they can be swapped.
- **Audio:** Tone.js over Web Audio. Sampled piano (Salamander or similar), metronome click, backing loops.
- **Input:** Web MIDI API (Chrome/Edge/Android; Safari via polyfill or Phase 2 native). Microphone pitch detection is a stretch goal, not a requirement.
- **Persistence:** Local-first (IndexedDB) with optional cloud sync (Supabase) for multi-device and parent/teacher views.
- **Accounts:** Child profile (no email) under a parent account. COPPA-aware: no chat, no public leaderboards.

---

## 3. Onboarding assessment (first launch, ~5 min)

Three mini-games, each producing a 0–100 score:

| Test | What it measures | Method |
|---|---|---|
| **Echo** | Ear | App plays 2–5 note phrases; kid plays back (MIDI) or hums/taps count (no MIDI). |
| **Flash** | Reading | Notes shown on staff; kid names or plays them; speed + accuracy. |
| **Pulse** | Rhythm | Tap along to a click; drift measured. Then tap displayed rhythms. |

Output: a **Skill Profile** (Ear / Eye / Pulse) displayed as a radar chart the kid can see. Re-assessed every 4 weeks; profile changes are celebrated, not judged.

Session block weights are derived from the profile. Example: Ear 85 / Eye 30 / Pulse 50 → reading block gets 35% of session time, rhythm 25%, scales 15%, repertoire 15%, improv 10%. Weights are editable by parent/teacher.

---

## 4. Session engine — the six blocks

A session is an ordered sequence of blocks. Each block has a duration (from weights), on-screen rules, an optional MIDI-checked task, and a "done" gesture. Completing any block = +100 XP. Completing all = session badge + map progress.

### Block A — Warm-up & Scale Gym
- Scale of the Week from the roadmap (see §6).
- SVG 2-octave keyboard (not 88 — too small on tablet) showing scale notes, RH/LH fingering, thumb-under points. Toggle to full 88 on desktop.
- Metronome 40–180 BPM, visual + audio.
- **Dynamic Roulette:** spin for Legato / Staccato / Slow / Fast / Hands Together.
- **MIDI mode:** app listens for the scale ascending/descending at the metronome tempo, scores note accuracy and evenness, awards a "Clean Scale" badge.

### Block B — Rhythm Lab *(new)*
- Visual metronome (bouncing ball / pulsing circle).
- **Clap-Tap game:** rhythm shown in notation, kid taps a big on-screen pad (or any MIDI key). Scored on timing. Levels from quarter notes to syncopation and dotted rhythms.
- **Rhythm Echo:** hear it, tap it back, then see it written.
- Progresses independently of scale roadmap.

### Block C — Sight Reading Launchpad
- Rules pinned on screen: **"No listening first. Keep going through mistakes. Eyes on the page."**
- Built-in generator producing short 4–8 bar exercises in the current scale at the kid's Flash level (start with stepwise motion in a 5-finger position; add skips, then hands together). Optional deep link to Sight Reading Factory for families who subscribe.
- Countdown with progress bar and bell.
- **MIDI mode:** app records what was played against the exercise. Scores *continuity* (did they keep going) more heavily than accuracy.
- **No-MIDI mode:** one-tap audio recording, saved to the session log for a parent to review.

### Block D — Theory & Chord Lab
- Primary triads (I, IV, V) and vi of the current scale on the keyboard diagram; toggle root / 1st / 2nd inversion; app plays them.
- **Linked ear-eye task:** app plays a chord or interval → kid identifies it → then must **locate it on the staff** or play it. Both halves required for the point.
- Chord quality (major/minor), intervals (2nd–octave), later 7ths. Difficulty scales with Skill Profile.

### Block E — Repertoire & Lead Sheets
- Split timer: formal piece / lead sheet.
- **Song Library:** filterable by level, genre, and *unlock status*. Kid-friendly titles (film, games, folk, pop). Store metadata and chord charts only; do not embed copyrighted scores — link out or allow teacher uploads.
- Lead Sheet Level Cards: L1 bass roots, L2 block triads, L3 broken chords, L4 pop groove.
- **Songs are the primary unlockable.** Finishing a scale region unlocks 2–3 new titles on the map.

### Block F — Creative Sandbox
- Backing loop player in the key of the week (drum + bass, 3–4 grooves: pop, waltz, blues, lo-fi). Tempo control.
- Scale notes highlighted on the keyboard as a "safe zone."
- **MIDI mode:** records the improv; kid can replay it and save favourites to a "My Songs" shelf.
- Session ender: big "Done for today!" button that triggers the map reward animation.

---

## 5. Gamification layer — the Adventure Map

**World:** a hand-drawn map that unfolds region by region. Each region = one scale. Inside a region: landmarks (songs), a rhythm trail (Block B levels), and a hidden chest (weekly bonus challenge).

**Companion:** a small musical creature that travels with the kid on the map. It reacts to session events (cheers on block completion, sleeps when a streak freeze is used). It does *not* get sad or sick — no guilt mechanics.

**Progression currencies**
- **XP:** +100 per block, +50 session completion bonus, +25 for assessment retakes. Drives companion level and cosmetic unlocks.
- **Stars:** earned by MIDI-checked accuracy badges (Clean Scale, Steady Pulse, No-Stop Reading). Optional, for kids who want mastery goals.
- **Keys:** one per completed session week. Spent to open the next region.

**Streaks**
- Flame counter for consecutive practice days.
- **Streak freezes:** kid earns one per 5-day streak, holds up to 2. Missing a day auto-uses a freeze. Parents can grant one manually.
- Weekly streak (5 of 7 days) matters more than daily; display both.

**Weekly bonus challenge** (replaces the Friday test gate)
- Three short tasks: technique, chords, improv. Available all weekend. Awards a region badge and a companion cosmetic. **Never blocks progress.**

**Unlockables**
- Songs (primary), companion outfits, map themes, backing-track grooves, keyboard skins.

**What is deliberately absent:** public leaderboards, comparison to other kids, loss of earned rewards, timed pressure in reading tasks.

---

## 6. Scale roadmap

12-week default curriculum, teacher-editable:

- Weeks 1–5: C, G, D, A, E major
- Weeks 6–10: F, B♭, E♭, A♭, D♭ major
- Weeks 11–12: A minor, E minor (natural + harmonic)

Selecting a scale updates Blocks A, D, E (lead sheet transpositions), F, and the map region. A teacher can pin a scale for multiple weeks.

---

## 7. Parent & teacher views

**Parent dashboard**
- Session log: which blocks were completed, duration, MIDI scores or audio recordings for review.
- Settings: session length, block weights override, streak freeze grant, quiet hours.
- Weekly digest email (optional).

**Teacher mode** (invite-code link to a child profile)
- Override scale of the week and roadmap.
- Assign repertoire (upload PDF or link) and lead sheets.
- Leave a short note that appears at session start.
- See the same session log as parents.

---

## 8. Data model (sketch)

```
Parent { id, email, children[] }
Child { id, name, avatar, skillProfile{ear,eye,pulse}, xp, stars, keys,
        streak{current, best, freezes}, currentScale, mapProgress[] }
Session { id, childId, date, blocks[BlockResult], durationSec, completed }
BlockResult { type, durationSec, completed, midiScore?, recordingUrl?, notes? }
Scale { key, mode, fingeringRH, fingeringLH, triads }
Song { id, title, level, genre, chordChart, externalLink?, unlockedByRegion }
Assignment { teacherId, childId, scaleOverride?, songs[], note }
```

---

## 9. Build order

1. **Core loop:** child profile, session engine with 6 blocks and timers, XP, daily streak with freezes, local persistence.
2. **Audio:** Tone.js sampler, metronome, chord playback, keyboard SVG.
3. **Onboarding assessment** and adaptive block weights.
4. **Web MIDI** input layer + MIDI-checked tasks in Blocks A, B, C, F.
5. **Adventure map** UI, companion, unlockables, weekly challenge.
6. **Rhythm Lab** games and sight-reading generator.
7. **Parent dashboard**, recordings, cloud sync.
8. **Teacher mode.**
9. Native wrapper.

Each step should ship as a usable app on its own.

---

## 10. Input layer — MIDI and microphone

Three input modes, auto-detected at session start, switchable in settings:

| Mode | Detection | Checks | Fallback |
|---|---|---|---|
| **MIDI** | Web MIDI device present | Everything: notes, chords, timing, velocity | — |
| **Mic** | Microphone permission granted, no MIDI | Single notes, timing, and verification of *expected* chords | Hands-together and open-ended chord tasks use self-report |
| **Timer** | Neither | Nothing | Self-report + optional audio recording |

**Microphone implementation**
- Monophonic pitch detection via YIN or MPM (e.g. `pitchy`), 2048-sample window, ~20 ms latency.
- Onboarding calibration: kid plays middle C three times; app measures noise floor and sets confidence threshold. Re-calibrate from settings.
- Confidence gating: if detection confidence < threshold, the note is *unscored*, never marked wrong. A false "wrong" is worse than no feedback.
- Rhythm tasks use onset detection only (no pitch), which is robust even in noisy rooms.
- **Expected-chord verification** (not transcription): when the app has asked for a specific chord, run an FFT and check for energy at each expected fundamental plus its 2nd and 3rd harmonics. Mark the chord "heard" if ≥ 2 of 3 chord tones exceed threshold within a 500 ms window; otherwise unscored. Only used in Block D and Block E chord tasks where the target is known. Recommend headphones so the mic doesn't hear the app's own audio.
- Explicitly **not** attempted: open-ended polyphonic transcription, hands-together scoring, pedal detection.
- Build order: after Web MIDI (step 4), before the map (step 5). Acoustic pianos are the majority of beginner homes.

---

## 11. Sight-reading generator

Build in-house; do not depend on third-party content. An adaptive generator is the core of the reading block.

**Rendering:** VexFlow (SVG). Treble and bass clefs, grand staff at higher levels.

**Generator parameters** (all derived from Skill Profile + progression, overridable by teacher):
- Key (current scale), range (5-finger position → 1 octave → 2 octaves), clef(s)
- Note pool: scale tones only; accidentals introduced at level 6+
- Motion mix: % stepwise / % skips / % repeated notes
- Rhythm pool: whole/half/quarter → eighths → dotted → rests → ties
- Length: 4 bars → 8 bars → 16 bars
- Hands: RH only → LH only → alternating → together (level 8+)
- Constraints: start and end on tonic or dominant; no leap larger than a 6th below level 7; phrases shaped in 2-bar units so they sound musical

**Level ladder** (10 levels, promotion after 3 consecutive "No-Stop" sessions at current level):
1. C position, RH, quarters/halves, stepwise
2. Add skips of a 3rd, add whole notes
3. LH only, same rules
4. Alternating hands
5. Eighth notes, range to 1 octave
6. Accidentals, rests
7. Dotted rhythms, leaps to an octave
8. Hands together, simple bass roots
9. Two-octave range, ties, syncopation
10. Grand staff with block chords in LH

**Scoring** (MIDI or mic): continuity 60%, pitch accuracy 25%, rhythm 15%. Continuity is measured as "did playback keep moving forward within 1 beat of the exercise tempo." Display as a single "flow" meter, not a percentage.

**Optional:** deep link to Sight Reading Factory in settings for families with a subscription. Never required.

---

## 12. Open questions for later

- Companion art style — commission vs. generated.
- Sibling profiles and shared map worlds.
