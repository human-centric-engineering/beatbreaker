/**
 * 9-iv's articulations — rimshot, flam, drag and buzz on the snare, the
 * half-open hat, crash 2, china and splash, the tom flam — through everything
 * that carries a note: the wire format, the layers, the performance, a MIDI
 * file and back, the text notation, the critic, `tidy` and the generator.
 *
 * The goldens (`goldens.test.ts`) are the other half: they hold everything
 * written before 9-iv to the bytes it produced then.
 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { GRACE_CHECK, playability } from '@/lib/app/breaks/critic';
import { articulate, generatePattern } from '@/lib/app/breaks/generate';
import { Humaniser } from '@/lib/app/breaks/humanise';
import { LANES, LANE_VALUES, TOM_LANES, plainValue } from '@/lib/app/breaks/lanes';
import { reduceBar } from '@/lib/app/breaks/layers';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { notationKey } from '@/lib/app/breaks/notation-key';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { GRACE_LEVEL, HALF_OPEN_MAX, OPEN_HAT_MIN, performStep } from '@/lib/app/breaks/perform';
import { V4_LANE_MAX, sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import {
  type BreakDoc,
  breakDocFromPayload,
  breakPayload,
  decodeBreak,
  encodeBreak,
} from '@/lib/app/breaks/share';
import { fromText, toText } from '@/lib/app/breaks/text';
import { tidy } from '@/lib/app/breaks/tidy';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/** Every value 9-iv added, by lane. */
const NEW: Array<{ lane: LaneKey; value: number; name: string }> = [
  { lane: 's', value: 5, name: 'rimshot' },
  { lane: 's', value: 6, name: 'flam' },
  { lane: 's', value: 7, name: 'drag' },
  { lane: 's', value: 8, name: 'buzz' },
  { lane: 'h', value: 4, name: 'half-open' },
  { lane: 'c', value: 2, name: 'crash 2' },
  { lane: 'c', value: 3, name: 'china' },
  { lane: 'c', value: 4, name: 'splash' },
  { lane: 't1', value: 3, name: 'high tom flam' },
  { lane: 't2', value: 3, name: 'mid tom flam' },
  { lane: 't3', value: 3, name: 'floor tom flam' },
];

function pattern(bars: Bar[], over: Partial<Pattern> = {}): Pattern {
  return {
    name: 'test',
    style: 'rock',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 7,
    voice: 'hat',
    lanes: [...LANES],
    perc: { p1: 'tamb', p2: 'shaker' },
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars,
    ...over,
  };
}

/** A bar with a kick on 1 and 3, and `lane` at `value` on step `at`. */
function barWith(lane: LaneKey, value: number, at = 4): Bar {
  const bar = emptyBar(16);
  bar.k[0] = 1;
  bar.k[8] = 1;
  bar[lane][at] = value;
  return bar;
}

/** Every value of every lane, one per step, over as many bars as it takes. */
function everyValue(): Bar[] {
  const bars: Bar[] = [];
  for (const lane of LANES) {
    const bar = emptyBar(16);
    LANE_VALUES[lane].forEach((_, i) => {
      bar[lane][i * 2] = i + 1;
    });
    bars.push(bar);
  }
  return bars;
}

function doc(A: Pattern, B: Pattern = A): BreakDoc {
  return { bpm: 100, swing: 0, level: 5, arrangement: ['A', 'B'], A, B };
}

describe('the values and wire v5 (9.11)', () => {
  it('names a value for every digit a lane holds, from 1 to 8 at most', () => {
    expect(LANE_VALUES.s).toHaveLength(8);
    expect(LANE_VALUES.h).toHaveLength(4);
    expect(LANE_VALUES.c).toHaveLength(4);
    for (const L of TOM_LANES) expect(LANE_VALUES[L]).toEqual(['hit', 'accent', 'flam']);
  });

  it('round-trips every value through a share code', () => {
    const bars = everyValue();
    const [A, B] = [pattern(bars.slice(0, 6)), pattern(bars.slice(6))];
    const back = decodeBreak(encodeBreak(doc(A, B)));
    expect(back.A.bars).toEqual(A.bars);
    expect(back.B.bars).toEqual(B.bars);
  });

  it('round-trips every value through the stored document, unrepaired', () => {
    const bars = everyValue();
    const payload = breakPayload(doc(pattern(bars.slice(0, 6)), pattern(bars.slice(6))));
    expect(payload.ver).toBe(5);
    const stored = storedPayloadSchema.parse(JSON.parse(JSON.stringify(payload)));
    expect(stored).toEqual(sharePayloadSchema.parse(payload));
    expect(breakDocFromPayload(stored).A.bars).toEqual(bars.slice(0, 6));
  });

  it('decodes a v4 code to the bars it always held, and re-encodes them unchanged under v5', () => {
    const A = generatePattern({
      style: testStyle('funk'),
      seed: 4,
      bars: 2,
      density: 50,
      ghosts: 60,
    });
    const v4 = { ...breakPayload(doc(A)), ver: 4 };
    const code = btoa(JSON.stringify(v4));
    const back = decodeBreak(code);
    expect(back.A.bars).toEqual(A.bars);
    const again = breakPayload(back);
    expect(again.ver).toBe(5);
    expect(again.A).toEqual(v4.A);
    expect(again.B).toEqual(v4.B);
  });

  it.each(NEW)('refuses a $name under a v4 header, and takes it under v5', ({ lane, value }) => {
    const payload = breakPayload(doc(pattern([barWith(lane, value)])));
    expect(sharePayloadSchema.safeParse(payload).success).toBe(true);
    const v4 = sharePayloadSchema.safeParse({ ...payload, ver: 4 });
    expect(v4.success).toBe(false);
    expect(v4.error?.issues[0].message).toContain('needs version 5');
  });

  /* What v4 shipped, frozen: a decoder of the version before this one. It is
     what a browser tab still running the old app does with a new code — and it
     has to refuse it, not play a flam as something else. */
  const V4_DECODER = z.object({
    ver: z.number().int().min(1).max(4),
    A: z.object({ b: z.array(z.string().regex(/^[0-4|]*$/)) }),
    B: z.object({ b: z.array(z.string().regex(/^[0-4|]*$/)) }),
  });

  it.each(NEW)('is refused by a v4 decoder when it carries a $name', ({ lane, value }) => {
    const code = encodeBreak(doc(pattern([barWith(lane, value)])));
    expect(V4_DECODER.safeParse(JSON.parse(atob(code))).success).toBe(false);
  });

  it('keeps V4_LANE_MAX at what v4 could say', () => {
    for (const lane of LANES) {
      const before = { s: 4, h: 3, c: 1, t1: 2, t2: 2, t3: 2 } as Partial<Record<LaneKey, number>>;
      expect(V4_LANE_MAX[lane]).toBe(before[lane] ?? LANE_VALUES[lane].length);
    }
  });
});

describe('the layers reduce each articulation to its plain value below L4 (9.11)', () => {
  /* On beat 1, where nothing else the layers do would move it. */
  const TABLE: Array<[LaneKey, number, number[]]> = [
    // lane, value, what layers 1–5 show
    ['s', 5, [3, 3, 3, 5, 5]],
    ['s', 6, [3, 2, 2, 6, 6]], // layer 1 plays a plain hit as the backbeat accent
    ['s', 7, [3, 2, 2, 7, 7]],
    ['s', 8, [3, 2, 2, 8, 8]],
    ['h', 4, [1, 1, 1, 4, 4]],
    ['c', 2, [1, 1, 1, 2, 2]],
    ['c', 3, [1, 1, 1, 3, 3]],
    ['c', 4, [1, 1, 1, 4, 4]],
    ['t2', 3, [0, 0, 0, 3, 3]], // toms arrive at L4 anyway
  ];

  it.each(TABLE)('%s %i reads %j at layers 1–5', (lane, value, want) => {
    const bar = barWith(lane, value, 0);
    expect([1, 2, 3, 4, 5].map((level) => reduceBar(bar, level)[lane][0])).toEqual(want);
  });

  it('keeps an articulation you pinned below L4', () => {
    const bar = barWith('s', 6, 0);
    expect(reduceBar(bar, 2, undefined, false, false, { s: [2] }).s[0]).toBe(6);
  });

  it('leaves every value from before 9-iv its own plain value', () => {
    for (const lane of LANES) {
      for (let v = 0; v <= V4_LANE_MAX[lane]; v++) {
        const plain = lane === 'c' && v ? 1 : v;
        expect(plainValue(lane, v), `${lane} ${v}`).toBe(plain);
      }
    }
  });
});

describe('playing them (9.12)', () => {
  const opts = { swing: 0, feel: 0, hats: 100, bpm: 120 };

  it('plays a flam as its note with one grace on the other hand, ahead and quieter', () => {
    const pat = pattern([barWith('s', 6)]);
    const voices = performStep(pat, pat.bars[0], 4, opts);
    const [note, grace] = voices;
    expect(voices).toHaveLength(2);
    expect(grace).toMatchObject({ lane: 's', note: 38, ornament: 'grace', ghost: true });
    // 25 ms at 120 bpm is a fifth of a sixteenth
    expect(note.offset - grace.offset).toBeCloseTo(0.2, 9);
    expect(grace.velocity).toBeCloseTo(note.velocity * GRACE_LEVEL, 9);
  });

  it('keeps a grace inside the step at 400 bpm, so a file reads it back on the right sixteenth', () => {
    const pat = pattern([barWith('s', 6)]);
    const [note, grace] = performStep(pat, pat.bars[0], 4, { ...opts, bpm: 400 });
    expect(note.offset - grace.offset).toBeCloseTo(0.3, 9);
  });

  it('plays a drag with two graces in order, and a buzz with three repeats inside the step', () => {
    const drag = pattern([barWith('s', 7)]);
    const [d, g1, g2] = performStep(drag, drag.bars[0], 4, opts);
    expect(g1.offset).toBeLessThan(g2.offset);
    expect(g2.offset).toBeLessThan(d.offset);

    const buzz = pattern([barWith('s', 8)]);
    const [b, ...repeats] = performStep(buzz, buzz.bars[0], 4, opts);
    expect(repeats.map((r) => r.offset - b.offset)).toEqual([0.25, 0.5, 0.75]);
    expect(repeats.every((r) => r.ornament === 'buzz' && r.velocity < b.velocity)).toBe(true);
  });

  it('sends a rimshot as 40, the cymbals as 57, 52 and 55, a tom flam on the tom’s own note', () => {
    const note = (lane: LaneKey, value: number) => {
      const pat = pattern([barWith(lane, value)]);
      return performStep(pat, pat.bars[0], 4, opts).map((v) => v.note);
    };
    expect(note('s', 5)).toEqual([40]);
    expect(note('c', 2)).toEqual([57]);
    expect(note('c', 3)).toEqual([52]);
    expect(note('c', 4)).toEqual([55]);
    expect(note('t3', 3)).toEqual([43, 43]);
  });

  it('sends a half-open hat on 46 under the open band, and an open one above it', () => {
    for (const hats of [0, 100, 150]) {
      const half = pattern([barWith('h', 4)]);
      const open = pattern([barWith('h', 3)]);
      const [h] = performStep(half, half.bars[0], 4, { ...opts, hats });
      const [o] = performStep(open, open.bars[0], 4, { ...opts, hats });
      expect(h).toMatchObject({ note: 46, half: true, open: true });
      expect(h.velocity).toBeLessThanOrEqual(HALF_OPEN_MAX);
      expect(o.velocity).toBeGreaterThanOrEqual(OPEN_HAT_MIN);
    }
  });

  it('draws a grace’s Humanise from the other hand, and leaves the snare’s own stream alone', () => {
    /* The flam on 2 and a plain hit on 2 humanise the snare identically, and
       the snare on 4 too: the grace took nothing from the left hand. The hats
       after it are the right hand's next draws, so they move. */
    const play = (snare: number) => {
      const bar = barWith('s', snare);
      bar.s[12] = 3;
      for (let i = 0; i < 16; i += 2) bar.h[i] = 1;
      const pat = pattern([bar]);
      const stream = new Humaniser(99);
      const out = [];
      for (let i = 0; i < 16; i++) {
        out.push(
          ...performStep(pat, bar, i, {
            ...opts,
            humanise: { stream, amount: 75, bpm: 120 },
          }).map((v) => ({ ...v, step: i }))
        );
      }
      return out;
    };
    const plain = play(2);
    const flam = play(6);
    const snares = (vs: typeof plain) =>
      vs.filter((v) => v.lane === 's' && !v.ornament).map((v) => v.offset);
    expect(snares(flam)).toEqual(snares(plain));
    const hatsAfter = (vs: typeof plain) =>
      vs.filter((v) => v.lane === 'h' && v.step > 4).map((v) => v.offset);
    expect(hatsAfter(flam)).not.toEqual(hatsAfter(plain));
  });

  it('never plays a grace after its note, however loose the take', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const pat = pattern([barWith('s', 7)]);
      const stream = new Humaniser(seed);
      const [note, g1, g2] = performStep(pat, pat.bars[0], 4, {
        ...opts,
        humanise: { stream, amount: 100, bpm: 120 },
      });
      expect(g1.offset).toBeLessThan(g2.offset);
      expect(g2.offset).toBeLessThan(note.offset);
      expect(g1.velocity).toBeLessThanOrEqual(note.velocity * 0.6 + 1e-9);
    }
  });

  it('changes nothing for a step without an articulation: no extra voices, no extra draws', () => {
    const bar = barWith('s', 3);
    const pat = pattern([bar]);
    const a = new Humaniser(5);
    const b = new Humaniser(5);
    const voices = performStep(pat, bar, 4, {
      ...opts,
      humanise: { stream: a, amount: 50, bpm: 120 },
    });
    expect(voices).toHaveLength(1);
    // the next draw from each limb is the same as on a stream nothing touched
    b.next('s', 50);
    expect(a.next('h', 50)).toEqual(b.next('h', 50));
    expect(a.next('s', 50)).toEqual(b.next('s', 50));
  });
});

describe('MIDI write and read round-trip each value (9.12)', () => {
  const settings = [
    { bpm: 120, swing: 0, feel: 0, hats: 100 },
    { bpm: 400, swing: 0, feel: 0, hats: 150 },
    { bpm: 90, swing: 30, feel: 100, hats: 100, humanise: { amount: 35, seed: 3 } },
  ];

  it.each(NEW)('reads a $name back as itself', ({ lane, value }) => {
    for (const s of settings) {
      for (const at of [0, 4, 15]) {
        const bar = barWith(lane, value, at);
        if (lane === 's') bar.s[at === 4 ? 12 : 4] = 3;
        const pat = pattern([bar]);
        const file = buildMidi([{ pattern: pat, barIdx: 0 }], s);
        const read = readMidi(new Uint8Array(file.bytes));
        if (!read.ok) throw new Error(read.error);
        expect(read.pattern.bars, `${JSON.stringify(s)} at ${at}`).toHaveLength(1);
        expect(read.pattern.bars[0][lane][at], `${JSON.stringify(s)} at ${at}`).toBe(value);
        // and nothing else on that drum: the graces and repeats are part of the note
        const others = read.pattern.bars[0][lane].filter(
          (v, i) => v && i !== at && i !== 12 && i !== 4
        );
        expect(others, `${JSON.stringify(s)} at ${at}`).toEqual([]);
      }
    }
  });

  it('reads a ghost before an accent as two notes, not a flam', () => {
    const bar = barWith('s', 3);
    bar.s[3] = 1;
    const file = buildMidi([{ pattern: pattern([bar]), barIdx: 0 }], settings[0]);
    const read = readMidi(new Uint8Array(file.bytes));
    if (!read.ok) throw new Error(read.error);
    expect(read.pattern.bars[0].s.slice(3, 5)).toEqual([1, 3]);
  });

  it('moves a flam on the first beat of a file later as a whole, so its grace still leads', () => {
    const file = buildMidi([{ pattern: pattern([barWith('s', 6, 0)]), barIdx: 0 }], settings[0]);
    const events = noteEvents(file.bytes).filter((e) => e.note === 38);
    expect(events.map((e) => e.on)).toEqual([true, false, true, false]);
    expect(events[0].t).toBe(0);
    expect(events[2].t).toBeGreaterThan(0);
  });

  it('reads a hostile file of thousands of snare notes on one tick in linear time', () => {
    // 40 000 note-ons on 38 at tick 0, running status: about 120 KB, under the import's cap
    const N = 40_000;
    const track = [0, 0x99, 38, 100];
    for (let k = 1; k < N; k++) track.push(0, 38, k % 2 ? 20 : 100);
    track.push(0, 0xff, 0x2f, 0);
    const len = track.length;
    const bytes = new Uint8Array([
      ...[0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xe0],
      ...[
        0x4d,
        0x54,
        0x72,
        0x6b,
        (len >> 24) & 255,
        (len >> 16) & 255,
        (len >> 8) & 255,
        len & 255,
      ],
      ...track,
    ]);
    const started = performance.now();
    const read = readMidi(bytes);
    expect(read.ok).toBe(true);
    expect(performance.now() - started).toBeLessThan(1500);
  });

  it('ends a grace before its note starts', () => {
    const file = buildMidi([{ pattern: pattern([barWith('s', 6)]), barIdx: 0 }], settings[0]);
    const events = noteEvents(file.bytes).filter((e) => e.note === 38);
    // grace on, grace off, note on, note off — never two 38s held at once
    expect(events.map((e) => e.on)).toEqual([true, false, true, false]);
  });
});

/** A format-0 file's note events in order, with absolute ticks. */
function noteEvents(bytes: number[]): Array<{ t: number; note: number; on: boolean }> {
  const out: Array<{ t: number; note: number; on: boolean }> = [];
  let i = 22;
  let t = 0;
  while (i < bytes.length) {
    let d = 0;
    let b: number;
    do {
      b = bytes[i++];
      d = (d << 7) | (b & 0x7f);
    } while (b & 0x80);
    t += d;
    const status = bytes[i++];
    if (status === 0xff) {
      const len = bytes[i + 1];
      i += 2 + len;
      continue;
    }
    const note = bytes[i++];
    const vel = bytes[i++];
    out.push({ t, note, on: (status & 0xf0) === 0x90 && vel > 0 });
  }
  return out;
}

describe('the text notation carries every value (9.11)', () => {
  it('writes and reads back every value of every lane', () => {
    const bars = everyValue();
    const pat = pattern(bars);
    const read = fromText(toText(pat), '4/4');
    if (!read.ok) throw new Error(read.error);
    expect(read.bars.map((b) => b.bar)).toEqual(bars);
  });
});

describe('the rest of the app knows them (9.14)', () => {
  it('calls a flam or drag under a hi-hat unplayable: the grace is the other hand', () => {
    for (const value of [6, 7]) {
      const bar = barWith('s', value);
      for (let i = 0; i < 16; i += 2) bar.h[i] = 1;
      const check = playability(pattern([bar]), 100);
      expect(check.hard).toBe(false);
      expect(check.checks.find((c) => c.label === GRACE_CHECK)?.ok).toBe(false);
    }
  });

  it('calls a tom flam beside the snare unplayable, and a buzz under the hat fine', () => {
    const tom = barWith('t2', 3);
    tom.s[4] = 2;
    expect(playability(pattern([tom]), 100).checks.some((c) => c.label === GRACE_CHECK)).toBe(true);

    const buzz = barWith('s', 8);
    buzz.s[12] = 3;
    for (let i = 0; i < 16; i += 2) buzz.h[i] = 1;
    expect(playability(pattern([buzz]), 100).checks.some((c) => c.label === GRACE_CHECK)).toBe(
      false
    );
  });

  it('shows no new check on a pattern without a flam or drag', () => {
    const plain = barWith('s', 3);
    expect(playability(pattern([plain]), 100).checks).toHaveLength(6);
  });

  it('tidies a hat off a flam, a ghost off a rimshot, and a foot chick off a half-open hat', () => {
    const bar = barWith('s', 6);
    bar.h[4] = 1;
    bar.s[11] = 1;
    bar.s[12] = 5;
    bar.h[8] = 4;
    bar.hf[8] = 1;
    const { pattern: out, changes } = tidy(pattern([bar]));
    expect(out.bars[0].s[4]).toBe(6);
    expect(out.bars[0].h[4]).toBe(0);
    expect(out.bars[0].s[11]).toBe(0);
    expect(out.bars[0].hf[8]).toBe(0);
    expect(changes.map((c) => c.rule).sort()).toEqual(['ghost-accent', 'hands', 'open-hat-foot']);
  });

  it('generates articulations only from params a style sets, and never a flam under a cymbal', () => {
    const style = testStyle('funk');
    const params = { ...style.params, rimshot: 1, flam: 1, drag: 0.5, buzz: 0.5, halfOpen: 1 };
    const opts = { seed: 11, bars: 4, density: 50, ghosts: 80 };
    const plain = generatePattern({ ...opts, style });
    const rich = generatePattern({ ...opts, style: { ...style, params } });

    const all = rich.bars.flatMap((b) => [...b.s, ...b.h]);
    expect(all).toContain(5);
    expect(rich.bars.flatMap((b) => b.h)).not.toContain(3);
    for (const b of rich.bars) {
      for (let i = 0; i < 16; i++) {
        if (b.s[i] === 6 || b.s[i] === 7) expect(b.h[i] + b.r[i] + b.c[i]).toBe(0);
      }
    }
    expect(playability(rich, 100).checks.every((c) => c.label !== GRACE_CHECK)).toBe(true);
    // the same groove underneath: every kick where it was
    expect(rich.bars.map((b) => b.k)).toEqual(plain.bars.map((b) => b.k));
  });

  it('leaves a pattern untouched when a style sets no articulation param', () => {
    const style = testStyle('funk');
    const pat = generatePattern({ style, seed: 3, bars: 2, density: 50, ghosts: 50 });
    const before = JSON.stringify(pat);
    articulate(pat, style.params);
    expect(JSON.stringify(pat)).toBe(before);
  });
});

describe('the notation key on /help (9.13)', () => {
  it('shows every value every kit lane holds, once in its row', () => {
    const rows = notationKey();
    for (const row of rows) expect(new Set(row.names).size).toBe(row.names.length);
    const shown = rows.flatMap((row) => row.names);
    for (const name of [
      'rimshot',
      'flam',
      'drag',
      'buzz',
      'half-open',
      'crash 2',
      'china',
      'splash',
      'mid tom flam',
    ]) {
      expect(shown).toContain(name);
    }
    expect(shown).toHaveLength(8 + 4 + 1 + 2 + 4 + 2 + 1 + 3 + 1);
  });

  it('engraves each row with as many notes as it names', () => {
    for (const row of notationKey()) {
      expect(row.engraving.label).toContain(row.names.join(', '));
    }
  });
});
