import { describe, expect, it } from 'vitest';

import type { SectionLetter } from '@/lib/app/breaks/audio/transport';
import {
  centreOf,
  firstSection,
  LEAD,
  nextSection,
  pageShift,
  PREVIEW_BARS,
  TURN_AT,
  withPreview,
} from '@/lib/app/breaks/drummer/corner-chart';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const both = () => true;
const onlyA = (l: SectionLetter) => l === 'A';

describe('nextSection', () => {
  it('follows the arrangement, round to the start', () => {
    expect(nextSection(['A', 'A', 'B'], 'both', 1, 'A', both)).toBe('B');
    expect(nextSection(['A', 'A', 'B'], 'both', 2, 'B', both)).toBe('A');
  });

  it('skips what a one-section view leaves out, as the transport does', () => {
    expect(nextSection(['A', 'B', 'A'], 'A', 0, 'A', both)).toBe('A');
    expect(nextSection(['A', 'B', 'B'], 'B', 1, 'B', both)).toBe('B');
  });

  it('skips a section with no pattern', () => {
    expect(nextSection(['A', 'B'], 'both', 0, 'A', onlyA)).toBe('A');
  });

  it('is the section itself when it is played outside the arrangement', () => {
    expect(nextSection(['A'], 'B', -1, 'B', both)).toBe('B');
    expect(nextSection(['A'], 'B', undefined, 'B', both)).toBe('B');
  });
});

describe('firstSection', () => {
  it('is the first the view plays', () => {
    expect(firstSection(['B', 'A'], 'both', both)).toBe('B');
    expect(firstSection(['B', 'A'], 'A', both)).toBe('A');
  });

  it('is the section in view when the arrangement never calls it', () => {
    expect(firstSection(['A'], 'B', both)).toBe('B');
  });
});

describe('withPreview', () => {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 3,
    bars: 4,
    density: 50,
    ghosts: 50,
  });
  const B = deriveB(A, funk.params);

  it('adds the first bars of the next section after this one', () => {
    const out = withPreview(A, B);
    expect(out.bars).toEqual([...A.bars, ...B.bars.slice(0, PREVIEW_BARS)]);
    expect(A.bars).toHaveLength(4);
  });

  it('draws every lane either section plays', () => {
    const next: Pattern = { ...B, lanes: [...B.lanes, 't3'] };
    const out = withPreview({ ...A, lanes: A.lanes.filter((l) => l !== 't3') }, next);
    expect(out.lanes).toContain('t3');
  });

  it('leaves a next section in another meter off', () => {
    const waltz = generatePattern({
      style: funk,
      meter: '3/4',
      seed: 3,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    expect(withPreview(A, waltz)).toBe(A);
    expect(withPreview(A, null)).toBe(A);
  });
});

describe('pageShift', () => {
  const room = 1000;

  it('leaves the line where it is while the playhead is short of the turn point', () => {
    expect(pageShift(room, 100, 0)).toBe(0);
    expect(pageShift(room, room * TURN_AT, 0)).toBe(0);
    expect(pageShift(room, 900, -300)).toBe(-300);
  });

  it('moves the line on once the playhead passes it, the playhead put back near the left', () => {
    const shift = pageShift(room, room * TURN_AT + 1, 0);
    expect(shift).toBe(room * LEAD - (room * TURN_AT + 1));
    expect(room * TURN_AT + 1 + shift).toBe(room * LEAD);
  });

  it('brings a playhead that has gone off the left back into view', () => {
    expect(pageShift(room, 300, -400)).toBe(room * LEAD - 300);
  });

  it('never leaves a gap before the start of the line', () => {
    // a section just come in, put where its preview was: back to its clef
    expect(pageShift(room, 40, 500)).toBe(0);
    // a playhead near the start, off the left: the line back to its start, not past it
    expect(pageShift(room, 50, -100)).toBe(0);
  });
});

describe('centreOf', () => {
  it('is the middle of the anchor', () => {
    expect(centreOf({ x: 20, y: 0, w: 10, h: 1 })).toBe(25);
  });
});
