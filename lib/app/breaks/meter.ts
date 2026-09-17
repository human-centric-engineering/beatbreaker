import type { Group, Meter } from '@/lib/app/breaks/types';

/**
 * Meters, in terms the grid understands.
 *
 * One grid step is always a sixteenth note, whatever the meter, so the
 * transport, the swing and the MIDI export never have to care which one is
 * running. What a meter decides is how many steps a bar holds and how they
 * group: `group` is the pulse grouping in *notated beats*, which is why 6/8 is
 * `[3, 3]` — two dotted-quarter pulses — rather than six separate beats.
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
  '12/8': {
    label: '12/8',
    num: 12,
    den: 8,
    sub: 2,
    group: [3, 3, 3, 3],
    hint: 'Compound four — the blues and gospel meter. The triplets are written in, so leave Swing at zero.',
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

export const METER_KEYS = Object.keys(METERS);
export const DEFAULT_METER = '4/4';
/** Steps in a bar of 4/4 — the length every style is written at. */
export const STEPS = 16;

export function meterOf(key: string | undefined): Meter {
  return METERS[key ?? ''] ?? METERS[DEFAULT_METER];
}

/** The meter every style in the table is written in. */
export const M44 = METERS[DEFAULT_METER];

export function stepsOf(m: Meter): number {
  return m.num * m.sub;
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
  if (steps === 4) return null; // the pulse already is the quarter
  return {
    steps,
    label: steps === 6 ? 'dotted quarter' : steps === 2 ? 'eighth' : `${steps}-sixteenth pulse`,
  };
}

/** `1 e + a 2 e + a …` — what each step is called when you count the bar out loud. */
export function countLabelsOf(m: Meter): string[] {
  const hit = countCache.get(m);
  if (hit) return hit;
  const out: string[] = [];
  for (let b = 0; b < m.num; b++) {
    const n = String(b + 1);
    if (m.sub === 4) out.push(n, 'e', '+', 'a');
    else if (m.sub === 2) out.push(n, '+');
    else out.push(n);
  }
  countCache.set(m, out);
  return out;
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
  /* A compound pulse is three eighths, not four sixteenths — the odd steps
     between them are not places a triplet groove has. Anything landing there is
     pulled to the nearest partial rather than left off the grid. */
  if (to.sub === 2) off = Math.min(tg[gi].size - 2, Math.round(off / 2) * 2);
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
