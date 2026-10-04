/**
 * Resolving a kit's slots (9-v): a piece, one of your samples, or the
 * recordings themselves, into what playback reads.
 */

import { describe, expect, it } from 'vitest';

import {
  type CataloguePiece,
  resolveKitSamples,
  resolveSlot,
} from '@/lib/app/breaks/catalogue/pieces';

const SNARE: CataloguePiece = {
  key: 'drs-s',
  label: 'DRS kit · Snare',
  role: 'snare',
  source: 'drskit',
  folder: 'drs',
  slots: {
    s: { layers: [{ v: 1, files: ['s-0-0.m4a'] }], trim: 1.6 },
    sCross: { layers: [{ v: 1, files: ['sCross-0-0.m4a'] }], trim: 1.6 },
  },
};
const PIECES = new Map([[SNARE.key, SNARE]]);

describe('resolveSlot', () => {
  it("is the piece's recordings of the same slot, in its folder, with the slot's settings", () => {
    expect(resolveSlot('s', { piece: 'drs-s', level: 0.9, tune: 50, decay: 0.7 }, PIECES)).toEqual({
      layers: [{ v: 1, files: ['s-0-0.m4a'] }],
      trim: 1.6,
      folder: 'drs',
      level: 0.9,
      tune: 50,
      decay: 0.7,
    });
  });

  it('plays the slot `from` names instead: a cross-stick piece as a snare', () => {
    expect(resolveSlot('s', { piece: 'drs-s', from: 'sCross' }, PIECES)).toMatchObject({
      layers: [{ v: 1, files: ['sCross-0-0.m4a'] }],
      folder: 'drs',
    });
  });

  it('is nothing for a piece that is not there, or a slot the piece does not fill', () => {
    expect(resolveSlot('s', { piece: 'gone-s' }, PIECES)).toBeNull();
    expect(resolveSlot('sRim', { piece: 'drs-s' }, PIECES)).toBeNull();
  });

  it('is one file, the sample id, for a sample of yours', () => {
    expect(resolveSlot('k', { sample: 'csmp1', level: 1.1 }, PIECES)).toEqual({
      v: null,
      files: ['csmp1'],
      level: 1.1,
    });
  });

  it('leaves recordings as they are', () => {
    const own = { layers: [{ v: 0.5, files: ['k.m4a'] }], trim: 1.2 };
    expect(resolveSlot('k', own, PIECES)).toBe(own);
  });
});

describe('resolveKitSamples', () => {
  it('resolves every slot, keeps the pans and percussion, and names each it could not', () => {
    const perc = { tamb: { v: null, files: ['tamb.m4a'] } };
    const { samples, missing } = resolveKitSamples(
      {
        sampleRate: 44100,
        slots: { s: { piece: 'drs-s' }, c: { piece: 'gone-c' } },
        perc,
        pan: { s: 0.1 },
      },
      PIECES
    );
    expect(Object.keys(samples.slots ?? {})).toEqual(['s']);
    expect(samples.perc).toBe(perc);
    expect(samples.pan).toEqual({ s: 0.1 });
    expect(samples.sampleRate).toBe(44100);
    expect(missing).toEqual(['c']);
  });

  it('is a kit with no slots for one that synthesises its voices', () => {
    expect(resolveKitSamples({}, PIECES)).toEqual({ samples: {}, missing: [] });
  });
});
