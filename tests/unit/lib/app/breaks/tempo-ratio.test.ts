/**
 * A section at a ratio of the break's tempo (11-e-ii-g): ×½ or ×2. The break
 * keeps one tempo; what a ratio changes is how long a section's steps last —
 * so the ceiling, the critic, the MIDI file, the share code and the songs
 * written with one. A break without a ratio is what it was, byte for byte.
 */

import { describe, expect, it } from 'vitest';

import { TEMPO_TOP, maxBpmOf, minBpmOf } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { type SequencedBar, buildMidi } from '@/lib/app/breaks/midi';
import { clonePattern } from '@/lib/app/breaks/pattern';
import { breakTopBpm } from '@/lib/app/breaks/saved/top-bpm';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { ratioLabel, ratioOf, sectionBpm } from '@/lib/app/breaks/sections';
import { type BreakDoc, breakPayload, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { songBreak } from '@/lib/app/breaks/song-break';
import { songBpm, songOf, songPaces, songPartOf, withSong } from '@/lib/app/breaks/songs';
import type { Pattern, StyleSong } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

function section(meter: string, seed: number, bars = 1): Pattern {
  return generatePattern({ style: testStyle('funk'), meter, seed, bars, density: 60, ghosts: 40 });
}

function abDoc(): BreakDoc {
  const A = section('4/4', 2024, 2);
  return {
    bpm: 100,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, testStyle('funk').params),
  };
}

function withRatio(p: Pattern, r: 0.5 | 2): Pattern {
  return { ...p, tempoRatio: r };
}

function songIn(style: string, key: string): StyleSong {
  const s = songOf(STYLES[style], key);
  if (!s) throw new Error(`no song ${style}/${key}`);
  return s;
}

const payloadOf = (code: string): unknown => JSON.parse(atob(code));

describe('the ratio itself', () => {
  it('is ×1 where a section names none, and plays at the break tempo times its ratio', () => {
    const p = section('4/4', 1);
    expect(ratioOf(p)).toBe(1);
    expect(sectionBpm(100, p)).toBe(100);
    expect(sectionBpm(100, withRatio(p, 2))).toBe(200);
    expect(sectionBpm(100, withRatio(p, 0.5))).toBe(50);
    expect([ratioLabel(0.5), ratioLabel(2)]).toEqual(['×½', '×2']);
  });

  it('survives a clone, which lists its fields', () => {
    expect(clonePattern(withRatio(section('4/4', 1), 2)).tempoRatio).toBe(2);
    expect('tempoRatio' in clonePattern(section('4/4', 1))).toBe(false);
  });
});

describe('the top tempo', () => {
  it("is each section's ceiling over its ratio", () => {
    // 4/4 tops out at 190: at ×2 the break may go to 95, at ×½ to 380
    expect(maxBpmOf(['4/4', { meter: '4/4', tempoRatio: 2 }])).toBe(95);
    expect(maxBpmOf(['4/4-8', { meter: '4/4', tempoRatio: 0.5 }])).toBe(380);
    // a bare key and an object without a ratio are the same section
    expect(maxBpmOf([{ meter: '12/8' }])).toBe(maxBpmOf(['12/8']));
  });

  it('never goes past the fastest any meter goes, so every section at ×½ still saves', () => {
    // 12/8 tops out at 300: two sections at ×½ would otherwise let the break to 600
    const half = { meter: '12/8', tempoRatio: 0.5 as const };
    expect(maxBpmOf([half, half])).toBe(TEMPO_TOP);
    expect(TEMPO_TOP).toBeLessThanOrEqual(400);
  });

  it('has a floor raised by a section at ×½, so none plays under 50', () => {
    expect(minBpmOf(['4/4', { meter: '4/4' }])).toBe(50);
    expect(minBpmOf(['4/4', { meter: '4/4', tempoRatio: 0.5 }])).toBe(100);
    expect(minBpmOf([{ meter: '4/4', tempoRatio: 2 }])).toBe(50);
  });

  it("is read off a saved break's document, ratios and all", () => {
    const doc = abDoc();
    doc.B = withRatio(doc.B, 2);
    expect(breakTopBpm('4/4', breakPayload(doc))).toBe(95);
  });
});

describe('the critic', () => {
  it('judges a section at the speed it plays', () => {
    const p = section('4/4', 7);
    // the label names the tempo the bars were judged at
    const at = (q: Pattern) => playability(q, 100).checks.find((c) => c.label.includes('BPM'));
    expect(at(p)?.label).toContain('100 BPM');
    expect(at(withRatio(p, 2))?.label).toContain('200 BPM');
  });
});

describe('MIDI export', () => {
  it('writes a tempo event where a section at a ratio starts, and back where it ends', () => {
    const A = section('4/4', 3);
    const B = withRatio(section('4/4', 4), 2);
    const seq: SequencedBar[] = [A, B, A].map((pattern) => ({ pattern, barIdx: 0 }));
    const { bytes } = buildMidi(seq, { bpm: 120, swing: 0, feel: 0, hats: 100 });
    // the track starts after the 22-byte header; collect each tempo meta event's tick and µs/quarter
    const track = bytes.slice(22);
    const tempos: Array<[number, number]> = [];
    let i = 0;
    let t = 0;
    while (i < track.length) {
      let d = 0;
      let b: number;
      do {
        b = track[i++];
        d = (d << 7) | (b & 0x7f);
      } while (b & 0x80);
      t += d;
      const status = track[i++];
      if (status === 0xff) {
        const type = track[i++];
        const len = track[i++];
        if (type === 0x51) tempos.push([t, (track[i] << 16) | (track[i + 1] << 8) | track[i + 2]]);
        i += len;
      } else i += 2;
    }
    // a bar of 4/4 is 1920 ticks: 120 at A, 240 at B, 120 again
    expect(tempos).toEqual([
      [0, 500000],
      [1920, 250000],
      [3840, 500000],
    ]);
  });

  it('writes the same bytes for a break without a ratio', () => {
    const A = section('4/4', 3);
    const plain = buildMidi([{ pattern: A, barIdx: 0 }], {
      bpm: 120,
      swing: 0,
      feel: 0,
      hats: 100,
    });
    // tempo, then signature, both at tick 0, as the file always opened
    expect(plain.bytes.slice(22, 22 + 7)).toEqual([0, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]);
    expect(plain.bytes.slice(29, 31)).toEqual([0, 0xff]);
    expect(plain.bytes[31]).toBe(0x58);
  });
});

describe('share code v7', () => {
  it('round-trips a section at a ratio', () => {
    const doc = abDoc();
    doc.B = withRatio(doc.B, 0.5);
    const code = encodeBreak(doc);
    expect(sharePayloadSchema.parse(payloadOf(code)).ver).toBe(7);
    const back = decodeBreak(code);
    expect(back.B.tempoRatio).toBe(0.5);
    expect(back.A.tempoRatio).toBeUndefined();
    expect(back).toEqual(doc);
  });

  it('is not written for a break without one: A and B stay v5, sections past B v6', () => {
    const doc = abDoc();
    expect(breakPayload(doc).ver).toBe(5);
    expect(breakPayload({ ...doc, C: section('7/8', 9), arrangement: ['A', 'C'] }).ver).toBe(6);
    expect(breakPayload(doc).B).not.toHaveProperty('tr');
  });

  it('refuses a ratio under an older header, which would play it at the wrong speed', () => {
    const doc = abDoc();
    doc.B = withRatio(doc.B, 2);
    const parsed = sharePayloadSchema.safeParse({ ...breakPayload(doc), ver: 6 });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path)).toContainEqual(['B', 'tr']);
  });

  it('refuses a ratio that is not ×½ or ×2', () => {
    const raw = breakPayload(abDoc());
    const parsed = sharePayloadSchema.safeParse({ ...raw, ver: 7, B: { ...raw.B, tr: 3 } });
    expect(parsed.success).toBe(false);
  });
});

describe('songs with a section at a ratio', () => {
  it("divide a section's own range by its ratio to find the song's", () => {
    const lombardo = STYLES.lombardo;
    const angel = songIn('lombardo', 'angel-of-death');
    // the skank at 205–220, the break at 100–110 of its own: 200–220 of the song's
    expect(withSong(lombardo, 'angel-of-death:B').bpm).toEqual([100, 110]);
    expect(songBpm(lombardo, angel)).toEqual([205, 220]);
    expect(songPaces(lombardo, angel)).toEqual([
      { meter: '4/4-8' },
      { meter: '4/4', tempoRatio: 0.5 },
    ]);
    // the slow section at 100–105, the fast at 190–200 of its own: 95–100 of the song's
    expect(songBpm(STYLES.copeland, songIn('copeland', 'landlord'))).toEqual([100, 100]);
  });

  it("plays Landlord at the record's tempo: its fast section is in eighths", () => {
    // in 4/4's sixteenths the fast section at ×2 held the song to 95; 4/4-8's 380 lets it reach 100
    const landlord = songIn('copeland', 'landlord');
    expect(songPaces(STYLES.copeland, landlord)).toEqual([
      { meter: '4/4' },
      { meter: '4/4-8', tempoRatio: 2 },
    ]);
    expect(maxBpmOf(songPaces(STYLES.copeland, landlord))).toBeGreaterThanOrEqual(100);
  });

  it.each([
    ['lombardo', 'angel-of-death', { A: undefined, B: 0.5 }],
    ['copeland', 'landlord', { A: undefined, B: 2 }],
  ])('%s writes every section of %s at its ratio', (style, key, ratios) => {
    // the song's own tempo, held to its sections' ceiling, as New holds it
    const song = songIn(style, key);
    const bpm = Math.min(songBpm(STYLES[style], song)[0], maxBpmOf(songPaces(STYLES[style], song)));
    const made = songBreak({
      style: testStyle(style),
      song: key,
      bars: 2,
      density: 50,
      ghosts: 50,
      seed: 11,
      bpm,
    });
    expect(made.sections.A.tempoRatio).toBe(ratios.A);
    expect(made.sections.B.tempoRatio).toBe(ratios.B);
    expect(made.sections.B.song).toBe(`${key}:B`);
    // each is playable at the speed it plays
    expect(playability(made.sections.A, bpm).hard).toBe(true);
    expect(playability(made.sections.B, bpm).hard).toBe(true);
  });

  it('answers to the keys the sections had as songs of their own', () => {
    expect(songPartOf(STYLES.lombardo, 'angel-of-death-break')?.section?.letter).toBe('B');
    expect(songPartOf(STYLES.lombardo, 'angel-of-death')?.section?.letter).toBe('A');
    expect(songPartOf(STYLES.copeland, 'landlord-fast')?.section?.letter).toBe('B');
    expect(songPartOf(STYLES.copeland, 'landlord')?.section?.letter).toBe('A');
  });

  it("moves a section's inherited range to its own speed, so the song's is not divided twice", () => {
    const funk = testStyle('funk').params;
    const st = {
      ...funk,
      songs: [
        {
          key: 'tune',
          title: 'Tune',
          feel: 'a tune',
          weight: 1,
          params: { bpm: [100, 110] as [number, number] },
          sections: [
            { letter: 'A' as const, label: 'slow', params: {} },
            { letter: 'B' as const, label: 'fast', tempoRatio: 2 as const, params: {} },
          ],
        },
      ],
    };
    const song = st.songs[0];
    // B names no range: the song's 100–110, at ×2, is 200–220 at the speed B plays
    expect(withSong(st, 'tune:B').bpm[1]).toBeGreaterThan(110);
    expect(songBpm(st, song)[0]).toBe(100);
  });

  it("writes an old key's pattern at its section's ratio, and 1 overrides it", () => {
    const style = testStyle('copeland');
    const base = { style, bars: 1, density: 50, ghosts: 50, seed: 4 };
    expect(generatePattern({ ...base, song: 'landlord-fast' }).tempoRatio).toBe(2);
    expect(generatePattern({ ...base, song: 'landlord-fast', tempoRatio: 1 })).not.toHaveProperty(
      'tempoRatio'
    );
    expect(generatePattern({ ...base, song: 'landlord' })).not.toHaveProperty('tempoRatio');
  });
});
