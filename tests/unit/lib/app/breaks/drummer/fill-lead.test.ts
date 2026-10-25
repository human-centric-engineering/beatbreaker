/**
 * `leftLedFills` — the hands of a bar's fills for a drummer who leads them with
 * the other hand (Ringo Starr), and `handsOf`, which hands them to the drummer.
 */

import { describe, expect, it } from 'vitest';

import { handsOf } from '@/lib/app/breaks/audio/transport';
import { leftLedFills } from '@/lib/app/breaks/drummer/fill-lead';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';

const LANES: LaneKey[] = ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'hf', 'p1', 'p2'];

/** A bar of 16 steps from rows like `'1...1...'`, padded with rests. */
function bar(rows: Partial<Record<LaneKey, string>>): Bar {
  const b = {} as Bar;
  for (const lane of LANES) {
    const row = (rows[lane] ?? '').padEnd(16, '.');
    b[lane] = [...row].map((ch) => (ch === '.' ? 0 : Number(ch)));
  }
  return b;
}

describe('leftLedFills', () => {
  it('leaves a groove alone: every snare under a hat keeps time', () => {
    expect(
      leftLedFills(bar({ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.1.....' }))
    ).toBeNull();
  });

  it('leads a fill round the toms from the left, hand to hand, the time before it left alone', () => {
    const row = leftLedFills(
      bar({
        h: '1.1.1.1.',
        s: '....2...1111',
        t1: '............11',
        t3: '..............11',
      })
    );
    expect(row).toBe('........LRLRLRLR');
  });

  it('carries the hands across a gap in the fill, but not across the time kept between two', () => {
    // a triplet-ish figure with rests inside it: one fill
    expect(leftLedFills(bar({ t3: '111...111.......' }))).toBe('LRL...RLR.......');
    // a hat between two runs: each starts again from the left
    expect(leftLedFills(bar({ s: '11..', h: '....1', t3: '.....11' }))).toBe('LR...LR.........');
  });

  it('leaves a lone stroke, and a step struck on two drums at once, to the drummer', () => {
    expect(leftLedFills(bar({ t3: '1.......' }))).toBeNull();
    // the unison is the third stroke: R, unwritten, and the hands go on from it
    expect(leftLedFills(bar({ s: '1111', t3: '..1' }))).toBe('LR.R............');
  });
});

describe('handsOf', () => {
  const fill = bar({ s: '............1111' });
  const pat = (attrs: Pattern['attrs'], sticking?: (string | null)[]) =>
    ({ bars: [fill], attrs, ...(sticking ? { sticking } : {}) }) as unknown as Pattern;

  it("writes a left-led fill for a style that leads with the other hand, and nobody else's", () => {
    expect(handsOf(pat({ fillsLeft: true }), 0)).toBe('............LRLR');
    expect(handsOf(pat({}), 0)).toBeNull();
    expect(handsOf(null, 0)).toBeNull();
  });

  it('keeps what the pattern has written: a rudiment is played as written', () => {
    expect(handsOf(pat({ fillsLeft: true }, ['RLRR']), 0)).toBe('RLRR');
  });
});
