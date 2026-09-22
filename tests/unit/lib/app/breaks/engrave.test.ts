/**
 * The engraver's notation contract — which glyph stands for which sound, and
 * the clearances that keep two glyphs from being drawn through each other.
 *
 * Nothing else pins this. `engrave()` is exercised indirectly by the generator
 * and library suites, which read the node tree for structure and never ask what
 * a hi-hat looks like — so a changed constant could swap a notehead, or draw a
 * stem through a ring, with the whole suite still green. Both happened while
 * this file was being written.
 */

import { describe, expect, it } from 'vitest';

import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, Pattern } from '@/lib/app/breaks/types';

/** One bar, 4/4, at scale 1 — so every number below reads in staff spaces. */
const SP = 10;

/** Where an up-stem is drawn, mirrored from the engraver: `x + 0.62 SP`. */
const STEM_DX = 0.62 * SP;

function patternOf(edit: (bar: Bar) => void, lanes: Pattern['lanes'] = ['k', 's', 'h']): Pattern {
  const bar = emptyBar(16);
  edit(bar);
  return {
    name: 'test',
    style: 'funk16',
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes,
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: lanes.includes('r'),
    hasHat: lanes.includes('h'),
    pins: null,
    bars: [bar],
  };
}

/** Engrave one bar carrying just the hits `edit` sets. */
function nodesOf(edit: (bar: Bar) => void, lanes?: Pattern['lanes']): SvgNode[] {
  return engrave(patternOf(edit, lanes), null, { scale: 1, perSystem: 1 }).nodes;
}

const circles = (nodes: SvgNode[]): SvgNode[] => nodes.filter((n) => n.tag === 'circle');
const polygons = (nodes: SvgNode[]): SvgNode[] => nodes.filter((n) => n.tag === 'polygon');

describe('the engraver’s noteheads', () => {
  it('writes a closed hi-hat as a bare X — two crossed lines, no ring', () => {
    const nodes = nodesOf((bar) => {
      bar.h[0] = 1;
    });
    expect(circles(nodes)).toHaveLength(0);
  });

  it('writes an open hi-hat as a circled X: one ring, centred on the notehead', () => {
    const nodes = nodesOf((bar) => {
      bar.h[0] = 3;
    });
    const rings = circles(nodes);
    expect(rings).toHaveLength(1);

    const ring = rings[0];
    const hatX = Number(ring.attrs.cx);
    /* The ring is ON the head, not floating above it: every X stroke of that
       notehead has the ring's centre inside its own box. A detached mark would
       sit a staff space or more clear of them. */
    const strokes = nodes.filter(
      (n) =>
        n.tag === 'line' && Math.abs(Number(n.attrs.x1) - hatX) < SP && n.attrs.x1 !== n.attrs.x2
    );
    expect(strokes.length).toBeGreaterThanOrEqual(2);
    for (const s of strokes) {
      const lo = Math.min(Number(s.attrs.y1), Number(s.attrs.y2));
      const hi = Math.max(Number(s.attrs.y1), Number(s.attrs.y2));
      expect(Number(ring.attrs.cy)).toBeGreaterThanOrEqual(lo);
      expect(Number(ring.attrs.cy)).toBeLessThanOrEqual(hi);
    }
  });

  it('keeps the open-hat ring inside the stem, so the note is not drawn through its own mark', () => {
    const nodes = nodesOf((bar) => {
      bar.h[0] = 3;
    });
    const ring = circles(nodes)[0];
    /* The regression this file exists for: at r 0.78 SP the up-stem, drawn at
       x + 0.62 SP, passed inside the ring and sliced it on every open hat. */
    expect(Number(ring.attrs.r)).toBeLessThan(STEM_DX);
  });

  it('keeps the ring within the X’s own footprint, clear of the neighbouring lanes', () => {
    const nodes = nodesOf((bar) => {
      bar.h[0] = 3;
    });
    const ring = circles(nodes)[0];
    /* Half a staff space (0.5 SP) separates the hat from the ride below and the
       crash's ledger line above; the X itself reaches 0.56 SP. A ring wider
       than the X puts ink on a lane that is not this note's. */
    expect(Number(ring.attrs.r)).toBeLessThanOrEqual(0.56 * SP + 0.02 * SP);
  });

  it('writes the ride bell as a diamond, not a second circled X', () => {
    const nodes = nodesOf(
      (bar) => {
        bar.r[0] = 2;
      },
      ['k', 's', 'r']
    );
    expect(polygons(nodes)).toHaveLength(1);
    /* The bell may never be a ring: an open hat is a ring one half-space away,
       and at chart size the two would be the same glyph. */
    expect(circles(nodes)).toHaveLength(0);
  });

  it('cuts the bell diamond wider than it is tall, inside the X’s vertical footprint', () => {
    const nodes = nodesOf(
      (bar) => {
        bar.r[0] = 2;
      },
      ['k', 's', 'r']
    );
    const pts = String(polygons(nodes)[0].attrs.points)
      .split(' ')
      .map((p) => p.split(',').map(Number) as [number, number]);
    const xsOf = pts.map(([x]) => x);
    const ysOf = pts.map(([, yv]) => yv);
    const halfW = (Math.max(...xsOf) - Math.min(...xsOf)) / 2;
    const halfH = (Math.max(...ysOf) - Math.min(...ysOf)) / 2;

    expect(halfW).toBeGreaterThan(halfH);
    /* A solid fill taller than the X it replaced would cover the hi-hat
       position half a space above, where two thin strokes had been see-through. */
    expect(halfH).toBeLessThanOrEqual(0.56 * SP + 0.02 * SP);
  });
});
