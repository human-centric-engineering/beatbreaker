/**
 * `readMidi()` — the inverse of `buildMidi()`. The round trip through
 * BeatBreaker's own export is the contract; hand-built files cover what a DAW
 * or an e-kit writes that our export never does (running status, drums off
 * channel 10, SMPTE time, notes we have no lane for).
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { importedDoc } from '@/lib/app/breaks/import';
import { LANES, PERC_LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { buildMidi, vlq } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { packPattern } from '@/lib/app/breaks/share';
import { packedPatternSchema } from '@/lib/app/breaks/schema';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

function exported(pat: Pattern, bpm = 100): Uint8Array {
  const file = buildMidi(
    pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx })),
    { bpm, swing: 0, feel: 0, hats: 0 }
  );
  return new Uint8Array(file.bytes);
}

/** What survives the export: everything but a hi-hat accent, which the hats slider reshapes (see the module doc). */
function expectedBar(bar: Bar): Bar {
  const out = { ...bar, h: bar.h.map((v) => (v === 2 ? 1 : v)) };
  for (const L of PERC_LANES) out[L] = [];
  return out;
}

/** Percussion is compared by instrument, since a reader cannot know which slot a part was in. */
function percByInst(pat: {
  perc: Partial<Record<string, string>>;
  bars: Bar[];
}): Record<string, number[][]> {
  const out: Record<string, number[][]> = {};
  for (const L of PERC_LANES) {
    const inst = pat.perc[L];
    if (!inst || !pat.bars.some((b) => b[L].some((v) => v))) continue;
    out[inst] = pat.bars.map((b) => b[L]);
  }
  return out;
}

describe('readMidi — the round trip through buildMidi', () => {
  it('gives back every famous break note for note, in its own meter and tempo', () => {
    LIBRARY.forEach((item, index) => {
      const pat = patternFromLibrary(
        item,
        index,
        STYLES[item.style] ? testStyle(item.style) : undefined
      );
      const r = readMidi(exported(pat, item.bpm));
      if (!r.ok) throw new Error(`${item.title}: ${r.error}`);
      expect(r.pattern.meter, item.title).toBe(pat.meter);
      expect(r.pattern.bpm, item.title).toBe(item.bpm);
      expect(r.pattern.bars, item.title).toHaveLength(pat.bars.length);
      r.pattern.bars.forEach((bar, bi) => {
        const want = expectedBar(pat.bars[bi]);
        for (const L of LANES) {
          if ((PERC_LANES as string[]).includes(L)) continue;
          expect(bar[L], `${item.title} bar ${bi + 1} ${L}`).toEqual(want[L]);
        }
      });
      expect(r.pattern.notes, item.title).toEqual([]);
    });
  });

  it('gives back percussion parts by instrument', () => {
    const pat = generatePattern({
      style: testStyle('samba'),
      seed: 3,
      bars: 2,
      density: 60,
      ghosts: 40,
    });
    pat.bars[0].p1[0] = 2;
    pat.bars[0].p2[2] = 1;
    const r = readMidi(exported(pat));
    if (!r.ok) throw new Error(r.error);
    expect(percByInst(r.pattern)).toEqual(percByInst(pat));
  });
});

/* ---- hand-built files ---------------------------------------------- */

type Ev = [delta: number, ...bytes: number[]];

function smf(events: Ev[], { division = 480, format = 0 } = {}): Uint8Array {
  const track: number[] = [];
  for (const [delta, ...bytes] of events) track.push(...vlq(delta), ...bytes);
  track.push(0, 0xff, 0x2f, 0);
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  return new Uint8Array([
    ...[0x4d, 0x54, 0x68, 0x64],
    ...u32(6),
    0,
    format,
    0,
    1,
    (division >> 8) & 255,
    division & 255,
    ...[0x4d, 0x54, 0x72, 0x6b],
    ...u32(track.length),
    ...track,
  ]);
}

const ON = (ch: number, note: number, vel: number): number[] => [0x90 | ch, note, vel];

describe('readMidi — what other software writes', () => {
  it('reads running status, the time signature and the tempo', () => {
    const file = smf([
      [0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20], // 120 bpm
      [0, 0xff, 0x58, 4, 3, 2, 24, 8], // 3/4
      [0, ...ON(9, 36, 100)],
      [240, 38, 120], // running status: an accented snare on the '+' of 1
      [240, 38, 30], // a ghost on beat 2
    ]);
    const r = readMidi(file);
    if (!r.ok) throw new Error(r.error);
    expect(r.pattern).toMatchObject({ meter: '3/4', bpm: 120 });
    expect(r.pattern.bars).toHaveLength(1);
    expect(r.pattern.bars[0].k[0]).toBe(1);
    expect(r.pattern.bars[0].s.slice(0, 5)).toEqual([0, 0, 3, 0, 1]);
  });

  it('quantises to the nearest sixteenth and says how many moved', () => {
    const r = readMidi(
      smf([
        [0, ...ON(9, 36, 100)],
        [160, ...ON(9, 36, 100)],
      ])
    ); // 40 ticks late for the 16th: past the quarter-step tolerance
    expect(r.ok && r.pattern.bars[0].k.slice(0, 2)).toEqual([1, 1]);
    expect(r.ok && r.pattern.notes).toContain('1 note was moved to the nearest sixteenth.');
  });

  it('reads every channel when nothing is on channel 10, and says so', () => {
    const r = readMidi(smf([[0, ...ON(0, 36, 100)]]));
    expect(r.ok && r.pattern.notes[0]).toMatch(/Nothing was on the drum channel/);
  });

  it('leaves out notes it has no lane for, and names them', () => {
    const r = readMidi(
      smf([
        [0, ...ON(9, 36, 100)],
        [0, ...ON(9, 31, 100)],
        [0, ...ON(9, 31, 100)],
      ])
    );
    expect(r.ok && r.pattern.notes).toContain('2 notes with no lane here (MIDI 31) were left out.');
  });

  it('keeps sixteen bars and says how many there were', () => {
    const r = readMidi(
      smf([
        [0, ...ON(9, 36, 100)],
        [480 * 4 * 19, ...ON(9, 36, 100)],
      ])
    );
    expect(r.ok && r.pattern.bars).toHaveLength(16);
    expect(r.ok && r.pattern.notes).toContain(
      'Only the first 16 of 20 bars were kept — a pattern holds two sections of 8.'
    );
  });

  it('refuses what it cannot read, with a reason', () => {
    expect(readMidi(new Uint8Array([1, 2, 3]))).toEqual({
      ok: false,
      error: 'that is not a MIDI file',
    });
    expect(readMidi(smf([[0, ...ON(9, 36, 100)]], { division: 0xe728 }))).toMatchObject({
      ok: false,
      error: expect.stringContaining('SMPTE'),
    });
    expect(
      readMidi(
        smf([
          [0, 0xff, 0x58, 4, 11, 3, 24, 8],
          [0, ...ON(9, 36, 100)],
        ])
      )
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('the file is in 11/8'),
    });
    expect(readMidi(smf([]))).toEqual({ ok: false, error: 'there are no notes in that file' });
    const whole = smf([[0, ...ON(9, 36, 100)]]);
    expect(readMidi(whole.subarray(0, whole.length - 5))).toMatchObject({
      ok: false,
      error: expect.stringContaining('ends in the middle'),
    });
  });
});

describe('importedDoc', () => {
  it('fills A, then B, and each section packs as a valid wire pattern', () => {
    const r = readMidi(
      smf([
        [0, ...ON(9, 36, 100)],
        [480 * 4 * 11, ...ON(9, 38, 100)],
      ])
    );
    if (!r.ok) throw new Error(r.error);
    const doc = importedDoc(r.pattern, 'rock');
    expect(doc.A.bars).toHaveLength(8);
    expect(doc.B.bars).toHaveLength(4);
    expect(doc.arrangement).toEqual(['A', 'B']);
    expect(doc.A.style).toBe('rock');
    for (const p of [doc.A, doc.B])
      expect(packedPatternSchema.safeParse(packPattern(p)).success).toBe(true);
  });

  it('plays one section on its own when the import fits in eight bars', () => {
    const r = readMidi(smf([[0, ...ON(9, 36, 100)]]));
    if (!r.ok) throw new Error(r.error);
    const doc = importedDoc(r.pattern, 'rock');
    expect(doc.arrangement).toEqual(['A']);
    expect(doc.B.bars).toEqual(doc.A.bars);
  });

  it('reads backbeats off the snare and the time-keeper off the cymbals', () => {
    const r = readMidi(
      smf([
        [0, ...ON(9, 51, 90)],
        [480, ...ON(9, 38, 100)],
        [0, ...ON(9, 51, 90)],
        [480, ...ON(9, 51, 90)],
        [480, ...ON(9, 38, 100)],
      ])
    );
    if (!r.ok) throw new Error(r.error);
    const doc = importedDoc(r.pattern, 'rock');
    expect(doc.A.backbeats).toEqual([4, 12]);
    expect(doc.A.voice).toBe('ride');
    expect(doc.A.hasRide).toBe(true);
  });
});
