import { BASE_LANES, FOOT_LANE, PERC_LANES, TOM_LANES } from '@/lib/app/breaks/lanes';
import { isGroupStart, meterOf } from '@/lib/app/breaks/meter';
import { cloneBar } from '@/lib/app/breaks/pattern';
import { MAX_ARRANGEMENT, MAX_BREAK_BARS, SECTION_LETTERS } from '@/lib/app/breaks/sections';
import type { BreakDoc } from '@/lib/app/breaks/share';
import type { Bar, LaneKey, Pattern, PercLaneKey } from '@/lib/app/breaks/types';

/**
 * What every importer produces, and how it becomes a document.
 *
 * A MIDI file and a Groove Scribe link are different formats with the same
 * answer: some bars at a meter and a tempo, plus the things the reader had to
 * leave out or bend to fit. {@link importedDoc} is the one place that answer
 * becomes a {@link BreakDoc}, so the two readers cannot disagree about what an
 * imported pattern looks like.
 */

/** Bars in one section of a document — the wire format's own limit. */
export const SECTION_BARS = 8;
/** An import fills sections from A, eight bars to each, up to what a break holds. */
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
  if (pattern.bars.length <= MAX_IMPORT_BARS) return pattern;
  return {
    ...pattern,
    notes: [
      ...pattern.notes,
      `Only the first ${MAX_IMPORT_BARS} of ${pattern.bars.length} bars were kept — a pattern holds ${MAX_IMPORT_BARS}, ${SECTION_BARS} to a section.`,
    ],
    bars: pattern.bars.slice(0, MAX_IMPORT_BARS),
    ...(pattern.meters ? { meters: pattern.meters.slice(0, MAX_IMPORT_BARS) } : {}),
  };
}

function sectionOf(imp: ImportedPattern, bars: Bar[], style: string, meter = imp.meter): Pattern {
  const m = meterOf(meter);
  const n = bars[0]?.k.length ?? 0;
  const has = (L: LaneKey) => bars.some((b) => b[L].some((v) => v));

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

  const hatNotes = bars.reduce((t, b) => t + b.h.filter((v) => v).length, 0);
  const rideNotes = bars.reduce((t, b) => t + b.r.filter((v) => v).length, 0);

  return {
    name: imp.name,
    style,
    /* Not from the catalogue, so no version and no snapshot: it plays straight,
       with default feel, which is what the source wrote. */
    styleVersionId: null,
    attrs: {},
    meter,
    seed: 0,
    voice: rideNotes > hatNotes ? 'ride' : 'hat',
    lanes,
    perc: { ...imp.perc },
    backbeats,
    bbLane: 's',
    hasRide: rideNotes > 0,
    hasHat: hatNotes > 0,
    pins: null,
    bars: bars.map(cloneBar),
  };
}

/**
 * The bars cut into sections: a new one at every change of meter, and every
 * {@link SECTION_BARS} bars within one meter. At most as many as there are
 * letters; what would need more is left out.
 */
function runsOf(imp: ImportedPattern): { meter: string; bars: Bar[] }[] {
  const runs: { meter: string; bars: Bar[] }[] = [];
  imp.bars.slice(0, MAX_IMPORT_BARS).forEach((bar, i) => {
    const meter = imp.meters?.[i] ?? imp.meter;
    const last = runs[runs.length - 1];
    if (last && last.meter === meter && last.bars.length < SECTION_BARS) last.bars.push(bar);
    else runs.push({ meter, bars: [bar] });
  });
  return runs.slice(0, SECTION_LETTERS.length);
}

/**
 * An import as a document: sections from A, in the order the source plays
 * them — a new one at every change of meter (11-e-ii) and every eight bars —
 * and an arrangement that plays each once. One section plays on its own, so
 * B is then a copy of A that the arrangement never reaches: the Studio
 * always has a B to edit.
 */
export function importedDoc(imp: ImportedPattern, style: string): BreakDoc {
  const runs = runsOf(imp);
  const sections = runs.map((run) => sectionOf(imp, run.bars, style, run.meter));
  const A = sections[0] ?? sectionOf(imp, [], style);
  const B = sections[1] ?? sectionOf(imp, A.bars, style, A.meter);
  const doc: BreakDoc = {
    bpm: imp.bpm,
    swing: imp.swing,
    level: 5,
    arrangement: SECTION_LETTERS.slice(0, Math.min(Math.max(1, sections.length), MAX_ARRANGEMENT)),
    A,
    B,
  };
  sections.slice(2).forEach((p, i) => {
    doc[SECTION_LETTERS[i + 2]] = p;
  });
  return doc;
}
