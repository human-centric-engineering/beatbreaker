import { BASE_LANES, FOOT_LANE, PERC_LANES, TOM_LANES } from '@/lib/app/breaks/lanes';
import { isGroupStart, meterOf } from '@/lib/app/breaks/meter';
import { cloneBar } from '@/lib/app/breaks/pattern';
import {
  MAX_ARRANGEMENT,
  MAX_BREAK_BARS,
  MAX_SECTION_BARS,
  SECTION_LETTERS,
} from '@/lib/app/breaks/sections';

import type { BreakDoc } from '@/lib/app/breaks/share';
import {
  hasTempoMaps,
  paceRange,
  rangesFit,
  tempoMapOf,
  tempoMapProblem,
} from '@/lib/app/breaks/tempo-map';
import { cloneTuplet, keepTuplets } from '@/lib/app/breaks/tuplets';
import type { Bar, LaneKey, Pattern, PercLaneKey, TupletSpan } from '@/lib/app/breaks/types';

/** What an import says about a file that changes tempo (16-b-ii), by whether its sections play it. */
export function tempoNote(doc: BreakDoc, bpm: number): string {
  return hasTempoMaps(doc)
    ? "The file changes tempo, so each section plays the file's tempo map."
    : `The file changes tempo further than a break plays (its sections within ×4 of each other, and a section's changes within ×¼ to ×4 of the file's opening tempo), so it plays at ${bpm} bpm throughout.`;
}

/** The most sections an import makes: one a letter, each played once by the arrangement. */
const MAX_IMPORT_SECTIONS = Math.min(MAX_ARRANGEMENT, SECTION_LETTERS.length);

/**
 * What every importer produces, and how it becomes a document.
 *
 * A MIDI file and a Groove Scribe link are different formats with the same
 * answer: some bars at a meter and a tempo, plus the things the reader had to
 * leave out or bend to fit. {@link importedDoc} is the one place that answer
 * becomes a {@link BreakDoc}, so the two readers cannot disagree about what an
 * imported pattern looks like.
 */

/**
 * Bars in one section of an import (16-b-i): as many as a section holds. A
 * file says nothing of where its parts begin, so a section is a run of one
 * meter, not eight bars cut wherever they fall.
 */
export const SECTION_BARS = MAX_SECTION_BARS;
/** An import fills sections from A, a section to each run of one meter, up to what a break holds. */
export const MAX_IMPORT_BARS = MAX_BREAK_BARS;

export interface ImportedPattern {
  /** The title the source carried, or '' — the caller names it otherwise. */
  name: string;
  /** Key into `METERS`. */
  meter: string;
  bpm: number;
  /** Swing slider, 0–100. */
  swing: number;
  /** Already on the sixteenth grid, each at its own meter's step count. */
  bars: Bar[];
  /**
   * Each bar's meter, where the source changes meter (a MIDI file's time
   * signatures). Left out, every bar is in {@link meter}.
   */
  meters?: string[];
  /** What sits in each percussion slot, when the source used one. */
  perc: Partial<Record<PercLaneKey, string>>;
  /**
   * Tuplets the source played (12-d), each in the bar it is in, counted
   * across the whole import. Absent where there are none.
   */
  tuplets?: TupletSpan[];
  /**
   * The tempo each step starts at, a row a bar, where the source changes
   * tempo (16-b-ii): each section's tempo map is read from its bars' rows,
   * against {@link bpm}. Absent where the source keeps one tempo.
   */
  tempos?: number[][];
  /**
   * What the reader dropped or bent to fit, one plain sentence each — shown to
   * the user and handed to BeatBuddy, so neither is told the import was exact
   * when it was not.
   */
  notes: string[];
}

export type ImportResult = { ok: true; pattern: ImportedPattern } | { ok: false; error: string };

/**
 * Trim to what a document can hold, saying so if anything went.
 * Readers call this last, so the note sits after their own.
 */
export function capBars(pattern: ImportedPattern): ImportedPattern {
  const total = pattern.bars.length;
  let keep = Math.min(total, MAX_IMPORT_BARS);
  let why = `a break holds ${MAX_IMPORT_BARS}`;
  /* Every section an import makes has a letter of its own and is played once
     by the arrangement. A file that changes meter nearly every bar makes a
     section a bar, so what would need more sections than there are letters is
     cut here, and said, rather than kept where nothing plays it. */
  const runs = runsOf({ ...pattern, bars: pattern.bars.slice(0, keep) });
  if (runs.length > MAX_IMPORT_SECTIONS) {
    keep = runs.slice(0, MAX_IMPORT_SECTIONS).reduce((n, r) => n + r.bars.length, 0);
    why = `its meter changes so often that those bars make ${MAX_IMPORT_SECTIONS} sections, as many as a break has letters for`;
  }
  if (keep === total) return pattern;
  return {
    ...pattern,
    notes: [...pattern.notes, `Only the first ${keep} of ${total} bars were kept — ${why}.`],
    bars: pattern.bars.slice(0, keep),
    ...(pattern.meters ? { meters: pattern.meters.slice(0, keep) } : {}),
    ...(pattern.tuplets ? { tuplets: pattern.tuplets.filter((t) => t.bar < keep) } : {}),
    ...(pattern.tempos ? { tempos: pattern.tempos.slice(0, keep) } : {}),
  };
}

function sectionOf(
  imp: ImportedPattern,
  bars: Bar[],
  style: string,
  meter = imp.meter,
  from = 0
): Pattern {
  const m = meterOf(meter);
  const n = bars[0]?.k.length ?? 0;
  // the source's tuplets in these bars, counted from this section's first
  const tuplets = (imp.tuplets ?? [])
    .filter((t) => t.bar >= from && t.bar < from + bars.length)
    .map((t) => ({ ...cloneTuplet(t), bar: t.bar - from }));
  const has = (L: LaneKey) =>
    bars.some((b) => b[L].some((v) => v)) || tuplets.some((t) => t.notes[L]?.some((v) => v));

  /* The roster is what the source wrote, on top of the five-lane kit — the
     same rule the famous-breaks library uses, so a transcription that writes
     the floor tom gets that row and one that does not keeps the kit. */
  const lanes: LaneKey[] = BASE_LANES.slice();
  for (const L of [...TOM_LANES, FOOT_LANE, ...PERC_LANES]) if (has(L)) lanes.push(L);

  /* Backbeats are read off the notes rather than off a style: the beat starts
     where the snare lands a real hit in most bars. An import in a style it was
     never generated from has no other honest source. */
  const backbeats: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || !isGroupStart(m, i)) continue;
    const hits = bars.filter((b) => b.s[i] >= 2).length;
    if (hits * 2 >= bars.length && hits > 0) backbeats.push(i);
  }

  // the source's tempo in these bars, as a map against the import's tempo (16-b-ii)
  const tempo = imp.tempos ? tempoMapOf(imp.tempos.slice(from, from + bars.length), imp.bpm) : [];

  const hatNotes = bars.reduce((t, b) => t + b.h.filter((v) => v).length, 0);
  const rideNotes = bars.reduce((t, b) => t + b.r.filter((v) => v).length, 0);

  const pat: Pattern = {
    name: imp.name,
    style,
    /* Not from the catalogue, so no version and no snapshot: it plays straight,
       with default feel, which is what the source wrote. */
    styleVersionId: null,
    attrs: {},
    meter,
    // held to what a break plays by importedDoc, across every section at once
    ...(tempo.length ? { tempo } : {}),
    seed: 0,
    voice: rideNotes > hatNotes ? 'ride' : 'hat',
    lanes,
    perc: { ...imp.perc },
    backbeats,
    bbLane: 's',
    hasRide: rideNotes > 0,
    hasHat: hatNotes > 0,
    pins: null,
    ...(tuplets.length ? { tuplets } : {}),
    bars: bars.map(cloneBar),
  };
  keepTuplets(pat);
  return pat;
}

/**
 * The bars cut into sections: a new one at every change of meter, and past
 * {@link SECTION_BARS} bars within one meter. {@link capBars} keeps them to
 * what an arrangement plays.
 */
function runsOf(imp: ImportedPattern): { meter: string; bars: Bar[]; from: number }[] {
  const runs: { meter: string; bars: Bar[]; from: number }[] = [];
  imp.bars.slice(0, MAX_IMPORT_BARS).forEach((bar, i) => {
    const meter = imp.meters?.[i] ?? imp.meter;
    const last = runs[runs.length - 1];
    if (last && last.meter === meter && last.bars.length < SECTION_BARS) last.bars.push(bar);
    else runs.push({ meter, bars: [bar], from: i });
  });
  return runs;
}

/**
 * An import as a document: sections from A, in the order the source plays
 * them — a new one at every change of meter (11-e-ii) —
 * and an arrangement that plays each once. One section plays on its own, so
 * B is then A's first bar, which the arrangement never reaches: the Studio
 * always has a B to edit. One bar, not a copy of A (16-b-i): A is now as long
 * as the file's run of one meter, and a copy of it would double what the
 * break holds for bars that never play.
 */
export function importedDoc(imp: ImportedPattern, style: string): BreakDoc {
  // capBars has already cut a reader's bars to this; the slice holds a caller that skipped it
  const runs = runsOf(imp).slice(0, MAX_IMPORT_SECTIONS);
  const sections = runs.map((run) => sectionOf(imp, run.bars, style, run.meter, run.from));
  /* A file's tempo plays whole or not at all: a map a section cannot hold,
     or sections spread too far apart for one tempo to play them, and every
     section plays the file's opening tempo. Half a map is a tempo the file
     never had. */
  const fits =
    sections.every((p) => !p.tempo || !tempoMapProblem(p.tempo, p.bars.length)) &&
    rangesFit(sections.map(paceRange));
  if (!fits) sections.forEach((p) => delete p.tempo);
  const A = sections[0] ?? sectionOf(imp, [], style);
  const B = sections[1] ?? sectionOf(imp, A.bars.slice(0, 1), style, A.meter);
  if (!fits) delete B.tempo;
  const doc: BreakDoc = {
    bpm: imp.bpm,
    swing: imp.swing,
    level: 5,
    arrangement: SECTION_LETTERS.slice(0, Math.max(1, sections.length)),
    A,
    B,
  };
  sections.slice(2).forEach((p, i) => {
    doc[SECTION_LETTERS[i + 2]] = p;
  });
  return doc;
}
