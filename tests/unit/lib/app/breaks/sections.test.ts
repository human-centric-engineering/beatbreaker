/**
 * Sections C to Z (11-e-ii): the letters, the wire format's v6, the bar
 * budget, and what a break of A and B alone keeps — its code and its hash,
 * byte for byte.
 */

import { describe, expect, it } from 'vitest';

import { gridHash } from '@/lib/app/breaks/community/grid';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { humaniseSeed } from '@/lib/app/breaks/humanise';
import { setPin } from '@/lib/app/breaks/pattern';
import { sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import {
  MAX_BREAK_BARS,
  cycleLetter,
  hasExtraSections,
  lettersOf,
  nextLetter,
  patternsOf,
  totalBars,
} from '@/lib/app/breaks/sections';
import {
  type BreakDoc,
  breakPayload,
  decodeBreak,
  encodeBreak,
  withoutExtraSections,
} from '@/lib/app/breaks/share';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

function section(meter: string, seed: number, bars = 2): Pattern {
  return generatePattern({ style: testStyle('funk'), meter, seed, bars, density: 60, ghosts: 40 });
}

/** The break `share.test.ts` round-trips, built the same way. */
function abDoc(): BreakDoc {
  // funk as it was when this break's code was pinned: before it said how heavily it is hit,
  // which the code carries in its style snapshot (the bytes are the format's, not the style's)
  const funk = testStyle('funk');
  const params = { ...funk.params };
  delete params.weight;
  const resolved = { ...funk, params };
  const A = generatePattern({
    style: resolved,
    meter: '4/4',
    seed: 2024,
    bars: 2,
    density: 60,
    ghosts: 40,
  });
  const B = deriveB(A, resolved.params);
  setPin(A, 0, 's', 3, 2);
  setPin(A, 1, 'k', 7, 4);
  return { bpm: 97, swing: 23, level: 3, arrangement: ['A', 'B', 'A', 'B'], A, B };
}

/** `ABACD`, each section in its own meter. */
function songDoc(): BreakDoc {
  return {
    bpm: 120,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B', 'A', 'C', 'D'],
    A: section('4/4', 1),
    B: section('4/4', 2),
    C: section('7/8', 3),
    D: section('3/4', 4, 1),
  };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function payloadOf(code: string): unknown {
  return JSON.parse(atob(code));
}

describe('the letters', () => {
  it('lists the sections a break has in order, and the next one free', () => {
    const doc = songDoc();
    expect(lettersOf(doc)).toEqual(['A', 'B', 'C', 'D']);
    expect(patternsOf(doc).map((p) => p.meter)).toEqual(['4/4', '4/4', '7/8', '3/4']);
    expect(nextLetter(doc)).toBe('E');
    expect(totalBars(doc)).toBe(7);
    expect(hasExtraSections(doc)).toBe(true);
    expect(hasExtraSections(abDoc())).toBe(false);
  });

  it('keeps a gap where a section was deleted, and fills it next', () => {
    const { C: _c, ...rest } = songDoc();
    expect(lettersOf(rest)).toEqual(['A', 'B', 'D']);
    expect(nextLetter(rest)).toBe('C');
  });

  it('cycles a slot through the letters the break has, wrapping round', () => {
    const doc = songDoc();
    expect(cycleLetter(doc, 'A')).toBe('B');
    expect(cycleLetter(doc, 'C')).toBe('D');
    expect(cycleLetter(doc, 'D')).toBe('A');
    expect(cycleLetter(abDoc(), 'B')).toBe('A');
  });
});

describe('a break of A and B keeps its code (11-e-ii)', () => {
  it('writes v5, byte for byte what the app wrote before sections', async () => {
    const code = encodeBreak(abDoc());
    expect(sharePayloadSchema.parse(payloadOf(code)).ver).toBe(5);
    // the code `main` wrote for this break before 11-e-ii-b, by its hash
    expect(await sha256(code)).toBe(
      '9fa43bd4ba67f42ba93ce79a6e9aa473213244418fa58acdbb0ea4c26207a940'
    );
  });

  it('keeps the grid hash it was stored with', async () => {
    expect(await gridHash(abDoc())).toBe(
      'd0fe54cc043c7125fbf7ec68c3ba1840b00ffbbcf81c140dd0c9bda15a41b70a'
    );
  });
});

describe('share code v6', () => {
  it('round-trips four sections, each in its own meter, and the arrangement that plays them', () => {
    const doc = songDoc();
    const code = encodeBreak(doc);
    expect(sharePayloadSchema.parse(payloadOf(code)).ver).toBe(6);
    const back = decodeBreak(code);
    expect(back).toEqual(doc);
    expect(back.C?.bars[0].k).toHaveLength(14);
    expect(back.D?.bars[0].k).toHaveLength(12);
  });

  it('is written for an arrangement past B alone, too', () => {
    const doc = songDoc();
    expect(breakPayload(doc).ver).toBe(6);
  });

  it('refuses a section past B under a v5 header', () => {
    const raw = { ...breakPayload(songDoc()), ver: 5 };
    const parsed = sharePayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((i) => i.path[0] === 'C')).toBe(true);
  });

  it('refuses an arrangement naming a section the code has not got', () => {
    const raw = { ...breakPayload(abDoc()), arr: ['A', 'C'] };
    const parsed = sharePayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/section C, which the code does not have/);
  });

  it(`refuses more than ${MAX_BREAK_BARS} bars across the sections`, () => {
    const eight = (seed: number) => section('4/4', seed, 8);
    const doc: BreakDoc = {
      ...songDoc(),
      A: eight(1),
      B: eight(2),
      C: eight(3),
      D: eight(4),
    };
    expect(sharePayloadSchema.safeParse(breakPayload(doc)).success).toBe(true);
    const over = breakPayload({ ...doc, E: section('4/4', 5, 1), arrangement: ['A', 'E'] });
    const parsed = sharePayloadSchema.safeParse(over);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/up to 32 bars across its sections/);
  });

  it('repairs a stored section past B as it repairs A and B', () => {
    const raw = breakPayload(songDoc());
    const bad = {
      ...raw,
      C: { ...raw.C, sd: -1, b: raw.C?.b.map((bar) => bar.replace(/^./, '9')) },
    };
    const parsed = storedPayloadSchema.safeParse(bad);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.C?.sd).toBe(0xffffffff);
    expect(parsed.data?.C?.b[0][0]).toBe('2');
  });
});

describe('every section counts', () => {
  it('changes the grid hash when a section past B changes, and names its letter', async () => {
    const doc = songDoc();
    const base = await gridHash(doc);
    const { C, ...noC } = doc;
    expect(await gridHash(noC)).not.toBe(base);
    // the same notes under another letter are another break
    expect(C).toBeDefined();
    expect(await gridHash({ ...noC, E: C })).not.toBe(base);
  });

  it('seeds the performance from every section, and A and B alone as before', () => {
    const doc = songDoc();
    const ab = humaniseSeed([doc.A, doc.B], 1);
    expect(humaniseSeed(patternsOf({ A: doc.A, B: doc.B }), 1)).toBe(ab);
    expect(humaniseSeed(patternsOf(doc), 1)).not.toBe(ab);
  });

  it('cuts a break back to A and B, and its arrangement with it', () => {
    const cut = withoutExtraSections(songDoc());
    expect(lettersOf(cut)).toEqual(['A', 'B']);
    expect(cut.arrangement).toEqual(['A', 'B', 'A']);
    expect(withoutExtraSections({ ...songDoc(), arrangement: ['C', 'D'] }).arrangement).toEqual([
      'A',
    ]);
  });
});
