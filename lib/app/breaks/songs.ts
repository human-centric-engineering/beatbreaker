import { DEFAULT_METER, meterOf, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { polyFillsIn } from '@/lib/app/breaks/poly-fill';
import { wpick, type Rng } from '@/lib/app/breaks/rng';
import type { TempoRatio } from '@/lib/app/breaks/sections';
import type {
  Figure,
  SongSection,
  Style,
  StyleSong,
  StyleSongParams,
} from '@/lib/app/breaks/types';

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
export function songParts(st: Style): SongPart[] {
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

/**
 * Each section of a song as the top tempo sees it: its meter and its tempo
 * ratio — what `maxBpmOf` holds the break's tempo to.
 */
export function songPaces(
  st: Style,
  song: StyleSong
): Array<{ meter: string; tempoRatio?: TempoRatio }> {
  return song.sections?.length
    ? song.sections.map((x) => ({
        meter: songMeter(st, song, x),
        ...(x.tempoRatio ? { tempoRatio: x.tempoRatio } : {}),
      }))
    : [{ meter: songMeter(st, song) }];
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
 * One section of a song in sections, for a pattern written alone from a song a
 * seed picked: among the sections in the meter (the first's, which is how the
 * song was picked), by the weight of their figures — the share each groove had
 * when the song was one pool. Undefined for a song in one part.
 */
export function pickSection(
  st: Style,
  song: StyleSong,
  rng: Rng,
  meterKey: string = songMeter(st, song)
): SongSection | undefined {
  const inMeter = (song.sections ?? []).filter((x) => songMeter(st, song, x) === meterKey);
  if (!inMeter.length) return song.sections?.[0];
  const share = (x: SongSection) =>
    (x.params.figures ?? song.params.figures ?? []).reduce((n, [, w]) => n + w, 0) || 1;
  return wpick(
    rng,
    inMeter.map((x): [SongSection, number] => [x, share(x)])
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
 * section of quarters does). A section at a tempo ratio names its range at the
 * speed it plays, so it is divided by its ratio first: Angel of Death's break
 * at 100–110, at ×½, is 200–220 of the song's tempo.
 */
export function songBpm(st: Style, song: StyleSong | undefined): [number, number] {
  if (!song?.sections?.length) return withSong(st, song?.key).bpm;
  const ranges = song.sections.map((x) => {
    const [lo, hi] = withSong(st, partKey(song, x)).bpm;
    const r = x.tempoRatio ?? 1;
    return [Math.ceil(lo / r), Math.floor(hi / r)];
  });
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

/** A swing and its range, as a style, a song or a section names them. */
export interface SwingLayer {
  swing?: number;
  swingRange?: [number, number];
}

/**
 * The swing and range a style ends up with under its song (and section): the
 * innermost swing named, and the innermost range named beside it or inside it.
 * A range named further out does not survive a swing named inside it —
 * `swingFor` reads the range first and would set the slider somewhere the song
 * never asked for. `withSong` lays them so, and the catalogue schema checks
 * the swing against the range this gives.
 */
export function layeredSwing(layers: SwingLayer[]): SwingLayer {
  let named = 0;
  layers.forEach((l, i) => {
    if (l.swing !== undefined) named = i;
  });
  let swingRange: SwingLayer['swingRange'];
  for (const l of layers.slice(named)) swingRange = l.swingRange ?? swingRange;
  return { swing: layers[named]?.swing, swingRange };
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
/**
 * A poly fill (12-c) is written in the meter of the part that names it: a
 * style's in the style's, a song's in the song's. Where a song or section
 * sets another meter and keeps the poly fills it inherits, they are carried
 * into it by the quarter note, as `styleIn` carries them, and dropped where
 * the figure leaves the grid.
 */
function carryPolyFills(out: Style, layers: StyleSongParams[]): void {
  let meter = DEFAULT_METER;
  let written: string | null = null;
  for (const layer of layers) {
    if (layer.meter) meter = layer.meter;
    if (layer.polyFills) written = meter;
  }
  const now = out.meter ?? DEFAULT_METER;
  if (!out.polyFills || !written || written === now) return;
  const carried = polyFillsIn(out.polyFills, meterOf(written), meterOf(now));
  if (carried.length) out.polyFills = carried;
  else delete out.polyFills;
}

export function withSong(st: Style, key: string | undefined): Style {
  const part = songPartOf(st, key);
  if (!part) return st;
  const { song, section } = part;
  const at = partKey(song, section);
  let byKey = MERGED.get(st);
  const cached = byKey?.get(at);
  if (cached) return cached;
  const out: Style = { ...st, ...song.params, ...section?.params };
  /* A section at a tempo ratio names its range at the speed it plays; one
     that names none inherits the song's, in the song's tempo, so it is moved
     to the section's — or `songBpm` would divide it a second time. */
  if (section?.tempoRatio && !section.params.bpm) {
    const r = section.tempoRatio;
    out.bpm = [Math.round(out.bpm[0] * r), Math.round(out.bpm[1] * r)];
  }
  const swung = layeredSwing([st, song.params, ...(section ? [section.params] : [])]);
  if (swung.swingRange) out.swingRange = swung.swingRange;
  else delete out.swingRange;
  out.bpm = playableBpm(out);
  carryPolyFills(out, [st, song.params, ...(section ? [section.params] : [])]);
  if (!byKey) {
    byKey = new Map();
    MERGED.set(st, byKey);
  }
  byKey.set(at, out);
  return out;
}
