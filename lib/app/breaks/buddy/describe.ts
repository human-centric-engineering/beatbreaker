import { listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import { barEq, critique, playability } from '@/lib/app/breaks/critic';
import { type BreakDoc, breakDocFromPayload } from '@/lib/app/breaks/share';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { toText } from '@/lib/app/breaks/text';
import type { Pattern } from '@/lib/app/breaks/types';

/**
 * How BeatBuddy's tools show a pattern to the model: the lane-string notation
 * the famous-breaks library is written in, with the critic's reading beside it.
 * Shared by every tool that returns a pattern, so the model sees one shape.
 */

export type Section = 'A' | 'B';

export const SECTIONS: readonly Section[] = ['A', 'B'];

export interface SectionView {
  section: Section;
  style: string;
  meter: string;
  bars: number;
  /** `toText()` — a header line, then a count row and one row per lane, per bar. */
  text: string;
  critic: {
    /** 0–100. */
    score: number;
    verdict: string;
    /** False when the pattern breaks a rule no tempo or taste excuses. */
    playable: boolean;
    /** The playability checks it fails, in the critic's words. */
    failing: string[];
  };
}

/** A workspace document as a {@link BreakDoc}, styles resolved from the catalogue. */
export async function decodeWorkspace(doc: SharePayload): Promise<BreakDoc> {
  return breakDocFromPayload(doc, styleLookup(await listStyles()));
}

export function viewSection(
  pat: Pattern,
  section: Section,
  bpm: number,
  swing: number
): SectionView {
  const checks = playability(pat, bpm);
  const score = critique(pat, bpm);
  return {
    section,
    style: pat.style,
    meter: pat.meter,
    bars: pat.bars.length,
    text: toText(pat, { section, bpm, swing }),
    critic: {
      score: score.score,
      verdict: score.verdict,
      playable: checks.hard,
      failing: checks.checks.filter((c) => !c.ok).map((c) => c.label),
    },
  };
}

/** The 1-based numbers of the bars that differ between two versions of a section. */
export function changedBars(before: Pattern, after: Pattern): number[] {
  const out: number[] = [];
  const n = Math.max(before.bars.length, after.bars.length);
  for (let i = 0; i < n; i++) {
    const a = before.bars[i];
    const b = after.bars[i];
    if (!a || !b || !barEq(a, b)) out.push(i + 1);
  }
  return out;
}
