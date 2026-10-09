import { DEFAULT_METER, meterOf, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { wpick, type Rng } from '@/lib/app/breaks/rng';
import type { Figure, Style, StyleSong } from '@/lib/app/breaks/types';

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

/** The song with this key, if the style has one. */
export function songOf(st: Style | undefined, key: string | undefined): StyleSong | undefined {
  if (!st?.songs || !key) return undefined;
  return st.songs.find((s) => s.key === key);
}

/** The meter a song is written in: its own, else its style's. */
export function songMeter(st: Style, song: StyleSong | undefined): string {
  return song?.params.meter ?? st.meter ?? DEFAULT_METER;
}

/**
 * Pick one of a style's songs, by weight. Given a meter, only songs written in
 * it are candidates: a pattern whose meter is already settled (a B, a test, a
 * caller that passed one) gets a song that fits the bar. Undefined for a style
 * without songs, or with none in that meter.
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
  const [lo, hi] = withSong(st, song?.key).bpm;
  return Math.round(lo + rng() * (hi - lo));
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
  const song = songOf(st, key);
  if (!song) return st;
  let byKey = MERGED.get(st);
  const cached = byKey?.get(song.key);
  if (cached) return cached;
  const out: Style = { ...st, ...song.params };
  if (song.params.swing !== undefined && !song.params.swingRange) delete out.swingRange;
  out.bpm = playableBpm(out);
  if (!byKey) {
    byKey = new Map();
    MERGED.set(st, byKey);
  }
  byKey.set(song.key, out);
  return out;
}
