/**
 * The kit table — seed data.
 *
 * 26 kits across three engines, each a plain parameter object plus an engine
 * name, so a kit is a row rather than a branch in playback and a user's tuning
 * is a saved override of these numbers. Then six combinations of the recorded
 * kits' pieces (9-vi-c), at the end of the file.
 *
 * No kit here is `engine: 'user'`. Your own kits are rows you own, made through
 * `/api/v1/kits` (D20); the system "Your samples" kit that kept one-shots in
 * the browser left in Phase 4A, and the seed removes it from a database seeded
 * before then. No key here may start with `yours-`, which is what the server
 * mints your kits' keys under.
 *
 * **Content, not code** (D13). This file is the source the `001-catalogue` seed
 * unit reads, and nothing else imports it — playback takes a `ResolvedKit` as
 * an argument, and a grep test
 * (`tests/unit/lib/app/breaks/no-content-imports.test.ts`) keeps it that way.
 * The recordings themselves stay files under `public/kits/`; what the seed
 * writes into a row is which files each slot uses, read from
 * `public/kits/manifest.json`.
 *
 * Mix, mute, room send, drive and the glue compressor sit after all four
 * engines, which is what makes the kits comparable rather than four separate
 * apps. Each kit carries a `trim` measured against the synthesised kits, so a
 * busy bar through any kit lands within a decibel of the next and changing kit
 * is not a volume change.
 */

import type { Kit, KitSlotSettings } from '@/lib/app/breaks/kit';
import type { LaneKey } from '@/lib/app/breaks/types';

/**
 * A kit as this table writes it: a pack kit may also set how it plays some of
 * its slots (9-v's Level, Tune and Decay), on top of the pieces that fill them.
 */
export interface SeedKit extends Kit {
  slots?: Record<string, KitSlotSettings>;
}

export const KITS: Record<string, SeedKit> = {
  studio70: {
    label: "Studio '70s",
    hint: 'Warm and dry, tuned low. Fat snare, dark ride — carpet on the walls and a blanket in the kick.',
    master: { lp: 15000, drive: 1.25, room: 0.16 },
    k: { tune: 50, decay: 0.36, tone: 0.3, room: 0.04 },
    s: { tune: 186, decay: 0.18, tone: 0.52, room: 0.2 },
    h: { tune: 0.96, decay: 0.048, open: 0.34, tone: 7600, room: 0.12 },
    r: { tune: 0.92, decay: 1.6, tone: 3100, room: 0.26 },
    c: { tune: 0.88, decay: 2.4, tone: 2500, room: 0.38 },
    t: { tune: 88, decay: 0.52, tone: 0.34, room: 0.2 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.16 },
  },
  raregroove: {
    label: 'Rare groove',
    hint: 'Sampled off a worn record: rolled-off top, a bit of drive, everything slightly further away.',
    master: { lp: 7200, drive: 1.5, room: 0.24 },
    k: { tune: 46, decay: 0.3, tone: 0.22, room: 0.08 },
    s: { tune: 178, decay: 0.15, tone: 0.44, room: 0.3 },
    h: { tune: 0.88, decay: 0.04, open: 0.26, tone: 6200, room: 0.18 },
    r: { tune: 0.86, decay: 1.2, tone: 2600, room: 0.34 },
    c: { tune: 0.82, decay: 1.9, tone: 2000, room: 0.46 },
    t: { tune: 82, decay: 0.44, tone: 0.26, room: 0.26 },
    p: { tune: 0.94, level: 0.85, tone: 0.86, room: 0.22 },
  },
  liveroom: {
    label: 'Live room',
    hint: 'Big and open. Long cymbals, plenty of air — how it sounds when nobody puts tape on anything.',
    master: { lp: 17500, drive: 1.1, room: 0.44 },
    k: { tune: 54, decay: 0.42, tone: 0.42, room: 0.16 },
    s: { tune: 196, decay: 0.24, tone: 0.62, room: 0.46 },
    h: { tune: 1.04, decay: 0.058, open: 0.52, tone: 8800, room: 0.3 },
    r: { tune: 1.0, decay: 2.6, tone: 3600, room: 0.44 },
    c: { tune: 0.95, decay: 3.4, tone: 2900, room: 0.58 },
    t: { tune: 94, decay: 0.66, tone: 0.44, room: 0.42 },
    p: { tune: 1.04, level: 0.9, tone: 1.1, room: 0.34 },
  },
  machine: {
    label: 'Machine',
    hint: 'Drum-box flavour — clicky kick, noisy snare, pure metal cymbals. No room at all.',
    master: { lp: 18000, drive: 1.35, room: 0.0 },
    k: { tune: 42, decay: 0.52, tone: 0.62, room: 0 },
    s: { tune: 220, decay: 0.13, tone: 0.8, room: 0.04 },
    h: { tune: 1.22, decay: 0.034, open: 0.3, tone: 9800, room: 0.02 },
    r: { tune: 1.18, decay: 1.1, tone: 4400, room: 0.04 },
    c: { tune: 1.1, decay: 1.8, tone: 3400, room: 0.06 },
    t: { tune: 100, decay: 0.4, tone: 0.6, room: 0.02 },
    p: { tune: 1.1, level: 0.9, tone: 1.2, room: 0.03 },
  },
  practice: {
    label: 'Practice',
    hint: 'Built to be played over. Short, dry and bright so it still cuts when you are hitting real drums.',
    master: { lp: 16000, drive: 1.0, room: 0.04 },
    k: { tune: 58, decay: 0.22, tone: 0.72, room: 0 },
    s: { tune: 210, decay: 0.12, tone: 0.66, room: 0.05 },
    h: { tune: 1.1, decay: 0.032, open: 0.22, tone: 9200, room: 0.04 },
    r: { tune: 1.05, decay: 0.85, tone: 4200, room: 0.06 },
    c: { tune: 1.0, decay: 1.5, tone: 3200, room: 0.1 },
    t: { tune: 96, decay: 0.34, tone: 0.62, room: 0.05 },
    p: { tune: 1.06, level: 0.9, tone: 1.14, room: 0.05 },
  },

  /* ---- drum-machine kits: voice models built here (lib/app/breaks/audio/machines.ts) ----
     Knobs here are the machine's own 0..1 knobs, not Hz and seconds, because that
     is what the voice models take; `level` is a gain when a hit plays. The toms
     and percussion are the synth's units (SYNTH_ONLY). `room` is still our send.
     Trims are 1: the owner listened against the synthesised kits on 2026-10-13
     and signed all four off at that level (9-vi-e). */
  tr909: {
    label: 'TR-909',
    engine: 'drift',
    machine: '909',
    trim: 1,
    hint: 'Roland TR-909, modelled: analogue kick, snare and toms, rim shot. The real hats and cymbals were 6-bit samples; these are noise and metal approximations of them.',
    master: { lp: 18000, drive: 1.15, room: 0.06 },
    k: { tune: 0.34, decay: 0.42, tone: 0.5, colour: 0.0, level: 0.86, room: 0.02 },
    s: { tune: 0.5, decay: 0.42, tone: 0.52, colour: 0.58, level: 0.72, room: 0.06 },
    h: { tune: 0.5, decay: 0.34, tone: 0.52, colour: 0.5, level: 0.6, room: 0.04 },
    r: { tune: 0.5, decay: 0.55, tone: 0.5, colour: 0.5, level: 0.55, room: 0.08 },
    c: { tune: 0.5, decay: 0.62, tone: 0.5, colour: 0.5, level: 0.55, room: 0.12 },
    t: { tune: 92, decay: 0.44, tone: 0.55, room: 0.05 },
    p: { tune: 1.08, level: 0.9, tone: 1.16, room: 0.05 },
  },
  tr808: {
    label: 'TR-808',
    engine: 'drift',
    machine: '808',
    trim: 1,
    hint: "Roland TR-808, modelled: the long kick, the snare, rim shot, the six-square-wave hats and three toms. The ride and crash are the 909's.",
    master: { lp: 16500, drive: 1.1, room: 0.05 },
    k: { tune: 0.42, decay: 0.3, tone: 0.34, colour: 0.55, level: 0.88, room: 0.02 },
    s: { tune: 0.5, decay: 0.4, tone: 0.5, colour: 0.55, level: 0.7, room: 0.06 },
    h: { tune: 0.5, decay: 0.3, tone: 0.55, colour: 0.5, level: 0.55, room: 0.04 },
    r: { tune: 0.5, decay: 0.55, tone: 0.5, colour: 0.5, level: 0.55, room: 0.08 },
    c: { tune: 0.5, decay: 0.62, tone: 0.5, colour: 0.5, level: 0.55, room: 0.12 },
    t: { tune: 76, decay: 0.7, tone: 0.18, room: 0.05 },
    p: { tune: 1.02, level: 0.9, tone: 1.05, room: 0.05 },
  },
  tr606: {
    label: 'TR-606',
    engine: 'drift',
    machine: '606',
    trim: 1,
    hint: "Roland TR-606, modelled from the 808's circuits with its own tunings: a short, high kick, a noisy snare, thin hats and one cymbal on the crash. The ride is the 909's.",
    master: { lp: 17000, drive: 1.1, room: 0.05 },
    k: { tune: 0.5, decay: 0.4, tone: 0.45, colour: 0.3, level: 0.9, room: 0.02 },
    s: { tune: 0.5, decay: 0.35, tone: 0.6, colour: 0.6, level: 0.72, room: 0.05 },
    h: { tune: 0.55, decay: 0.3, tone: 0.6, colour: 0.55, level: 0.55, room: 0.03 },
    r: { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5, level: 0.5, room: 0.06 },
    c: { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5, level: 0.5, room: 0.1 },
    t: { tune: 96, decay: 0.42, tone: 0.2, room: 0.04 },
    p: { tune: 1.04, level: 0.9, tone: 1.1, room: 0.04 },
  },
  linn: {
    label: 'Linn-style',
    engine: 'drift',
    machine: 'linn',
    trim: 1,
    hint: "In the manner of an early-'80s sampling drum machine: a punchy kick, a fat snare, sidestick, crisp hats. Not the LinnDrum's recordings — the 909's models, tuned towards it.",
    master: { lp: 16000, drive: 1.15, room: 0.12 },
    k: { tune: 0.45, decay: 0.4, tone: 0.4, colour: 0.25, level: 0.88, room: 0.03 },
    s: { tune: 0.4, decay: 0.55, tone: 0.55, colour: 0.45, level: 0.72, room: 0.14 },
    h: { tune: 0.5, decay: 0.35, tone: 0.45, colour: 0.5, level: 0.55, room: 0.05 },
    r: { tune: 0.5, decay: 0.55, tone: 0.5, colour: 0.45, level: 0.5, room: 0.1 },
    c: { tune: 0.5, decay: 0.6, tone: 0.5, colour: 0.55, level: 0.5, room: 0.14 },
    t: { tune: 88, decay: 0.5, tone: 0.3, room: 0.1 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.08 },
  },

  /* ---- recorded kits that ship with the page (see packs.js) ---- */
  muldjord: {
    label: 'Muldjord kit',
    engine: 'pack',
    pack: 'muldjord',
    // each slot carries its own level now (Phase 9 pipeline); see scripts/kits/build.ts
    trim: 1,
    hint: 'A real kit, recorded properly: two kick mics, a snare with its own rest strokes, hats, ride, ride bell and crash. Three velocity layers on the lanes that need them.',
    credit:
      'MuldjordKit by Lars Muldjord · CC BY 4.0 · Hydrogen conversion by FreePats (freepats.zenvoid.org)',
    master: { lp: 18000, drive: 1.05, room: 0.1 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.1 },
    h: { rate: 1, level: 0.9, room: 0.06 },
    r: { rate: 1, level: 0.85, room: 0.12 },
    c: { rate: 1, level: 0.85, room: 0.16 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },
  vintage: {
    label: 'Dusty sampler',
    engine: 'pack',
    pack: 'vintage',
    // each slot carries its own level now (Phase 9 pipeline); see scripts/kits/build.ts
    trim: 1,
    hint: 'Down-sampled and bit-crushed hits — SP-1200 territory. Dark kick, snare layered with a clap, one 808 cymbal doing both ride and crash. Made for the boom-bap and Dilla styles.',
    credit: 'Soulful Vintage kit by Boochi44 · CC0 1.0 (public domain)',
    master: { lp: 9000, drive: 1.5, room: 0.14 },
    k: { rate: 1, level: 1.0, room: 0.02 },
    s: { rate: 1, level: 0.95, room: 0.12 },
    h: { rate: 1, level: 0.85, room: 0.08 },
    r: { rate: 1, level: 0.75, room: 0.14 },
    c: { rate: 1, level: 0.8, room: 0.18 },
    t: { tune: 80, decay: 0.4, tone: 0.24, room: 0.16 },
    p: { tune: 0.92, level: 0.9, tone: 0.84, room: 0.16 },
  },
  trap: {
    label: 'Trap kit',
    engine: 'pack',
    pack: 'trap',
    // each slot carries its own level now (Phase 9 pipeline); see scripts/kits/build.ts
    trim: 1,
    hint: 'Long distorted 808 kick, snare with a clap on top, tight hats. Not a break-practice kit — it is here because the same grid drives it.',
    credit: 'Hard Trap kit by Boochi44 · CC0 1.0 (public domain)',
    master: { lp: 18000, drive: 1.1, room: 0.04 },
    k: { rate: 1, level: 0.85, room: 0.0 },
    s: { rate: 1, level: 0.95, room: 0.06 },
    h: { rate: 1, level: 0.9, room: 0.03 },
    r: { rate: 1, level: 0.8, room: 0.06 },
    c: { rate: 1, level: 0.8, room: 0.1 },
    t: { tune: 74, decay: 0.6, tone: 0.3, room: 0.04 },
    p: { tune: 1.12, level: 0.9, tone: 1.22, room: 0.04 },
  },

  virtuosity: {
    label: 'Jazz kit (Virtuosity)',
    engine: 'pack',
    pack: 'virtuosity',
    // each slot carries its own level now (Phase 9 pipeline); see scripts/kits/build.ts
    trim: 1,
    hint: 'A real kit recorded live-club style — the one acoustic set here with its own toms, a hi-hat played with the foot, a cross-stick, and a ride worth riding on. The jazz styles switch to it on their own, because a swing ride on a synthesised cymbal never quite arrives. Made for the jazz styles, but it will play anything. The tom, foot-hat and percussion knobs are for the synthesised voices; on this kit those lanes are recordings, so only Room does anything to them.',
    credit:
      'Virtuosity Drums by Versilian Studios and Karoryfer Samples · CC0 1.0 (public domain). Percussion from the same library; woodblock and group handclaps from the Versilian Community Sample Library, tambourine from Frankensnare and a single handclap from Body Percussion by Karoryfer Samples, shaker and muted bongo from FreePats World Percussion · all CC0 1.0. Mid ribbon mic, mono, trimmed and re-encoded for the web.',
    master: { lp: 18000, drive: 1.06, room: 0.16 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.14 },
    h: { rate: 1, level: 0.95, room: 0.09 },
    r: { rate: 1, level: 0.9, room: 0.16 },
    c: { rate: 1, level: 0.88, room: 0.22 },
    t: { tune: 90, decay: 0.5, tone: 0.4, room: 0.16 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.14 },
  },

  brush: {
    label: 'Brush kit',
    engine: 'pack',
    pack: 'brush',
    // each slot carries its own level now (Phase 9 pipeline); see scripts/kits/build.ts
    brushes: true,
    trim: 1,
    hint: 'Wire brushes, not sticks — the snare becomes a soft slap with no crack in it, and the cymbals are played light. Made for the ballad. The continuous swirl a brush player keeps going with the left hand is not here: a swirl is not a step, and this page only has steps.',
    credit:
      'Swirly Drums by Karoryfer Samples · CC0 1.0 (public domain). Top snare mic, mono, trimmed and re-encoded for the web.',
    master: { lp: 17000, drive: 1.02, room: 0.2 },
    k: { rate: 1, level: 0.95, room: 0.04 },
    s: { rate: 1, level: 1.0, room: 0.16 },
    h: { rate: 1, level: 0.95, room: 0.1 },
    r: { rate: 1, level: 0.92, room: 0.18 },
    c: { rate: 1, level: 0.88, room: 0.24 },
    t: { tune: 88, decay: 0.5, tone: 0.34, room: 0.18 },
    p: { tune: 1.0, level: 0.9, tone: 0.94, room: 0.16 },
  },

  bigrusty: {
    label: 'Big Rusty',
    engine: 'pack',
    pack: 'bigrusty',
    // each slot carries its own level (Phase 9 pipeline); see scripts/kits/build.ts
    trim: 1,
    hint: 'A 1980s Polish kit with a damped 24" kick and a wooden snare, played hard. The rock kit: thick, a bit rough, and with a big wash of cymbal over it.',
    credit:
      'Big Rusty Drums by Karoryfer Samples · CC0 1.0 (public domain). Splash from Salamander Drumkit by Alexander Holm · public domain. Close mics and overheads mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 18000, drive: 1.08, room: 0.12 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.12 },
    h: { rate: 1, level: 0.9, room: 0.07 },
    r: { rate: 1, level: 0.88, room: 0.14 },
    c: { rate: 1, level: 0.86, room: 0.18 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  drs: {
    label: 'DRS kit',
    engine: 'pack',
    pack: 'drs',
    trim: 1,
    hint: 'A studio kit recorded on thirteen mics by the DrumGizmo team: even, clear and well behaved, with a Paiste ride and crash. The one to reach for when you want a kit that sounds like a record.',
    credit:
      'DRSKit by Lars and Deva Muldjord (DrumGizmo), on a kit lent by DRSDrums · CC BY 4.0. Drum samples provided by DrumGizmo.org. China and splash from Salamander Drumkit by Alexander Holm · public domain. Close mics, overheads and room mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 18000, drive: 1.04, room: 0.1 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.1 },
    h: { rate: 1, level: 0.9, room: 0.06 },
    r: { rate: 1, level: 0.88, room: 0.12 },
    c: { rate: 1, level: 0.86, room: 0.16 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  drsBrush: {
    label: 'DRS brushes',
    engine: 'pack',
    pack: 'drs-brush',
    brushes: true,
    trim: 1,
    hint: 'The DRS kit played with brushes. The snare, hats, ride, crash and toms are brushed; the kick, the cross-stick and the foot hat are the same as with sticks, because a brush player plays those the same way. There is no ride bell with a brush, so the bell plays the ride. The half-open hat is the stick kit’s too.',
    credit:
      'DRSKit by Lars and Deva Muldjord (DrumGizmo), on a kit lent by DRSDrums · CC BY 4.0. Drum samples provided by DrumGizmo.org. China and splash from Salamander Drumkit by Alexander Holm · public domain. Close mics, overheads and room mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 17000, drive: 1.02, room: 0.18 },
    k: { rate: 1, level: 0.95, room: 0.04 },
    s: { rate: 1, level: 1.0, room: 0.16 },
    h: { rate: 1, level: 0.95, room: 0.1 },
    r: { rate: 1, level: 0.92, room: 0.18 },
    c: { rate: 1, level: 0.88, room: 0.22 },
    t: { tune: 88, decay: 0.5, tone: 0.34, room: 0.18 },
    p: { tune: 1.0, level: 0.9, tone: 0.94, room: 0.16 },
  },

  unruly: {
    label: 'Unruly',
    engine: 'pack',
    pack: 'unruly',
    trim: 1,
    hint: 'Every drum on this kit has snare wires on it, the kick included, so everything rattles a little. It has no toms: like the kit it was recorded from, its three snares, wires off, play the toms. Garage, lo-fi, and anything that should sound less tidy.',
    credit:
      'Unruly Drums by Karoryfer Samples · CC0 1.0 (public domain). Second crash, china and splash from Salamander Drumkit by Alexander Holm · public domain. Close mics and overheads mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 17000, drive: 1.12, room: 0.12 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.12 },
    h: { rate: 1, level: 0.9, room: 0.07 },
    r: { rate: 1, level: 0.88, room: 0.14 },
    c: { rate: 1, level: 0.86, room: 0.18 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  gogodze: {
    label: 'Gogodze',
    engine: 'pack',
    pack: 'gogodze',
    trim: 1,
    hint: 'A damped kit heard mostly through a deliberately lo-fi mic, with one by the window: boxy, warm and a little distant. Made for boom bap. The kit has no cymbals, so its ride, crashes and china are Big Rusty’s, close-miked and dry.',
    credit:
      'Gogodze Phu Vol II by Karoryfer Lecolds · CC0 1.0 (public domain). Ride, crashes and china from Big Rusty Drums by Karoryfer Samples · CC0 1.0; splash from Salamander Drumkit by Alexander Holm · public domain. Mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 12000, drive: 1.2, room: 0.1 },
    k: { rate: 1, level: 1.0, room: 0.02 },
    s: { rate: 1, level: 0.95, room: 0.1 },
    h: { rate: 1, level: 0.88, room: 0.06 },
    r: { rate: 1, level: 0.8, room: 0.12 },
    c: { rate: 1, level: 0.8, room: 0.16 },
    t: { tune: 84, decay: 0.48, tone: 0.3, room: 0.12 },
    p: { tune: 0.96, level: 0.9, tone: 0.9, room: 0.12 },
  },

  smdrums: {
    label: 'SM Drums',
    engine: 'pack',
    pack: 'smdrums',
    trim: 1,
    hint: 'A 1960s Ludwig in Oyster Blue Pearl, with a 1965 snare left ringing. Round, warm and a little loose: the funk and soul kit. Heard through its own stereo mix rather than close mics.',
    credit:
      'SM Drums by Scott McLean, Tod Stillwell and Suleiman Ali · free for any use, by their grant. Splash from Salamander Drumkit by Alexander Holm · public domain. Mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 17000, drive: 1.1, room: 0.12 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.12 },
    h: { rate: 1, level: 0.9, room: 0.07 },
    r: { rate: 1, level: 0.88, room: 0.14 },
    c: { rate: 1, level: 0.86, room: 0.18 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  sixties: {
    label: 'Sixties Ludwig',
    engine: 'pack',
    pack: 'smdrums',
    trim: 1,
    hint: "SM Drums' 1960s Ludwig with the top rolled off a little and its thin crashes left to wash: ringing toms, a bright snare, loose hats. Ringo Starr's early songs play it.",
    credit:
      'SM Drums by Scott McLean, Tod Stillwell and Suleiman Ali · free for any use, by their grant. Splash from Salamander Drumkit by Alexander Holm · public domain. Mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 13000, drive: 1.14, room: 0.18 },
    k: { rate: 1.02, level: 0.95, room: 0.05 },
    s: { rate: 1.03, level: 0.95, room: 0.16 },
    h: { rate: 1, level: 0.9, room: 0.1 },
    r: { rate: 1, level: 0.88, room: 0.16 },
    c: { rate: 1, level: 0.86, room: 0.22 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },
  teatowel: {
    label: 'Damped and dead',
    engine: 'pack',
    pack: 'gogodze',
    trim: 1,
    leather: true,
    hint: "Gogodze's damped kick and deadened toms, played a shade slower so they sit low, with the room taken out, and a strip of leather on the snare that chokes it to a thud: short, dark and punchy, like drums with towels over them. Its cymbals are Big Rusty's, and they and the hats are kept low. Ringo Starr's later songs and DJ Johnson play it.",
    credit:
      'Gogodze Phu Vol II by Karoryfer Lecolds · CC0 1.0 (public domain). Ride, crashes and china from Big Rusty Drums by Karoryfer Samples · CC0 1.0; splash from Salamander Drumkit by Alexander Holm · public domain. Mixed to mono, trimmed and re-encoded for the web; kick, snare and toms played slower.',
    master: { lp: 11000, drive: 1.2, room: 0.04 },
    k: { rate: 0.96, level: 1.0, room: 0.0 },
    // the leather "drops the drum in pitch" (DJ Johnson, Modern Drummer, 2020)
    s: { rate: 0.9, level: 0.95, room: 0.04 },
    // hats 8 dB and cymbals 5 under the pack's: on a dead kit they rang over everything
    h: { rate: 1, level: 0.35, room: 0.03 },
    r: { rate: 1, level: 0.45, room: 0.06 },
    c: { rate: 1, level: 0.45, room: 0.08 },
    t: { tune: 84, decay: 0.48, tone: 0.3, room: 0.12 },
    p: { tune: 0.96, level: 0.9, tone: 0.9, room: 0.12 },
    /* Gogodze's snare falls 25 dB in its first 160 ms, so cutting its tail
       changed nothing that could be heard. The leather is a damp on the
       stroke itself: struck, then its ring choked within about 0.1 s and its
       crack rolled off above 3 kHz. The cross-stick's click is the rim's, and
       keeps a little more ring. The open hats sustained a second at full
       strength and washed over the kit: 6 dB under the closed hat and choked
       at half their length. */
    slots: {
      s: { damp: 0.85 },
      sGhost: { damp: 0.85 },
      sCross: { decay: 0.5 },
      hOpen: { level: 0.5, decay: 0.45 },
      hHalf: { level: 0.6, decay: 0.6 },
    },
  },

  police: {
    label: 'Bright and tight',
    engine: 'pack',
    pack: 'drs',
    trim: 1,
    hint: 'The DRS kit with its snare played faster, so it sits high and cracks like a brass snare cranked tight, and its hats and Paiste cymbals sped up a little to speak short and small. The Stewart Copeland and Gavin Harrison styles play it.',
    credit:
      'DRSKit by Lars and Deva Muldjord (DrumGizmo), on a kit lent by DRSDrums · CC BY 4.0. Drum samples provided by DrumGizmo.org. China and splash from Salamander Drumkit by Alexander Holm · public domain. Close mics, overheads and room mixed to mono, trimmed and re-encoded for the web; snare, hats and cymbals played faster.',
    master: { lp: 18000, drive: 1.08, room: 0.1 },
    k: { rate: 1.04, level: 0.95, room: 0.03 },
    s: { rate: 1.12, level: 0.95, room: 0.1 },
    h: { rate: 1.04, level: 0.9, room: 0.06 },
    r: { rate: 1.04, level: 0.88, room: 0.12 },
    c: { rate: 1.08, level: 0.86, room: 0.14 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  london: {
    label: 'Small and dry',
    engine: 'pack',
    pack: 'gogodze',
    trim: 1,
    hint: "Gogodze's damped, lo-fi drums with the snare played faster so it sits tight and high, pushed into a little more distortion, as if recorded on two mics. Its trashy crashes and china are Big Rusty's. The Yussef Dayes style plays it.",
    credit:
      'Gogodze Phu Vol II by Karoryfer Lecolds · CC0 1.0 (public domain). Ride, crashes and china from Big Rusty Drums by Karoryfer Samples · CC0 1.0; splash from Salamander Drumkit by Alexander Holm · public domain. Mixed to mono, trimmed and re-encoded for the web; snare played faster.',
    master: { lp: 13000, drive: 1.45, room: 0.08 },
    k: { rate: 1.02, level: 1.0, room: 0.02 },
    s: { rate: 1.16, level: 0.95, room: 0.08 },
    h: { rate: 1.04, level: 0.88, room: 0.05 },
    r: { rate: 1.0, level: 0.8, room: 0.1 },
    c: { rate: 1.06, level: 0.8, room: 0.12 },
    t: { tune: 84, decay: 0.48, tone: 0.3, room: 0.12 },
    p: { tune: 0.96, level: 0.9, tone: 0.9, room: 0.12 },
  },

  osdk: {
    label: 'Open Source kit',
    engine: 'pack',
    pack: 'osdk',
    trim: 1,
    hint: 'A full acoustic kit recorded in fine detail, with a lot of dynamic range: soft strokes are really soft. It has no fully open hat, so its open hat is a half-open one, and its half-open is half-closed. One crash; the china and splash are Salamander’s.',
    credit:
      'The Open Source Drumkit by Real Music Media · public domain, by its makers’ grant. China and splash from Salamander Drumkit by Alexander Holm · public domain. Top and under mics mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 18000, drive: 1.06, room: 0.12 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.12 },
    h: { rate: 1, level: 0.9, room: 0.07 },
    r: { rate: 1, level: 0.88, room: 0.14 },
    c: { rate: 1, level: 0.86, room: 0.18 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },

  crocell: {
    label: 'Crocell kit',
    engine: 'pack',
    pack: 'crocell',
    trim: 1,
    hint: 'A metal band’s kit, sampled in the studio where they had just made their album: a punchy kick, a tight, cracking snare and big cymbals, two of each. Fifteen mics, mixed close with the overheads and a little room.',
    credit:
      'CrocellKit by Lars Muldjord (DrumGizmo), on the kit of the band Crocell, mic’d by JBOSound · CC BY 4.0. Drum samples provided by DrumGizmo.org. Close mics, overheads and room mixed to mono, trimmed and re-encoded for the web.',
    master: { lp: 18000, drive: 1.06, room: 0.1 },
    k: { rate: 1, level: 0.95, room: 0.03 },
    s: { rate: 1, level: 0.95, room: 0.1 },
    h: { rate: 1, level: 0.9, room: 0.06 },
    r: { rate: 1, level: 0.88, room: 0.12 },
    c: { rate: 1, level: 0.86, room: 0.16 },
    t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
  },
};

/**
 * A combination (9-vi-c): a recorded kit made of other kits' pieces, filed
 * under _Combinations_ in the picker. It names no pack, because each of its
 * slots plays from its own piece's folder.
 */
export interface Combination extends Omit<Kit, 'pack' | 'credit'> {
  /**
   * `KitPiece` keys, in order. Each fills every slot it has, and a later one
   * takes a slot from an earlier one: a set of crashes, then a china, is
   * those crashes with that china.
   */
  pieces: string[];
  /** Lane → pan, as the drummer hears it, where it is not `DEFAULT_PAN`. */
  pan?: Partial<Record<LaneKey, number>>;
}

/** The voices of a recorded kit: its rate, level and room, and the synthesised fallbacks' numbers. */
const RECORDED: Pick<Kit, 'k' | 's' | 'h' | 'r' | 'c' | 't' | 'p'> = {
  k: { rate: 1, level: 0.95, room: 0.03 },
  s: { rate: 1, level: 0.95, room: 0.12 },
  h: { rate: 1, level: 0.9, room: 0.07 },
  r: { rate: 1, level: 0.88, room: 0.14 },
  c: { rate: 1, level: 0.86, room: 0.18 },
  t: { tune: 90, decay: 0.54, tone: 0.38, room: 0.14 },
  p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.12 },
};

/**
 * The six of `sound-plan.md` §7, from the pieces there are (the reconcile in
 * `app-plan.md` says where they differ). Each is signed off by ear before a
 * style takes it as its default; the record is in `sound.md`. Their credits
 * are derived from their pieces, so none is written here.
 */
export const COMBINATIONS: Record<string, Combination> = {
  studioRock: {
    label: 'Studio rock',
    engine: 'pack',
    trim: 1,
    hint: "Big Rusty's damped kick and hats under the DRS kit's even, cracking snare, with Crocell's big cymbals. A rock kit that sounds like a record: tight, dry and close.",
    master: { lp: 18000, drive: 1.08, room: 0.08 },
    ...RECORDED,
    pieces: [
      'bigrusty-k',
      'drs-s',
      'bigrusty-h',
      'crocell-r',
      'crocell-c',
      'bigrusty-t1',
      'bigrusty-t2',
      'bigrusty-t3',
    ],
  },
  funkSoul: {
    label: 'Funk & soul',
    engine: 'pack',
    trim: 1,
    hint: "SM Drums' 1960s Ludwig with Frankensnare's fat 13-inch birch snare in place of its own: short and thumpy, for ghost notes that speak. The DRS kit's Paiste ride over it.",
    master: { lp: 15500, drive: 1.12, room: 0.1 },
    ...RECORDED,
    pieces: [
      'smdrums-k',
      'frankensnare-13b',
      'smdrums-h',
      'drs-r',
      'smdrums-c',
      'salamander-splash',
      'smdrums-t1',
      'smdrums-t2',
      'smdrums-t3',
    ],
    pan: { h: -0.25, hf: -0.25, r: 0.3, c: -0.32 },
  },
  jazzBrushes: {
    label: 'Jazz brushes',
    engine: 'pack',
    brushes: true,
    trim: 1,
    hint: "The DRS kit played with brushes, over the Virtuosity jazz kit's small bass drum, feathered rather than thumped. For ballads and brush swing.",
    master: { lp: 17000, drive: 1.02, room: 0.18 },
    ...RECORDED,
    k: { rate: 1, level: 0.9, room: 0.06 },
    s: { rate: 1, level: 1.0, room: 0.16 },
    h: { rate: 1, level: 0.95, room: 0.1 },
    r: { rate: 1, level: 0.92, room: 0.18 },
    c: { rate: 1, level: 0.88, room: 0.22 },
    pieces: [
      'virtuosity-k',
      'drs-brush-s',
      'drs-brush-sCross',
      'drs-brush-h',
      'drs-brush-hFoot',
      'drs-brush-hHalf',
      'drs-brush-r',
      'drs-brush-c',
      // as the DRS brushes kit has them
      'salamander-china',
      'salamander-splash',
      'drs-brush-t1',
      'drs-brush-t2',
      'drs-brush-t3',
    ],
    pan: { h: -0.22, hf: -0.22, r: 0.3 },
  },
  boomBap: {
    label: 'Boom bap',
    engine: 'pack',
    trim: 1,
    hint: "Gogodze's boxy, lo-fi kick and hats with Frankensnare's 20-inch snare, deep and thumpy like an 808's, all pushed into the drive and rolled off. Nearly mono, like a sampled break. The clap is on the percussion lanes.",
    master: { lp: 11000, drive: 1.25, room: 0.06 },
    ...RECORDED,
    k: { rate: 1, level: 1.0, room: 0.02 },
    s: { rate: 1, level: 0.95, room: 0.08 },
    pieces: [
      'gogodze-k',
      'frankensnare-20m',
      'gogodze-h',
      'gogodze-r',
      'gogodze-c',
      'salamander-splash',
      'gogodze-t1',
      'gogodze-t2',
      'gogodze-t3',
    ],
    pan: { s: 0, h: -0.12, hf: -0.12, r: 0.12, c: -0.15, t1: -0.06, t2: 0.04, t3: 0.12 },
  },
  bigRoom: {
    label: 'Big room',
    engine: 'pack',
    trim: 1,
    hint: "Big Rusty played hard in a big room, its rimshots for the accents, under Crocell's crashes and Salamander's china. Wide, with plenty of air: for the chorus, not the verse.",
    master: { lp: 18000, drive: 1.06, room: 0.32 },
    ...RECORDED,
    pieces: [
      'bigrusty-k',
      'bigrusty-s',
      'bigrusty-h',
      'bigrusty-r',
      'crocell-c',
      'salamander-china',
      'bigrusty-t1',
      'bigrusty-t2',
      'bigrusty-t3',
    ],
    pan: { h: -0.4, hf: -0.4, r: 0.45, c: -0.5, t1: -0.25, t2: 0.15, t3: 0.45 },
  },
  garage: {
    label: 'Garage',
    engine: 'pack',
    trim: 1,
    hint: "Unruly's rattling drums, every one with snare wires on, under SM Drums' thin 1960s ride and Salamander's crash and china. Loose and a little trashy.",
    master: { lp: 15000, drive: 1.18, room: 0.14 },
    ...RECORDED,
    pieces: [
      'unruly-k',
      'unruly-s',
      'unruly-h',
      'smdrums-r',
      'unruly-c',
      'salamander-crash',
      'salamander-china',
      'salamander-splash',
      'unruly-t1',
      'unruly-t2',
      'unruly-t3',
    ],
    pan: { h: -0.2, hf: -0.2, r: 0.22, c: -0.25, t1: -0.1, t2: 0.06, t3: 0.2 },
  },
};
