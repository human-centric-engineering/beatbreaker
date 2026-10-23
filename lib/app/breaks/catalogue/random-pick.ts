import { PRACTICE_LIBRARIES } from '@/lib/app/breaks/library';
import { wpick, type Rng } from '@/lib/app/breaks/rng';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';

/**
 * Random, on the stage: one pattern drawn from everything the Studio holds — a
 * drummer's song, a style's groove or an exercise — every one as likely as any
 * other. So a drummer, a style or an exercise comes up in proportion to how
 * many patterns it has: Mitch Mitchell's forty-five songs come up more often
 * than Cindy Blackman Santana's three, and the forty rudiments more often than
 * a style with four grooves. Pure, so the odds are tested without a browser.
 *
 * Each pick carries the words to say it by: the drummer or style and the
 * song's title, or the exercise's title.
 */
export type RandomPick =
  | { kind: 'drummer' | 'style'; style: string; song?: string; label: string }
  | { kind: 'exercise'; entryId: string; label: string };

/**
 * What is on the stage, so Random does not pick it again: a library entry, or
 * a style and the song it plays (by the song's own key, not a section's).
 */
export type OnStage = { entryId: string } | { style: string; song?: string };

/**
 * How many patterns each thing in the catalogue has: a style with songs, one
 * per song; a style without, one per groove it lists (`figures`), or one for a
 * style written from its rules alone; an exercise (a rudiment, a polyrhythm),
 * one. Only the styles the picker shows.
 */
export function randomPool(catalogue: StudioCatalogue): Array<[RandomPick, number]> {
  const pool: Array<[RandomPick, number]> = [];
  const seen = new Set<string>();
  for (const [, keys] of catalogue.styleGroups) {
    for (const key of keys) {
      const st = catalogue.styles[key]?.params;
      if (!st || seen.has(key)) continue;
      seen.add(key);
      const kind = st.drummer ? 'drummer' : 'style';
      if (st.songs?.length) {
        for (const sg of st.songs)
          pool.push([{ kind, style: key, song: sg.key, label: `${st.label} — ${sg.title}` }, 1]);
      } else {
        pool.push([{ kind, style: key, label: st.label }, Math.max(1, st.figures?.length ?? 0)]);
      }
    }
  }
  for (const library of catalogue.libraries) {
    if (!PRACTICE_LIBRARIES.includes(library.key)) continue;
    for (const entry of library.entries)
      pool.push([{ kind: 'exercise', entryId: entry.id, label: entry.title }, 1]);
  }
  return pool;
}

/** Whether a pick is what is on the stage already. */
function isOnStage(pick: RandomPick, stage: OnStage): boolean {
  if (pick.kind === 'exercise') return 'entryId' in stage && stage.entryId === pick.entryId;
  return !('entryId' in stage) && stage.style === pick.style && stage.song === pick.song;
}

/**
 * One pick from {@link randomPool}, by its weights, other than what is on the
 * stage (unless that is all there is); null when the catalogue is empty.
 */
export function randomPick(
  catalogue: StudioCatalogue,
  rng: Rng,
  stage?: OnStage
): RandomPick | null {
  const pool = randomPool(catalogue);
  const elsewhere = stage ? pool.filter(([p]) => !isOnStage(p, stage)) : pool;
  const from = elsewhere.length ? elsewhere : pool;
  return from.length ? wpick(rng, from) : null;
}
