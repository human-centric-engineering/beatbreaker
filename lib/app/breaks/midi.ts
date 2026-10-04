import { Humaniser } from '@/lib/app/breaks/humanise';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { MIDI_MAP, midiVelocity, performStep } from '@/lib/app/breaks/perform';
import type { Pattern } from '@/lib/app/breaks/types';

/**
 * Standard MIDI File, format 0, GM drum map on channel 10.
 *
 * **The file is the performance you hear, written down.** Every note's
 * velocity and offset come from `performStep` — the same call the transport
 * voices the speakers and the live MIDI port from — so the swing, the style's
 * off-grid feel, the hi-hat and ride dynamics and their accent bands, the kick
 * feathering, Humanise: all of it is in the file because all of it is in the
 * playback, and nothing is decided here. Humanise makes its own humaniser from
 * the seed the transport was given, so the file is the first pass you heard,
 * and as many passes after it as it has bars for. A Dilla break exported quantised would be
 * missing the one thing about it that mattered. The single exception is a hit
 * pushed in front of bar 1, which has nowhere earlier to go and sits on the
 * downbeat.
 *
 * The mixer is not in the file, as it is not on the live port: faders and mutes
 * are the speakers' business (D23).
 *
 * **What GM cannot say is said around it** (9-iv). A rimshot is 40, crash 2,
 * china and splash 57, 52 and 55. A flam is the snare's 38 with a soft grace
 * just ahead of it, a drag two graces, a buzz three soft repeats inside the
 * step — the notes `performStep` plays, so `readMidi` reads them back from
 * their shape. GM has no half-open hat: it is the open hat's 46, sent under the
 * open band (`HALF_OPEN_MAX` in `perform.ts`), and read back by velocity.
 */

export { MIDI_MAP };

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
  /**
   * Humanise, as the transport plays it: Amount 0–100 and the performance's
   * seed. Absent is _Quantised_ — the swing and feel without it.
   */
  humanise?: { amount: number; seed: number };
}

export interface MidiFile {
  base64: string;
  bytes: number[];
}

export function buildMidi(seq: SequencedBar[], opts: MidiOptions): MidiFile {
  const PPQ = 480;
  const ST = PPQ / 4; // one grid step is a sixteenth, in every meter
  const events: MidiEvent[] = [];
  const ons: Array<{ t: number; n: number; v: number }> = [];
  let tick = 0;
  const human = opts.humanise
    ? {
        stream: new Humaniser(opts.humanise.seed),
        amount: opts.humanise.amount,
        bpm: opts.bpm,
      }
    : null;

  for (const pos of seq) {
    const pat = pos.pattern;
    const bar = pat.bars[pos.barIdx];
    if (!bar) continue;

    const nSteps = bar.k.length;
    for (let i = 0; i < nSteps; i++) {
      const voices = performStep(pat, bar, i, {
        swing: opts.swing,
        feel: opts.feel,
        hats: opts.hats,
        humanise: human,
        bpm: opts.bpm,
      });
      for (const voice of voices) {
        /* A hit pushed in front of bar 1 has nowhere earlier to go, so it lands
           on the downbeat rather than at a negative tick. */
        const on = Math.max(0, Math.round(tick + (i + voice.offset) * ST));
        ons.push({ t: on, n: voice.note, v: midiVelocity(voice.velocity) });
      }
    }
    tick += nSteps * ST;
  }

  /* Each note sounds for 60 ticks, or until the next note-on of the same
     note: a flam's grace 25 ms ahead of its note would otherwise still be
     held when the note starts, and a buzz's repeats are closer than that. */
  const offs = new Map<(typeof ons)[number], number>();
  const prev = new Map<number, (typeof ons)[number]>();
  for (const on of [...ons].sort((a, b) => a.t - b.t)) {
    const before = prev.get(on.n);
    if (before) offs.set(before, Math.min(before.t + 60, on.t));
    prev.set(on.n, on);
  }
  // in the order they were played, so notes on one tick keep their order
  for (const on of ons) {
    events.push({ t: on.t, type: 0x99, n: on.n, v: on.v });
    events.push({ t: offs.get(on) ?? on.t + 60, type: 0x89, n: on.n, v: 0 });
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

/**
 * A file name for a pattern's MIDI: its title, kept to what every file system
 * takes, with `.mid` on the end. A title with nothing usable in it is a break.
 */
export function midiFileName(title: string): string {
  const safe = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .replace(/^[.\s]+|[.\s]+$/g, '');
  return `${safe || 'break'}.mid`;
}
