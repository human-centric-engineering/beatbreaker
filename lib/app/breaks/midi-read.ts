import { type ImportResult, capBars } from '@/lib/app/breaks/import';
import { PERC_INSTS, PERC_LANES } from '@/lib/app/breaks/lanes';
import { valueForVelocity } from '@/lib/app/breaks/perform';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, PercLaneKey } from '@/lib/app/breaks/types';

/**
 * Read a Standard MIDI File into bars — the inverse of `buildMidi()`.
 *
 * GM drum map to lanes, every hit quantised to the nearest sixteenth, the meter
 * from the first time-signature event and the tempo from the first tempo
 * event. Drums are read from channel 10; a file with nothing there is read
 * from every channel, since some exporters put a drum track on channel 1.
 *
 * **Velocity decides accents and ghosts**, read against the levels the
 * speakers play (`valueForVelocity` in `perform.ts`): each velocity is the
 * nearest written value on its lane, and a hi-hat is an accent when it is on
 * the loud side of the cymbal band. A file BeatBreaker wrote therefore reads
 * back exactly at any setting of the hats slider, and a file from a DAW or an
 * e-kit is read on the same scale you hear. Change a level there and this
 * follows.
 *
 * Everything is bounds-checked; a truncated or hostile file is an error, not
 * an exception. Nothing here allocates in proportion to a number the file
 * claims — only to bytes it actually has.
 */

/** GM note → lane and whether the note itself names the value. */
const GM: Record<number, { lane: LaneKey; value?: number }> = {
  35: { lane: 'k' },
  36: { lane: 'k' },
  37: { lane: 's', value: 4 }, // side stick
  38: { lane: 's' },
  40: { lane: 's' }, // electric snare
  42: { lane: 'h' },
  44: { lane: 'hf', value: 1 },
  46: { lane: 'h', value: 3 },
  51: { lane: 'r', value: 1 },
  59: { lane: 'r', value: 1 }, // ride 2
  53: { lane: 'r', value: 2 },
  49: { lane: 'c', value: 1 },
  57: { lane: 'c', value: 1 }, // crash 2
  52: { lane: 'c', value: 1 }, // china
  55: { lane: 'c', value: 1 }, // splash
  48: { lane: 't1' },
  50: { lane: 't1' },
  45: { lane: 't2' },
  47: { lane: 't2' },
  41: { lane: 't3' },
  43: { lane: 't3' },
};

interface NoteOn {
  tick: number;
  channel: number;
  note: number;
  velocity: number;
}

class Reader {
  pos = 0;
  constructor(
    readonly bytes: Uint8Array,
    readonly end: number = bytes.length
  ) {}
  need(n: number): void {
    if (this.pos + n > this.end) throw new MidiError('the file ends in the middle of a track');
  }
  u8(): number {
    this.need(1);
    return this.bytes[this.pos++];
  }
  u16(): number {
    return (this.u8() << 8) | this.u8();
  }
  u32(): number {
    return ((this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8()) >>> 0;
  }
  tag(): string {
    this.need(4);
    const s = String.fromCharCode(...this.bytes.subarray(this.pos, this.pos + 4));
    this.pos += 4;
    return s;
  }
  vlq(): number {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    throw new MidiError('a delta time is longer than MIDI allows');
  }
  skip(n: number): void {
    this.need(n);
    this.pos += n;
  }
}

class MidiError extends Error {}

interface Parsed {
  division: number;
  notes: NoteOn[];
  tempo?: { tick: number; mpqn: number };
  timeSigs: Array<{ tick: number; num: number; den: number }>;
  name: string;
}

function parse(bytes: Uint8Array): Parsed {
  const r = new Reader(bytes);
  if (bytes.length < 14 || r.tag() !== 'MThd') throw new MidiError('that is not a MIDI file');
  const headerLen = r.u32();
  if (headerLen < 6) throw new MidiError('that is not a MIDI file');
  const format = r.u16();
  const tracks = r.u16();
  const division = r.u16();
  r.skip(headerLen - 6);
  if (format > 1)
    throw new MidiError('format 2 MIDI files (independent sequences) are not supported');
  if (division & 0x8000)
    throw new MidiError(
      'this file keeps time in SMPTE frames, not beats; export it with beat-based timing'
    );
  if (division === 0) throw new MidiError('that is not a MIDI file');

  const out: Parsed = { division, notes: [], timeSigs: [], name: '' };

  for (let t = 0; t < tracks && r.pos < bytes.length; t++) {
    // skip any chunk that is not a track, as the spec asks
    let tag = r.tag();
    let len = r.u32();
    while (tag !== 'MTrk') {
      r.skip(len);
      if (r.pos >= bytes.length) return out;
      tag = r.tag();
      len = r.u32();
    }
    const end = r.pos + len;
    if (end > bytes.length) throw new MidiError('the file ends in the middle of a track');
    const tr = new Reader(bytes, end);
    tr.pos = r.pos;

    let tick = 0;
    let status = 0;
    while (tr.pos < end) {
      tick += tr.vlq();
      let b = tr.u8();
      if (b < 0x80) {
        if (!status) throw new MidiError('a track starts without a status byte');
        tr.pos--; // running status: this byte is data
        b = status;
      }
      if (b === 0xff) {
        const type = tr.u8();
        const n = tr.vlq();
        tr.need(n);
        const at = tr.pos;
        const mpqn = (bytes[at] << 16) | (bytes[at + 1] << 8) | bytes[at + 2];
        if (type === 0x51 && n === 3 && mpqn > 0 && (!out.tempo || tick < out.tempo.tick)) {
          out.tempo = { tick, mpqn };
        } else if (type === 0x58 && n >= 2) {
          out.timeSigs.push({ tick, num: bytes[at], den: 2 ** bytes[at + 1] });
        } else if (type === 0x03 && !out.name && n > 0) {
          out.name = String.fromCharCode(...bytes.subarray(at, at + Math.min(n, 120)));
        }
        tr.skip(n);
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        tr.skip(tr.vlq());
        continue;
      }
      status = b;
      const kind = b & 0xf0;
      const channel = b & 0x0f;
      if (kind === 0xc0 || kind === 0xd0) {
        tr.u8();
        continue;
      }
      const d1 = tr.u8();
      const d2 = tr.u8();
      if (kind === 0x90 && d2 > 0) out.notes.push({ tick, channel, note: d1, velocity: d2 });
    }
    r.pos = end;
  }
  return out;
}

const PERC_BY_NOTE = new Map<number, { inst: string; value: number }>();
for (const [key, inst] of Object.entries(PERC_INSTS)) {
  if (!PERC_BY_NOTE.has(inst.midi)) PERC_BY_NOTE.set(inst.midi, { inst: key, value: 1 });
  if (inst.hi !== inst.midi && !PERC_BY_NOTE.has(inst.hi))
    PERC_BY_NOTE.set(inst.hi, { inst: key, value: 2 });
}

/** Two notes on one step of one lane: the louder value wins, as the ear would have it. */
const RANK: Partial<Record<LaneKey, number[]>> = { s: [0, 1, 3, 4, 2], h: [0, 1, 3, 2] };
function louder(lane: LaneKey, a: number, b: number): number {
  const rank = RANK[lane];
  if (!rank) return Math.max(a, b);
  return rank[a] >= rank[b] ? a : b;
}

export function readMidi(bytes: Uint8Array): ImportResult {
  let parsed: Parsed;
  try {
    parsed = parse(bytes);
  } catch (err) {
    if (err instanceof MidiError) return { ok: false, error: err.message };
    throw err;
  }

  const notes: string[] = [];
  const sig = parsed.timeSigs.sort((a, b) => a.tick - b.tick)[0];
  const meter = sig ? `${sig.num}/${sig.den}` : DEFAULT_METER;
  if (!METERS[meter]) {
    return {
      ok: false,
      error: `the file is in ${meter}, and BeatBreaker has ${Object.keys(METERS).join(', ')}`,
    };
  }
  if (parsed.timeSigs.some((s) => `${s.num}/${s.den}` !== meter)) {
    notes.push(`The time signature changes part-way through; everything was read in ${meter}.`);
  }

  let hits = parsed.notes.filter((n) => n.channel === 9);
  if (!hits.length && parsed.notes.length) {
    hits = parsed.notes;
    notes.push('Nothing was on the drum channel (10), so every channel was read as drums.');
  }
  if (!hits.length) return { ok: false, error: 'there are no notes in that file' };

  const steps = stepsOf(meterOf(meter));
  const stepTicks = parsed.division / 4;
  const lastStep = Math.max(...hits.map((h) => Math.round(h.tick / stepTicks)));
  /* Bounded by the notes the file really has, so a note at tick 2^28 costs one
     empty bar per sixteen, not a claimed length — and capBars trims it after. */
  const barCount = Math.min(Math.floor(lastStep / steps) + 1, 64);
  const bars: Bar[] = Array.from({ length: barCount }, () => emptyBar(steps));

  const perc: Partial<Record<PercLaneKey, string>> = {};
  const unknown = new Map<number, number>();
  let moved = 0;
  let beyond = 0;

  for (const h of [...hits].sort((a, b) => a.tick - b.tick || a.note - b.note)) {
    const at = Math.round(h.tick / stepTicks);
    if (Math.abs(h.tick - at * stepTicks) > stepTicks / 4) moved++;
    const bi = Math.floor(at / steps);
    if (bi >= barCount) {
      beyond++;
      continue;
    }
    const i = at % steps;

    let lane: LaneKey | undefined;
    let value = 0;
    const gm = GM[h.note];
    if (gm) {
      lane = gm.lane;
      value = gm.value ?? valueForVelocity(gm.lane, h.velocity);
    } else {
      const p = PERC_BY_NOTE.get(h.note);
      if (p) {
        let slot = PERC_LANES.find((L) => perc[L] === p.inst);
        if (!slot) {
          slot = PERC_LANES.find((L) => !perc[L]);
          if (slot) perc[slot] = p.inst;
        }
        if (slot) {
          lane = slot;
          const inst = PERC_INSTS[p.inst];
          value = inst.hi !== inst.midi ? p.value : valueForVelocity(slot, h.velocity);
        }
      }
    }
    if (!lane) {
      unknown.set(h.note, (unknown.get(h.note) ?? 0) + 1);
      continue;
    }
    bars[bi][lane][i] = louder(lane, bars[bi][lane][i], value);
  }

  if (moved)
    notes.push(
      `${moved} ${moved === 1 ? 'note was' : 'notes were'} moved to the nearest sixteenth.`
    );
  if (beyond) notes.push(`${beyond} notes past bar ${barCount} were left out.`);
  if (unknown.size) {
    const total = [...unknown.values()].reduce((a, b) => a + b, 0);
    const list = [...unknown.keys()].sort((a, b) => a - b).join(', ');
    notes.push(
      `${total} ${total === 1 ? 'note' : 'notes'} with no lane here (MIDI ${list}) ${total === 1 ? 'was' : 'were'} left out.`
    );
  }

  const bpm = parsed.tempo
    ? Math.min(400, Math.max(20, Math.round(60_000_000 / parsed.tempo.mpqn)))
    : 120;
  if (!parsed.tempo) notes.push('The file has no tempo, so it was read at 120 bpm.');

  return {
    ok: true,
    pattern: capBars({ name: parsed.name.trim(), meter, bpm, swing: 0, bars, perc, notes }),
  };
}
