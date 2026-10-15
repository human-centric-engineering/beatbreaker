# BeatBreaker — polyrhythms

Design notes and research for
[Phase 12](./app-plan.md#phase-12--polyrhythms--l). Written 2026-10-14
against `main` at `2d88077c` (after 11-g, the five drummers). The plan's task
tables are in `app-plan.md`; this document is the why, the sources and the
numbers. The decisions (§9) were settled the same day on the owner's rule:
**what is right for drummers using the app, not what is easiest to build.**

**The ask (owner, 2026-10-14):** bring polyrhythms into BeatBreaker.

- A new practice area, like Rudiments, with practice ideas built on
  polyrhythms.
- Polyrhythmic fills, where a drummer plays that way, so generated patterns
  sound more like the drummer.
- Research which drummers use polyrhythms, and make sure they are in the
  databank of drummers and styles.

**Contents**

1. [Where the app is today](#1-where-the-app-is-today)
2. [What changes, in one paragraph](#2-what-changes-in-one-paragraph)
3. [Words: what counts as a polyrhythm](#3-words-what-counts-as-a-polyrhythm)
4. [Time: how a polyrhythm is held](#4-time-how-a-polyrhythm-is-held)
5. [The Polyrhythms library (the practice area)](#5-the-polyrhythms-library-the-practice-area)
6. [Polyrhythmic fills](#6-polyrhythmic-fills)
7. [Drummers and styles](#7-drummers-and-styles)
8. [The PRs](#8-the-prs)
9. [Decisions](#9-decisions)
10. [Risks](#10-risks)
11. [Not in this phase](#11-not-in-this-phase)
12. [Sources](#12-sources)

---

## 1. Where the app is today

**Time is one uniform grid per bar.** A `Bar` is `Record<LaneKey, number[]>`.
Every lane is the same length, `stepsOf(meter) = num × sub`
(`lib/app/breaks/types.ts:48`, `meter.ts:153`). A note is an integer step, and
there are 15 meters (`meter.ts:14–136`). In all but two of them a step is a
sixteenth:

- `4/4-6` has sextuplets, 24 steps a bar. It is the only triplet grid.
- `4/4-8` has eighths.

There are no tuplets, no per-lane resolution and no per-lane meter.

**What already lies below the grid:**

- **Audio already plays off the grid.** Each voice has a fractional `offset`
  within its step, `when = t + dur × offset` (`audio/transport.ts:463`).
  Swing, feel, humanise, graces and buzz all use it.
- **MIDI export already writes fractional ticks.** PPQ is 480
  (`midi.ts:129`). A note that is not on the grid can be _played and
  exported_ today, but it cannot be _stored, drawn or edited_.

**A cross-rhythm exists, but only in the generator.** `CrossRhythm {every,
lanes, bars}` (`types.ts:484`) is written by `addCrossRhythm`
(`generate.ts:572`): an accent every _n_ steps, counted across bar lines.

- Five drummer styles use it: Tony Williams, Elvin Jones, Klek, Baker and
  Lenny White.
- It runs only in `figurePhrase`, so cell styles (the Latin ones) never get
  it.
- It has no clave guard, no tom orchestration, and is not marked as a fill.

**Rudiments are the model for a practice area** (Phase 10, D43–D46):

- They are a system library keyed `rudiments`, with entries seeded from
  `data/rudiments.ts`. There is no new table.
- `styleKey: 'rudiment'` is "not a style", so New, Regenerate and the doctor
  stand aside (`noStyleReason`, `library.ts:85`).
- `Pattern.fixed` makes all five layers play an entry whole.
- `Pattern.sticking` (`sk`, R/L per step) drives the chart and the 3D
  drummer.
- They are a card in the Generate drawer (`rudiments-card.tsx`), not part of
  the Libraries tab.
- Practice sessions, pins, speeds and history all work through
  `libraryEntryId` with no rudiment code.

**The critic would reject most polyrhythmic bars** (`critic.ts:46–152`):

- "the snare never plays four 16ths in a row" (unless sticking is written);
- "a findable backbeat in every bar";
- "a quarter of the bar is air".

`generateGood` draws 16 candidates and quietly keeps the conventional ones.
`fitHands` drops notes that would need three hands.

**The drummer records already have a place for this** (schema 1.4):

- `technique_profile.coordination.polyrhythm_usage` (0–1);
- `pattern.cross_rhythms[] {ratio, voices, cycle_steps, description}`
  (`common.schema.json:470`).

Six of the 25 records use `cross_rhythms`. The generator never reads the
records (`no-content-imports.test.ts:95`); a drummer's playing reaches the
generator only through their catalogue style (D47).

**Metric modulation is half there.** A section can already carry a
`tempoRatio` (`tr`, wire v7, `types.ts:114`), so a "new tempo from the old
triplet" exercise can be written as two sections today.

## 2. What changes, in one paragraph

A third system library, **`polyrhythms`**, sits beside Rudiments as a card in
the Generate drawer. It has seven shelves of practice patterns, built to be
learnt one stream at a time:

- the layers peel the pattern back to the pulse, then the cross-rhythm, then
  both;
- the chart prints a count row for each stream.

Everything that fits the existing grids ships first, with **no change to the
wire format**: 3:2, 2:3, 3:4, 4:3, 6:4, hemiola, groupings of 3, 5 and 7
over 4/4, polymeter, bell and clave timelines, and metric modulation.

True tuplets that do not fit any grid (5:4, 7:4, 5:3) come next. They are
**tuplet spans laid over the existing grid** on wire v8, not a finer grid.

Drummer styles gain a **`polyFills`** vocabulary, drawn from a salted
sub-stream. This leaves every other style's goldens untouched, and the critic
lets marked spans through. Each style's vocabulary is written only from that
drummer's _sourced_ devices.

The records gain a **device taxonomy** (§3), so the app names a polyrhythm, a
grouping, a polymeter and a displacement as what each is. Five new drummers
known for polyrhythm join, as styles with songs as D50 asks, along with two
new genre styles.

## 3. Words: what counts as a polyrhythm

The app should label things honestly. One vocabulary is used in the records,
in the library's shelves and notes, and in BeatBuddy's answers. It is the
research agent's taxonomy, tightened:

| Device                    | What it is                                                                       | True polyrhythm?                            | Example                                                          |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| `cross-rhythm` (n:m)      | Two even pulses sharing one span                                                 | **Yes**                                     | 3:2 hands; Afro-Cuban 6/8 bell against 4                         |
| `hemiola`                 | The 3:2 case that regroups six pulses as 2×3 against 3×2                         | **Yes** (a special case)                    | Jazz waltz crashes every dotted quarter (`jazzwaltz`)            |
| `grouping`                | An accent cell of 3, 5 or 7 subdivisions repeated over the bar until it resolves | No: polymeter at the subdivision level      | Threes of 16ths over 4/4; Elvin's four triplet partials          |
| `polymeter`               | Two bar lengths on one shared pulse, meeting again at their LCM                  | No (often called one)                       | Haake's hands in 4/4 against an odd-length kick-and-guitar cycle |
| `metric-modulation`       | A new tempo taken from a subdivision of the old                                  | No: a change, not two pulses at once        | Tony Williams; Hoenig's _Metric Modulations_                     |
| `displacement`            | A figure moved by a subdivision                                                  | No                                          | Copeland's backbeat; Changuito in clave                          |
| `timeline`                | An asymmetric guide pattern, the frame other rhythms cross                       | No: the frame, not a ratio                  | Son or rumba clave; the 12/8 standard bell                       |
| `ostinato-independence`   | Layered limb ostinatos                                                           | Only when the layers carry different pulses | Gadd's mozambique; songo with clave on the foot; Afrobeat        |
| `polytempo` (felt pulses) | Several felt pulses, often with microtiming                                      | No                                          | Chris Dave, who himself says it is not polyrhythm                |

The ratio is written `n:m`, the **cross pulse first**: 3:2 means three evenly
spaced notes in the time of two.

- A cross-rhythm is **grid-aligned** when the LCM fits a meter's steps a beat
  (3:2 and 3:4 on `4/4-6`; 4:3 on `12/8`).
- It is a **tuplet** when it doesn't (5:4, 7:4), and that needs §4's spans.

## 4. Time: how a polyrhythm is held

### What the grids already hold (no change)

| Figure                                    | Grid                    | How                                                                    |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| 3:2 and 2:3 over a half note              | `4/4-6` (6 a beat)      | Notes every 4 steps against every 6                                    |
| 3:4 (quarter-note triplets over quarters) | `4/4-6`                 | Every 8 steps against every 6                                          |
| 6:4, 3:1                                  | `4/4-6`                 | Every 4 / every 2                                                      |
| 4:3, 2:3 in compound time                 | `12/8`, `6/8`           | Dotted quarters against quarters                                       |
| Hemiola                                   | `3/4`, `6/8`            | Every 3 eighths against every 2                                        |
| Groupings of 3, 5, 7 over 4/4             | `4/4`                   | An accent cycle spanning bars (3 bars resolve 3s of 16ths; 5 bars, 5s) |
| Polymeter (3/4 over 4/4, 5/16, 7/8)       | `4/4`                   | One lane's cycle spans bars: 3 bars of 4/4 = 4 of 3/4                  |
| Metric modulation                         | sections + `tempoRatio` | Two sections, the second at 3/2 or 4/3                                 |

That is most of the pedagogy, with no model change.

### What needs the model: tuplet spans (recommended, D53)

5:4, 7:4, 4:5, 5:3, quintuplet and septuplet fills fit no grid. Two ways were
weighed:

|                    | **A. A finer grid** (an LCM resolution)                                                                                                                                             | **B. Tuplet spans over the grid**                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| What it is         | Raise the step to 1/420 of a beat (48 and 96 don't cover 5 and 7)                                                                                                                   | A span says "lane _x_, from step _a_ for _s_ steps, _n_ evenly spaced notes"                                                         |
| Wire               | 1,680 digits a lane a bar against `MAX_ROW` 32 and a 16 KB link                                                                                                                     | An optional `tu` key, so existing codes keep their bytes and `gridHash`                                                              |
| Breaks             | Every parity rule (`isSwung`, layers' `i % 2`, hat hand-to-hand, critic adjacency), every catalogue style written in 16ths, 192+ editor cells a bar, every test pinned at 16 or 120 | Only the places that draw, edit or play a lane need to know a span replaces its cells                                                |
| Notation           | Tuplets must be _inferred_ from tick positions                                                                                                                                      | The span _is_ the bracket and the number                                                                                             |
| Audio and MIDI out | Unchanged                                                                                                                                                                           | Note _j_ plays at `a + j·s/n` steps. The transport's per-step dispatch learns to read a span's notes; `offset` already does the rest |

**B, tuplet spans.** The shape:

```ts
// Pattern.tuplets — absent on every pattern that has none.
interface TupletSpan {
  bar: number; // the bar the span starts in
  start: number; // grid step the span starts on
  span: number; // grid steps it covers; may run past the bar (≤ 2 bars)
  n: number; // notes in the span: 2–9 (2 in one 16th is a pair of 32nds)
  notes: Partial<Record<LaneKey, number[]>>; // n values per lane, 0–8 as cells
}
```

- **One span, many lanes (D53).** A quintuplet fill that runs snare, snare,
  tom, tom, floor is one figure to a drummer: one bracket, one "5", read as a
  unit. So a span holds every lane it touches, not one lane each. A 5:4
  between hand and foot is two spans, because they are two figures.

- **The span owns its cells.** The lane's grid cells under it are ignored
  (and kept at 0 by the writer), so a reader that sees the span never plays
  both.
- **Wire v8**, following `tr` and v7: dropping `tu` would change what plays,
  so an older reader must refuse the code rather than strip the key. Codes
  that use no span stay at their version and keep the same bytes.
  `gridHash` includes the spans.
- **The places that change** (from the time-model map):
  - `share.ts` and `schema.ts` (the `tu` pack, v8, the content check above
    the declared version);
  - `perform.ts` and the transport's dispatch;
  - `midi.ts` export;
  - `engrave.ts` (bracket and number, durations from `span / n`, beams);
  - `step-editor.tsx` (a span is merged cells cut into _n_);
  - `drummer/timeline.ts` (hits come from the scheduled times, not
    `k × dur`);
  - `critic.ts` (a span is one figure);
  - `layers.ts` (a span survives or drops whole);
  - BeatBuddy `text.ts` (print it) and `write-bars.ts` (keep or drop whole,
    as sticking).
- **Not changed:** the 15 meters, the catalogue styles, every parity rule,
  and every existing golden.

**Polymeter stays on the grid.** A lane whose cycle spans bars is ordinary
notes. What it needs is _display_:

- `Pattern.cycles?: {lane, steps, label}[]` (optional key `cy`, no version
  bump, since dropping it changes nothing that plays);
- the chart draws a dotted bar line on that lane every `steps`, labelled
  "3/4" or "5/16";
- the editor tints the cycle.

### Two count rows

The chart already prints a count row (`1 e + a`, `engrave.ts:52`). A
polyrhythm entry carries `Pattern.counts?` (optional `ct`):

- up to two rows: the pulse ("1 & 2 &"), and the cross-rhythm ("1 trip let"
  or "1 2 3" placed on its notes);
- or a resultant phrase, using the standard mnemonics: 3:2 "hot cup of tea",
  4:3 "pass the golden butter". These are a teaching convention; §12 gives
  the source.

## 5. The Polyrhythms library (the practice area)

### Shape: a third system library

It mirrors Phase 10, and reuses everything that made Rudiments cheap:

- **`polyrhythms` library**, seeded from `data/polyrhythms.ts` at position 2.
- **`styleKey: 'polyrhythm'`**, a non-style like `rudiment`.
  `unlistedStyleLabel` and `noStyleReason` change from a hard-coded
  `RUDIMENT_STYLE` to a small map of non-style keys.
- **A card in the Generate drawer**, `polyrhythms-card.tsx`. It is the
  Rudiments card made generic (`library-card.tsx`, taking a library key and
  help text) rather than copied. It folds into a shelf for each group, and
  the Libraries tab leaves it out.
- **Sessions, pins, speeds, history and Explore links work as they are**,
  through `libraryEntryId`.
- **`LibraryItem` gains** `counts`, `cycles`, `device` (§3's kinds) and
  `ratio` (`'3:2'`). Its `artist` field credits the source of the idea
  ("after Elvin Jones", "Ewe standard pattern") rather than holding a PAS
  number.

### Layers: learn one stream at a time (D54)

A rudiment is `fixed`, so every layer plays it whole. A polyrhythm is learnt
by **isolating each stream, then joining them**, the way every method in §12
teaches it. So a polyrhythm entry names its streams, and the layers are a
build-up rather than a thinning:

| Layer | Plays                                                        |
| ----- | ------------------------------------------------------------ |
| 1     | The pulse stream alone (with the click on the pulse)         |
| 2     | The cross stream alone (with the click on the pulse)         |
| 3     | Both streams, unaccented                                     |
| 4     | Both, with accents on each stream's "1"                      |
| 5     | The full figure: orchestration, the groove around it, ghosts |

- **Shape:** `Pattern.streams?: {pulse: LaneKey[], cross: LaneKey[]}`
  (optional `st`, no version bump: dropping it leaves the full figure at
  every layer, the same as `fixed`). `reducePattern` reads it before
  `fixed`.
- **Why not pins:** Phase 10 found that pinned notes all look pinned by hand
  in the step editor.

**Which hand plays which stream (D60).** A drummer learning 3:2 is told
"right hand three on the floor tom, left hand two on the snare", and swapping
the hands is the next exercise. Today the 3D drummer's cost search picks the
hands, and the sticking row (D44) holds one hand a step, which cannot say
"both hands, two drums" on the shared downbeat. So an entry may carry
`Pattern.hands?: Partial<Record<LaneKey, 'R' | 'L'>>` (optional `hd`, no
bump: without it the search places the hands as now):

- the drummer plays that lane with that hand, and the cost search keeps
  everything else;
- the chart labels the lane `RH` / `LH` at the start of the system;
- each two-hand entry comes in both handings, the lead hand swapped, as the
  rudiments alternate.

Feet need nothing: kick and hat-foot lanes already name their limb.

**Feel either side.** The streams can swap roles: the cross-rhythm becomes
the pulse you count, and the click goes with it. A 3:2 felt in three is a
different exercise from 3:2 felt in two, and drummers practise both.

**Click on either stream.** One practice control: the click follows the pulse
(the default), the cross-rhythm, or both, with a different pitch for each. It
is a Studio setting, not part of the pattern. It is the standard exercise of
"hear the three, feel the two".

### The shelves and what goes on them

About 34 entries. Every one is playable from day one, except shelf 6, which
needs tuplet spans (12-d) and ships with them.

| #   | Shelf                   | Entries (each with a note on what to listen for)                                                                                                                                                                                    | Grid                  |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | **Two against three**   | 3:2 hands (floor tom against snare); 2:3 swapped; 3:2 hand against foot (ride over kick); 3:2 with the hat foot on the pulse; the resultant on one drum; 3:2 hemiola in 6/8 against 3/4                                             | `4/4-6`, `6/8`, `3/4` |
| 2   | **Three and four**      | 3:4 quarter-note triplets over quarters (hand over foot); 4:3 in 12/8 (dotted quarters against quarters); 3:4 on the ride over a backbeat; 6:4 sextuplet cells against the pulse                                                    | `4/4-6`, `12/8`       |
| 3   | **Groupings over four** | Threes of 16ths over 4/4 (3-bar cycle), with accents moved round the kit; dotted-eighth ride; fives of 16ths (5 bars); sevens of 16ths (7 bars); Elvin's four-partial cross over 12/8; threes of 8th-note triplets                  | `4/4`, `12/8`         |
| 4   | **Polymeter**           | 3/4 hat over 4/4 (meets in 3 bars); 5/16 kick under 4/4 hands (after Carey's _Rosetta Stoned_); 7/8 cycle over 4/4; a short odd kick cycle under a straight 4/4 hand frame (after Haake)                                            | `4/4`                 |
| 5   | **Timelines and clave** | The 12/8 standard bell with a 4-pulse kick; Afro-Cuban 6/8 bell against 4 (`afrocuban`'s own figure); son clave on the hat foot under a 3:2 hand figure; songo with clave on the foot; mozambique (after Gadd and Pello el Afrokan) | `12/8`, `4/4`         |
| 6   | **Tuplets** (12-d)      | 5:4, 4:5, 7:4, 5:3; quintuplet 16ths over a quarter pulse; septuplets; a five-over-four fill shape                                                                                                                                  | spans                 |
| 7   | **Metric modulation**   | Triplet → new quarter (×3/2); dotted eighth → new quarter (×4/3); quarter-note triplet → new quarter; there and back                                                                                                                | sections + `tr`       |

Each entry:

- carries its tempo, its device (§3), its ratio, and the count rows;
- takes its credit (`artist`) from the source of the idea: "after Ari
  Hoenig", "Ewe standard pattern", "PAS-style exercise";
- comes in two bars where it alternates hands, as the rudiments do.

### Practice-session presets

A shelf can already become a session. The plan adds one written-in preset
that turns each entry into three consecutive items, each climbing to its
tempo: **layer 1 → layer 2 → layer 5**. It is a "polyrhythm ladder" option on
_Add shelf to a session_, built on the existing per-item `level` setting.
There is no new session model.

## 6. Polyrhythmic fills

### Where they plug in

`generate.ts` takes only the style; it is never told which drummer. That is
right (D47): the drummer reaches the generator through their style. So
polyrhythmic fills are **style data plus one generator step**.

**The style data** (`types.ts` `Style`, `catalogue/schemas.ts`), overridable
per song and section through `StyleSongParams` as every other field is:

```ts
polyFill?: number;                       // chance a phrase-end fill is polyrhythmic (0 = off)
polyFills?: Array<[PolyFill, number]>;   // weighted vocabulary
interface PolyFill {
  device: 'cross-rhythm' | 'grouping' | 'hemiola' | 'tuplet';
  group?: number;            // grouping cell length in steps (3, 5, 7)
  ratio?: [number, number];  // cross-rhythm or tuplet, n:m
  span: number;              // steps covered
  before?: number;           // steps it starts before the bar line (over the bar)
  orchestrate: LaneKey[];    // where each cell's notes move: ['s','t1','t2','t3']
  accent?: 'cell' | 'none';  // accent each cell's first note
  kick?: 'pulse' | 'cell' | 'keep';
  resolve?: 'one' | 'crash'; // land on the next 1
}
```

**The step:** `addPolyFill`, beside `addCrossRhythm`.

- **It takes the place of a phrase-end fill** in `figurePhrase`, and also in
  `cellPhrase`, which today gets neither cross-rhythms nor written fills.
- **It runs on a salted sub-stream**, as `articulate` and `SONG_SALT` do. A
  style with no `polyFill` draws nothing extra, so every existing golden
  holds (`goldens.test.ts`).
- **It can start before the bar line.** `applyFigureFill` refuses a fill
  longer than the bar (`generate.ts:723`); the new step writes across the
  pair of bars, so 3s over the bar resolve on the next 1.
- **It is marked as a fill.** It goes through `markFill`, so the kit's
  percussion cut-off and the doctor already know.

### What else has to learn about them

- **The critic.** A marked poly-fill span is judged as a fill, as written
  sticking already is:
  - the snare-run, backbeat and air checks skip the span;
  - the three-hands check does not.

  Without this, `generateGood` quietly picks the candidates without one.

- **`fitHands`.** It must not drop a cell's accent. The span's notes are
  placed first and the cymbals lifted around them.
- **Clave.** On a `clave` style, the cells' accents must not cross the
  clave's strong strokes on the 3-side. `cellPhrase` already has a guard
  (`generate.ts:930`); `addCrossRhythm` gets the same one, since it has none
  today.
- **`styleIn`.** In a foreign meter `fills` is dropped today. Poly fills
  remap `span`/`before` by beat, and are dropped where `group` no longer
  divides the remapped span.
- **Layers.** A poly fill is whole at L4–5 and replaced by the plain fill
  below, rather than thinned into nonsense.
- **The doctor's `fill` move** offers the style's poly fill where the style
  has one.
- **Tuplet fills** (`device: 'tuplet'`) need 12-d's spans. Until then a 5 is a
  grouping of five 16ths, labelled as such.

### Whose fills (sourced devices only)

Each vocabulary is written from what the drummer's research section and
record already source, or from §7's research. **A drummer with no sourced
device gets no poly fills.** Odd meters are not polyrhythm, and a rudiment in
sextuplets is not a cross-rhythm.

| Drummer                                                                                        | Device(s) to write                                                                                                                                                                                                                                                                       | Source in the repo                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Elvin Jones                                                                                    | Cross-rhythm 3:2 and 3:4 on the triplet grid; groupings of 2 or 4 partials round snare, toms and kick; hemiola in waltz                                                                                                                                                                  | Record: "Polyrhythmic flow", generation rule; research §P                                                              |
| Tony Williams                                                                                  | Threes across the bar line; 3:2 / 2:3                                                                                                                                                                                                                                                    | Record: "threes over the bar", 2:3 and 3:2 patterns; research §G. (His 5s and 7s are **not** sourced; leave them out.) |
| Ginger Baker                                                                                   | 3:2 tom figure against duple kick in 12/8                                                                                                                                                                                                                                                | Record: 3:2 pattern; research §T                                                                                       |
| Mitch Mitchell                                                                                 | 2:3 (3/4 against an implied 6/8)                                                                                                                                                                                                                                                         | Record: Manic Depression pattern; research §C                                                                          |
| Michael Shrieve                                                                                | Groups of three 16ths on the snare over the kick                                                                                                                                                                                                                                         | Record: hand technique; research §AA                                                                                   |
| Lenny White                                                                                    | Accents across the bar                                                                                                                                                                                                                                                                   | Record: generation rule; research §Z                                                                                   |
| Klek de Poitrine                                                                               | Threes of 16ths (labelled grouping, unconfirmed as the record says)                                                                                                                                                                                                                      | Record: 4:3, marked unconfirmed                                                                                        |
| Horacio Hernández                                                                              | Displacement in clave, over the foot clave (labelled displacement, not polyrhythm)                                                                                                                                                                                                       | Record: "accents that cross the clave"                                                                                 |
| Changuito                                                                                      | Displaced hands in clave (labelled displacement)                                                                                                                                                                                                                                         | Record: "Displaced hands"                                                                                              |
| Cobham, Cindy Blackman Santana, Yussef Dayes, Copeland, Lombardo, Gadd, Hakim, Collins, others | **Researched before decided** (12-b): a transcription-level pass (published transcriptions, method books, interviews) for each. A sourced device gets a vocabulary in 12-c; none found is recorded as such, with what was searched. Copeland's hemiola stays a song-level `crossRhythms` | §7 A, 12-b                                                                                                             |

## 7. Drummers and styles

### A. The records: name the devices (12-b)

**Schema 1.5** adds `technique_profile.coordination.devices[]`:

```json
{
  "kind": "cross-rhythm",
  "ratio": "3:2",
  "where": "fills|comping|groove",
  "description": "…",
  "pattern_ids": [],
  "confidence": "high",
  "sources": ["…"]
}
```

`kind` is §3's enum. `polyrhythm_usage` stays. A test holds two rules:

- every drummer style with `polyFills` has a record whose `devices` include
  each `PolyFill.device`;
- a `devices` entry with no source fails the validator.

Changes to existing records, from the research:

| Drummer                                                                            | Change                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Elvin Jones                                                                        | Tag cross-rhythm 3:2 and 3:4 (triplet grid), hemiola                                                   |
| Tony Williams                                                                      | Tag cross-rhythm 3:2/2:3, grouping across the bar, **metric-modulation** (sourced: VOA; Sydney thesis) |
| Ginger Baker                                                                       | Tag cross-rhythm 3:2                                                                                   |
| Mitch Mitchell                                                                     | Tag cross-rhythm 2:3 / hemiola                                                                         |
| Horacio Hernández                                                                  | Tag timeline (clave on the left foot) and ostinato-independence; add a `cross_rhythms` entry           |
| Changuito                                                                          | Tag displacement in clave                                                                              |
| Tony Allen                                                                         | Tag ostinato-independence (interlocking layers). **No ratio**: none is sourced                         |
| Klek de Poitrine                                                                   | Tag grouping (threes of 16ths), confidence kept as unconfirmed                                         |
| Steve Gadd                                                                         | Tag ostinato-independence (mozambique: two sticks a hand plus foot ostinato)                           |
| Stewart Copeland                                                                   | Tag displacement (backbeat moved by an eighth)                                                         |
| Michael Shrieve, Lenny White                                                       | Tag grouping (from their existing records)                                                             |
| Cobham, Collins, Cindy Blackman Santana, Hakim, Lombardo, Purdie, Davies, the rest | No change until sourced                                                                                |

The lineage map gains a **device filter**: "show drummers who play
cross-rhythms". It is a plain filter on node data, not a new edge type.

### B. New drummers (12-e, 12-f)

Each follows D50 and `drummers.md` § Adding a drummer:

- a research section in `drumming-research.md` first;
- a 1.5 record with evidence on every claim;
- `recordings/` and `sources/`;
- a catalogue style keyed both ways, with songs (each at its own tempo, meter
  and clave);
- a sampled kit (no electronics, as these drummers play acoustic kits).

**The first five, chosen for distinct, sourced devices that teach well:**

| #   | Drummer                     | Idiom           | Device(s)                                                                                                                                                                                                        | Hangs off                 | Key sources                                |
| --- | --------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| 1   | **Tomas Haake** (Meshuggah) | Metal           | Polymeter: hands in 4/4, an odd-length kick and guitar cycle over the bar; the herta under a straight beat on _Bleed_. Framed honestly: the band says "it's simply 4/4"                                          | New style; `metal` family | Drumeo; Louder; Guitar World (Nordin)      |
| 2   | **Danny Carey** (Tool)      | Progressive     | 5/8 against 6/8 (_Lateralus_); 7/16 over the bar (_Invincible_); threes on the hat over 4/4 resolving in three bars (_Eulogy_); 4/4 implied in 3/4 with 5/16 on the kick (_Rosetta Stoned_). Already a stub node | New style; progressive    | Drumeo                                     |
| 3   | **Ari Hoenig**              | Jazz            | Triplet-grouping cross-rhythms; 5- and 7-note groupings; 5:4; metric modulation. Wrote _Intro to Polyrhythms_ and _Metric Modulations_, so he is the practice shelf's best reference                             | `modal` / post-bop        | Modern Drummer review; Wikipedia; Bandcamp |
| 4   | **Max Roach**               | Bebop           | NPR's "master of polyrhythms"; _Jazz in ¾ Time_ (the waltz with hemiola). Already a stub node, and the root of half the jazz lineage                                                                             | `bebop` / `jazzwaltz`     | NPR 2007; Wikipedia                        |
| 5   | **Dafnis Prieto**           | Afro-Cuban jazz | "Highly complex polyrhythmic structures" (MacArthur 2011); clave from shifting starting points (_Claveteo_); _A World of Rhythmic Possibilities_                                                                 | `songo` / `afrocuban`     | dafnisonmusic.com; JazzTimes; Boston Globe |

**A second wave (12-g), researched to song level first.** These drummers are
central to how polyrhythm is taught and played on the kit, and a drummer
using the app would expect them. They are not dropped for lack of a source
from one pass; 12-g goes looking (transcriptions, method books, Modern
Drummer interviews) and adds each one whose devices hold up at song level:

- Gavin Harrison (_Rhythmic Illusions_: displacement, modulation,
  polyrhythmic groupings; Porcupine Tree);
- Terry Bozzio (melodic ostinato, polyrhythms and metric modulation);
- Roy Haynes and Jack DeJohnette (jazz, not sourced in the first pass);
- Antonio Sánchez (clave on the pedals, cross-rhythm);
- Vinnie Colaiuta (Zappa's polyrhythmic phrasing);
- Ignacio Berroa (_Groovin' in Clave_), only if his devices are distinct
  from Horacio's.

One that does not hold up is recorded in the research with what was
searched, not added on reputation.

**Not to be labelled polyrhythmic:**

- Chris Dave (polytempo and feel, his own words);
- Questlove and "Dilla time" (microtiming);
- Bill Bruford's _Discipline_ "17/16" (only a listener comment).

**Claims to keep out** until sourced: Haake "23/16", Tony Williams' 5s and
7s, timestamps of any kind.

### C. Styles

**Existing styles** already carrying a device, to be tagged in the catalogue
(`device` on the style, read by the style picker's help):

- `afrocuban`: 3:2 bell field;
- `jazzwaltz`: hemiola;
- `modal`: 3:2, 3:4;
- `son`, `mambo`, `rumba`, `songo`: timeline and displacement;
- `afrobeat`: ostinato-independence.

`takefive` is an additive meter: tag it `additive-meter` or leave it untagged,
but **not** polyrhythm.

**New genre styles:**

| Style                 | Device                                                         | Notes                                                                                                                                       |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `agbekor` (Ewe, 12/8) | Timeline (the standard bell) under a layered 3:2 / 4:3 texture | The model has a `west-african` genre with no summary; this gives it one. Bell on the cowbell lane, the drums' cross-pulses on toms and kick |
| `mozambique`          | Ostinato-independence                                          | Already `style:mozambique` in the model (Pello el Afrokan); today only Gadd's songs use it                                                  |

Haake's and Carey's styles carry polymeter and odd superimposition
themselves; no generic "metal polymeter" style is needed beyond theirs.

## 8. The PRs

The order is chosen so each PR is useful alone, and **the wire format changes
once, in 12-d**.

| PR       | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Size | Done when                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **12-a** | **The Polyrhythms library on today's grids.** `streams`, `counts`, `cycles`, `hands` on the pattern (optional `st`, `ct`, `cy`, `hd`, no bump); stream layers; feel either side; two count rows, cycle bar lines and RH/LH lane labels on the chart; the drummer obeys a lane's hand; click on pulse, cross or both; the generic library card; the non-style map; shelves 1–5 and 7, two-hand entries in both handings; the ladder preset; docs and CHANGELOG       | L    | The card lists six shelves. A 3:2 entry plays the pulse at L1, the three at L2 and both at L3, and prints two count rows. Its RH-three handing has the 3D drummer's right hand on the floor tom and its left on the snare, and the other handing swaps them. A 3/4-over-4/4 entry draws its cycle lines. A pre-12-a reader strips `st`/`ct`/`cy`/`hd` and plays the full figure. The ladder makes three items an entry |
| **12-b** | **The records and the vocabulary.** Schema 1.5 `devices`; the tags of §7 A; the transcription-level sourcing pass for the drummers §6 has no device for; a `drumming-research.md` section AC "Polyrhythm"; the device filter on the lineage map; BeatBuddy reads `devices` through the existing drummer tools                                                                                                                                                       | M    | The validator refuses an unsourced device. Every drummer in §6's last row has a device or a recorded "searched, none found". The map filters to cross-rhythm drummers. Asked "who plays threes over the bar?", BeatBuddy names Tony Williams with his source                                                                                                                                                           |
| **12-c** | **Polyrhythmic fills on the grid.** `polyFill`/`polyFills`; `addPolyFill` on a salted stream, in both phrase builders, over the bar line; the critic's span rule; `fitHands`; the clave guard on both cross-rhythm steps; `styleIn`; layers; the doctor's move; the nine drummers of §6 and any 12-b sourced                                                                                                                                                        | L    | Every existing golden unchanged. Elvin's style at seed _x_ writes a 3-over-4 tom figure that resolves on the next 1 and passes `playability`. A `clave` style's poly fill never crosses the 3-side. A style with none draws no extra random numbers. Over 200 seeds, a style's poly fills appear at its `polyFill` rate ±10%                                                                                           |
| **12-d** | **Tuplet spans (wire v8).** `Pattern.tuplets`, `tu`, a span across lanes; perform and transport; MIDI export; **MIDI import keeps triplets and tuplets** rather than rounding them to 16ths; the engraver's bracket; the editor's merged cells; drummer timeline; critic; layers; BeatBuddy text; shelf 6; `device: 'tuplet'` poly fills for those §6 sources allow; tempo ratios ×3/2 and ×4/3 (and inverses) and shelf 7, metric modulation, moved here from 12-a | L    | A 5:4 entry plays five even notes against four (tested to the sample), prints a bracketed 5, and exports to MIDI at 96-tick spacing. A quintuplet round the toms is one bracket. A MIDI file of 8th-note triplets in 4/4 imports as triplets, and one of quintuplets as a span. A pre-v8 reader refuses a code with `tu`. A code without `tu` keeps its bytes and `gridHash`                                           |
| **12-e** | **Drummers: Haake and Carey** (metal and progressive), with their styles, songs, kits and records                                                                                                                                                                                                                                                                                                                                                                   | L    | Both records validate at 1.5 with sourced devices; each style has songs and `polyFills`; the record↔style test passes both ways                                                                                                                                                                                                                                                                                        |
| **12-f** | **Drummers: Hoenig, Roach, Prieto**, and the `agbekor` and `mozambique` styles                                                                                                                                                                                                                                                                                                                                                                                      | L    | As 12-e; the two genre styles generate in clave or bell without crossing it                                                                                                                                                                                                                                                                                                                                            |
| **12-g** | **The second wave** (§7 B): research each to song level, then add those that hold up, as 12-e                                                                                                                                                                                                                                                                                                                                                                       | L    | Each researched drummer is either added (record, style, songs, kit) or recorded as "searched, not sourced" with the search                                                                                                                                                                                                                                                                                             |

**Why the drummers come after 12-d.** They don't depend on it, but Haake's
odd groupings, Carey's 7s and Hoenig's 5:4 are tuplets. Written before 12-d
they would be groupings of 16ths standing in for the real figure, and then
rewritten. After it they are written once, as played.

**Gates per PR,** as ever:

- `/pre-pr`, then `/security-review`, then `/code-review`, then
  `npm run format`;
- `/docs-audit` on `catalogue.md`, `breaks.md`, `sessions.md` and
  `drummers.md`;
- a CHANGELOG entry where the wire format or a published model changes (12-a,
  12-d).

**Not looked at in a browser** (the owner is on Arc); the hook and component
tests open an entry from the catalogue.

### 12-a against the tree

Built 2026-10-14. Where the tree changed the design above, the tree won;
[`app-plan.md`](./app-plan.md#phase-12--polyrhythms--l) § 12-a built has the
list. In short: one `py` key carries everything §4 and §5 gave separate keys
(`st` was taken); the hands compile into the existing sticking; layer 3 is
_Together_ and keeps the accents where they are the figure; the click
follows whichever stream you count, with no "both"; metric modulation (shelf 7) moves to 12-d, because ×3/2 needs wire v8; and the resultant mnemonics are
left out for want of a source. 12-a has 25 entries on five shelves.

### 12-c against the tree

Built 2026-10-14; [`app-plan.md`](./app-plan.md#phase-12--polyrhythms--l)
§ 12-c built has the list. In short: a poly fill is one cell repeated back
from the bar line, landing on the 1; the vocabularies are § AC's sourced
devices, which make Elvin's three-over-four his three-beat polymeter rather
than an unsourced 3:4; the pattern records each span (`ps`, additive) so the
critic, the layers and `fitHands` can find it after a share; and the critic
scores a span as the plain fill it replaced, so it is kept at its rate.

### 12-d against the tree

Built 2026-10-15; [`app-plan.md`](./app-plan.md#phase-12--polyrhythms--l)
§ 12-d built has the list. In short: a span stays inside its bar (notation
never brackets over a bar line) and owns its cells as read as well as
written; `performStep` voices tuplets, so every output and the drummer get
them from one place; MIDI import reads triplet files in `4/4-6` and tuplets
over a bar, then a beat, needing three notes in a lane to call it one;
metric modulation is a library entry carrying its B (`th`), and the loop is
the way back; shelf 6 has nine entries and shelf 7 five, 39 on seven
shelves; tuplet poly fills are built but unused, since § AC sources none.

### 12-e against the tree

Built 2026-10-15; [`app-plan.md`](./app-plan.md#phase-12--polyrhythms--l)
§ 12-e built has the list. In short: Haake's device is polymeter, in his own
words, with a grouping in Electric Red; Carey's are Eulogy's threes, Rosetta
Stoned's fives and the fives over the bar line in Forty Six & 2; neither
sources a tuplet. Seventeen songs from human tabs, Haake's two bars at a time
so the riff crosses the bar line. Bleed (32nds) and Lateralus and Schism
(odd eighth meters in sixteenths) are left out, with the reason in research
§§ AD and AE.

## 9. Decisions

### Decided — 2026-10-14

Settled on the owner's rule: **what is right for drummers using the app, not
what is easiest to build.** Where that changed the first recommendation, the
last column says how.

| #   | Decision                                 | Outcome                                                                                                                                                                                                                                                               | Against the first draft                                                                  |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| D53 | How a true tuplet (5:4, 7:4) is held     | **Tuplet spans over the existing grid, on wire v8, one span across every lane it touches.** A drummer reads a tuplet as a bracket and a number, and edits it as a figure; a finer grid would have to guess both from tick positions, and give 192 cells a bar to edit | A span now covers several lanes, so a quintuplet round the toms is one bracket, not five |
| D54 | What the layers do on a polyrhythm entry | **Build up a stream at a time** (pulse, cross, both, accented, full), from `Pattern.streams`, and **either stream can be felt as the pulse**. That is how the figure is taught                                                                                        | Added: feel either side                                                                  |
| D55 | Ship tuplets in this phase               | **Yes, as 12-d, with MIDI import that keeps triplets and tuplets.** Today an imported triplet groove is rounded to 16ths, which is the wrong music; a drummer bringing in a 5:4 should get a 5:4                                                                      | MIDI import moved into the phase from "not in this phase"                                |
| D56 | Who gets polyrhythmic fills              | **Drummers with a sourced device**, and **no drummer is left without one before a transcription-level search** (12-b). An odd meter, a sextuplet rudiment or a reputation isn't a device; displacement in clave is written and labelled as displacement               | Added: the search before "none"                                                          |
| D57 | Which new drummers                       | **Haake, Carey (12-e); Hoenig, Roach, Prieto (12-f); then a researched second wave (12-g):** Harrison, Bozzio, Haynes, DeJohnette, Sánchez, Colaiuta, and Berroa if distinct. Each is added once its devices hold at song level, never on reputation                  | Added: 12-g goes and finds the sources instead of deferring indefinitely                 |
| D58 | New genre styles                         | **`agbekor` and `mozambique`.** No generic "polymeter" style: Haake's and Carey's styles carry it as they played it                                                                                                                                                   | —                                                                                        |
| D59 | Where the practice area lives            | **A card in the Generate drawer, beside Rudiments.** The two practice libraries belong together, and Generate is where the owner put Rudiments after seeing it buried in Libraries                                                                                    | —                                                                                        |
| D60 | Which hand plays which stream            | **A hand per lane on an entry** (`Pattern.hands`, `hd`), obeyed by the 3D drummer and labelled on the chart, with every two-hand entry in both handings. A 3:2 is taught as "right hand three, left hand two", then swapped                                           | New. The draft left the hands to the cost search                                         |
| —   | When the new drummers come               | **After 12-d**, so their tuplet figures are written once, as played, not as stand-in groupings                                                                                                                                                                        | The draft offered them sooner                                                            |

## 10. Risks

- **Goldens.** Any extra draw on the main rng shifts every later draw for
  every style. The salted sub-stream, and drawing nothing when `polyFill` is
  absent, is what keeps them; 12-c's done-when holds it.
- **The critic selects against the feature.** Without the span rule,
  `generateGood` quietly keeps the conventional candidate, and poly fills
  would be specified but rarely heard. A test asserts they appear at the
  expected rate over N seeds.
- **Honesty.** Most popular-press "polyrhythm" is displacement, odd meter or
  polymeter. The taxonomy and D56 exist to stop the app teaching the wrong
  word. The research's unsourced claims (§7 B) stay out.
- **Wire v8.** A v8 code opened by a pre-12-d client is refused, as v7 was.
  That is acceptable only because codes without spans keep their version.
- **The 3D drummer.** A 3:2 between two hands on two drums is fine for the
  cost search. 5:4 and 7:4 between hand and foot have no adjacent-step
  structure, and the look-ahead `forecast` assumes even steps. 12-d's done
  list includes the drummer playing a 5:4 with its hits on the scheduled
  times.
- **Size.** Five new drummers at D50's standard is the bulk of the work:
  research, records, songs and kits. 12-e and 12-f are the PRs most likely to
  split again.
- **Hub.** This repo's `CLAUDE.md` says planning is claimed and tracked in
  the HCE Hub, but its MCP tools were not in this session. The plan was
  written here; claiming and task entry wait for the Hub.
- **The second wave may not all hold.** 12-g can end with fewer drummers
  than it names. That is the rule working, not a shortfall.

## 11. Not in this phase

- **Editing polyrhythms in the Studio** beyond what the step editor gives
  (writing a tuplet span by hand comes with 12-d; a "make this a 3:2"
  command does not).
- **BeatBuddy writing tuplet spans** (as D46 left sticking).
- **A 32nd-note meter** (D46 stands). A span with `n: 2` over one step _is_
  a pair of 32nds, so closing the rudiments' rolls on the chart becomes
  possible after 12-d. It is a follow-on, not part of this phase.
- **Simultaneous meters with different pulses** (polytempo).
- **A full limb row a step** (RH/LH/RF/LF per note). D60's hand-per-lane
  covers what a polyrhythm exercise needs; a per-step limb row is a larger
  change to sticking (D44) with no exercise asking for it yet.

## 12. Sources

From the 2026-10-14 research pass. Each goes into `sources/` and
`drumming-research.md` § AC with the claim it supports.

- **Tony Williams:**
  - VOA, 2012-03-15 (polyrhythms and metric modulation);
  - University of Sydney thesis, `ses.library.usyd.edu.au/handle/2123/7797`.
- **Tomas Haake:**
  - `drumeo.com/beat/meshuggah-tomas-haake-genius/`;
  - Louder, "Inside the mind of Tomas Haake";
  - Guitar World, Peter Nordin on _Future Breed Machine_.
- **Danny Carey:** `drumeo.com/beat/danny-carey-genius/`.
- **Ari Hoenig:**
  - Modern Drummer, 2012-10, _Metric Modulations_ review;
  - `en.wikipedia.org/wiki/Ari_Hoenig`;
  - `arihoenig.bandcamp.com`.
- **Max Roach:**
  - NPR, 2007-08-18, `npr.org/2007/08/18/12899514`;
  - `en.wikipedia.org/wiki/Jazz_in_3/4_Time`.
- **Dafnis Prieto:**
  - `dafnisonmusic.com/a-world-of-rhythmic-possibilities`;
  - JazzTimes (MacArthur);
  - Boston Globe, 2012-02-24.
- **Steve Gadd:**
  - `en.wikipedia.org/wiki/Late_in_the_Evening`;
  - MusicRadar, "5 tracks… Steve Gadd".
- **Stewart Copeland:** MusicRadar, "How to play drums like Stewart Copeland".
- **Tony Allen:** The Globe and Mail, obituary.
- **Gavin Harrison:** `ejazzlines.com/rhythmic-illusions-gavin-harrison`.
- **Terry Bozzio:** `en.wikipedia.org/wiki/Terry_Bozzio`.
- **Ignacio Berroa:** `en.wikipedia.org/wiki/Ignacio_Berroa`.
- **Chris Dave:** `researchcatalogue.net/view/605164/605165`.
- **Bell pattern / Ewe:**
  - `en.wikipedia.org/wiki/Bell_pattern`;
  - Agawu, _JAMS_ 2006.
- **To find in 12-a:** a citable source for the resultant mnemonics ("hot cup
  of tea", "pass the golden butter"). If none is found, they ship as "a
  common way to count it", not as attributed.
