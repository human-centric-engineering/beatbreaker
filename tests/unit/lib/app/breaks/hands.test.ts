/**
 * Writing the hands (Phase 14): what a drummer writes under their own notes,
 * what an edit to the notes does to it (D64), what the critic makes of it
 * (D68), and the hand the drummer cannot obey (D67).
 *
 * The promise is the drummer's: what they write is what the chart prints and
 * the 3D drummer plays, and editing a note does not unwrite the rest.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { type StepHands, assignBar, unreachedAt } from '@/lib/app/breaks/drummer/sticking';
import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import {
  alternateHands,
  clearBarHands,
  gracesAt,
  keepHands,
  writableAt,
  writeHand,
} from '@/lib/app/breaks/hands';
import { FLAM } from '@/lib/app/breaks/lanes';
import { clonePattern, emptyBar } from '@/lib/app/breaks/pattern';
import { addDouble } from '@/lib/app/breaks/tuplets';
import type { Bar, Pattern } from '@/lib/app/breaks/types';

/** A bar of snare taps on every step `row` marks with anything but `.`; `values` overrides by step. */
function snareBar(row: string, values: Record<number, number> = {}): Bar {
  const bar = emptyBar(row.length);
  for (let i = 0; i < row.length; i++) if (row[i] !== '.') bar.s[i] = values[i] ?? 2;
  return bar;
}

function patternOf(bars: Bar[], sticking: Pattern['sticking'] = null): Pattern {
  return {
    name: 'Fill',
    style: 'rudiment',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['s', 'k', 'r'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: true,
    hasHat: false,
    pins: null,
    sticking,
    bars,
  };
}

/** The sticking row's labels, in step order: the small mono text under the staff. */
function stickingLabels(pat: Pattern): string[] {
  const texts: SvgNode[] = [];
  const walk = (nodes: SvgNode[]) => {
    for (const n of nodes) {
      if (
        n.tag === 'text' &&
        n.attrs['font-family'] === 'var(--f-mono)' &&
        !/^bar /.test(n.text ?? '')
      )
        texts.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(engrave(pat, null, { scale: 1, perSystem: 1 }).nodes);
  return texts.sort((x, y) => Number(x.attrs.x) - Number(y.attrs.x)).map((n) => n.text ?? '');
}

/** The hand on the snare at each step with a snare note. */
function snareHands(steps: StepHands[], bar: Bar): string {
  return steps
    .map((s, i) => (bar.s[i] ? (s.s === 'lead' ? 'R' : s.s === 'other' ? 'L' : '?') : ''))
    .join('');
}

describe('where a hand can be written', () => {
  it('is a step a hand plays, not one only the feet do or an empty one', () => {
    const bar = snareBar('x...x...........');
    bar.k[8] = 1;
    const pat = patternOf([bar]);
    expect(writableAt(pat, 0, 0)).toBe(true);
    expect(writableAt(pat, 0, 8)).toBe(false);
    expect(writableAt(pat, 0, 1)).toBe(false);
    expect(writableAt(pat, 0, 16)).toBe(false);
    expect(writableAt(pat, 1, 0)).toBe(false);
  });

  it('is a double’s step, whose two strokes are the written hand’s (13-a)', () => {
    const pat = patternOf([snareBar('x.x.............')]);
    expect(addDouble(pat, 0, 's', 2)).toBe(true);
    // the double owns the snare there now, and the grid's cell is empty
    expect(pat.bars[0].s[2]).toBe(0);
    expect(writableAt(pat, 0, 2)).toBe(true);
  });

  it('knows a flam’s step has graces to keep on the same stick, and a tap’s has none', () => {
    const pat = patternOf([snareBar('x...x...........', { 0: FLAM })]);
    expect(gracesAt(pat, 0, 0)).toBe(true);
    expect(gracesAt(pat, 0, 4)).toBe(false);
  });
});

describe('writing a hand', () => {
  it('writes one step, and unwrites it back to no sticking at all', () => {
    const pat = patternOf([snareBar('x...x...........')]);
    expect(writeHand(pat, 0, 4, 'L')).toBe(true);
    expect(pat.sticking).toEqual(['....L...........']);
    expect(writeHand(pat, 0, 4, null)).toBe(true);
    expect(pat.sticking).toBeUndefined();
  });

  it('refuses a step no hand plays, a lower-case hand with no graces, and an edit that changes nothing', () => {
    const bar = snareBar('x...............');
    bar.k[8] = 1;
    const pat = patternOf([bar]);
    expect(writeHand(pat, 0, 8, 'R')).toBe(false);
    expect(writeHand(pat, 0, 0, 'r')).toBe(false);
    expect(pat.sticking).toBeNull();
    expect(writeHand(pat, 0, 0, 'R')).toBe(true);
    expect(writeHand(pat, 0, 0, 'R')).toBe(false);
  });

  it('keeps a flam’s graces on its own stick when written lower case', () => {
    const pat = patternOf([snareBar('x...............', { 0: FLAM })]);
    expect(writeHand(pat, 0, 0, 'r')).toBe(true);
    expect(stickingLabels(pat)[0]).toBe('rR');
  });

  it('writes the rest of a bar hand to hand from a step, over the notes only (D69)', () => {
    const bar = snareBar('x.x.x.x.x.x.x.x.');
    bar.k[0] = 1;
    const pat = patternOf([bar], ['R.R.............']);
    expect(alternateHands(pat, 0, 4, 'L')).toBe(true);
    // the steps before it keep what they had; the empty steps take none
    expect(pat.sticking).toEqual(['R.R.L.R.L.R.L.R.']);
    expect(alternateHands(pat, 0, 4, 'L')).toBe(false);
  });

  it('clears a bar’s hands, and says when there were none', () => {
    const pat = patternOf(
      [snareBar('x.x.'.repeat(4)), snareBar('x.x.'.repeat(4))],
      ['R.L.R.L.R.L.R.L.', 'L.R.............']
    );
    expect(clearBarHands(pat, 0)).toBe(true);
    expect(pat.sticking).toEqual([null, 'L.R.............']);
    expect(clearBarHands(pat, 0)).toBe(false);
  });

  it('is printed on the chart and played by the drummer as written', () => {
    const row = 'L.R.L.L.R.L.R.R.';
    const pat = patternOf([snareBar(row)]);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') writeHand(pat, 0, i, row[i] as 'R');
    expect(stickingLabels(pat).join('')).toBe(row.replace(/\./g, ''));
    const bar = pat.bars[0];
    expect(
      snareHands(assignBar(bar, null, false, false, { bar: pat.sticking?.[0] ?? null }), bar)
    ).toBe(row.replace(/\./g, ''));
  });
});

describe('an edit to the notes (D64)', () => {
  it('keeps the hand on every step that still has a note', () => {
    const pat = patternOf([snareBar('x.x.x.x.........')], ['L.R.L.L.........']);
    const next = clonePattern(pat);
    next.bars[0].s[2] = 3; // an accent moved onto step 3
    next.bars[0].k[0] = 1; // and a kick under the first
    keepHands(next, 0);
    expect(next.sticking).toEqual(['L.R.L.L.........']);
  });

  it('takes the hand off only the step left with no note a hand plays', () => {
    const pat = patternOf([snareBar('x.x.x.x.........')], ['L.R.L.L.........']);
    const next = clonePattern(pat);
    next.bars[0].s[4] = 0;
    next.bars[0].k[4] = 1;
    keepHands(next, 0);
    expect(next.sticking).toEqual(['L.R...L.........']);
    next.bars[0].s.fill(0);
    keepHands(next, 0);
    expect(next.sticking).toBeUndefined();
  });

  it('writes a lower-case hand upper case once its flam is a tap', () => {
    const pat = patternOf([snareBar('x...............', { 0: FLAM })], ['r...............']);
    const next = clonePattern(pat);
    next.bars[0].s[0] = 2;
    keepHands(next, 0);
    expect(next.sticking).toEqual(['R...............']);
  });

  it('lets a study’s named hands win on the steps they name (D60)', () => {
    const bar = snareBar('x...x...........');
    bar.t3[8] = 1;
    const pat = {
      ...patternOf([bar], ['R...R...........']),
      lanes: ['s', 't3'] as Pattern['lanes'],
      poly: {
        device: 'cross-rhythm' as const,
        ratio: '3:2',
        pulse: ['s' as const],
        cross: ['t3' as const],
        beat: 4,
        count: 4,
        hands: { t3: 'R' as const, s: 'L' as const },
      },
    };
    const next = clonePattern(pat);
    next.bars[0].t3[12] = 1;
    keepHands(next, 0);
    expect(next.sticking).toEqual(['L...L...R...R...']);
  });
});

describe('a hand the drummer cannot obey (D67)', () => {
  it('names the note an L on the ride does not reach, and nothing for one it does', () => {
    const bar = emptyBar(16);
    bar.r[0] = 1;
    bar.s[4] = 2;
    expect(unreachedAt(bar, 0, 'L')).toBe('r');
    expect(unreachedAt(bar, 0, 'R')).toBeUndefined();
    expect(unreachedAt(bar, 4, 'L')).toBeUndefined();
    expect(unreachedAt(bar, 4, null)).toBeUndefined();
    expect(unreachedAt(bar, 8, 'L')).toBeUndefined();
  });
});

describe('the critic (D68)', () => {
  const runs = (pat: Pattern) =>
    playability(pat, 90).checks.find((c) => c.label.startsWith('Snare never runs'))?.ok;

  it('calls four off one hand a run, written or not', () => {
    const row = 'RRRRLLLLRRRRLLLL';
    expect(runs(patternOf([snareBar(row)], [row]))).toBe(false);
  });

  it('takes doubles and triple strokes as the stickings they are', () => {
    expect(runs(patternOf([snareBar('RRLLRRLLRRLLRRLL')], ['RRLLRRLLRRLLRRLL']))).toBe(true);
    expect(runs(patternOf([snareBar('RRRLLLRRRLLLRRRL')], ['RRRLLLRRRLLLRRRL']))).toBe(true);
  });
});
