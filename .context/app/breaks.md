# The break domain

`lib/app/breaks/` is BeatBreaker's engine: pure TypeScript with no DOM and no
state, so the same code runs in the browser, on the server, and (Phase 7) behind
BeatBuddy's tools. This page is the map: what each module does, the rules that
hold across them, the wire format a break travels in, and `/api/v1/breaks`.

**The content it works on lives in the database** — styles, the famous-breaks
library and the kits are rows, and every function here takes what it needs as an
argument. That is [`catalogue.md`](./catalogue.md); this page assumes it.

## Rules that hold everywhere

- **One step is a sixteenth note in every meter.** A meter decides how many
  steps a bar holds (`num × sub`) and how they group into pulses. It never
  changes how long a step lasts. The transport, swing, the MIDI writer and the
  engraver all rely on this.
- **Every bar carries every lane, full length**, even lanes the pattern does not
  use (`pattern.lanes` says which it does). Turning a lane on never reshapes a
  bar.
- **Lane values are small integers**, legal range per lane in `LANE_VALUES`
  (`lanes.ts`): kick 0–2, snare 0–4 (ghost, hit, accent, cross-stick), hat 0–3
  (closed, accent, open), ride 0–2, crash 0–1, toms 0–2, foot 0–1, percussion
  0–2. Untrusted values are checked against those ranges in one place, the
  packed-bar schema in `schema.ts`.
- **Seeded, never `Math.random()`.** `makeRng(seed)` is xorshift32 (13, 17, 5)
  and its sequence is pinned in `tests/unit/lib/app/breaks/rng.test.ts`. The same
  seed and options always produce the same break, everywhere. **Changing the RNG
  changes what every seed means.** Saved breaks keep their full grid, so they
  are safe, but anything that re-derives from a seed is not.
- **Functions return new patterns.** `doctor()`, `deriveB()`, `reducePattern()`
  and the rest leave their input untouched, which is what makes undo a matter of
  keeping the old reference. Tests enforce it for every doctor move.
- **Layers are a view, not a copy.** A break is stored whole (L5); L1–L4 are
  derived by `reducePattern()`. A pin (`Pattern.pins`) records the layer a note
  was placed at, so reduction does not remove a note someone drew by hand.
- **Nothing here imports content.** No module under `lib/app/breaks/` reads a
  style, library or kit table; the caller resolves one and passes it in. A grep
  test enforces it (`no-content-imports.test.ts`). See
  [`catalogue.md`](./catalogue.md).
- **A pattern stands on its own.** It carries `styleVersionId` (which version
  made it) and `attrs` (the five style facts playback, the critic and the MIDI
  export read). Playing, scoring and exporting need nothing else; generating,
  deriving a B section and doctoring take the live `Style` as an argument.

## Modules

| Module            | What it does                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`        | `Pattern`, `Bar`, `Pins`, `Meter`, `Style`, `StyleAttrs`, `ResolvedStyle`, `Feel`: the shapes everything else agrees on.                                                                                            |
| `meter.ts`        | The 12 meters. `stepsOf`, `groupsOf` (pulse groups in steps), `isGroupStart`, `pulseInfo`, `countLabelsOf`, and `remapStep`/`remapList`, which carry a style's 4/4 positions into another meter by (pulse, offset). |
| `styles.ts`       | `styleIn(style, meter)` — a style carried into a meter it was not written for, by pulse rather than by raw step index. The style **table** is seed data now; see `catalogue.md`.                                    |
| `lanes.ts`        | Lane keys and order, `LANE_VALUES`, `LANE_DEFS`, percussion instruments (`PERC_INSTS`), the default mix, rosters per style.                                                                                         |
| `pattern.ts`      | `emptyBar`, `clonePattern`, pins (`pinArray`, `setPin`), `resolveLanes`, `writePerc`, and `parseBar`, which reads the bar-string notation the library is written in.                                                |
| `rng.ts`          | `makeRng`, `wpick` (weighted pick), `clamp`.                                                                                                                                                                        |
| `generate.ts`     | `generatePattern` (one candidate), `deriveB` (the B section from an A), `toRide`, fills, `nameBreak`.                                                                                                               |
| `critic.ts`       | `playability` is a pass/fail gate ("can four limbs play this?"). `critique` is a 0–100 opinion. `generateGood` draws 16 candidates and keeps the best, and an unplayable one wins only if nothing passes.           |
| `layers.ts`       | `reduceBar` / `reducePattern` for L1–L5, `LAYER_NAMES`, and `LAYER_V1_TO_V2` for codes saved before the layers were renumbered.                                                                                     |
| `engrave.ts`      | Notation as an `SvgNode` tree plus a playhead `map` with one anchor per step. It builds no DOM, so it runs on the server.                                                                                           |
| `doctor.ts`       | The twelve named edits (`DOCTOR_MOVES`). `entropy` makes a move reproducible when you pass a fixed value.                                                                                                           |
| `library.ts`      | `LibraryItem` (the shape the seed data is written in) and `patternFromLibrary(item, index, style?)`, which the seed runs to build each entry's stored document. The 47 entries themselves are rows.                 |
| `feel.ts`         | Swing positions, the per-style off-grid feel, and hi-hat dynamics. These change _when and how hard_ a note sounds, never the pattern.                                                                               |
| `share.ts`        | `encodeBreak` / `decodeBreak` (base64 share codes) and `breakDocFromPayload` (the same conversion for a JSON body).                                                                                                 |
| `schema.ts`       | Zod schemas for everything from outside: `sharePayloadSchema`, `packedPatternSchema`, `styleAttrsSchema`, `feelSchema`.                                                                                             |
| `catalogue/*`     | The data layer, the row schemas and the admin write shapes. Server-side. See `catalogue.md`.                                                                                                                        |
| `midi.ts`         | `buildMidi`: a format-0 Standard MIDI File, GM drum map on channel 10, with swing and feel written into the tick positions.                                                                                         |
| `kit.ts`          | The kit vocabulary — slots, voices, knob definitions, `ResolvedKit`, and the synth's own `SYNTH_FALLBACK` / `SAMPLE_STAND_IN`. The kit **table** is rows. Browser-only consumers.                                   |
| `pending-link.ts` | Carries a shared link's `#b=` fragment through sign-in (see below).                                                                                                                                                 |
| `audio/*`         | Browser only. `engine.ts` (Web Audio), `transport.ts` (the look-ahead clock, metronome, MIDI out), `packs.ts` / `user-kit.ts` (recorded and user samples), `midi-out.ts` (Web MIDI port).                           |

## The wire format (share code, version 4)

A break travels as a `BreakDoc` (`{ bpm, swing, level, arrangement, A, B }`)
packed into a `SharePayload`. As a share code or a `#b=` link, the payload is
base64 of its UTF-8 JSON. As an API body or a `Break.doc` column, it is the JSON
itself. All three are checked by the same schema.

```jsonc
{
  "ver": 4,            // 1–4 accepted; encode writes 4
  "bpm": 94,           // 20–400
  "sw": 0,             // swing, 0–100
  "lv": 5,             // layer 1–5 (v1 numbers are remapped)
  "arr": ["A","A","B","A"],
  "A": {
    "n": "Name",       // ≤120 chars
    "st": "funk",      // kept as written — v4 does NOT substitute a default
    "sv": "clx…",      // style version id — v4; absent in v3
    "sa": { "feel": {…}, "swingUnit": 8, "kickFeather": 0.26,
            "targetDensity": 12, "hatDepth": 0.9 },   // the snapshot — v4
    "v": "hat",        // hat | ride
    "sd": 12345,       // seed, uint32
    "bb": [4, 12],     // backbeat steps, 0–63
    "mt": "4/4",       // absent in v2 → 4/4; unknown → 4/4
    "ln": ["k","s","h","r","c"],   // absent in v2 → the five base lanes
    "pc": { "p1": "tamb", "p2": "shaker" },   // keys p1/p2, values PERC_KEYS
    "bl": "s",         // backbeat lane
    "hr": 0, "hh": 0,  // style writes its own ride / hat pattern
    "pn": [0, { "s": "0020…" }],   // pins per bar: layer digits 0–5, or 0
    "b": ["1000100010001000|0000100000001000|…"]   // 1–8 bars
  },
  "B": { … }
}
```

**Version 4 is what makes a pattern stand on its own.** `sa` is a snapshot of
the five style attributes playback, the critic and the MIDI export read, so a
break plays, scores and exports identically on an installation that has never
heard of its style. `sv` records which version produced it, for provenance and
for re-deriving from the seed. A v3 code still decodes: `decodeBreak(code,
styles)` takes an optional synchronous lookup that rebuilds the snapshot from
the current catalogue, and without one the break opens with default feel. See
[`catalogue.md`](./catalogue.md) for why `sa` must not carry a Zod `.default()`.

Each bar string is **every lane's row in `LANES` order** (`k s h r c t1 t2 t3
hf p1 p2`), joined by `|`, one digit per step. A shorter bar string (a v2 code
has five rows) leaves the missing lanes empty.

The schema **accepts a missing field and rejects a malformed one**. Missing
fields get defaults, so old codes keep loading. A present field has to be
right: bar rows are digits within the lane's own range, at most 11 rows of at
most 32 steps. The seed is a uint32, `pc` names real instruments, and pins are
digits 0–5. Reads that are too lenient here turn into NaN in the engraver or
junk rows in the database.

**Never `.partial()` a schema that has `.default()`s.** Zod applies the
defaults inside `.partial()`, so a PATCH schema built that way writes the
default into every field the request left out. `lib/validations/breaks.ts`
builds create and update from one default-free base for this reason. Before
that fix, a rename unshared the break (H1).

## `/api/v1/breaks`

All routes need a session (`withAuth`). The section rate cap comes from
`proxy.ts`, so there is no limiter in the handlers. Every body goes through
`sharePayloadSchema`, the same schema a pasted code goes through.

**Strict on the way in, forgiving on the way out.** A stored `doc` is read
through `storedPayloadSchema`, which repairs what rows saved under the looser
rules (before H6) could carry, then applies `sharePayloadSchema` as normal.
Repair means clamping each step to its lane's range, zeroing stray
characters, dropping unknown instruments, lanes and backbeats, and wrapping
the seed to 32 bits. Otherwise one bad digit would make a saved break
unopenable for its owner and for everyone it was shared with. Use it for
database rows only; input from outside is refused, not repaired.

| Route                       | Does                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/breaks`        | The caller's own breaks, newest first. `style`, `meter`, `limit` (≤100, default 50), `cursor`. `meta.nextCursor` comes from a look-ahead row. List rows never carry `doc`.                                                        |
| `POST /api/v1/breaks`       | `{ title, doc, shared? }`. Owner is the session user (a `userId` in the body is ignored). `style`, `meter`, `bpm`, `swing`, `seed` and `bars` are **derived from `doc`**. The response adds `critique: { score, playable }`. 201. |
| `GET /api/v1/breaks/:id`    | One break if the caller owns it **or** it is `shared`, in a single query. A miss is **404, never 403**. `seed` is a string (BigInt). `mine` says whose it is. `critique` is computed on the way out, never stored.                |
| `PATCH /api/v1/breaks/:id`  | Owner only (someone else's shared break is a 404). Writes only the fields the request names. A new `doc` re-derives the list columns.                                                                                             |
| `DELETE /api/v1/breaks/:id` | Owner only, via `deleteMany` with the owner in the filter. A miss is 404. Takes cascade.                                                                                                                                          |

Ownership markers: list, create, PATCH and DELETE are `decidedBy: 'self'`.
`GET /:id` is `decidedBy: 'nothing'`: its own query decides (own or shared), and
a `resource` resolver would make the policy refuse every shared read (H12).

Tests: `tests/integration/api/v1/breaks/`.

## The domain endpoints

Every domain operation is an endpoint as well as a function. The web Studio
keeps running them in the browser — a regenerate should not wait on the network
— but the web app is the first client and not the only one (D14), and a native
app has nothing but `/api/v1`. **One implementation, many callers.**

All five are `POST`, signed-in, stateless (nothing is written), and under the
section cap. All are `decidedBy: 'nothing'` because there is no row and
therefore no subject to scope to.

| Route                          | Body                                                                              | Answers                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/v1/breaks/generate` | `styleKey`, `styleVersion?`, `meter`, `bars`, `density`, `ghosts`, `bpm`, `seed?` | `{ seed, styleVersionId, A, B, critique, playability, tries, rejected }` |
| `POST /api/v1/breaks/doctor`   | `styleKey`, `styleVersion?`, `doc`, `move`, `entropy?`                            | `{ doc, critique, playability }`                                         |
| `POST /api/v1/breaks/critique` | `doc`, `bpm`                                                                      | `{ critique, playability }`                                              |
| `POST /api/v1/breaks/engrave`  | `doc`, `layer`, `scale`, `perSystem`, `guides`, `sticking`                        | the `Engraving` — nodes, playhead map, dimensions                        |
| `POST /api/v1/breaks/midi`     | `doc` (a whole `SharePayload`), `feel`, `hats`, `bars`                            | `audio/midi` bytes                                                       |

Four things worth knowing:

- **`generate` with a seed runs the generator once; without one it runs the
  rejection sampler.** Handing `generateGood` a seed would give a different
  pattern on every call, which is the opposite of what a seed is for. The
  response always reports the seed of the pattern it returned.
- **`critique` takes no style.** The critic reads the snapshot the pattern
  carries, so a break scores the same for the person who made it and for anyone
  they send it to. `doctor` _does_ take one, because a move writes new notes.
- **`engrave` returns the node tree, not an SVG string.** A caller that wants a
  file serialises it in three lines; a caller drawing natively reads the same
  structure. A string would make the second one parse XML to find the notes.
- **`midi` answers with bytes, not the JSON envelope** — the one domain endpoint
  that does. Refusals still use the envelope.

Tests: `tests/unit/app/api/v1/breaks/domain-operations.route.test.ts`. Every one
asserts the route's output is **byte-identical to calling the function
directly** — that is the claim worth making, and a test that only checked for a
200 would pass on the day the server and the browser diverge. The MIDI
comparison is made at `hats: 0`, because `hatShape` carries a deliberate
`Math.random()` wobble at anything above it; a second case pins that the wobble
is still there.

## Opening a shared link signed out

`/breaks` is **not** in `lib/app/protected-routes.ts`. The page gates itself
because the break is in the URL fragment, which an edge redirect cannot forward
and the login form drops. Signed out, the page renders `SignInToOpen`, which
stashes the fragment (`pending-link.ts`, localStorage, one-hour expiry) and
sends the visitor to `/login?callbackUrl=/breaks`. After sign-in, the console
puts the fragment back in the URL before reading it. Phase 1's `/breaks` →
`/studio` redirect has to keep this working. Phase 6's public `/p/[slug]`
replaces it.

## Tests

`tests/unit/lib/app/breaks/` sweeps every style × meter (444 combinations) for
bar length, legal values, determinism, a findable backbeat, and NaN-free
engraving with one playhead anchor per step. It also covers share-code
round-trips in every style (pins included) and what the schema refuses, the
library, every doctor move, the MIDI file at byte level, and the RNG's pinned
sequence. `tests/unit/lib/app/breaks/audio/transport.test.ts` drives the clock
against a fake engine for the metronome in all 12 meters and for MIDI out.
`tests/unit/components/app/breaks/use-break-console.test.ts` drives the state
hook's actions one at a time, with the engine, sample sources and MIDI port
faked, and `sign-in-to-open.test.tsx` beside it covers the signed-out face of
the route. There is no whole-console mount test: the console moved into the
Studio shell, and `tests/unit/components/app/studio/` is where its surfaces are
exercised now.
