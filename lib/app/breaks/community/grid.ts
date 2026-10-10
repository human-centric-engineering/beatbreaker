import type { BreakDoc } from '@/lib/app/breaks/share';
import { LANES } from '@/lib/app/breaks/lanes';
import { stepSeconds } from '@/lib/app/breaks/meter';
import { meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import type { Pattern } from '@/lib/app/breaks/types';

/**
 * What a pattern's notes are, apart from everything else about it (task 6.9's
 * duplicate check), and how hard they are to play (the community library's
 * difficulty filter).
 *
 * The hashes are Web Crypto's SHA-256 (`crypto.subtle`), which every realm
 * this can run in has — so they are async.
 */

/**
 * One section's notes as text: every lane of every bar, in `LANES` order,
 * whether the pattern carries the lane or not. The name, tempo, swing, style,
 * seed and layer pins are left out on purpose — renaming a pattern or moving
 * its tempo does not make it someone else's work.
 */
function sectionText(p: Pattern): string {
  return p.bars.map((bar) => LANES.map((lane) => (bar[lane] ?? []).join('')).join('/')).join('|');
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A hash of one section's notes. What the famous-library check compares. */
export function sectionHash(p: Pattern): Promise<string> {
  return sha256(sectionText(p));
}

/**
 * A hash of both sections' notes — the `Break.gridHash` column, and what the
 * check against other people's published patterns compares.
 */
export function gridHash(doc: Pick<BreakDoc, 'A' | 'B'>): Promise<string> {
  return sha256(`${sectionText(doc.A)}#${sectionText(doc.B)}`);
}

/** Hits per second at or above which a pattern reads as medium, then hard. */
export const MEDIUM_FROM = 6;
export const HARD_FROM = 10;

export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/**
 * What a stored `difficulty` says, or null. The column is a plain integer, so
 * it is read back through this rather than cast: anything but 1, 2 or 3 is no
 * difficulty at all.
 */
export function difficultyLabel(value: unknown): string | null {
  return value === 1 || value === 2 || value === 3 ? DIFFICULTY_LABELS[value] : null;
}

/** Hits per second in one section at `bpm` (sixteenths at a quarter of it, sextuplets at a sixth). */
function hitsPerSecond(p: Pattern, bpm: number): number {
  const steps = patSteps(p) * p.bars.length;
  if (!steps || bpm <= 0) return 0;
  let hits = 0;
  for (const bar of p.bars) {
    for (const lane of p.lanes) for (const v of bar[lane] ?? []) if (v) hits++;
  }
  return hits / (steps * stepSeconds(meterOfPat(p), bpm));
}

/**
 * How hard a pattern is to play: 1 easy · 2 medium · 3 hard, from the busier
 * section's hits per second at the pattern's own tempo.
 *
 * A first cut — the critic scores whether a pattern is good, not whether it is
 * hard — so it counts only what a player has to do and how fast. An eighth-note
 * rock beat at 100 is easy; the same with sixteenth hats is medium; a busy
 * funk pattern with ghosts is hard.
 */
export function difficultyOf(doc: Pick<BreakDoc, 'A' | 'B' | 'bpm'>): Difficulty {
  const rate = Math.max(hitsPerSecond(doc.A, doc.bpm), hitsPerSecond(doc.B, doc.bpm));
  return rate >= HARD_FROM ? 3 : rate >= MEDIUM_FROM ? 2 : 1;
}
