/**
 * The MIDI writer. A file with a wrong declared track length opens in some DAWs
 * and not others, so the byte-level structure is the contract here.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import {
  MIDI_MAP,
  type MidiOptions,
  type SequencedBar,
  buildMidi,
  vlq,
} from '@/lib/app/breaks/midi';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Pattern } from '@/lib/app/breaks/types';

const OPTS: MidiOptions = { bpm: 100, swing: 0, feel: 0, hats: 100 };

function seqOf(pat: Pattern): SequencedBar[] {
  return pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx }));
}

/** Read the file back: header fields, the track, and its note-on events with absolute ticks. */
function parse(bytes: number[]) {
  const str = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
  const u32 = (at: number) =>
    ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  const header = {
    id: str(0),
    len: u32(4),
    format: (bytes[8] << 8) | bytes[9],
    tracks: (bytes[10] << 8) | bytes[11],
    ppq: (bytes[12] << 8) | bytes[13],
  };
  const trackId = str(14);
  const trackLen = u32(18);
  const track = bytes.slice(22);

  const notes: Array<{ t: number; note: number; vel: number }> = [];
  const meta: Array<{ t: number; type: number; data: number[] }> = [];
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
      meta.push({ t, type, data: track.slice(i, i + len) });
      i += len;
    } else {
      const note = track[i++];
      const vel = track[i++];
      if ((status & 0xf0) === 0x90) notes.push({ t, note, vel });
    }
  }
  return { header, trackId, trackLen, track, notes, meta };
}

describe('vlq', () => {
  it.each([
    [0, [0x00]],
    [0x7f, [0x7f]],
    [0x80, [0x81, 0x00]],
    [0x2000, [0xc0, 0x00]],
    [0x3fff, [0xff, 0x7f]],
    [0x4000, [0x81, 0x80, 0x00]],
    [0x0fffffff, [0xff, 0xff, 0xff, 0x7f]],
  ])('encodes %i the way the MIDI spec’s examples do', (n, bytes) => {
    expect(vlq(n)).toEqual(bytes);
  });
});

describe('buildMidi', () => {
  const pat = generatePattern({
    style: 'funk',
    meter: '4/4',
    seed: 3,
    bars: 2,
    density: 60,
    ghosts: 60,
  });

  it('writes a format-0 file whose declared track length matches the bytes', () => {
    const { bytes, base64 } = buildMidi(seqOf(pat), OPTS);
    const f = parse(bytes);
    expect(f.header).toEqual({ id: 'MThd', len: 6, format: 0, tracks: 1, ppq: 480 });
    expect(f.trackId).toBe('MTrk');
    expect(f.trackLen).toBe(f.track.length);
    expect(f.track.slice(-4)).toEqual([0x00, 0xff, 0x2f, 0x00]);
    expect(atob(base64)).toBe(String.fromCharCode(...bytes));
  });

  it('writes the tempo and time signature', () => {
    const f = parse(buildMidi(seqOf(pat), { ...OPTS, bpm: 120 }).bytes);
    const tempo = f.meta.find((m) => m.type === 0x51);
    expect(tempo?.data).toEqual([0x07, 0xa1, 0x20]); // 500,000 µs per quarter
    const sig = generatePattern({
      style: 'funk',
      meter: '7/8',
      seed: 3,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    const ts = parse(buildMidi(seqOf(sig), OPTS).bytes).meta.find((m) => m.type === 0x58);
    expect(ts?.data.slice(0, 2)).toEqual([7, 3]); // 7 over 2^3
  });

  it('puts each note on channel 10 at its step, one sixteenth = 120 ticks', () => {
    const p = { ...pat, bars: [emptyBar(16)] };
    p.bars[0].k[0] = 1;
    p.bars[0].s[4] = 2;
    p.bars[0].h[6] = 3;
    p.bars[0].s[10] = 4;
    const f = parse(buildMidi(seqOf(p), OPTS).bytes);
    expect(f.notes.map(({ t, note }) => [t, note])).toEqual([
      [0, MIDI_MAP.k],
      [480, MIDI_MAP.s],
      [720, MIDI_MAP.hOpen],
      [1200, MIDI_MAP.sCross],
    ]);
    // every note-on carries channel 10 (status 0x99)
    expect(buildMidi(seqOf(p), OPTS).bytes.filter((b) => b === 0x99).length).toBe(4);
  });

  it('plays a ghost quieter than an accent', () => {
    const p = { ...pat, bars: [emptyBar(16)] };
    p.bars[0].s[2] = 1;
    p.bars[0].s[4] = 3;
    const [ghost, accent] = parse(buildMidi(seqOf(p), OPTS).bytes).notes;
    expect(ghost.vel).toBeLessThan(accent.vel);
  });

  it('writes the swing into the tick positions', () => {
    const p = { ...pat, bars: [emptyBar(16)] };
    for (let i = 0; i < 16; i++) p.bars[0].h[i] = 1;
    const straight = parse(buildMidi(seqOf(p), OPTS).bytes).notes.map((n) => n.t);
    const swung = parse(buildMidi(seqOf(p), { ...OPTS, swing: 100 }).bytes).notes.map((n) => n.t);
    expect(straight).toEqual(Array.from({ length: 16 }, (_, i) => i * 120));
    expect(swung).not.toEqual(straight);
    // the downbeats do not move
    expect(swung[0]).toBe(0);
    expect(swung[4]).toBe(480);
  });

  it('comes out different with the feel slider up on a style that has a feel', () => {
    const dilla = generatePattern({
      style: 'dilla',
      meter: '4/4',
      seed: 3,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    const flat = buildMidi(seqOf(dilla), OPTS).base64;
    const felt = buildMidi(seqOf(dilla), { ...OPTS, feel: 100 }).base64;
    expect(felt).not.toBe(flat);
    // and no event lands before the file starts
    expect(
      parse(buildMidi(seqOf(dilla), { ...OPTS, feel: 150 }).bytes).notes.every((n) => n.t >= 0)
    ).toBe(true);
  });

  it('keeps every velocity in 1–127 at the extremes of the hats slider', () => {
    for (const hats of [0, 150]) {
      for (const n of parse(buildMidi(seqOf(pat), { ...OPTS, hats }).bytes).notes) {
        expect(n.vel).toBeGreaterThanOrEqual(1);
        expect(n.vel).toBeLessThanOrEqual(127);
      }
    }
  });

  it('skips a bar index that does not exist rather than throwing', () => {
    const f = parse(buildMidi([{ pattern: pat, barIdx: 99 }], OPTS).bytes);
    expect(f.notes).toEqual([]);
  });
});
