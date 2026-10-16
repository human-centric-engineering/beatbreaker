import { LANES, LANE_ORDER } from '@/lib/app/breaks/lanes';
import type { SectionLetter } from '@/lib/app/breaks/sections';
import { countLabelsOf, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import {
  MAX_TUPLET,
  MIN_TUPLET,
  tupletFits,
  tupletLanes,
  tupletsIn,
  twoAStep,
} from '@/lib/app/breaks/tuplets';
import type { Bar, LaneKey, Meter, Pattern, TupletSpan } from '@/lib/app/breaks/types';

/**
 * A pattern as text — one line per lane per bar, in the characters the famous
 * breaks were transcribed in (`parseBar`).
 *
 * ```
 * A · funk · 4/4 · 94 bpm · swing 8
 * bar 1   count  1e+a2e+a3e+a4e+a
 *         hat    XxxxXxoxXxxxXxox
 *         snare  ....S..g.g.gS..g
 *         kick   X.X.......X..X..
 * ```
 *
 * This is how BeatBuddy sees a pattern and how it writes one (§6 of the plan):
 * compact, readable by a drummer in the chat transcript, and writable by a
 * model. It is also the one notation the library, the tools and the tests
 * share, so it carries every lane — percussion included, which `parseBar` does
 * not.
 *
 * {@link fromText} is strict where `parseBar` is lenient. `parseBar` reads
 * hand-written seed data and ignores what it does not know, so a spec can be
 * padded for readability; this reads what a model wrote, and a character the
 * lane does not have is a mistake the writer needs to hear about, with the bar,
 * the lane and the step named.
 */

/** What each lane is called in the text. One word, so a line splits on the first space. */
export const TEXT_LANE_LABELS: Record<LaneKey, string> = {
  c: 'crash',
  r: 'ride',
  h: 'hat',
  t1: 'tom1',
  t2: 'tom2',
  s: 'snare',
  t3: 'floor',
  k: 'kick',
  hf: 'foot',
  p1: 'perc1',
  p2: 'perc2',
};

/** Other names a writer may use for a lane. Read, never written. */
const LABEL_ALIASES: Record<string, LaneKey> = {
  hihat: 'h',
  hh: 'h',
  hightom: 't1',
  midtom: 't2',
  floortom: 't3',
  tom3: 't3',
  bass: 'k',
  bassdrum: 'k',
  hihatfoot: 'hf',
  pedal: 'hf',
};

/**
 * The character for each step value, lane by lane. Index 0 is the rest. The
 * same letters `parseBar` reads, with the percussion lanes added in the toms'
 * letters, since they have the same two values.
 *
 * 9-iv's articulations: on the snare `r` rimshot, `f` flam, `d` drag, `z`
 * buzz (the `z` a buzz is written with on the stem); on the hat `h`
 * half-open; on the crash lane `2` crash 2, `N` china, `S` splash; on a tom
 * `F` flam.
 */
export const CHARS: Record<LaneKey, string[]> = {
  k: ['.', 'X', 'A'],
  s: ['.', 'g', 's', 'S', 'c', 'r', 'f', 'd', 'z'],
  h: ['.', 'x', 'X', 'o', 'h'],
  r: ['.', 'r', 'b'],
  c: ['.', 'C', '2', 'N', 'S'],
  t1: ['.', 'X', 'A', 'F'],
  t2: ['.', 'X', 'A', 'F'],
  t3: ['.', 'X', 'A', 'F'],
  hf: ['.', 'f'],
  p1: ['.', 'X', 'A'],
  p2: ['.', 'X', 'A'],
};

/** What each character means, for the error that names what a lane takes. */
export const MEANINGS: Record<LaneKey, string[]> = {
  k: ['rest', 'hit', 'accent'],
  s: ['rest', 'ghost', 'hit', 'accent', 'cross-stick', 'rimshot', 'flam', 'drag', 'buzz'],
  h: ['rest', 'closed', 'accent', 'open', 'half-open'],
  r: ['rest', 'ride', 'bell'],
  c: ['rest', 'crash', 'crash 2', 'china', 'splash'],
  t1: ['rest', 'hit', 'accent', 'flam'],
  t2: ['rest', 'hit', 'accent', 'flam'],
  t3: ['rest', 'hit', 'accent', 'flam'],
  hf: ['rest', 'chick'],
  p1: ['rest', 'hit', 'accent'],
  p2: ['rest', 'hit', 'accent'],
};

/** The width the lane labels are padded to, so the rows line up. */
const LABEL_WIDTH = 7;
const BAR_WIDTH = 8;

/**
 * The count row: one character per step. A two-digit beat (10–15, only in 12/8
 * and 15/8) shows its last digit — the row is for reading, never parsed, and
 * one character a step is what keeps it lined up with the notes.
 */
function countRow(m: Meter): string {
  return countLabelsOf(m)
    .map((l) => l.slice(-1))
    .join('');
}

/** The lanes a pattern's text shows: its roster, plus any lane that has notes anyway. */
function textLanes(pat: Pattern): LaneKey[] {
  return LANE_ORDER.filter(
    (L) => pat.lanes.includes(L) || pat.bars.some((b) => b[L]?.some((v) => v > 0))
  );
}

export interface TextHeader {
  /** Which section this is, when the pattern is one of a break's. */
  section?: SectionLetter;
  bpm?: number;
  swing?: number;
}

/** A pattern's bars as text, with a header line naming what is known about it. */
export function toText(pat: Pattern, header: TextHeader = {}): string {
  const m = meterOf(pat.meter);
  const head = [
    header.section,
    pat.style,
    pat.meter,
    header.bpm != null ? `${header.bpm} bpm` : undefined,
    header.swing ? `swing ${header.swing}` : undefined,
  ].filter((p): p is string => Boolean(p));

  const lines = [head.join(' · ')];
  const lanes = textLanes(pat);
  const count = countRow(m);

  pat.bars.forEach((bar, bi) => {
    lines.push(`${`bar ${bi + 1}`.padEnd(BAR_WIDTH)}${'count'.padEnd(LABEL_WIDTH)}${count}`);
    for (const L of lanes) {
      const row = (bar[L] ?? []).map((v) => CHARS[L][v] ?? '.').join('');
      lines.push(`${''.padEnd(BAR_WIDTH)}${TEXT_LANE_LABELS[L].padEnd(LABEL_WIDTH)}${row}`);
    }
    for (const t of tupletsIn(pat, bi)) lines.push(...tupletLines(m, t));
  });
  return lines.join('\n');
}

/**
 * A tuplet span (12-d) as text, under its bar: what it is and where — the
 * steps counted from 1, as a writer names them — then each lane's notes, one
 * character a note, as the lanes are written. Its cells on the grid rows
 * above are rests: the span owns them. {@link fromText} reads the same lines
 * back (13-c), so BeatBuddy writes a tuplet as it reads one.
 */
function tupletLines(m: Meter, t: NonNullable<Pattern['tuplets']>[number]): string[] {
  const end = t.start + t.span - 1;
  const where =
    t.span === 1
      ? `step ${t.start + 1} (${describeStep(m, t.start)})`
      : `steps ${t.start + 1}–${end + 1} (${describeStep(m, t.start)} to ${describeStep(m, end)})`;
  const out = [
    `${''.padEnd(BAR_WIDTH)}${'tuplet'.padEnd(LABEL_WIDTH)}${t.n} in the time of ${t.span} step${t.span > 1 ? 's' : ''}, ${where}${twoAStep(t) ? ', doubled: two to a step' : ''}`,
  ];
  for (const L of tupletLanes(t)) {
    const row = (t.notes[L] ?? []).map((v) => CHARS[L][v] ?? '.').join('');
    out.push(`${''.padEnd(BAR_WIDTH)}${`› ${TEXT_LANE_LABELS[L]}`.padEnd(LABEL_WIDTH + 2)}${row}`);
  }
  return out;
}

/** "the 'e' of 2", "beat 3" — a step the way a drummer would name it. */
export function describeStep(m: Meter, step: number): string {
  const labels = countLabelsOf(m);
  let beat = 0;
  for (let i = 0; i <= step && i < labels.length; i++)
    if (/^\d+$/.test(labels[i])) beat = Number(labels[i]);
  const label = labels[step];
  if (label == null) return `step ${step + 1}`;
  if (/^\d+$/.test(label)) return `beat ${label}`;
  return `the '${label}' of ${beat}`;
}

/** One bar read from text, with the number the writer gave it. */
export interface TextBar {
  /** 1-based, as written. */
  number: number;
  bar: Bar;
  /** Its tuplets (13-c), each `bar` 0: the reader does not know where the bar goes. */
  tuplets?: TupletSpan[];
}

/**
 * A tuplet's head line: `tuplet 5 in the time of 16 steps, steps 1–16`, as
 * {@link toText} prints it, or as short as `tuplet 5 over steps 1-16`. The
 * note count first, then the steps it covers, counted from 1.
 */
const TUPLET_LINE = /^tuplet\s+(\d+)\b.*?\bsteps?\s+(\d+)(?:\s*[–-]\s*(\d+))?/i;

export type FromTextResult =
  | {
      ok: true;
      bars: TextBar[];
      /** Every lane written in any bar, in `LANES` order. */
      lanes: LaneKey[];
    }
  | { ok: false; error: string };

/** Bar numbers beyond this are not a pattern anyone meant; it bounds the work a pasted wall of text causes. */
const MAX_BAR_NUMBER = 64;

function laneOf(label: string): LaneKey | undefined {
  const key = label.toLowerCase().replace(/[\s_-]/g, '');
  for (const L of LANES) if (TEXT_LANE_LABELS[L] === key || L === key) return L;
  return LABEL_ALIASES[key];
}

function takes(L: LaneKey): string {
  return CHARS[L].map((ch, v) => `${ch} ${MEANINGS[L][v]}`).join(', ');
}

/**
 * Every lane's characters, as one line for a model's tool description:
 * `snare g ghost, s hit, …`. Built from the table the reader reads, so the
 * description cannot promise a character `fromText` refuses.
 */
export function notationKey(): string {
  return LANE_ORDER.map(
    (L) =>
      `${TEXT_LANE_LABELS[L]} ${CHARS[L].slice(1)
        .map((ch, v) => `${ch} ${MEANINGS[L][v + 1]}`)
        .join(', ')}`
  ).join('; ');
}

/**
 * Read bars written in the text notation, at a given meter.
 *
 * Lines before the first `bar N` are the header and are ignored, as is the
 * `count` row. Inside a bar, each line is a lane label and its row; spaces and
 * `|` inside a row are ignored so it can be grouped by beat, and `-` reads as a
 * rest. A lane a bar does not mention is empty in that bar.
 *
 * Bars keep the numbers they were written with, because a writer replacing
 * bar 3 writes `bar 3` and nothing else.
 */
export function fromText(text: string, meterKey: string): FromTextResult {
  const m = meterOf(meterKey);
  const steps = stepsOf(m);
  const bars: TextBar[] = [];
  const written = new Set<LaneKey>();
  let current: { number: number; bar: Bar; seen: Set<LaneKey>; tuplets: TupletSpan[] } | null =
    null;
  /** The tuplet whose `›` lane lines are being read. */
  let tuplet: { span: TupletSpan; line: string } | null = null;

  /** The tuplet just read, checked against its bar, or why it cannot be one. */
  const closeTuplet = (): string | null => {
    if (!tuplet || !current) return null;
    const { span, line } = tuplet;
    tuplet = null;
    const where = `bar ${current.number}, "${line}"`;
    if (!tupletLanes(span).length)
      return `${where}: a tuplet needs a lane under it, as "› snare Sssss"`;
    if (!tupletFits(span, steps, 1)) {
      return span.span % span.n === 0
        ? `${where}: ${span.n} in ${span.span} steps falls on the grid; write those notes in the bar`
        : `${where}: a tuplet is ${MIN_TUPLET} to ${MAX_TUPLET} notes over steps inside the bar of ${steps}`;
    }
    for (const L of tupletLanes(span)) {
      const clash = current.tuplets.find(
        (t) => t.notes[L] && t.start < span.start + span.span && span.start < t.start + t.span
      );
      if (clash) return `${where}: ${TEXT_LANE_LABELS[L]} is already in a tuplet on those steps`;
    }
    current.tuplets.push(span);
    return null;
  };

  /** A tuplet's lane line, `› snare Sssss`: one character a note, as many as the tuplet has. */
  const readTupletLane = (line: string): string | null => {
    if (!current) return null;
    if (!tuplet) return `bar ${current.number}: "${line}" belongs under a "tuplet" line`;
    const match = /^›\s*(\S+)\s+(.+)$/.exec(line);
    const L = match ? laneOf(match[1]) : undefined;
    if (!match || !L)
      return `bar ${current.number}: "${line}" is not a lane and its tuplet notes, as "› snare Sssss"`;
    const row = match[2].replace(/[\s|]/g, '');
    const { span } = tuplet;
    if (row.length !== span.n)
      return `bar ${current.number}, ${TEXT_LANE_LABELS[L]}: ${row.length} notes, but the tuplet has ${span.n}`;
    const values: number[] = [];
    for (const ch of row) {
      const v = CHARS[L].indexOf(ch === '-' ? '.' : ch);
      if (v < 0)
        return `bar ${current.number}, ${TEXT_LANE_LABELS[L]}: "${ch}" in the tuplet is not a ${TEXT_LANE_LABELS[L]} note — it takes ${takes(L)}`;
      values.push(v);
    }
    if (span.notes[L])
      return `bar ${current.number}: ${TEXT_LANE_LABELS[L]} is written twice in one tuplet`;
    span.notes[L] = values;
    written.add(L);
    return null;
  };

  const readLane = (line: string): string | null => {
    if (!current) return null;
    const match = /^(\S+)\s+(.+)$/.exec(line);
    if (!match) return `bar ${current.number}: "${line}" is not a lane and its notes`;
    const [, label, raw] = match;
    if (label.toLowerCase() === 'count') return null;
    const L = laneOf(label);
    if (!L) {
      return `bar ${current.number}: there is no lane called "${label}" — use ${LANE_ORDER.map((k) => TEXT_LANE_LABELS[k]).join(', ')}`;
    }
    if (current.seen.has(L))
      return `bar ${current.number}: ${TEXT_LANE_LABELS[L]} is written twice`;
    current.seen.add(L);

    const row = raw.replace(/[\s|]/g, '');
    if (row.length !== steps) {
      return `bar ${current.number}, ${TEXT_LANE_LABELS[L]}: ${row.length} steps, but a bar of ${m.label} has ${steps}`;
    }
    for (let i = 0; i < steps; i++) {
      const ch = row[i] === '-' ? '.' : row[i];
      const v = CHARS[L].indexOf(ch);
      if (v < 0) {
        return `bar ${current.number}, ${TEXT_LANE_LABELS[L]}: "${row[i]}" on ${describeStep(m, i)} is not a ${TEXT_LANE_LABELS[L]} note — it takes ${takes(L)}`;
      }
      current.bar[L][i] = v;
    }
    written.add(L);
    return null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const barMatch = /^bar\s+(\d+)\b:?\s*(.*)$/i.exec(line);
    // a tuplet ends at the next line that is not one of its lanes
    if (tuplet && !line.startsWith('›')) {
      const err = closeTuplet();
      if (err) return { ok: false, error: err };
    }
    if (barMatch) {
      const number = Number(barMatch[1]);
      if (number < 1 || number > MAX_BAR_NUMBER)
        return { ok: false, error: `bar ${number} is out of range` };
      if (bars.some((b) => b.number === number))
        return { ok: false, error: `bar ${number} is written twice` };
      current = { number, bar: emptyBar(steps), seen: new Set(), tuplets: [] };
      bars.push({ number, bar: current.bar, tuplets: current.tuplets });
      if (barMatch[2]) {
        const err = readLane(barMatch[2]);
        if (err) return { ok: false, error: err };
      }
      continue;
    }

    // before the first bar: the header, which says nothing the caller needs
    if (!current) continue;
    // a tuplet (13-c): its head line, then a `›` line for each lane it plays
    if (/^tuplet\b/i.test(line)) {
      const head = TUPLET_LINE.exec(line);
      if (!head)
        return {
          ok: false,
          error: `bar ${current.number}: "${line}" is not a tuplet — write "tuplet 5 over steps 1-16", then "› snare Sssss"`,
        };
      const from = Number(head[2]);
      const to = head[3] ? Number(head[3]) : from;
      tuplet = {
        line,
        span: { bar: 0, start: from - 1, span: to - from + 1, n: Number(head[1]), notes: {} },
      };
      continue;
    }
    if (line.startsWith('›')) {
      const err = readTupletLane(line);
      if (err) return { ok: false, error: err };
      continue;
    }
    const err = readLane(line);
    if (err) return { ok: false, error: err };
  }
  {
    const err = closeTuplet();
    if (err) return { ok: false, error: err };
  }

  /* A tuplet owns its cells (12-d): a note written on the grid under one is
     the writer's mistake, not a second note to play. */
  for (const b of bars) {
    for (const t of b.tuplets ?? []) {
      for (const L of tupletLanes(t)) {
        for (let i = t.start; i < t.start + t.span; i++) {
          if (b.bar[L][i])
            return {
              ok: false,
              error: `bar ${b.number}, ${TEXT_LANE_LABELS[L]}: a note on ${describeStep(m, i)} sits under its tuplet — the tuplet plays those steps, so leave them "." on the grid`,
            };
        }
      }
    }
    if (!b.tuplets?.length) delete b.tuplets;
  }

  if (bars.length === 0)
    return { ok: false, error: 'no bars — start each one with "bar 1", "bar 2" …' };
  return { ok: true, bars, lanes: LANES.filter((L) => written.has(L)) };
}
