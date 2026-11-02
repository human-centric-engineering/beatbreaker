/**
 * Any meter a record has (16-b-iii, D83 and D85): a meter key is parsed from
 * n/d and an optional grid rather than looked up in a list, and a bar holds as
 * many steps as its meter and grid make. 13/8, 17/16 and 31/32 generate, play,
 * engrave, export MIDI and read back; 7/4 in 32nds holds its 56 steps; every
 * key in `METERS` reads as it did.
 */

import { describe, expect, it } from 'vitest';

import { isClickStep } from '@/lib/app/breaks/audio/transport';
import { isSwung } from '@/lib/app/breaks/feel';
import { engrave } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import {
  METERS,
  METER_KEYS,
  MAX_STEPS,
  countLabelsOf,
  groupsOf,
  isCompound,
  isMeterKey,
  meterKey,
  meterOf,
  parseMeter,
  pulseInfo,
  remapList,
  remapStep,
  stepSeconds,
  stepsOf,
  stepsPerQuarter,
} from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { limbProblems } from '@/lib/app/breaks/physical';
import { patternSchema } from '@/lib/app/breaks/schema';
import { type BreakDoc, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { describeStep, toText } from '@/lib/app/breaks/text';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { TEST_STYLE_KEYS, testStyle } from '@/tests/helpers/catalogue';

const MIDI_OPTS = { bpm: 100, swing: 0, feel: 0, hats: 100 };

function pattern(bars: Bar[], meter: string): Pattern {
  const pat: Pattern = {
    name: '',
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
    backbeats: [],
    pins: null,
    bars,
  };
  return pat;
}

/** A row of sixteenths as the same notes in 32nds. */
function remapRow(row: number[]): number[] {
  const out = new Array<number>(row.length * 2).fill(0);
  row.forEach((v, i) => (out[2 * i] = v));
  return out;
}

/** A bar with the hat on every step and the kick on each pulse's first. */
function busyBar(meter: string): Bar {
  const m = meterOf(meter);
  const bar = emptyBar(stepsOf(m));
  bar.h.fill(1);
  for (const g of groupsOf(m)) bar.k[g.start] = 1;
  return bar;
}

describe('a meter key', () => {
  it('reads every named meter as the same object it always was', () => {
    for (const key of METER_KEYS) expect(parseMeter(key)).toBe(METERS[key]);
    expect(meterOf('7/8').group).toEqual([2, 2, 3]);
  });

  it('builds a meter from n/d, its pulses grouped from the numerator', () => {
    expect(meterOf('13/8')).toMatchObject({ num: 13, den: 8, sub: 2, group: [3, 3, 3, 2, 2] });
    expect(meterOf('10/8').group).toEqual([3, 3, 2, 2]);
    expect(meterOf('20/8').group).toEqual([3, 3, 3, 3, 3, 3, 2]);
    expect(meterOf('3/8').group).toEqual([3]);
    expect(meterOf('17/16')).toMatchObject({ num: 17, den: 16, sub: 1 });
    expect(meterOf('2/2')).toMatchObject({ sub: 8, group: [1, 1] });
    expect(meterOf('13/8').label).toBe('13/8');
  });

  it('is the same object each time it is read', () => {
    expect(parseMeter('13/8')).toBe(parseMeter('13/8'));
  });

  it('holds 17/16 in 17 sixteenths and 31/32 in 31 32nds', () => {
    expect(stepsOf(meterOf('17/16'))).toBe(17);
    expect(stepsPerQuarter(meterOf('17/16'))).toBe(4);
    expect(stepsOf(meterOf('31/32'))).toBe(31);
    expect(stepsPerQuarter(meterOf('31/32'))).toBe(8);
    // a 32nd lasts half a sixteenth
    expect(stepSeconds(meterOf('31/32'), 100)).toBeCloseTo(stepSeconds(meterOf('4/4'), 100) / 2);
  });

  it('holds 7/4 in 32nds in 56 steps, its sixteenths named in the count', () => {
    const m = meterOf('7/4-32');
    expect(stepsOf(m)).toBe(56);
    expect(m.label).toBe('7/4 in 32nds');
    expect(countLabelsOf(m).slice(0, 8)).toEqual(['1', '', 'e', '', '+', '', 'a', '']);
    expect(describeStep(m, 3)).toBe("a step after the 'e' of 1");
  });

  it('has one spelling for each meter', () => {
    expect(meterKey(4, 4, '16')).toBe('4/4');
    expect(meterKey(31, 32, '32')).toBe('31/32');
    expect(meterKey(7, 4, '32')).toBe('7/4-32');
    expect(meterKey(4, 4, '6')).toBe('4/4-6');
    for (const key of ['4/4-16', '31/32-32', '13/8-16']) expect(isMeterKey(key)).toBe(false);
  });

  it('refuses what is no meter', () => {
    for (const key of [
      '',
      '4/3',
      '4/64',
      '0/4',
      '04/4',
      '65/4',
      '13/8-6',
      '31/32-16',
      '4/4 ',
      ' 4/4',
      '4/4-12',
      '__proto__',
      'toString',
    ])
      expect(isMeterKey(key), key).toBe(false);
    expect(meterOf('4/3')).toBe(METERS['4/4']);
  });

  it('keeps a bar to the longest a pattern may hold', () => {
    expect(isMeterKey('32/4-32')).toBe(false);
    expect(isMeterKey('16/4-32')).toBe(true);
    expect(stepsOf(meterOf('16/4-32'))).toBe(MAX_STEPS);
  });

  it('carries sixteenths into 32nds and back, each to the step nearest it in time', () => {
    expect(remapList([0, 4, 8, 12], meterOf('4/4'), meterOf('4/4-32'))).toEqual([0, 8, 16, 24]);
    expect(remapList([0, 2, 8], meterOf('4/4-32'), meterOf('4/4'))).toEqual([0, 1, 4]);
  });
});

describe.each(['13/8', '17/16', '31/32', '7/4-32'])('a bar of %s', (meter) => {
  const n = stepsOf(meterOf(meter));

  it('generates in every style, each row the bar long', () => {
    for (const style of TEST_STYLE_KEYS) {
      const pat = generatePattern({
        style: testStyle(style),
        meter,
        seed: 3,
        bars: 2,
        density: 60,
        ghosts: 60,
      });
      for (const bar of pat.bars) for (const row of Object.values(bar)) expect(row).toHaveLength(n);
    }
  });

  it('passes the pattern schema and the critic', () => {
    const pat = generatePattern({
      style: testStyle('funk'),
      meter,
      seed: 4,
      bars: 1,
      density: 60,
      ghosts: 60,
    });
    pat.bars[0] = busyBar(meter);
    pat.sticking = ['RL'.repeat(n).slice(0, n)];
    expect(patternSchema.safeParse(pat).error?.issues ?? []).toEqual([]);
    expect(() => limbProblems(pat, 100)).not.toThrow();
  });

  it('engraves a slot for every step', () => {
    const e = engrave(pattern([busyBar(meter)], meter), null, { scale: 1, perSystem: 1 });
    expect(e.steps).toBe(n);
    expect(e.map).toHaveLength(n);
  });

  it('travels in a share code and comes back the same', () => {
    const A = generatePattern({
      style: testStyle('funk'),
      meter,
      seed: 5,
      bars: 2,
      density: 60,
      ghosts: 40,
    });
    const B = deriveB(A, testStyle('funk').params);
    const doc: BreakDoc = { bpm: 97, swing: 0, level: 3, arrangement: ['A', 'B'], A, B };
    expect(decodeBreak(encodeBreak(doc))).toEqual(doc);
  });

  it('prints its count one character a step', () => {
    const text = toText(pattern([busyBar(meter)], meter));
    expect(text).toContain(meter.split('-')[0]);
  });
});

describe.each(['13/8', '17/16', '31/32'])('a MIDI file in %s', (meter) => {
  it('reads back in the same meter, every note where it was', () => {
    const bar = busyBar(meter);
    const file = buildMidi([{ pattern: pattern([bar], meter), barIdx: 0 }], MIDI_OPTS);
    const read = readMidi(new Uint8Array(file.bytes));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.pattern.meter).toBe(meter);
    expect(read.pattern.bars[0].k).toEqual(bar.k);
    expect(read.pattern.bars[0].h).toEqual(bar.h);
  });
});

describe('a MIDI file with a bar of 31/32 after a bar of 4/4', () => {
  it('reads both in 32nds, so every bar has one length of step', () => {
    const four = busyBar('4/4');
    const odd = busyBar('31/32');
    const file = buildMidi(
      [
        { pattern: pattern([four], '4/4'), barIdx: 0 },
        { pattern: pattern([odd], '31/32'), barIdx: 0 },
      ],
      MIDI_OPTS
    );
    const read = readMidi(new Uint8Array(file.bytes));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.pattern.meters).toEqual(['4/4-32', '31/32']);
    expect(read.pattern.bars[0].h).toEqual(remapRow(four.h));
    expect(read.pattern.bars[1].h).toEqual(odd.h);
  });
});

describe('a MIDI file with a bar of 7/4 in 32nds', () => {
  it('reads its 56 steps back where a bar of 32nds tells the reader the grid', () => {
    const seven = busyBar('7/4-32');
    const odd = busyBar('31/32');
    const file = buildMidi(
      [
        { pattern: pattern([seven], '7/4-32'), barIdx: 0 },
        { pattern: pattern([odd], '31/32'), barIdx: 0 },
      ],
      MIDI_OPTS
    );
    const read = readMidi(new Uint8Array(file.bytes));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.pattern.meters).toEqual(['7/4-32', '31/32']);
    expect(read.pattern.bars[0].h).toHaveLength(56);
    expect(read.pattern.bars[0].h).toEqual(seven.h);
    expect(read.pattern.bars[0].k).toEqual(seven.k);
  });
});

describe('the click in 32nds', () => {
  it('clicks every eighth, four steps apart', () => {
    const m = meterOf('7/4-32');
    const steps = Array.from({ length: stepsOf(m) }, (_, i) => i).filter((i) =>
      isClickStep(m, i, 8)
    );
    expect(steps).toHaveLength(14);
    expect(steps.every((s) => s % 4 === 0)).toBe(true);
  });
});

describe('the same time signature on another grid', () => {
  it('keeps its pulses: 7/8 is 2+2+3 in sixteenths, eighths and 32nds', () => {
    for (const key of ['7/8', '7/8-8', '7/8-32'])
      expect(meterOf(key).group, key).toEqual([2, 2, 3]);
  });

  it('names its pulse by its note value, whatever the grid', () => {
    expect(pulseInfo(meterOf('6/8'))?.label).toBe('dotted quarter');
    expect(pulseInfo(meterOf('6/8-32'))?.label).toBe('dotted quarter');
    expect(pulseInfo(meterOf('6/8-8'))?.label).toBe('dotted quarter');
    expect(pulseInfo(meterOf('2/2'))?.label).toBe('half note');
  });
});

describe('the count', () => {
  it('names the sixteenths of an eighth-note beat in 32nds, not its 32nds', () => {
    expect(countLabelsOf(meterOf('7/8-32')).slice(0, 4)).toEqual(['1', '', '+', '']);
    expect(countLabelsOf(meterOf('13/16-32')).slice(0, 4)).toEqual(['1', '', '2', '']);
  });

  it('names the middle of a half-note beat, and says how far a step without a name is from one', () => {
    const m = meterOf('2/2');
    expect(countLabelsOf(m).slice(0, 8)).toEqual(['1', '', '', '', '+', '', '', '']);
    expect(describeStep(m, 5)).toBe("a step after the '+' of 1");
    expect(describeStep(m, 7)).toBe("3 steps after the '+' of 1");
  });
});

describe('carrying positions onto a grid of 32nds', () => {
  it('reads 32nds over an eighth beat as 32nds, not sixteenths', () => {
    // the second sixteenth of 7/8 in 32nds is step 2, the sextuplet nearest it 2 (of 6)
    expect(remapStep(2, meterOf('7/8-32'), meterOf('4/4-6'))).toBe(2);
    expect(remapStep(4, meterOf('7/8-32'), meterOf('4/4-6'))).toBe(3);
  });

  it('does not snap 32nds to the eighths of a compound pulse', () => {
    expect(remapList([0, 1, 2, 3], meterOf('4/4'), meterOf('13/16-32'))).toEqual([0, 2, 4]);
    expect(isCompound(meterOf('13/16-32'))).toBe(false);
    expect(isCompound(meterOf('13/8'))).toBe(true);
    expect(isCompound(meterOf('6/8'))).toBe(true);
  });
});

describe('swing in 32nds', () => {
  const swung = (key: string, unit?: 8 | 16) =>
    Array.from({ length: 16 }, (_, i) => i).filter((i) =>
      isSwung(i, meterOf(key), unit ? { swingUnit: unit } : undefined)
    );

  it('pushes the off-sixteenth, two 32nds in, or the off-eighth, four', () => {
    expect(swung('4/4-32')).toEqual([2, 6, 10, 14]);
    expect(swung('4/4-32', 8)).toEqual([4, 12]);
    expect(swung('7/8-32', 8)).toEqual([4, 12]);
  });

  it('swings the eighths of a bar in sixteenths over a half or a sixteenth beat', () => {
    expect(swung('2/2', 8)).toEqual([2, 6, 10, 14]);
    expect(swung('17/16', 8)).toEqual([2, 6, 10, 14]);
    // as it always did
    expect(swung('4/4', 8)).toEqual([2, 6, 10, 14]);
    expect(swung('6/8', 8)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
  });
});

describe('rests', () => {
  const dots = (p: Pattern): number => {
    let n = 0;
    const walk = (
      nodes: { tag: string; attrs?: Record<string, unknown>; children?: unknown[] }[]
    ) => {
      for (const node of nodes) {
        if (node.tag === 'circle' && node.attrs?.r === 0.19 * 10) n++;
        if (node.children) walk(node.children as typeof nodes);
      }
    };
    walk(engrave(p, null, { scale: 1, perSystem: 1 }).nodes);
    return n;
  };

  it('dots a silent pulse of three sixteenths, and of three 32nds', () => {
    // 3+3+3+2+2: three dotted rests a voice, two voices
    expect(dots(pattern([emptyBar(13)], '13/16'))).toBe(6);
    expect(dots(pattern([emptyBar(13)], '13/32'))).toBe(6);
    expect(dots(pattern([emptyBar(16)], '4/4'))).toBe(0);
  });
});

describe('a long bar in eighths', () => {
  it('has a key though its sixteenths would not fit, and engraves on its own eighths', () => {
    expect(meterKey(17, 2, '8')).toBe('17/2-8');
    expect(isMeterKey('40/4')).toBe(false);
    const e = engrave(pattern([busyBar('40/4-8')], '40/4-8'), null, { scale: 1, perSystem: 1 });
    expect(e.steps).toBe(80);
    expect(e.map).toHaveLength(80);
  });
});
