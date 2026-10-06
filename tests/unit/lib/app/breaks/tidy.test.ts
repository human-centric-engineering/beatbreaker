/**
 * `tidy()` — the deterministic clean-up behind "tidy up notes". One test per
 * rule, then the two properties that make it safe to run on anything: it never
 * adds a note, and a tidy pattern comes back unchanged.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { type BarSpec, clonePattern, parseBar } from '@/lib/app/breaks/pattern';
import { tidy } from '@/lib/app/breaks/tidy';
import type { Pattern } from '@/lib/app/breaks/types';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

function patternOf(specs: BarSpec[], extra: Partial<Pattern> = {}): Pattern {
  return {
    name: 'test',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    pins: null,
    bars: specs.map((s) => parseBar(s)),
    ...extra,
  };
}

function noteCount(p: Pattern): number {
  return p.bars.reduce(
    (n, b) => n + LANES.reduce((m, L) => m + b[L].filter((v) => v).length, 0),
    0
  );
}

describe('tidy', () => {
  it('drops notes in a lane the pattern does not carry', () => {
    const pat = patternOf([{ k: 'X...............', t1: '....X...........' }]);
    const { pattern, changes } = tidy(pat);
    expect(pattern.bars[0].t1.every((v) => v === 0)).toBe(true);
    expect(changes).toEqual([
      {
        rule: 'lane',
        bar: 1,
        lane: 't1',
        step: 4,
        note: 'bar 1, beat 2: removed the high tom — that lane is not on this kit',
      },
    ]);
  });

  it('resolves a hat under a ride by keeping the louder, then the time-keeper', () => {
    const louder = tidy(patternOf([{ h: 'x...............', r: 'b...............' }]));
    expect(louder.pattern.bars[0].h[0]).toBe(0);
    expect(louder.pattern.bars[0].r[0]).toBe(2);

    const tieOnHat = tidy(
      patternOf([{ h: 'x...............', r: 'r...............' }], { voice: 'hat' })
    );
    expect(tieOnHat.pattern.bars[0].r[0]).toBe(0);
    expect(tieOnHat.changes[0].rule).toBe('ride-clash');

    const tieOnRide = tidy(
      patternOf([{ h: 'x...............', r: 'r...............' }], { voice: 'ride' })
    );
    expect(tieOnRide.pattern.bars[0].h[0]).toBe(0);
  });

  it('leaves two hands alone and takes a third away, quietest first', () => {
    const two = tidy(patternOf([{ h: 'X...............', s: 'S...............' }]));
    expect(two.changes).toEqual([]);

    const three = tidy(
      patternOf([{ h: 'x...............', s: 'S...............', c: 'C...............' }])
    );
    expect(three.changes.map((c) => [c.rule, c.lane])).toEqual([['hands', 'h']]);
    expect(three.pattern.bars[0].s[0]).toBe(3);
    expect(three.pattern.bars[0].c[0]).toBe(1);
  });

  it('removes a ghost directly beside a snare accent, and keeps one a step further off', () => {
    const { pattern, changes } = tidy(patternOf([{ s: '...gS.g.g.......' }]));
    expect(pattern.bars[0].s.slice(0, 9)).toEqual([0, 0, 0, 0, 3, 0, 1, 0, 1]);
    expect(changes.map((c) => c.step)).toEqual([3]);
    expect(changes[0].note).toBe(
      "bar 1, the 'a' of 1: removed the ghost — a ghost right beside an accent is lost under it"
    );
  });

  it('removes a foot chick under an open hat', () => {
    const pat = patternOf([{ h: 'o...............', hf: 'f...f...........' }], {
      lanes: ['k', 's', 'h', 'hf'],
    });
    const { pattern, changes } = tidy(pat);
    expect(pattern.bars[0].hf.slice(0, 5)).toEqual([0, 0, 0, 0, 1]);
    expect(changes.map((c) => c.rule)).toEqual(['open-hat-foot']);
  });

  it('clears pins left with no note under them, including ones the other rules orphaned', () => {
    const pat = patternOf([{ s: '...gS...........', k: 'X...............' }]);
    pat.pins = [{ s: [0, 0, 0, 4, 0], k: [3] }];
    const { pattern, changes } = tidy(pat);
    expect(changes.map((c) => c.rule)).toEqual(['ghost-accent', 'pin']);
    expect(pattern.pins).toEqual([{ k: [3] }]);

    const orphanOnly = patternOf([{ k: 'X...............' }]);
    orphanOnly.pins = [{ s: [0, 2] }];
    expect(tidy(orphanOnly).pattern.pins).toBeNull();
  });

  it('does not touch its input', () => {
    const pat = patternOf([{ h: 'x...............', r: 'r...............' }]);
    const before = clonePattern(pat);
    tidy(pat);
    expect(pat).toEqual(before);
  });

  it('never adds a note, and a tidied pattern tidies to itself — across the library and every meter', () => {
    const pats: Pattern[] = LIBRARY.map((item, i) =>
      patternFromLibrary(item, i, STYLES[item.style] ? testStyle(item.style) : undefined)
    );
    for (const meter of METER_KEYS) {
      for (const style of ['funk', 'samba', 'jazz', 'dilla']) {
        if (!STYLES[style]) continue;
        const p = generatePattern({
          style: testStyle(style),
          seed: 11,
          bars: 2,
          density: 80,
          ghosts: 90,
          meter,
        });
        // make it messy: a ride over every hat, and a tom the kit does not have
        p.bars.forEach((b) => {
          b.h.forEach((v, i) => {
            if (v) b.r[i] = 1;
          });
          if (!p.lanes.includes('t2')) b.t2[0] = 1;
        });
        pats.push(p);
      }
    }
    let changed = 0;
    for (const p of pats) {
      const once = tidy(p);
      changed += once.changes.length;
      expect(noteCount(once.pattern)).toBeLessThanOrEqual(noteCount(p));
      for (const c of once.changes)
        if (c.rule !== 'pin') expect(p.bars[c.bar - 1][c.lane][c.step]).toBeGreaterThan(0);
      const twice = tidy(once.pattern);
      expect(twice.changes, p.name).toEqual([]);
      expect(twice.pattern).toEqual(once.pattern);
    }
    // the messy patterns really were messy, so the properties were tested on real changes
    expect(changed).toBeGreaterThan(pats.length);
  });
});

describe('tidy — percussion and the two hands', () => {
  /** Hat, snare and a percussion note on step 4, with `inst` in the first slot. */
  function withPerc(inst: string): Pattern {
    const p = patternOf([{ h: 'x.x.x.x.x.x.x.x.', s: '....s.......s...' }], {
      lanes: ['k', 's', 'h', 'r', 'c', 'p1'],
      perc: { p1: inst },
    });
    p.bars[0].p1[4] = 1;
    return p;
  }

  it('leaves a tambourine beside hat and snare: it is the percussionist’s, not a third hand', () => {
    const { pattern, changes } = tidy(withPerc('tamb'));
    expect(changes.filter((c) => c.rule === 'hands')).toEqual([]);
    expect(pattern.bars[0].p1[4]).toBe(1);
  });

  it('takes a note off a step where a cowbell on the kit makes three hands', () => {
    const { changes } = tidy(withPerc('cowbell'));
    expect(changes.filter((c) => c.rule === 'hands')).toHaveLength(1);
  });
});
