/**
 * Random on the stage: one pattern from everything the Studio holds, so a
 * drummer, a style or an exercise comes up in proportion to its patterns.
 */

import { describe, expect, it } from 'vitest';

import { randomPick, randomPool } from '@/lib/app/breaks/catalogue/random-pick';
import { makeRng } from '@/lib/app/breaks/rng';
import { testCatalogue, testPolyrhythms, testRudiments } from '@/tests/helpers/catalogue';

const cat = { ...testCatalogue() };
cat.libraries = [...cat.libraries, testRudiments(), testPolyrhythms()];
const pool = randomPool(cat);
const weightOf = (match: (p: (typeof pool)[number][0]) => boolean) =>
  pool.filter(([p]) => match(p)).reduce((n, [, w]) => n + w, 0);

describe('randomPool', () => {
  it('gives a drummer one pattern for each of their songs, each naming the song', () => {
    const songs = cat.styles.mitchell.params.songs ?? [];
    const mine = pool.filter(([p]) => p.kind === 'drummer' && p.style === 'mitchell');
    expect(mine.map(([p]) => (p.kind === 'drummer' ? p.song : null))).toEqual(
      songs.map((sg) => sg.key)
    );
    expect(mine.every(([, w]) => w === 1)).toBe(true);
  });

  it('gives a style without songs one pattern for each of its grooves, and one if it lists none', () => {
    const figures = cat.styles.rock.params.figures?.length ?? 0;
    expect(figures).toBeGreaterThan(1);
    expect(weightOf((p) => p.kind === 'style' && p.style === 'rock')).toBe(figures);
    // funk is written from its rules, not a list of grooves
    expect(cat.styles.funk.params.figures).toBeUndefined();
    expect(weightOf((p) => p.kind === 'style' && p.style === 'funk')).toBe(1);
  });

  it('gives every rudiment and polyrhythm one, and nothing to the famous breaks', () => {
    const exercises = testRudiments().entries.length + testPolyrhythms().entries.length;
    expect(weightOf((p) => p.kind === 'exercise')).toBe(exercises);
    const famous = new Set(cat.libraries[0].entries.map((e) => e.id));
    expect(pool.some(([p]) => p.kind === 'exercise' && famous.has(p.entryId))).toBe(false);
  });

  it('holds each style the picker shows once, and only those', () => {
    const shown = new Set(cat.styleGroups.flatMap(([, keys]) => keys));
    const styles = pool.flatMap(([p]) => (p.kind === 'exercise' ? [] : [p.style]));
    expect(new Set(styles)).toEqual(shown);
    // a style filed twice is still counted once
    const twice = {
      ...cat,
      styleGroups: [...cat.styleGroups, ['Again', ['funk']] as [string, string[]]],
    };
    expect(
      randomPool(twice).filter(([p]) => p.kind === 'style' && p.style === 'funk')
    ).toHaveLength(1);
  });
});

describe('randomPick', () => {
  it('comes up with each kind in proportion to its patterns', () => {
    const rng = makeRng(7);
    const n = 6000;
    const counts = { drummer: 0, style: 0, exercise: 0 };
    for (let i = 0; i < n; i++) counts[randomPick(cat, rng)!.kind]++;
    const total = weightOf(() => true);
    for (const kind of ['drummer', 'style', 'exercise'] as const) {
      const share = weightOf((p) => p.kind === kind) / total;
      expect(counts[kind] / n).toBeCloseTo(share, 1);
    }
  });

  it('picks nothing from an empty catalogue', () => {
    const empty = { ...cat, styles: {}, styleGroups: [], libraries: [] };
    expect(randomPick(empty, Math.random)).toBeNull();
  });
});
