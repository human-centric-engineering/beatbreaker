/**
 * Groove Scribe links, read as text. The links below are in the shape Groove
 * Scribe's own `getUrlStringFromGrooveData` writes: `|`-separated tab lines,
 * `%7C` where a browser has encoded them, keys in its own capitalisation.
 */

import { describe, expect, it } from 'vitest';

import { isGrooveScribeUrl, readGrooveScribeUrl } from '@/lib/app/breaks/groove-scribe';

const GS = 'https://www.mikeslessons.com/groove/';

function read(query: string) {
  const r = readGrooveScribeUrl(`${GS}?${query}`);
  if (!r.ok) throw new Error(r.error);
  return r.pattern;
}

describe('readGrooveScribeUrl', () => {
  it('reads a sixteenth-note rock beat, with its title and tempo', () => {
    const p = read(
      'TimeSig=4/4&Div=16&Title=Basic%20Rock&Tempo=96&Measures=1' +
        '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-o-----|'
    );
    expect(p).toMatchObject({ name: 'Basic Rock', meter: '4/4', bpm: 96, swing: 0, notes: [] });
    expect(p.bars).toHaveLength(1);
    expect(p.bars[0].h).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(p.bars[0].s[4]).toBe(3);
    expect(p.bars[0].k).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('spreads an eighth-note grid onto sixteenths, and reads encoded bars', () => {
    const p = read(
      'TimeSig=4/4&Div=8&Measures=2&H=%7Cxxxxxxxx%7Cxxxxxxxx%7C&S=%7C--O---O-%7C--O---O-%7C&K=%7Co---o---%7Co-o-o---%7C'
    );
    expect(p.bars).toHaveLength(2);
    expect(p.bars[0].h).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(p.bars[1].k.slice(0, 6)).toEqual([1, 0, 0, 0, 1, 0]);
    expect(p.bars[1].s[4]).toBe(3);
  });

  it('reads every hi-hat, snare and kick articulation it has a lane for', () => {
    const p = read('Div=16&H=|xXo+crbm--------|&S=|oOgxfdb---------|&K=|oxX-------------|');
    expect(p.bars[0].h.slice(0, 4)).toEqual([1, 2, 3, 1]);
    expect(p.bars[0].c[4]).toBe(1);
    expect(p.bars[0].r.slice(5, 7)).toEqual([1, 2]);
    expect(p.bars[0].p1[7]).toBe(1);
    expect(p.perc).toEqual({ p1: 'cowbell' });
    // hit, accent, ghost, cross-stick, then the flam, drag and buzz as themselves (9-iv)
    expect(p.bars[0].s.slice(0, 7)).toEqual([2, 3, 1, 4, 6, 7, 8]);
    expect(p.bars[0].k.slice(0, 3)).toEqual([1, 0, 1]);
    expect(p.bars[0].hf.slice(0, 3)).toEqual([0, 1, 1]);
    expect(p.notes).toEqual([]);
  });

  it('puts T1 and T2 on the high and mid toms and T4 on the floor tom', () => {
    const p = read('Div=16&T1=|o---------------|&T2=|--O-------------|&T4=|----o-----------|');
    expect(p.bars[0].t1[0]).toBe(1);
    expect(p.bars[0].t2[2]).toBe(2);
    expect(p.bars[0].t3[4]).toBe(1);
    expect(p.notes).toEqual([]);
    expect(read('Div=16&T3=|o---------------|&T4=|----o-----------|').notes).toEqual([
      'Toms 3 and 4 were both read onto the floor tom.',
    ]);
  });

  it('reads 6/8 at twelve sixteenths a bar', () => {
    const p = read('TimeSig=6/8&Div=16&H=|x-x-x-x-x-x-|&S=|------O-----|&K=|o-----------|');
    expect(p.meter).toBe('6/8');
    expect(p.bars[0].h).toHaveLength(12);
    expect(p.bars[0].s[6]).toBe(3);
  });

  it('thins a 32nd-note grid and reports the notes between sixteenths', () => {
    const p = read('Div=32&S=|oo------------------------------|');
    expect(p.bars[0].s[0]).toBe(2);
    expect(p.notes).toEqual(['1 note between sixteenths was left out.']);
  });

  it('ignores metronome clicks and reports articulations it has no value for', () => {
    const p = read('Div=16&H=|nN-s------------|');
    expect(p.bars[0].h.every((v) => v === 0)).toBe(true);
    expect(p.notes).toEqual(['1 note of a kind BeatBreaker does not have was left out.']);
  });

  it('keeps sixteen bars of a longer groove and says how many there were', () => {
    const p = read(`Div=16&Measures=40&K=${'|o---------------'.repeat(40)}|`);
    expect(p.bars).toHaveLength(16);
    expect(p.bars[15].k[0]).toBe(1);
    expect(p.notes[0]).toBe(
      'Only the first 16 of 40 bars were kept — a pattern holds two sections of 8.'
    );
  });

  it('falls back to Groove Scribe defaults for a missing or silly tempo and swing', () => {
    expect(read('Div=16&K=|o---------------|')).toMatchObject({ bpm: 80, swing: 0, meter: '4/4' });
    expect(read('Div=16&Tempo=9999&Swing=500&K=|o---------------|')).toMatchObject({
      bpm: 80,
      swing: 0,
    });
    expect(read('Div=16&swing=30&K=|o---------------|').swing).toBe(30);
  });

  it('refuses triplets, meters BeatBreaker lacks, and anything that is not Groove Scribe', () => {
    expect(readGrooveScribeUrl(`${GS}?Div=12&H=|xxxxxxxxxxxx|`)).toMatchObject({
      ok: false,
      error: expect.stringContaining('triplets'),
    });
    expect(readGrooveScribeUrl(`${GS}?TimeSig=11/8&Div=16`)).toMatchObject({
      ok: false,
      error: expect.stringContaining('11/8'),
    });
    expect(readGrooveScribeUrl('https://example.com/groove/?H=|x|')).toEqual({
      ok: false,
      error: 'that is not a Groove Scribe link',
    });
    expect(readGrooveScribeUrl(GS)).toEqual({
      ok: false,
      error: 'that Groove Scribe link has no groove in it',
    });
  });
});

describe('isGrooveScribeUrl', () => {
  it('knows the two hosts, and nothing else', () => {
    expect(isGrooveScribeUrl('https://www.mikeslessons.com/groove/?H=x')).toBe(true);
    expect(isGrooveScribeUrl('https://montulli.github.io/GrooveScribe/?H=x')).toBe(true);
    expect(isGrooveScribeUrl('https://mikeslessons.com.evil.test/groove/')).toBe(false);
    expect(isGrooveScribeUrl('javascript:alert(1)')).toBe(false);
    expect(isGrooveScribeUrl('not a url')).toBe(false);
  });
});
