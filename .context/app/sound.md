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
- **`GET /api/v1/catalogue/kits`** serves `layers` with every take's URL, and
  keeps `velocities` and `urls` (the first take of each layer) for clients
  written before.

### Choosing what plays (`packs.ts`)

1. **Layer.** `layerFor()` takes the softest layer at least as loud as the
   note, or the loudest there is.
2. **Take.** `pickTake()` takes any take but the one this slot played last.
   With two takes that is strict alternation; with more it is unpredictable
   but never a repeat.
3. **Level.**
   - The gain is `vel / layer.v`, clamped 0.25–1.8, times the voice's level,
     `kit.trim`, and a wobble of up to ±0.5 dB.
   - The curve is today's. Making it exact needs each layer's measured
     loudness, which the 9-iii pipeline records.
4. **Pitch.** The rate is the voice's, times a detune of up to ±8 cents.
5. **Top end.** A slot with fewer than 4 layers is darkened when a note plays
   under its layer. A high shelf at 3 kHz cuts by half the dB the gain was cut
   by, down to −6 dB at most.

Percussion strokes take round-robins the same way, by instrument and stroke.

### Your own samples

Your own samples (`your-samples.ts`) now get the onset trim (`onsetOf`) and
`kit.trim`, like the packs.

## Tests

| File                                                              | Holds                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/lib/app/breaks/audio/packs.test.ts`                   | Round-robins never repeat back to back; the flat shape plays as before; the shelf; the wobble bounds                                                                |
| `tests/unit/lib/app/breaks/audio/engine.test.ts`                  | The master chain to the ceiling; the ceiling curve; lane channels, pans, room; choking every open hat                                                               |
| `tests/unit/lib/app/breaks/audio/performance-consistency.test.ts` | Speakers, port and file agree, Humanise on over two passes too; the fader reaches the channel and never the velocity; no `Math.random` in `perform.ts` or `feel.ts` |
| `tests/unit/lib/app/breaks/humanise.test.ts`                      | The seed; replay; σ within 10% over 10,000 notes; negative interval correlation; independent limbs; the ±25 ms clamp; Amount 0                                      |
| `tests/unit/lib/app/breaks/perform.test.ts`                       | Amount 0 is the grid; every humanised note reads back as its value; ms to steps at the tempo                                                                        |
| `tests/unit/lib/app/breaks/audio/transport.test.ts`               | Play replays the performance; a new seed is taken up at the top of the next pass                                                                                    |
| `tests/unit/lib/app/breaks/audio/your-samples.test.ts`            | Onset trim and `kit.trim` on your samples                                                                                                                           |
| `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`             | The layered slot's bounds                                                                                                                                           |
