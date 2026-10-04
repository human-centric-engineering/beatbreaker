import { type ImportResult, capBars } from '@/lib/app/breaks/import';
import {
  BUZZ,
  CHINA,
  CRASH_2,
  DRAG,
  FLAM,
  PERC_INSTS,
  PERC_LANES,
  RIMSHOT,
  SPLASH,
  TOM_FLAM,
} from '@/lib/app/breaks/lanes';
import { GRACE_MAX, openHatValue, valueForVelocity } from '@/lib/app/breaks/perform';
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
 * **Flams, drags and buzzes are read from their shape** (9-iv), before
 * anything is quantised: a soft snare or tom note a little ahead of a louder
 * one on the same drum is its grace — one makes a flam, two a drag — and two
 * or more soft snare notes inside the step after a louder one are a buzz.
 * Those soft notes are then part of their note, not notes of their own. GM
 * has no half-open hat; the open hat's 46 under the open band is one.
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
  /* GM's "electric snare", and what kits send for a rimshot. It read as a
     plain snare until 9-iv gave the rimshot a value. */
  40: { lane: 's', value: RIMSHOT },
  42: { lane: 'h' },
  44: { lane: 'hf', value: 1 },
  46: { lane: 'h', value: 3 }, // or a half-open hat, by velocity: see `openHatValue`
  51: { lane: 'r', value: 1 },
  59: { lane: 'r', value: 1 }, // ride 2
  53: { lane: 'r', value: 2 },
  49: { lane: 'c', value: 1 },
  57: { lane: 'c', value: CRASH_2 },
  52: { lane: 'c', value: CHINA },
  55: { lane: 'c', value: SPLASH },
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

/**
 * Two notes on one step of one lane: the louder value wins, as the ear would
 * have it. Ranks by value: on the snare a ghost, cross-stick, hit, buzz,
 * accent, rimshot, flam, drag; on the hat closed, half-open, open, accent.
 */
const RANK: Partial<Record<LaneKey, number[]>> = {
  s: [0, 1, 3, 5, 2, 6, 7, 8, 4],
  h: [0, 1, 4, 3, 2],
};

/** How far ahead of its note a grace may be, in steps — the furthest `performStep` puts one, and a little. */
const GRACE_WINDOW = 0.4;
/** How far after its note a buzz's repeats may run, in steps: inside the step, short of the next one. */
const BUZZ_WINDOW = 0.85;
/** The widest gap between one repeat of a buzz and the next, in steps. `performStep` writes a quarter. */
const BUZZ_GAP = 0.3;
/** How soft a note must be beside a louder one to be its grace or repeat: GRACE_MAX, and MIDI's rounding. */
const SOFT = GRACE_MAX + 0.05;

interface Ornaments {
  /** Notes that are another note's grace or repeat, and not notes of their own. */
  part: Set<NoteOn>;
  /** The value each ornamented note is read as. */
  value: Map<NoteOn, number>;
}

/**
 * Find the flams, drags and buzzes: the shapes `performStep` writes, read off
 * the unquantised ticks. Only the drums that have them (the snare's 38, the
 * toms), and only between notes of the same drum.
 */
function readOrnaments(hits: NoteOn[], stepTicks: number): Ornaments {
  const part = new Set<NoteOn>();
  const value = new Map<NoteOn, number>();
  for (const lane of ['s', 't1', 't2', 't3'] as const) {
    const list = hits
      .filter((h) => GM[h.note]?.lane === lane && GM[h.note]?.value === undefined)
      .sort((a, b) => a.tick - b.tick);
    const soft = (x: NoteOn, n: NoteOn): boolean => x.velocity <= n.velocity * SOFT;

    /* Buzzes first: a roll is dense, each repeat close behind the last, so a
       drag's graces after an earlier hit are not one — and the last repeat of
       a buzz just ahead of the next hit is not that hit's grace. */
    if (lane === 's') {
      list.forEach((note, k) => {
        if (part.has(note)) return;
        const rs: NoteOn[] = [];
        let prev = note;
        for (let j = k + 1; j < list.length && rs.length < 3; j++) {
          const x = list[j];
          if (x.tick - note.tick >= BUZZ_WINDOW * stepTicks) break;
          // strictly after: a drag on the downbeat has its graces on the note's own tick
          if (x.tick === note.tick) break;
          if (x.tick - prev.tick > BUZZ_GAP * stepTicks) break;
          if (!soft(x, note)) break;
          rs.push(x);
          prev = x;
        }
        if (rs.length < 2) return;
        rs.forEach((r) => part.add(r));
        value.set(note, BUZZ);
      });
    }

    const graces = new Map<NoteOn, NoteOn[]>();
    list.forEach((x, k) => {
      if (part.has(x)) return;
      /* At or after it: a flam on the first beat of a file has its grace
         pulled onto the downbeat, as `buildMidi` writes it. */
      const ahead = list.find(
        (n, j) =>
          j !== k &&
          !part.has(n) &&
          n.tick >= x.tick &&
          n.tick - x.tick <= GRACE_WINDOW * stepTicks &&
          soft(x, n)
      );
      if (ahead) graces.set(ahead, [...(graces.get(ahead) ?? []), x]);
    });
    for (const [note, gs] of graces) {
      if (part.has(note)) continue;
      gs.forEach((g) => part.add(g));
      value.set(note, lane === 's' ? (gs.length > 1 ? DRAG : FLAM) : TOM_FLAM);
    }
  }
  return { part, value };
}
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
  const ornaments = readOrnaments(hits, stepTicks);
  // a buzz's repeats run past its step, and must not add a bar of their own
  const lastStep = Math.max(
    ...hits.filter((h) => !ornaments.part.has(h)).map((h) => Math.round(h.tick / stepTicks))
  );
  /* Bounded by the notes the file really has, so a note at tick 2^28 costs one
     empty bar per sixteen, not a claimed length — and capBars trims it after. */
  const barCount = Math.min(Math.floor(lastStep / steps) + 1, 64);
  const bars: Bar[] = Array.from({ length: barCount }, () => emptyBar(steps));

  const perc: Partial<Record<PercLaneKey, string>> = {};
  const unknown = new Map<number, number>();
  let moved = 0;
  let beyond = 0;

  for (const h of [...hits].sort((a, b) => a.tick - b.tick || a.note - b.note)) {
    if (ornaments.part.has(h)) continue;
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
      value =
        ornaments.value.get(h) ??
        (h.note === 46
          ? openHatValue(h.velocity)
          : (gm.value ?? valueForVelocity(gm.lane, h.velocity)));
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
