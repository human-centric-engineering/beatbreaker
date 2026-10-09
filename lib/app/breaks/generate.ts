import {
  BUZZ,
  CHINA,
  DRAG,
  FLAM,
  FOOT_LANE,
  HALF_OPEN,
  RIMSHOT,
  TOM_LANES,
  bbLaneOf,
  bbValue,
  handLanes,
  handsAt,
  handsOf,
  laneRoster,
  percRoster,
  snareKept,
} from '@/lib/app/breaks/lanes';
import {
  DEFAULT_METER,
  M44,
  groupsOf,
  isEighths,
  isGroupStart,
  meterOf,
  remapList,
  remapWeights,
  stepsOf,
} from '@/lib/app/breaks/meter';
import {
  cloneBar,
  clonePattern,
  emptyBar,
  meterOfPat,
  styleAttrs,
  markFill,
  writePerc,
} from '@/lib/app/breaks/pattern';
import { clamp, makeRng, wpick, type Rng } from '@/lib/app/breaks/rng';
import { pickSong, songMeter, songOf, withSong } from '@/lib/app/breaks/songs';
import { styleIn } from '@/lib/app/breaks/styles';
import type {
  Bar,
  Figure,
  LaneKey,
  Meter,
  Pattern,
  PercLaneKey,
  ResolvedStyle,
  Style,
} from '@/lib/app/breaks/types';

/**
 * The generator: seeded RNG in, {@link Pattern} out.
 *
 * Pure functions, no DOM. The same seed and the same options give back the same
 * break on any machine, which is what makes a share code work and what lets the
 * server re-derive a break it was only sent the seed for.
 *
 * Rules rather than a model, on purpose: rules are faster and never produce
 * something unplayable. The model earns its keep elsewhere — turning a sentence
 * into a grid patch, naming a break from its own rhythm, writing the practice
 * note that says *why* a bar is hard.
 */

/**
 * A kick cell is four characters — one quarter of 4/4. In a pulse that is not
 * four steps long the same four characters are spread across it
 * proportionally, so a compound pulse gets the figure stretched rather than
 * truncated.
 */
function cellStep(j: number, size: number, sub: number): number {
  // sextuplets: the "e" and the "a" go to the triplet partials either side of the "and"
  if (sub === 6 && size === 6) return [0, 2, 3, 4][j] ?? 0;
  // eighths: a pulse of two steps, the beat and its "and"; the "e" joins the beat, the "a" the "and"
  if (sub === 2 && size === 2) return j < 2 ? 0 : 1;
  if (sub !== 2) return size === 4 ? j : Math.min(size - 1, Math.round((j * size) / 4));
  /* Eighth-note denominators: the slots are the notated beats of the pulse, and
     the cell's fourth character folds onto the last of them rather than falling
     between two. */
  const slots = Math.max(1, Math.floor(size / 2));
  return Math.min(slots - 1, j) * 2;
}

function genKickBeat(
  rng: Rng,
  style: Style,
  beatIdx: number,
  density: number,
  hasBackbeat: boolean
): string {
  const table = beatIdx === 0 ? style.kick1 : style.kick;
  // bend the table toward the density setting
  const bent: Array<[string, number]> = table.map(([cell, w]) => {
    const notes = cell.split('').filter((c) => c === '1').length;
    return [cell, w * Math.pow(1 + density, notes - 1)];
  });
  let cell = wpick(rng, bent);
  // (on a double pedal the kick runs on under the backbeat)
  if (hasBackbeat && !style.doubleKick && cell[0] === '1' && rng() > 0.34)
    cell = `0${cell.slice(1)}`;
  return cell;
}

/**
 * Steps the style insists on, or refuses, plus the linear rule.
 *
 * A one drop with a kick on beat 1 is not a one drop played badly, it is a
 * different beat — so these are rules, not weightings.
 */
export function applyStyleRules(bar: Bar, style: Style): Bar {
  const n = bar.k.length;
  applyKickRules(bar, style);
  // linear: nothing shares a step with the kick or the snare
  if (style.linear) {
    for (let i = 0; i < n; i++) {
      if (bar.k[i] || bar.s[i]) {
        bar.h[i] = 0;
        bar.r[i] = 0;
      }
    }
  }
  return bar;
}

function applyKickRules(bar: Bar, style: Style): Bar {
  const n = bar.k.length;
  const forced = style.forceKick ?? [];
  const banned = style.noKick ?? [];
  /* Both bounded by the bar. A step list is written for one meter and carried
     into others by `styleIn`, and from Phase 2 it is also a row somebody can
     edit — so a step past the end of this bar is reachable. Writing to it does
     not throw: it EXTENDS the lane array and leaves holes behind, which is a
     bar that reads `undefined` at step 16 and draws a note at NaN pixels.
     (`forced` was already guarded; `banned` was not. Found by the property
     test in tests/unit/lib/app/breaks/catalogue/schemas.test.ts.) */
  for (const i of banned) if (i < n) bar.k[i] = 0;
  for (const i of forced) if (i < n) bar.k[i] = 1;
  // on a double pedal a run of kicks is two feet's, and stays
  if (style.doubleKick) return bar;
  // never more than two 16ths of kick in a row — drop whichever the style did not ask for
  for (let i = 0; i < n - 2; i++) {
    if (bar.k[i] && bar.k[i + 1] && bar.k[i + 2]) {
      if (!forced.includes(i + 1)) bar.k[i + 1] = 0;
      else if (!forced.includes(i + 2)) bar.k[i + 2] = 0;
      else bar.k[i] = 0;
    }
  }
  return bar;
}

interface GenBarOpts {
  density: number;
  ghosts: number;
  backbeats: number[];
  meter: Meter;
}

function genBar(rng: Rng, style: Style, opts: GenBarOpts): Bar {
  const m = opts.meter;
  const n = stepsOf(m);
  const groups = groupsOf(m);
  const bar = emptyBar(n);
  const backbeats = opts.backbeats;
  const density = (opts.density - 50) / 90; // -0.55 … +0.55

  /* 1. The pulse first — everything else is written around it. Usually that is
        the snare backbeat; in jazz it is the hi-hat foot, and the snare is left
        free to comp. */
  const bbLane = bbLaneOf(style);
  const bbVal = bbValue(bbLane, style);
  for (const s of backbeats) if (s < n) bar[bbLane][s] = bbVal;
  // a foot pattern the style spells out itself, on top of or instead of the pulse
  for (const i of style.foot ?? []) if (i < n) bar[FOOT_LANE][i] = 1;
  /* Ghosts that are the groove rather than decoration on it. In a half-time
     shuffle the left hand filling the gap between the hi-hats is the whole
     sound — leaving that to a probability would mean sometimes generating a
     different beat — so these are written, and the Ghost notes slider adds more
     around them. */
  for (const i of style.snareGhosts ?? []) if (i < n && !bar.s[i]) bar.s[i] = 1;

  // 2. kick, one pulse-cell at a time
  groups.forEach((g, gi) => {
    const cell = genKickBeat(rng, style, gi, density, backbeats.includes(g.start));
    for (let j = 0; j < 4; j++) {
      if (cell[j] === '1') bar.k[g.start + cellStep(j, g.size, m.sub)] = 1;
    }
  });
  applyStyleRules(bar, style);

  /* 3. Cymbal lane. A style with a written ride pattern has one because the
        pattern *is* the style — a swing ride is not "eighths with an accent" —
        so it goes down as written and the hand hi-hat stays out of the way
        entirely. */
  if (style.ride) {
    for (const i of style.ride.steps ?? []) if (i < n) bar.r[i] = 1;
    for (const i of style.ride.bell ?? []) if (i < n) bar.r[i] = 2;
    return ghostPass(rng, bar, style, opts, m, n);
  }
  if (style.hat) {
    for (const i of style.hat.steps ?? []) if (i < n) bar.h[i] = 1;
    for (const i of style.hat.accents ?? []) if (i < n && bar.h[i]) bar.h[i] = 2;
    for (const i of style.hat.opens ?? []) if (i < n) bar.h[i] = 3;
    return ghostPass(rng, bar, style, opts, m, n);
  }

  const every = style.hats === 16 ? 1 : 2;
  for (let i = 0; i < n; i += every) bar.h[i] = isGroupStart(m, i) ? 2 : 1;

  /* Open hats — never adjacent, never under a crash. Most styles want them off
     the beat and out of the way; Afrobeat wants one on every "and", which is
     the sound of the thing. */
  let openCands = style.openSlots;
  if (!openCands) {
    if (m === M44) openCands = style.hats === 16 ? [3, 6, 7, 10, 14, 15] : [2, 6, 10, 14];
    else {
      openCands = [];
      for (const g of groups) {
        openCands.push(g.start + g.size - 2);
        if (style.hats === 16 && g.size > 2) openCands.push(g.start + g.size - 1);
      }
    }
  }
  let opens = 0;
  const wantOpens = rng() < 0.72 ? style.opens : 0;
  for (let tries = 0; tries < openCands.length && opens < wantOpens; tries++) {
    const slot = openCands[Math.floor(rng() * openCands.length)];
    if (!bar.h[slot]) continue;
    const nearOpen = bar.h[slot - 1] === 3 || bar.h[slot + 1] === 3;
    if (!nearOpen && rng() < 0.7) {
      bar.h[slot] = 3;
      opens++;
    }
  }

  return ghostPass(rng, bar, style, opts, m, n);
}

/**
 * 4. Ghost notes / comping.
 *
 * Where a ghost may land, and how likely it is there. A style running on a
 * subdivision this grid does not otherwise imply says so itself; everything
 * else takes the 16th-note default.
 */
function ghostPass(rng: Rng, bar: Bar, style: Style, opts: GenBarOpts, m: Meter, n: number): Bar {
  const gw =
    style.ghostWeights ?? (m === M44 ? DEFAULT_GW : remapWeights(DEFAULT_GW, M44, m)) ?? {};
  const amount = (opts.ghosts / 100) * style.ghostBias;
  const ghostCap = Math.max(3, Math.round((7 * n) / 16));
  let ghosts = 0;

  for (let i = 0; i < n; i++) {
    if (bar.s[i]) continue;
    const w = gw[i];
    if (!w) continue;
    if (ghosts >= ghostCap) break;
    if (rng() < w * amount * 1.15) {
      // three snare events in a row is a drag, not a groove
      if (bar.s[i - 1] && bar.s[i - 2]) continue;
      /* Most styles want these under the music. A jazz comp is not a ghost note
         — it is a struck note in a sparse bar — so `ghostHit` promotes some. */
      bar.s[i] = style.ghostHit && rng() < style.ghostHit ? 2 : 1;
      ghosts++;
    }
  }
  return bar;
}

/**
 * The 4/4 candidate lists the styles were tuned against; in any other meter
 * they are carried over by pulse, same as the styles' own positions.
 */
const DEFAULT_GW: Record<number, number> = {
  1: 0.22,
  2: 0.34,
  3: 0.52,
  5: 0.3,
  6: 0.44,
  7: 0.5,
  9: 0.3,
  10: 0.44,
  11: 0.52,
  13: 0.28,
  14: 0.46,
  15: 0.4,
};
const VARY_GHOST = [3, 6, 7, 10, 11, 14, 15];
const VARY_KICK = [2, 3, 6, 7, 10, 11, 14, 15];
const VARY_OPEN = [6, 7, 10, 14, 15];

function inMeter(list: number[], m: Meter): number[] {
  return m === M44 ? list : remapList(list, M44, m);
}

/** One bar, moved a little — what makes bar 2 of a break not bar 1 again. */
export function varyBar(rng: Rng, bar: Bar, amount: number, style: Style, m: Meter): Bar {
  const b = cloneBar(bar);
  const steps = b.k.length;
  const forced = style.forceKick ?? [];
  const banned = style.noKick ?? [];
  const canPut = (i: number): boolean => !banned.includes(i);
  const canTake = (i: number): boolean => !forced.includes(i);
  const moves = 1 + Math.floor(rng() * 2 + amount * 2);

  for (let mv = 0; mv < moves; mv++) {
    const roll = rng();

    if (roll < 0.32) {
      // nudge a kick
      const ks: number[] = [];
      for (let i = 0; i < steps; i++) if (b.k[i] && i > 0 && canTake(i)) ks.push(i);
      if (ks.length) {
        const i = ks[Math.floor(rng() * ks.length)];
        const nudge = m.sub === 2 && !isEighths(m) ? 2 : 1;
        const j = clamp(i + (rng() < 0.5 ? -nudge : nudge), 1, steps - 1);
        if (!b.k[j] && !snareKept(b.s[j]) && canPut(j)) {
          b.k[i] = 0;
          b.k[j] = 1;
        }
      }
    } else if (roll < 0.62) {
      /* Add or move a ghost. Picking uniformly out of the style's own weight
         table throws the shape away: the generator carefully puts jazz comping
         in the gaps between ride notes and then the variation pass spreads it
         flat again. Weighted, or not at all. */
      const gwv = style.ghostWeights;
      const cands = (gwv ? Object.keys(gwv).map(Number) : inMeter(VARY_GHOST, m)).filter(
        (i) => i < steps && !b.s[i]
      );
      if (cands.length) {
        const put = gwv
          ? wpick(
              rng,
              cands.map((i): [number, number] => [i, gwv[i]])
            )
          : cands[Math.floor(rng() * cands.length)];
        b.s[put] = 1;
      } else {
        const gs: number[] = [];
        for (let i = 0; i < steps; i++) if (b.s[i] === 1) gs.push(i);
        if (gs.length) b.s[gs[Math.floor(rng() * gs.length)]] = 0;
      }
    } else if (roll < 0.8) {
      // move the open hat
      if (style.hat && !style.hat.opens?.length) continue;
      for (let i = 0; i < steps; i++) if (b.h[i] === 3) b.h[i] = 1;
      // a style that says where its opens go means it in the varied bars too
      const pool = style.openSlots ?? inMeter(VARY_OPEN, m);
      const cands = pool.filter((i) => i < steps && b.h[i]);
      if (cands.length) b.h[cands[Math.floor(rng() * cands.length)]] = 3;
    } else if (roll < 0.92) {
      // extra kick
      const cands = inMeter(VARY_KICK, m).filter(
        (i) => i < steps && !b.k[i] && !snareKept(b.s[i]) && canPut(i)
      );
      if (cands.length) b.k[cands[Math.floor(rng() * cands.length)]] = 1;
    } else {
      // drop a kick for air
      const ks: number[] = [];
      for (let i = 1; i < steps; i++) if (b.k[i] && canTake(i)) ks.push(i);
      if (ks.length) b.k[ks[Math.floor(rng() * ks.length)]] = 0;
    }
  }
  return b;
}

/**
 * The fill occupies the last pulse of the bar, whatever length that pulse is.
 *
 * The four shapes are written as offsets from its start so a 6/8 fill fills six
 * steps rather than the four a 4/4 bar happens to have.
 */
export function applyFill(
  rng: Rng,
  bar: Bar,
  m: Meter,
  lanes: LaneKey[],
  order: LaneKey[] = TOM_LANES
): Bar {
  const b = cloneBar(bar);
  const n = b.k.length;
  const g = groupsOf(m);
  const last = g[g.length - 1];
  const at = last.start;
  const size = Math.min(last.size, n - at);

  /* The positions this pulse actually has: sixteenths in simple time, the three
     triplet partials in compound. A fill written on the sixteenths of a 12/8
     bar is a fill in the wrong subdivision. */
  const pos: number[] = [];
  for (let o = 0; o < size; o += m.sub === 2 && !isEighths(m) ? 2 : 1) pos.push(o);
  const P = (k: number): number => pos[clamp(k, 0, pos.length - 1)];
  const set = (lane: LaneKey, off: number, v: number): void => {
    const i = at + off;
    if (i >= at && i < n) b[lane][i] = v;
  };

  for (let i = at; i < n; i++) {
    b.s[i] = 0;
    b.k[i] = 0;
    for (const L of TOM_LANES) b[L][i] = 0;
  }

  const L = pos.length;
  const shape = Math.floor(rng() * 4);
  if (shape === 0) {
    set('s', P(0), 3);
    set('s', P(L - 2), 2);
    set('s', P(L - 1), 2);
  } else if (shape === 1) {
    for (let k = Math.max(0, L - 4); k < L - 1; k++) set('s', P(k), 2);
    set('s', P(L - 1), 3);
  } else if (shape === 2) {
    set('s', P(0), 3);
    set('s', P(1), 1);
    set('s', P(L - 1), 3);
    set('k', P(L - 2), 1);
  } else {
    set('k', P(0), 1);
    set('s', P(L - 3), 2);
    set('s', P(L - 2), 1);
    set('s', P(L - 1), 3);
  }

  /* With toms in the kit the tail of the fill comes off the snare and goes
     round them: high to floor, or in the style's own order (a left-hander on
     a right-handed kit comes off the floor tom first). */
  const toms = order.filter((lane) => TOM_LANES.includes(lane) && lanes.includes(lane));
  if (toms.length && rng() < 0.72) {
    const moved: number[] = [];
    for (let o = Math.max(1, size - toms.length - 1); o < size; o++) {
      if (b.s[at + o] >= 2) moved.push(at + o);
    }
    moved.forEach((i, k) => {
      const lane = toms[Math.min(toms.length - 1, k)];
      b[lane][i] = b.s[i] >= 3 ? 2 : 1;
      b.s[i] = 0;
    });
  }
  return b;
}

/**
 * How a swing phrase ends.
 *
 * The closing fill assumes a backbeat groove: it clears the last pulse and
 * writes a snare figure into it. In jazz that is wrong twice over — it wipes
 * the comping that was the point, and it lands a rock fill on a swing phrase.
 * These styles end the phrase the way a drummer does, by saying a bit more, so
 * the fill *adds* comps at the style's own positions instead of replacing
 * anything.
 */
export function applyCompFill(rng: Rng, bar: Bar, style: Style, m: Meter): Bar {
  const b = cloneBar(bar);
  const n = b.k.length;
  const g = groupsOf(m);
  const last = g[g.length - 1];
  const pool = Object.keys(style.ghostWeights ?? {})
    .map(Number)
    .filter((i) => i >= last.start && i < n);
  if (!pool.length) return b;

  const want = style.fillComps ?? 2;
  let added = 0;
  for (let k = 0; k < pool.length * 2 && added < want; k++) {
    const i = pool[Math.floor(rng() * pool.length)];
    if (b.s[i]) continue;
    b.s[i] = rng() < 0.55 ? 2 : 1;
    added++;
  }
  return b;
}

/**
 * The fills a busy drummer puts inside the phrase ({@link Style.midFills}):
 * each bar that ends a pair, bar the last, may be filled the way the phrase
 * ends. Pairs are counted back from the end of each half (`half` is the bar
 * the second half starts on), so the bar leading into the second half's crash
 * is the one filled, never the crash bar itself. Drawn after everything else,
 * and only for a style that has them, so every other style's stream is
 * untouched.
 */
function addMidFills(
  rng: Rng,
  bars: Bar[],
  style: Style,
  fill: (bar: Bar) => Bar,
  half = bars.length
): number[] {
  const p = style.midFills ?? 0;
  const filled: number[] = [];
  if (!p) return filled;
  const ends: number[] = [];
  for (const [start, end] of [
    [0, half],
    [half, bars.length],
  ]) {
    for (let i = end - 1; i > start; i -= 2) if (i < bars.length - 1) ends.push(i);
  }
  for (const i of ends.sort((x, y) => x - y)) {
    if (rng() < p) {
      bars[i] = fill(bars[i]);
      filled.push(i);
    }
  }
  return filled;
}

/**
 * Crash and kick an 8th early ({@link Style.anticipate}): on the "and" of 4
 * of bar `i`, tied over, so the next bar has no 1 — no crash, no kick, and
 * the cymbal hand left ringing rather than starting its ostinato on top. Only
 * between two bars of the phrase, never from the last bar into the first:
 * the first bar of a break you start playing has to have its 1. Nor over a
 * backbeat on either of the last two steps, which is the groove, not a fill.
 */
function addAnticipations(
  rng: Rng,
  bars: Bar[],
  style: Style,
  backbeats: number[],
  at: number[]
): void {
  const p = style.anticipate ?? 0;
  if (!p) return;
  for (const i of [...new Set(at)].sort((x, y) => x - y)) {
    if (i < 0 || i >= bars.length - 1 || rng() >= p) continue;
    const b = cloneBar(bars[i]);
    const next = cloneBar(bars[i + 1]);
    const a = b.k.length - 2;
    // a groove with its backbeat on the "and" or the "a" of 4 keeps it
    if (backbeats.includes(a) || backbeats.includes(a + 1)) continue;
    for (const L of FILL_HAND_LANES) {
      b[L][a] = 0;
      b[L][a + 1] = 0;
    }
    b.k[a + 1] = 0;
    b.c[a] = 1;
    b.k[a] = 1;
    next.c[0] = 0;
    next.k[0] = 0;
    next.h[0] = 0;
    next.r[0] = 0;
    bars[i] = b;
    bars[i + 1] = next;
  }
}

/**
 * A cross-rhythm over the end of the phrase ({@link Style.crossRhythms}): an
 * accent every `every` steps, counted on from the first bar it covers and over
 * the bar lines, so a dotted quarter goes three against four for three bars.
 * A crash takes the cymbal hand off its ostinato for that step. Drawn only for
 * a style that sets `crossRhythm`.
 */
function addCrossRhythm(rng: Rng, bars: Bar[], style: Style): void {
  const p = style.crossRhythm ?? 0;
  const table = style.crossRhythms ?? [];
  if (!p || !table.length || rng() >= p) return;
  const cr = wpick(rng, table);
  const from = Math.max(0, bars.length - (cr.bars ?? bars.length));
  const n = bars[0].k.length;
  for (let t = 0; t < (bars.length - from) * n; t += cr.every) {
    const bar = bars[from + Math.floor(t / n)];
    const i = t % n;
    for (const [lane, v] of Object.entries(cr.lanes) as Array<[LaneKey, number]>) {
      bar[lane][i] = v;
      if (lane === 'c' && v) {
        bar.h[i] = 0;
        bar.r[i] = 0;
      }
    }
  }
}

/** How many steps a written figure covers: its longest row. */
function figureLength(f: Figure): number {
  return Math.max(0, ...Object.values(f).map((row) => row?.length ?? 0));
}

/** How many notes a written figure plays, across its lanes. */
function figureNotes(f: Figure): number {
  return Object.values(f).reduce(
    (sum, row) => sum + [...(row ?? '')].filter((ch) => ch !== '.').length,
    0
  );
}

/* ---- written-out bars ------------------------------------------------ */

/** The lanes a fill's hands take over in its span: whatever they were playing stops. */
const FILL_HAND_LANES: LaneKey[] = ['s', 'h', 'r', 'c', ...TOM_LANES];

/** A figure's row as step values, or null if it is not as long as the bar. */
function figureRow(row: string, n: number): number[] | null {
  if (row.length !== n) return null;
  return [...row].map((ch) => (ch === '.' ? 0 : Number(ch)));
}

/** Whether every row of a figure fits a bar of `n` steps. */
function figureFits(f: Figure, n: number): boolean {
  const len = figureLength(f);
  return (
    (len === n || len === 2 * n) && Object.values(f).every((row) => !row || row.length === len)
  );
}

/**
 * A style's figures that fit this bar, their weights bent toward the density
 * setting the way kick cells are: more kicks for a busier setting.
 */
function figuresFor(style: Style, n: number, density: number): Array<[Figure, number]> {
  return (style.figures ?? [])
    .filter(([f]) => figureFits(f, n))
    .map(([f, w]): [Figure, number] => {
      // kicks a bar, so a two-bar figure is weighed like a one-bar one
      const kicks =
        [...(f.k ?? '')].filter((ch) => ch !== '.' && ch !== '0').length / (figureLength(f) / n);
      return [f, w * Math.pow(1 + density, kicks / 4 - 2)];
    });
}

/** A bar written straight from a figure; lanes it does not name stay empty. */
/**
 * The bars a figure writes: one, or two for a figure twice as long as the bar
 * — a groove whose second bar answers its first (I Feel Fine, Birthday), which
 * the phrase then plays in turn.
 */
function figureBars(f: Figure, n: number): Bar[] {
  if (figureLength(f) !== 2 * n) return [figureBar(f, n)];
  const half = (from: number): Figure =>
    Object.fromEntries(Object.entries(f).map(([lane, row]) => [lane, row?.slice(from, from + n)]));
  return [figureBar(half(0), n), figureBar(half(n), n)];
}

function figureBar(f: Figure, n: number): Bar {
  const bar = emptyBar(n);
  for (const [lane, row] of Object.entries(f) as Array<[LaneKey, string | undefined]>) {
    const vals = row ? figureRow(row, n) : null;
    if (vals) bar[lane] = vals;
  }
  return bar;
}

/** Whether the kick is a run all the way through — nothing to vary without breaking it. */
function kickRuns(b: Bar): boolean {
  return b.k.every((v) => v > 0);
}

/**
 * A figure bar moved a little: what a drummer changes from one pass of a riff
 * to the next. Not the general variation pass, which would nudge a run of
 * kicks apart and turn a half-open wash back into closed hats: here the kick
 * picks up or drops an off-beat note (the riff's push), a closed hat opens on
 * an "and", or a cymbal accent lands on one — a china if the style plays
 * chinas, otherwise a crash.
 */
function varyFigureBar(rng: Rng, bar: Bar, style: Style, m: Meter): Bar {
  const b = cloneBar(bar);
  const n = b.k.length;
  const backbeats = style.backbeats ?? [];
  const roll = rng();
  const opensAt = inMeter([14, 6, 10, 2], m).filter(
    (i) => i < n && b.h[i] === 1 && b.h[i - 1] !== 3 && b.h[i + 1] !== 3
  );
  if (roll < 0.45 && !kickRuns(b)) {
    // the kick follows the riff: an 8th or a 16th off the beat comes or goes
    const cands = inMeter(VARY_KICK, m).filter(
      (i) => i < n && !backbeats.includes(i) && !snareKept(b.s[i])
    );
    if (cands.length) {
      const i = cands[Math.floor(rng() * cands.length)];
      b.k[i] = b.k[i] ? 0 : 1;
    }
  } else if (roll < 0.7 && opensAt.length) {
    // the hats open on an "and", most often the one before the bar line
    b.h[opensAt[Math.floor(rng() * rng() * opensAt.length)]] = 3;
  } else {
    // a cymbal accent on an off-beat 8th, the hand leaving its ostinato for it
    const china = (style.figures ?? []).some(([f]) => f.c?.includes(String(CHINA)));
    const cands = inMeter([14, 6, 10], m).filter((i) => i < n && !b.c[i]);
    if (cands.length) {
      const i = cands[Math.floor(rng() * rng() * cands.length)];
      b.c[i] = china && rng() < 0.55 ? CHINA : 1;
      b.h[i] = 0;
      b.r[i] = 0;
      if (!b.k[i]) b.k[i] = 1;
    }
  }
  return b;
}

/**
 * A written fill over the end of a bar: the hands' lanes in its span are
 * cleared and played as written; the kick is replaced only if the fill says
 * what it plays, and otherwise carries on under it.
 */
export function applyFigureFill(bar: Bar, fill: Figure): Bar {
  const b = cloneBar(bar);
  const n = b.k.length;
  const len = Math.max(0, ...Object.values(fill).map((row) => row?.length ?? 0));
  if (!len || len > n) return b;
  const at = n - len;
  markFill(b, at);
  for (const L of FILL_HAND_LANES) for (let i = at; i < n; i++) b[L][i] = 0;
  if (fill.k) for (let i = at; i < n; i++) b.k[i] = 0;
  for (const [lane, row] of Object.entries(fill) as Array<[LaneKey, string | undefined]>) {
    if (!row) continue;
    const from = n - row.length;
    [...row].forEach((ch, j) => {
      if (ch !== '.') b[lane][from + j] = Number(ch);
    });
  }
  return b;
}

/**
 * The bars of a phrase from a style's written-out figures: one for the groove
 * and, in a phrase of four bars or more, often a second for the second half —
 * the riff changes, the drummer goes to half-time or opens the kick up — each
 * pass a little different from the last, a crash where each half starts and a
 * written fill to end on. Null when no figure fits the bar, and the style
 * falls back on its kick cells.
 *
 * The backbeats come back with the bars, read off the figures rather than the
 * style: a half-time bar has its backbeat on 3 and a skank beat on every "and",
 * and a phrase's backbeats are the steps where every figure in it puts one.
 */
function figurePhrase(
  rng: Rng,
  style: Style,
  opts: GenerateOptions,
  m: Meter,
  lanes: LaneKey[]
): { bars: Bar[]; backbeats: number[] } | null {
  const n = stepsOf(m);
  const density = (opts.density - 50) / 90;
  const table = figuresFor(style, n, density);
  if (!table.length) return null;
  let a = wpick(rng, table);
  const others = table.filter(([f]) => f !== a);
  let b = others.length ? wpick(rng, others) : a;
  // a build: the busier figure second, and always a second half to put it in
  if (style.build && figureNotes(b) < figureNotes(a)) [a, b] = [b, a];
  const half = opts.bars >= 4 && (rng() < 0.5 || !!style.build) ? opts.bars / 2 : opts.bars;
  const gOpts: GenBarOpts = {
    density: opts.density,
    ghosts: opts.ghosts,
    backbeats: style.backbeats ?? [],
    meter: m,
  };
  const coresA = figureBars(a, n).map((bar) => ghostPass(rng, bar, style, gOpts, m, n));
  const coresB = figureBars(b, n).map((bar) => ghostPass(rng, bar, style, gOpts, m, n));
  /* On the snare a backbeat is any struck note both figures put there. On the
     hat foot it is the style's own backbeats where both figures chick: a foot
     playing every beat does not make 1 and 3 backbeats. */
  const bbLane = bbLaneOf(style);
  const struck = (bar: Bar, i: number) => (bbLane === 's' ? bar.s[i] >= 2 : bar[bbLane][i] > 0);
  const backbeats: number[] = [];
  for (let i = 0; i < n; i++) {
    if (bbLane !== 's' && !(style.backbeats ?? []).includes(i)) continue;
    if ([...coresA, ...coresB].every((core) => struck(core, i))) backbeats.push(i);
  }

  const bars: Bar[] = [];
  for (let i = 0; i < opts.bars; i++) {
    // a two-bar figure plays its bars in turn, from the start of its half
    const cores = i < half ? coresA : coresB;
    const core = cores[(i < half ? i : i - half) % cores.length];
    const start = i === 0 || i === half;
    let bar = start || rng() < 0.5 ? cloneBar(core) : varyFigureBar(rng, core, style, m);
    // each half of the phrase starts on a crash, with the kick under it
    if (start && !bar.c[0]) {
      bar.c[0] = 1;
      bar.h[0] = 0;
      bar.r[0] = 0;
      bar.k[0] = bar.k[0] || 1;
    }
    bar = applyStyleRules(bar, style);
    bars.push(bar);
  }

  const last = bars.length - 1;
  /* A jazz phrase ends by saying more as often as on a written fill: half
     the time the comps thicken instead (and the draw for that is made only
     for those styles, so every other style's stream is untouched). */
  const comp = style.fill === 'comp';
  const fills = (style.fills ?? []).filter(([f]) => figureLength(f) <= n);
  /* Fills that grow: half a bar or less inside the phrase, the long ones
     favoured at its end. The tables only reweight, so the draws are the
     same in number as without. */
  const short = fills.filter(([f]) => figureLength(f) <= n / 2);
  const midTable = style.fillsGrow && short.length ? short : fills;
  const lastTable = style.fillsGrow
    ? fills.map(([f, w]): [Figure, number] => [f, w * (0.5 + (2 * figureLength(f)) / n)])
    : fills;
  const fillFrom =
    (table: Array<[Figure, number]>) =>
    (bar: Bar): Bar =>
      applyStyleRules(
        table.length && !(comp && rng() < 0.5)
          ? applyFigureFill(bar, wpick(rng, table))
          : comp
            ? applyCompFill(rng, bar, style, m)
            : applyFill(rng, bar, m, lanes, style.fillOrder),
        style
      );
  if (opts.bars > 1 && rng() < (comp ? 0.7 : 0.8)) bars[last] = fillFrom(lastTable)(bars[last]);
  const filled = addMidFills(rng, bars, style, fillFrom(midTable), half);
  addAnticipations(
    rng,
    bars,
    style,
    backbeats,
    half < bars.length ? [...filled, half - 1] : filled
  );
  addCrossRhythm(rng, bars, style);
  return { bars, backbeats };
}

export interface GenerateOptions {
  /**
   * The style to write in, already resolved from the catalogue.
   *
   * A key would mean this module owning a style table, and styles are rows now
   * (D13). The caller looks one up — `getStyle()` on the server, the Studio's
   * catalogue in the browser — and the pattern records `key` and `versionId`
   * off it, which is how a break says which version of a style produced it.
   */
  style: ResolvedStyle;
  seed: number;
  bars: number;
  /** Kick density, 0–100. */
  density: number;
  /** Ghost notes, 0–100. */
  ghosts: number;
  meter?: string;
  /**
   * Which of the style's songs to write, by key — the Studio picks one first,
   * because the song decides the meter, tempo and kit it sets up. Without one,
   * a style that has songs picks among those in the meter, from the seed.
   */
  song?: string;
  voice?: 'hat' | 'ride';
  lanes?: LaneKey[];
  perc?: Partial<Record<PercLaneKey, string>>;
}

/**
 * The bars of a phrase built a kick cell at a time: a core bar, passes of it
 * a little varied, the Amen move late in the phrase and a closing fill.
 */
function cellPhrase(
  rng: Rng,
  style: Style,
  opts: GenerateOptions,
  m: Meter,
  lanes: LaneKey[],
  backbeats: number[]
): Bar[] {
  const groups = groupsOf(m);
  const lastGroup = groups[groups.length - 1];
  const core = genBar(rng, style, {
    density: opts.density,
    ghosts: opts.ghosts,
    backbeats,
    meter: m,
  });

  const bars: Bar[] = [];
  for (let i = 0; i < opts.bars; i++) {
    let b: Bar;
    if (i === 0) b = cloneBar(core);
    else if (i === opts.bars - 1 && opts.bars > 1) b = varyBar(rng, core, 0.5, style, m);
    else b = rng() < 0.55 ? cloneBar(core) : varyBar(rng, core, 0.25, style, m);
    bars.push(applyStyleRules(b, style));
  }

  // late-phrase displacement (the Amen move) and a closing fill
  if (opts.bars > 1) {
    const last = bars.length - 1;
    if (style.displace && rng() < style.displace) {
      const b = bars[last];
      const s = lastGroup.start;
      if (snareKept(b.s[s])) {
        const v = b.s[s];
        b.s[s] = 0;
        b.s[s - 1] = v;
      }
    }
    const fill = (bar: Bar): Bar => {
      const filled =
        style.fill === 'comp'
          ? applyStyleRules(applyCompFill(rng, bar, style, m), style)
          : applyStyleRules(applyFill(rng, bar, m, lanes, style.fillOrder), style);
      // A clave is the identity of the groove, not decoration a fill may write over.
      if (style.clave) {
        const n = filled.s.length;
        for (const x of backbeats) {
          if (x >= lastGroup.start && x < n) filled.s[x] = bbValue('s', style);
        }
      }
      return filled;
    };
    // a jazz phrase punctuates its ending less often than a backbeat groove fills it
    if (rng() < (style.fill === 'comp' ? 0.45 : 0.7)) bars[last] = fill(bars[last]);
    addMidFills(rng, bars, style, fill);
  }

  return bars;
}

/* Salts the song draw off the seed on a stream of its own, so the generator's
   stream, and with it every style without songs, is untouched by it. */
const SONG_SALT = 0x5f356495;

export function generatePattern(opts: GenerateOptions): Pattern {
  const params = opts.style.params;
  const named = songOf(params, opts.song);
  const meterKey = opts.meter ?? (named ? songMeter(params, named) : DEFAULT_METER);
  const song =
    named ??
    (params.songs ? pickSong(params, makeRng((opts.seed ^ SONG_SALT) >>> 0), meterKey) : undefined);
  const base = withSong(params, song?.key);
  const m = meterOf(meterKey);
  const style = styleIn(base, meterKey);
  const lanes = opts.lanes ?? laneRoster(style);
  const perc = opts.perc ?? percRoster(style);
  const rng = makeRng(opts.seed);
  const written = style.figures ? figurePhrase(rng, style, opts, m, lanes) : null;
  const backbeats = written?.backbeats ?? (style.backbeats ?? []).slice();
  const bars: Bar[] = written?.bars ?? cellPhrase(rng, style, opts, m, lanes, backbeats);

  const pat: Pattern = {
    name: '',
    style: opts.style.key,
    styleVersionId: opts.style.versionId,
    /* The snapshot is taken from the style as *written*, not as remapped into
       this meter: `styleIn` moves step positions around and none of the five
       attrs is a step position. Taking it off `style` would work today and
       silently start carrying remapped values the day one of them becomes
       positional. */
    attrs: styleAttrs(base),
    // only where there is one, so a pattern without stays the shape it was
    ...(song ? { song: song.key } : {}),
    meter: meterKey,
    voice: style.ride ? 'ride' : (opts.voice ?? 'hat'),
    lanes: lanes.slice(),
    perc: { ...perc },
    bbLane: bbLaneOf(style),
    hasRide: !!style.ride,
    hasHat: !!style.hat,
    seed: opts.seed,
    backbeats,
    pins: null,
    bars,
  };

  writePerc(pat, style, rng);
  if (pat.voice === 'ride') toRide(pat, rng);
  pat.name = nameBreak(rng);
  articulate(pat, style);
  fitHands(pat);
  return pat;
}

/** Which hand note goes first when a step asks for more than two: the time-keeping cymbals, then the quietest. */
const FIT_ORDER: LaneKey[] = ['h', 'r', 't1', 't2', 't3', 's', 'p2', 'p1', 'c'];

/** How loud a hand note is, for choosing what goes: 0 a ghost, 1 a hit, 2 an accent or a crash. */
function weightOf(lane: LaneKey, v: number): number {
  if (lane === 'c') return 2;
  if (lane === 's') return v === 1 ? 0 : v === 3 || v === RIMSHOT || v === FLAM ? 2 : 1;
  return v === 2 ? 2 : 1;
}

/**
 * Two hands, written last so nothing after it can undo it.
 *
 * A style layers its parts — hats, a backbeat, a ghost conversation, a bell or
 * a clave — and on some steps they add up to more than a drummer has hands for.
 * A player at the kit makes the same two calls every time, and so does this:
 *
 * - **a tom fill lifts the hand off the hats or the ride**: on a step with a
 *   tom, beside another tom, the time-keeping cymbal goes;
 * - **the bell keeps the time**: on a step that still needs three hands, the
 *   hand hats go first — the cowbell, cascara or block a Latin style writes is
 *   the right hand's time there — then the ride, then the quietest of what is
 *   left, the style's percussion figure outlasting a plain snare note. The
 *   backbeat never goes.
 *
 * Only the drummer's hands count: a tambourine or a shaker is a percussionist's
 * part (see `handLanes`). Nothing is added, and fitting a fitted pattern
 * changes nothing.
 */
export function fitHands(pat: Pattern): void {
  const lanes = handLanes(pat.perc);
  const tom = (b: Bar, j: number) => TOM_LANES.some((L) => !!b[L][j]);
  for (const b of pat.bars) {
    for (let i = 0; i < b.k.length; i++) {
      if (tom(b, i) && (tom(b, i - 1) || tom(b, i + 1))) {
        b.h[i] = 0;
        b.r[i] = 0;
      }
      let count = handsAt(b, i, lanes);
      if (count <= 2) continue;
      // the backbeat is what the bar is about: it is never the note that goes
      const backbeat = pat.backbeats.includes(i) ? pat.bbLane : null;
      const order = lanes
        .filter((L) => b[L][i] && L !== backbeat)
        .sort(
          (x, y) =>
            Number(y === 'h' || y === 'r') - Number(x === 'h' || x === 'r') ||
            weightOf(x, b[x][i]) - weightOf(y, b[y][i]) ||
            FIT_ORDER.indexOf(x) - FIT_ORDER.indexOf(y)
        );
      for (const L of order) {
        if (count <= 2) break;
        count -= handsOf(L, b[L][i]);
        b[L][i] = 0;
      }
    }
  }
}

/**
 * The articulations (9-iv), written last, from the style's five params.
 *
 * Some backbeats become rimshots and some open hats half-open ones; off the
 * backbeat, a snare accent may become a flam and a plain hit a drag or a buzz.
 * A flam or drag takes both hands, so the hand leaves the cymbal on that step,
 * as it does in a fill — otherwise the critic would rightly call it
 * unplayable.
 *
 * It draws from a stream of its own, and only runs when a param is set: the
 * main stream never sees it, so a style that sets none generates exactly the
 * bytes it did before, and setting one changes where the articulations go and
 * nothing else.
 */
export function articulate(pat: Pattern, style: Style): Pattern {
  const rim = style.rimshot ?? 0;
  const flam = style.flam ?? 0;
  const drag = style.drag ?? 0;
  const buzz = style.buzz ?? 0;
  const half = style.halfOpen ?? 0;
  if (!(rim || flam || drag || buzz || half)) return pat;

  const rng = makeRng((pat.seed ^ 0x2545f491) >>> 0);
  const freeHands = (b: Bar, i: number): void => {
    b.h[i] = 0;
    b.r[i] = 0;
    b.c[i] = 0;
    for (const L of TOM_LANES) b[L][i] = 0;
  };
  for (const b of pat.bars) {
    for (let i = 0; i < b.s.length; i++) {
      if (b.h[i] === 3 && rng() < half) b.h[i] = HALF_OPEN;
      const sv = b.s[i];
      if (pat.bbLane === 's' && pat.backbeats.includes(i)) {
        if ((sv === 2 || sv === 3) && rng() < rim) b.s[i] = RIMSHOT;
      } else if (sv === 3) {
        if (rng() < flam) {
          b.s[i] = FLAM;
          freeHands(b, i);
        }
      } else if (sv === 2) {
        const roll = rng();
        if (roll < drag) {
          b.s[i] = DRAG;
          freeHands(b, i);
        } else if (roll < drag + buzz) b.s[i] = BUZZ;
      }
    }
  }
  return pat;
}

/** B section: same skeleton, ride instead of hats, a touch more push. */
export function toRide(pat: Pattern, rng?: Rng): Pattern {
  // a style that wrote its own ride pattern has already said what the cymbal plays
  if (pat.hasRide) {
    pat.voice = 'ride';
    return pat;
  }
  const r = rng ?? makeRng(pat.seed ^ 0x5bf03635);
  const m = meterOfPat(pat);
  pat.voice = 'ride';

  pat.bars.forEach((b, bi) => {
    for (let i = 0; i < b.h.length; i++) {
      if (b.h[i]) {
        // ride on 8ths, with the bell on the pulse
        if (i % 2 === 0) b.r[i] = isGroupStart(m, i) && r() < 0.55 ? 2 : 1;
        b.h[i] = 0;
      }
    }
    if (bi === 0) b.c[0] = 1;
  });
  return pat;
}

/**
 * The B section of an arrangement, built from the A section.
 *
 * Takes the style because it writes new notes — varying bars, adding a kick,
 * dropping a ghost — and that needs the kick cells and weights the pattern's
 * own snapshot deliberately does not carry. Playing, scoring and exporting a
 * pattern need no style; changing one does.
 */
export function deriveB(patA: Pattern, style0: Style): Pattern {
  const rng = makeRng((patA.seed ^ 0x9e3779b9) >>> 0);
  const p = clonePattern(patA);
  const m = meterOfPat(p);
  const style = styleIn(withSong(style0, patA.song), p.meter);
  p.seed = (patA.seed ^ 0x9e3779b9) >>> 0;

  p.bars = p.bars.map((b, i) => {
    const n = b.k.length;
    const nb = i === 0 ? cloneBar(b) : varyBar(rng, b, 0.35, style, m);
    // choruses push harder: one more kick, one fewer ghost
    const banned = style.noKick ?? [];
    const cand = inMeter([2, 3, 6, 7, 10, 11], m).filter(
      (j) => j < n && !nb.k[j] && !snareKept(nb.s[j]) && !banned.includes(j)
    );
    if (cand.length) nb.k[cand[Math.floor(rng() * cand.length)]] = 1;
    const gs: number[] = [];
    for (let j = 0; j < n; j++) if (nb.s[j] === 1) gs.push(j);
    if (gs.length > 3) nb.s[gs[0]] = 0;
    return applyStyleRules(nb, style);
  });

  toRide(p, rng);
  fitHands(p);
  p.name = patA.name;
  return p;
}

const NAME_A = [
  'Broken',
  'Dusty',
  'Tight',
  'Loose',
  'Cold',
  'Warm',
  'Heavy',
  'Wired',
  'Late',
  'Rolling',
  'Crooked',
  'Blunt',
  'Sharp',
  'Quiet',
  'Stacked',
  'Greasy',
  'Flat',
  'Deep',
];
const NAME_B = [
  'Stairwell',
  'Basement',
  'Shuffle',
  'Telephone',
  'Copper',
  'Sidewalk',
  'Tape Loop',
  'Ballroom',
  'Freight',
  'Kitchen',
  'Backroom',
  'Carpet',
  'Streetlight',
  'Radiator',
  'Cellar',
  'Elevator',
  'Playground',
  'Fire Escape',
];

/**
 * A placeholder name, drawn from the same seed as the break.
 *
 * This is one of the three places a model is actually worth paying for —
 * naming a break from its own rhythm rather than from a word list.
 */
export function nameBreak(rng: Rng): string {
  return `${NAME_A[Math.floor(rng() * NAME_A.length)]} ${NAME_B[Math.floor(rng() * NAME_B.length)]}`;
}
