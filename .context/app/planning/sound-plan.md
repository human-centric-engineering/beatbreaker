# BeatBreaker — the sound

Design notes and research for [Phase 9](./app-plan.md#phase-9--the-sound--l).
Written 2026-10-03, after Phase 8-iii merged (`a6c0184f`). The plan's task
tables are in `app-plan.md`; this document is the why, the sources, and the
numbers they were sized from.

**The ask (owner, 2026-10-03):** the drums should sound as comprehensive and
realistic as possible. That means a better range of samples loaded in,
better dynamics, and a little 'feel': small, random changes to velocity and
to where each hit lands, nothing outrageous. It also means being able to
combine kits, so people have a lot to choose from. **Humanise is a setting**
that can be turned down or off.

**Contents**

1. [Where the sound is today](#1-where-the-sound-is-today)
2. [What changes, in one paragraph](#2-what-changes-in-one-paragraph)
3. [Engine](#3-engine)
4. [Humanise](#4-humanise)
5. [Samples: sources and licences](#5-samples-sources-and-licences)
6. [The sample pipeline](#6-the-sample-pipeline)
7. [Pieces and kit-building](#7-pieces-and-kit-building)
8. [Synthesised and machine kits](#8-synthesised-and-machine-kits)
9. [Budgets](#9-budgets)
10. [Not in this phase](#10-not-in-this-phase)

---

## 1. Where the sound is today

This was audited from the tree on 2026-10-03. File references are to the
code at `a6c0184f`.

**What is good and stays:**

- **Speakers, live MIDI out and the MIDI file voice notes the same way.**
  All three call `performStep`. `performance-consistency.test.ts` holds that
  and guards it with greps.
- **Pack buffers are already trimmed to their first sound.** `onsetOf` sets
  the start at the first sample over 2% of the peak, less 1 ms
  (`packs.ts:32-45`). This matters because mp3 and AAC decoders put 25–57 ms
  of silence in front, and browsers disagree about it.
- **Each slot falls back on its own** (`SourceStack`, `engine.ts:64-80`). A
  pack slot that is missing, or still loading, plays the synth voice, so a
  partial kit still plays.
- **Swing and the style feel tables are deterministic** (`feel.ts`). These
  are part of the groove, not randomness, and they stay as they are.

**What is missing or wrong:**

| #   | Finding                                                                                                                                                                                                                                                                                                                                          | Where                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| A1  | **No round-robin.** At a given velocity, the same buffer plays every time. Sixteenth hats sound like a machine gun.                                                                                                                                                                                                                              | `packs.ts:215-226`                            |
| A2  | **Few velocity layers.** Vintage and trap have one layer per slot; muldjord and virtuosity have 2–3; brush has 2. Inside a layer, gain scales linearly by `vel/v`, clamped to .25–1.8.                                                                                                                                                           | `manifest.json`, `packs.ts:221`               |
| A3  | **The mixer fader is folded into velocity.** Pulling the snare down changes which sample plays and the synth snare's wire filter (`3200+vel*2400`), not only how loud it is.                                                                                                                                                                     | `transport.ts:282-291`, `engine.ts:616`       |
| A4  | **Velocity is coarse.** The pattern stores 1–4 per step. `LEVELS` maps those to fixed velocities. Hats and ride get the `hatShape` curve plus a ±3% `Math.random` wobble. Nothing else varies.                                                                                                                                                   | `perform.ts:51-66`, `feel.ts:97-110`          |
| A5  | **No random timing at all.** `feel.jitter` is a fixed sine. The hat wobble is drawn separately for each output, so the MIDI file and the speakers disagree by up to 3%.                                                                                                                                                                          | `feel.ts:35`, `feel.ts:108`                   |
| A6  | **No pan, no per-lane channel, and no limiter.** Everything is mono to one bus. A dense pattern can drive the master compressor into audible pumping, with nothing after it to catch peaks.                                                                                                                                                      | `engine.ts:156-191`                           |
| A7  | **Only one open-hat tail is tracked.** A second open hat escapes the choke.                                                                                                                                                                                                                                                                      | `engine.ts:427-439`                           |
| A8  | **Your own samples skip the onset trim and `kit.trim`.**                                                                                                                                                                                                                                                                                         | `your-samples.ts:164-166`                     |
| A9  | **A kit is one pack.** A slot can't point into another pack's folder, so kits can't be mixed. Your kits hold only your own uploads, one layer each.                                                                                                                                                                                              | `packs.ts:96`, `catalogue/schemas.ts:190-206` |
| A10 | **The 808/909 `drift` engine is declared and never built.** `@driftbox/engine` isn't installed, and the picker shows both kits disabled.                                                                                                                                                                                                         | `kit.ts:166`, `kit-panel.tsx:77-79`           |
| A11 | **Virtuosity and brush are AAC in M4A containers named `.mp3`.** They play because browsers sniff the content, but the names are wrong.                                                                                                                                                                                                          | `public/kits/{virtuosity,brush}`              |
| A12 | **Stale words.** `SYNTH_ONLY` and the tom hint say no pack ships tom samples, but virtuosity and brush both do. The README says per-voice tuning, your own one-shots and MIDI out aren't built; all three are. The README also claims "`OfflineAudioContext` for baked kits", and there is no baking. `catalogue.md` says 13 kits; there are 12. | `kit.ts:304`, `README.md:34-51,136-145`       |

Today all the kits together are 106 files and 1.3 MB.

---

## 2. What changes, in one paragraph

**Engine.** The sampler gains round-robins and a better choice of layer.
Every lane gets a channel with level and pan, and the master gets a ceiling.

**Humanise.** A seeded humaniser gives each limb small timing and velocity
drift. It is the same on every press of Play, it differs a little on every
pass of the loop, and the speakers, MIDI out and the MIDI file all agree.

**Samples.** A build pipeline turns freely licensed multi-mic libraries
(Karoryfer, DrumGizmo and others) into small, level-matched, round-robin
**pieces**: a snare, a hat, a ride, each with its articulations.

**Kits.** A kit becomes a map from slots to pieces. So the shipped kits can
mix sources, and anyone can build their own from any piece.

**Synth.** Synthesised kits are rendered into buffers ahead of time and play
through the same sampler. 808 and 909 voices are finally built in-house.

---

## 3. Engine

### Sampler

- **Slot shape.** Today a slot is `{ v: number[], files: string[] }`: one
  file per velocity layer. It becomes `{ layers: [{ v, files: string[] }] }`,
  with up to 8 layers × 6 round-robins. The reader accepts the old shape and
  turns it into one-file layers, so existing rows, settings and your kits
  play unchanged. The seed writes the new shape.
- **Choosing a sample.** This copies DrumGizmo's three weights:
  - _close_: the layer nearest the velocity.
  - _diverse_: within that layer, a file not played recently. A file never
    repeats back to back when the layer has two or more.
  - _random_: picks among the rest.

  The random numbers come from the humaniser's seeded stream (§4), so a
  performance is reproducible. With Humanise off, the choice is strict
  rotation, which is still not a machine gun.

- **Gain inside a layer.** This is linear in dB: `gain_dB = (vel − v_layer) × R`,
  with R ≈ 8 dB across a layer's width. The layer's own timbre carries the
  rest of the dynamics. It replaces today's linear `vel/v` clamp, which jumps
  in loudness at each layer boundary.
- **Small variation on every hit.** Each hit varies by up to ±8 cents and
  ±0.5 dB. Packs already vary rate by ±0.4%, about ±7 cents, so this mainly
  adds the gain. It covers the gaps when a source has few round-robins.
- **Fewer than four layers.** When a slot has fewer than four layers, a
  velocity-tracking high shelf at about 5 kHz, down to −6 dB at the softest,
  smooths the step between layers.

### Channels and master

- **A channel per lane.** Each lane gets a `GainNode` (fader, mute, solo)
  and a `StereoPannerNode`. **The fader no longer feeds velocity** (A3). This
  is a deliberate change in sound: a quiet snare is now a quieter snare, not
  a ghost note. D39.
- **Pans.** Default pans are a kit property; the default is a narrow rock
  spread. A **drummer / audience** switch mirrors them. Samples stay mono,
  and stereo comes from the pans and the room send. A mono source at half
  the bytes was preferred to stereo overheads; see §9.
- **Master chain.** Bus, headroom (−3 dB), then the existing drive, lowpass
  and compressor, then a soft-clip ceiling at −0.3 dBFS (a tanh
  `WaveShaperNode`), then the destination. No AudioWorklet limiter:
  `DynamicsCompressorNode` plus a soft clip is enough at this scale, and a
  worklet is one more thing to keep alive on iOS.
- **Choke.** Every open-hat tail that is sounding is tracked, and all of them
  ramp out over 22 ms (A7). Crash and ride are still never choked, because
  there is no grab articulation in the pattern.
- **Room.** The generated noise impulse response stays. The research found no
  drum-room IR that is safe to redistribute and better than a generated one:
  OpenAIR is offline, Voxengo and EchoThief forbid redistribution, and the CC
  BY room sets are speech rooms. Shorter and denser is better for drums
  (0.3–0.8 s).
- **Your own samples** get the onset trim and `kit.trim` like packs (A8).

### Not changed

- The lookahead scheduler (130 ms ahead, a 25 ms tick) stays. Humanise's
  earliest offset (−25 ms) is well inside the lookahead.
- The click stays on the grid and goes straight to the bus.

---

## 4. Humanise

**Is it a setting?** Yes. It's yours, kept in `StudioSettings.prefs.sound`
and synced across devices like the rest (D19), and it isn't stored in the
pattern (D38).

| Control     | Values                          | Default    |
| ----------- | ------------------------------- | ---------- |
| Humanise    | Off · Subtle · Loose            | **Subtle** |
| Amount      | 0–100 (Subtle = 35, Loose = 75) | 35         |
| 🎲 New take | Re-rolls the variation          | —          |
| MIDI export | Played · Quantised              | Played     |

### What the research says

- **Real drummers vary by about 6–11 ms in total.** About half of that
  repeats from bar to bar and half is random. Feet often land about 10 ms
  ahead of hands.
  [Quantifying microtiming in drum-kit recordings](https://www.researchgate.net/publication/286640008)
- **Listeners prefer correlated drift ("1/f") to plain random noise** at the
  same size (σ 10 ms, 56.5% vs 43.5%). The preference is real but modest.
  DAW humanisers use plain random noise.
  [Hennig et al., PLoS ONE 2011](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0026457)
- **Jeff Porcaro's one-handed sixteenths on hi-hat** varied by 8.7 ms, and
  each interval tended to correct the one before (lag-1 r = −0.48). The
  accents repeated in a two-bar shape.
  [PLoS ONE 2015](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0127902)
- **Drummers asked to lay back** put the snare about 17 ms late, and played
  it louder.
  [Danielsen et al. 2015](https://pure-oai.bham.ac.uk/ws/files/44723836/Danielsen_et_al_2015.pdf)
- **DrumGizmo's humaniser** models fatigue (fast repeats get quieter),
  laid-back feel and tightness.
  [drumgizmo(1)](https://manpages.debian.org/bookworm/drumgizmo/drumgizmo.1.en.html)
- **The common controls** across DAWs are an amount, timing and velocity, a
  push/pull feel and swing.
  [Ableton grooves](https://www.ableton.com/en/manual/using-grooves/)

### The model (`lib/app/breaks/humanise.ts`, pure)

1. **Limbs.** `k` is the right foot, and `hf` the left foot. `h` and `r` are
   the right hand. `s`, the toms and the perc lanes are the left hand. Each
   limb has its own noise stream. So when hat and snare land together, they
   spread by a few ms, as two hands do.
2. **Timing** for each note on a limb is
   `σ_t × (0.7·pink[n] + 0.7·(w[n] − 0.5·w[n−1]))`, clamped:
   - `pink` is Voss–McCartney with 6 rows.
   - The differenced white term gives Porcaro's self-correction.
   - At Amount 100, σ_t is 10 ms for hands and 8 ms for feet. The clamp is
     ±25 ms.
   - Subtle (35) gives about 3.5 ms. That is tighter than any human, and is
     there to be felt, not heard.
3. **Velocity:** `v × (1 + σ_v·pinkVel[n])`.
   - At 100, σ_v is 12% for hats, ride and perc, and 6% for kick, snare and
     toms.
   - The result is clamped to stay inside the value's band. A ghost stays a
     ghost, and an accent stays above a plain hit. These are the bands
     `perform.ts` already holds for hats.
4. **Seeded and continuous.**
   - The seed is `hash(pattern id or code, take)`. `n` counts notes since
     Play was pressed, so each pass of the loop differs but pressing Play
     always gives the same performance.
   - The MIDI file renders the same stream for as many bars as it writes,
     which is one pass.
   - The PRNG is `rng.ts`'s xorshift32, already in the tree.
5. **On top of feel, not instead of it.** `hatShape`'s curve and the style
   feel tables stay. Humanise **replaces** the `Math.random` hat wobble
   (A5), which is what made the speakers and the file disagree.
6. **Off means quantised.** At 0, `performStep` returns exactly what it does
   today, minus the old wobble. A test holds this.

**Practice.** The click is always on the grid. In a practice session
Humanise is whatever your setting is. Its help text says to turn it off if
you're checking your own timing against the playback.

**Fatigue is left out.** That is the velocity drop on fast repeats. It is
subtle, and the hat-shape curve already covers most of what it would add.
It can come later.

---

## 5. Samples: sources and licences

These are the rules the README's Credits section has applied since
2026-09-21, unchanged:

- **Allowed:** CC0, public domain, CC BY 4.0 (with credit), and MIT-style
  licences.
- **Not used:** CC BY-SA (share-alike obligations in a distributed page),
  GPL, and any "royalty-free" licence that forbids redistributing the raw
  samples.
- **How each licence was checked:** against the source's own licence file or
  page, on 2026-10-03. The pipeline keeps a copy of each in
  `public/kits/LICENSES/` with the date it was checked (§6).

### Use

| Source                                                                                              | Licence                                                                                                     | What it brings                                                                                                                                                                                                                                                                              | For                       |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [Karoryfer — Big Rusty Drums](https://github.com/sfzinstruments/karoryfer.big-rusty-drums)          | CC0 (repo `LICENSE`)                                                                                        | A 1980s Polish kit with a 24" kick (damped and open), a 14×8 wooden snare (centre, edge, rimshot, side-stick, brush), 4 toms, a 14" hat (closed, loose, **half-open**, open, foot), 22" ride, 17" crash, 18" **china**, sizzle cymbals. Up to 14 layers × 4 round-robins. Close + overhead. | Rock; brushes and mallets |
| [DrumGizmo — DRSKit](https://drumgizmo.org/wiki/doku.php?id=kits:drskit)                            | CC BY 4.0                                                                                                   | Kick, 3 toms, snare (hits, rim, **brush**), hat (closed, semi-open, open, foot), 2 Paiste crashes, a Paiste 602 ride (bell, chain, brush). 13 mics, including room.                                                                                                                         | Jazz to rock              |
| [Karoryfer — Unruly Drums](https://github.com/sfzinstruments/karoryfer.unruly-drums)                | CC0                                                                                                         | Every drum has snare wires on it. 13/14/22" snares, rimshot, side-stick, brush stirs, hat in 6 stages of openness. Up to 9 layers × 4 round-robins.                                                                                                                                         | Character, jazz, lo-fi    |
| [Karoryfer — Gogodze Phu Vol II](https://github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii)    | CC0                                                                                                         | Damped kick, snare, toms and hat with 5 openings. 6 layers × 4 round-robins. 7 mics, including a "retro" SM-55 and a "window" mic. No cymbals.                                                                                                                                              | Hip-hop, lo-fi, boom bap  |
| [Karoryfer — Frankensnare](https://github.com/sfzinstruments/karoryfer.frankensnare)                | CC0                                                                                                         | 16+ snares from 10" to 22", **claps**, **tambourine**, sympathy snares, brushes and rimshots.                                                                                                                                                                                               | Funk, hip-hop snares      |
| [DrumGizmo — CrocellKit](https://drumgizmo.org/wiki/doku.php?id=kits:crocellkit)                    | CC BY 4.0                                                                                                   | Modern rock and metal. 3 crashes, a ride, **2 chinas, 2 splashes**, 4 toms. 5.5 GB at source.                                                                                                                                                                                               | Rock and metal; cymbals   |
| [Salamander Drumkit](https://rytmenpinne.wordpress.com/sounds-and-such/salamander-drumkit/)         | Public domain since 2022-03-04 (the author's page). The archive.org copy that still says CC BY-SA is stale. | A birch kit with **ten cymbals**: 2 chinas, 3 crashes, 2 rides, splash, accent, hat. Many samples per layer.                                                                                                                                                                                | Extra cymbals             |
| [body_percussion](https://github.com/sfzinstruments/body_percussion)                                | CC0                                                                                                         | Real claps and snaps, 4–6 round-robins                                                                                                                                                                                                                                                      | Clap                      |
| [FreePats World Percussion](https://freepats.zenvoid.org/Percussion/world-and-rare-percussion.html) | CC0                                                                                                         | Cajón, bongos, shaker, tambourine, claves, conga, maracas, with round-robins                                                                                                                                                                                                                | Perc lanes                |
| [kinwie — Dim Cabasa](https://github.com/sfzinstruments/kinwie.dim-cabasa)                          | CC BY 4.0                                                                                                   | 250 cabasa hits                                                                                                                                                                                                                                                                             | Shaker                    |
| [FreePats Synthesizer Percussion](https://freepats.zenvoid.org/Percussion/electric-percussion.html) | CC0                                                                                                         | A small analog-style kit (Yoshimi, Geonkick)                                                                                                                                                                                                                                                | Electronic, thin          |

**Already shipped, with more to take:** Virtuosity (CC0), MuldjordKit (CC BY
4.0), Swirly (CC0) and VCSL (CC0) have more layers and round-robins than the
3 and 2 files per slot we cut from them. The pipeline re-cuts them.

### Broad permission, not a standard licence (D37: use both)

| Source                                                                                        | What the permission is                                                                                                                                                                                           | What it brings                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [SM Drums](https://smmdrums.wordpress.com/) (Scott McLean, Tod Stillwell, Suleiman Ali)       | "ALL of the content on this website is for FREE royalty free use by anyone for anything", and asks people to mirror it ([KVR](https://www.kvraudio.com/forum/viewtopic.php?t=433571)). There is no licence file. | A 1960s Ludwig Oyster Blue Pearl: four snares, rimshot, side-stick, 4 toms, 2 rides, 4 crashes, china. Up to 8 round-robins. **The best funk and soul kit found.** |
| [Open Source Drumkit](https://github.com/crabacus/the-open-source-drumkit) (Real Music Media) | "completely in the public domain… do whatever you want" ([the creator on KVR](https://www.kvraudio.com/forum/viewtopic.php?t=277132)). There is no licence file.                                                 | 96 kHz/24-bit, 20+ layers, rimshot, side-stick, gong                                                                                                               |

**Decided: use both.** The permission posts are saved into `LICENSES/` (as
PDF and text) and the authors credited. Each is an explicit grant from the
author; it just isn't on a standard form. If D7's reviewer objects, both
drop out without touching anything else, because they are separate pieces.

### Excluded

- **Share-alike or GPL:**
  - Sam's Sonor (CC BY-SA 4.0)
  - AVL Drumkits (CC BY-SA 3.0)
  - Philharmonia (CC BY-SA, and also "not as samples")
  - Hydrogen's GMRockKit, TR808EmulationKit and Black Pearl (GPL)
- **Forbid redistribution:** Goldbaby, Bedroom Producers Blog, 99Sounds,
  MusicRadar SampleRadar, Pianobook, Hydrogen GSCW and MC-307.
- **Licence unclear:**
  - **Naked Drums.** The CC BY label is the converter's; the original was a
    time-limited Kontakt giveaway.
  - tidal-drum-machines, Dirt-Samples, smpldsnds, the oramics machine sets,
    and Reverb.com Drum Machines (the CC BY on archive.org was added by an
    unrelated uploader).
  - GeneralUser GS (its author isn't sure where all the samples came from).
- **The gap that matters:** **no 909, 707, 606, LinnDrum, DMX or SP-1200
  recordings with a licence that could be checked.** Electronic kits are
  built in-house instead (§8).

---

## 6. The sample pipeline

The sources are gigabytes of multi-mic FLAC. They are never committed, and
they never reach CI.

```
scripts/kits/
  sources.ts         one entry per source: URL, pinned commit or release, sha256,
                     licence id, licence file, date checked, credit line
  recipes/<kit>.ts   which source files make which piece: articulation → slot,
                     which layers, how many round-robins, mic weights
  build.ts           fetch (cached in .kit-sources/, gitignored) → verify sha256 →
                     mix mics to mono by the recipe's weights → onset-trim →
                     tail-trim with a 30 ms fade at −60 dB or the slot's cap →
                     measure loudness → encode → write public/kits/<piece>/ and
                     the manifest → copy licences
```

**What each step does:**

- **Onset at build time.** The first sample above −50 dBFS, less 0.5 ms.
  The runtime `onsetOf` still runs too, because decoders add their own
  priming.
- **Level matching.** K-weighted RMS over the first 150 ms after onset, on
  each piece's middle layer. LUFS-integrated is gated in 400 ms blocks and
  is wrong for one-shots. Each **role** has a target: kick = snare = 0 dB,
  toms −2, hats −6, ride −7, crash −5, perc −8. The difference is written as
  the piece's `trim`, so a snare swapped from another kit sits where the old
  one did. The samples themselves are never normalised: a layer's level
  relative to its neighbours is the dynamics.
- **Tail caps.** Kick, snare and toms 1.2 s; hats 1.5 s; ride 3 s; crash and
  china 4 s.
- **Format.** **AAC-LC in `.m4a`, mono, 44.1 kHz, 96 kbps**, encoded by
  `ffmpeg` (`-c:a aac`). AAC decodes in `decodeAudioData` in every browser on
  the matrix. Opus/WebM is about a third smaller, but Safari's Ogg/Opus
  decode only arrived in 18.4, and two formats doubles the files. Opus can
  come later as a single swap. A11's misnamed files are re-cut under the
  right names.
- **Reproducible.** Running the build twice from the pinned sources writes
  the same manifest bytes. It is fixed-seed and has no timestamps, and the
  manifest records each file's hash.
- **Run by the developer only.** It needs `ffmpeg` (not installed on this
  machine yet: `brew install ffmpeg`). CI only checks the result: the
  manifest matches the files, every source has a licence, and the budgets
  hold.

**Credits.**

- **The `/about` page and the README** get a credits list generated from
  `sources.ts`.
- **CC BY sources** carry the title, author, link, licence link and
  "modified: trimmed, mixed to mono, re-encoded".
- **DrumGizmo kits** use its required line once: "Drum samples provided by
  DrumGizmo.org".
- **A test** fails if a source in the manifest has no credit.

---

## 7. Pieces and kit-building

### The model

- **Piece.** One instrument from one source, for example _Big Rusty 14×8
  wooden snare_. It records:
  - its role (kick, snare, hat, ride, crash, tom, perc)
  - the articulations it covers, and which slot each fills (`s`, `sGhost`,
    `sCross`, `h`, `hOpen`, `hFoot`…)
  - its layers and round-robin files, its `trim`, its default pan, and its
    credit
- **Kit.** A map from slot to piece, plus per-slot `level`, `tune`
  (±12 semitones, in cents), `decay` (0.2–1, a gain-envelope shortening,
  not a time-stretch) and `pan`. It also has the kit's master and room
  settings.
- **System kits become piece maps.** The five recorded kits are re-expressed
  as piece maps from their own pieces, and sound the same.
- **Your kits** can hold a piece or one of your samples in any slot.

### Where pieces live

A `KitPiece` catalogue table (system, public), seeded from the pipeline's
manifest. It is served by `GET /api/v1/catalogue/pieces`, which is public,
cached and memoised like `/catalogue/kits`. A slot holds
`{ piece: '<key>' }`, `{ sample: '<id>' }`, or today's
`{ files }` shape, which is read as before.

- **Paths.** `PackSource` resolves files by the piece's folder, not the
  kit's, so one kit can draw from many folders (A9).
- **Privacy and export.** `KitPiece` has no `User` FK, so there is no
  erasure or export change. Your kits already export.

### Choosing

There are two ways to get a mixed kit:

1. **Curated combinations.** About six system kits, each built from the
   best pieces across sources and grouped as _Combinations_ in the picker.
   They are the "great choice" without anyone having to build one. A first
   cut:

   | Kit          | Kick                | Snare                     | Hats and cymbals                       |
   | ------------ | ------------------- | ------------------------- | -------------------------------------- |
   | Studio rock  | Big Rusty (damped)  | DRSKit                    | Big Rusty hat · Crocell crash and ride |
   | Funk & soul  | SM Drums            | Frankensnare 13"          | SM / DRS hat · DRS ride                |
   | Jazz brushes | DRSKit (feathered)  | DRSKit whisker            | DRS brush hat and ride                 |
   | Boom bap     | Gogodze (retro mic) | Frankensnare (fat) + clap | Gogodze hat                            |
   | Big room     | Big Rusty (open)    | Big Rusty rimshot accents | Crocell crashes, Salamander china      |
   | Garage       | Unruly              | Unruly 14"                | Unruly hat · Salamander ride           |

   The owner listens and signs off each one. Styles' default kits are
   re-pointed where a combination fits better.

2. **Build a kit.** In the Kit drawer, _Make my own from this kit_ copies the
   current kit into one of your kits (the existing 20-kit cap applies). Each
   slot then has:
   - a piece picker grouped by source, with a tap to hear it
   - Level, Tune, Decay and Pan, each with a `<FieldHelp>`
   - _Reset to kit_

   Uploading your own sample into a slot works as it does today. This is the
   TR-8S model: a sound per lane, three knobs, saved. It is enough. A
   per-mic mixer is not offered, because it costs 3–5× the bytes and voices.

**Sharing.** Today `/p/`'s player plays system kits only, because your kits
are private. A kit of yours that holds **only system pieces** could be heard
by anyone, if the published pattern carried its piece map. That is listed in
§10, not built here.

---

## 8. Synthesised and machine kits

- **Rendered ahead of time.** When a synth kit is picked, each voice is
  rendered with `OfflineAudioContext` at 5 velocities × 3 variations
  (noise seed, ±1.5% pitch, ±5% decay). The renders play through the
  sampler path.
  - Synth kits then get layers and round-robins.
  - A hit costs one source node instead of a graph of 10–20.
  - The two engines share one code path.
  - Turning a knob re-renders that voice only, debounced 150 ms. The old
    render keeps playing until the new one is ready.
  - Memory is about 2 MB per synth kit (mono 44.1 kHz Float32, average
    0.5 s × 15 × 11 voices).
- **Machines: 808 and 909 built in-house.** No recording of either could be
  licensed (§5), and `@driftbox/engine` was never installed, so `drift` is
  built here as voice models. They are rendered the same way:
  - **Kick, toms, conga:** a short impulse into a high-Q bandpass (the
    bridged-T resonator, [Werner, Abel & Smith, DAFx-14](https://dafx14.fau.de/papers/dafx14_kurt_james_werner_a_physically_informed,_ci.pdf)),
    plus a sine with a pitch envelope.
  - **Hats and cymbals:** six square oscillators at the 808's inharmonic
    ratios into two bandpasses (≈3.4 k and 7.1 k) and a highpass, as
    `metal()` does now.
  - **909 snare:** two tuned triangles plus filtered noise.
  - **909 hats and cymbals:** noise through resonant bandpasses. The real
    909 used samples here; this is an approximation, and its kit `hint` says
    so.

  The two kits that are disabled today become playable. A 606 and a
  LinnDrum-style kit come from the same voices with different tables.

- **Not built:** AudioWorklet, Faust or Plaits. Native nodes, rendered ahead,
  are cheaper and good enough. Revisit only if machine authenticity becomes
  a product goal.

---

## 9. Budgets

| Budget                               | Value                      | Why                                                                                                                                                                            |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Download per kit (all slots, all RR) | ≤ 3 MB                     | About 15 slots × 4 layers × 3 RR = 180 files at about 12 KB on average (shells about 6 KB, cymbals 30–45 KB)                                                                   |
| Loaded first                         | One RR per layer, ≤ 0.8 MB | Play works on a 4G phone in about a second; the rest load when idle                                                                                                            |
| Decoded per kit                      | ≤ 32 MB                    | Float32 at 44.1 kHz. iOS Safari kills pages for decoded-audio memory; the tail caps keep this down. The cache keeps the current kit and one other, and evicts the oldest (LRU) |
| `public/kits` in the repo            | ≤ 45 MB (today 1.3 MB)     | About 15 piece sources. See D41: committed, encoded once, never re-encoded without a reason                                                                                    |
| `/studio` and `/p/` first-load JS    | Unchanged                  | 8.12's budget holds. Samples are fetched, not imported                                                                                                                         |

---

## 10. Not in this phase

- **New articulations came into the phase** (D40, 2026-10-03) as 9-iv. That
  covers rimshot, flam, drag and buzz on the snare, half-open hat, crash 2,
  china and splash, and tom flams. Still out:
  - cymbal grabs (chokes)
  - a second crash as its own lane rather than a value
  - rolls longer than one step
- **Hearing your mixed kit on `/p/`.** This needs the published pattern to
  carry a piece map (§7).
- **Fatigue in Humanise; groove templates** beyond the style feel tables;
  storing Humanise in the pattern; a "feel" knob for push and pull per lane.
- **Opus delivery; a service-worker cache** for kits. **Moving the kit audio
  to a bucket** (D41) comes later, when the repo budget is close.
- **Per-mic faders; a kick-triggered snare buzz.** Frankensnare's sympathy
  snares make the buzz cheap later.
