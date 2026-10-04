# The sound

How a performed note becomes sound. Phase 9 of the
[plan](./planning/app-plan.md#phase-9--the-sound--l); the research, the
sources and the budgets behind it are in
[`planning/sound-plan.md`](./planning/sound-plan.md). This page is the engine
as built, and grows with each Phase 9 PR.

## Anti-patterns

- **Do not fold the mixer into velocity.** The fader is the lane channel's
  level (D39). Multiplying it into the velocity picks a softer sample and, on
  the synth snare, closes the wires, so a quiet snare turns into a ghost note.
  `Transport.schedule` hands the voice `v.velocity` and the level to
  `BreakAudio.playIn`, never their product.
- **Do not use `Math.random` in a sample source, `perform.ts` or `feel.ts`.**
  Which round-robin plays, and the pitch and level wobble on each hit, come
  from `engine.rand`, a seeded stream. When and how hard each note is played
  comes from the `Humaniser`. The transport seeds both from one seed at Play,
  so a performance can be played twice the same, and the speakers, the MIDI
  port and the file agree on it. A grep in `performance-consistency.test.ts`
  keeps `Math.random` out of `perform.ts` and `feel.ts`.
- **Do not make a `Humaniser` per note or per bar.** Its streams count notes
  per limb from Play. Make one per performance (Play, a file) and draw from it
  in `performStep`'s order.
- **Do not read `spec.files` or `spec.v` off a kit slot.** A slot is either
  shape (below). Read it through `slotLayers()` or `slotFiles()` in
  `lib/app/breaks/kit.ts`.
- **Do not edit `public/kits/` by hand.** Every file there, the manifest and
  `scripts/kits/build-lock.generated.json` come from `npm run kits:build`.
  Change a recipe or `sources.ts` and build again; `kit-packs.test.ts` checks
  the files against the lock.
- **Do not add a source without reading its licence file.** Pin the commit,
  name the file, record the date you read it (`sources.ts`). Share-alike, GPL
  and "royalty-free but not redistributable" are out (`sound-plan.md` §5).
  Where the author has since changed the licence outside the source, as
  Salamander's did (CC BY-SA in the archive, public domain on their page in
  2022), quote the new grant and where it is in the source's `grant`. A
  source with no licence file at all (SM Drums, the Open Source Drumkit:
  D37) has only its `grant`, and its licence copy is the quote.
- **Do not normalise a sample.** A layer's level against its neighbours is the
  dynamics. Level matching is a slot's `trim`, applied at play time.
- **Do not build a sample URL from the kit's `pack`.** Since 9-v a slot may
  come from any pack (its piece's `folder`). Use the slot's `folder`, falling
  back to the pack, as `PackSource` and `slotsWithUrls` do.
- **Do not cache decoded samples by kit key alone.** A kit of yours keeps
  its key when you change a slot's piece. `decodeKey()` adds the files the
  kit names.
- **Do not connect a voice to `bus` directly.** Go through `send()`, which
  routes into the lane's channel while a performed note plays and to the bus
  for an audition.

## The path of one note

```
Humaniser (humanise.ts) ── ms, gain ──┐
                                      ▼
performStep (perform.ts)  ── velocity, offset ──►  Transport.schedule
   │                                                   │ laneGain(): the fader, mute, solo
   │                                                   ▼
   │                         BreakAudio.playIn(lane, level, when, voice)
   │                                                   │ sets the lane channel's level at `when`
   ▼                                                   ▼
MIDI port and file        voice (kick/snare/hat/…)  →  SampleSource.hit, else the synth graph
(the same velocity,             │
 never the fader)               ▼
                     lane fader → lane pan ─────────────────────► bus
                          └ room send × the same fader → convolver → wet → bus

bus → drive → top end (lowpass) → glue compressor → master → ½ → ceiling → out
```

### Articulations (9-iv)

- **A flam, drag or buzz is several voices from one note.** `performStep`
  returns the note and then its ornaments, flagged `ornament: 'grace' |
'buzz'` and `ghost`, so the engine plays them as soft strokes of the same
  drum. A grace is `min(25 ms, 0.3 step)` ahead of its note at 35% of it (a
  drag's second a third of that gap ahead); a buzz is three repeats a quarter
  step apart. The ornaments come after every note of the step, so a step
  without one draws from Humanise exactly as before.
- **No note-off runs past the next strike of its key.** A grace and its
  stroke are one MIDI note a few milliseconds apart, so the transport tells
  the live port when each key is struck again (`MidiSink.hit`'s `until`) and
  `buildMidi` ends each note at the next note-on of it. A flam whose grace
  would fall before bar 1 moves later as a whole in the file.
- **A grace is the other hand's note.** It draws its nudge from that hand's
  stream (`Humaniser.next(lane, amount, limb)`), with its timing held within a
  quarter of the gap, so it never lands after its note.
- **The half-open hat is sent at half strength** (`HALF_OPEN_SCALE`) because
  GM has no note for it; `hat(…, half)` plays it at twice what it is sent.
  Open hats keep a floor (`OPEN_HAT_MIN`), so the two never meet on note 46.
- **Five slots joined the kit:** `sRim`, `hHalf`, `c2`, `cChina` and
  `cSplash`. None has a `fall`: a kit without a recording plays the
  synthesised voice, which keeps the articulation audible. 9-iv-b gave the
  round-one kits recordings of them: every one each kit's own source has,
  and Salamander's splash, china and 20" crash where it has none. DRSKit and
  Gogodze have no rimshot, so theirs is the synthesised voice. 9-vi-a gave
  Muldjord its own second crash and china, and Brush Swirly's half-open,
  china and splash. Virtuosity, Dusty sampler and Trap have none: Virtuosity
  is at its first-load budget, and the other two are one-shot kits.

## Humanise

`lib/app/breaks/humanise.ts`, pure. The model and its sources are in
[`sound-plan.md` §4](./planning/sound-plan.md#4-humanise). In short:

- **A stream per limb.** The right foot plays `k`, the left foot `hf`, the
  right hand `h`, `r` and `c`, and the left hand `s`, the toms and the perc
  lanes. Hands and feet drift separately, and two hands on one step spread.
- **Timing** is pink noise plus differenced white noise, scaled so σ is 10 ms
  for hands and 8 ms for feet at Amount 100, and clamped at ±25 ms. The
  intervals between one limb's notes correlate at about −0.58 note to note,
  so each corrects the one before.
- **Velocity** is multiplied by `1 + σ_v·pink`: σ_v is 12% for cymbals and
  perc and 6% for drums at 100. `performStep` clamps the result inside the
  written value's band. That is the midpoints to the neighbouring `LEVELS`,
  less a MIDI step, or `cymbal()`'s bands for the hats and ride. So
  `valueForVelocity` reads every note back as written.
- **Seeded by the notes.** `humaniseSeed([A, B], take)` hashes both full
  sections' bars and the take. Tempo, swing, layer and name don't enter it.
  The Studio, `/p/` and `POST /api/v1/breaks/midi` all get the same
  performance from it.
- **Amount 0 is the grid.** `performStep` returns exactly what it does
  without a humaniser. The streams still advance, so moving the slider changes
  the size of the differences, not which ones they are.

**The setting** is `StudioSettings.humanise { mode, amount, take }`. The
default is Subtle at 35 (D38). In the Kit drawer it is a Humanise card: Off ·
Subtle · Loose, the Amount (hidden while Off), and 🎲 _New take_. Subtle and
Loose set the Amount to 35 and 75. The console turns it into the snapshot's
`humanise: { amount, seed }`.

**The transport** makes its `Humaniser` and reseeds `engine.rand` at Play. At
the top of each pass it does both again if the seed has changed (a new take,
or an edit to the notes), so a pass never changes performance halfway.

**The file** makes its own `Humaniser` from the same seed, so it is the first
pass you hear, and the passes after it for as many bars as it writes. _Played_
or _Quantised_ beside Download .mid is `bb.midiTiming`. The API takes an
optional `humanise: { amount, take }`. Without it the file is Quantised,
which is the swing and feel without Humanise.

`/p/` plays Subtle, take 0. It has no listener settings to read.

## Lane channels

`BreakAudio.channel(lane)` is built the first time a lane plays:

- a `GainNode` fader
- a `StereoPannerNode`. Where a browser has none, the lane plays centred.
- a room `GainNode` that carries the same fader into the convolver, so a lane
  turned down is quieter in the reverb too

`playIn` sets the fader only when the level changes, with `setValueAtTime` at
the note's time.

**Pans** are `DEFAULT_PAN` in `lanes.ts`: a narrow spread, nothing past ±0.4,
from the stool. Hats and crash are on the left, the ride and floor tom on the
right. The setting `panView` (`drummer` or `audience`) mirrors them. In the
Kit drawer it is _Heard from_: The stool, or Out front. Per-kit pans wait for
pieces (9-v).

An audition from the Kit drawer (`hit`, `demo`) has no lane. It goes straight
to the bus, centred.

## The master

- The drive, top end and glue compressor are as before.
- **The ceiling (Phase 9)** comes after them. `DynamicsCompressorNode` has a
  fixed lookahead and automatic makeup gain, so a dense bar can still put a
  peak over full scale.
  - `ceilingCurve()` is straight to 0.7, then bends with a tanh to `CEILING`
    (0.966, −0.3 dBFS) and never past it.
  - A `WaveShaperNode` holds its last value beyond ±1. So the signal goes in
    at ½ (`OVER = 2`) and the curve is drawn over ±2. Peaks up to 6 dB over
    full scale are rounded off rather than cut.
- **Hi-hat choke.** Every open hat still ringing is kept, and the next closed
  hat, pedal or open hat ramps them all out over 22 ms. Only the last one
  used to be kept.

## Samples

### A slot's two shapes

| Shape                                | Means                                                    |
| ------------------------------------ | -------------------------------------------------------- |
| `{ v: number[] \| null, files: [] }` | One file per velocity layer; `v: null` is full velocity. |
| `{ layers: [{ v, files: [] }] }`     | Velocity layers, each with up to 6 round-robins (≤ 8).   |

- **The flat shape** is what every kit shipped in before Phase 9, and what your
  kits store. `slotLayers()` reads it as one take per layer, so it plays
  exactly as before.
- **The layered shape** is what the 9-iii pipeline writes.
- **`GET /api/v1/catalogue/kits`** serves `layers` with every take's URL,
  each slot's `trim` (1 where it has none), and
  keeps `velocities` and `urls` (the first take of each layer) for clients
  written before.

### Pieces (9-v)

A **piece** is one instrument from one source and the slots it fills: Big
Rusty's snare is `s`, `sGhost`, `sCross` and `sRim`. They are the `KitPiece`
catalogue table, served by `GET /api/v1/catalogue/pieces`.

- **Where they come from.** `scripts/kits/pieces.ts` derives them from the
  recipes and the manifest; the seed writes them. Nothing new is generated,
  and no audio moved.
  - A piece's key is its recipe's `key`, or `<pack>-<first slot>`
    (`bigrusty-s`).
  - A piece lent to several packs (Salamander's splash, china and crash) is
    one piece. Its `folder` is the first pack in `RECIPES` that has it.
    `derivePieces` throws if another pack's copy differs.
  - Gogodze's cymbals are Big Rusty's on the close mic, at another trim, so
    they are pieces of their own (`gogodze-r`, `gogodze-c`).
  - **A pack may be pieces only.** Frankensnare's six snares (9-vi) each
    have a pack, `frankensnare-<drum>`, because a pack is one slot map and
    all six fill `s`. No kit row names them; the builder and the
    combinations do.
- **A kit slot may name a piece:** `{ piece, from?, level?, tune?, decay? }`.
  `from` plays another of the piece's slots (any tom piece as any tom). A kit
  of yours may also hold `{ sample }`.
- **The catalogue resolves them** (`resolveKitSamples` in
  `catalogue/pieces.ts`) before anything plays. A resolved slot is the
  layered shape plus the piece's `folder` and the slot's settings. A slot
  naming a piece that is gone is left out and logged.
- **The recorded kits are piece maps** in the seed, each slot naming the
  piece its own recipe fills it with. They play the same files at the same
  trims (`tests/unit/scripts/kits/pieces.test.ts` checks every slot of every
  kit, by sha256 where a lent piece lives in another folder).
- **A slot's settings** (9.17):
  - **Level** multiplies the gain (0–2).
  - **Tune** is cents on the rate (±1200). It is pitch and speed together,
    as a tuned drum is.
  - **Decay** (0.2–1) shortens the gain envelope in `playBuf`: hold for half
    of `decay` × the length, fade out by the end of it, and stop there.
- **A kit's pans** are `samples.pan: { <lane>: −1…1 }`, as the drummer hears
  them. They override `DEFAULT_PAN` per lane and are mirrored by `panView`. Pan
  is per lane, not per slot: a rimshot panned away from its snare is not a
  sound anyone wants.

### Choosing what plays (`packs.ts`)

1. **Layer.** `layerFor()` takes the softest layer at least as loud as the
   note, or the loudest there is.
2. **Take.** `pickTake()` takes any take but the one this slot played last.
   With two takes that is strict alternation; with more it is unpredictable
   but never a repeat.
3. **Level.**
   - The gain is `vel / layer.v`, clamped 0.25–1.8, times the voice's level,
     `kit.trim`, the slot's `trim`, and a wobble of up to ±0.5 dB.
   - Since 9-iii a layer's `v` is its measured loudness as an amplitude, so
     `vel / v` lands a note at the level its velocity asks for.
4. **Pitch.** The rate is the voice's, times a detune of up to ±8 cents.
5. **Top end.** A slot with fewer than 4 layers is darkened when a note plays
   under its layer. A high shelf at 3 kHz cuts by half the dB the gain was cut
   by, down to −6 dB at most.

Percussion strokes take round-robins the same way, by instrument and stroke.

### Loading (`packs.ts`)

- **Two passes.** `load()` decodes the first take of each layer that decodes,
  and the kit plays from those. The remaining takes decode when the page is
  idle (`requestIdleCallback`, or 200 ms where Safari has none) and join their
  layers. A `late` slot (the five 9-iv articulations) decodes only in that
  idle pass, so the first play costs what it did before them; until it lands,
  its synthesised voice plays it. The first-load budget counts the slots that
  are not `late`.
- **Per kit, from each slot's folder.** A slot fetches from
  `/kits/<folder>/`, its piece's, else the kit's pack. The decoded cache is
  keyed by `decodeKey(kit)`: the kit's key and the files it names. A kit of
  yours that mixes pieces and samples has its pieces decoded here and its
  samples by `YourSampleSource`. Each source leaves the other's slots alone,
  including a slot that would fall back on one of them.
- **Two kits decoded.** The one playing and the one before it
  (`DECODED_KITS`). Picking a third lets go of the oldest; picking a kit that
  was let go decodes it again, and the synth covers the first bar.
- **A slot's `trim`** multiplies its gain, with `kit.trim`. A fallback (a
  ghost from the snare) plays at the slot it fell back to's trim.

### The pipeline (`scripts/kits/`)

```
sources.ts   pinned libraries: a git repo at a commit, or a zip or tar archive
             by its sha256; licence file, date read, credit
archive.ts   an archive source: downloaded once, checked against its pin
zip.ts       a zip source: members read via the central directory
tar.ts       a tar source: unpacked whole by the system tar, files hashed
drumgizmo.ts which channel of a DrumGizmo stroke is which mic
recipes/     per pack: which strokes make which slot, mics and weights,
             how many layers and takes
build.ts     npm run kits:build [pack…]
```

For each slot the build:

1. **Finds the candidates** (`pattern.ts`): a path pattern with `*` for what
   varies between strokes and `{mic}` for what varies between mics.
2. **Fetches** each file into `.kit-sources/` (gitignored). A git source's
   file comes from the pinned commit and is checked against its blob hash
   (`fetch.ts`). A zip source's archive is downloaded once, checked against
   its sha256 and length, and each member is inflated from the local copy
   and checked against its CRC32 (`zip.ts`). DRSKit's archive is 2.8 GB. The
   archive's directory and the members already extracted are kept in the
   cache, so a build that needs nothing new from it neither reads nor hashes it.
   A tar source (Salamander's `.tar.bz2`) has no index to read a member by,
   so once its archive passes its pin it is unpacked whole, links refused, and
   every file's sha256 kept in `tree.json`; a file that no longer matches is
   extracted again on its own and renamed into place (`tar.ts`).
3. **Mixes** the mics to mono by weight. A DrumGizmo stroke is one WAV with
   every mic in it: a pick's `channels` name the mics, the instrument's own
   `<Inst>.xml` says which channel each is (never by position), and ffmpeg's
   `pan` filter mixes them (`drumgizmo.ts`). Then it **trims** from the onset (−50 dBFS,
   less 0.5 ms) to 60 dB under the peak or the role's cap, with a 30 ms fade,
   and **measures** K-weighted RMS over 150 ms (`dsp.ts`).
4. **Chooses** the layers evenly in dB across the recipe's range and the takes
   nearest each (`select.ts`). A layer's `v` is its loudness against the
   loudest layer, as amplitude.
5. **Encodes** AAC-LC `.m4a`, mono, 96 kbps (`ffmpeg.ts`), as
   `<slot>-<layer>-<take>.m4a`.
6. **Matches the level.** A piece's `trim` brings its loudest layer to
   `REFERENCE_DB` plus its role's target (`ROLE_TARGET_DB`), and every slot of
   the piece gets it. A piece with `matchOn` is matched on that pick instead,
   which is measured and never shipped: a brush kit's borrowed stick foot hat
   keeps the stick kit's level. What the trim's ceiling of 4 cannot reach is
   baked into every sample of the piece alike, up to −1 dBFS (`splitGain`), so
   a quietly recorded piece still gets there. A piece's `level` moves its
   target by a few dB: Salamander normalised every sample, so its splash
   (−4 dB) and china (+1 dB) have no level of their own against the crash.

Then it writes the manifest (which the catalogue seed reads), the lock (every
source file's and output's sha256, each output's bytes and seconds), each
source's licence file into `public/kits/LICENSES/`, and the credits:
`lib/app/breaks/kit-credits.generated.ts` and the README's block. Run
`npm run format` after, for the README. On a Mac, run the build under
`caffeinate -i`: an idle sleep freezes it mid-encode. Then `npm run db:seed`, so the kit
rows carry the new manifest.

**Same sources, same ffmpeg, same bytes.** Nothing written carries a time and
the container's metadata is stripped. The lock records `ffmpeg -version`.

### Your own samples

Your own samples (`your-samples.ts`) now get the onset trim (`onsetOf`) and
`kit.trim`, like the packs, and each slot's Level, Tune and Decay (9-v). A
slot with a `folder` is a piece, and is the packs'.

## Tests

| File                                                              | Holds                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/lib/app/breaks/audio/packs.test.ts`                   | Round-robins never repeat back to back; the flat shape plays as before; the shelf; the wobble bounds; a kit from two folders; Level, Tune, Decay; mixed kits        |
| `tests/unit/scripts/kits/pieces.test.ts`                          | Each piece once; a lent piece one key; every recorded kit as pieces plays the same files at the same trims                                                          |
| `tests/unit/lib/app/breaks/catalogue/pieces.test.ts`              | Resolving a piece, `from`, a sample of yours, a piece that is gone                                                                                                  |
| `tests/unit/lib/app/breaks/audio/engine.test.ts`                  | The master chain to the ceiling; the ceiling curve; lane channels, pans, room; choking every open hat; the 9-iv slots and their synthesised voices                  |
| `tests/unit/lib/app/breaks/articulations.test.ts`                 | 9-iv end to end: the wire, the layers, graces and Humanise, MIDI write and read for every value, the critic, `tidy`, the generator, the notation key                |
| `tests/unit/lib/app/breaks/goldens.test.ts`                       | The engraver, the generator and the MIDI export, pinned as they were before 9-iv; a golden SVG per articulation                                                     |
| `tests/unit/lib/app/breaks/audio/performance-consistency.test.ts` | Speakers, port and file agree, Humanise on over two passes too; the fader reaches the channel and never the velocity; no `Math.random` in `perform.ts` or `feel.ts` |
| `tests/unit/lib/app/breaks/humanise.test.ts`                      | The seed; replay; σ within 10% over 10,000 notes; negative interval correlation; independent limbs; the ±25 ms clamp; Amount 0                                      |
| `tests/unit/lib/app/breaks/perform.test.ts`                       | Amount 0 is the grid; every humanised note reads back as its value; ms to steps at the tempo                                                                        |
| `tests/unit/lib/app/breaks/audio/transport.test.ts`               | Play replays the performance; a new seed is taken up at the top of the next pass                                                                                    |
| `tests/unit/lib/app/breaks/audio/your-samples.test.ts`            | Onset trim and `kit.trim` on your samples                                                                                                                           |
| `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`             | The layered slot's bounds                                                                                                                                           |
| `tests/unit/lib/app/breaks/kit-packs.test.ts`                     | Files match the manifest and the lock; every source has its licence and credit; ≥2 takes on hats, snares and rides, and on every percussion stroke; the §9 budgets  |
| `tests/unit/scripts/kits/*.test.ts`                               | Onset, tail and fade; K-weighting and loudness; choosing layers and takes; path patterns                                                                            |
