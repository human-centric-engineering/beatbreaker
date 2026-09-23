import { BASE_LANES, FOOT_LANE, TOM_LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { type BarSpec, parseBar, styleAttrs } from '@/lib/app/breaks/pattern';
import type { CymbalVoice, LaneKey, Pattern, ResolvedStyle } from '@/lib/app/breaks/types';

/**
 * Famous breaks — the main groove off each record, a bar or two of it, in the
 * meter it was played in.
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
  bars: BarSpec[];
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

  const lanes: LaneKey[] = BASE_LANES.slice();
  for (const L of [...TOM_LANES, FOOT_LANE]) {
    if (item.bars.some((spec) => spec[L as keyof BarSpec])) lanes.push(L);
  }

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
    perc: percRoster(params),
    backbeats: (item.backbeats ?? params?.backbeats ?? []).slice(),
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: item.bars.map((spec) => parseBar(spec, steps)),
  };
}
