/**
 * Share codes — the wire format a saved break, a `#b=` link and a pasted code
 * all use. A code is untrusted input a stranger pasted in, so the tests are as
 * much about what is refused as about what round-trips.
 */

import { describe, expect, it } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { setPin } from '@/lib/app/breaks/pattern';
import { patternSchema, sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import {
  type BreakDoc,
  SHARE_VERSION,
  breakDocFromPayload,
  decodeBreak,
  encodeBreak,
} from '@/lib/app/breaks/share';
import { STYLE_KEYS } from '@/lib/app/breaks/styles';

function docFor(style: string, meter = '4/4'): BreakDoc {
  const A = generatePattern({ style, meter, seed: 2024, bars: 2, density: 60, ghosts: 40 });
  const B = deriveB(A);
  // a pin on a note placed at L2 and one at L4, in different bars and lanes
  setPin(A, 0, 's', 3, 2);
  setPin(A, 1, 'k', 7, 4);
  return { bpm: 97, swing: 23, level: 3, arrangement: ['A', 'B', 'A', 'B'], A, B };
}

function b64(obj: unknown): string {
  return btoa(JSON.stringify(obj));
}

describe('encodeBreak / decodeBreak', () => {
  it('round-trips value for value in every style, pins included', () => {
    for (const style of STYLE_KEYS) {
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
    const raw: unknown = JSON.parse(atob(encodeBreak(docFor('funk'))));
    expect(sharePayloadSchema.parse(raw).ver).toBe(SHARE_VERSION);
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

  it('falls back to funk for a style it does not know, and 4/4 for an unknown meter', () => {
    const doc = breakDocFromPayload(
      sharePayloadSchema.parse({ ver: 3, A: { ...minimal, st: 'polka', mt: '99/4' }, B: minimal })
    );
    expect(doc.A.style).toBe('funk');
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
    style: 'funk',
    meter: '7/8',
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });

  it('accepts a pattern the generator made', () => {
    expect(patternSchema.safeParse(pat).success).toBe(true);
  });

  it.each([
    ['an unknown style', { style: 'polka' }],
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
