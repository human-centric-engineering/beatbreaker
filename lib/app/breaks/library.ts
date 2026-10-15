import { BASE_LANES, FOOT_LANE, TOM_LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import {
  type BarSpec,
  clonePoly,
  parseBar,
  parseRow,
  stickingRow,
  styleAttrs,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import type { PackedPattern } from '@/lib/app/breaks/schema';
import type { TempoRatio } from '@/lib/app/breaks/sections';
import { packPattern } from '@/lib/app/breaks/share';
import { clearUnderTuplets, keepTuplets } from '@/lib/app/breaks/tuplets';
import { stickingFromHands } from '@/lib/app/breaks/drummer/sticking';
import { POLYRHYTHM_STYLE, RUDIMENT_STYLE } from '@/lib/app/breaks/style-keys';
import type {
  CymbalVoice,
  LaneKey,
  Pattern,
  PercLaneKey,
  Poly,
  ResolvedStyle,
  TupletSpan,
} from '@/lib/app/breaks/types';

/**
 * A tuplet in a library entry (12-d): `n` notes, as long as each lane's row,
 * over `span` steps from `start` of bar `bar` (the first, if not said), in
 * the bar strings' characters.
 */
export interface TupletSpec {
  bar?: number;
  start: number;
  span: number;
  notes: Partial<Record<LaneKey, string>>;
}

/**
 * An entry's own B: a metric modulation's second half (12-d), the section it
 * moves to at its tempo ratio, or a roll rudiment closed (13-a), at the same
 * tempo. Opening the entry writes it as B, and the arrangement plays A then
 * B and comes round to A again: there and back, open, closed and open.
 */
export interface ModulationSpec {
  /** The B section's tempo against A's; absent, the same tempo. */
  ratio?: TempoRatio;
  meter?: string;
  bars: BarSpec[];
  tuplets?: TupletSpec[];
}

/**
 * The system pattern libraries: the famous breaks — the main groove off each
 * record, a bar or two of it, in the meter it was played in — the rudiments
 * (Phase 10), the snare alone with its sticking written, and the polyrhythms
 * (Phase 12), each with its two streams named.
 *
 * **The entries themselves are not here any more.** They are `LibraryEntry`
 * rows, seeded from `prisma/seeds/app-beatbreaker/data/library.ts` (D13), and
 * they are stored as wire-v4 documents rather than as the bar strings below —
 * so a client shows one without needing this parser at all. What is left in
 * this file is the shape and the conversion: {@link LibraryItem} is what the
 * seed data is written in, and {@link patternFromLibrary} is what turns one
 * into a pattern, which is what the seed runs to build those documents.
 *
 * These are **practice approximations**: the thing you would be taught, not a
 * transcription of a particular take. The feel studies at the bottom of the
 * table are written rather than transcribed, and say so in their `artist` line.
 */
export interface LibraryItem {
  /** Heading it files under in the picker. */
  group: string;
  title: string;
  /** Who played it, and when. */
  artist: string;
  bpm: number;
  /** Key into the style catalogue — what the generator would call this. */
  style: string;
  voice?: CymbalVoice;
  /** The thing worth listening for. */
  note?: string;
  /** Where the entry is not in 4/4. Its bar strings are then read at that meter's step count. */
  meter?: string;
  /** Where the style's own backbeats are in the wrong meter for this entry. */
  backbeats?: number[];
  /**
   * The lanes it is written on, where that is not the kit: a rudiment is the
   * snare alone. Without it, the five base lanes and whatever toms or foot
   * the bars write.
   */
  lanes?: LaneKey[];
  /** Every layer plays it whole (D45): {@link Pattern.fixed}. */
  fixed?: boolean;
  /**
   * A polyrhythm's streams (Phase 12): {@link Pattern.poly}. Its `hands` are
   * written into the sticking too, so the drummer plays them (D60).
   */
  poly?: Poly;
  /** What sits in the percussion slots, where the entry has no style to say: a bell timeline's cowbell. */
  perc?: Partial<Record<PercLaneKey, string>>;
  bars: BarSpec[];
  /** Its tuplets (12-d), over the bars above. */
  tuplets?: TupletSpec[];
  /** Its own B section: a metric modulation's second half (12-d), a roll closed (13-a). */
  then?: ModulationSpec;
}

/** A library entry's tuplets as spans: each lane's notes read in the bar strings' characters. */
function tupletsFrom(specs: TupletSpec[] | undefined): TupletSpan[] {
  return (specs ?? []).map((t) => {
    const notes: Partial<Record<LaneKey, number[]>> = {};
    let n = 0;
    for (const [lane, row] of Object.entries(t.notes) as Array<[LaneKey, string | undefined]>) {
      if (!row) continue;
      notes[lane] = parseRow(lane, row);
      n = Math.max(n, row.length);
    }
    return { bar: t.bar ?? 0, start: t.start, span: t.span, n, notes };
  });
}

/**
 * A library entry as its row's document (D13): the packed pattern, and where
 * the entry has its own B — a metric modulation (12-d), a closed roll (13-a) —
 * that section as `th`, at its ratio.
 */
export function libraryDoc(item: LibraryItem, index: number, style?: ResolvedStyle): PackedPattern {
  const a = patternFromLibrary(item, index, style);
  const doc: PackedPattern = packPattern(a);
  if (!item.then) return doc;
  const b = patternFromLibrary(
    {
      ...item,
      title: `${item.title} (B)`,
      meter: item.then.meter ?? item.meter,
      bars: item.then.bars,
      tuplets: item.then.tuplets,
      then: undefined,
    },
    index,
    style
  );
  if (item.then.ratio) b.tempoRatio = item.then.ratio;
  return { ...doc, th: packPattern(b) };
}

export { POLYRHYTHM_STYLE, RUDIMENT_STYLE };

/** The rudiments' library key: shown in Generate rather than among the libraries. */
export const RUDIMENTS_LIBRARY = 'rudiments';

/** The polyrhythms' library key: shown in Generate beside the rudiments (D59). */
export const POLYRHYTHMS_LIBRARY = 'polyrhythms';

/**
 * The style keys that are not styles: what each reads as, and what it is
 * called where it cannot be rewritten.
 */
const WRITTEN_KEYS: Record<string, { label: string; what: string }> = {
  [RUDIMENT_STYLE]: { label: 'Rudiment', what: 'A rudiment' },
  [POLYRHYTHM_STYLE]: { label: 'Polyrhythm', what: 'A polyrhythm' },
};

/** The libraries Generate shows as cards of their own, and the Libraries tab leaves out. */
export const PRACTICE_LIBRARIES: readonly string[] = [RUDIMENTS_LIBRARY, POLYRHYTHMS_LIBRARY];

/** What a style key reads as where the catalogue has no row for it: the key, or "Rudiment", "Polyrhythm". */
export function unlistedStyleLabel(key: string): string {
  return WRITTEN_KEYS[key]?.label ?? key;
}

/** A style key's name: its catalogue row's label, or {@link unlistedStyleLabel} without one. */
export function styleLabel(
  styles: Readonly<Record<string, { params: { label: string } } | undefined>>,
  key: string
): string {
  return styles[key]?.params.label ?? unlistedStyleLabel(key);
}

/**
 * Why a section cannot be rewritten in its style — doctored, regenerated,
 * written anew or built on — where `key`, its style, has no catalogue row:
 * a rudiment never had one (D45), and any other style has since been deleted.
 * `done` finishes "so it cannot be …".
 */
export function noStyleReason(key: string, section: string, done: string): string {
  const written = WRITTEN_KEYS[key];
  return written
    ? `${written.what} is written out, not generated from a style, so it cannot be ${done}`
    : `Section ${section}'s style is not in the catalogue, so it cannot be ${done}`;
}

/**
 * One library entry as a playable {@link Pattern}.
 *
 * Most of the library is one bar of 4/4 sixteenths, but a half-time shuffle is
 * not a half-time shuffle on a straight grid and *Money* is not *Money* in
 * four. An entry may therefore name its own meter, and its bar strings are read
 * at that meter's step count rather than at sixteen — 24 for 12/8, 28 for 7/4.
 *
 * Two things come from the **entry** rather than from the style: the lane
 * roster (a transcription that writes the floor tom gets that row on the page;
 * one that does not keeps the five-lane kit) and the backbeat positions, where
 * the style's own are in the wrong meter.
 *
 * `bbLane` stays the snare even for styles whose generated form marks 2 and 4
 * with the foot. These are written notes, not generated ones — if a
 * transcription puts the backbeat on the snare, that is where the critic should
 * look for it.
 */
export function patternFromLibrary(
  item: LibraryItem,
  index: number,
  style?: ResolvedStyle
): Pattern {
  const meter = item.meter && METERS[item.meter] ? item.meter : DEFAULT_METER;
  const steps = stepsOf(meterOf(meter));
  const params = style?.params;

  const lanes: LaneKey[] = item.lanes?.length ? item.lanes.slice() : BASE_LANES.slice();
  if (!item.lanes?.length) {
    for (const L of [...TOM_LANES, FOOT_LANE]) {
      if (item.bars.some((spec) => spec[L as keyof BarSpec])) lanes.push(L);
    }
  }
  const bars = item.bars.map((spec) => parseBar(spec, steps));
  /* A polyrhythm names a hand for each lane (D60); a bar that writes its own
     sticking keeps it, and every other bar gets the lanes' hands. */
  const laneHands = item.poly?.hands;
  const sticking = tidySticking(
    item.bars.map((spec, bi) =>
      stickingRow(
        spec.hands ?? (laneHands ? stickingFromHands(bars[bi], laneHands) : undefined),
        steps
      )
    )
  );

  const pat: Pattern = {
    name: item.title,
    style: item.style,
    styleVersionId: style?.versionId ?? null,
    /* The snapshot is what makes an entry playable without its style. It is
       taken once, at seed time, and stored in the row's document — so editing
       a style later does not silently change how Funky Drummer plays. */
    attrs: styleAttrs(params),
    meter,
    seed: 1000 + index,
    voice: item.voice ?? 'hat',
    lanes,
    perc: { ...percRoster(params), ...item.perc },
    backbeats: (item.backbeats ?? params?.backbeats ?? []).slice(),
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    ...(sticking ? { sticking } : {}),
    ...(item.fixed ? { fixed: true } : {}),
    ...(item.poly ? { poly: clonePoly(item.poly) } : {}),
    ...(item.tuplets?.length ? { tuplets: tupletsFrom(item.tuplets) } : {}),
    bars,
  };
  keepTuplets(pat);
  clearUnderTuplets(pat);
  return pat;
}
