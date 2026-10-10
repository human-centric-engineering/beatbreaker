/**
 * What a kit is, and the knobs each one exposes.
 *
 * **The kit table itself is not in this file any more.** Kits are `Kit` rows
 * from Phase 2 (D13), seeded from `prisma/seeds/app-beatbreaker/data/kits.ts`,
 * and playback receives a {@link ResolvedKit} rather than looking one up by
 * key. What is left here is the vocabulary — the slots, the voices, the knob
 * definitions — which is structural: a saved tuning is meaningless without it,
 * so it stays in code and is served read-only.
 *
 * **Four engines, one playback path.** Each kit is a plain parameter object
 * plus an engine name, so a fork adds a kit without touching playback and a
 * user's tuning is a saved override of these numbers:
 *
 * - `synth` — the five acoustic kits. A graph per hit, so every knob is live,
 *   every hit is slightly different, and the whole thing costs nothing to ship.
 * - `drift` — TR-808 / TR-909 voice models, rendered through an
 *   `OfflineAudioContext` into one buffer per velocity layer when a knob moves.
 * - `pack` — recorded kits, decoded on first use.
 * - `user` — your own kits: samples you uploaded to your account (D20),
 *   fetched from the owner-checked audio route and decoded on first use.
 *
 * Mix, mute, room send, drive and the glue compressor sit after all four, which
 * is what makes the kits comparable rather than four separate apps. Each kit
 * carries a `trim` measured against the synthesised kits, so a busy bar through
 * any kit lands within a decibel of the next and changing kit is not a volume
 * change.
 */

/** The classic six-oscillator metal cluster a cymbal is built from. */
export const RATIOS = [1, 1.342, 1.2312, 1.6532, 1.9315, 2.5423];

/** Which playback path a kit takes. */
export type KitEngine = 'synth' | 'drift' | 'pack' | 'user';

/** One voice's knobs. Units depend on the engine — see {@link PARAM_DEFS}. */
export type VoiceParams = Record<string, number>;

/**
 * One slot's recordings: the files, and the velocity each was recorded at.
 *
 * `v: null` means one layer at full velocity. This is the shape
 * `public/kits/manifest.json` carried before Phase 2; it is now the `samples`
 * column on a `Kit` row, and the audio files stay where they were.
 */
export type KitSampleSlot = KitSampleSlotFlat | KitSampleSlotLayered;

/**
 * How a kit plays one of its slots (Phase 9-v): your kit's Level, Tune and
 * Decay for it. Absent is as recorded.
 */
export interface KitSlotSettings {
  /** Gain, 0–2. */
  level?: number;
  /** Cents, ±1200. */
  tune?: number;
  /** How much of the recording rings before it is faded out, 0.2–1. */
  decay?: number;
}

/** One file per velocity layer: the shape every kit shipped in before Phase 9. */
export interface KitSampleSlotFlat extends KitSlotSettings {
  v: number[] | null;
  files: string[];
  /** The folder under `/kits/` its files are in, where it is not the kit's `pack`. */
  folder?: string;
}

/**
 * Velocity layers with round-robins (Phase 9): several recordings of the same
 * stroke at the same strength, so a run of sixteenths is not one sample
 * played sixteen times.
 */
export interface KitSampleSlotLayered extends KitSlotSettings {
  layers: KitSampleLayer[];
  /**
   * The folder under `/kits/` its files are in, where it is not the kit's
   * `pack`: a slot resolved from a piece, which may be any pack's (A9).
   */
  folder?: string;
  /**
   * Gain that brings this slot's piece to its role's level (Phase 9's
   * pipeline measures it), so a snare from one source sits where another
   * did. Every slot of one piece carries the same trim — a ghost stays
   * quieter than a hit. Absent is 1.
   */
  trim?: number;
}

export interface KitSampleLayer {
  /** The velocity this layer was recorded at, 0–1. */
  v: number;
  /** Its round-robins: one file at least. */
  files: string[];
}

/**
 * Either shape as layers, softest first. A flat slot is one file per layer,
 * at the velocity it names or full when it names none — so a kit seeded
 * before Phase 9, and every kit of yours, reads exactly as it did.
 */
export function slotLayers(spec: KitSampleSlot): KitSampleLayer[] {
  if ('layers' in spec) return spec.layers;
  return spec.files.map((file, i) => ({ v: spec.v?.[i] ?? 1, files: [file] }));
}

/** A slot's level trim: 1 for the flat shape, which predates it. */
export function slotTrim(spec: KitSampleSlot | undefined): number {
  return spec && 'layers' in spec ? (spec.trim ?? 1) : 1;
}

/** Every file a slot names, in layer order. */
export function slotFiles(spec: KitSampleSlot): string[] {
  return slotLayers(spec).flatMap((layer) => layer.files);
}

/**
 * A kit's recordings: slots keyed by {@link Slot} id, plus the shared
 * percussion set where the kit ships one.
 *
 * Percussion is deliberately **not** per kit — a tambourine over the Studio
 * '70s set should be a tambourine — so exactly one system kit carries `perc`
 * and every kit reaches it. Empty for a kit that synthesises its voices.
 */
export interface KitSamples {
  sampleRate?: number;
  slots?: Record<string, KitSampleSlot>;
  perc?: Record<string, KitSampleSlot>;
  /** Lane → pan, −1 to 1, as the drummer hears it. A lane not named takes `DEFAULT_PAN`. */
  pan?: Partial<Record<string, number>>;
}

/**
 * A slot as a kit row stores it (Phase 9-v). Besides the recordings
 * themselves, a slot may name a piece from the `KitPiece` catalogue, or one
 * of your samples. The catalogue resolves both before playback sees the kit,
 * so a {@link ResolvedKit} only ever holds a {@link KitSampleSlot}.
 */
export type KitStoredSlot = KitSampleSlot | KitPieceSlot | KitYourSampleSlot;

/** A piece's recordings of one slot. */
export interface KitPieceSlot extends KitSlotSettings {
  piece: string;
  /** Which of the piece's slots to play, where it is not this one: a high tom as a floor tom. */
  from?: string;
}

/** One of your samples. */
export interface KitYourSampleSlot extends KitSlotSettings {
  sample: string;
}

/** A kit's `samples` column, before its pieces are resolved. */
export interface KitStoredSamples extends Omit<KitSamples, 'slots'> {
  slots?: Record<string, KitStoredSlot>;
}

export interface Kit {
  label: string;
  hint: string;
  engine?: KitEngine;
  /** Which drum machine's voice models, for `engine: 'drift'`. */
  machine?: string;
  /** Which sample pack, for `engine: 'pack'`. */
  pack?: string;
  /** Output trim measured against the synthesised kits, so kits are comparable. */
  trim?: number;
  /** Attribution, shown in the Kit panel. */
  credit?: string;
  master: { lp?: number; drive?: number; room?: number };
  k: VoiceParams;
  s: VoiceParams;
  h: VoiceParams;
  r: VoiceParams;
  c: VoiceParams;
  t: VoiceParams;
  p: VoiceParams;
}

/**
 * A kit as playback receives it: a {@link Kit} that knows which row it is.
 *
 * `key` is not on `Kit` because the seed data writes the table as a record and
 * the key is the record key. Everything downstream of the catalogue works in
 * `ResolvedKit`, so nothing has to keep a key and an object in step.
 */
export interface ResolvedKit extends Kit {
  key: string;
  /** Heading the picker files it under — the `group` column. */
  group: string;
  /** Slot → files. `{}` for a kit that synthesises its voices. */
  samples: KitSamples;
}

/* ---- the synthesiser's own numbers -----------------------------------
   Two fallbacks, and they are code rather than catalogue rows on purpose: a
   fallback that reads a row is not a fallback, because the row is the thing
   that can be edited, unpublished or deleted.

   They started life as the Studio '70s and Machine kits and are now
   independent of them. An admin retuning either kit does not move these, which
   is the point — what plays while a pack is still decoding should not change
   under you because somebody edited an unrelated kit.
   -------------------------------------------------------------------- */

/**
 * What the synthesised voices use when there is no kit at all: the catalogue
 * has not arrived yet, or a saved kit key no longer names a row.
 */
export const SYNTH_FALLBACK: Kit = {
  label: 'Default',
  hint: 'The synthesised voices, before any kit is chosen.',
  master: { lp: 15000, drive: 1.25, room: 0.16 },
  k: { tune: 50, decay: 0.36, tone: 0.3, room: 0.04 },
  s: { tune: 186, decay: 0.18, tone: 0.52, room: 0.2 },
  h: { tune: 0.96, decay: 0.048, open: 0.34, tone: 7600, room: 0.12 },
  r: { tune: 0.92, decay: 1.6, tone: 3100, room: 0.26 },
  c: { tune: 0.88, decay: 2.4, tone: 2500, room: 0.38 },
  t: { tune: 88, decay: 0.52, tone: 0.34, room: 0.2 },
  p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.16 },
};

/**
 * What the synthesised voices use while a **sample or drum-machine** kit is
 * loading.
 *
 * Those kits store 0..1 knobs, and the synth only understands Hz and seconds —
 * handing it 0.5 would read as 0.5 Hz. So it stands in with a neutral, clicky
 * set rather than with the loading kit's numbers.
 */
export const SAMPLE_STAND_IN: Record<string, VoiceParams> = {
  k: { tune: 42, decay: 0.52, tone: 0.62, room: 0 },
  s: { tune: 220, decay: 0.13, tone: 0.8, room: 0.04 },
  h: { tune: 1.22, decay: 0.034, open: 0.3, tone: 9800, room: 0.02 },
  r: { tune: 1.18, decay: 1.1, tone: 4400, room: 0.04 },
  c: { tune: 1.1, decay: 1.8, tone: 3400, room: 0.06 },
  t: { tune: 100, decay: 0.4, tone: 0.6, room: 0.02 },
  p: { tune: 1.1, level: 0.9, tone: 1.2, room: 0.03 },
};

/**
 * Which playback path a kit takes. `synth` is the default because a row with
 * no engine named is a set of synthesised voices — that is what the column
 * meant before it existed.
 */
export function kitEngine(kit: Kit | undefined | null): KitEngine {
  return kit?.engine ?? 'synth';
}

/**
 * The engines that actually have an implementation behind them.
 *
 * `drift` — the TR-808 / TR-909 voice models — is declared by two kits in the
 * table but not yet ported. Without this it would not fail: it would fall
 * through to the synthesised voices with the Machine kit's parameters, so
 * picking "TR-909" would quietly give you something else and sound like a poor
 * 909 rather than a missing one. The kit picker reads this and says so instead.
 */
const IMPLEMENTED_ENGINES: ReadonlySet<KitEngine> = new Set<KitEngine>(['synth', 'pack', 'user']);

/**
 * Whether this kit can actually be played.
 *
 * A kit that is not there is not playable, and that has to be said explicitly:
 * `kitEngine(undefined)` is `'synth'` — the right answer for a ROW that names
 * no engine, and the wrong one for no row at all — so without the first clause
 * this returns `true` for a key the catalogue has never heard of. The caller
 * that found out was the style-change path in `use-break-console`, which reads
 * a kit key out of localStorage: once an admin deleted a kit, picking any style
 * wrote that dead key into state, the picker showed nothing selected, and
 * playback fell through to the synthesised fallback.
 */
export function kitIsPlayable(kit: Kit | undefined | null): boolean {
  if (!kit) return false;
  return IMPLEMENTED_ENGINES.has(kitEngine(kit));
}

/**
 * What the picker calls each engine.
 *
 * `pack` and `user` share a heading on purpose: both are recordings, and the
 * only difference to someone choosing is whose recordings they are.
 */
export const KIT_GROUP_LABELS: Record<KitEngine, string> = {
  synth: 'Synthesised',
  drift: 'Drum machines',
  pack: 'Sampled Recordings',
  user: 'Sampled Recordings',
};

/**
 * The kits as the picker shows them: runs of consecutive kits that share a
 * heading, in catalogue order.
 *
 * Grouping by run rather than by heading keeps the catalogue's `position` the
 * single place the order is decided. A kit dropped between two runs of the same
 * heading splits it into two, which is the visible symptom of a catalogue that
 * wants reordering — and now that an admin can reorder one, that symptom is
 * information rather than a bug.
 */
export function kitGroups(kits: readonly ResolvedKit[]): { label: string; keys: string[] }[] {
  const groups: { label: string; keys: string[] }[] = [];
  for (const kit of kits) {
    const label = kit.group || KIT_GROUP_LABELS[kitEngine(kit)];
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.keys.push(kit.key);
    else groups.push({ label, keys: [kit.key] });
  }
  return groups;
}

/**
 * Which driftbox voice plays each lane and variant.
 *
 * The 808 has no ride and no crash — borrowing the 909's is the honest fix;
 * pretending a cowbell is a ride is not.
 */
export const DRIFT_MAP: Record<string, Record<string, string>> = {
  '909': {
    k: '909.bd',
    s: '909.sd',
    sGhost: '909.sd',
    h: '909.ch',
    hOpen: '909.oh',
    r: '909.rd',
    rBell: '909.rd',
    c: '909.cr',
  },
  '808': {
    k: '808.bd',
    s: '808.sd',
    sGhost: '808.sd',
    h: '808.ch',
    hOpen: '808.oh',
    r: '909.rd',
    rBell: '909.rd',
    c: '909.cr',
  },
};

/** A playable sound, and which lane's knobs drive it. */
export interface Slot {
  id: string;
  /** The voice whose knobs this slot reads. */
  voice: string;
  label: string;
  /** A kit may legitimately not have this sound. */
  opt?: boolean;
  /** What to play instead when it does not. */
  fall?: string;
  /**
   * Decoded with the second, idle pass rather than before the kit can play.
   * An articulation is rarer than the hit it decorates, and until it lands
   * its synthesised voice plays it.
   */
  late?: boolean;
}

export const SLOTS: Slot[] = [
  { id: 'k', voice: 'k', label: 'Kick' },
  { id: 's', voice: 's', label: 'Snare' },
  { id: 'sGhost', voice: 's', label: 'Ghost snare', opt: true, fall: 's' },
  { id: 'sCross', voice: 's', label: 'Cross-stick', opt: true, fall: 's' },
  /* 9-iv's slots have no `fall` on purpose: a kit without a recording of one
     plays its synthesised voice, which is at least the right sound. Falling
     back on the snare or the crash would play a rimshot as a hit and a china
     as the crash — the articulation gone, with nothing to say so. They load
     late, so a kit's first play costs what it did before them. */
  { id: 'sRim', voice: 's', label: 'Rimshot', opt: true, late: true },
  { id: 'h', voice: 'h', label: 'Closed hat' },
  { id: 'hOpen', voice: 'h', label: 'Open hat', fall: 'h' },
  { id: 'hHalf', voice: 'h', label: 'Half-open hat', opt: true, late: true },
  { id: 'r', voice: 'r', label: 'Ride' },
  { id: 'rBell', voice: 'r', label: 'Ride bell', opt: true, fall: 'r' },
  { id: 'c', voice: 'c', label: 'Crash' },
  { id: 'c2', voice: 'c', label: 'Crash 2', opt: true, late: true },
  { id: 'cChina', voice: 'c', label: 'China', opt: true, late: true },
  { id: 'cSplash', voice: 'c', label: 'Splash', opt: true, late: true },
  { id: 'hFoot', voice: 'h', label: 'Hi-hat foot', opt: true, fall: 'h' },
  { id: 't1', voice: 't', label: 'High tom', opt: true },
  { id: 't2', voice: 't', label: 'Mid tom', opt: true },
  { id: 't3', voice: 't', label: 'Floor tom', opt: true },
  { id: 'p1', voice: 'p', label: 'Perc 1', opt: true },
  { id: 'p2', voice: 'p', label: 'Perc 2', opt: true },
];

export const SLOT_BY_ID: Record<string, Slot> = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

/** Which variant of a lane's recording a slot wants. */
export const VARIANT_OF: Record<string, string> = {
  sGhost: 'ghost',
  hOpen: 'open',
  rBell: 'bell',
};

export const VOICE_KEYS = ['k', 's', 'h', 'r', 'c', 't', 'p'];

export const VOICE_LABEL: Record<string, string> = {
  k: 'Kick',
  s: 'Snare',
  h: 'Hi-hat',
  r: 'Ride',
  c: 'Crash',
  t: 'Toms',
  p: 'Perc',
};

/**
 * The two voices whose knobs are always the synthesiser's, Hz and seconds,
 * whichever engine the rest of the kit runs. Not because every kit
 * synthesises them: the jazz and brush kits ship tom recordings, and the
 * percussion set is recorded. But a kit missing a tom, and every timbale,
 * still falls through to the synthesised voice, so the knobs that tune it
 * stay. On a kit whose toms are recordings, only Room acts on them.
 */
export const SYNTH_ONLY: Record<string, boolean> = { t: true, p: true };

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: 'hz' | 's' | 'x' | 'pc';
}

export const PARAM_DEFS: Record<string, ParamDef[]> = {
  k: [
    { key: 'tune', label: 'Tune', min: 34, max: 86, step: 1, fmt: 'hz' },
    { key: 'decay', label: 'Decay', min: 0.08, max: 0.8, step: 0.01, fmt: 's' },
    { key: 'tone', label: 'Beater', min: 0, max: 1, step: 0.01, fmt: 'pc' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  s: [
    { key: 'tune', label: 'Tune', min: 130, max: 330, step: 1, fmt: 'hz' },
    { key: 'decay', label: 'Decay', min: 0.06, max: 0.5, step: 0.01, fmt: 's' },
    { key: 'tone', label: 'Snares', min: 0, max: 1, step: 0.01, fmt: 'pc' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  h: [
    { key: 'tune', label: 'Size', min: 0.55, max: 1.9, step: 0.01, fmt: 'x' },
    { key: 'decay', label: 'Closed', min: 0.02, max: 0.14, step: 0.005, fmt: 's' },
    { key: 'open', label: 'Open', min: 0.1, max: 0.9, step: 0.01, fmt: 's' },
    { key: 'tone', label: 'Bright', min: 3000, max: 12000, step: 100, fmt: 'hz' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  r: [
    { key: 'tune', label: 'Size', min: 0.6, max: 1.8, step: 0.01, fmt: 'x' },
    { key: 'decay', label: 'Ring', min: 0.3, max: 3.5, step: 0.05, fmt: 's' },
    { key: 'tone', label: 'Bright', min: 1200, max: 6500, step: 50, fmt: 'hz' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  c: [
    { key: 'tune', label: 'Size', min: 0.6, max: 1.8, step: 0.01, fmt: 'x' },
    { key: 'decay', label: 'Ring', min: 0.8, max: 4.5, step: 0.05, fmt: 's' },
    { key: 'tone', label: 'Bright', min: 900, max: 5000, step: 50, fmt: 'hz' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  t: [
    { key: 'tune', label: 'Floor', min: 58, max: 150, step: 1, fmt: 'hz' },
    { key: 'decay', label: 'Decay', min: 0.15, max: 1.2, step: 0.01, fmt: 's' },
    { key: 'tone', label: 'Stick', min: 0, max: 1, step: 0.01, fmt: 'pc' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
  p: [
    { key: 'tune', label: 'Pitch', min: 0.6, max: 1.6, step: 0.01, fmt: 'x' },
    { key: 'level', label: 'Level', min: 0, max: 1.5, step: 0.01, fmt: 'pc' },
    { key: 'tone', label: 'Bright', min: 0.5, max: 1.8, step: 0.01, fmt: 'x' },
    { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  ],
};

/** The machine's own 0..1 knobs, because that is what the circuit models take. */
export const DRIFT_PARAM_DEFS: ParamDef[] = [
  { key: 'tune', label: 'Tune', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'decay', label: 'Decay', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'tone', label: 'Tone', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'colour', label: 'Colour', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'level', label: 'Level', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
];

/** A recording has a speed and a level; it has no filter cutoff to offer. */
export const USER_PARAM_DEFS: ParamDef[] = [
  { key: 'rate', label: 'Speed', min: 0.5, max: 2.0, step: 0.01, fmt: 'x' },
  { key: 'level', label: 'Level', min: 0, max: 1.5, step: 0.01, fmt: 'pc' },
  { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
];

/**
 * The master chain's knobs, after all four engines. These are the Kit
 * drawer's ranges, and so the ranges a saved override can hold — tighter than
 * `kitParamsSchema`'s, which bounds what a kit row may ship with.
 */
export const MASTER_PARAM_DEFS: ParamDef[] = [
  { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01, fmt: 'pc' },
  { key: 'drive', label: 'Drive', min: 1, max: 2.6, step: 0.01, fmt: 'x' },
  { key: 'lp', label: 'Top end', min: 2500, max: 18000, step: 100, fmt: 'hz' },
];

/** Which knobs a voice shows, given the kit currently loaded. */
export function paramDefs(voice: string, kit: Kit | undefined | null): ParamDef[] {
  if (SYNTH_ONLY[voice]) return PARAM_DEFS[voice];
  const e = kitEngine(kit);
  if (e === 'drift') return DRIFT_PARAM_DEFS;
  if (e === 'user' || e === 'pack') return USER_PARAM_DEFS;
  return PARAM_DEFS[voice];
}

export function fmtParam(def: ParamDef, v: number): string {
  if (def.fmt === 'hz') return `${Math.round(v)} Hz`;
  if (def.fmt === 's') return `${v < 0.1 ? v.toFixed(3) : v.toFixed(2)}s`;
  if (def.fmt === 'x') return `${v.toFixed(2)}×`;
  return `${Math.round(v * 100)}%`;
}

/**
 * A kit's numbers with your tuning laid over the top.
 *
 * Tuning is stored **per kit**, keyed by kit name, rather than as one global
 * override: a 909's knobs are 0–1 and a synthesised kick's are hertz and
 * seconds, so one saved set carried onto the other kit is not a preference,
 * it is a 50 Hz kick read as a half-open filter. Only keys the kit already has
 * are taken, so a stale saved key from an older kit table is ignored rather
 * than inventing a parameter the voice does not read.
 */
export function withTuning(
  kit: Kit | undefined | null,
  tuning: Record<string, VoiceParams> | undefined
): Record<string, VoiceParams> {
  const out = kitDefaults(kit);
  if (!tuning) return out;
  for (const voice of Object.keys(out)) {
    const saved = tuning[voice];
    if (!saved) continue;
    for (const key of Object.keys(out[voice])) {
      if (typeof saved[key] === 'number') out[voice][key] = saved[key];
    }
  }
  return out;
}

/**
 * A kit's shipped values — the thing a user's tuning is an override of.
 *
 * With no kit (the catalogue has not arrived, or the saved kit is gone) this
 * falls back to {@link SYNTH_FALLBACK}, which is the synthesiser's own safe
 * numbers rather than any catalogue kit: a kit row can be edited or deleted and
 * the fallback must not move when it is.
 */
export function kitDefaults(kit: Kit | undefined | null): Record<string, VoiceParams> {
  const src = kit ?? SYNTH_FALLBACK;
  const out: Record<string, VoiceParams> = {};
  for (const v of VOICE_KEYS) out[v] = { ...src[v as 'k'] };
  out.master = { ...src.master };
  return out;
}
