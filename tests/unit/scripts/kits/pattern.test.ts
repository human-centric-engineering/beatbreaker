/**
 * Recipe path patterns (`scripts/kits/pattern.ts`), against the file names
 * the real libraries use.
 */

import { describe, expect, it } from 'vitest';

import { candidates } from '@/scripts/kits/pattern';

describe('candidates()', () => {
  it('pairs each stroke with the same stroke on every other mic', () => {
    const paths = [
      'Samples/mid/snare/mid_snare_center_vl1.flac',
      'Samples/mid/snare/mid_snare_center_vl2.flac',
      'Samples/oh/snare/oh_snare_center_vl1.flac',
      'Samples/oh/snare/oh_snare_center_vl2.flac',
      'Samples/mid/snare/mid_snare_rimshot_vl1.flac',
    ];
    const found = candidates(paths, 'Samples/{mic}/snare/{mic}_snare_center_vl*.flac', {
      mid: 1,
      oh: 0.5,
    });
    expect(found).toEqual([
      {
        id: 'Samples/mid/snare/mid_snare_center_vl1.flac',
        files: [
          { path: 'Samples/mid/snare/mid_snare_center_vl1.flac', weight: 1 },
          { path: 'Samples/oh/snare/oh_snare_center_vl1.flac', weight: 0.5 },
        ],
      },
      {
        id: 'Samples/mid/snare/mid_snare_center_vl2.flac',
        files: [
          { path: 'Samples/mid/snare/mid_snare_center_vl2.flac', weight: 1 },
          { path: 'Samples/oh/snare/oh_snare_center_vl2.flac', weight: 0.5 },
        ],
      },
    ]);
  });

  it('leaves out a stroke that is missing on one mic rather than mixing it short', () => {
    const paths = [
      'Samples/snare_main/snare_hit_vl1_rr1_top.wav',
      'Samples/snare_main/snare_hit_vl1_rr2_top.wav',
      'Samples/snare_main/snare_hit_vl1_rr1_btm.wav',
    ];
    const found = candidates(paths, 'Samples/snare_main/snare_hit_vl*_rr*_{mic}.wav', {
      top: 1,
      btm: 0.3,
    });
    expect(found.map((c) => c.id)).toEqual(['Samples/snare_main/snare_hit_vl1_rr1_top.wav']);
  });

  it('does not let a star reach across a folder', () => {
    const paths = ['samples/Snare1/1-Snare.flac', 'samples/Snare1/old/1-Snare.flac'];
    expect(candidates(paths, 'samples/Snare1/*-Snare.flac', { '': 1 }).map((c) => c.id)).toEqual([
      'samples/Snare1/1-Snare.flac',
    ]);
  });

  it('reads dots and brackets in a path as themselves', () => {
    const paths = ['a/x.wav', 'a/xawav'];
    expect(candidates(paths, 'a/x.wav', { '': 1 }).map((c) => c.id)).toEqual(['a/x.wav']);
  });

  it('drops what the recipe excludes', () => {
    const paths = ['h/hh_vl1_rr1.wav', 'h/hh_vl2_rr1.wav'];
    expect(candidates(paths, 'h/hh_vl*_rr*.wav', { '': 1 }, /vl1_/).map((c) => c.id)).toEqual([
      'h/hh_vl2_rr1.wav',
    ]);
  });

  it('refuses several mics on a pattern that cannot tell them apart', () => {
    expect(() => candidates([], 'a/*.wav', { top: 1, btm: 1 })).toThrow(/no \{mic\}/);
  });
});
