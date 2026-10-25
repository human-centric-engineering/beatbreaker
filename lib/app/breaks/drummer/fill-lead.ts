import type { Bar } from '@/lib/app/breaks/types';

/**
 * How far apart two strokes of one fill may be, in steps: a fill of quarter
 * notes round the toms is still one fill, but a backbeat a beat away from a
 * tom is not part of it.
 */
const RUN_GAP = 4;

/**
 * The hands of a bar's fills for a drummer who leads them with the other hand:
 * a left-hander on a right-handed kit (Ringo Starr). Each fill — a run of two
 * or more strokes on the snare and toms with no hat, ride or crash keeping
 * time over it — is played hand to hand starting with the left, `L` being the
 * other hand and `R` the lead in a written row (`Sticking`). A step struck on
 * two drums at once is left to the drummer, and so is everything outside a
 * fill. Null when the bar has no fill.
 */
export function leftLedFills(bar: Bar): string | null {
  const n = bar.k.length;
  const stroke = (i: number) =>
    !!(bar.s[i] || bar.t1[i] || bar.t2[i] || bar.t3[i]) && !(bar.h[i] || bar.r[i] || bar.c[i]);
  const timeKept = (i: number) => !!(bar.h[i] || bar.r[i] || bar.c[i]);
  const both = (i: number) =>
    [bar.s[i], bar.t1[i], bar.t2[i], bar.t3[i]].filter((v) => !!v).length > 1;

  const row = Array<string>(n).fill('.');
  let any = false;
  let i = 0;
  while (i < n) {
    if (!stroke(i)) {
      i++;
      continue;
    }
    // the run: strokes close enough together, with nothing keeping time between them
    const run = [i];
    let j = i + 1;
    while (j < n && j - run[run.length - 1] <= RUN_GAP) {
      if (timeKept(j)) break;
      if (stroke(j)) run.push(j);
      j++;
    }
    if (run.length >= 2) {
      let hand = 'L';
      for (const at of run) {
        if (!both(at)) row[at] = hand;
        hand = hand === 'L' ? 'R' : 'L';
      }
      any = true;
    }
    i = run[run.length - 1] + 1;
  }
  return any ? row.join('') : null;
}
