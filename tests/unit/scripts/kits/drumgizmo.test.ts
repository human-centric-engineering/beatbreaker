/**
 * DrumGizmo strokes (`scripts/kits/drumgizmo.ts`). Each DRSKit stroke is one
 * WAV with thirteen mics in it, and the instrument file says which channel is
 * which. The order differs from the one DrumGizmo's wiki lists, so a mic must
 * be found by its name: mixing by position would put the ambience where the
 * snare should be, and nothing would fail.
 */

import { describe, expect, it } from 'vitest';

import { channelsOf, instrumentOf, panFilter } from '@/scripts/kits/drumgizmo';

/** As DRSKit 2.1's `Snare/Snare.xml` writes them, attributes and all, for two strokes. */
const SNARE_XML = `<?xml version='1.0' encoding='UTF-8'?>
<instrument version="2.0" name="Snare">
  <samples>
    <sample name="Snare-1" power="0.037478">
      <audiofile channel="AmbL" file="samples/1-Snare.wav" filechannel="1"/>
      <audiofile channel="AmbR" file="samples/1-Snare.wav" filechannel="2"/>
      <audiofile channel="Hihat" file="samples/1-Snare.wav" filechannel="3"/>
      <audiofile channel="OHL" file="samples/1-Snare.wav" filechannel="6"/>
      <audiofile channel="Snare_bottom" file="samples/1-Snare.wav" filechannel="9"/>
      <audiofile channel="Snare_top" file="samples/1-Snare.wav" filechannel="10"/>
    </sample>
    <sample name="Snare-2" power="0.051">
      <audiofile filechannel="7" file="samples/2-Snare.wav" channel="Snare_top"/>
    </sample>
  </samples>
</instrument>`;

describe('instrumentOf()', () => {
  it('names the instrument file beside the samples folder, and the stroke as that file names it', () => {
    expect(instrumentOf('DRSKit/Snare/samples/1-Snare.wav')).toEqual({
      xml: 'DRSKit/Snare/Snare.xml',
      file: 'samples/1-Snare.wav',
    });
    expect(instrumentOf('Tom1_whisker/samples/3-Tom1_whisker.wav')).toEqual({
      xml: 'Tom1_whisker/Tom1_whisker.xml',
      file: 'samples/3-Tom1_whisker.wav',
    });
  });

  it('refuses a path that is not a stroke in a samples folder', () => {
    expect(() => instrumentOf('DRSKit/Snare/1-Snare.wav')).toThrow('not a DrumGizmo stroke');
  });
});

describe('channelsOf()', () => {
  it("reads each mic's channel for one stroke, and only that stroke", () => {
    const ch = channelsOf(SNARE_XML, 'samples/1-Snare.wav');
    expect(ch.get('Snare_top')).toBe(10);
    expect(ch.get('Snare_bottom')).toBe(9);
    expect(ch.get('AmbL')).toBe(1);
    expect(ch.size).toBe(6);
  });

  it('reads the attributes in any order', () => {
    expect(channelsOf(SNARE_XML, 'samples/2-Snare.wav')).toEqual(new Map([['Snare_top', 7]]));
  });

  it('refuses a stroke the file does not describe', () => {
    expect(() => channelsOf(SNARE_XML, 'samples/9-Snare.wav')).toThrow(
      'not in its instrument file'
    );
  });

  it('refuses a channel number that is not a positive whole number', () => {
    const bad = '<audiofile channel="OHL" file="samples/1-X.wav" filechannel="0"/>';
    expect(() => channelsOf(bad, 'samples/1-X.wav')).toThrow('no usable channel');
  });
});

describe('panFilter()', () => {
  const ch = channelsOf(SNARE_XML, 'samples/1-Snare.wav');

  it('mixes the named mics by their channel, counted from 0 as ffmpeg counts', () => {
    expect(panFilter({ Snare_top: 1, Snare_bottom: 0.35 }, ch)).toBe('pan=mono|c0=1*c9+0.35*c8');
  });

  it('refuses a mic the stroke does not have, naming the ones it does', () => {
    expect(() => panFilter({ Ride: 1 }, ch)).toThrow('no mic Ride; this stroke has AmbL');
  });

  it('refuses an empty mix', () => {
    expect(() => panFilter({}, ch)).toThrow('no channels');
  });
});
