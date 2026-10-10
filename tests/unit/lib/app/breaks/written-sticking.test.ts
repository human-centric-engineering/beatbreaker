/**
 * Written sticking (Phase 10, D44): the R and L a rudiment is, carried on the
 * pattern, printed on the chart, and played by the drummer.
 *
 * Every test here pairs a pattern that writes its hands with the same notes
 * without them, because the promise is two-sided: a written hand is obeyed,
 * and a pattern nobody wrote hands for comes out exactly as it did before.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { withPreview } from '@/lib/app/breaks/drummer/corner-chart';
import { type StepHands, assignBar } from '@/lib/app/breaks/drummer/sticking';
import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { DRAG, FLAM } from '@/lib/app/breaks/lanes';
import {
  clonePattern,
  emptyBar,
  stickingAt,
  stickingRow,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import {
  packedPatternSchema,
  sharePayloadSchema,
  storedPayloadSchema,
} from '@/lib/app/breaks/schema';
import { breakPayload, decodeBreak, encodeBreak, packPattern } from '@/lib/app/breaks/share';
import type { Bar, Pattern } from '@/lib/app/breaks/types';

const PARADIDDLE = 'RLRRLRLLRLRRLRLL';

/** A bar of snare taps on every step `row` writes a hand for; `values` overrides by step. */
function snareBar(row: string, values: Record<number, number> = {}): Bar {
  const bar = emptyBar(row.length);
  for (let i = 0; i < row.length; i++) if (row[i] !== '.') bar.s[i] = values[i] ?? 2;
  return bar;
}

function rudiment(bars: Bar[], sticking: Pattern['sticking']): Pattern {
  return {
    name: 'Single Paradiddle',
    style: 'rudiment',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['s'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    sticking,
    bars,
  };
}

function payloadOf(pat: Pattern) {
  return breakPayload(docOf(pat));
}

describe('sticking on the wire', () => {
  it('packs as sk and comes back as it was written', () => {
    const pat = rudiment([snareBar(PARADIDDLE), snareBar(PARADIDDLE)], [PARADIDDLE, null]);
    const packed = packPattern(pat);
    expect(packed.sk).toEqual([PARADIDDLE, 0]);
    const back = decodeBreak(encodeBreak(docOf(pat))).A;
    expect(back.sticking).toEqual([PARADIDDLE, null]);
  });

  it('leaves sk out of a pattern with none, and reads no sk as no sticking', () => {
    const pat = rudiment([snareBar(PARADIDDLE)], null);
    expect('sk' in packPattern(pat)).toBe(false);
    expect(decodeBreak(encodeBreak(docOf(pat))).A.sticking).toBeUndefined();
  });

  it('holds a row to its bar: padded, cut, and a row past the last bar dropped', () => {
    const pat = rudiment([snareBar(PARADIDDLE)], null);
    const payload = payloadOf(pat);
    payload.A.sk = ['RL', 'RLRL'];
    const doc = decodeBreak(btoa(JSON.stringify(payload)));
    expect(doc.A.sticking).toEqual(['RL..............']);
  });

  it('refuses a code whose sticking is not hands', () => {
    const payload = payloadOf(rudiment([snareBar(PARADIDDLE)], null));
    expect(
      sharePayloadSchema.safeParse({ ...payload, A: { ...payload.A, sk: ['RXL'] } }).success
    ).toBe(false);
  });

  it('repairs a stored row rather than refusing it', () => {
    const payload = payloadOf(rudiment([snareBar(PARADIDDLE)], null));
    const stored = storedPayloadSchema.parse({ ...payload, A: { ...payload.A, sk: ['RXL', 7] } });
    expect(stored.A.sk).toEqual(['R.L', 0]);
  });

  it('is dropped, not refused, by a reader that predates it', () => {
    const older = packedPatternSchema.omit({ sk: true });
    const packed = packPattern(rudiment([snareBar(PARADIDDLE)], [PARADIDDLE]));
    const read = older.safeParse(packed);
    expect(read.success).toBe(true);
    expect(read.data && 'sk' in read.data).toBe(false);
  });

  it('survives a clone, as a copy', () => {
    const pat = rudiment([snareBar(PARADIDDLE)], [PARADIDDLE]);
    const copy = clonePattern(pat);
    expect(copy.sticking).toEqual([PARADIDDLE]);
    expect(copy.sticking).not.toBe(pat.sticking);
  });
});

describe('the helpers', () => {
  it('read a hand at a step, and nothing where none is written', () => {
    expect(stickingAt(['R.l'], 0, 0)).toBe('R');
    expect(stickingAt(['R.l'], 0, 1)).toBeNull();
    expect(stickingAt(['R.l'], 0, 2)).toBe('l');
    expect(stickingAt(['R.l'], 1, 0)).toBeNull();
    expect(stickingAt(null, 0, 0)).toBeNull();
  });

  it('hold a row to a length, and call a row of no hands no row', () => {
    expect(stickingRow('RxL', 4)).toBe('R.L.');
    expect(stickingRow('....', 4)).toBeNull();
    expect(tidySticking([null, null])).toBeNull();
    expect(tidySticking([null, 'R'])).toEqual([null, 'R']);
  });

  it('keep each bar its own hands when the next section is previewed after it', () => {
    const a = rudiment([snareBar(PARADIDDLE)], null);
    const b = rudiment([snareBar(PARADIDDLE)], [PARADIDDLE]);
    expect(withPreview(a, b).sticking).toEqual([null, PARADIDDLE]);
    expect(withPreview(a, a).sticking).toBeNull();
  });
});

/** The sticking row's labels, in step order: the small mono text under the staff. */
function stickingLabels(pat: Pattern, sticking = false): string[] {
  const texts: SvgNode[] = [];
  const walk = (nodes: SvgNode[]) => {
    for (const n of nodes) {
      // (the bar number is mono too, and is not the row)
      if (
        n.tag === 'text' &&
        n.attrs['font-family'] === 'var(--f-mono)' &&
        !/^bar /.test(n.text ?? '')
      )
        texts.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(engrave(pat, null, { scale: 1, perSystem: 1, sticking }).nodes);
  return texts.sort((x, y) => Number(x.attrs.x) - Number(y.attrs.x)).map((n) => n.text ?? '');
}

describe('the chart', () => {
  it('prints a paradiddle as written, whatever the sticking setting says', () => {
    const pat = rudiment([snareBar(PARADIDDLE)], [PARADIDDLE]);
    expect(stickingLabels(pat).join(' ')).toBe('R L R R L R L L R L R R L R L L');
  });

  it('puts the graces before the hand, on the other hand unless written lower case', () => {
    const row = 'R...L...r.......';
    const bar = snareBar(row, { 0: FLAM, 4: DRAG, 8: DRAG });
    expect(stickingLabels(rudiment([bar], [row]))).toEqual(['lR', 'rrL', 'rrR']);
  });

  it('draws a pattern without sticking as before: no row unless asked, its guess if asked', () => {
    const pat = rudiment([snareBar(PARADIDDLE)], null);
    expect(stickingLabels(pat)).toEqual([]);
    expect(new Set(stickingLabels(pat, true))).toEqual(new Set(['L']));
  });

  it('spreads a bar of eighths with its notes', () => {
    const bar = emptyBar(8);
    bar.s.fill(2);
    const pat = { ...rudiment([bar], ['RLRLRLRL']), meter: '4/4-8' };
    expect(stickingLabels(pat).join('')).toBe('RLRLRLRL');
  });
});

/** The hand on the snare at each step with a snare note. */
function snareHands(steps: StepHands[], bar: Bar): string {
  return steps
    .map((s, i) => (bar.s[i] ? (s.s === 'lead' ? 'R' : s.s === 'other' ? 'L' : '?') : ''))
    .join('');
}

describe('the drummer', () => {
  it('plays a paradiddle as written, doubles and all', () => {
    const bar = snareBar(PARADIDDLE);
    expect(snareHands(assignBar(bar, null, false, false, { bar: PARADIDDLE }), bar)).toBe(
      PARADIDDLE
    );
  });

  it('chooses for itself without sticking, as it always has', () => {
    const bar = snareBar(PARADIDDLE);
    expect(assignBar(bar, null, false, false, {})).toBe(assignBar(bar));
    expect(snareHands(assignBar(bar), bar)).not.toBe(PARADIDDLE);
  });

  it('gives a flam its grace on the other hand, and a lower-case drag none', () => {
    const row = 'R.L.r...........';
    const bar = snareBar(row, { 0: FLAM, 2: FLAM, 4: DRAG });
    const steps = assignBar(bar, null, false, false, { bar: row });
    expect([steps[0].s, steps[0].grace]).toEqual(['lead', 'other']);
    expect([steps[2].s, steps[2].grace]).toEqual(['other', 'lead']);
    expect([steps[4].s, steps[4].grace]).toEqual(['lead', undefined]);
  });

  it('starts a written bar from where the written bar before left the hands, and remembers it', () => {
    const bar = snareBar(PARADIDDLE);
    const before = snareBar(PARADIDDLE);
    const rows = { bar: PARADIDDLE, before: PARADIDDLE };
    const once = assignBar(bar, before, false, false, rows);
    expect(snareHands(once, bar)).toBe(PARADIDDLE);
    expect(assignBar(bar, before, false, false, rows)).toBe(once);
  });
});

describe('the critic', () => {
  const singles = 'RLRLRLRLRLRLRLRL';

  it('passes a single-stroke roll with its sticking written, and not without', () => {
    const fails = (pat: Pattern) =>
      playability(pat, 90)
        .checks.filter((c) => !c.ok)
        .map((c) => c.label);
    const written = rudiment([snareBar(singles)], [singles]);
    // (`hard` is true when every hard rule holds)
    expect(playability(written, 90).hard).toBe(true);
    expect(fails(written)).toEqual([]);
    const bare = rudiment([snareBar(singles)], null);
    expect(fails(bare)).toEqual(
      expect.arrayContaining(['Snare never runs four 16ths without a break'])
    );
  });

  it('still calls a run unplayable where only part of it is written', () => {
    const pat = rudiment([snareBar(singles)], ['RL..............']);
    expect(
      playability(pat, 90).checks.find((c) => c.label.startsWith('Snare never runs'))?.ok
    ).toBe(false);
  });
});

function docOf(pat: Pattern) {
  return { A: pat, B: pat, bpm: 90, swing: 0, level: 5, arrangement: ['A' as const] };
}
