/**
 * Which sections the server's critic judges on brushes (D86): a section's own
 * kit, else its song's, else its style's, where that kit is a brushed one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  listKits: vi.fn(),
  listStyles: vi.fn(),
}));

import { brushedIn, brushedKit, loadBrushed } from '@/lib/app/breaks/catalogue/brushes';
import { listKits, listStyles } from '@/lib/app/breaks/catalogue/data';
import { songBreak } from '@/lib/app/breaks/song-break';
import { viewSection } from '@/lib/app/breaks/buddy/describe';
import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Pattern } from '@/lib/app/breaks/types';
import { testKits, testStyle, testStyles } from '@/tests/helpers/catalogue';

const KITS = Object.values(testKits());
const STYLES = Object.values(testStyles());
const COBB = testStyle('jimmycobb');

function sections(song: string) {
  return songBreak({
    style: COBB,
    song,
    bars: 4,
    density: 50,
    ghosts: 50,
    seed: 7,
    bpm: 137,
  }).sections;
}

beforeEach(() => {
  vi.mocked(listKits).mockResolvedValue(KITS);
  vi.mocked(listStyles).mockResolvedValue(STYLES);
});

describe('brushedKit', () => {
  it('knows a brushed kit by key, and nothing else', () => {
    const brushed = brushedKit(KITS);
    expect(brushed('jazzBrushes')).toBe(true);
    expect(brushed('virtuosity')).toBe(false);
    expect(brushed('nope')).toBe(false);
    expect(brushed(undefined)).toBe(false);
  });
});

describe('brushedIn', () => {
  const brushed = brushedIn(KITS, STYLES);

  it('puts So What’s theme on brushes, by its own kit, and Davis’s solo on the song’s sticks', () => {
    const made = sections('so-what');
    expect(brushed(made.A)).toBe(true);
    expect(made.B && brushed(made.B)).toBe(false);
  });

  it('puts a song on brushes throughout on brushes, by the song’s kit', () => {
    const made = sections('blue-in-green');
    expect(made.A).not.toHaveProperty('kit');
    expect(brushed(made.A)).toBe(true);
  });

  it('reads a section’s own kit when its style has left the catalogue, and nothing more', () => {
    const made = sections('so-what');
    expect(brushed({ ...made.A, style: 'gone' })).toBe(true);
    expect(made.B && brushed({ ...made.B, style: 'gone' })).toBe(false);
  });
});

describe('loadBrushed', () => {
  it('reads the catalogue’s kits and styles', async () => {
    const brushed = await loadBrushed();
    expect(brushed(sections('so-what').A)).toBe(true);
    expect(listKits).toHaveBeenCalled();
    expect(listStyles).toHaveBeenCalled();
  });
});

describe('BeatBuddy’s reading of a section on brushes', () => {
  it('fails a stick’s double on the ride a brush cannot play, and only on brushes', () => {
    const p = generatePattern({
      style: testStyle('funk'),
      meter: '4/4',
      seed: 5,
      bars: 1,
      density: 50,
      ghosts: 0,
    });
    const bar = emptyBar(16);
    bar.r = Array.from({ length: 16 }, (_, i) => (i % 4 < 2 ? 1 : 0));
    const pairs: Pattern = { ...p, attrs: {}, sticking: undefined, bars: [bar] };
    // a ride alone has no backbeat either way: what brushes add is the hands
    const sticks = viewSection(pairs, 'A', 280, 0).critic.failing;
    const brushes = viewSection(pairs, 'A', 280, 0, true).critic.failing;
    expect(brushes.length).toBeGreaterThan(sticks.length);
    expect(brushes.filter((f) => !sticks.includes(f))).not.toEqual([]);
  });
});
