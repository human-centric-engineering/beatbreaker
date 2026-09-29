import { LANES, LANE_ORDER } from '@/lib/app/breaks/lanes';
import { countLabelsOf, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, Meter, Pattern } from '@/lib/app/breaks/types';

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
 */
const CHARS: Record<LaneKey, string[]> = {
  k: ['.', 'X', 'A'],
  s: ['.', 'g', 's', 'S', 'c'],
  h: ['.', 'x', 'X', 'o'],
  r: ['.', 'r', 'b'],
  c: ['.', 'C'],
  t1: ['.', 'X', 'A'],
  t2: ['.', 'X', 'A'],
  t3: ['.', 'X', 'A'],
  hf: ['.', 'f'],
  p1: ['.', 'X', 'A'],
  p2: ['.', 'X', 'A'],
};

/** What each character means, for the error that names what a lane takes. */
const MEANINGS: Record<LaneKey, string[]> = {
  k: ['rest', 'hit', 'accent'],
  s: ['rest', 'ghost', 'hit', 'accent', 'cross-stick'],
  h: ['rest', 'closed', 'accent', 'open'],
  r: ['rest', 'ride', 'bell'],
  c: ['rest', 'crash'],
  t1: ['rest', 'hit', 'accent'],
  t2: ['rest', 'hit', 'accent'],
  t3: ['rest', 'hit', 'accent'],
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
  /** Which section this is, when the pattern is one of a break's two. */
  section?: 'A' | 'B';
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
  });
  return lines.join('\n');
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
}

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
  let current: { number: number; bar: Bar; seen: Set<LaneKey> } | null = null;

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
    if (barMatch) {
      const number = Number(barMatch[1]);
      if (number < 1 || number > MAX_BAR_NUMBER)
        return { ok: false, error: `bar ${number} is out of range` };
      if (bars.some((b) => b.number === number))
        return { ok: false, error: `bar ${number} is written twice` };
      current = { number, bar: emptyBar(steps), seen: new Set() };
      bars.push({ number, bar: current.bar });
      if (barMatch[2]) {
        const err = readLane(barMatch[2]);
        if (err) return { ok: false, error: err };
      }
      continue;
    }

    // before the first bar: the header, which says nothing the caller needs
    if (!current) continue;
    const err = readLane(line);
    if (err) return { ok: false, error: err };
  }

  if (bars.length === 0)
    return { ok: false, error: 'no bars — start each one with "bar 1", "bar 2" …' };
  return { ok: true, bars, lanes: LANES.filter((L) => written.has(L)) };
}
