/**
 * Sextuplet 4/4 (`4/4-6`): six steps to the beat, so a Bonham triplet is three
 * real sextuplets. Everything that turns steps into time asks the meter, and
 * everything that carries positions between meters maps sixteenths onto
 * triplet partials.
 */

import { describe, expect, it } from 'vitest';

import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { engrave } from '@/lib/app/breaks/engrave';
import { isSwung } from '@/lib/app/breaks/feel';
import { generatePattern } from '@/lib/app/breaks/generate';
import {
  METERS,
  countLabelsOf,
  meterOf,
  pulseInfo,
  remapList,
  stepSeconds,
  stepsOf,
  stepsPerQuarter,
} from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const SEX = meterOf('4/4-6');
const M44 = meterOf('4/4');

function pattern(bars: Bar[], meter = '4/4-6'): Pattern {
  return {
    style: 'rock',
    styleVersionId: null,
    attrs: {},
    meter,
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3'],
    perc: {},
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    backbeats: [6, 18],
    pins: null,
    bars,
  } as Pattern;
}

describe('the meter', () => {
  it('is 4/4 in 24 steps, six to the quarter, counted 1 la li + la li', () => {
    expect(METERS['4/4-6']).toMatchObject({ num: 4, den: 4, sub: 6 });
    expect(stepsOf(SEX)).toBe(24);
    expect(stepsPerQuarter(SEX)).toBe(6);
    expect(countLabelsOf(SEX).slice(0, 6)).toEqual(['1', 'la', 'li', '+', 'la', 'li']);
  });

  it('keeps every other meter at four steps to the quarter', () => {
    for (const key of ['4/4', '3/4', '7/8', '6/8', '12/8', '15/8'])
      expect(stepsPerQuarter(meterOf(key))).toBe(4);
  });

  it('lasts a sixth of a quarter a step, and quotes its tempo in quarters', () => {
    expect(stepSeconds(SEX, 100)).toBeCloseTo(0.1);
    expect(stepSeconds(M44, 100)).toBeCloseTo(0.15);
    // a 4/4 bar is the same length either way
    expect(stepSeconds(SEX, 93) * 24).toBeCloseTo(stepSeconds(M44, 93) * 16);
    expect(pulseInfo(SEX)).toBeNull();
    expect(maxBpm('4/4-6')).toBeGreaterThanOrEqual(178);
  });

  it('has nothing for the swing slider to swing', () => {
    for (let i = 0; i < 24; i++) expect(isSwung(i, SEX, undefined)).toBe(false);
  });

  it('carries sixteenths onto triplet partials and back', () => {
    // 1, e, +, a of beat 1, and beats 2 to 4
    expect(remapList([0, 1, 2, 3, 4, 8, 12], M44, SEX)).toEqual([0, 2, 3, 4, 6, 12, 18]);
    // every sextuplet to the sixteenth nearest it
    expect(remapList([0, 1, 2, 3, 4, 5, 6], SEX, M44)).toEqual([0, 1, 2, 3, 4]);
    expect(remapList([6, 18], SEX, M44)).toEqual([4, 12]);
  });
});

describe('time', () => {
  it('writes a sextuplet as 80 MIDI ticks, a sixteenth as 120', () => {
    const sex = emptyBar(24);
    sex.k[0] = 1;
    sex.k[1] = 1;
    sex.k[2] = 1;
    const six = buildMidi([{ pattern: pattern([sex]), barIdx: 0 }], {
      bpm: 100,
      swing: 0,
      feel: 0,
      hats: 100,
    });
    const sixteenths = emptyBar(16);
    sixteenths.k[0] = 1;
    sixteenths.k[1] = 1;
    const four = buildMidi([{ pattern: pattern([sixteenths], '4/4'), barIdx: 0 }], {
      bpm: 100,
      swing: 0,
      feel: 0,
      hats: 100,
    });
    // note-on 0x99 on the kick (36): the delta before the second is the step
    const deltaBeforeSecondKick = (bytes: number[]): number => {
      const ons: number[] = [];
      for (let i = 0; i < bytes.length - 2; i++)
        if (bytes[i] === 0x99 && bytes[i + 1] === 36) ons.push(i);
      return bytes[ons[1] - 1];
    };
    expect(deltaBeforeSecondKick(six.bytes)).toBe(80 - 60);
    expect(deltaBeforeSecondKick(four.bytes)).toBe(120 - 60);
  });
});

describe('the critic', () => {
  it('hears a sextuplet double as half again as quick as a sixteenth one', () => {
    const doubles = (n: number, at: number[]) => {
      const b = emptyBar(n);
      for (const i of at) b.k[i] = 1;
      b.s[n / 4] = 3;
      b.s[(3 * n) / 4] = 3;
      return b;
    };
    const label = (p: ReturnType<typeof playability>) =>
      p.checks.find((c) => c.label.startsWith('Kick doubles'))?.ok;
    // at 100 bpm: sixteenth doubles are fine, sextuplet doubles are 150 in sixteenths
    const four = pattern([doubles(16, [0, 1, 8, 9]), doubles(16, [0, 1, 8, 9])], '4/4');
    const six = pattern([doubles(24, [0, 1, 12, 13]), doubles(24, [0, 1, 12, 13])]);
    expect(label(playability(four, 100))).toBe(true);
    expect(label(playability(six, 100))).toBe(false);
  });
});

describe('the engraving', () => {
  it('marks every beat that has notes with a 6', () => {
    const b = emptyBar(24);
    for (let i = 0; i < 24; i += 3) b.h[i] = 1;
    b.s[6] = 3;
    b.s[18] = 3;
    const sixes = (p: Pattern) => {
      let n = 0;
      const walk = (nodes: { tag: string; text?: string; children?: unknown[] }[]) => {
        for (const node of nodes) {
          if (node.tag === 'text' && node.text === '6') n++;
          if (node.children) walk(node.children as typeof nodes);
        }
      };
      walk(engrave(p, null, { scale: 1, perSystem: 1 }).nodes);
      return n;
    };
    expect(sixes(pattern([b]))).toBeGreaterThanOrEqual(4);
    const plain = emptyBar(16);
    for (let i = 0; i < 16; i += 2) plain.h[i] = 1;
    expect(sixes(pattern([plain], '4/4'))).toBe(0);
  });
});

describe('Bonham in sextuplets', () => {
  const bonham = testStyle('bonham');

  it('writes Good Times Bad Times in 4/4-6, the kick doubles on the sextuplets after the beat', () => {
    const pat = generatePattern({
      style: bonham,
      song: 'good-times-bad-times',
      seed: 3,
      bars: 4,
      density: 50,
      ghosts: 50,
    });
    expect(pat.meter).toBe('4/4-6');
    expect(pat.bars.every((b) => b.k.length === 24)).toBe(true);
    // the cowbell is on the kit: it rides the eighths, and stops where a written fill starts
    expect(pat.perc.p1).toBe('cowbell');
    for (const b of pat.bars) {
      const toms = b.t1.findIndex(Boolean);
      if (toms < 0) continue;
      expect(b.p1.slice(toms).some(Boolean)).toBe(false);
    }
  });

  it('marks eighth-note triplets with a 3, and a lone note with nothing', () => {
    const marks = (p: Pattern) => {
      const out: string[] = [];
      const walk = (nodes: { tag: string; text?: string; children?: unknown[] }[]) => {
        for (const node of nodes) {
          if (node.tag === 'text' && (node.text === '6' || node.text === '3')) out.push(node.text);
          if (node.children) walk(node.children as typeof nodes);
        }
      };
      walk(engrave(p, null, { scale: 1, perSystem: 1 }).nodes);
      return out;
    };
    const triplets = emptyBar(24);
    for (let i = 0; i < 24; i += 2) triplets.h[i] = 1;
    expect(marks(pattern([triplets]))).toEqual(['3', '3', '3', '3']);
    const quarters = emptyBar(24);
    for (let i = 0; i < 24; i += 6) quarters.k[i] = 1;
    expect(marks(pattern([quarters]))).toEqual([]);
  });
});
