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

| Module             | What it does                                                                                                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`         | `Pattern`, `Bar`, `Pins`, `Meter`, `Style`, `StyleAttrs`, `ResolvedStyle`, `Feel`: the shapes everything else agrees on.                                                                                                                                                                                              |
| `meter.ts`         | The 12 meters. `stepsOf`, `groupsOf` (pulse groups in steps), `isGroupStart`, `pulseInfo`, `countLabelsOf`, and `remapStep`/`remapList`, which carry a style's 4/4 positions into another meter by (pulse, offset).                                                                                                   |
| `styles.ts`        | `styleIn(style, meter)` — a style carried into a meter it was not written for, by pulse rather than by raw step index. The style **table** is seed data now; see `catalogue.md`.                                                                                                                                      |
| `lanes.ts`         | Lane keys and order, `LANE_VALUES`, `LANE_DEFS`, percussion instruments (`PERC_INSTS`), the default mix, rosters per style.                                                                                                                                                                                           |
| `pattern.ts`       | `emptyBar`, `clonePattern`, pins (`pinArray`, `setPin`), `resolveLanes`, `writePerc`, and `parseBar`, which reads the bar-string notation the library is written in.                                                                                                                                                  |
| `rng.ts`           | `makeRng`, `wpick` (weighted pick), `clamp`.                                                                                                                                                                                                                                                                          |
| `generate.ts`      | `generatePattern` (one candidate), `deriveB` (the B section from an A), `toRide`, fills, `nameBreak`.                                                                                                                                                                                                                 |
| `critic.ts`        | `playability` is a pass/fail gate ("can four limbs play this?"). `critique` is a 0–100 opinion. `generateGood` draws 16 candidates and keeps the best, and an unplayable one wins only if nothing passes.                                                                                                             |
| `layers.ts`        | `reduceBar` / `reducePattern` for L1–L5, `LAYER_NAMES`, and `LAYER_V1_TO_V2` for codes saved before the layers were renumbered.                                                                                                                                                                                       |
| `engrave.ts`       | Notation as an `SvgNode` tree plus a playhead `map` with one anchor per step. It builds no DOM, so it runs on the server.                                                                                                                                                                                             |
| `doctor.ts`        | The twelve named edits (`DOCTOR_MOVES`). `entropy` makes a move reproducible when you pass a fixed value.                                                                                                                                                                                                             |
| `library.ts`       | `LibraryItem` (the shape the seed data is written in) and `patternFromLibrary(item, index, style?)`, which the seed runs to build each entry's stored document. The 47 entries themselves are rows.                                                                                                                   |
| `feel.ts`          | Swing positions, the per-style off-grid feel, and hi-hat and ride dynamics (`hatShape`, the same shape for both). These change _when and how hard_ a note sounds, never the pattern.                                                                                                                                  |
| `share.ts`         | `encodeBreak` / `decodeBreak` (base64 share codes), `breakDocFromPayload` (the same conversion for a JSON body) and `breakPayload` (a break as the JSON a save sends).                                                                                                                                                |
| `schema.ts`        | Zod schemas for everything from outside: `sharePayloadSchema`, `packedPatternSchema`, `styleAttrsSchema`, `feelSchema`.                                                                                                                                                                                               |
| `catalogue/*`      | The data layer, the row schemas and the admin write shapes. Server-side. See `catalogue.md`.                                                                                                                                                                                                                          |
| `perform.ts`       | `performStep`: **the one place a written note becomes a sound** — GM note, 0–1 velocity, swing-and-feel offset. The speakers, the live MIDI port and the MIDI file all voice from it. Also `LEVELS`, the cymbal bands, `midiVelocity` and `valueForVelocity` (what `readMidi` reads by). See _One performance_ below. |
| `midi.ts`          | `buildMidi`: a format-0 Standard MIDI File, GM drum map on channel 10. Every note's velocity and position come from `performStep`, so the file is the performance you hear.                                                                                                                                           |
| `text.ts`          | `toText` / `fromText`: a pattern as one line per lane per bar, in the library's characters plus the percussion lanes. How BeatBuddy reads and writes a pattern. `fromText` is strict and names the bar, lane and step it refuses. See _The text notation_ below.                                                      |
| `tidy.ts`          | `tidy`: the deterministic clean-up behind "tidy up notes" — six rules, every change reported, never adds a note, idempotent.                                                                                                                                                                                          |
| `midi-read.ts`     | `readMidi`: the inverse of `buildMidi`. GM map to lanes, quantised to sixteenths, meter and tempo from the file. Bounds-checked; a bad file is an error, not an exception.                                                                                                                                            |
| `groove-scribe.ts` | `readGrooveScribeUrl`: a Groove Scribe link read from its query string, nothing fetched. Groove Scribe's own two sites only (`GROOVE_SCRIBE_HOSTS`).                                                                                                                                                                  |
| `import.ts`        | `ImportedPattern` (what both readers produce) and `importedDoc`, which makes it a document: bars 1–8 are A, 9–16 are B.                                                                                                                                                                                               |
| `read-import.ts`   | `readImport`: code, `#b=` link, Groove Scribe link or MIDI file in; a `BreakDoc` out. The one entry point behind the import endpoint.                                                                                                                                                                                 |
| `kit.ts`           | The kit vocabulary — slots, voices, knob definitions, `ResolvedKit`, and the synth's own `SYNTH_FALLBACK` / `SAMPLE_STAND_IN`. The kit **table** is rows. Browser-only consumers.                                                                                                                                     |
| `pending-link.ts`  | Carries a shared link's `#b=` fragment through sign-in (see below).                                                                                                                                                                                                                                                   |
| `links.ts`         | `parseReferenceLink`: a YouTube, Vimeo or Spotify link, https and exact hosts only, rebuilt as a canonical URL from its id. `readStoredLinks` re-checks a stored list on the way out; `storedLinkSchema` reads one on the client.                                                                                     |
| `columns.ts`       | `columnsFromDoc`: the `Break` columns read off the document (style, style version, meter, tempo, swing, seed, bars, level), never off the request.                                                                                                                                                                    |
| `scratch.ts`       | The pattern that has never been saved, kept in `localStorage` (`bb.scratch`) across a reload; read back through `sharePayloadSchema`.                                                                                                                                                                                 |
| `saved/data.ts`    | `openSavedBreak`: the one "yours or not private" read that `GET /:id`, `/studio/[id]` and the copy route share. Server-side.                                                                                                                                                                                          |
| `saved/targets.ts` | What a pin and a practice visit point at: `visibleTarget` (the "yours, not private, or in the catalogue" rule), `TARGET_SELECT`, `toTargetView`, `targetVisible`. Server-side; `pins.ts` and `history.ts` share it.                                                                                                   |
| `audio/*`          | Browser only. `engine.ts` (Web Audio), `transport.ts` (the look-ahead clock, metronome, MIDI out), `packs.ts` / `your-samples.ts` (recorded kits and yours, [`samples.md`](./samples.md)), `encode-wav.ts` (a picked file as a sample), `midi-out.ts` (Web MIDI port).                                                |

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
that fix, a rename unshared the break (H1). `visibility` has no default in
the update schema for the same reason.

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

| Route                       | Does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/breaks`        | The caller's own breaks. `sort=created` (default, newest first) or `updated`; `q` (case-insensitive title search), `style`, `meter`, `visibility`, `limit` (≤100, default 50), `cursor`. Every order ends on `id`, so the cursor holds across ties. `meta.nextCursor` comes from a look-ahead row. List rows carry `level`, `visibility`, `slug`, `difficulty`, `description` and `links`, never `doc`.                                                                                                             |
| `POST /api/v1/breaks`       | `{ title, doc, visibility?, description?, links? }` — `visibility` is `private` (the default) or `link`, which mints a slug; never `published`. Owner is the session user (a `userId` in the body is ignored). `style`, `styleVersionId`, `meter`, `bpm`, `swing`, `seed`, `bars`, `level`, `gridHash` and `difficulty` are **derived from `doc`** (`columns.ts`). The response adds `critique: { score, playable }`. 201. `{ breaks: [...] }` saves up to 30 (`MAX_BULK_BREAKS`) in one transaction — all or none. |
| `GET /api/v1/breaks/:id`    | One break if the caller owns it **or** it is not `private`, in a single query (`openSavedBreak`). A miss is **404, never 403**. `seed` is a string (BigInt). `mine` says whose it is; the owner's `userId`, the `parentId` and the `gridHash` are never sent (H8). `basedOn` is the credit line on a copy, while its parent is published. `critique` is computed on the way out, never stored.                                                                                                                      |
| `PATCH /api/v1/breaks/:id`  | Owner only (someone else's shared break is a 404). Writes only the fields the request names: `title`, `doc`, `visibility` (`private` or `link`; the first move off private mints a slug, which is kept after), `description` (empty clears it), `links`. A new `doc` re-derives the list columns, `styleVersionId` included. This is what the Studio's autosave sends.                                                                                                                                              |
| `DELETE /api/v1/breaks/:id` | Owner only, via `deleteMany` with the owner in the filter. A miss is 404. Takes cascade.                                                                                                                                                                                                                                                                                                                                                                                                                            |

Ownership markers: list, create, PATCH and DELETE are `decidedBy: 'self'`.
`GET /:id` and `POST /:id/copy` are `decidedBy: 'nothing'`: the query decides (own or
not private), and
a `resource` resolver would make the policy refuse every shared read (H12).

**Reference links** (`links`, up to four): `https` on `youtube.com`,
`youtu.be`, `music.youtube.com`, `vimeo.com` or `open.spotify.com` only, with
the id checked against the provider's shape. What is stored is the URL rebuilt
from the id, never what was typed. A YouTube `t=` start time survives. Anything
else is a 400 naming what is accepted. They are kept out of `doc` so a pasted
share code cannot carry a URL onto someone's screen. `GET /:id` answers them
with `description`; the Studio edits both in its Details form and draws the
links as chips beside the title (task 4.11 — see [`patterns.md`](./patterns.md)).
A copy — Save on someone else's pattern, or Save a copy — carries them.

**Sharing, copies and usernames** (Phase 6) are in [`sharing.md`](./sharing.md):
`visibility` and the slug, `POST /api/v1/breaks/:id/copy`, and
`/api/v1/drummer-profile`.

Tests: `tests/integration/api/v1/breaks/`.

## `/api/v1/pins` — practice shelves

What you are **practising**, and what you want to practise **later** (D17). A
`Pin` row is the only record of it. There is no `Break.pinned`: a famous break
is a system row with no owner to hold a flag, and one flag cannot say which of
two shelves.

A pin points at **exactly one** target: one of your patterns, someone else's
**shared** pattern, or a library entry the catalogue shows. That rule is the
CHECK `pin_one_target`, hand-written in `20260924130455_practice_shelves` and
probed in `lib/app/db-drift.ts`, beside the hand-written `pin_userId_fkey`
(cascade). Deleting either target cascades to its pins. There is one pin per
target per person (`@@unique([userId, breakId])`, `…libraryEntryId`), so moving
between shelves is an update, never a second row.

Data layer: `lib/app/breaks/saved/pins.ts` (`listPins`, `pinTarget`, `movePin`,
`unpin`), server-side only. Schemas: `lib/validations/pins.ts`.

| Route                     | Does                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/pins`        | Both shelves in one query: `{ practising: [...], later: [...] }`, each in order. A pin carries its target: `kind: 'break'` (title, style, meter, bpm, level, `mine`) or `kind: 'entry'` (title, artist, `libraryKey`, …).                           |
| `POST /api/v1/pins`       | `{ shelf, breakId }` or `{ shelf, libraryEntryId }`. Pins it to the **top** of the shelf, 201. Already pinned: 200, left where it is on the same shelf, moved to the top of the other one. A target you cannot see is a 404.                        |
| `PATCH /api/v1/pins/:id`  | `{ shelf?, after? }`. `after` is another pin on the destination shelf (`null` is the top). A shelf change with no `after` lands at the top. An `after` not on that shelf is a 400. Someone else's pin, or one whose pattern was unshared, is a 404. |
| `DELETE /api/v1/pins/:id` | Unpin. Someone else's pin is a 404.                                                                                                                                                                                                                 |

**A pin is only as visible as its target.** When the owner of a shared pattern
unshares it, your pin on it stays on the shelf but drops out of the list. It
comes back if the pattern is shared again. The list and `POST` use the same
rule: yours, or not `private`, or in a `system` library.

**Positions are dense, 0 first.** Each placement renumbers the destination
shelf in one transaction. Unpinning or moving away leaves a gap, which sorts
the same and is closed by the next placement. Reordering is relative (`after`)
rather than by index, so pins hidden by the rule above cannot throw an index
off.

**Library entries are pinned by id, so the seed keeps ids stable.** It
upserts entries by `seedKey` (a slug of the title), not by position, so
inserting or reordering breaks in `data/library.ts` moves rows without
re-pointing pins. Renaming a break in the data file makes it a new entry and
drops pins on the old one; see `catalogue.md` § Seeding.

In the Studio, the shelves are read server-side with the page and handed to
`StudioProvider` (`pins`), so every ★ is right on first paint. `usePins`
(`components/app/studio/use-pins.ts`) reads them back from `GET` after each
change. `PinButton` is the ★ menu (Practising · Later · Not pinned). It sits on
each library row and beside the stage title. On the stage it pins the saved
pattern (`doc.id`), or else the library entry the stage was opened from. On a
scratch pattern it is disabled until the pattern is saved.

Tests: `tests/integration/api/v1/pins/`, `tests/unit/components/app/studio/pins.test.tsx`.

## `/api/v1/history` — practice history

What you **opened**, newest first, and where you **left** each one — the layer
and the tempo (D18). A `PracticeVisit` row is the only record of it; there is
no `Break.lastOpenedAt`, which could not hold a famous break and did not know
where you were in it.

A visit points at exactly one target, by the rule a pin does (CHECK
`practice_visit_one_target`, hand-written FK `practice_visit_userId_fkey`,
both in `20260924200000_practice_history` and probed). There is **one row per
target per person** — a revisit updates `level`, `bpm` and `visitedAt` rather
than adding a row — and the **newest 200** are kept (`HISTORY_CAP`): recording
the 201st drops the oldest, hidden rows included. The upsert selects only the
id, so Prisma sends one `INSERT … ON CONFLICT` and two tabs cannot race to a
duplicate. A scratch pattern has no identity and is never recorded.

Data layer: `lib/app/breaks/saved/history.ts` (`listHistory`, `recordVisit`,
`clearHistory`). Schemas: `lib/validations/history.ts`.

| Route                    | Does                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/history`    | The history in one query, newest first, at most 200. Each visit carries `level`, `bpm`, `visitedAt` and its target in the pin's shape (`kind: 'break' / 'entry'`). |
| `POST /api/v1/history`   | `{ breakId \| libraryEntryId, level (1–5), bpm (20–400, whole) }`. Records it at the top, 200. A target you cannot see is a 404.                                   |
| `DELETE /api/v1/history` | Forget all of it. `{ cleared: n }`.                                                                                                                                |

**A visit is only as visible as its target**, as a pin is: an unshared pattern
drops out of the list and comes back if it is shared again.

**In the Studio** (`components/app/studio/use-practice-history.ts`), the
history is read server-side with the page and handed to `StudioProvider`
(`history`). Whatever is on the stage with an identity — `doc.id`, or the
library entry it was opened from — is recorded when it arrives, and again 2s
(`RECORD_MS`) after its layer or tempo last moved; leaving it sends that last
place at once. **Back** in the header and `Alt+←` / `Alt+→` step through it
like a browser: each open moves its item to the top on the server, so
stepping walks a frozen _trail_ (the list when stepping began, and a cursor),
and any other open ends it. **Recent** is a tab in the Patterns drawer.

Opening an item lands where it was left. A library entry reopens from the
catalogue in the page (`loadLibraryEntry(id, at)`). A saved pattern is fetched
from `GET /api/v1/breaks/:id` and opened **in place** — `loadPayload` on the
console, `attach(id, mine)` on the document — with no page load, so the trail
and undo survive; the address bar follows. The layer and tempo are applied to
library entries and to other people's patterns, **not to your own**: yours
autosaves its layer and tempo as you change them, so its document already
says where you left it. A pattern that has since been deleted or unshared
(404) is taken out of the list, and the toast says so.

**Unsaved rolls are on the trail too** (task 5.13, D24). Every replacement of
the stage goes through the provider's `replace`, which first calls the
history's `leave()`: if the stage holds a pattern that was never saved (no
`doc.id`, no library entry), it goes on the list as an `UnsavedItem`
(`target.kind: 'unsaved'`, titled "Unsaved · 14:02", carrying its payload).
Back, Forward and Recent then treat it as any other item, and opening it puts
it back with its notes, tempo and layer. One already on the trail is brought
up to date in place rather than added again, so stepping between rolls keeps
what was done to each. They live in the page only: never sent, forgotten on a
reload (the last scratch is still kept by `bb.scratch`), at most
`UNSAVED_CAP` (20). Saving one on the stage drops its entry, and the visit
that the save records takes its place.

Tests: `tests/integration/api/v1/history/`,
`tests/unit/components/app/studio/practice-history.test.tsx`.

### The Patterns drawer (task 4.8)

`components/app/studio/panels/patterns-panel.tsx` — the rail's **Patterns**
tool (it was _Library_), in five tabs: **Practising** · **Later** (the
shelves) · **Recent** (the history) · **All** (your saved patterns) ·
**Libraries** (every library in the catalogue). The tab is remembered per
browser (`bb.patternsTab`); with none stored it opens on Practising if
anything is on it, else Recent, else Libraries — decided when the drawer
mounts, so the tab does not move while Recent grows.

- Shelves and Recent come from the provider — read with the page — so they
  ask the server for nothing. **All** makes one `GET /api/v1/breaks`
  (`sort=updated`, `limit=100`) when it is shown; search, style and meter go
  to the server as `q` / `style` / `meter` once the typing settles (250ms). It
  reads again when a pattern of yours that it has not got lands on the stage
  (a save). **Libraries** filters the catalogue in the page by title or
  artist, style and meter.
- Every row opens **in place** through the provider's `open(target)` — the
  same fetch-and-attach the history uses — and carries a ★ (`PinButton`).
  The row for whatever is on the stage (`stagePin`) is `aria-current`.
- **Save** in the header is the one way to keep a pattern.
- **Delete** (task 5.11, D22) is on the rows of your own saved patterns, in
  every tab, and in Details for the one on the stage. Library entries and
  other people's patterns have none. The row leaves every list at once and
  the toast offers Undo for `UNDO_MS` (6s). The `DELETE /api/v1/breaks/:id` is
  sent when that time is up, or on `pagehide` with `keepalive`. Then the
  history drops it and the shelves are read back (both cascade on the server).
  The pattern on the stage is detached, so its last edit is saved, and it stays
  as scratch. Undo makes it the saved pattern again unless the stage has
  moved on. A refused delete puts the row back and says so. The logic is in
  `use-delete-pattern.ts`.
- `ShelfList` is exported; the **Practice** drawer shows the Practising shelf
  above the rig when anything is on it.

Tests: `tests/unit/components/app/studio/panels/patterns-panel.test.tsx`,
`tests/unit/components/app/studio/delete-pattern.test.tsx`.

## Browser favourites import (task 4.10) — removed

Phase 4 moved the favourites older builds kept in the browser into the
account, once. There were no users of those builds, so Phase 4A took the
import out: the hook, its parser, its claim key and their tests. The bulk
form of `POST /api/v1/breaks` stays, as a capability of its own.

## `/api/v1/home` — Home (task 4.9)

What the signed-in landing page (`/dashboard`, labelled **Home**) shows, in
one request: the **Practising** shelf as cards, the newest `HOME_RECENT` (8)
history items, and `savedCount` — how many patterns you have saved, which is
what tells a first visit (the welcome copy, `site-copy.md` §6) from an empty
shelf (the "Pin the patterns…" line).

| Route              | Does                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/home` | `{ practising: HomeCard[], recent: PracticeVisitView[], savedCount }`. A card is `{ pinId, target, level, bpm, lastOpenedAt, thumbnail }`, in shelf order. |

Data layer: `lib/app/breaks/saved/home.ts` (`readHome`, `thumbnailOf`). The
page calls `readHome` directly, as the Studio's pages call `listPins`.

- **Three queries side by side, none per card**: the Practising pins with
  each target's `doc`, `listHistory`, and a `Break` count. The pin query uses
  the shelves' visibility rule (`visibleTarget`), so an unshared pattern drops
  off Home as it drops off the shelf.
- **A card opens where you left it.** Your own pattern at its row's `level`
  and `bpm` (it autosaves them); anything else at its latest visit's, or — never
  opened — at its own tempo (and the full break, for a library entry).
- **The thumbnail is engraved on the server**: the first two bars of section A
  at the card's layer, `engrave(…, { scale: 0.55, perSystem: 2 })`, as an
  `Engraving` node tree — the shape `POST /api/v1/breaks/engrave` answers. A
  document that will not read gets `thumbnail: null` and the card stays; only
  an engraver that throws is logged (a warning). The `doc` itself is read for
  the thumbnail and is not in the response — `target` carries the same fields
  the shelves' does.
- **No links in the response** (D14). The web page builds them
  (`studioHref` in `components/app/home/home-view.tsx`): a saved pattern opens
  at `/studio/[id]`, a library entry at **`/studio?entry=<id>`** — the Studio
  page passes a valid id to `StudioProvider` as `openEntry`, which opens it
  once the console is ready through the same `openTarget` a shelf row uses, at
  the layer and tempo of its latest visit — or, never visited, at
  `FULL_LAYER` (5) and the entry's own tempo, which is what the card says; not
  the layer the Studio last had. An id the catalogue does not hold
  says "That pattern is no longer there" over a working Studio. The first-run
  welcome's _Browse the famous grooves_ opens the Studio on the Patterns
  drawer's Libraries tab (`/studio?drawer=patterns&tab=libraries`; see
  [`shell.md`](./shell.md) § Opening on a drawer).
- The thumbnail renders through `components/app/breaks/svg-nodes.tsx`
  (`renderSvgNode`) — the stave's own node renderer, moved out of `stave.tsx`
  so a server component can use it. `EngravedThumbnail` maps the engraver's
  `--ink` / `--faint` / `--f-*` onto the consumer surface's tokens, since those
  are only defined inside the Studio's `.bb` wrapper.

Tests: `tests/integration/api/v1/home/`,
`tests/unit/app/(protected)/dashboard/page.test.tsx`, and the `?entry=` open
in `tests/unit/components/app/studio/practice-history.test.tsx` and
`tests/unit/app/(studio)/studio/page.test.tsx`.

## The domain endpoints

Every domain operation is an endpoint as well as a function. The web Studio
keeps running them in the browser — a regenerate should not wait on the network
— but the web app is the first client and not the only one (D14), and a native
app has nothing but `/api/v1`. **One implementation, many callers.**

All six are `POST`, signed-in, stateless (nothing is written), and under the
section cap. All are `decidedBy: 'nothing'` because there is no row and
therefore no subject to scope to.

| Route                          | Body                                                                              | Answers                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/v1/breaks/generate` | `styleKey`, `styleVersion?`, `meter`, `bars`, `density`, `ghosts`, `bpm`, `seed?` | `{ seed, styleVersionId, A, B, critique, playability, tries, rejected }` |
| `POST /api/v1/breaks/doctor`   | `styleKey`, `styleVersion?`, `doc`, `move`, `entropy?`                            | `{ doc, critique, playability }`                                         |
| `POST /api/v1/breaks/critique` | `doc`, `bpm`                                                                      | `{ critique, playability }`                                              |
| `POST /api/v1/breaks/engrave`  | `doc`, `layer`, `scale`, `perSystem`, `guides`, `sticking`                        | the `Engraving` — nodes, playhead map, dimensions                        |
| `POST /api/v1/breaks/midi`     | `doc` (a whole `SharePayload`), `feel`, `hats`, `bars`                            | `audio/midi` bytes                                                       |
| `POST /api/v1/breaks/import`   | `{ kind: 'midi', data, fileName? }` or `{ kind: 'text', text }`                   | `{ source, doc, notes }`; 422 `IMPORT_UNREADABLE` with a sentence        |

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

## The text notation (`text.ts`)

How BeatBuddy sees a pattern and writes one. One line per lane per bar, after a
header line; the count row is for reading and is never parsed.

```
A · funk · 4/4 · 94 bpm · swing 8
bar 1   count  1e+a2e+a3e+a4e+a
        hat    XxxxXxoxXxxxXxox
        snare  ....S..g.g.gS..g
        kick   X.X.......X..X..
```

| Lane    | Label                   | Characters (`.` is a rest)                         |
| ------- | ----------------------- | -------------------------------------------------- |
| `k`     | `kick`                  | `X` hit · `A` accent                               |
| `s`     | `snare`                 | `g` ghost · `s` hit · `S` accent · `c` cross-stick |
| `h`     | `hat`                   | `x` closed · `X` accent · `o` open                 |
| `r`     | `ride`                  | `r` ride · `b` bell                                |
| `c`     | `crash`                 | `C` crash                                          |
| `t1–t3` | `tom1`, `tom2`, `floor` | `X` hit · `A` accent                               |
| `hf`    | `foot`                  | `f` chick                                          |
| `p1–p2` | `perc1`, `perc2`        | `X` hit · `A` accent                               |

`toText(pattern, { section?, bpm?, swing? })` writes the pattern's roster plus
any lane that has notes anyway. `fromText(text, meter)` reads it back:

- Lines before the first `bar N` are the header and are ignored. Inside a bar,
  each line is a label and a row. A lane a bar leaves out is empty in that bar.
- Spaces and `|` inside a row are layout, `-` is a rest, and the lane key or a
  common alias (`hihat`, `bass`, `floortom`) works as a label.
- Bars keep the numbers they were written with: replacing bar 3 means writing
  `bar 3` and nothing else.
- It is **strict where `parseBar` is lenient**. `parseBar` reads hand-written
  seed data and skips what it does not know. `fromText` reads what a model
  wrote, so it refuses a character the lane lacks, a row of the wrong length for
  the meter, an unknown lane and a repeated bar, naming the bar, lane and step
  the way a drummer counts it ("the 'e' of 2").

A two-digit beat (10–15, in 12/8 and 15/8 only) shows its last digit in the
count row, so the row stays one character a step.

## `tidy()` — "tidy up notes"

Six rules, run in this order, each change reported as a sentence: notes in a
lane the kit does not carry; a hi-hat and ride together (the quieter goes, or on
a tie the one that is not `voice`); more than two hand notes on one step (the
quietest go, time-keeping cymbals before drums); a ghost directly beside a snare
accent; a hi-hat foot chick under an open hat; a pin with no note under it.
Quantising is left to the importers, since the grid is already sixteenths.
Tidy never adds a note, and tidying a tidy pattern changes nothing. Anything a
drummer might disagree with is a doctor move.

The fifth rule is this implementation's reading of the plan's "closed hats
under an open hat that has not been closed" (§6): the foot closing the hat on
the same step the stick plays it open.

## Importing (`POST /api/v1/breaks/import`)

Three sources, all deterministic, and **no URL is ever fetched**:

| Source                                   | Read by               | What bends                                                                                                                                                                                                |
| ---------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A BeatBreaker code, or a link with `#b=` | `decodeBreak`         | Nothing: it is the wire format.                                                                                                                                                                           |
| A MIDI file (base64, ≤128 KB)            | `readMidi`            | Quantised to sixteenths. Velocities are read against the levels the speakers play (`valueForVelocity`). Notes with no lane are dropped. Drums come from channel 10, or from every channel if 10 is empty. |
| A Groove Scribe link (two hosts)         | `readGrooveScribeUrl` | An eighth-note grid is spread out and a 32nd grid thinned. Flams, drags and buzzes read as hits, toms 3 and 4 share the floor tom, and a cowbell takes a percussion slot. Triplets are refused.           |

Whatever bent is reported in `notes`, one sentence each, so neither the user
nor BeatBuddy is told an import was exact when it was not. An import has no
style snapshot, so it plays straight. It is filed under `rock` so the doctor
has a style to start from. Up to sixteen bars are kept (A, then B); a longer
source is trimmed with a note. A code older than v4 is decoded with the
catalogue lookup, as `doctor` does.

A body over `MAX_IMPORT_BODY_BYTES` is a 413 from its `Content-Length`, before
it is read. Imports are capped at 30 a minute per person (`importLimiter` in
`lib/app/breaks/import-limit.ts`, Phase 8), under the `/api/v1` section cap,
because reading a MIDI file costs CPU.

**A MIDI file BeatBreaker wrote reads back exactly**, hat accents included, at
any setting of the hats slider, because the reader classifies each velocity
against the same levels the writer played it at (see _One performance_). The
round-trip test runs at dynamics 0, 100 and 150.

Any other web address is a 422 saying what can be read. A body whose
`Content-Length` is over the cap is a 413 before it is read.

## One performance — speakers, live MIDI and the MIDI file

**Everything that plays a pattern voices it through `performStep`
(`perform.ts`).** For each step it returns the notes to play: the GM note, a 0–1
velocity and an offset from the grid (swing plus the style's feel). Each output
uses the result directly:

| Output                       | What it does with a voice                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Speakers (`transport.ts`)    | plays the engine voice for its lane at `velocity × fader`, at `grid + offset`  |
| Live MIDI (`midi-out.ts`)    | sends `note` at `midiVelocity(velocity)`, at the same moment, before the mixer |
| MIDI file (`midi.ts`)        | writes `note` at `midiVelocity(velocity)`, at `(step + offset) × 120` ticks    |
| MIDI import (`midi-read.ts`) | reads a velocity back to the nearest written value (`valueForVelocity`)        |

The speakers are the reference: `LEVELS` is what the kit was tuned to, and MIDI
is that × 127. **The mixer is the one deliberate difference.** Faders and mutes
act on the speakers only, because a muted lane is one you are playing yourself
and the port exists to hand it to a module (D23). Solo is the same: with any
lane soloed, only soloed lanes sound on the speakers, and mute still wins
(`laneGain` in `transport.ts`, task 5.12). The port hears every lane.

**The hi-hat and ride bands.** The hats slider shapes both cymbals the same way
(`hatShape`): the stick on the beat is loud, and the "e" and "a" are quieter. That
makes an accent on the "a" quieter than a plain hat on the beat, which is right
for the ear and wrong for velocity, the only way MIDI says "accent". So a plain
hat or ride is held at or below 0.9 (MIDI 114), and a written accent or ride
bell at or above 0.95 (121). A plain hat on the beat peaks under the ceiling,
so the band lifts accents and never flattens the groove.

**Adding a subtlety.** Put it in `performStep`. It then reaches the speakers,
the port, the file and the reader together. Two guards in
`tests/unit/lib/app/breaks/audio/performance-consistency.test.ts` hold this:

- It plays a pattern with every lane and value through the real `Transport`,
  with swing, feel and dynamics on. The speaker calls, the port's sends and
  `buildMidi`'s file must then agree note for note.
- It fails if `hatShape`, `feelOffset` or `isSwung` is called anywhere under
  `lib/app`, `components/app` or `app` except `feel.ts` and `perform.ts`, or if
  a MIDI velocity is converted anywhere but `midiVelocity`.

It is declared in `appAlwaysRunTests`, so scoped runs never skip it.

## Opening a shared link signed out

`/breaks` is **not** in `lib/app/protected-routes.ts`. The page gates itself
because the break is in the URL fragment, which an edge redirect cannot forward
and the login form drops. Signed out, the page renders `SignInToOpen`, which
stashes the fragment (`pending-link.ts`, localStorage, one-hour expiry) and
sends the visitor to `/login?callbackUrl=/breaks`. After sign-in, the console
puts the fragment back in the URL before reading it. Phase 1's `/breaks` →
`/studio` redirect has to keep this working. For a saved pattern, Phase 6's
`/p/[slug]` is the link to send; the `#b=` link stays for a pattern nobody
saved.

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
