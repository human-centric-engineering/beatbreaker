/**
 * Share codes — the wire format a saved break, a `#b=` link and a pasted code
 * all use. A code is untrusted input a stranger pasted in, so the tests are as
 * much about what is refused as about what round-trips.
 */

import { describe, expect, it } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { setPin, styleAttrs } from '@/lib/app/breaks/pattern';
import { patternSchema, sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import {
  type BreakDoc,
  SHARE_VERSION,
  breakDocFromPayload,
  decodeBreak,
  encodeBreak,
} from '@/lib/app/breaks/share';
import { TEST_STYLE_KEYS, testStyle, testStyles } from '@/tests/helpers/catalogue';

/**
 * A `StyleLookup`, as the Studio hands one to `decodeBreak`.
 *
 * `lib/app/breaks` owns no style table from Phase 2 on, so a code older than v4
 * — which names a style and carries no snapshot — gets its attributes back only
 * if the caller offers a lookup. Both paths are exercised below.
 */
const STYLES = testStyles();
const lookup = (key: string) => STYLES[key];

function docFor(style: string, meter = '4/4'): BreakDoc {
  const resolved = testStyle(style);
  const A = generatePattern({
    style: resolved,
    meter,
    seed: 2024,
    bars: 2,
    density: 60,
    ghosts: 40,
  });
  const B = deriveB(A, resolved.params);
  // a pin on a note placed at L2 and one at L4, in different bars and lanes
  setPin(A, 0, 's', 3, 2);
  setPin(A, 1, 'k', 7, 4);
  return { bpm: 97, swing: 23, level: 3, arrangement: ['A', 'B', 'A', 'B'], A, B };
}

function b64(obj: unknown): string {
  return btoa(JSON.stringify(obj));
}

/** A code written by the pre-Phase-2 encoder: it names a style, and carries
 *  neither the style version (`sv`) nor the style snapshot (`sa`). */
const V3_CODE = b64({
  ver: 3,
  bpm: 97,
  sw: 23,
  lv: 3,
  arr: ['A', 'B'],
  A: {
    n: 'Old code',
    st: 'dilla',
    v: 'hat',
    sd: 7,
    bb: [4, 12],
    mt: '4/4',
    b: ['1000100010001000|0000100000001000|2222222222222222'],
  },
  B: { b: ['1000100010001000|0000100000001000|2222222222222222'] },
});

describe('encodeBreak / decodeBreak', () => {
  it('round-trips value for value in every style, pins included', () => {
    for (const style of TEST_STYLE_KEYS) {
      const doc = docFor(style);
      const back = decodeBreak(encodeBreak(doc));
      expect(back).toEqual(doc);
    }
  });

  it('round-trips a non-4/4 meter and keeps its step count', () => {
    const doc = docFor('funk', '7/8');
    const back = decodeBreak(encodeBreak(doc));
    expect(back.A.meter).toBe('7/8');
    expect(back.A.bars[0].k).toHaveLength(doc.A.bars[0].k.length);
    expect(back).toEqual(doc);
  });

  it('writes the current version', () => {
    expect(SHARE_VERSION).toBe(4);
    const raw: unknown = JSON.parse(atob(encodeBreak(docFor('funk'))));
    expect(sharePayloadSchema.parse(raw).ver).toBe(SHARE_VERSION);
  });

  it('carries the style version and the style snapshot on the wire (v4)', () => {
    const dilla = testStyle('dilla');
    const raw = sharePayloadSchema.parse(JSON.parse(atob(encodeBreak(docFor('dilla')))));

    // provenance: which style row, and which version of it
    expect(raw.A.st).toBe('dilla');
    expect(raw.A.sv).toBe(dilla.versionId);
    // and the facts playback, the critic and the MIDI export read, so the code
    // stands on its own on an installation that has never heard of the style
    expect(raw.A.sa).toEqual(styleAttrs(dilla.params));
    expect(raw.A.sa?.feel?.label).toBe('Dilla time');
    expect(raw.B.sv).toBe(dilla.versionId);

    // and both come back, with no style lookup offered at all
    const back = decodeBreak(encodeBreak(docFor('dilla')));
    expect(back.A.styleVersionId).toBe(dilla.versionId);
    expect(back.A.attrs).toEqual(styleAttrs(dilla.params));
  });

  it('still decodes a version-3 code, with and without a style lookup', () => {
    const bare = decodeBreak(V3_CODE);
    expect(bare.bpm).toBe(97);
    expect(bare.swing).toBe(23);
    expect(bare.arrangement).toEqual(['A', 'B']);
    expect(bare.A.name).toBe('Old code');
    expect(bare.A.style).toBe('dilla');
    expect(bare.A.seed).toBe(7);
    expect(bare.A.backbeats).toEqual([4, 12]);
    expect(bare.A.bars[0].k).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    /* No snapshot on the wire and no lookup offered — so it loads on default
       feel rather than refusing to load. A v3 break that sounds a shade
       straighter is a better answer than an unopenable one. */
    expect(bare.A.styleVersionId).toBeNull();
    expect(bare.A.attrs).toEqual({});

    // handed the catalogue, the same code is pinned to Dilla's version 1
    const resolved = decodeBreak(V3_CODE, lookup);
    expect(resolved.A.styleVersionId).toBe(testStyle('dilla').versionId);
    expect(resolved.A.bars[0].k).toEqual(bare.A.bars[0].k); // the notes are untouched
  });

  /**
   * The rest of the case above, and the whole reason `decodeBreak` takes a
   * `StyleLookup`: a v3 code names a style and carries no snapshot, so the
   * lookup is what rebuilds one.
   *
   * This caught a real defect on the way in. `patternFromPacked` chooses with
   * `p.sa ?? styleAttrs(known?.params)`, and `packedPatternSchema.sa` is
   * `styleAttrsSchema.optional()` — where `styleAttrsSchema` used to carry
   * `.default({})`. In Zod, `.optional()` over a `.default()` still fills the
   * default in, so `p.sa` parsed to `{}` rather than `undefined` and the `??`
   * never reached the lookup. `sv` has no default and *was* rebuilt, so a v3
   * break decoded claiming to be Dilla version 1 while playing with no feel at
   * all — provenance asserting something the attributes contradicted. The
   * default now lives on `patternSchema.attrs`, which is the one site that
   * wants it.
   */
  it('rebuilds a v3 code’s style snapshot from the lookup', () => {
    const resolved = decodeBreak(V3_CODE, lookup);
    expect(resolved.A.attrs).toEqual(styleAttrs(testStyle('dilla').params));
  });

  it('survives a name with non-Latin characters', () => {
    const doc = docFor('funk');
    doc.A.name = 'Straßenfeger — ドラム';
    expect(decodeBreak(encodeBreak(doc)).A.name).toBe('Straßenfeger — ドラム');
  });

  it.each([
    ['not base64', '%%%not-base64%%%'],
    ['base64 of something that is not JSON', btoa('hello')],
    ['JSON of the wrong shape', b64({ ver: 3, A: {}, B: {} })],
    ['a version from the future', b64({ ver: 9, A: { b: ['0'] }, B: { b: ['0'] } })],
    ['too many bars', b64({ ver: 3, A: { b: Array(9).fill('0') }, B: { b: ['0'] } })],
    ['a tempo out of range', b64({ ver: 3, bpm: 4000, A: { b: ['0'] }, B: { b: ['0'] } })],
  ])('refuses %s', (_label, code) => {
    expect(() => decodeBreak(code)).toThrow();
  });
});

describe('breakDocFromPayload', () => {
  const minimal = { b: ['1000100010001000|0000100000001000|2222222222222222'] };

  it('loads a version-2 code as 4/4 with the five base lanes', () => {
    const doc = breakDocFromPayload(
      sharePayloadSchema.parse({ ver: 2, lv: 3, A: minimal, B: minimal })
    );
    expect(doc.A.meter).toBe('4/4');
    expect(doc.A.lanes).toEqual(['k', 's', 'h', 'r', 'c']);
    expect(doc.A.bars[0].k).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    expect(doc.A.bars[0].h).toEqual(Array(16).fill(2));
    // lanes the code does not carry come back empty, not missing
    for (const L of LANES) expect(doc.A.bars[0][L]).toHaveLength(16);
    expect(doc.A.bars[0].t1).toEqual(Array(16).fill(0));
    expect(doc.level).toBe(3);
  });

  it('maps a version-1 layer onto the renumbered layers', () => {
    const v1 = (lv: number) =>
      breakDocFromPayload(sharePayloadSchema.parse({ ver: 1, lv, A: minimal, B: minimal })).level;
    expect([1, 2, 3, 4].map(v1)).toEqual([1, 2, 4, 5]);
  });

  it('fills in the defaults a sparse payload leaves out', () => {
    const doc = breakDocFromPayload(sharePayloadSchema.parse({ ver: 3, A: minimal, B: minimal }));
    expect(doc).toMatchObject({ bpm: 94, swing: 0, level: 5, arrangement: ['A', 'A', 'B', 'A'] });
    expect(doc.A.style).toBe('funk');
  });

  it('keeps a style key it does not know as written, and falls back to 4/4 for an unknown meter', () => {
    const doc = breakDocFromPayload(
      sharePayloadSchema.parse({ ver: 3, A: { ...minimal, st: 'polka', mt: '99/4' }, B: minimal }),
      lookup
    );
    /* This used to substitute `'funk'`. That behaviour is deliberately gone:
       styles are catalogue rows from Phase 2, so a key the lookup does not
       recognise usually means "not on this installation" rather than
       "malformed" — and relabelling somebody else's pattern as one of ours
       threw away what the author actually said. An unknown key is now just a
       key the picker cannot select; the pattern still loads, on default feel,
       with no version to point at. */
    expect(doc.A.style).toBe('polka');
    expect(doc.A.styleVersionId).toBeNull();
    expect(doc.A.attrs).toEqual({});

    /* The meter is a different matter and still falls back: it decides how many
       steps a bar holds, so the rows cannot be read against an unknown one. */
    expect(doc.A.meter).toBe('4/4');
  });

  it('drops unknown lanes from the roster', () => {
    const doc = breakDocFromPayload(
      sharePayloadSchema.parse({ ver: 3, A: { ...minimal, ln: ['k', 's', 'zz', 'h'] }, B: minimal })
    );
    expect(doc.A.lanes).toEqual(['k', 's', 'h']);
  });
});

describe('sharePayloadSchema is strict about what is present (H6)', () => {
  const bar = '1000100010001000|0000100000001000|2222222222222222';
  const ok = (A: Record<string, unknown>) =>
    sharePayloadSchema.safeParse({ ver: 3, A: { b: [bar], ...A }, B: { b: [bar] } }).success;

  it('accepts what the encoder writes', () => {
    expect(ok({})).toBe(true);
    expect(ok({ pc: { p1: 'cowbell' } })).toBe(true);
    expect(ok({ pn: [0, { s: '0020' }] })).toBe(true);
  });

  it.each([
    ['a letter in a bar row', { b: ['10x0|0000'] }],
    ['a step value above 4', { b: ['1000900010001000'] }],
    ['a value the lane does not have (a crash of 3)', { b: ['0|0|0|0|3000'] }],
    ['a foot chick accented', { b: ['0|0|0|0|0|0|0|0|2000'] }],
    ['more lanes than there are', { b: [Array(12).fill('0').join('|')] }],
    ['a lane longer than any meter', { b: ['0'.repeat(33)] }],
    ['an unknown percussion instrument', { pc: { p1: 'kazoo' } }],
    ['a percussion slot that does not exist', { pc: { p3: 'cowbell' } }],
    ['a negative seed', { sd: -1 }],
    ['a seed wider than 32 bits', { sd: 2 ** 33 }],
    ['a backbeat off the end of any bar', { bb: [4, 99] }],
    ['a pin that is not a layer', { pn: [{ s: '0090' }] }],
  ])('refuses %s', (_label, A) => {
    expect(ok(A)).toBe(false);
  });

  it('no longer lets a stray character become NaN in a decoded bar', () => {
    const code = btoa(JSON.stringify({ ver: 3, A: { b: ['x000'] }, B: { b: [bar] } }));
    expect(() => decodeBreak(code)).toThrow();
  });
});

describe('patternSchema', () => {
  const pat = generatePattern({
    style: testStyle('funk'),
    meter: '7/8',
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });

  it('accepts a pattern the generator made', () => {
    expect(patternSchema.safeParse(pat).success).toBe(true);
  });

  it('takes any style key that fits the column, checking width rather than membership', () => {
    /* The refinement against a key list moved out with Phase 2: styles are rows
       now, so the list is a database query and this schema is synchronous and
       runs in the browser. A pattern naming a style this installation does not
       have is somebody else's pattern, not a malformed one — and from v4 it
       carries its own snapshot, so it still plays and scores. What a key is
       still held to is the width of `Break.style VARCHAR(40)`. */
    expect(patternSchema.safeParse({ ...pat, style: 'polka' }).success).toBe(true);
    expect(patternSchema.safeParse({ ...pat, style: 'x'.repeat(40) }).success).toBe(true);
    expect(patternSchema.safeParse({ ...pat, style: 'x'.repeat(41) }).success).toBe(false);
  });

  it.each([
    ['an unknown meter', { meter: '5/3' }],
    ['an unknown percussion instrument', { perc: { p1: 'kazoo', p2: 'shaker' } }],
    ['no bars', { bars: [] }],
  ])('refuses %s', (_label, over) => {
    expect(patternSchema.safeParse({ ...pat, ...over }).success).toBe(false);
  });
});

describe('storedPayloadSchema', () => {
  const bar = '1000100010001000|0000100000001000|2222222222222222';
  const stored = (A: Record<string, unknown>) =>
    storedPayloadSchema.parse({ ver: 3, A: { b: [bar], ...A }, B: { b: [bar] } }).A;

  it('passes a valid payload through unchanged', () => {
    const payload: unknown = JSON.parse(atob(encodeBreak(docFor('funk'))));
    expect(storedPayloadSchema.parse(payload)).toEqual(sharePayloadSchema.parse(payload));
  });

  it('clamps each lane to its own range and zeroes anything that is not a digit', () => {
    // crash (lane 5) of 3 → 1; a letter in the kick → 0; a snare 9 → 4
    expect(stored({ b: ['1x00|9000|0|0|3000'] }).b).toEqual(['1000|4000|0|0|1000']);
  });

  it('trims extra lanes and over-long rows', () => {
    const [b] = stored({ b: [Array(13).fill('0'.repeat(40)).join('|')] }).b;
    const rows = b.split('|');
    expect(rows).toHaveLength(11);
    expect(rows.every((r) => r.length === 32)).toBe(true);
  });

  it('keeps known instruments, drops the rest, and wraps the seed to 32 bits', () => {
    const A = stored({ pc: { p1: 'cowbell', p2: 'kazoo', p9: 'shaker' }, sd: -1 });
    expect(A.pc).toEqual({ p1: 'cowbell' });
    expect(A.sd).toBe(0xffffffff);
  });

  it('drops backbeats, lanes and pins it cannot use', () => {
    const A = stored({
      bb: [4, -1, 99, 12, 1.5],
      ln: ['k', 'zz', 's', 7],
      pn: [{ s: '0090' }, 'x'],
    });
    expect(A.bb).toEqual([4, 12]);
    expect(A.ln).toEqual(['k', 's']);
    expect(A.pn).toEqual([{ s: '0000' }, 0]);
  });

  it('still refuses a payload that is not a break at all', () => {
    expect(storedPayloadSchema.safeParse({ ver: 3, A: {} }).success).toBe(false);
    expect(storedPayloadSchema.safeParse('nope').success).toBe(false);
    expect(storedPayloadSchema.safeParse({ ver: 3, A: { b: [1] }, B: { b: [bar] } }).success).toBe(
      false
    );
  });
});
