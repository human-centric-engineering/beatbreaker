/**
 * What Stewart Copeland needed from the model: a tape echo on the hats and the
 * rim, a splash on the "and" of 4 instead of a crash on 1, a crash on only
 * some of his 1s — and his songs, verse into chorus.
 */

import { describe, expect, it } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { scheduledHits } from '@/lib/app/breaks/drummer/timeline';
import { generatePattern } from '@/lib/app/breaks/generate';
import { SPLASH } from '@/lib/app/breaks/lanes';
import { M44 } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { performStep } from '@/lib/app/breaks/perform';
import { withSong } from '@/lib/app/breaks/songs';
import type { Echo, Figure, Pattern, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const COPELAND = testStyle('copeland');
const FUNK = testStyle('funk');
const opts = { bars: 4, density: 50, ghosts: 0 };
const FLAT = { swing: 0, feel: 0, hats: 100 };
const ECHO: Echo = { lanes: ['h', 's'], steps: 3, level: 0.35 };

const roxanne: Figure = { h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '..1.............' };
const style = (over: Partial<Style>): ResolvedStyle => {
  const { songs: _songs, ...params } = COPELAND.params;
  return { ...COPELAND, params: { ...params, figures: [[roxanne, 1]], ...over } };
};

/** One bar: a closed hat on 1, a cross-stick on 3, a backbeat on 2. */
function echoed(echo?: Echo): Pattern {
  const p = generatePattern({ style: FUNK, seed: 1, bars: 1, density: 50, ghosts: 0 });
  const bar = emptyBar(16);
  bar.h[0] = 1;
  bar.s[4] = 2;
  bar.s[8] = 4;
  return { ...p, attrs: { ...p.attrs, echo }, bars: [bar] };
}

describe('echo', () => {
  it('plays each hat and cross-stick once more, three 16ths later and quieter', () => {
    const pat = echoed(ECHO);
    const hat = performStep(pat, pat.bars[0], 0, FLAT);
    expect(hat).toHaveLength(2);
    const [note, echo] = hat;
    expect(echo).toMatchObject({ lane: 'h', note: note.note, offset: 3, ornament: 'echo' });
    expect(echo.velocity).toBeCloseTo(note.velocity * 0.35);
    const rim = performStep(pat, pat.bars[0], 8, FLAT);
    expect(rim.map((v) => v.ornament)).toEqual([undefined, 'echo']);
    expect(rim[1].cross).toBe(true);
  });

  it('leaves the backbeat dry: only the rim clicks go through it', () => {
    const pat = echoed(ECHO);
    expect(performStep(pat, pat.bars[0], 4, FLAT)).toHaveLength(1);
  });

  it('keeps a dotted 8th a dotted 8th in sextuplets', () => {
    const p = generatePattern({
      style: FUNK,
      meter: '4/4-6',
      seed: 1,
      bars: 1,
      density: 50,
      ghosts: 0,
    });
    const bar = emptyBar(24);
    bar.h[0] = 1;
    const pat = { ...p, attrs: { ...p.attrs, echo: ECHO }, bars: [bar] };
    expect(performStep(pat, bar, 0, FLAT)[1].offset).toBe(4.5);
  });

  it('plays nothing extra without one', () => {
    const pat = echoed(undefined);
    expect(performStep(pat, pat.bars[0], 0, FLAT)).toHaveLength(1);
  });

  it('is the machine’s, not a stroke: the 3D drummer does not play it', () => {
    const pat = echoed(ECHO);
    const bar = pat.bars[0];
    const voices = performStep(pat, bar, 0, FLAT);
    const step: ScheduledStep = {
      t: 0,
      dur: 0.1,
      slot: 0,
      meter: M44,
      bar,
      next: null,
      notes: voices.map((voice) => ({ voice, when: voice.offset * 0.1 })),
    };
    expect(scheduledHits(step)).toHaveLength(1);
  });

  it('stays out of the MIDI file, which would read it back as notes', () => {
    const midi = (echo?: Echo) =>
      buildMidi([{ pattern: echoed(echo), barIdx: 0 }], { bpm: 100, ...FLAT }).bytes;
    expect(midi(ECHO)).toEqual(midi(undefined));
  });

  it('travels with the pattern from the songs that use it', () => {
    for (const song of ['walking-on-the-moon', 'reggatta-de-blanc', 'every-little-thing']) {
      const pat = generatePattern({ style: COPELAND, song, seed: 2, ...opts });
      expect(pat.attrs.echo?.steps).toBe(3);
    }
    const roxanneSong = generatePattern({ style: COPELAND, song: 'roxanne', seed: 2, ...opts });
    expect(roxanneSong.attrs.echo).toBeUndefined();
  });
});

describe('anticipateCymbal', () => {
  const anticipating = (cymbal: number | undefined) =>
    style({ anticipate: 1, anticipateCymbal: cymbal, build: true, fillChance: 0 });

  it('lands the anticipation on a splash, with the next 1 left bare', () => {
    let seen = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const pat = generatePattern({ style: anticipating(SPLASH), seed, ...opts });
      // the phrase splits at bar 2: bar 1 anticipates it
      if (pat.bars[1].c[14] !== SPLASH) continue;
      seen++;
      expect(pat.bars[1].k[14]).toBe(1);
      expect(pat.bars[2].c[0]).toBe(0);
      expect(pat.bars[2].k[0]).toBe(0);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('is a crash by default, and draws the same stream either way', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const crash = generatePattern({ style: anticipating(undefined), seed, ...opts });
      const splash = generatePattern({ style: anticipating(SPLASH), seed, ...opts });
      expect(crash.bars[1].c[14]).toBe(splash.bars[1].c[14] ? 1 : 0);
      expect(crash.bars.map((b) => b.k)).toEqual(splash.bars.map((b) => b.k));
    }
  });
});

describe('phraseMark.crash as a probability', () => {
  const crashed = (p: number) => {
    let n = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const pat = generatePattern({
        style: style({ phraseMark: { crash: p }, anticipate: 0, fillChance: 0 }),
        seed,
        ...opts,
      });
      if (pat.bars[0].c[0]) n++;
    }
    return n;
  };

  it('crashes on as many 1s as it says', () => {
    expect(crashed(0)).toBe(0);
    expect(crashed(1)).toBe(100);
    expect(crashed(0.35)).toBeGreaterThan(15);
    expect(crashed(0.35)).toBeLessThan(55);
  });

  it('leaves a style that says yes or no as it was', () => {
    const a = generatePattern({ style: FUNK, seed: 9, ...opts });
    const b = generatePattern({
      style: { ...FUNK, params: { ...FUNK.params, phraseMark: { crash: true } } },
      seed: 9,
      ...opts,
    });
    expect(a).toEqual(b);
  });
});

describe('his songs', () => {
  it('keeps the kick off the 1 in the reggae verses', () => {
    for (const key of ['walking-on-the-moon', 'king-of-pain', 'man-in-a-suitcase']) {
      const [verse] = withSong(COPELAND.params, key).figures![0];
      expect(verse.k?.[0]).toBe('.');
    }
  });

  it('puts Synchronicity I in 6/4, Mother in 7/4 and Murder by Numbers in 12/8', () => {
    expect(withSong(COPELAND.params, 'synchronicity-i').meter).toBe('6/4');
    expect(withSong(COPELAND.params, 'mother').meter).toBe('7/4');
    expect(withSong(COPELAND.params, 'murder-by-numbers').meter).toBe('12/8');
  });

  it('plays every song at its record tempo, Fall Out up to its live speed', () => {
    for (const song of COPELAND.params.songs ?? []) {
      expect(withSong(COPELAND.params, song.key).bpm).toEqual(song.params.bpm);
    }
    expect(withSong(COPELAND.params, 'fall-out').bpm).toEqual([160, 200]);
  });

  it('fills a phrase a third of the time, never inside it', () => {
    expect(COPELAND.params.fillChance).toBeLessThan(0.5);
    expect(COPELAND.params.midFills).toBe(0);
  });
});
