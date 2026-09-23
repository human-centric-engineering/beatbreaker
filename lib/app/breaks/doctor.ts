import { LANES, bbValue, snareKept } from '@/lib/app/breaks/lanes';
import { M44, groupsOf, remapList } from '@/lib/app/breaks/meter';
import { applyCompFill, applyFill } from '@/lib/app/breaks/generate';
import { reduceBar } from '@/lib/app/breaks/layers';
import { clonePattern, meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import { makeRng, wpick } from '@/lib/app/breaks/rng';
import { styleIn } from '@/lib/app/breaks/styles';
import type { Meter, Pattern, Style } from '@/lib/app/breaks/types';

/**
 * The break doctor: twelve musical edits, applied to a whole section.
 *
 * Each one is a move a teacher would name — add ghost notes, push the
 * backbeat, open the hats — rather than a grid operation. Applying one re-runs
 * the critic, so you can see whether the move helped.
 *
 * This is also where a model-authored edit will land: a sentence and the
 * critic's report go to the model, a patched grid comes back, and the same
 * rules that guard these moves check that what came back is playable.
 */

export type DoctorMove =
  | 'ghosts+'
  | 'ghosts-'
  | 'kick+'
  | 'space'
  | 'push'
  | 'opens'
  | 'swap'
  | 'fill'
  | 'crash'
  | 'mirror'
  | 'reverse'
  | 'flatten';

export const DOCTOR_MOVES: Array<{ move: DoctorMove; label: string }> = [
  { move: 'ghosts+', label: 'Add ghost notes' },
  { move: 'ghosts-', label: 'Strip ghosts' },
  { move: 'kick+', label: 'Busier kick' },
  { move: 'space', label: 'More space' },
  { move: 'push', label: 'Push the backbeat' },
  { move: 'opens', label: 'Open the hats' },
  { move: 'swap', label: 'Swap hats ↔ ride' },
  { move: 'fill', label: 'Fill the last bar' },
  { move: 'crash', label: 'Crash on 1' },
  { move: 'mirror', label: 'Mirror bar 1' },
  { move: 'reverse', label: 'Reverse the beats' },
  { move: 'flatten', label: 'Flatten to L2' },
];

function inMeter(list: number[], m: Meter): number[] {
  return m === M44 ? list : remapList(list, M44, m);
}

/**
 * Apply one move, returning a new pattern. The original is left alone, which is
 * what makes undo a matter of keeping the old reference rather than replaying
 * the inverse of a move — several of these have no inverse.
 *
 * @param style0 the pattern's style, resolved by the caller. A move writes new
 * notes — where ghosts want to land, which steps the kick may not take — and
 * that is generator knowledge, not the five attributes a pattern carries with
 * it. A pattern whose style has been deleted can still be played, scored and
 * exported; it cannot be doctored, and the caller is the one who can say so.
 * @param entropy varies the result between presses of the same button. Pass a
 * fixed value to make a move reproducible (a test, or a server-side replay).
 */
export function doctor(
  input: Pattern,
  style0: Style,
  move: DoctorMove,
  entropy = Date.now()
): Pattern {
  const pat = clonePattern(input);
  const rng = makeRng((pat.seed + entropy) >>> 0);
  const style = styleIn(style0, pat.meter);
  const m = meterOfPat(pat);
  const steps = patSteps(pat);
  const groups = groupsOf(m);
  const lastGroup = groups[groups.length - 1];

  pat.bars.forEach((b, bi) => {
    switch (move) {
      case 'ghosts+': {
        const gwd = style.ghostWeights;
        const pool = gwd
          ? Object.keys(gwd).map(Number)
          : inMeter([1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], m);
        const cands = pool.filter((i) => i < steps && !b.s[i] && !(b.s[i - 1] && b.s[i - 2]));
        for (let n = 0; n < 2 && cands.length; n++) {
          const i = gwd
            ? wpick(
                rng,
                cands.map((x): [number, number] => [x, gwd[x]])
              )
            : cands[Math.floor(rng() * cands.length)];
          cands.splice(cands.indexOf(i), 1);
          b.s[i] = 1;
        }
        break;
      }

      case 'ghosts-':
        for (let i = 0; i < steps; i++) if (b.s[i] === 1) b.s[i] = 0;
        break;

      case 'kick+': {
        const cands = inMeter([2, 3, 6, 7, 10, 11, 14, 15], m).filter(
          (i) => i < steps && !b.k[i] && !snareKept(b.s[i])
        );
        if (cands.length) b.k[cands[Math.floor(rng() * cands.length)]] = 1;
        break;
      }

      case 'space': {
        const ks: number[] = [];
        for (let i = 1; i < steps; i++) if (b.k[i]) ks.push(i);
        if (ks.length) b.k[ks[Math.floor(rng() * ks.length)]] = 0;
        const gs: number[] = [];
        for (let i = 0; i < steps; i++) if (b.s[i] === 1) gs.push(i);
        if (gs.length > 2) b.s[gs[Math.floor(rng() * gs.length)]] = 0;
        break;
      }

      case 'push': {
        const at = lastGroup.start;
        if (bi === pat.bars.length - 1 && snareKept(b.s[at])) {
          const v = b.s[at];
          b.s[at] = 0;
          b.s[at - 1] = v;
        }
        break;
      }

      case 'opens': {
        for (let i = 0; i < steps; i++) if (b.h[i] === 3) b.h[i] = 1;
        const cands = inMeter([6, 7, 10, 14, 15], m).filter((i) => i < steps && b.h[i]);
        if (cands.length) b.h[cands[Math.floor(rng() * cands.length)]] = 3;
        break;
      }

      case 'swap':
        for (let i = 0; i < steps; i++) {
          if (b.h[i]) {
            b.r[i] = b.h[i] === 2 ? 2 : 1;
            b.h[i] = 0;
          } else if (b.r[i]) {
            b.h[i] = b.r[i] === 2 ? 2 : 1;
            b.r[i] = 0;
          }
        }
        break;

      case 'fill':
        if (bi === pat.bars.length - 1) {
          const nb =
            style.fill === 'comp'
              ? applyCompFill(rng, b, style, m)
              : applyFill(rng, b, m, pat.lanes);
          // a clave is the identity of the groove, not decoration a fill may write over
          if (style.clave) {
            /* Bounded by the bar: a backbeat past its end would extend the
               lane array and leave holes, not throw. See the same guard in
               `applyKickRules`. */
            for (const s of pat.backbeats) {
              if (s >= lastGroup.start && s < nb.s.length) nb.s[s] = bbValue('s', style);
            }
          }
          for (const L of LANES) b[L] = nb[L];
        }
        break;

      case 'crash':
        if (bi === 0) b.c[0] = b.c[0] ? 0 : 1;
        break;

      case 'mirror':
        if (bi > 0) {
          const src = pat.bars[0];
          for (const L of LANES) b[L] = src[L].slice();
        }
        break;

      case 'reverse':
        for (const L of LANES) {
          const chunks = groups.map((g) => b[L].slice(g.start, g.start + g.size));
          chunks.reverse();
          // pulses of different lengths cannot simply swap places, so put back what fits
          const flat = chunks.flat();
          b[L] = flat.length === steps ? flat : b[L];
        }
        break;

      case 'flatten': {
        const nb = reduceBar(b, 2, m, pat.hasRide, pat.hasHat, pat.pins?.[bi]);
        for (const L of LANES) b[L] = nb[L];
        break;
      }
    }
  });

  // swapping cymbals changes what the section *is*
  if (move === 'swap') pat.voice = pat.voice === 'hat' ? 'ride' : 'hat';

  return pat;
}
