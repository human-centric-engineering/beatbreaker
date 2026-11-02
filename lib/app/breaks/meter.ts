import type { Group, Meter } from '@/lib/app/breaks/types';

/**
 * Meters, in terms the grid understands.
 *
 * One grid step is a sixteenth note in every meter but one: `4/4-6`, 4/4
 * written in sixteenth-note triplets (sextuplets), six steps to the beat,
 * which is where a Bonham triplet lives. Whatever turns steps into time asks
 * {@link stepsPerQuarter} rather than assuming four. What a meter decides is
 * how many steps a bar holds and how they group: `group` is the pulse grouping
 * in *notated beats*, which is why 6/8 is `[3, 3]` — two dotted-quarter
 * pulses — rather than six separate beats.
 */
export const METERS: Record<string, Meter> = {
  '4/4': {
    label: '4/4',
    num: 4,
    den: 4,
    sub: 4,
    group: [1, 1, 1, 1],
    hint: 'Four quarters. Everything in the style table is written here.',
  },
  '2/4': {
    label: '2/4',
    num: 2,
    den: 4,
    sub: 4,
    group: [1, 1],
    hint: 'Half a bar of 4/4 — marches, and the real length of a samba bar.',
  },
  '3/4': {
    label: '3/4',
    num: 3,
    den: 4,
    sub: 4,
    group: [1, 1, 1],
    hint: 'Waltz time. There is no beat 4, so a 2-and-4 backbeat becomes a backbeat on 2 alone.',
  },
  '5/4': {
    label: '5/4',
    num: 5,
    den: 4,
    sub: 4,
    group: [1, 1, 1, 1, 1],
    hint: 'Five quarters, counted straight through. Beat 5 is free space the style has no plan for — use it.',
  },
  '6/4': {
    label: '6/4',
    num: 6,
    den: 4,
    sub: 4,
    group: [1, 1, 1, 1, 1, 1],
    hint: 'Six quarters — two bars of 3/4 that refuse to end, or a very slow 6/8.',
  },
  '7/4': {
    label: '7/4',
    num: 7,
    den: 4,
    sub: 4,
    group: [1, 1, 1, 1, 1, 1, 1],
    hint: 'Seven quarters, counted straight through. Money is the one everybody knows: kick on the odd beats, snare on the even ones, and the bar ends a beat early.',
  },
  '7/8': {
    label: '7/8',
    num: 7,
    den: 8,
    sub: 2,
    group: [2, 2, 3],
    hint: 'Long-short: two, two, three. The last pulse is a beat and a half, which is where the limp comes from.',
  },
  '5/8': {
    label: '5/8',
    num: 5,
    den: 8,
    sub: 2,
    group: [3, 2],
    hint: 'Three then two. Short bars, so most styles lose everything past their first pulse.',
  },
  '6/8': {
    label: '6/8',
    num: 6,
    den: 8,
    sub: 2,
    group: [3, 3],
    hint: 'Compound two: two pulses of three eighths. A 2-and-4 backbeat lands on the second pulse — one backbeat per bar.',
  },
  '9/8': {
    label: '9/8',
    num: 9,
    den: 8,
    sub: 2,
    group: [3, 3, 3],
    hint: 'Compound three. Three dotted-quarter pulses, counted 1-2-3 4-5-6 7-8-9.',
  },
  '11/8': {
    label: '11/8',
    num: 11,
    den: 8,
    sub: 2,
    group: [3, 3, 3, 2],
    hint: 'Three pulses of three and one of two, counted 1-2-3 1-2-3 1-2-3 1-2. Here Comes the Sun goes there in its bridge.',
  },
  '12/8': {
    label: '12/8',
    num: 12,
    den: 8,
    sub: 2,
    group: [3, 3, 3, 3],
    hint: 'Compound four — the blues and gospel meter. The triplets are written in, so leave Swing at zero.',
  },
  '4/4-6': {
    label: '4/4 sextuplets',
    num: 4,
    den: 4,
    sub: 6,
    group: [1, 1, 1, 1],
    hint: 'Four quarters, each split in six: sixteenth-note triplets. Eighths and eighth-note triplets fit; straight sixteenths do not. The Bonham triplet lives here. Leave Swing at zero.',
  },
  '4/4-8': {
    label: '4/4 in eighths',
    num: 4,
    den: 4,
    sub: 2,
    group: [1, 1, 1, 1],
    hint: 'Four quarters, each split in two: eighth notes and nothing shorter, which is how fast swing is written. The tempo goes to 380. Swing works on the eighths.',
  },
  '15/8': {
    label: '15/8',
    num: 15,
    den: 8,
    sub: 2,
    group: [3, 3, 3, 3, 3],
    hint: 'Five pulses of three — 5/4 with the swing written out, which is what Take Five is doing. Leave Swing at zero.',
  },
};

/** The meters offered by name: the Studio's picker, the filters, the generator's tests. */
export const METER_KEYS = Object.keys(METERS);
export const DEFAULT_METER = '4/4';
/** Steps in a bar of 4/4 — the length every style is written at. */
export const STEPS = 16;

/**
 * The longest bar any meter may make, in grid steps (D85). Not a meter's
 * length: a row is as long as its own bar's meter makes it. This bounds what
 * a pasted code or a request can carry; 15/8 in 32nds is 60 steps, and the
 * longest bar the records need now (7/4 in 32nds) is 56.
 */
export const MAX_STEPS = 128;
/** The most beats a bar may have: 31/32 is the longest numerator a record needs. */
const MAX_NUM = 64;

/**
 * A meter key (D83): `n/d`, with d of 2, 4, 8, 16 or 32, and a grid after a
 * dash when the bar is not in the default one — `-8` eighths, `-32` 32nds,
 * `-6` sextuplets (six to the quarter, quarter-note beats only).
 * The default grid is sixteenths, or 32nds in a meter of 32nds. Every key in
 * {@link METERS} is one of these and reads as it always has; a key is held to
 * eight characters, the width of the column it is stored in.
 */
const METER_KEY = /^([1-9]\d?)\/(2|4|8|16|32)(?:-(6|8|16|32))?$/;

/** Grid steps to a notated beat: the bar's grid divided into its beat. */
function subOf(den: number, grid: string | undefined): number {
  if (grid === '6') return den === 4 ? 6 : 0;
  const value = grid ? Number(grid) : Math.max(16, den);
  return value % den === 0 ? value / den : 0;
}

/**
 * Pulse grouping from the numerator: in quarters and halves each beat is a
 * pulse; in eighths and shorter, threes, with the two or two twos the
 * numerator leaves at the end — 10/8 as 3+3+2+2, 13/8 as 3+3+3+2+2.
 */
function groupOf(num: number, den: number): number[] {
  if (den <= 4) return new Array<number>(num).fill(1);
  if (num <= 3) return [num];
  const twos = num % 3 === 0 ? 0 : num % 3 === 2 ? 1 : 2;
  return [...new Array<number>((num - 2 * twos) / 3).fill(3), ...new Array<number>(twos).fill(2)];
}

const NOTE_NAMES: Record<number, string> = {
  2: 'half note',
  4: 'quarter',
  8: 'eighth',
  16: 'sixteenth',
  32: '32nd',
};

const GRID_LABELS: Record<string, string> = {
  '6': 'sextuplets',
  '8': 'in eighths',
  '16': 'in sixteenths',
  '32': 'in 32nds',
};

const parsed = new Map<string, Meter | null>();

/**
 * The meter a key names, or `null` if it names none. A key in {@link METERS}
 * is that meter; any other is built from its numerator, denominator and grid,
 * once, so the same key is always the same object.
 */
export function parseMeter(key: string): Meter | null {
  if (Object.hasOwn(METERS, key)) return METERS[key];
  const hit = parsed.get(key);
  if (hit !== undefined) return hit;
  const m = buildMeter(key);
  // only real meters are kept, and there are few enough of them to keep them all
  if (m) parsed.set(key, m);
  return m;
}

function buildMeter(key: string): Meter | null {
  const match = METER_KEY.exec(key);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  const grid = match[3];
  if (num > MAX_NUM) return null;
  const sub = subOf(den, grid);
  if (!sub || num * sub > MAX_STEPS) return null;
  // one spelling to a meter: a grid is named only when it is not the default
  if (grid && sub === subOf(den, undefined)) return null;
  const base = `${num}/${den}`;
  // the same time signature on another grid keeps its pulses: 7/8 in 32nds is still 2+2+3
  const group = Object.hasOwn(METERS, base) ? METERS[base].group : groupOf(num, den);
  const grouped =
    group.length > 1 && group.some((g) => g !== 1) ? `, grouped ${group.join('+')}` : '';
  return {
    label: grid ? `${base} ${GRID_LABELS[grid]}` : base,
    num,
    den,
    sub,
    group,
    hint: `${num} ${NOTE_NAMES[den]}${num === 1 ? '' : 's'} to the bar${grouped}.`,
  };
}

/** How a meter key is written, for a tool's description of its `meter` field. */
export const METER_KEY_HELP =
  'A time signature n/d, d being 2, 4, 8, 16 or 32 (4/4, 13/8, 17/16, 31/32). A bar not in sixteenths names its grid after a dash: 4/4-8 in eighths, 7/4-32 in 32nds, 4/4-6 in sextuplets.';

/** Whether a key names a meter ({@link parseMeter}). */
export function isMeterKey(key: unknown): key is string {
  return typeof key === 'string' && parseMeter(key) !== null;
}

/**
 * The key for a meter's numerator, denominator and grid, in its one spelling:
 * the grid is dropped when it is the default. `null` if they make no meter.
 */
export function meterKey(num: number, den: number, grid?: '6' | '8' | '16' | '32'): string | null {
  const plain = `${num}/${den}`;
  const key = grid && subOf(den, grid) !== subOf(den, undefined) ? `${plain}-${grid}` : plain;
  return isMeterKey(key) ? key : null;
}

export function meterOf(key: string | undefined): Meter {
  return (key && parseMeter(key)) || METERS[DEFAULT_METER];
}

/** The meter every style in the table is written in. */
export const M44 = METERS[DEFAULT_METER];

export function stepsOf(m: Meter): number {
  return m.num * m.sub;
}

/**
 * Grid steps to a quarter note: 4 in every meter whose step is a sixteenth
 * (simple time at 4 a beat, compound at 2 an eighth), 6 in sextuplet 4/4. The
 * tempo always counts quarters, so a step lasts `60 / bpm / stepsPerQuarter`.
 */
export function stepsPerQuarter(m: Meter): number {
  return (m.sub * m.den) / 4;
}

/** Seconds a grid step lasts at `bpm` quarters a minute. */
export function stepSeconds(m: Meter, bpm: number): number {
  return 60 / bpm / stepsPerQuarter(m);
}

/** Whether a meter's steps are sixteenth-note triplets: six to the quarter. */
export function isSextuplet(m: Meter): boolean {
  return stepsPerQuarter(m) === 6;
}

/**
 * Whether a meter's pulse is eighths on a grid of sixteenths, two steps to an
 * eighth, so a triplet groove's places are every other step: 6/8, 12/8, 13/8.
 */
export function isCompound(m: Meter): boolean {
  return m.sub === 2 && stepsPerQuarter(m) === 4;
}

/** Whether a meter's steps are eighth notes: two to the quarter. */
export function isEighths(m: Meter): boolean {
  return stepsPerQuarter(m) === 2;
}

/**
 * Derived data is memoised in a `WeakMap` rather than stashed on the meter
 * object, so `METERS` stays plain data that can be frozen, serialised or
 * compared without carrying caches around with it.
 */
const groupCache = new WeakMap<Meter, Group[]>();
const countCache = new WeakMap<Meter, string[]>();

/** The pulse groups of a bar, as `{ start, size }` in grid steps. */
export function groupsOf(m: Meter): Group[] {
  const hit = groupCache.get(m);
  if (hit) return hit;
  const out: Group[] = [];
  let at = 0;
  for (const g of m.group) {
    const size = g * m.sub;
    out.push({ start: at, size });
    at += size;
  }
  groupCache.set(m, out);
  return out;
}

/** Which pulse group a step falls in. */
export function groupAt(m: Meter, step: number): number {
  const g = groupsOf(m);
  for (let i = g.length - 1; i >= 0; i--) if (step >= g[i].start) return i;
  return 0;
}

export function isGroupStart(m: Meter, step: number): boolean {
  return groupsOf(m).some((g) => g.start === step);
}

/**
 * The pulse a player actually feels, where there is a single one to quote.
 *
 * The clock counts sixteenths, so the tempo readout counts quarter notes — but
 * the beat you feel in 6/8, 9/8 or 12/8 is a dotted quarter, which is two
 * thirds of that. Meters whose pulses are not all the same length (7/8, 5/8)
 * have no single figure to quote, so they get none.
 */
export function pulseInfo(m: Meter): { steps: number; label: string } | null {
  const g = m.group;
  for (let i = 1; i < g.length; i++) if (g[i] !== g[0]) return null;
  const steps = g[0] * m.sub;
  // the pulse already is the quarter, however many steps it is split into
  if (steps === stepsPerQuarter(m)) return null;
  return { steps, label: PULSE_NAMES[steps / stepsPerQuarter(m)] ?? `${steps}-step pulse` };
}

/** A pulse's name by its length in quarters. */
const PULSE_NAMES: Record<number, string> = {
  0.25: 'sixteenth',
  0.375: 'dotted sixteenth',
  0.5: 'eighth',
  0.75: 'dotted eighth',
  1.5: 'dotted quarter',
  2: 'half note',
  3: 'dotted half',
};

/** `1 e + a 2 e + a …` — what each step is called when you count the bar out loud. */
export function countLabelsOf(m: Meter): string[] {
  const hit = countCache.get(m);
  if (hit) return hit;
  const out: string[] = [];
  for (let b = 0; b < m.num; b++) {
    const n = String(b + 1);
    const spq = stepsPerQuarter(m);
    if (m.sub === 4 && spq === 4) out.push(n, 'e', '+', 'a');
    else if (m.sub === 6) out.push(n, 'la', 'li', '+', 'la', 'li');
    else if (m.sub === 2 && spq !== 8) out.push(n, '+');
    else out.push(n, ...partsOfBeat(m));
  }
  countCache.set(m, out);
  return out;
}

/**
 * The names of the steps inside one beat after its first, by where each falls
 * in sixteenths: `e + a` in a quarter, `+` in an eighth or at the middle of a
 * half note; a step between sixteenths (a 32nd) has none.
 */
function partsOfBeat(m: Meter): string[] {
  const perSixteenth = stepsPerQuarter(m) / 4;
  const sixteenths = 16 / m.den;
  const out: string[] = [];
  for (let j = 1; j < m.sub; j++) {
    const at = j / perSixteenth;
    if (!Number.isInteger(at)) out.push('');
    else if (sixteenths === 4) out.push(['', 'e', '+', 'a'][at] ?? '');
    else if (sixteenths === 2 || sixteenths === 8) out.push(at === sixteenths / 2 ? '+' : '');
    else out.push('');
  }
  return out;
}

/** Whether a meter is one of the named ones, whose carrying rules are fixed. */
function isNamed(m: Meter): boolean {
  return Object.values(METERS).includes(m);
}

/**
 * Carry a step position from one meter into another.
 *
 * A style writes its positions in its own meter. Carrying them across by raw
 * step index turns a backbeat into whatever happens to sit at step 12; carrying
 * them by **(pulse, offset)** keeps "the top of the second pulse" meaning that
 * everywhere, and drops the positions the new bar has no room for. A five-stroke
 * clave in 3/4 loses its fifth stroke, because there is nowhere for it to go.
 *
 * @returns the step in `to`, or `-1` if the new bar has no room for it.
 */
export function remapStep(step: number, from: Meter, to: Meter): number {
  if (from === to) return step;
  const fg = groupsOf(from);
  const tg = groupsOf(to);
  const gi = groupAt(from, step);
  if (gi >= tg.length) return -1;
  let off = step - fg[gi].start;
  /* Into sextuplets from sixteenths, and back: the beat and its "and" keep
     their places, and an "e" or an "a" goes to the triplet partial nearest it
     (the way a swung sixteenth does). From sextuplets, each step goes to the
     sixteenth nearest it. */
  const fq = stepsPerQuarter(from);
  const tq = stepsPerQuarter(to);
  if (to.sub === 6 && from.sub === 4 && fq === 4) off = [0, 2, 3, 4][off] ?? -1;
  else if (to.sub === 4 && tq === 4 && from.sub === 6) off = [0, 1, 1, 2, 3, 3][off] ?? -1;
  /* Into eighths, the beat and its "and" keep their places and the "e" and
     the "a" have nowhere to go; out of them, each eighth is two sixteenths. */
  else if (isEighths(to) && from.sub === 4 && fq === 4) off = [0, -1, 1, -1][off] ?? -1;
  else if (isEighths(to) && from.sub === 6) off = [0, -1, -1, 1, -1, -1][off] ?? -1;
  else if (isEighths(from) && to.sub === 4 && tq === 4) off *= 2;
  else if (isEighths(from) && to.sub === 6) off *= 3;
  /* Any other change of grid (D85) — into 32nds or out of them, or to or from
     a meter without a name — each step to the one nearest it in time. */
  else if (tq !== fq && (tq === 8 || fq === 8 || !isNamed(to) || !isNamed(from)))
    off = Math.round((off * tq) / fq);
  /* A compound pulse is three eighths, not four sixteenths — the odd steps
     between them are not places a triplet groove has. Anything landing there is
     pulled to the nearest partial rather than left off the grid. */
  if (to.sub === 2 && tq === 4 && !isEighths(from))
    off = Math.min(tg[gi].size - 2, Math.round(off / 2) * 2);
  if (off >= tg[gi].size || off < 0) return -1;
  return tg[gi].start + off;
}

/** {@link remapStep} over a list, dropping what does not fit and de-duplicating. */
export function remapList(list: number[], from: Meter, to: Meter): number[] {
  if (from === to) return list.slice();
  const out: number[] = [];
  for (const x of list) {
    const n = remapStep(x, from, to);
    if (n >= 0 && !out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

/** {@link remapStep} over a step-keyed weight table. */
export function remapWeights(
  obj: Record<number, number> | undefined,
  from: Meter,
  to: Meter
): Record<number, number> | undefined {
  if (!obj || from === to) return obj;
  const out: Record<number, number> = {};
  for (const k of Object.keys(obj)) {
    const n = remapStep(Number(k), from, to);
    if (n >= 0) out[n] = obj[Number(k)];
  }
  return out;
}
