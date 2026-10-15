/**
 * Tuplet spans (Phase 12-d, D53, D55): five even notes against four, held to
 * the sample, bracketed on the chart, round-tripped through MIDI, and every
 * reader — the layers, the critic, the drummer, BeatBuddy's text — treating a
 * span as one figure. Wire v8 carries them; a break without one keeps its
 * bytes and its hash.
 */

import { describe, expect, it } from 'vitest';

import { crossClick } from '@/lib/app/breaks/audio/transport';
import { gridHash } from '@/lib/app/breaks/community/grid';
import { playability, HANDS_CHECK } from '@/lib/app/breaks/critic';
import { scheduledHits } from '@/lib/app/breaks/drummer/timeline';
import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { importedDoc } from '@/lib/app/breaks/import';
import { reducePattern, tupletShows } from '@/lib/app/breaks/layers';
import { meterOf, stepSeconds } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { performStep } from '@/lib/app/breaks/perform';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { FOUR_THIRDS, ratioLabel } from '@/lib/app/breaks/sections';
import {
  SHARE_VERSION,
  SHARE_VERSION_AB,
  SHARE_VERSION_RATIOS,
  type BreakDoc,
  breakPayload,
  decodeBreak,
  encodeBreak,
} from '@/lib/app/breaks/share';
import { fromText, toText } from '@/lib/app/breaks/text';
import { dropPolySpansAt } from '@/lib/app/breaks/poly-fill';
import {
  MAX_TUPLETS,
  addTuplet,
  removeTuplet,
  setTupletNote,
  tupletChoices,
  tupletHands,
  tupletStrokes,
  tupletsOf,
  tupletValue,
} from '@/lib/app/breaks/tuplets';
import type { Bar, Pattern, TupletSpan } from '@/lib/app/breaks/types';

const SAMPLE_RATE = 48000;

function pattern(over: Partial<Pattern> = {}, bars: Bar[] = [emptyBar(16)]): Pattern {
  return {
    name: 'tuplets',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars,
    ...over,
  };
}

/** Five on the snare over a bar of four on the kick. */
function fiveFour(): Pattern {
  const bar = emptyBar(16);
  for (const i of [0, 4, 8, 12]) bar.k[i] = 1;
  return pattern(
    { tuplets: [{ bar: 0, start: 0, span: 16, n: 5, notes: { s: [3, 2, 2, 2, 2] } }] },
    [bar]
  );
}

const PLAIN = { swing: 0, feel: 0, hats: 100 };

/** Every voice of a pattern's bar, at its time in seconds from the bar's start. */
function played(pat: Pattern, bpm: number, opts = PLAIN): { lane: string; at: number }[] {
  const dur = stepSeconds(meterOf(pat.meter), bpm);
  const bar = pat.bars[0];
  const out: { lane: string; at: number }[] = [];
  for (let i = 0; i < bar.k.length; i++) {
    for (const v of performStep(pat, bar, i, { ...opts, bpm })) {
      out.push({ lane: v.lane, at: (i + v.offset) * dur });
    }
  }
  return out;
}

/** Every text node an engraving draws. */
function texts(nodes: SvgNode[]): string[] {
  const out: string[] = [];
  const walk = (list: SvgNode[]) => {
    for (const n of list) {
      if (n.text !== undefined) out.push(n.text);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

const doc = (A: Pattern, B: Pattern = A): BreakDoc => ({
  bpm: 90,
  swing: 0,
  level: 5,
  arrangement: ['A', 'B'],
  A,
  B,
});

describe('a 5:4', () => {
  it('plays five even notes against four, to the sample', () => {
    const notes = played(fiveFour(), 60);
    const samples = (lane: string) =>
      notes.filter((n) => n.lane === lane).map((n) => Math.round(n.at * SAMPLE_RATE));
    // a bar of 4/4 at 60 is four seconds: the five are 0.8 s apart, the four 1 s
    expect(samples('s')).toEqual([0, 38400, 76800, 115200, 153600]);
    expect(samples('k')).toEqual([0, 48000, 96000, 144000]);
  });

  it('takes no swing or feel, which would pull it uneven', () => {
    const pat = fiveFour();
    pat.attrs = { feel: { label: 'lean', s: [0.2, -0.2] } };
    const snare = played(pat, 60, { swing: 100, feel: 150, hats: 100 }).filter(
      (n) => n.lane === 's'
    );
    const gaps = snare.slice(1).map((n, k) => n.at - snare[k].at);
    for (const g of gaps) expect(g).toBeCloseTo(0.8, 12);
  });

  it('never plays a grid note the span owns', () => {
    const pat = fiveFour();
    pat.bars[0].s[8] = 3; // written under the span by something that should not have
    const snare = played(pat, 60).filter((n) => n.lane === 's');
    expect(snare).toHaveLength(5);
  });

  it('prints a bracketed 5, its notes as quarters over the bar', () => {
    const e = engrave(fiveFour(), null, { scale: 1, perSystem: 2 });
    expect(texts(e.nodes).filter((t) => t === '5')).toHaveLength(1);
    expect(tupletValue({ span: 16, n: 5 })).toEqual({ steps: 4, bracket: true });
  });

  it('exports to MIDI at 384-tick spacing, the quintuplet 16ths at 96', () => {
    const ticksOf = (pat: Pattern) => {
      const bytes = buildMidi([{ pattern: pat, barIdx: 0 }], { bpm: 60, ...PLAIN }).bytes;
      const r = readMidi(new Uint8Array(bytes));
      if (!r.ok) throw new Error(r.error);
      return r.pattern;
    };
    // the bar-long five comes back as the one span it was
    const back = ticksOf(fiveFour());
    expect(back.tuplets).toEqual(fiveFour().tuplets);
    expect(back.bars[0].k).toEqual(fiveFour().bars[0].k);

    const quint = pattern({
      tuplets: [{ bar: 0, start: 4, span: 4, n: 5, notes: { s: [3, 1, 1, 1, 1] } }],
    });
    quint.bars[0].k[0] = 1;
    const file = buildMidi([{ pattern: quint, barIdx: 0 }], { bpm: 100, ...PLAIN });
    const r = readMidi(new Uint8Array(file.bytes));
    if (!r.ok) throw new Error(r.error);
    expect(r.pattern.tuplets).toEqual([
      { bar: 0, start: 4, span: 4, n: 5, notes: { s: [3, 1, 1, 1, 1] } },
    ]);
  });
});

describe('one span, many lanes (D53)', () => {
  const round: TupletSpan = {
    bar: 0,
    start: 12,
    span: 4,
    n: 5,
    notes: { s: [3, 2, 0, 0, 0], t1: [0, 0, 1, 1, 0], t3: [0, 0, 0, 0, 2] },
  };

  it('draws a quintuplet round the toms as one bracket', () => {
    const e = engrave(pattern({ tuplets: [round] }), null, { scale: 1, perSystem: 2 });
    expect(texts(e.nodes).filter((t) => t === '5')).toHaveLength(1);
  });

  it('goes hand to hand through its notes, whichever drum each is on', () => {
    const pat = pattern({ tuplets: [round] });
    const hands = [0, 1, 2, 3, 4].map((j) => Object.values(tupletHands(pat, round, j))[0]);
    expect(hands).toEqual(['R', 'L', 'R', 'L', 'R']);
  });

  it('is played by the drummer at its own times, with those hands', () => {
    const pat = pattern({ tuplets: [round] });
    const dur = 0.15;
    const hits = [12, 13, 14, 15].flatMap((slot) => {
      const voices = performStep(pat, pat.bars[0], slot, PLAIN);
      return scheduledHits({
        t: slot * dur,
        dur,
        slot,
        meter: meterOf('4/4'),
        bar: pat.bars[0],
        next: null,
        notes: voices.map((voice) => ({ voice, when: slot * dur + voice.offset * dur })),
      });
    });
    expect(hits.map((h) => [h.lane, h.limb, Number(h.time.toFixed(6))])).toEqual([
      ['s', 'lead', 1.8],
      ['s', 'other', 1.92],
      ['t1', 'lead', 2.04],
      ['t1', 'other', 2.16],
      ['t3', 'lead', 2.28],
    ]);
  });
});

describe('the layers and the critic', () => {
  it('plays a groove’s tuplet whole from layer 4 and not at all below', () => {
    const pat = fiveFour();
    expect(reducePattern(pat, 5).tuplets).toEqual(pat.tuplets);
    expect(reducePattern(pat, 4).tuplets).toEqual(pat.tuplets);
    expect(reducePattern(pat, 3).tuplets).toBeUndefined();
  });

  it('plays a polyrhythm’s tuplet with its stream, levelled where the stream is', () => {
    const pat = fiveFour();
    pat.poly = {
      device: 'cross-rhythm',
      ratio: '5:4',
      pulse: ['k'],
      cross: ['s'],
      beat: 16,
      count: 5,
      tuplet: 5,
    };
    expect(reducePattern(pat, 1).tuplets).toBeUndefined();
    expect(reducePattern(pat, 2).tuplets?.[0].notes.s).toEqual([2, 2, 2, 2, 2]);
    expect(reducePattern(pat, 4).tuplets?.[0].notes.s).toEqual([3, 2, 2, 2, 2]);
  });

  it('judges a span as one figure: a run of five is not a snare run', () => {
    const pat = fiveFour();
    pat.tuplets = [{ bar: 0, start: 8, span: 4, n: 7, notes: { s: [3, 2, 2, 2, 2, 2, 2] } }];
    expect(playability(pat, 90).checks.find((c) => /Snare/.test(c.label))?.ok).toBe(true);
  });

  it('still counts its hands: two drums and a cymbal on one note is three', () => {
    const pat = fiveFour();
    pat.tuplets = [
      { bar: 0, start: 0, span: 4, n: 5, notes: { s: [3, 0, 0, 0, 0], t1: [2, 0, 0, 0, 0] } },
    ];
    pat.bars[0].h[0] = 1;
    expect(playability(pat, 90).checks.map((c) => c.label)).toContain(HANDS_CHECK);
  });
});

describe('wire v8', () => {
  it('writes a code with a tuplet as v8, and reads the span back', () => {
    const pat = fiveFour();
    expect(breakPayload(doc(pat)).ver).toBe(SHARE_VERSION);
    expect(SHARE_VERSION).toBe(8);
    expect(decodeBreak(encodeBreak(doc(pat))).A.tuplets).toEqual(pat.tuplets);
  });

  it('refuses a code under v8 that carries one, as an older reader does', () => {
    const payload = { ...breakPayload(doc(fiveFour())), ver: 7 };
    expect(sharePayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('keeps a break without tuplets at its version, its bytes and its hash', async () => {
    const plain = pattern();
    plain.bars[0].k[0] = 1;
    const before = encodeBreak(doc(plain));
    expect(breakPayload(doc(plain)).ver).toBe(SHARE_VERSION_AB);
    expect(JSON.parse(atob(before))).not.toHaveProperty('A.tu');
    // the hash is the grid text alone, as it was before 12-d
    const withEmpty = { ...plain, tuplets: [] };
    expect(await gridHash(doc(withEmpty))).toBe(await gridHash(doc(plain)));
    expect(await gridHash(doc(fiveFour()))).not.toBe(
      await gridHash(doc({ ...fiveFour(), tuplets: undefined }))
    );
  });

  it('writes a metric modulation as v8, and a half-time section still as v7', () => {
    const a = pattern();
    expect(breakPayload(doc(a, { ...a, tempoRatio: 2 })).ver).toBe(SHARE_VERSION_RATIOS);
    const mod = breakPayload(doc(a, { ...a, tempoRatio: 1.5 }));
    expect(mod.ver).toBe(SHARE_VERSION);
    expect(sharePayloadSchema.safeParse({ ...mod, ver: 7 }).success).toBe(false);
    expect(decodeBreak(encodeBreak(doc(a, { ...a, tempoRatio: FOUR_THIRDS }))).B.tempoRatio).toBe(
      4 / 3
    );
    expect([2 / 3, 0.75, 4 / 3, 1.5].map(ratioLabel)).toEqual(['×⅔', '×¾', '×4/3', '×3/2']);
  });

  it('leaves out a span that does not fit its bar, and one that shares a lane’s steps', () => {
    const pat = fiveFour();
    pat.tuplets = [
      { bar: 0, start: 12, span: 8, n: 5, notes: { s: [1, 1, 1, 1, 1] } }, // past the bar
      { bar: 0, start: 0, span: 4, n: 4, notes: { s: [1, 1, 1, 1] } }, // the grid holds it
      { bar: 0, start: 0, span: 4, n: 3, notes: { s: [1, 1, 1] } },
      { bar: 0, start: 2, span: 4, n: 5, notes: { s: [1, 1, 1, 1, 1] } }, // over the last
      { bar: 0, start: 2, span: 4, n: 5, notes: { k: [1, 0, 0, 0, 0] } }, // the feet's, beside it
    ];
    expect(tupletsOf(pat).map((t) => [t.start, t.n, Object.keys(t.notes)[0]])).toEqual([
      [0, 3, 's'],
      [2, 5, 'k'],
    ]);
  });
});

describe('MIDI import keeps triplets and tuplets (D55)', () => {
  const vlq = (n: number): number[] => {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  };
  /** A one-track file of note-ons at these ticks, 480 to the quarter. */
  function smf(notes: Array<[tick: number, note: number, vel: number]>): Uint8Array {
    const track: number[] = [];
    let last = 0;
    for (const [tick, note, vel] of [...notes].sort((a, b) => a[0] - b[0])) {
      track.push(...vlq(tick - last), 0x99, note, vel);
      last = tick;
    }
    track.push(0, 0xff, 0x2f, 0);
    const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    return new Uint8Array([
      ...[0x4d, 0x54, 0x68, 0x64],
      ...u32(6),
      0,
      0,
      0,
      1,
      480 >> 8,
      480 & 255,
      ...[0x4d, 0x54, 0x72, 0x6b],
      ...u32(track.length),
      ...track,
    ]);
  }

  it('reads a 4/4 file of eighth-note triplets in sextuplet 4/4, not rounded to 16ths', () => {
    const hats = Array.from({ length: 12 }, (_, k): [number, number, number] => [k * 160, 42, 100]);
    const kicks = [0, 960].map((t): [number, number, number] => [t, 36, 110]);
    const r = readMidi(smf([...hats, ...kicks]));
    if (!r.ok) throw new Error(r.error);
    expect(r.pattern.meter).toBe('4/4-6');
    expect(r.pattern.bars[0].h.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)).toEqual(
      Array.from({ length: 12 }, (_, k) => k * 2)
    );
    expect(r.pattern.tuplets).toBeUndefined();
  });

  it('reads quintuplets over a beat of 16ths as a span, the rest on the grid', () => {
    const hats = Array.from({ length: 12 }, (_, k): [number, number, number] => [
      480 + k * 120,
      42,
      100,
    ]);
    const five = Array.from({ length: 5 }, (_, k): [number, number, number] => [k * 96, 38, 100]);
    const r = readMidi(smf([...hats, ...five, [0, 36, 110]]));
    if (!r.ok) throw new Error(r.error);
    expect(r.pattern.meter).toBe('4/4');
    expect(r.pattern.tuplets).toHaveLength(1);
    expect(r.pattern.tuplets?.[0]).toMatchObject({ bar: 0, start: 0, span: 4, n: 5 });
    expect(r.pattern.bars[0].k[0]).toBe(1);
    expect(r.pattern.notes.join(' ')).toMatch(/1 tuplet was read as written/);
    // and it is a span in the section the import opens
    expect(importedDoc(r.pattern, 'funk').A.tuplets).toHaveLength(1);
  });
});

describe('writing a tuplet by hand', () => {
  it('cuts a beat into n, joins a span of the same n, and gives it back', () => {
    const pat = pattern();
    pat.bars[0].s[5] = 2;
    expect(addTuplet(pat, 0, 's', 4, 4, 5)).toBe(true);
    expect(pat.bars[0].s[5]).toBe(0);
    expect(addTuplet(pat, 0, 't1', 4, 4, 5)).toBe(true);
    expect(tupletsOf(pat)).toHaveLength(1);
    expect(Object.keys(pat.tuplets?.[0].notes ?? {})).toEqual(['s', 't1']);
    expect(addTuplet(pat, 0, 's', 4, 4, 3)).toBe(false);
    expect(setTupletNote(pat, 0, 's', 6, 2, 3)).toBe(true);
    expect(pat.tuplets?.[0].notes.s).toEqual([0, 0, 3, 0, 0]);
    expect(removeTuplet(pat, 0, 's', 4)).toBe(true);
    expect(removeTuplet(pat, 0, 't1', 4)).toBe(true);
    expect(pat.tuplets).toBeUndefined();
  });

  it('offers only the counts a beat’s grid cannot hold', () => {
    // eight in a beat of four is 32nds: the grid stops at 16ths
    expect(tupletChoices(4)).toEqual([3, 5, 6, 7, 8, 9]);
    expect(tupletChoices(6)).toEqual([4, 5, 7, 8, 9]);
  });
});

describe('BeatBuddy’s text', () => {
  it('prints a tuplet under its bar, and reads the bar back without it', () => {
    const text = toText(fiveFour());
    expect(text).toMatch(/tuplet\s+5 in the time of 16 steps, from beat 1 to the 'a' of 4/);
    expect(text).toMatch(/› snare\s+Sssss/);
    const back = fromText(text, '4/4');
    expect(back.ok).toBe(true);
  });
});

describe('the click on a tuplet cross pulse', () => {
  it('falls between the steps', () => {
    const pat = fiveFour();
    pat.poly = {
      device: 'cross-rhythm',
      ratio: '5:4',
      pulse: ['k'],
      cross: ['s'],
      beat: 16,
      count: 5,
      tuplet: 5,
    };
    expect(crossClick(pat, 0, 3)).toEqual([{ at: expect.closeTo(0.2, 9), accent: false }]);
    expect(crossClick(pat, 0, 4)).toEqual([]);
  });
});

describe('the chart, past the kit and the sixteenths', () => {
  /** Every node an engraving draws, flattened. */
  const count = (nodes: SvgNode[]): number =>
    nodes.reduce((n, x) => n + 1 + (x.children ? count(x.children) : 0), 0);

  it('draws four in a beat of a 4/4 in eighths as the sixteenths it is', () => {
    // four over two eighths falls on sixteenths once the chart widens them
    const four = (row: number[]) =>
      pattern(
        { meter: '4/4-8', tuplets: [{ bar: 0, start: 2, span: 2, n: 4, notes: { s: row } }] },
        [emptyBar(8)]
      );
    const opts = { scale: 1, perSystem: 2 };
    // left out of the chart, its notes drew as the rests an empty one does
    const played = engrave(four([3, 1, 1, 1]), null, opts).nodes;
    const silent = engrave(four([0, 0, 0, 0]), null, opts).nodes;
    expect(played).not.toEqual(silent);
    expect(count(played)).not.toBe(count(silent));
  });

  it('numbers a percussion tuplet on its own line, not as kit rests', () => {
    const pat = pattern({
      lanes: ['k', 's', 'h', 'p1'],
      perc: { p1: 'cowbell' },
      tuplets: [{ bar: 0, start: 4, span: 4, n: 5, notes: { p1: [2, 1, 1, 1, 1] } }],
    });
    pat.bars[0].p1 = Array<number>(16).fill(0);
    const e = engrave(pat, null, { scale: 1, perSystem: 2 });
    expect(texts(e.nodes).filter((t) => t === '5')).toHaveLength(1);
  });
});

describe('what a layer shows, and so where a tuplet may be written', () => {
  it('in a groove from layer 4; in a polyrhythm with its stream', () => {
    expect(tupletShows(pattern(), 3, 's')).toBe(false);
    expect(tupletShows(pattern(), 4, 's')).toBe(true);
    const poly = pattern({
      poly: { ratio: '3:2', device: 'cross-rhythm', pulse: ['k'], cross: ['s'], beat: 4, count: 3 },
    });
    expect(tupletShows(poly, 1, 'k')).toBe(true);
    expect(tupletShows(poly, 1, 's')).toBe(false);
    expect(tupletShows(poly, 4, 'h')).toBe(false);
    expect(tupletShows(poly, 5, 'h')).toBe(true);
  });
});

describe('the limits a writer keeps', () => {
  it('refuses a span past the most a pattern holds, and joins one still', () => {
    const bars = Array.from({ length: 8 }, () => emptyBar(16));
    const pat = pattern({}, bars);
    let made = 0;
    // a five on the snare, a three on the kick, a seven on a tom: three spans a beat
    const counts = { s: 5, k: 3, t1: 7 } as const;
    for (let b = 0; b < 8; b++)
      for (const L of ['s', 'k', 't1'] as const)
        for (const start of [0, 4, 8, 12]) if (addTuplet(pat, b, L, start, 4, counts[L])) made++;
    expect(made).toBe(MAX_TUPLETS);
    expect(tupletsOf(pat)).toHaveLength(MAX_TUPLETS);
    // joining a span there already is no new span
    const first = tupletsOf(pat)[0];
    expect(addTuplet(pat, first.bar, 't2', first.start, first.span, first.n)).toBe(true);
    expect(tupletsOf(pat)).toHaveLength(MAX_TUPLETS);
  });

  it('drops the poly fill a tuplet is made inside', () => {
    const pat = pattern({
      polySpans: [{ bar: 0, at: 8, span: 8, device: 'grouping', every: 4, plain: {} }],
    });
    dropPolySpansAt(pat, 0, 3);
    expect(pat.polySpans).toHaveLength(1);
    dropPolySpansAt(pat, 0, 10);
    expect(pat.polySpans).toBeUndefined();
  });

  it('reads a bar’s strokes once, and again after an edit', () => {
    const pat = fiveFour();
    const first = tupletStrokes(pat, 0);
    expect(tupletStrokes(pat, 0)).toBe(first);
    expect(setTupletNote(pat, 0, 's', 0, 1, 0)).toBe(true);
    expect(tupletStrokes(pat, 0)).toHaveLength(first.length - 1);
  });
});
