import { DEFAULT_METER, meterOf, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { wpick, type Rng } from '@/lib/app/breaks/rng';
import type { Figure, SongSection, Style, StyleSong } from '@/lib/app/breaks/types';

/**
 * A style's songs ({@link Style.songs}): picking one, and laying it over the
 * style.
 *
 * A song is not a second style. It is the style with a few things changed — the
 * meter, the tempo, the swing, the kit, the grooves — and everything it does not
 * say is the style's. So a pattern still records the style's key and version,
 * and records the song's key beside them; anything that writes notes later (a
 * B, the Doctor) lays the same song over the style again.
 */

/** The separator between a song's key and a section's letter: `hell-awaits:B`. */
const PART = ':';

/** A song, and the section of it a key names, where it is written in sections. */
export interface SongPart {
  song: StyleSong;
  section?: SongSection;
}

/**
 * What a pattern's song key names: a song, or a section of one.
 *
 * `hell-awaits:B` is section B. A song's bare key, where it has sections, is
 * the section that names that key among its aliases, else its first: a pattern
 * saved before the song was split into sections played what is now one of
 * them. Another song's old key ('sherpa-triplets') is found among the
 * sections' aliases.
 */
export function songPartOf(st: Style | undefined, key: string | undefined): SongPart | undefined {
  if (!st?.songs || !key) return undefined;
  const at = key.indexOf(PART);
  if (at >= 0) {
    const song = st.songs.find((s) => s.key === key.slice(0, at));
    const section = song?.sections?.find((x) => x.letter === key.slice(at + 1));
    return song && section ? { song, section } : undefined;
  }
  const song = st.songs.find((s) => s.key === key);
  if (song) {
    if (!song.sections?.length) return { song };
    return {
      song,
      section: song.sections.find((x) => x.aliases?.includes(key)) ?? song.sections[0],
    };
  }
  for (const sg of st.songs) {
    const section = sg.sections?.find((x) => x.aliases?.includes(key));
    if (section) return { song: sg, section };
  }
  return undefined;
}

/** The song with this key (or a section of it, or a key it was), if the style has one. */
export function songOf(st: Style | undefined, key: string | undefined): StyleSong | undefined {
  return songPartOf(st, key)?.song;
}

/** The key a pattern records for a song, or for one section of it. */
export function partKey(song: StyleSong, section?: SongSection): string {
  return section ? `${song.key}${PART}${section.letter}` : song.key;
}

/** Every part a style's songs write: each song without sections, and each section of those with. */
export function songParts(st: Style): Array<Required<Pick<SongPart, 'song'>> & SongPart> {
  return (st.songs ?? []).flatMap((song) =>
    song.sections?.length ? song.sections.map((section) => ({ song, section })) : [{ song }]
  );
}

/**
 * The meter a song is written in: its own, else its style's. For a song in
 * sections, the section's — its first, if none is named, which is the meter a
 * break of the song opens in.
 */
export function songMeter(st: Style, song: StyleSong | undefined, section?: SongSection): string {
  const part = section ?? song?.sections?.[0];
  return part?.params.meter ?? song?.params.meter ?? st.meter ?? DEFAULT_METER;
}

/** Every meter a song plays in: its own, or each of its sections'. */
export function songMeters(st: Style, song: StyleSong): string[] {
  return song.sections?.length
    ? song.sections.map((x) => songMeter(st, song, x))
    : [songMeter(st, song)];
}

/**
 * Pick one of a style's songs, by weight. Given a meter, only songs written in
 * it are candidates — for a song in sections, its first section's: a pattern
 * whose meter is already settled (a B, a test, a caller that passed one) gets
 * a song that fits the bar. Undefined for a style without songs, or with none
 * in that meter.
 */
export function pickSong(st: Style, rng: Rng, meterKey?: string): StyleSong | undefined {
  const songs = (st.songs ?? []).filter((s) => !meterKey || songMeter(st, s) === meterKey);
  if (!songs.length) return undefined;
  return wpick(
    rng,
    songs.map((s): [StyleSong, number] => [s, s.weight])
  );
}

/**
 * A tempo in the song's range, or the style's where the song names none — held
 * where its written bars stay playable (see {@link playableBpm}). Whole bpm,
 * because that is what the tempo control shows.
 */
export function songTempo(st: Style, song: StyleSong | undefined, rng: Rng): number {
  const [lo, hi] = songBpm(st, song);
  return Math.round(lo + rng() * (hi - lo));
}

/**
 * A song's tempo range. A break has one tempo, so for a song in sections it is
 * the range every section can play at: the song's, held to the slowest
 * section's playable top (a section of sixteenths runs out of hands before a
 * section of quarters does).
 */
export function songBpm(st: Style, song: StyleSong | undefined): [number, number] {
  if (!song?.sections?.length) return withSong(st, song?.key).bpm;
  const ranges = song.sections.map((x) => withSong(st, partKey(song, x)).bpm);
  const hi = Math.min(...ranges.map((r) => r[1]));
  const lo = Math.min(hi, Math.max(...ranges.map((r) => r[0])));
  return [lo, hi];
}

/**
 * How fast an unbroken run of notes may go, in notes a second: ten is a run of
 * sixteenths at 150, of sextuplets at 100, of eighths at 300. A record's own
 * tempo is often faster than that under its fills, and a pattern to practise
 * is not the record.
 */
export const RUN_RATE = 10;
/** How many notes on consecutive steps make a run rather than a double or a drag. */
export const RUN_LENGTH = 4;

/** The longest stretch of consecutive steps a figure or fill has a note on, every lane together. */
export function longestRun(f: Figure): number {
  const rows = Object.values(f).filter((r): r is string => !!r);
  const len = Math.max(0, ...rows.map((r) => r.length));
  let best = 0;
  let run = 0;
  for (let i = 0; i < len; i++) {
    // a fill shorter than its longest row is written to the end, as `applyFigureFill` puts it
    const hit = rows.some((r) => {
      const ch = r[i - (len - r.length)];
      return ch !== undefined && ch !== '.';
    });
    run = hit ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * A song's tempo range, held where its written bars stay playable: a song whose
 * figures or fills run {@link RUN_LENGTH} notes or more without a gap goes no
 * faster than {@link RUN_RATE} notes a second along that run. The low end
 * comes down with the top if it has to.
 */
export function playableBpm(st: Style): [number, number] {
  const [lo, hi] = st.bpm;
  const run = Math.max(
    0,
    ...[...(st.figures ?? []), ...(st.fills ?? [])].map(([f]) => longestRun(f))
  );
  if (run < RUN_LENGTH) return [lo, hi];
  const top = Math.floor((60 * RUN_RATE) / stepsPerQuarter(meterOf(st.meter)));
  return [Math.min(lo, top), Math.min(hi, top)];
}

const MERGED = new WeakMap<Style, Map<string, Style>>();

/**
 * The style with a song laid over it: the song's params win, field by field.
 *
 * A section of a song is laid over the song in turn.
 *
 * One exception, because two fields are one setting: a song that names its own
 * `swing` and no `swingRange` is a song with that one swing, and the style's
 * range must not survive it — `swingFor` reads the range first and would set
 * the slider somewhere the song never asked for.
 *
 * The style itself for an unknown or absent key. Memoised on the style
 * object's identity, so `styleIn`'s own memo, which is keyed the same way,
 * still hits on the merged style.
 */
export function withSong(st: Style, key: string | undefined): Style {
  const part = songPartOf(st, key);
  if (!part) return st;
  const { song, section } = part;
  const at = partKey(song, section);
  let byKey = MERGED.get(st);
  const cached = byKey?.get(at);
  if (cached) return cached;
  const out: Style = { ...st, ...song.params, ...section?.params };
  /* The swing is the innermost one named, and a range named outside it does
     not survive it: only one named beside it, or inside it, still applies. */
  const layers = section ? [song.params, section.params] : [song.params];
  let named = -1;
  layers.forEach((l, i) => {
    if (l.swing !== undefined) named = i;
  });
  if (named >= 0 && !layers.slice(named).some((l) => l.swingRange)) delete out.swingRange;
  out.bpm = playableBpm(out);
  if (!byKey) {
    byKey = new Map();
    MERGED.set(st, byKey);
  }
  byKey.set(at, out);
  return out;
}
