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
import { DEFAULT_METER, METERS, groupsOf, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { MAX_TUPLETS, tupletChoices, twoAStep } from '@/lib/app/breaks/tuplets';
import type { Bar, LaneKey, PercLaneKey, TupletSpan } from '@/lib/app/breaks/types';

/**
 * Read a Standard MIDI File into bars — the inverse of `buildMidi()`.
 *
 * GM drum map to lanes, every hit quantised to the nearest sixteenth, each
 * bar in the time signature in force where it starts (a change of signature
 * starts a new section, 11-e-ii) and the tempo from the first tempo event. Drums are read from channel 10; a file with nothing there is read
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
 * **Triplets stay triplets, and tuplets tuplets** (12-d, D55). A 4/4 file
 * whose notes all sit on sixteenth-note triplets and not all on sixteenths is
 * read in sextuplet 4/4 (`4/4-6`), where every triplet is on the grid. In any
 * other file, a lane whose notes in a beat sit on an even division the grid
 * cannot hold — five, six, seven to the beat — is read as a tuplet span over
 * that beat, every lane with the same division in one span, rather than
 * rounded to sixteenths. A note is on a division when it is within
 * {@link TUPLET_TOLERANCE} of a beat of it; a played file looser than that is
 * rounded, as it always was.
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
/** How many notes either side a grace is looked for among. */
const SEARCH = 8;
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
         pulled onto the downbeat, as `buildMidi` writes it. The search looks
         at no more than SEARCH notes either side — a grace is a few
         milliseconds from its note — so a file of thousands of notes on one
         tick costs thousands of steps, not millions. */
      let ahead: NoteOn | undefined;
      for (let j = k - 1, n = 0; j >= 0 && n < SEARCH && list[j].tick === x.tick; j--, n++) {
        if (!part.has(list[j]) && soft(x, list[j])) {
          ahead = list[j];
          break;
        }
      }
      for (let j = k + 1, n = 0; !ahead && j < list.length && n < SEARCH; j++, n++) {
        const c = list[j];
        if (c.tick - x.tick > GRACE_WINDOW * stepTicks) break;
        if (!part.has(c) && soft(x, c)) ahead = c;
      }
      if (!ahead) return;
      const gs = graces.get(ahead);
      if (gs) gs.push(x);
      else graces.set(ahead, [x]);
    });
    for (const [note, gs] of graces) {
      if (part.has(note)) continue;
      gs.forEach((g) => part.add(g));
      value.set(note, lane === 's' ? (gs.length > 1 ? DRAG : FLAM) : TOM_FLAM);
    }
  }
  return { part, value };
}
/**
 * How near an even division of the beat a note must be to be read as on it,
 * as a fraction of the beat: a 192nd, ten ticks at 480 a quarter. Seven to the
 * beat and six are a 42nd of a beat apart; a sixteenth and a quintuplet a
 * twentieth.
 */
export const TUPLET_TOLERANCE = 1 / 48;

/** The fewest notes a lane plays in a span before it is read as one: fewer is a loose note, not a figure. */
const MIN_TUPLET_NOTES = 3;

/** The furthest any tick is from the nearest multiple of `every` ticks. */
function worst(ticks: readonly number[], from: number, every: number): number {
  let out = 0;
  for (const t of ticks) {
    const x = (t - from) / every;
    out = Math.max(out, Math.abs(x - Math.round(x)) * every);
  }
  return out;
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
  const sigs = [...parsed.timeSigs].sort((a, b) => a.tick - b.tick);
  /* A file is in 4/4 until a signature says otherwise (the MIDI spec's
     default), so one whose first signature comes later starts in 4/4 and
     changes there. Within a 32nd of the top is the top. */
  const first = sigs[0] && sigs[0].tick <= parsed.division / 8 ? sigs[0] : undefined;
  const meter = first ? `${first.num}/${first.den}` : DEFAULT_METER;
  if (!METERS[meter]) {
    return {
      ok: false,
      error: `the file is in ${meter}, and BeatBreaker has ${Object.keys(METERS).join(', ')}`,
    };
  }
  /* A later signature this app has no meter for is read in the one before it,
     and said; the rest each start their own section. */
  const changes: { tick: number; meter: string }[] = first ? [] : [{ tick: 0, meter }];
  const unread = new Set<string>();
  for (const s of sigs) {
    const key = `${s.num}/${s.den}`;
    if (METERS[key]) changes.push({ tick: s.tick, meter: key });
    else unread.add(key);
  }
  if (unread.size) {
    notes.push(
      `BeatBreaker has no ${[...unread].join(' or ')}, so those bars were read in the time signature before them.`
    );
  }

  let hits = parsed.notes.filter((n) => n.channel === 9);
  if (!hits.length && parsed.notes.length) {
    hits = parsed.notes;
    notes.push('Nothing was on the drum channel (10), so every channel was read as drums.');
  }
  if (!hits.length) return { ok: false, error: 'there are no notes in that file' };

  /* A 4/4 file in triplets is read in sextuplet 4/4, where they are the grid
     (12-d): rounded to sixteenths they would be another groove. */
  const tol = parsed.division * TUPLET_TOLERANCE;
  const onTicks = hits.map((h) => h.tick);
  const offSixteenths = onTicks.filter((t) => worst([t], 0, parsed.division / 4) > tol).length;
  const sextuplets =
    meter === DEFAULT_METER &&
    changes.every((c) => c.meter === meter) &&
    !!METERS['4/4-6'] &&
    offSixteenths >= MIN_TUPLET_NOTES &&
    worst(onTicks, 0, parsed.division / 6) <= tol;
  const readMeter = sextuplets ? '4/4-6' : meter;
  if (sextuplets) {
    changes.splice(0, changes.length, { tick: 0, meter: readMeter });
    notes.push('The notes are triplets, so it was read in sextuplet 4/4 (six to the beat).');
  }

  const stepTicks = parsed.division / (sextuplets ? 6 : 4);
  const ornaments = readOrnaments(hits, parsed.division / 4);
  // a buzz's repeats run past its step, and must not add a bar of their own
  const lastStep = Math.max(
    ...hits.filter((h) => !ornaments.part.has(h)).map((h) => Math.round(h.tick / stepTicks))
  );
  /* Where each bar starts, in sixteenths, and its meter: the signature in force
     at its first step. A change that falls inside a bar takes effect at the
     next. Bounded by the notes the file really has, so a note at tick 2^28
     costs one empty bar per bar's worth of steps, not a claimed length — and
     capBars trims it after. */
  const layout: { start: number; meter: string; steps: number }[] = [];
  for (let start = 0, c = 0; start <= lastStep && layout.length < 64;) {
    while (c + 1 < changes.length && changes[c + 1].tick <= start * stepTicks + stepTicks / 2) c++;
    const m = changes[c]?.meter ?? readMeter;
    const n = stepsOf(meterOf(m));
    layout.push({ start, meter: m, steps: n });
    start += n;
  }
  const barCount = layout.length;
  const bars: Bar[] = layout.map((b) => emptyBar(b.steps));
  const end = layout[barCount - 1].start + layout[barCount - 1].steps;
  /** The bar a step falls in: the last to start at or before it. */
  const barAt = (at: number): number => {
    let lo = 0;
    let hi = barCount - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (layout[mid].start <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const perc: Partial<Record<PercLaneKey, string>> = {};
  const unknown = new Map<number, number>();
  let moved = 0;
  let beyond = 0;

  /* Each note's lane and value first, in time order, so the percussion slots
     fill in the order the file plays them. */
  const read: { h: NoteOn; lane: LaneKey; value: number }[] = [];
  for (const h of [...hits].sort((a, b) => a.tick - b.tick || a.note - b.note)) {
    if (ornaments.part.has(h)) continue;
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
    read.push({ h, lane, value });
  }

  /* Tuplets (12-d): each lane whose notes sit on an even division the grid
     cannot hold, read as a span — over the whole bar where its notes fit one
     (a 5:4), else a beat at a time — the lanes with the same division sharing
     one. It takes at least three notes to say a lane is in a tuplet: one
     late note is a swung or a loose one, not a quintuplet. A note on the
     next downbeat is the grid's. */
  const tuplets: TupletSpan[] = [];
  const taken = new Set<NoteOn>();
  type Read = (typeof read)[number];
  const readSpan = (bi: number, start: number, size: number, notesIn: Read[]) => {
    const from = (layout[bi].start + start) * stepTicks;
    const ticks = size * stepTicks;
    const inSpan = notesIn.filter(
      (x) => !taken.has(x.h) && x.h.tick >= from - tol && x.h.tick < from + ticks - tol
    );
    const byN = new Map<number, Map<LaneKey, Read[]>>();
    for (const lane of new Set(inSpan.map((x) => x.lane))) {
      const mine = inSpan.filter((x) => x.lane === lane);
      // one lane's steps are in one span
      const held = tuplets.some(
        (t) => t.bar === bi && t.notes[lane] && t.start < start + size && start < t.start + t.span
      );
      if (held) continue;
      const t = mine.map((x) => x.h.tick);
      if (mine.length < MIN_TUPLET_NOTES || worst(t, from, stepTicks) <= tol) continue;
      let best = 0;
      let err = Infinity;
      // two to a step are doubles, read a step at a time below (13-a)
      for (const n of tupletChoices(size).filter((c) => c !== 2 * size)) {
        const e = worst(t, from, ticks / n);
        if (e < err - 1e-9) [best, err] = [n, e];
      }
      if (!best || err > tol) continue;
      const lanes = byN.get(best) ?? new Map<LaneKey, Read[]>();
      lanes.set(lane, mine);
      byN.set(best, lanes);
    }
    for (const [n, lanes] of byN) {
      // past the most a pattern holds, the notes go to the grid as they would without
      if (tuplets.length >= MAX_TUPLETS) break;
      const span: TupletSpan = { bar: bi, start, span: size, n, notes: {} };
      for (const [lane, mine] of lanes) {
        const row = Array<number>(n).fill(0);
        for (const x of mine) {
          const j = Math.round((x.h.tick - from) / (ticks / n));
          if (j < 0 || j >= n) continue;
          row[j] = louder(lane, row[j], x.value);
          taken.add(x.h);
        }
        span.notes[lane] = row;
      }
      tuplets.push(span);
    }
  };
  if (!sextuplets) {
    layout.forEach((b, bi) => {
      const from = b.start * stepTicks;
      const inBar = read.filter(
        (x) => x.h.tick >= from - tol && x.h.tick < from + b.steps * stepTicks - tol
      );
      if (!inBar.length) return;
      readSpan(bi, 0, b.steps, inBar);
      for (const g of groupsOf(meterOf(b.meter))) {
        readSpan(bi, g.start, g.size, inBar);
      }
    });
  }
  /* Doubles (13-a): a lane's two notes in one step, one on the step and one
     halfway through it, are two 32nds — a double — rather than two notes
     rounded into one cell. Only a pair: a lone note halfway through a step
     is a loose one, and is moved to the nearest step as before. */
  const pairs = new Map<string, { lane: LaneKey; at: number; first: Read[]; second: Read[] }>();
  for (const x of read) {
    if (taken.has(x.h)) continue;
    const pos = (x.h.tick / stepTicks) * 2;
    const half = Math.round(pos);
    if (Math.abs(pos - half) * (stepTicks / 2) > tol) continue;
    const at = Math.floor(half / 2);
    const key = `${x.lane}:${at}`;
    const pair = pairs.get(key) ?? { lane: x.lane, at, first: [], second: [] };
    (half % 2 ? pair.second : pair.first).push(x);
    pairs.set(key, pair);
  }
  for (const { lane, at, first, second } of pairs.values()) {
    if (!first.length || !second.length || at >= end) continue;
    const bi = barAt(at);
    const i = at - layout[bi].start;
    if (tuplets.some((t) => t.bar === bi && t.notes[lane] && i >= t.start && i < t.start + t.span))
      continue;
    const same = tuplets.find((t) => t.bar === bi && t.start === i && t.span === 1 && t.n === 2);
    if (!same && tuplets.length >= MAX_TUPLETS) continue;
    const loudest = (xs: Read[]) => xs.reduce((v, x) => louder(lane, v, x.value), 0);
    const span = same ?? { bar: bi, start: i, span: 1, n: 2, notes: {} };
    span.notes[lane] = [loudest(first), loudest(second)];
    if (!same) tuplets.push(span);
    for (const x of [...first, ...second]) taken.add(x.h);
  }

  const figures = tuplets.filter((t) => !twoAStep(t));
  if (figures.length) {
    const kinds = [...new Set(figures.map((t) => t.n))].sort((a, b) => a - b).join(', ');
    notes.push(
      `${figures.length} ${figures.length === 1 ? 'tuplet was' : 'tuplets were'} read as written (${kinds} notes each), not rounded to sixteenths.`
    );
  }
  const doubled = tuplets.length - figures.length;
  if (doubled) {
    notes.push(
      `${doubled} ${doubled === 1 ? 'step has' : 'steps have'} two notes in ${sextuplets ? 'a sextuplet' : 'a sixteenth'}, read as ${doubled === 1 ? 'a double' : 'doubles'} rather than rounded into one.`
    );
  }

  for (const { h, lane, value } of read) {
    if (taken.has(h)) continue;
    const at = Math.round(h.tick / stepTicks);
    if (Math.abs(h.tick - at * stepTicks) > stepTicks / 4) moved++;
    if (at >= end) {
      beyond++;
      continue;
    }
    const bi = barAt(at);
    const i = at - layout[bi].start;
    // a cell a span owns stays empty: the span plays it
    if (
      tuplets.some((t) => t.bar === bi && t.notes[lane] && i >= t.start && i < t.start + t.span)
    ) {
      continue;
    }
    bars[bi][lane][i] = louder(lane, bars[bi][lane][i], value);
  }

  if (moved)
    notes.push(
      `${moved} ${moved === 1 ? 'note was' : 'notes were'} moved to the nearest ${sextuplets ? 'sextuplet' : 'sixteenth'}.`
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
    pattern: capBars({
      name: parsed.name.trim(),
      meter: readMeter,
      bpm,
      swing: 0,
      bars,
      // only where the meter changes: one meter throughout is the import it always was
      ...(layout.some((b) => b.meter !== readMeter) ? { meters: layout.map((b) => b.meter) } : {}),
      ...(tuplets.length ? { tuplets } : {}),
      perc,
      notes,
    }),
  };
}
