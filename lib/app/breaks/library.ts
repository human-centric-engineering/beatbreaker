import { BASE_LANES, FOOT_LANE, TOM_LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import {
  type BarSpec,
  clonePoly,
  parseBar,
  stickingRow,
  styleAttrs,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import { stickingFromHands } from '@/lib/app/breaks/drummer/sticking';
import type {
  CymbalVoice,
  LaneKey,
  Pattern,
  PercLaneKey,
  Poly,
  ResolvedStyle,
} from '@/lib/app/breaks/types';

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
}

/**
 * The style key every rudiment carries (D45). It is not a style row: there is
 * nothing to generate, regenerate or doctor a rudiment from, and the Studio
 * offers none of them for it.
 */
export const RUDIMENT_STYLE = 'rudiment';

/** The rudiments' library key: shown in Generate rather than among the libraries. */
export const RUDIMENTS_LIBRARY = 'rudiments';

/**
 * The style key every polyrhythm carries (Phase 12). Not a style row, for the
 * reason a rudiment's is not: a polyrhythm entry is written out, and New,
 * Regenerate and the doctor leave it alone.
 */
export const POLYRHYTHM_STYLE = 'polyrhythm';

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

  return {
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
    bars,
  };
}
