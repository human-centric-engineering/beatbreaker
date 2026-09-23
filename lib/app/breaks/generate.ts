import {
  FOOT_LANE,
  TOM_LANES,
  bbLaneOf,
  bbValue,
  laneRoster,
  percRoster,
  snareKept,
} from '@/lib/app/breaks/lanes';
import {
  DEFAULT_METER,
  M44,
  groupsOf,
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
  writePerc,
} from '@/lib/app/breaks/pattern';
import { clamp, makeRng, wpick, type Rng } from '@/lib/app/breaks/rng';
import { styleIn } from '@/lib/app/breaks/styles';
import type {
  Bar,
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
  if (hasBackbeat && cell[0] === '1' && rng() > 0.34) cell = `0${cell.slice(1)}`;
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
        const nudge = m.sub === 2 ? 2 : 1;
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
export function applyFill(rng: Rng, bar: Bar, m: Meter, lanes: LaneKey[]): Bar {
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
  for (let o = 0; o < size; o += m.sub === 2 ? 2 : 1) pos.push(o);
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

  // With toms in the kit the tail of the fill comes off the snare and goes round them.
  const toms = TOM_LANES.filter((lane) => lanes.includes(lane));
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
  voice?: 'hat' | 'ride';
  lanes?: LaneKey[];
  perc?: Partial<Record<PercLaneKey, string>>;
}

export function generatePattern(opts: GenerateOptions): Pattern {
  const meterKey = opts.meter ?? DEFAULT_METER;
  const m = meterOf(meterKey);
  const style = styleIn(opts.style.params, meterKey);
  const lanes = opts.lanes ?? laneRoster(style);
  const perc = opts.perc ?? percRoster(style);
  const rng = makeRng(opts.seed);
  const backbeats = (style.backbeats ?? []).slice();
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
    // a jazz phrase punctuates its ending less often than a backbeat groove fills it
    if (rng() < (style.fill === 'comp' ? 0.45 : 0.7)) {
      const filled =
        style.fill === 'comp'
          ? applyStyleRules(applyCompFill(rng, bars[last], style, m), style)
          : applyStyleRules(applyFill(rng, bars[last], m, lanes), style);
      // A clave is the identity of the groove, not decoration a fill may write over.
      if (style.clave) {
        const n = filled.s.length;
        for (const x of backbeats) {
          if (x >= lastGroup.start && x < n) filled.s[x] = bbValue('s', style);
        }
      }
      bars[last] = filled;
    }
  }

  const pat: Pattern = {
    name: '',
    style: opts.style.key,
    styleVersionId: opts.style.versionId,
    /* The snapshot is taken from the style as *written*, not as remapped into
       this meter: `styleIn` moves step positions around and none of the five
       attrs is a step position. Taking it off `style` would work today and
       silently start carrying remapped values the day one of them becomes
       positional. */
    attrs: styleAttrs(opts.style.params),
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
  const style = styleIn(style0, p.meter);
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
