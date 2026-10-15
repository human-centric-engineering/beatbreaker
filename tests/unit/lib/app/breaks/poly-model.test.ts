/**
 * A polyrhythm's streams on the pattern (Phase 12, D54, D60): carried on the
 * wire as `py`, built up by the layers, counted on the chart and by the
 * click, and played with the hands they name.
 *
 * As with written sticking, each promise has two sides: a pattern with
 * streams does the new thing, and one without them comes out exactly as it
 * did before.
 */

import { describe, expect, it } from 'vitest';

import { crossClick } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { stickingFromHands } from '@/lib/app/breaks/drummer/sticking';
import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import {
  LAYER_NAMES,
  POLY_LAYER_NAMES,
  layerName,
  layerNamesFor,
  patternLayerName,
  recordedLevel,
  reducePattern,
} from '@/lib/app/breaks/layers';
import {
  POLYRHYTHM_STYLE,
  RUDIMENT_STYLE,
  noStyleReason,
  unlistedStyleLabel,
} from '@/lib/app/breaks/library';
import { clonePattern, emptyBar } from '@/lib/app/breaks/pattern';
import { sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { breakPayload, decodeBreak, encodeBreak, packPattern } from '@/lib/app/breaks/share';
import type { Bar, Pattern, Poly } from '@/lib/app/breaks/types';

const THREE_TWO: Poly = {
  device: 'cross-rhythm',
  ratio: '3:2',
  pulse: ['s'],
  cross: ['t3'],
  beat: 4,
  count: 3,
  hands: { t3: 'R', s: 'L' },
};

/** One bar of 4/4 sextuplets: the floor tom every 4 steps (accented each half-bar), the snare every 6. */
function threeTwoBar(): Bar {
  const bar = emptyBar(24);
  for (let i = 0; i < 24; i += 4) bar.t3[i] = i % 12 ? 1 : 2;
  for (let i = 0; i < 24; i += 6) bar.s[i] = i % 12 ? 2 : 3;
  bar.k[0] = 1; // around the streams: only the full figure has it
  return bar;
}

function polyPattern(poly: Poly | null = THREE_TWO, bars: Bar[] = [threeTwoBar()]): Pattern {
  return {
    name: '3:2',
    style: POLYRHYTHM_STYLE,
    styleVersionId: null,
    attrs: {},
    meter: '4/4-6',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 't3'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    ...(poly ? { poly } : {}),
    bars,
  };
}

function doc(A: Pattern) {
  return { bpm: 60, swing: 0, level: 5, arrangement: ['A' as const], A, B: clonePattern(A) };
}

describe('on the wire', () => {
  it('packs the streams as `py` and reads them back', () => {
    const pat = polyPattern();
    expect(packPattern(pat).py).toEqual(THREE_TWO);
    expect(decodeBreak(encodeBreak(doc(pat))).A.poly).toEqual(THREE_TWO);
  });

  it('needs no new version: a pattern with streams is still the code it was', () => {
    const plain = breakPayload(doc(polyPattern(null)));
    const withPoly = breakPayload(doc(polyPattern()));
    expect(withPoly.ver).toBe(plain.ver);
    expect(withPoly.A.b).toEqual(plain.A.b);
  });

  it('decodes a code without `py` as before', () => {
    const decoded = decodeBreak(encodeBreak(doc(polyPattern(null))));
    expect(decoded.A.poly).toBeUndefined();
  });

  it('refuses streams it cannot read on the way in', () => {
    const payload = breakPayload(doc(polyPattern()));
    const bad = (py: unknown) => ({ ...payload, A: { ...payload.A, py } });
    expect(sharePayloadSchema.safeParse(bad({ ...THREE_TWO, cross: ['s'] })).success).toBe(false); // a lane in both
    expect(sharePayloadSchema.safeParse(bad({ ...THREE_TWO, device: 'polytempo' })).success).toBe(
      false
    );
    expect(sharePayloadSchema.safeParse(bad({ ...THREE_TWO, beat: 0 })).success).toBe(false);
    expect(sharePayloadSchema.safeParse(bad({ ...THREE_TWO, count: 1 })).success).toBe(false);
    expect(sharePayloadSchema.safeParse(bad({ ...THREE_TWO, beat: 32, count: 16 })).success).toBe(
      false
    ); // a cycle longer than eight bars of the longest meter
    expect(
      sharePayloadSchema.safeParse(bad({ ...THREE_TWO, ratio: 'three over two' })).success
    ).toBe(false);
  });

  it('drops unreadable streams from a stored row rather than refusing the row', () => {
    const payload = breakPayload(doc(polyPattern()));
    const stored = storedPayloadSchema.parse({
      ...payload,
      A: { ...payload.A, py: { beat: 'x' } },
    });
    expect(stored.A.py).toBeUndefined();
    expect(stored.B.py).toEqual(THREE_TWO);
  });
});

describe('the layers (D54)', () => {
  const lanes = (p: Pattern) =>
    (['k', 's', 't3'] as const).filter((L) => p.bars.some((b) => b[L].some(Boolean)));

  it('play the pulse, then the cross-rhythm, then both, then the whole figure', () => {
    const pat = polyPattern();
    expect(lanes(reducePattern(pat, 1))).toEqual(['s']);
    expect(lanes(reducePattern(pat, 2))).toEqual(['t3']);
    expect(lanes(reducePattern(pat, 3))).toEqual(['s', 't3']);
    expect(lanes(reducePattern(pat, 4))).toEqual(['s', 't3']);
    expect(reducePattern(pat, 5).bars).toEqual(pat.bars);
  });

  it('level a cross-rhythm’s accents at layer 3 and give them back at 4', () => {
    const pat = polyPattern();
    expect(reducePattern(pat, 3).bars[0].t3[0]).toBe(1);
    expect(reducePattern(pat, 3).bars[0].s[0]).toBe(2);
    expect(reducePattern(pat, 4).bars[0].t3[0]).toBe(2);
    expect(reducePattern(pat, 4).bars[0].s[0]).toBe(3);
  });

  it('keep a grouping’s accents throughout, because they are the figure', () => {
    const pat = polyPattern({ ...THREE_TWO, device: 'grouping' });
    expect(reducePattern(pat, 2).bars[0].t3[0]).toBe(2);
    expect(reducePattern(pat, 3).bars[0].t3[0]).toBe(2);
  });

  it('count the cross-rhythm first when it is felt that way round', () => {
    const pat = polyPattern();
    expect(lanes(reducePattern(pat, 1, true))).toEqual(['t3']);
    expect(lanes(reducePattern(pat, 2, true))).toEqual(['s']);
  });

  it('keep a note you placed from the layer you placed it at', () => {
    const pat = polyPattern();
    pat.pins = [{ k: Object.assign(new Array(24).fill(0), { 0: 1 }) }];
    expect(reducePattern(pat, 2).bars[0].k[0]).toBe(1);
  });

  it('thin a pattern without streams as they always did', () => {
    const groove = polyPattern(null);
    groove.style = 'funk';
    expect(reducePattern(groove, 1).bars[0].t3.some(Boolean)).toBe(false); // toms arrive at 4
    expect(reducePattern(groove, 1, true)).toEqual(reducePattern(groove, 1));
  });

  it('are named for what they play on a polyrhythm, and as ever elsewhere', () => {
    expect(layerNamesFor(true)).toBe(POLY_LAYER_NAMES);
    expect(layerNamesFor(false)).toBe(LAYER_NAMES);
    expect(layerNamesFor(false, true)).toBe(LAYER_NAMES);
    expect(patternLayerName(1, polyPattern())).toBe('Pulse');
    expect(patternLayerName(1, polyPattern(null))).toBe('Skeleton');
    expect(layerName(1, POLYRHYTHM_STYLE)).toBe('Pulse');
    expect(layerName(2, POLYRHYTHM_STYLE)).toBe('Cross-rhythm');
    expect(layerName(1)).toBe('Skeleton');
    expect(layerName(9, POLYRHYTHM_STYLE)).toBe('Layer 9');
  });

  it('trade names at 1 and 2 when counted the other way round, as their notes do', () => {
    const felt = layerNamesFor(true, true);
    expect([1, 2, 3, 4, 5].map((n) => felt[n])).toEqual([
      'Cross-rhythm',
      'Pulse',
      'Together',
      'Accented',
      'Full figure',
    ]);
    const pat = polyPattern();
    expect(reducePattern(pat, 1, true)).toEqual(reducePattern(pat, 2));
    expect(reducePattern(pat, 2, true)).toEqual(reducePattern(pat, 1));
  });

  it('keep a speed at the layer whose notes it plays', () => {
    expect(recordedLevel(1, true, true)).toBe(2);
    expect(recordedLevel(2, true, true)).toBe(1);
    expect(recordedLevel(3, true, true)).toBe(3);
    expect(recordedLevel(1, true, false)).toBe(1);
    expect(recordedLevel(1, false, true)).toBe(1);
  });
});

describe('the style key that is not a style', () => {
  it('reads as Polyrhythm, and says why it cannot be rewritten', () => {
    expect(unlistedStyleLabel(POLYRHYTHM_STYLE)).toBe('Polyrhythm');
    expect(unlistedStyleLabel(RUDIMENT_STYLE)).toBe('Rudiment');
    expect(unlistedStyleLabel('gone')).toBe('gone');
    expect(noStyleReason(POLYRHYTHM_STYLE, 'A', 'doctored')).toBe(
      'A polyrhythm is written out, not generated from a style, so it cannot be doctored'
    );
    expect(noStyleReason('gone', 'B', 'regenerated')).toBe(
      "Section B's style is not in the catalogue, so it cannot be regenerated"
    );
  });
});

describe('the hands (D60)', () => {
  it('write the hand each lane names, the shared 1 to the drum handed out first', () => {
    const row = stickingFromHands(threeTwoBar(), { t3: 'R', s: 'L' });
    // the snare is handed out before the floor tom, so the shared beats read L (the floor tom the other hand)
    expect(row).toBe('L...R.L.R...L...R.L.R...');
  });

  it('leave a step with no hand named to the drummer', () => {
    const bar = emptyBar(16);
    bar.k[0] = 1;
    bar.h[4] = 1;
    expect(stickingFromHands(bar, { r: 'R' })).toBe('.'.repeat(16));
  });
});

describe('the click on the cross-rhythm', () => {
  it('clicks every cross pulse, across the bar line, the 1 of each cycle accented', () => {
    const pat = polyPattern({ ...THREE_TWO, device: 'grouping', beat: 3, count: 16 });
    pat.meter = '4/4';
    pat.bars = [emptyBar(16), emptyBar(16), emptyBar(16)];
    const clicks = [0, 1, 2].flatMap((bar) =>
      Array.from({ length: 16 }, (_, i) => crossClick(pat, bar, i)).flatMap((c, i) =>
        (c ?? []).map((x) => `${bar}:${i}${x.at ? `+${x.at}` : ''}${x.accent ? '!' : ''}`)
      )
    );
    expect(clicks.slice(0, 7)).toEqual(['0:0!', '0:3', '0:6', '0:9', '0:12', '0:15', '1:2']);
    expect(clicks).toHaveLength(16);
  });

  it('clicks a tuplet cross pulse between the steps, where it falls (12-d)', () => {
    // five against a bar of four: a pulse every 3.2 sixteenths
    const pat = polyPattern({ ...THREE_TWO, beat: 16, count: 5, tuplet: 5 });
    pat.meter = '4/4';
    pat.bars = [emptyBar(16)];
    const clicks = Array.from({ length: 16 }, (_, i) => crossClick(pat, 0, i)).flatMap((c, i) =>
      (c ?? []).map((x) => ({ at: i + x.at, accent: x.accent }))
    );
    expect(clicks.map((c) => c.at)).toEqual(
      [0, 3.2, 6.4, 9.6, 12.8].map((x) => expect.closeTo(x, 9))
    );
    expect(clicks.map((c) => c.accent)).toEqual([true, false, false, false, false]);
  });

  it('is nothing on a pattern without streams', () => {
    expect(crossClick(polyPattern(null), 0, 0)).toBeNull();
  });
});

describe('the chart', () => {
  function texts(pat: Pattern): SvgNode[] {
    const out: SvgNode[] = [];
    const walk = (nodes: SvgNode[]) => {
      for (const n of nodes) {
        if (n.tag === 'text') out.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(engrave(pat, null, { scale: 1, perSystem: 4 }).nodes);
    return out;
  }

  it('numbers the cross pulses and names the ratio, whatever the guides say', () => {
    // the count row's numbers, not the sextuplet meter's own italic 6s
    const t = texts(polyPattern()).filter(
      (n) => n.attrs['font-style'] === 'italic' && n.attrs['font-family'] === 'var(--f-mono)'
    );
    expect(t.map((n) => n.text)).toEqual(['1', '2', '3', '1', '2', '3']);
    expect(texts(polyPattern()).some((n) => n.text === '3:2')).toBe(true);
  });

  it('prints R+L where both hands land on two drums together', () => {
    const pat = polyPattern();
    pat.sticking = [stickingFromHands(pat.bars[0], THREE_TWO.hands!)];
    // the first also has the kick under it
    expect(
      texts(pat)
        .filter((n) => n.text?.startsWith('R+L'))
        .map((n) => n.text)
    ).toEqual(['R+L ●', 'R+L']);
  });

  it('prints the written hand where a pattern without named hands has two drums together', () => {
    const pat = polyPattern(null);
    pat.style = 'funk';
    pat.sticking = [stickingFromHands(pat.bars[0], THREE_TWO.hands!)];
    expect(texts(pat).some((n) => n.text?.startsWith('R+L'))).toBe(false);
    expect(texts(pat).some((n) => n.text === 'L ●')).toBe(true);
  });

  it('marks a cycle that ends inside a bar, and none that ends on a bar line', () => {
    const dashed = (pat: Pattern) =>
      engrave(pat, null, { scale: 1, perSystem: 4 }).nodes.filter(
        (n) => n.tag === 'line' && n.attrs['stroke-dasharray']
      ).length;
    expect(dashed(polyPattern())).toBe(0); // a 3:2 comes round every half-bar
    const threes = polyPattern({ ...THREE_TWO, device: 'polymeter', beat: 4, count: 3 });
    threes.meter = '4/4';
    threes.bars = [emptyBar(16), emptyBar(16), emptyBar(16)];
    expect(dashed(threes)).toBe(3); // a 3/4 cycle every 12 steps: at 12, 24 and 36 (not 48, the end)
  });

  it('draws a pattern without streams as before', () => {
    const t = texts(polyPattern(null));
    expect(
      t.some(
        (n) => n.attrs['font-style'] === 'italic' && n.attrs['font-family'] === 'var(--f-mono)'
      )
    ).toBe(false);
    expect(t.some((n) => n.text === '3:2')).toBe(false);
  });
});

describe('the critic', () => {
  it('asks no air of a polyrhythm, and the same of anything else as before', () => {
    const dense = threeTwoBar();
    for (let i = 0; i < 24; i += 2) dense.s[i] = 2;
    for (let i = 1; i < 24; i += 2) dense.k[i] = 1;
    const air = (p: Pattern) =>
      playability(p, 60).checks.find((c) => c.label.startsWith('At least a quarter'))?.ok;
    expect(air(polyPattern(THREE_TWO, [dense]))).toBe(true);
    expect(air(polyPattern(null, [dense]))).toBe(false);
  });
});
