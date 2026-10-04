/**
 * Goldens: what the engraver draws, what the generator writes and what the
 * MIDI export sends, for every library break and every style, as files.
 *
 * They were written from the code as it stood before 9-iv added the new
 * articulations (rimshot, flam, drag, buzz, half-open hat, crash 2, china,
 * splash), so a pattern that uses none of them must still produce these bytes.
 * Nothing else pins the output itself: the sweeps in `generate.test.ts` and
 * `library.test.ts` check shapes, and a changed constant in the engraver or a
 * new draw from the generator's stream would pass them.
 *
 * A golden that fails here means existing output moved. That is a decision,
 * not a refresh: update with `vitest -u` only when the move is the point.
 */

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { generateGood } from '@/lib/app/breaks/critic';
import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { reducePattern } from '@/lib/app/breaks/layers';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { buildMidi } from '@/lib/app/breaks/midi';
import { packPattern } from '@/lib/app/breaks/share';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { TEST_STYLE_KEYS, testStyle, testStyles } from '@/tests/helpers/catalogue';

const DIR = './__goldens__';

/** The node tree as SVG text, one element per line, attributes in the order drawn. */
function toSvg(nodes: SvgNode[], width: number, height: number): string {
  const esc = (s: string | number): string =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const one = (n: SvgNode, depth: number): string => {
    const pad = '  '.repeat(depth);
    const attrs = Object.entries(n.attrs)
      .map(([k, v]) => ` ${k}="${esc(v)}"`)
      .join('');
    if (n.children?.length) {
      return `${pad}<${n.tag}${attrs}>\n${n.children.map((c) => one(c, depth + 1)).join('\n')}\n${pad}</${n.tag}>`;
    }
    if (n.text !== undefined) return `${pad}<${n.tag}${attrs}>${esc(n.text)}</${n.tag}>`;
    return `${pad}<${n.tag}${attrs}/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n${nodes.map((n) => one(n, 1)).join('\n')}\n</svg>\n`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

const LIB = LIBRARY.map((item, index) => ({
  name: `${String(index).padStart(2, '0')}-${slug(item.title)}`,
  pat: patternFromLibrary(item, index, STYLES[item.style] ? testStyle(item.style) : undefined),
}));

const RESOLVED = testStyles();
const GENERATED = TEST_STYLE_KEYS.map((key) => ({
  key,
  pat: generateGood({ style: RESOLVED[key], seed: 20261004, bars: 4, density: 50, ghosts: 50 }, 100)
    .pattern,
}));

function sha(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function engraved(pat: Pattern, ghost: Pattern | null): string {
  const e = engrave(pat, ghost, { scale: 1, perSystem: 2, guides: true, sticking: true });
  return toSvg(e.nodes, e.width, e.height);
}

describe('the goldens written before 9-iv', () => {
  /* The corpus is pinned by hash: as SVG it is 2.6 MB of text nobody reads.
     When one moves, `toSvg` it and diff the two by eye. */
  it('engraves every library break as it did', async () => {
    const all = Object.fromEntries(LIB.map(({ name, pat }) => [name, sha(engraved(pat, null))]));
    await expect(`${JSON.stringify(all, null, 1)}\n`).toMatchFileSnapshot(
      `${DIR}/engrave/library.json`
    );
  });

  it('engraves a break of every style at layer 3, the full break faded behind it, as it did', async () => {
    const all = Object.fromEntries(
      GENERATED.map(({ key, pat }) => [key, sha(engraved(reducePattern(pat, 3), pat))])
    );
    await expect(`${JSON.stringify(all, null, 1)}\n`).toMatchFileSnapshot(
      `${DIR}/engrave/styles.json`
    );
  });

  it('generates the same bytes for every style', async () => {
    const all = Object.fromEntries(GENERATED.map(({ key, pat }) => [key, packPattern(pat)]));
    await expect(`${JSON.stringify(all, null, 1)}\n`).toMatchFileSnapshot(
      `${DIR}/generate/styles.json`
    );
  });

  it('sends the same MIDI for every library break, quantised and humanised', async () => {
    const all = Object.fromEntries(
      LIB.map(({ name, pat }) => {
        const seq = pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx }));
        const base = { bpm: 96, swing: 20, feel: 100, hats: 100 };
        return [
          name,
          {
            quantised: buildMidi(seq, base).base64,
            humanised: buildMidi(seq, { ...base, humanise: { amount: 75, seed: 7 } }).base64,
          },
        ];
      })
    );
    await expect(`${JSON.stringify(all, null, 1)}\n`).toMatchFileSnapshot(
      `${DIR}/midi/library.json`
    );
  });
});

/* ---- 9-iv's articulations ---------------------------------------------
   One bar each, the articulation on beat 2 with a plain kick and hat around it
   for scale, as SVG: small enough to read, and the thing to look at when one
   moves. */

const ARTICULATIONS: Array<{ name: string; lane: LaneKey; value: number }> = [
  { name: 'snare-rimshot', lane: 's', value: 5 },
  { name: 'snare-flam', lane: 's', value: 6 },
  { name: 'snare-drag', lane: 's', value: 7 },
  { name: 'snare-buzz', lane: 's', value: 8 },
  { name: 'hat-half-open', lane: 'h', value: 4 },
  { name: 'crash-2', lane: 'c', value: 2 },
  { name: 'china', lane: 'c', value: 3 },
  { name: 'splash', lane: 'c', value: 4 },
  { name: 'tom-flam', lane: 't2', value: 3 },
];

function oneBar(lane: LaneKey, value: number): Pattern {
  const bar = emptyBar(16);
  bar.k[0] = 1;
  bar.k[8] = 1;
  if (lane !== 'h') for (const i of [0, 2, 8, 10, 12, 14]) bar.h[i] = 1;
  bar[lane][4] = value;
  if (lane !== 's') bar.s[12] = 2;
  return {
    name: 'articulation',
    style: 'rock',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'c', 't1', 't2', 't3'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: [bar],
  };
}

describe('the articulations 9-iv added', () => {
  it.each(ARTICULATIONS)('engraves the $name', async ({ name, lane, value }) => {
    const e = engrave(oneBar(lane, value), null, { scale: 1, perSystem: 1, sticking: true });
    await expect(toSvg(e.nodes, e.width, e.height)).toMatchFileSnapshot(
      `${DIR}/engrave/articulations/${name}.svg`
    );
  });
});
