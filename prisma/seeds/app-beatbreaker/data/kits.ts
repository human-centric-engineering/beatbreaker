/**
 * The kit table — seed data.
 *
 * 13 kits across four engines, each a plain parameter object plus an engine
 * name, so a kit is a row rather than a branch in playback and a user's tuning
 * is a saved override of these numbers.
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

import type { Kit } from '@/lib/app/breaks/kit';

export const KITS: Record<string, Kit> = {
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
    master: { lp: 7200, drive: 1.75, room: 0.24 },
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

  /* ---- drum-machine kits: voices come from @driftbox/engine, baked to buffers ----
     Knobs here are the machine's own 0..1 knobs, not Hz and seconds, because that
     is what the circuit models take. `room` is still our send, not theirs.        */
  tr909: {
    label: 'TR-909',
    engine: 'drift',
    machine: '909',
    trim: 0.68,
    hint: 'Roland TR-909 voice models — analogue kick and snare, 6-bit PCM hats and cymbals. Baked to samples once, then played back like samples.',
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
    trim: 0.62,
    hint: 'Roland TR-808 voice models. The 808 never had a ride or a crash, so those two come from the 909 — everything else is 808.',
    master: { lp: 16500, drive: 1.1, room: 0.05 },
    k: { tune: 0.42, decay: 0.3, tone: 0.34, colour: 0.55, level: 0.88, room: 0.02 },
    s: { tune: 0.5, decay: 0.4, tone: 0.5, colour: 0.55, level: 0.7, room: 0.06 },
    h: { tune: 0.5, decay: 0.3, tone: 0.55, colour: 0.5, level: 0.55, room: 0.04 },
    r: { tune: 0.5, decay: 0.55, tone: 0.5, colour: 0.5, level: 0.55, room: 0.08 },
    c: { tune: 0.5, decay: 0.62, tone: 0.5, colour: 0.5, level: 0.55, room: 0.12 },
    t: { tune: 76, decay: 0.7, tone: 0.18, room: 0.05 },
    p: { tune: 1.02, level: 0.9, tone: 1.05, room: 0.05 },
  },

  /* ---- recorded kits that ship with the page (see packs.js) ---- */
  muldjord: {
    label: 'Muldjord kit',
    engine: 'pack',
    pack: 'muldjord',
    trim: 1.42,
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
    trim: 1.34,
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
    trim: 0.87,
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
    trim: 1.15,
    hint: 'A real kit recorded live-club style — the one acoustic set here with its own toms, a hi-hat played with the foot, a cross-stick, and a ride worth riding on. The jazz styles switch to it on their own, because a swing ride on a synthesised cymbal never quite arrives. Made for the jazz styles, but it will play anything. The tom, foot-hat and percussion knobs are for the synthesised voices; on this kit those lanes are recordings, so only Room does anything to them.',
    credit:
      'Virtuosity Drums by Versilian Studios and Karoryfer Samples · CC0 1.0 (public domain). Percussion from the same library; woodblock and handclaps from the Versilian Community Sample Library · CC0 1.0. Mid ribbon mic, mono, trimmed and re-encoded for the web.',
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
    trim: 1.1,
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

  /* ---- your own recordings ---- */
  user: {
    label: 'Your samples',
    engine: 'user',
    hint: 'Load your own one-shots — a real kit, your kit, or whatever is on the drive. Nothing is uploaded; the files stay in this browser.',
    master: { lp: 18000, drive: 1.0, room: 0.08 },
    k: { rate: 1, level: 0.95, room: 0.02 },
    s: { rate: 1, level: 0.95, room: 0.08 },
    h: { rate: 1, level: 0.95, room: 0.06 },
    r: { rate: 1, level: 0.95, room: 0.1 },
    c: { rate: 1, level: 0.95, room: 0.14 },
    t: { tune: 90, decay: 0.5, tone: 0.4, room: 0.12 },
    p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.1 },
  },
};
