# KeyCadence Design System

A practice tool for piano students and adult returners sharing one instrument.
KeyCadence runs a short, structured practice session — six disciplines, adaptive
weighting, a hard stop you can switch off — and keeps a record of what actually
happened. One engine, two presentations: **Guided** shows one next action,
**Own plan** shows the whole editable queue and the real numbers.

This system is the visual and verbal language of that product. It was derived
from the KeyCadence screens in this project, not from an external brand.

## Sources

| Source | What it gave us |
| --- | --- |
| `github.com/andyhernandez/piano-app`, branch `claude/keycadence-product-spec-qsvc9t` | The product spec: session engine, six disciplines, assessment, input fallback, teacher link. Not re-synced into this project — read it there. |
| `KeyCadence v14 Lighter.dc.html` | The canonical screens. Every token here is measured from them. |
| `KeyCadence Design System.dc.html` | The long-form reference sheet this readme condenses. |
| `KeyCadence Notation Formats.dc.html` | The twelve Library format badges. |

The earlier rounds (`KeyCadence Screens`, `KeyCadence Reimagined`, `v2`, `v13`)
are kept as history. **v14 is the source of truth.** Where v13 and v14 disagree,
v14 wins.

## The five principles

1. **One engine, two presentations.** Guided and Own plan share data, look and
   language. The mode is a per-profile setting, reversible at any time.
2. **Respect over reward.** Nothing is dangled and nothing is taken away.
   Progress is a record you consult, not a score that can drop.
3. **The instrument is the interface.** Keyboard, staff and metronome are the
   loudest things on screen. Chrome recedes.
4. **Plain, adult language.** "Sight reading", not "Note Quest". "Household",
   not "Grown-ups".
5. **Consistency, not compulsion.** Streaks run on a weekly target with rest
   days. A missed day is a fact, not a failure state.

---

# CONTENT FUNDAMENTALS

**Voice.** An experienced teacher who respects you and does not perform
enthusiasm. It states what happened, names the next thing, and stops. A
ten-year-old and a thirty-five-year-old read the same sentence.

**Person.** Second person for instruction and feedback — *you held the pulse
through bar 6*. Never first person plural ("let's"), which is how adults talk
down to children. The app never refers to itself.

**Casing.** Sentence case everywhere in language, including buttons
(`Begin practice`, not `Begin Practice`). Uppercase belongs only to mono
labels, which always carry `0.12em` tracking. Title Case is never used.

**Specificity is the whole trick.** Feedback names the bar, the interval, the
milliseconds. Generic praise is banned because it carries no information and it
is the single loudest "app for kids" signal.

| Say | Not |
| --- | --- |
| You held the pulse through bar 6. | Amazing job — you're a rhythm superstar! |
| Rushing the dot — 22 ms early. | Oops! Try again to beat your score. |
| Three of five days this week. | Keep your streak alive — don't break it now! |
| Household · Sight reading · Begin practice | Grown-ups · Note Quest · Let's go! |
| Rest day Wednesday. | You missed a day :( |

**Length.** A row subtitle is one clause. Body copy caps at 620px — about 75
characters. A paragraph that explains *why we designed it this way* belongs in
this readme, never on a screen.

**Numbers.** Units are spelled where there is room: `96 bpm`, `22 ms`,
`13 h 40 m`, `Level 4`. Anything comparable sets in mono so it aligns down a
column and the digits stop dancing as they change.

**Music reads as music.** Keys, tempos and loop points use notation glyphs, not
letters: **B♭ major** not "Bb major", **𝅘𝅥76** not "quarter = 76",
**𝄆 bars 5–8 𝄇** for a loop. This is the most frequently broken rule in the app.

**No emoji.** Not in UI, not in copy, not as iconography. The first build used
emoji as icons and it was the fastest thing to read as childish.

---

# VISUAL FOUNDATIONS

**Ground.** Deep indigo, not black: `#101326` for a screen, `#0c0f20` for the
document canvas behind screens. Dark because the app sits on a music stand in a
dim room next to a keyboard, and because it keeps notation as the brightest
thing in the frame.

**Surfaces.** Four steps, all flat: base `#101326` → panel `#1a1e35` →
raised control `#242a4a`, with `#151935` for panels on the documentation
ground. One light surface exists: the reading page, cream `#f2f1ee`
(`--kc-paper`), with its ink at `#101326`. It appears only under music you
play from — a staff, a lead sheet, a chord chart — never as a card. Elevation is communicated by fill and border, never by shadow. The only
`box-shadow` in the system lifts a whole screen off this document's canvas.

**No gradients.** Anywhere. Not on buttons, not on backgrounds, not as a
protection scrim. A mint fill is one flat mint.

**Color carries meaning, and only meaning.** Three accents, one job each: mint
`#5ad1c0` = current or cleared; amber `#f0b866` = a personal best; clay
`#e2705a` = needs attention. Four ink weights of one neutral do everything
else. A fourth accent does not get added — when a fifth meaning appears, it
earns a shape or a position, not a hue. Nothing is ever pure white: the
lightest ink is `#eef0fb`.

**Clay, not red.** A missed note or a rushed beat is information, not an error.
Nothing in the app renders in a true red, and a missed day is a plain empty
cell, never a red one.

**Type scale.** Sans stops at 12px — there is no 11px sans step, and a label
that will not fit at 12 gets shorter copy, not a smaller size. Mono runs
32 / 20 / 15 / 12 / 11 / 10 / 9, where 11px is the label inside a card and 12px
the label above a group.

**Type.** Instrument Sans for language, tightened at display sizes
(`-0.03em` at 42px). JetBrains Mono for anything measured — tempos, drift,
timers, levels, section labels. The split is the rule: if a number can be
compared to another number, it is mono.

**Notation.** Noto Music, never redrawn. On a staff every glyph sets at one
size (28px) and the apparent differences are correct — Noto Music draws to a
staff where 1em is four staff spaces, so a clef spans seven and a notehead
spans one. Glyphs used as UI are the one place sizes are matched by eye:
treble 21px, bass 24px (the +3px is the system's only per-glyph correction),
pairs 14px, week cell 17px. A glyph in a tile is always clipped and never
exceeds half the tile.

Three symbols come from outside the music font because Noto Music's versions
are unreliable across platforms: **staccato** is a 7px CSS dot, **accent** a
26px text chevron, **dynamics** 24px Georgia italic. Two Library badges —
**lead sheet** and **chord chart** — are small CSS marks built from staff lines
and noteheads, because neither has a Unicode form.

**Borders do the work shadows would.** Five states, and the weight is the
signal: resting `1px #2a3054`; interactive `1px #3d4570` (you can press it);
current `1.5px #5ad1c0` — the only weight change in the system; cleared
`1px #2a7a6e` on a mint wash; planned absence `1px dashed #3f4a82`. Dashed
means *intended to be empty*; something merely unfinished uses the resting
border.

**Radius by kind, not by size.** Week cell 7px, badge tile 9px, control 10px,
panel 11px, screen 12px, pill 999px. Circles are reserved for a person or a
transport control — avatars and play buttons. Nothing else is round.

**Cards.** Flat panel fill, 1px resting border, 11px radius, asymmetric padding
(20/22 or 24/26 — text reads wider than it is tall). No shadow, no accent
left-border, no gradient. When cards sit in a grid and their neighbors must
align, they get an explicit height; content-sized siblings are why rows drift.

**Spacing.** One six-step scale — 6, 10–11, 14, 22, 32, 38 — with nothing
between steps. If 14 is tight and 22 is loose, the answer is a different
layout, not 18. Applied with flex/grid `gap`, never margins between siblings.

**Layout.** Screens are 1194×834 (iPad landscape) with a 72px header bar and a
single 320–340px right rail. The rail holds context you consult — this week,
the teacher's note, the current key — never actions. Actions live at the bottom
of the main column where a thumb reaches.

**Data, drawn honestly.** Meters are 7px bars on a `#242a4a` track. Charts are
inline SVG with a non-scaling stroke; point markers are HTML circles positioned
over the plot, because a stretched SVG turns circles into ovals. Week cells
encode minutes as fill height with the number inside — same footprint as a
checkbox, real information.

**Transparency and blur.** None. No frosted panels, no alpha-tinted text. Ink
sits at full opacity so 4.5:1 holds everywhere; a muted look is achieved with a
lighter ink token, not with opacity.

**Motion.** Restrained and short: 120–160ms, `ease-out`, opacity and small
translations only. Things that measure time — timers, metronome, drift meters —
never animate their own numbers; they tick. Nothing bounces, nothing celebrates.

**Hover and press.** Hover lifts the border from resting to interactive and
raises ink one weight; it never changes size. Press darkens a mint fill by
about 8% and holds position — no shrink, no shadow. Focus is a 1.5px mint ring
at the element's own radius, the same treatment as "current".

**Imagery.** There is none, and that is a decision. No photography, no
illustration, no textures or patterns. The only pictures in the product are
notation and the user's own waveforms. Recordings are drawn as real waveform
bars, so a lo-fi loop and a waltz look different from each other.

---

# ICONOGRAPHY

Two systems, held strictly apart — mixing them is the failure this section
exists to prevent.

**Chrome: Material Symbols Rounded**, weight 300, unfilled, 24px optical size,
loaded from Google Fonts as a ligature font. It inherits text color. Used for
navigation, transport, input status and settings — `today`, `trending_up`,
`library_music`, `settings`, `piano`, `mic`, `timer`, `speed`,
`play_arrow`, `pause`, `drag_indicator`, `more_vert`, `check`, `star`,
`error`, `search`, `hearing`, `chevron_left`. Sizes: 20px inline, 26px in
chrome, 34px in an empty state. Never below 20px, never filled, never two
weights on one screen.

**Notation: Noto Music.** Every musical symbol in the interface comes from the
same font as the notation on the reading screen. An app icon set has no clef,
no rest and no chord grid, so the moment one is drawn by hand it looks wrong
beside real notation. Codepoints are the contract — they are printed on the
specimen cards for exactly that reason.

**Two documented exceptions, and no others.** `hearing` is the only chrome
glyph allowed in a notation badge tile, because the absence of a page is not a
notation. Lead sheet and chord chart are CSS marks, because Unicode has no
glyph for them.

**Never:** emoji; hand-drawn SVG icons; a second icon library; an icon font's
notation lookalikes; the Miscellaneous Symbols dingbats (♩ 2669, ♪ 266A) —
they are text-scale and do not match staff-drawn glyphs.

No logo was provided for KeyCadence and none has been drawn. The wordmark is
set in Instrument Sans 600 wherever a mark would go.

---

# HOW TO USE THIS SYSTEM

**Link one stylesheet.** `styles.css` is the entry point; it `@import`s the
six token files and the webfonts. Every value below is a custom property —
never hard-code a hex, a radius or a spacing step.

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script>const { Button, QueueRow } = window.KeyCadenceDesignSystem_017ec9;</script>
```

In a consuming project the same two files sit under `_ds/<folder>/`. Starting a
new screen: copy `templates/app-screen/` and edit the markup — it already has
the frame, header, rail and action placement correct.

## Reach for

| When you need | Use | Not |
| --- | --- | --- |
| The one action on a screen | `Button` (primary, one per screen, bottom of the main column) | Two mint buttons |
| A secondary or tertiary action | `Button variant="secondary"` / `variant="quiet"` | A text link |
| An icon-only control | `IconButton` | A `Button` with no children |
| A short uppercase status | `Pill` | A colored dot, a badge with a count |
| A card or a rail block | `Panel` | A `div` with your own border |
| The label above a group | `SectionLabel` | An uppercased `<h4>` |
| A headline figure | `StatTile` | A big number in a `Panel` |
| A proportion (35% of time) | `MeterRow` | A pie, a donut |
| Countable progress (weeks, exercises) | `SegmentBar` | A percentage bar |
| Seven days of practice | `WeekStrip` | A calendar grid, checkboxes |
| Rows of recorded values | `LogTable` | A sortable data grid with headers |
| A recorded clip | `Waveform` | A sound-wave icon |
| An exercise in today's session | `QueueRow` | A generic list row |
| A piece in a list | `PieceRow` | A generic list row |
| A musical symbol, anywhere | `NotationGlyph` | An icon set's lookalike, an emoji |
| The page being read from | `SheetPanel` | A white card, a light-mode panel |
| A settings row | `Panel` + `Toggle` / `Button` group | A form with labels above fields |
| Music on a staff | `Staff` | A screenshot of notation, a hand-drawn SVG |
| A piece above reading level | `LeadSheet` | The full score, greyed out |
| Chords to play along with | `ChordChart` | A lyric sheet, a table |
| The format a piece is read in | `FormatBadge` | A text label |

## Before you ship a screen, check

- One mint primary action, at the bottom of the main column.
- Every comparable number in mono; every key, tempo and loop point as notation
  glyphs (`B♭ major`, `𝅘𝅥76`, `𝄆 bars 5–8 𝄇`).
- Sentence case in language, uppercase only in mono labels at `0.12em`.
- No feedback sentence that could be said about any other bar — name the bar,
  the interval or the milliseconds.
- No gradient, no shadow (except the screen lift), no blur, no alpha on text.
- Spacing only from 6 / 10–11 / 14 / 22 / 32 / 38, applied as `gap`.
- Nothing red; attention is clay. Nothing round except avatars and transport.
- No emoji, no hand-drawn SVG icon, no second icon library.

---

# INDEX

**Root**
- `styles.css` — the entry point consumers link. `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent Skills wrapper for use in Claude Code.
- `thumbnail.html` — the system's homepage tile.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
`borders.css`, `base.css`.

**`guidelines/`** — foundation specimen cards (Colors, Type, Spacing, Notation)
plus `notation.md`, the full glyph inventory with codepoints.

**Design System tab groups** — Colors, Type, Spacing, Notation, Brand,
Components, **Sheet** (note values, beams, rests and meter, note states, the
grand staff, lead sheet, chord chart) and App.

**`components/`**
- `core/` — Button, IconButton, Pill, Toggle, Panel, SectionLabel
- `data/` — StatTile, MeterRow, WeekStrip, SegmentBar, LogTable, Waveform
- `music/` — NotationGlyph, FormatBadge, PieceRow
- `sheet/` — SheetPanel, Staff, LeadSheet, ChordChart
- `practice/` — QueueRow

Each component directory holds `<Name>.jsx` (the implementation),
`<Name>.d.ts` (the props contract) and `<Name>.prompt.md` (what it is, when to
reach for it), plus one `*.card.html` showing every state.

**`ui_kits/app/`** — the KeyCadence iPad app: Today (Guided and Own plan), a
practice block, Progress, Library, the lead-sheet reading page and Settings.

**`templates/`** — what consuming projects start from, one folder each:
`app-screen` (Today), `progress`, `library`, `practice-block`.

## Intentional additions

- **NotationGlyph** — a wrapper over Noto Music that enforces the size rules
  (staff 28px vs the UI sizes) and the clipping rule. Without it every consumer
  re-derives the treble/bass offset by hand, which is how the clef escaped its
  tile twice during design.
- **SectionLabel** — the uppercase mono label appears on every screen; making it
  a component is what keeps `0.12em` tracking from drifting.
- **SheetPanel, Staff, LeadSheet, ChordChart** — the reading page. `SheetPanel`
  and `Staff` are the practice screen's cream page and staff, factored out with
  their measurements unchanged (the screen still renders pixel-for-pixel, via
  explicit `y` values). `LeadSheet` and `ChordChart` are **extensions**: the
  product defines both formats and draws them as Library badges, but no
  full-size reading view of either exists in the source screens, so these were
  built from the badge vocabulary — mono chord symbols, the same staff, the same
  mint "current" wash. Treat them as proposals until a real lead-sheet screen
  exists.

  `Staff` draws note values (whole, half, quarter, eighth, sixteenth, dotted),
  beamed groups, ledger lines, ties and slurs, per-note accidentals, rests,
  barlines and time signatures. Given a `layout` it places notes by bar and
  beat and draws the barlines itself, so you write music rather than
  coordinates. Clefs, rests, time
  signatures and repeat marks are Noto Music, placed from the font's own
  metrics (1em = four staff spaces, baseline on a staff line) so they stay
  aligned at any size; noteheads, stems and beams are drawn, because they must
  be recolored per note and a font run cannot do that. What it still does not
  do is decide anything: no collision avoidance, no automatic beaming by
  meter, no multi-voice or cross-staff writing, and spacing is proportional to
  musical time rather than optically weighted. A real score comes from the
  engine; this draws one.
- **LogTable, Waveform, SegmentBar, PieceRow** — four patterns that were drawn
  by hand inside the screens and are now components, with the measurements
  lifted from those screens unchanged. They are not new design: the session log
  is Progress's "recent sessions", the waveform is the Library rail, the segment
  bar is the current-key and session-progress strips, and the piece row is the
  Library list row.

## Caveats

- **Namespace.** Component cards and the UI kit mount from
  `window.KeyCadenceDesignSystem_017ec9`. If the compiler reassigns the
  namespace, that string is the one thing to update in the four
  `*.card.html` files and `ui_kits/app/index.html`.
- **Fonts are CDN-linked, not vendored.** No font binaries were provided, so
  `tokens/fonts.css` `@import`s Google Fonts rather than declaring local
  `@font-face` rules. Drop the `.woff2` files in and I will convert it.
- **No logo.** See ICONOGRAPHY.
- **The source screens (`KeyCadence v14 Lighter.dc.html` and the earlier
  rounds) live in the originating project, not here.** This project holds the
  system distilled from them: tokens, components, specimen cards, the UI kit
  and the template.
