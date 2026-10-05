import {
  FLAM,
  FOOT_LANE,
  HALF_OPEN,
  LANES,
  RIMSHOT,
  handLanes,
  handsOf,
} from '@/lib/app/breaks/lanes';
import { meterOfPat, clonePattern } from '@/lib/app/breaks/pattern';
import { describeStep } from '@/lib/app/breaks/text';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * Deterministic clean-up — "tidy up notes" from the brief.
 *
 * Only things nobody would argue with, and every one of them reported, so
 * BeatBuddy can say what it did rather than "I tidied it". Anything that is a
 * matter of taste — thinning the hats, moving a kick — is a doctor move, not
 * tidying. The rules, in the order they run:
 *
 * 1. **lane** — notes in a lane the pattern does not carry are dropped. They
 *    cannot be seen on the chart or heard in the mixer, so they are noise.
 * 2. **ride-clash** — a hi-hat and a ride on the same step, which the
 *    playability check fails. The quieter goes; on a tie, the cymbal that is
 *    not the pattern's time-keeper (`voice`).
 * 3. **hands** — more than two hand notes on one step. Two hands is physics.
 *    The quietest go first; on a tie the time-keeping cymbal goes before a
 *    drum, because the backbeat and the crash are what the bar is about.
 *    Percussion counts only when it is on the kit (`handLanes`): a tambourine
 *    or a shaker is a percussionist's part, and takes nobody's hand.
 * 4. **ghost-accent** — a ghost note directly beside an accent on the same
 *    drum, which no one plays and no one hears.
 * 5. **open-hat-foot** — a hi-hat foot chick on the same step as an open hat:
 *    the foot would close the hat the stick is playing open. The chick goes.
 * 6. **pin** — a pin (§ layers) left pointing at a step with no note.
 *
 * Quantising, the sixth thing the plan lists, is not here: the grid is already
 * sixteenths, and an import is quantised by the reader that makes it
 * (`readMidi`, `readGrooveScribeUrl`).
 *
 * Tidy never adds a note, and tidying a tidy pattern changes nothing.
 */

export type TidyRule = 'lane' | 'ride-clash' | 'hands' | 'ghost-accent' | 'open-hat-foot' | 'pin';

export interface TidyChange {
  rule: TidyRule;
  /** 1-based, as a drummer counts bars. */
  bar: number;
  lane: LaneKey;
  /** 0-based grid step. */
  step: number;
  /** One line a drummer can read: "bar 2, the 'e' of 3: ghost beside an accent". */
  note: string;
}

export interface TidyResult {
  pattern: Pattern;
  changes: TidyChange[];
}

/**
 * How loud a step value is, lane by lane — what "the quieter note" compares.
 * 0 ghost · 1 an ordinary hit · 2 an accent or a crash.
 */
function loudness(lane: LaneKey, v: number): number {
  if (!v) return -1;
  switch (lane) {
    case 's':
      // ghost · hit, cross-stick, drag, buzz · accent, rimshot, flam
      return v === 1 ? 0 : v === 3 || v === RIMSHOT || v === FLAM ? 2 : 1;
    case 'h':
      return v === 2 ? 2 : 1; // accent · closed/open/half-open
    case 'c':
      return 2;
    default:
      return v === 2 ? 2 : 1; // ride bell, and every hit/accent lane
  }
}

/** On a tie, which hand note goes first: the time-keeping cymbals, then percussion, then toms. */
const DROP_ORDER: LaneKey[] = ['h', 'r', 'p2', 'p1', 't1', 't2', 't3', 's', 'c'];

const VALUE_NAME: Partial<Record<LaneKey, string[]>> = {
  s: ['', 'ghost', 'snare', 'snare accent', 'cross-stick', 'rimshot', 'flam', 'drag', 'buzz roll'],
  h: ['', 'closed hat', 'hat accent', 'open hat', 'half-open hat'],
  r: ['', 'ride', 'ride bell'],
  c: ['', 'crash', 'crash 2', 'china', 'splash'],
  k: ['', 'kick', 'kick accent'],
  hf: ['', 'hat foot'],
};

const OTHER_NAME: Partial<Record<LaneKey, string>> = {
  t1: 'high tom',
  t2: 'mid tom',
  t3: 'floor tom',
  p1: 'perc 1',
  p2: 'perc 2',
};

function noteName(lane: LaneKey, v: number): string {
  return VALUE_NAME[lane]?.[v] ?? OTHER_NAME[lane] ?? lane;
}

export function tidy(input: Pattern): TidyResult {
  const pat = clonePattern(input);
  const m = meterOfPat(pat);
  const changes: TidyChange[] = [];

  const drop = (rule: TidyRule, bi: number, lane: LaneKey, step: number, why: string): void => {
    const was = pat.bars[bi][lane][step];
    pat.bars[bi][lane][step] = 0;
    changes.push({
      rule,
      bar: bi + 1,
      lane,
      step,
      note: `bar ${bi + 1}, ${describeStep(m, step)}: removed the ${noteName(lane, was)} — ${why}`,
    });
  };

  pat.bars.forEach((bar, bi) => {
    const n = bar.k.length;

    // 1. lanes the pattern does not carry
    for (const L of LANES) {
      if (pat.lanes.includes(L)) continue;
      for (let i = 0; i < n; i++)
        if (bar[L][i]) drop('lane', bi, L, i, 'that lane is not on this kit');
    }

    for (let i = 0; i < n; i++) {
      // 2. hat and ride together
      if (bar.h[i] && bar.r[i]) {
        const h = loudness('h', bar.h[i]);
        const r = loudness('r', bar.r[i]);
        const loser: LaneKey = h === r ? (pat.voice === 'ride' ? 'h' : 'r') : h < r ? 'h' : 'r';
        drop('ride-clash', bi, loser, i, 'one cymbal at a time');
      }

      /* 3. three or more hands. A flam or drag is two on its own — the grace
         is the other hand — so beside one there is room for nothing else. */
      const hands = handLanes(pat.perc).filter((L) => bar[L][i]);
      let count = hands.reduce((n, L) => n + handsOf(L, bar[L][i]), 0);
      if (count > 2) {
        const order = hands.sort(
          (a, b) =>
            loudness(a, bar[a][i]) - loudness(b, bar[b][i]) ||
            DROP_ORDER.indexOf(a) - DROP_ORDER.indexOf(b)
        );
        for (const L of order) {
          if (count <= 2) break;
          count -= handsOf(L, bar[L][i]);
          drop('hands', bi, L, i, 'there are only two hands');
        }
      }
    }

    // 4. a ghost directly beside an accent (the snare is the only lane with ghosts)
    for (let i = 0; i < n; i++) {
      if (bar.s[i] !== 1) continue;
      if (loudness('s', bar.s[i - 1]) === 2 || loudness('s', bar.s[i + 1]) === 2)
        drop('ghost-accent', bi, 's', i, 'a ghost right beside an accent is lost under it');
    }

    // 5. a foot chick closing an open hat on the same step
    for (let i = 0; i < n; i++) {
      if ((bar.h[i] === 3 || bar.h[i] === HALF_OPEN) && bar[FOOT_LANE][i])
        drop('open-hat-foot', bi, FOOT_LANE, i, 'the foot would close the open hat');
    }
  });

  // 6. pins with no note under them — last, since the rules above remove notes
  if (pat.pins) {
    let cleared = false;
    pat.pins = pat.pins.map((pins, bi) => {
      if (!pins) return pins;
      let barCleared = false;
      const kept: Partial<Record<LaneKey, number[]>> = {};
      for (const L of Object.keys(pins) as LaneKey[]) {
        const row = (pins[L] ?? []).map((level, i) => {
          if (!level || pat.bars[bi]?.[L]?.[i]) return level;
          barCleared = true;
          changes.push({
            rule: 'pin',
            bar: bi + 1,
            lane: L,
            step: i,
            note: `bar ${bi + 1}, ${describeStep(m, i)}: cleared a pin with no note under it`,
          });
          return 0;
        });
        if (row.some((v) => v)) kept[L] = row;
      }
      if (!barCleared) return pins;
      cleared = true;
      return Object.keys(kept).length ? kept : undefined;
    });
    if (cleared && pat.pins.every((p) => !p)) pat.pins = null;
  }

  return { pattern: pat, changes };
}
