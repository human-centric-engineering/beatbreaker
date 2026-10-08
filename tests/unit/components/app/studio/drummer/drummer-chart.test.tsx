// @vitest-environment happy-dom

/**
 * `DrummerChart` — the chart in the corner of the drummer view: the section
 * playing and the start of the one after it, moved on only when the playhead
 * nears the edge, the section's letter and the beat of the bar.
 *
 * `useStudio()` is replaced with a hand-built fake (as `stage-playhead.test.tsx`
 * does) so `c.position` can be driven directly; the patterns are generated for
 * real and `Stave` is not mocked, so the playhead and the strip asserted are
 * the DOM the component produced. happy-dom lays nothing out, so the window's
 * width is stubbed.
 */

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DrummerChart } from '@/components/app/studio/drummer/drummer-chart';
import type { Studio } from '@/components/app/studio/studio-provider';
import type { PlayEvent, SectionLetter } from '@/lib/app/breaks/audio/transport';
import {
  CHART_SCALE,
  LEAD,
  TURN_AT,
  pageShift,
  withPreview,
} from '@/lib/app/breaks/drummer/corner-chart';
import { engrave, type StepAnchor } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { M44 } from '@/lib/app/breaks/meter';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

let fake: Studio;

vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return { ...actual, useStudio: () => fake };
});

let A: Pattern;
let B: Pattern;
const BPM = 100;
/** The chart's window, px: a bar and a half of the music at the chart's size. */
const ROOM = 400;

function studio(
  position: PlayEvent | null,
  viewMode: Studio['viewMode'] = 'both',
  arrangement: SectionLetter[] = ['A', 'B']
): Studio {
  return {
    view: { A, B },
    viewMode,
    arrangement,
    position,
    bpm: BPM,
  } as unknown as Studio;
}

/** The step anchors of the strip the chart draws: `pat`, then the start of `next`. */
function stripOf(pat: Pattern, next: Pattern) {
  const eng = engrave(withPreview(pat, next), null, {
    scale: CHART_SCALE,
    perSystem: pat.bars.length + 2,
  });
  return { map: eng.map, steps: eng.steps };
}

const centre = (a: StepAnchor) => a.x + a.w / 2;

function parts(container: HTMLElement) {
  const root = container.querySelector('.drummer-chart');
  return {
    letter: root?.querySelector('.drummer-chart-letter')?.textContent,
    beats: [...(root?.querySelectorAll('.drummer-chart-count li') ?? [])],
    lit: [...(root?.querySelectorAll('.drummer-chart-count li.now') ?? [])].map(
      (li) => li.textContent
    ),
    shift: Number(
      /translateX\((-?[\d.e-]+)px\)/.exec(
        root?.querySelector<HTMLElement>('.drummer-chart-strip')?.style.transform ?? ''
      )?.[1]
    ),
    glides: root?.querySelector<HTMLElement>('.drummer-chart-strip')?.style.transition === '',
    playhead: root?.querySelector('rect.playhead'),
    next: root?.querySelector('.drummer-chart-next')?.textContent,
  };
}

beforeEach(() => {
  const funk = testStyle('funk');
  A = generatePattern({ style: funk, meter: '4/4', seed: 7, bars: 2, density: 50, ghosts: 50 });
  B = deriveB(A, funk.params);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(ROOM);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Play `steps` of section `letter` in order, from the top, re-rendering at each. */
function playThrough(
  rerender: (ui: React.ReactElement) => void,
  letter: SectionLetter,
  secIdx: number,
  steps: number
) {
  for (let k = 0; k < steps; k++) {
    fake = studio({ t: k, letter, barIdx: Math.floor(k / 16), secIdx, slot: k % 16 });
    rerender(<DrummerChart />);
  }
}

describe('DrummerChart', () => {
  it('shows the first section, at the start, with an unlit count while stopped', () => {
    fake = studio(null, 'both', ['B', 'A']);
    const { container } = render(<DrummerChart />);
    const p = parts(container);
    expect(p.letter).toBe('B');
    expect(p.beats.map((li) => li.textContent)).toEqual(['1', '2', '3', '4']);
    expect(p.lit).toEqual([]);
    expect(p.shift).toBe(0);
    expect(p.playhead?.getAttribute('width')).toBe('0');
    expect(p.next).toBe('Next: A');
  });

  it('follows the section playing, lights its beat and puts the playhead on its step', () => {
    fake = studio(null);
    const { container, rerender } = render(<DrummerChart />);
    fake = studio({ t: 5, letter: 'B', barIdx: 0, secIdx: 1, slot: 6 });
    rerender(<DrummerChart />);
    const p = parts(container);
    expect(p.letter).toBe('B');
    // slot 6 of a 4/4 bar is the "+" of 2
    expect(p.lit).toEqual(['2']);
    // B is the last section: A comes round next
    const a = stripOf(B, A).map[6];
    expect(p.playhead?.getAttribute('x')).toBe(String(a.x));
  });

  it('keeps the line still while the playhead walks across it', () => {
    fake = studio(null);
    const { container, rerender } = render(<DrummerChart />);
    const { map } = stripOf(A, B);
    const short = map.findIndex((a) => centre(a) > ROOM * TURN_AT);
    expect(short).toBeGreaterThan(4);
    playThrough(rerender, 'A', 0, short);
    expect(parts(container).shift).toBe(0);
  });

  it('moves the line on, gliding, once the playhead passes the turn point', () => {
    fake = studio(null);
    const { container, rerender } = render(<DrummerChart />);
    const { map } = stripOf(A, B);
    const past = map.findIndex((a) => centre(a) > ROOM * TURN_AT);
    playThrough(rerender, 'A', 0, past + 1);
    const p = parts(container);
    expect(p.shift).toBeCloseTo(ROOM * LEAD - centre(map[past]));
    expect(p.glides).toBe(true);
    // and then stays put for the next step
    playThrough(rerender, 'A', 0, past + 2);
    expect(parts(container).shift).toBeCloseTo(ROOM * LEAD - centre(map[past]));
  });

  it('carries on into the next section from where its preview was, sliding back to its start', () => {
    fake = studio(null);
    const { container, rerender } = render(<DrummerChart />);
    playThrough(rerender, 'A', 0, 32);
    const before = stripOf(A, B).map;
    const ahead = centre(before[32]) + parts(container).shift;
    expect(parts(container).next).toBe('Next: B');

    fake = studio({ t: 32, letter: 'B', barIdx: 0, secIdx: 1, slot: 0 });
    rerender(<DrummerChart />);
    const x = centre(stripOf(B, A).map[0]);
    const p = parts(container);
    expect(p.letter).toBe('B');
    // the preview sat right of the line's start: the jump lands there, then glides home
    expect(ahead - x).toBeGreaterThan(0);
    expect(pageShift(ROOM, x, ahead - x)).toBe(0);
    expect(p.shift).toBe(0);
    expect(p.glides).toBe(true);
    expect(p.next).toBe('Next: A');
  });

  it('puts no playhead in the preview for a bar the section no longer has', () => {
    // A has two bars; bar 2 is a bar cut while it played, before the transport caught up
    fake = studio({ t: 0, letter: 'A', barIdx: 2, secIdx: 0, slot: 0 });
    const { container } = render(<DrummerChart />);
    expect(parts(container).playhead?.getAttribute('width')).toBe('0');
  });

  it('turns no page until the window has a width to turn it against', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0);
    fake = studio(null);
    const { container, rerender } = render(<DrummerChart />);
    const { map } = stripOf(A, B);
    const far = map.findIndex((a) => centre(a) > ROOM * TURN_AT);
    playThrough(rerender, 'A', 0, far + 1);
    // with no width every step would be past the turn point: the line stays at its start
    expect(parts(container).shift).toBe(0);
  });

  it('previews the section itself when it is played on its own', () => {
    fake = studio({ t: 0, letter: 'A', barIdx: 0, secIdx: 0, slot: 0 }, 'A', ['A', 'B']);
    const { container } = render(<DrummerChart />);
    expect(parts(container).next).toBe('Next: A');
  });

  it('marks the one of the bar apart from the other beats', () => {
    fake = studio({ t: 0, letter: 'A', barIdx: 0, secIdx: 0, slot: 1 });
    const { container } = render(<DrummerChart />);
    expect(container.querySelector('.drummer-chart-count li.now')).toHaveClass('one');
  });

  it('counts the count-in by its own meter, the line at its start', () => {
    fake = studio({ t: 3, count: true, slot: 8, meter: M44 });
    const { container } = render(<DrummerChart />);
    const p = parts(container);
    expect(p.letter).toBe('In');
    expect(p.lit).toEqual(['3']);
    expect(p.playhead?.getAttribute('width')).toBe('0');
    expect(p.shift).toBe(0);
  });

  it('counts as many beats as the meter has', () => {
    const funk = testStyle('funk');
    A = generatePattern({ style: funk, meter: '3/4', seed: 7, bars: 1, density: 50, ghosts: 50 });
    fake = studio({ t: 0, letter: 'A', barIdx: 0, secIdx: 0, slot: 9 }, 'A', ['A']);
    const { container } = render(<DrummerChart />);
    const p = parts(container);
    expect(p.beats.map((li) => li.textContent)).toEqual(['1', '2', '3']);
    expect(p.lit).toEqual(['3']);
  });

  it('draws nothing without a pattern', () => {
    fake = {
      view: { A: null, B: null },
      viewMode: 'A',
      arrangement: ['A'],
      position: null,
      bpm: BPM,
    } as unknown as Studio;
    const { container } = render(<DrummerChart />);
    expect(container.querySelector('.drummer-chart')).toBeNull();
  });
});
