import { type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { groupsOf } from '@/lib/app/breaks/meter';
import { clonePattern, keptSticking, meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import { makeRng, type Rng, wpick } from '@/lib/app/breaks/rng';
import { lettersOf, type Sections } from '@/lib/app/breaks/sections';
import { writePart } from '@/lib/app/breaks/song-break';
import { songOf } from '@/lib/app/breaks/songs';
import type { LaneKey, Pattern, ResolvedStyle } from '@/lib/app/breaks/types';

/**
 * Creativity: how far a new break may stray from the song or the style it is
 * written in.
 *
 * The break is always written faithfully first, the way every New has been —
 * the song's figures, the style's kick cells, the best of sixteen. Creativity
 * is then a twist laid over that break, chosen by how far the slider is
 * pushed: nothing at the bottom, a move a drummer might make on the night in
 * the middle, and at the top another drummer's hands or feet and a rhythmic
 * idea on top of them. Whatever the twist, **the kick or the snare of the
 * original is kept** — the backbone that makes it still that song — and the
 * twist says in words what it changed and what it kept, so a drummer knows
 * what they are hearing.
 *
 * Pure and seeded: the same break, slider and seed give the same twist.
 */

export type CreativeBandId = 'faithful' | 'inspired' | 'adventurous' | 'experimental';

export interface CreativeBand {
  id: CreativeBandId;
  /** The top of the band, inclusive. */
  upTo: number;
  label: string;
  /** What a break at this setting is, for the slider's read-out. */
  blurb: string;
}

export const CREATIVE_BANDS: readonly CreativeBand[] = [
  {
    id: 'faithful',
    upTo: 24,
    label: 'Faithful',
    blurb: 'As close to the song and the style as it can write: their own figures, nothing added.',
  },
  {
    id: 'inspired',
    upTo: 49,
    label: 'Inspired',
    blurb:
      'The song, with one move a drummer might make on the night — more ghosts, a fill, open hats.',
  },
  {
    id: 'adventurous',
    upTo: 74,
    label: 'Adventurous',
    blurb:
      'One bold idea: a kindred drummer’s cymbal part, half-time, a displaced ride, toms for hats.',
  },
  {
    id: 'experimental',
    upTo: 100,
    label: 'Experimental',
    blurb:
      'Another drummer’s hands or feet from a different world, and a rhythmic idea on top — only the backbone kept.',
  },
];

export const DEFAULT_CREATIVITY = 15;

export function creativeBand(creativity: number): CreativeBand {
  const n = Math.max(0, Math.min(100, Math.round(creativity)));
  return CREATIVE_BANDS.find((b) => n <= b.upTo) ?? CREATIVE_BANDS[CREATIVE_BANDS.length - 1];
}

/** What a twist did to the break, in words, for the stage. */
export interface Twist {
  band: CreativeBandId;
  /** A few words for a chip: "Elvin Jones's ride · displaced". */
  title: string;
  /** What changed, a phrase each: "Elvin Jones's ride part over the top". */
  changed: string[];
  /** What of the original it kept: "the kick and snare of Master of Puppets". */
  kept: string;
  /** The style borrowed from, where one was. */
  from?: string;
}

/** A style as creativity reads it: resolved, and the shelf it is filed on. */
export type CreativeStyle = ResolvedStyle & { group?: string };

export interface CreativeOptions {
  /** The break as written faithfully. */
  sections: Sections;
  /** The style it was written in. */
  style: CreativeStyle;
  /** Every style there is, to borrow from. */
  styles: Record<string, CreativeStyle>;
  /** 0–100. */
  creativity: number;
  seed: number;
  /** What the donor's part is written with, as the break was. */
  density: number;
  ghosts: number;
  bpm: number;
}

export interface CreativeBreak {
  sections: Sections;
  /** Null when nothing was changed: Faithful, or a break no twist fits. */
  twist: Twist | null;
}

/* ---- the moves ------------------------------------------------------- */

/** What of the groove a move rewrites. Kick or snare must come through untouched. */
type Part = 'kick' | 'snare' | 'cymbals';

interface Move {
  id: string;
  touches: Part;
  /** The phrase for `changed`. */
  says: (pat: Pattern) => string;
  /** A few words for the chip. */
  short: string;
  fits: (pat: Pattern) => boolean;
  /** Writes a new part over the one there, rather than reshaping it: never over a borrowed part. */
  replaces?: boolean;
  /** Rewrite the pattern in place. */
  apply: (pat: Pattern, rng: Rng) => void;
}

function hitsIn(pat: Pattern, lane: LaneKey): number {
  return pat.bars.reduce((n, b) => n + b[lane].filter(Boolean).length, 0);
}

/**
 * The lane carrying the ostinato: whichever of the hats and the ride plays
 * more. Read off the notes, not `voice` — a section of a song can move to the
 * ride for its chorus while the pattern still names the hats.
 */
function cymbalLane(pat: Pattern): LaneKey {
  return hitsIn(pat, 'r') > hitsIn(pat, 'h') ? 'r' : 'h';
}

function cymbalName(pat: Pattern): string {
  return cymbalLane(pat) === 'r' ? 'ride' : 'hi-hat';
}

/** A sixteenth-grid bar of 4/4: where half-time and a few others make sense as written. */
function isCommonTime(pat: Pattern): boolean {
  const m = meterOfPat(pat);
  return m.num === 4 && m.den === 4 && m.sub === 4 && patSteps(pat) === 16;
}

const STEP_WORDS: Record<number, string> = {
  1: 'a sixteenth',
  2: 'an eighth',
  3: 'three sixteenths',
};

function displace(by: number): Move {
  return {
    id: `displace-${by}`,
    touches: 'cymbals',
    short: 'displaced cymbal',
    says: (pat) => `the ${cymbalName(pat)} part displaced by ${STEP_WORDS[by]}`,
    fits: (pat) => hitsIn(pat, cymbalLane(pat)) >= 4 * pat.bars.length,
    apply: (pat) => {
      const L = cymbalLane(pat);
      for (const b of pat.bars) {
        const n = b[L].length;
        const was = b[L].slice();
        for (let i = 0; i < n; i++) b[L][i] = was[(i - by + n) % n];
      }
    },
  };
}

/** Dotted eighths across the bar line: three against four, round every three bars. */
const crossCymbal: Move = {
  id: 'three-over-four',
  touches: 'cymbals',
  short: '3 over 4',
  replaces: true,
  says: (pat) =>
    `dotted eighths on the ${cymbalName(pat)} — three against four, coming round every three bars`,
  fits: (pat) => isCommonTime(pat),
  apply: (pat) => {
    const L = cymbalLane(pat);
    const steps = patSteps(pat);
    pat.bars.forEach((b, bi) => {
      for (let i = 0; i < steps; i++) {
        const g = bi * steps + i;
        // the bell (or an accent) where the cycle starts again
        b[L][i] = g % 3 ? 0 : g % 12 === 0 ? 2 : 1;
      }
    });
  },
};

const halfTime: Move = {
  id: 'half-time',
  touches: 'snare',
  short: 'half-time',
  says: () => 'half-time — the backbeat moved to beat 3',
  fits: (pat) =>
    isCommonTime(pat) &&
    pat.bbLane === 's' &&
    pat.backbeats.includes(4) &&
    pat.backbeats.includes(12) &&
    pat.bars.some((b) => b.s[4] >= 2 || b.s[12] >= 2),
  apply: (pat) => {
    for (const b of pat.bars) {
      for (const at of [4, 12]) if (b.s[at] >= 2) b.s[at] = 0;
      b.s[8] = 3;
    }
    pat.backbeats = [8];
  },
};

/** The hat part on the floor tom, the left foot keeping time: Copeland, Bonham, a tribal feel. */
const tomGroove: Move = {
  id: 'toms-for-hats',
  touches: 'cymbals',
  short: 'toms for hats',
  says: () => 'the hi-hat part moved onto the floor tom, the left foot keeping time on the hats',
  fits: (pat) => cymbalLane(pat) === 'h' && hitsIn(pat, 'h') >= 4 * pat.bars.length,
  apply: (pat) => {
    const groups = groupsOf(meterOfPat(pat));
    for (const b of pat.bars) {
      for (let i = 0; i < b.h.length; i++) {
        if (b.h[i]) b.t3[i] = b.h[i] === 2 ? 2 : 1;
        b.h[i] = 0;
      }
      for (const g of groups) if (g.start < b.hf.length) b.hf[g.start] = 1;
    }
    for (const L of ['t1', 't2', 't3', 'hf'] as const)
      if (!pat.lanes.includes(L)) pat.lanes.push(L);
  },
};

/** Linear: the cymbals step out of the way of every kick and snare. */
const linear: Move = {
  id: 'linear',
  touches: 'cymbals',
  short: 'linear',
  says: () => 'played linear — the cymbals step out of the way of every kick and snare',
  fits: (pat) => {
    const L = cymbalLane(pat);
    let clashes = 0;
    for (const b of pat.bars)
      for (let i = 0; i < b[L].length; i++) if (b[L][i] && (b.k[i] || b.s[i] >= 2)) clashes++;
    return clashes >= 3;
  },
  apply: (pat) => {
    const L = cymbalLane(pat);
    for (const b of pat.bars)
      for (let i = 0; i < b[L].length; i++) if (b.k[i] || b.s[i] >= 2) b[L][i] = 0;
  },
};

/** Lay a donor's part over a section, bar for bar (round again where it is shorter). */
function layBorrowed(pat: Pattern, donor: Pattern, part: 'cymbals' | 'kick'): void {
  const lanes: LaneKey[] = part === 'kick' ? ['k'] : ['h', 'r'];
  if (donor.lanes.includes('hf')) lanes.push('hf');
  pat.bars.forEach((b, bi) => {
    const from = donor.bars[bi % donor.bars.length];
    for (const L of lanes) {
      const row = from[L];
      for (let i = 0; i < b[L].length; i++) b[L][i] = row[i] ?? 0;
    }
  });
  if (part === 'cymbals') {
    pat.voice = donor.voice;
    pat.hasHat = donor.hasHat;
    pat.hasRide = donor.hasRide;
  }
  if (lanes.includes('hf') && !pat.lanes.includes('hf')) pat.lanes.push('hf');
}

const INSPIRED: Array<{
  move: DoctorMove;
  says: string;
  short: string;
  fits?: (p: Pattern) => boolean;
}> = [
  { move: 'ghosts+', says: 'more ghost notes between the backbeats', short: 'more ghosts' },
  {
    move: 'opens',
    says: 'an open hat lifting each bar',
    short: 'open hats',
    fits: (p) => p.voice === 'hat',
  },
  { move: 'kick+', says: 'a busier kick', short: 'busier kick' },
  { move: 'push', says: 'the last backbeat pushed a sixteenth early', short: 'pushed backbeat' },
  { move: 'fill', says: 'a fill to end the phrase', short: 'a fill' },
  { move: 'swap', says: 'the cymbal part moved between hats and ride', short: 'hats ↔ ride' },
];

/* ---- choosing ---------------------------------------------------------- */

/** Where the twist cannot reach: a rudiment or a polyrhythm is its own exercise, and pins, poly fills and tuplets are written by hand. */
function untouchable(pat: Pattern): boolean {
  return !!(pat.fixed || pat.poly || pat.polySpans?.length || pat.tuplets?.length || pat.pins);
}

/** Someone to borrow from: kindred (same shelf) or from somewhere else entirely, drummers first. */
function pickDonor(
  rng: Rng,
  styles: Record<string, CreativeStyle>,
  source: CreativeStyle,
  kindred: boolean
): CreativeStyle | null {
  const pool = Object.values(styles).filter(
    (s) =>
      s.key !== source.key &&
      !!s.params &&
      (kindred ? s.group === source.group : s.group !== source.group)
  );
  if (!pool.length) return kindred ? pickDonor(rng, styles, source, false) : null;
  return wpick(
    rng,
    pool.map((s): [CreativeStyle, number] => [s, s.params.drummer ? 3 : 1])
  );
}

/** The donor's part for each section, in that section's meter and bars; none where it will not write. */
function donorParts(o: CreativeOptions, donor: CreativeStyle, rng: Rng): Pattern[] | null {
  const out: Pattern[] = [];
  for (const L of lettersOf(o.sections)) {
    const pat = o.sections[L];
    if (!pat) continue;
    try {
      out.push(
        writePart({
          style: donor,
          song: undefined,
          meter: pat.meter,
          bars: pat.bars.length,
          density: o.density,
          ghosts: o.ghosts,
          seed: Math.floor(rng() * 0xffffffff),
          bpm: o.bpm,
          exact: true,
        }).pattern
      );
    } catch {
      return null;
    }
  }
  return out;
}

/** What the original kept, in words, from the parts left alone. */
function keptPhrase(touched: Set<Part>, source: string): string {
  const parts: string[] = [];
  if (!touched.has('kick')) parts.push('kick');
  if (!touched.has('snare')) parts.push('snare');
  if (!touched.has('cymbals')) parts.push('cymbal part');
  const list =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return parts.length === 3 ? `everything else of ${source}` : `the ${list} of ${source}`;
}

/** The song the break was written from, else its style, as a drummer would name it. */
function sourceName(o: CreativeOptions): string {
  const song = songOf(o.style.params, o.sections.A.song);
  return song ? song.title : o.style.params.label;
}

/** A clone of every section, for writing a twist into. */
function cloneSections(sections: Sections): Sections {
  const out: Partial<Record<keyof Sections, Pattern>> = {};
  for (const L of lettersOf(sections)) {
    const pat = sections[L];
    if (pat) out[L] = clonePattern(pat);
  }
  const { A, B } = out;
  if (!A || !B) return sections;
  return { ...out, A, B };
}

/** The seed, stirred: neighbouring seeds would otherwise open on the same few draws. */
function mix(seed: number): number {
  let h = Math.imul((seed ^ 0x5bd1e995) >>> 0, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function creativeBreak(o: CreativeOptions): CreativeBreak {
  const band = creativeBand(o.creativity);
  const pats = lettersOf(o.sections)
    .map((L) => o.sections[L])
    .filter((p): p is Pattern => !!p);
  if (band.id === 'faithful' || pats.some(untouchable))
    return { sections: o.sections, twist: null };

  const rng = makeRng(mix(o.seed));
  const source = sourceName(o);
  const out = cloneSections(o.sections);
  const outPats = lettersOf(out)
    .map((L) => out[L])
    .filter((p): p is Pattern => !!p);

  if (band.id === 'inspired') {
    const choices = INSPIRED.filter((m) => pats.every((p) => !m.fits || m.fits(p)));
    const pick = choices[Math.floor(rng() * choices.length)];
    if (!pick) return { sections: o.sections, twist: null };
    const entropy = Math.floor(rng() * 0xffffffff);
    const done = cloneSections(o.sections);
    for (const L of lettersOf(done)) {
      const pat = o.sections[L];
      if (pat) done[L] = doctor(pat, o.style.params, pick.move, entropy);
    }
    return {
      sections: done,
      twist: {
        band: band.id,
        title: pick.short,
        changed: [pick.says],
        kept: `everything else of ${source}`,
      },
    };
  }

  const rhythmic: Array<[Move, number]> = [
    [displace(2), 2],
    [crossCymbal, 2],
    [halfTime, 2],
    [tomGroove, 1.5],
    [linear, 1],
  ];
  const touched = new Set<Part>();
  /** Parts a move has already reshaped: each is reshaped once, so the ideas stay audible. */
  const reshaped = new Set<Part>();
  const changed: string[] = [];
  const shorts: string[] = [];
  let from: string | undefined;

  /* A move goes where it fits — a song's sections differ, a chorus on the
     ride, a bridge with no backbeat — so long as that is the main groove and
     at least half the break: what the twist says has to be what you hear. */
  const fitsBreak = (m: Move) => {
    const n = outPats.filter((p) => m.fits(p)).length;
    return m.fits(outPats[0]) && n * 2 >= outPats.length;
  };
  /** Take one of `moves` that fits and leaves the kick or the snare alone; null if none can. */
  const take = (moves: Array<[Move, number]>, loose = false): Move | null => {
    const ok = moves.filter(([m]) => {
      if (!(loose ? m.fits(outPats[0]) : fitsBreak(m))) return false;
      if (reshaped.has(m.touches) || (m.replaces && touched.has(m.touches))) return false;
      const after = new Set(touched).add(m.touches);
      return !(after.has('kick') && after.has('snare'));
    });
    if (!ok.length) return null;
    return wpick(rng, ok);
  };
  const run = (m: Move) => {
    for (const pat of outPats) if (m.fits(pat)) m.apply(pat, rng);
    touched.add(m.touches);
    reshaped.add(m.touches);
    changed.push(m.says(outPats[0]));
    shorts.push(m.short);
  };

  /* Adventurous borrows from a kindred drummer, or plays it another way;
     Experimental always borrows, from further afield, and plays it another
     way on top — twice over at the very top of the slider. */
  const borrowing = band.id === 'experimental' || rng() < 0.45;
  if (borrowing) {
    const donor = pickDonor(rng, o.styles, o.style, band.id === 'adventurous');
    const parts = donor ? donorParts(o, donor, rng) : null;
    if (donor && parts && parts.length === outPats.length) {
      const part: 'cymbals' | 'kick' =
        // the far end keeps the kick free less often, leaving room for one more idea on the hands
        band.id === 'experimental' && rng() < (o.creativity >= 90 ? 0.2 : 0.4) ? 'kick' : 'cymbals';
      // a drummer's own part, or a genre's: "Elvin Jones's ride part", "a ride part from Bossa nova"
      const label = donor.params.label;
      const own = !!donor.params.drummer;
      const what = part === 'kick' ? 'kick drum' : `${cymbalName(parts[0])} part`;
      outPats.forEach((pat, i) => layBorrowed(pat, parts[i], part));
      touched.add(part);
      changed.push(
        `${own ? `${label}’s ${what}` : `a ${what} from ${label}`} ${part === 'kick' ? 'under it' : 'over the top'}`
      );
      shorts.push(`${label}${own ? '’s' : ''} ${part === 'kick' ? 'kick' : 'hands'}`);
      from = donor.key;
    }
  }
  const extra = band.id === 'experimental' ? (o.creativity >= 90 ? 2 : 1) : touched.size ? 0 : 1;
  for (let n = 0; n < extra; n++) {
    const pool: Array<[Move, number]> = [
      ...rhythmic.filter(([m]) => !shorts.includes(m.short)),
      // the far end of the slider reaches for the stranger displacements
      ...(band.id === 'experimental'
        ? ([
            [displace(1), 2],
            [displace(3), 1.5],
          ] as Array<[Move, number]>)
        : []),
    ];
    // Experimental always plays it another way: in the main groove alone, if nowhere else
    const m = take(pool) ?? (band.id === 'experimental' ? take(pool, true) : null);
    if (m) run(m);
  }

  if (!changed.length) return { sections: o.sections, twist: null };
  // hands written for the notes the twist moved no longer fit them
  for (const L of lettersOf(out)) {
    const was = o.sections[L];
    const now = out[L];
    if (was && now) now.sticking = keptSticking(was, now);
  }
  return {
    sections: out,
    twist: {
      band: band.id,
      title: shorts.join(' · '),
      changed,
      kept: keptPhrase(touched, source),
      ...(from ? { from } : {}),
    },
  };
}
