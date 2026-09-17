import { DEFAULT_PERC, FOOT_LANE, PERC_LANES, TOM_LANES, percInst } from '@/lib/app/breaks/lanes';
import { feelOf, feelOffset, hatShape, isSwung } from '@/lib/app/breaks/feel';
import { isGroupStart } from '@/lib/app/breaks/meter';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { clamp } from '@/lib/app/breaks/rng';
import { STYLES } from '@/lib/app/breaks/styles';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * Standard MIDI File, format 0, GM drum map on channel 10.
 *
 * **Swing and the style's off-grid feel are written into the tick positions**,
 * so the export drags exactly where the playback drags. A Dilla break exported
 * quantised would be missing the one thing about it that mattered. The single
 * exception is a hit pushed in front of bar 1, which has nowhere earlier to go
 * and sits on the downbeat.
 */

export const MIDI_MAP: Record<string, number> = {
  k: 36,
  s: 38,
  sCross: 37,
  h: 42,
  hOpen: 46,
  r: 51,
  rBell: 53,
  c: 49,
  t1: 48,
  t2: 45,
  t3: 43,
  hf: 44,
};

/** Variable-length quantity, as a MIDI delta time is written. */
export function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  let v = n >> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

interface MidiEvent {
  t: number;
  type: number;
  n: number;
  v: number;
}

/** One bar of the arrangement, already resolved to the pattern it came from. */
export interface SequencedBar {
  pattern: Pattern;
  barIdx: number;
}

export interface MidiOptions {
  bpm: number;
  /** Swing slider, 0–100. */
  swing: number;
  /** Off-grid feel slider, 0–150. 0 exports the same notes quantised. */
  feel: number;
  /** Hi-hat dynamics slider, 0–150. */
  hats: number;
}

export interface MidiFile {
  base64: string;
  bytes: number[];
}

export function buildMidi(seq: SequencedBar[], opts: MidiOptions): MidiFile {
  const PPQ = 480;
  const ST = PPQ / 4; // one grid step is a sixteenth, in every meter
  const events: MidiEvent[] = [];
  let tick = 0;

  for (const pos of seq) {
    const pat = pos.pattern;
    const bar = pat.bars[pos.barIdx];
    if (!bar) continue;

    const style = STYLES[pat.style];
    const feel = feelOf(style);
    const m = meterOfPat(pat);
    const nSteps = bar.k.length;
    const amt = opts.feel / 100;

    for (let i = 0; i < nSteps; i++) {
      const swing = isSwung(i, m, style) ? ST * (opts.swing / 100) * 0.66 : 0;
      const at = tick + i * ST + swing;

      const add = (note: number, vel: number, lane: LaneKey, ghost?: boolean): void => {
        const off = feel && amt ? ST * amt * feelOffset(feel, lane, i, ghost) : 0;
        /* A hit pushed in front of bar 1 has nowhere earlier to go, so it lands
           on the downbeat rather than at a negative tick. */
        const on = Math.max(0, Math.round(at + off));
        events.push({ t: on, type: 0x99, n: note, v: vel });
        events.push({ t: on + 60, type: 0x89, n: note, v: 0 });
      };

      if (bar.k[i]) {
        const feather =
          style?.kickFeather && bar.k[i] === 1 && isGroupStart(m, i) ? style.kickFeather : 1;
        add(MIDI_MAP.k, clamp(Math.round((bar.k[i] === 2 ? 118 : 100) * feather), 1, 127), 'k');
      }
      if (bar[FOOT_LANE][i]) add(MIDI_MAP.hf, 76, 'h');
      if (bar.s[i]) {
        add(
          bar.s[i] === 4 ? MIDI_MAP.sCross : MIDI_MAP.s,
          bar.s[i] === 1 ? 28 : bar.s[i] === 3 ? 120 : 92,
          's',
          bar.s[i] === 1
        );
      }
      if (bar.h[i]) {
        add(
          bar.h[i] === 3 ? MIDI_MAP.hOpen : MIDI_MAP.h,
          clamp(Math.round(100 * hatShape(i, bar.h[i], 'h', m, style, opts.hats)), 1, 127),
          'h'
        );
      }
      if (bar.r[i]) {
        add(
          bar.r[i] === 2 ? MIDI_MAP.rBell : MIDI_MAP.r,
          clamp(
            Math.round(
              (bar.r[i] === 2 ? 112 : 96) * hatShape(i, bar.r[i], 'r', m, style, opts.hats)
            ),
            1,
            127
          ),
          'r'
        );
      }
      if (bar.c[i]) add(MIDI_MAP.c, 116, 'c');

      for (const L of TOM_LANES) {
        if (bar[L][i]) add(MIDI_MAP[L], bar[L][i] === 2 ? 118 : 98, 's');
      }
      PERC_LANES.forEach((L, li) => {
        if (!bar[L][i]) return;
        const inst = percInst(pat.perc?.[L] ?? DEFAULT_PERC[li]);
        add(bar[L][i] === 2 ? inst.hi : inst.midi, bar[L][i] === 2 ? 112 : 88, 's');
      });
    }
    tick += nSteps * ST;
  }

  // note-offs sort before note-ons at the same tick, so a repeated note retriggers
  events.sort((a, b) => a.t - b.t || (a.type & 0xf0) - (b.type & 0xf0));

  const track: number[] = [];
  const mpqn = Math.round(60000000 / opts.bpm);
  track.push(0, 0xff, 0x51, 0x03, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255);

  const em = meterOfPat(seq[0]?.pattern ?? null);
  const den = Math.round(Math.log(em.den) / Math.LN2);
  track.push(0, 0xff, 0x58, 0x04, em.num, den, 24, 8);

  let last = 0;
  for (const e of events) {
    track.push(...vlq(e.t - last));
    track.push(e.type, e.n, e.v);
    last = e.t;
  }
  track.push(0, 0xff, 0x2f, 0x00);

  const len = track.length;
  const bytes = [
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    (PPQ >> 8) & 255,
    PPQ & 255,
    0x4d,
    0x54,
    0x72,
    0x6b,
    (len >> 24) & 255,
    (len >> 16) & 255,
    (len >> 8) & 255,
    len & 255,
    ...track,
  ];

  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b & 255);
  return { base64: btoa(bin), bytes };
}
