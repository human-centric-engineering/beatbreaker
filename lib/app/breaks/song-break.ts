import { type GeneratedBreak, generateGood } from '@/lib/app/breaks/critic';
import { SONG_SALT, deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { DEFAULT_METER } from '@/lib/app/breaks/meter';
import { resolveLanes, type CustomLanes } from '@/lib/app/breaks/pattern';
import { makeRng } from '@/lib/app/breaks/rng';
import {
  MAX_ARRANGEMENT,
  MAX_BREAK_BARS,
  type SectionLetter,
  type Sections,
} from '@/lib/app/breaks/sections';
import { partKey, pickSong, songMeter, songOf, withSong } from '@/lib/app/breaks/songs';
import { styleIn } from '@/lib/app/breaks/styles';
import type { Pattern, ResolvedStyle, SongSection, Style, StyleSong } from '@/lib/app/breaks/types';

/**
 * A whole new break (11-e-ii-d): an A and a B built from it, or, for a song
 * written in sections, every section of it in its own meter and the
 * arrangement the song plays them in.
 *
 * One function for every New — the Studio's, the break you arrive to, the
 * generate endpoint's and BeatBuddy's — so a song in sections is the same song
 * wherever it is written.
 */

export interface SongBreakOptions {
  style: ResolvedStyle;
  /**
   * The song, by key. Absent, a style with songs picks one from the seed
   * among those in `meter`, as `generatePattern` would.
   */
  song?: string;
  /** The meter for a style without songs; a song is written in its own. */
  meter?: string;
  /** Bars a section is, where the song's section names none. */
  bars: number;
  density: number;
  ghosts: number;
  seed: number;
  /** The tempo the sections are judged at. */
  bpm: number;
  /** One candidate from the seed, rather than the best of sixteen (`generateGood`). */
  exact?: boolean;
  /** The Studio's own lanes, where you have set them. */
  custom?: CustomLanes | null;
}

export interface SongBreak {
  sections: Sections;
  /** The order a song in sections plays in; null for an A and a B. */
  arrangement: SectionLetter[] | null;
  /** The song it is, where the style has songs. */
  song: StyleSong | undefined;
  /** The meter it opens in: its first section's. */
  meter: string;
  tries: number;
  rejected: number;
}

/** Salts each section's seed, so two sections of one song do not draw alike. */
const SECTION_SALT = 0x2545f491;

/**
 * Bars for each section: its own, else the length asked for, brought down
 * (the longest first) until the break fits {@link MAX_BREAK_BARS}.
 */
function sectionBars(sections: SongSection[], bars: number): number[] {
  const out = sections.map((x) => x.bars ?? bars);
  let total = out.reduce((n, b) => n + b, 0);
  while (total > MAX_BREAK_BARS) {
    const at = out.indexOf(Math.max(...out));
    if (out[at] <= 1) break;
    out[at]--;
    total--;
  }
  return out;
}

/**
 * The song a seed picks in a meter, as `generatePattern` picks it, on the same
 * stream — so a caller can set the tempo for the song before writing it, and a
 * seeded break of a style whose songs are all in one part is what it always was.
 */
export function songForSeed(
  params: Style,
  seed: number,
  meter: string = DEFAULT_METER
): StyleSong | undefined {
  return params.songs ? pickSong(params, makeRng((seed ^ SONG_SALT) >>> 0), meter) : undefined;
}

/** What {@link writePart} writes one section with. */
export interface PartOptions {
  style: ResolvedStyle;
  /** The song, or the section of one (`hell-awaits:B`), by key. */
  song: string | undefined;
  meter: string;
  bars: number;
  density: number;
  ghosts: number;
  seed: number;
  /** The tempo it is judged at. */
  bpm: number;
  /** One candidate from the seed, rather than the best of sixteen (`generateGood`). */
  exact?: boolean;
  /** The Studio's own lanes, where you have set them. */
  custom?: CustomLanes | null;
}

/**
 * One section of a break: the lanes the style asks for in that meter (or
 * yours), and the best of sixteen candidates or the one the seed gives. New
 * writes every section with it, and the Studio's New A and Regenerate one.
 */
export function writePart(opts: PartOptions): GeneratedBreak {
  const st = styleIn(withSong(opts.style.params, opts.song), opts.meter);
  const roster = resolveLanes(st, opts.custom ?? null);
  const gen = {
    style: opts.style,
    song: opts.song,
    meter: opts.meter,
    bars: opts.bars,
    density: opts.density,
    ghosts: opts.ghosts,
    lanes: roster.lanes,
    perc: roster.perc,
    seed: opts.seed,
  };
  return opts.exact
    ? { pattern: generatePattern(gen), tries: 1, rejected: 0 }
    : generateGood(gen, opts.bpm);
}

export function songBreak(opts: SongBreakOptions): SongBreak {
  const params = opts.style.params;
  /* The song is settled here, once, and every candidate is written in it: left
     to the generator, each of `generateGood`'s sixteen would pick its own. */
  const song =
    songOf(params, opts.song) ??
    (opts.song ? undefined : songForSeed(params, opts.seed, opts.meter));

  const write = (key: string | undefined, meter: string, bars: number, seed: number) =>
    writePart({ ...opts, song: key, meter, bars, seed });

  const parts = song?.sections;
  if (!song || !parts?.length) {
    // a song is written in its own meter, whatever the caller's default
    const meter = song ? songMeter(params, song) : (opts.meter ?? DEFAULT_METER);
    const made = write(song?.key, meter, opts.bars, opts.seed);
    return {
      sections: { A: made.pattern, B: deriveB(made.pattern, params) },
      arrangement: null,
      song,
      meter,
      tries: made.tries,
      rejected: made.rejected,
    };
  }

  const bars = sectionBars(parts, opts.bars);
  const out: Partial<Record<SectionLetter, Pattern>> = {};
  let tries = 0;
  let rejected = 0;
  parts.forEach((section, i) => {
    const seed = i === 0 ? opts.seed : (opts.seed ^ Math.imul(SECTION_SALT, i)) >>> 0;
    const made = write(partKey(song, section), songMeter(params, song, section), bars[i], seed);
    out[section.letter] = made.pattern;
    tries += made.tries;
    rejected += made.rejected;
  });
  /* The schema holds a song in sections to an A and a B at least; a song
     written without them still gets a B, built from its A. */
  const A = out.A ?? Object.values(out)[0];
  if (!A) throw new Error(`song ${song.key} has no sections`);
  const sections: Sections = { ...out, A, B: out.B ?? deriveB(A, params) };
  const arrangement = (song.arrangement ?? parts.map((x) => x.letter))
    .filter((L) => !!sections[L])
    .slice(0, MAX_ARRANGEMENT);
  return {
    sections,
    arrangement: arrangement.length ? arrangement : ['A'],
    song,
    meter: songMeter(params, song),
    tries,
    rejected,
  };
}
