import type { Pattern } from '@/lib/app/breaks/types';

/**
 * A break's sections (11-e-ii): A to Z, each a pattern in its own meter.
 *
 * **A and B are always there.** Every share code since v1 carries both, every
 * stored `Break.doc` has both, and half the app (the famous-break B, Build B
 * from A, the community grid) was written for two. Sections C to Z are added
 * beside them, so a break with only A and B is the break it always was —
 * byte for byte on the wire (see `breakPayload`).
 *
 * **Letters are kept, not renumbered.** Deleting C from `ABCD` leaves `ABD`:
 * an arrangement names its sections by letter, and a letter that moved under
 * it would play a different section.
 */

export const SECTION_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
] as const;

export type SectionLetter = (typeof SECTION_LETTERS)[number];

/** The sections past the two every break has. */
export type ExtraLetter = Exclude<SectionLetter, 'A' | 'B'>;

export const EXTRA_LETTERS = SECTION_LETTERS.slice(2) as ExtraLetter[];

/**
 * The most bars a whole break holds, every section counted once (not once per
 * time the arrangement plays it).
 *
 * Set by the records: a song is written as the drummer played it, every
 * passage that differs a section of its own, so a long song with a written
 * intro, solos and an outro needs a hundred-odd distinct bars (26 sections of
 * eight would be 208). The share code is the break, and a bar of 4/4 with
 * every lane written is about 310 characters of link: 128 such bars is about
 * 40 KB at the very worst, which a link's fragment carries (it is never sent
 * to a server) and a paste box takes. Real bars are mostly rests, and far
 * shorter.
 */
export const MAX_BREAK_BARS = 128;

/**
 * The most slots an arrangement has: enough to play a record's sections in
 * its order, intro to outro, where a six-minute song in two-bar sections is
 * ninety-odd. A slot is one letter on the wire, so this costs a link a few
 * hundred characters at most, not bars.
 */
export const MAX_ARRANGEMENT = 128;

/** Every section a break has, keyed by letter. A and B are always among them. */
export type Sections<P = Pattern> = { A: P; B: P } & Partial<Record<ExtraLetter, P>>;

/** Sections that may still be loading — the Studio's state before its first break. */
export type MaybeSections = Partial<Record<SectionLetter, Pattern | null>>;

export function isSectionLetter(v: unknown): v is SectionLetter {
  return typeof v === 'string' && (SECTION_LETTERS as readonly string[]).includes(v);
}

/** The letters a set of sections holds, in alphabetical order. */
export function lettersOf(sections: MaybeSections): SectionLetter[] {
  return SECTION_LETTERS.filter((L) => !!sections[L]);
}

/** The sections a set holds, in alphabetical order — A, B, then any others. */
export function patternsOf(sections: MaybeSections): Pattern[] {
  return SECTION_LETTERS.flatMap((L) => {
    const p = sections[L];
    return p ? [p] : [];
  });
}

/** Whether any section past B is there. */
export function hasExtraSections(sections: MaybeSections): boolean {
  return EXTRA_LETTERS.some((L) => !!sections[L]);
}

/** Bars across every section, each counted once. */
export function totalBars(sections: MaybeSections): number {
  return patternsOf(sections).reduce((n, p) => n + p.bars.length, 0);
}

/** The first letter not yet used, or null when all 26 are. */
export function nextLetter(sections: MaybeSections): SectionLetter | null {
  return SECTION_LETTERS.find((L) => !sections[L]) ?? null;
}

/**
 * The letter after `letter` among those present, wrapping round — what a
 * tap on an arrangement slot moves it to.
 */
export function cycleLetter(sections: MaybeSections, letter: SectionLetter): SectionLetter {
  const have = lettersOf(sections);
  if (!have.length) return letter;
  const at = have.indexOf(letter);
  return have[(at + 1) % have.length];
}

/**
 * How fast a section plays against the break's tempo: half or double
 * (11-e-ii-g), and the metric modulations (12-d) — ×3/2, the old triplet
 * become the new beat; ×4/3, the old dotted eighth; and their inverses, the
 * way back. A break has one tempo — the slider, the trainer's ramp, a speed
 * record are all one number — and a section at ×2 plays at twice it, as
 * Landlord's fast section plays at twice its slow one. ×1 is not written: a
 * pattern without a ratio plays at the break's tempo, as every pattern did.
 *
 * Those are the ratios the Studio offers ({@link TEMPO_RATIOS}). A record's
 * own tempo map is not held to them: a passage that goes from 150 to 160 is
 * ×16/15, and a song in sections names it so. Any ratio from
 * {@link MIN_TEMPO_RATIO} to {@link MAX_TEMPO_RATIO} is one; a share code
 * carries one off the list from version 9.
 *
 * The thirds are written as the doubles JavaScript makes of `2 / 3` and
 * `4 / 3` — the same numbers, `===` them. JSON carries any double exactly, so
 * a ratio read back off the wire is the number written.
 */
export const TWO_THIRDS = 0.6666666666666666;
export const FOUR_THIRDS = 1.3333333333333333;
export const TEMPO_RATIOS = [0.5, TWO_THIRDS, 0.75, FOUR_THIRDS, 1.5, 2] as const;

/** The slowest and the fastest a section plays against the break: two octaves of tempo. */
export const MIN_TEMPO_RATIO = 0.25;
export const MAX_TEMPO_RATIO = 4;

/** A section's ratio to the break's tempo; every way in (the wire, the catalogue, BeatBuddy) checks with {@link isTempoRatio}. */
export type TempoRatio = number;

/** The ratios a v7 code could carry: half and double. The rest need v8 (12-d). */
export const V7_TEMPO_RATIOS: readonly number[] = [0.5, 2];

/** Whether a number is a tempo ratio: within the range, and not ×1, which is written as none. */
export function isTempoRatio(r: unknown): r is TempoRatio {
  return (
    typeof r === 'number' &&
    Number.isFinite(r) &&
    r !== 1 &&
    r >= MIN_TEMPO_RATIO &&
    r <= MAX_TEMPO_RATIO
  );
}

/**
 * The widest a break's ratios spread, fastest over slowest, with the break's
 * own tempo (×1) counted in: two octaves. Every section plays between the
 * Studio's floor and top (50 and 380), so a spread past 380 / 50 leaves no
 * tempo at all — a section at ×¼ beside one at ×2 would need 200 or more and
 * 190 or less. At four or under there is always one: the slowest section is
 * never held above 200, nor the fastest below 95.
 */
export const MAX_RATIO_SPREAD = 4;

/** Whether sections at these ratios leave the break a tempo ({@link MAX_RATIO_SPREAD}); absent is ×1. */
export function ratiosFit(ratios: readonly (TempoRatio | undefined)[]): boolean {
  const all = [1, ...ratios.map((r) => r ?? 1)];
  return Math.max(...all) / Math.min(...all) <= MAX_RATIO_SPREAD;
}

/** Whether a ratio is one the Studio offers ({@link TEMPO_RATIOS}), which a v8 code carries. */
export function isOfferedRatio(r: unknown): boolean {
  return typeof r === 'number' && (TEMPO_RATIOS as readonly number[]).includes(r);
}

/** A section's ratio: its own, else 1. */
export function ratioOf(p: { tempoRatio?: TempoRatio } | null | undefined): TempoRatio {
  return p?.tempoRatio ?? 1;
}

/** The tempo a section plays at, under the break's. */
export function sectionBpm(bpm: number, p: { tempoRatio?: TempoRatio } | null | undefined): number {
  return bpm * ratioOf(p);
}

/** Whether any section plays at a ratio of the break's tempo. */
export function hasTempoRatios(sections: MaybeSections): boolean {
  return patternsOf(sections).some((p) => !!p.tempoRatio);
}

/** Whether any section plays at a metric modulation's ratio, which needs wire v8 (12-d). */
export function hasModulations(sections: MaybeSections): boolean {
  return patternsOf(sections).some(
    (p) => !!p.tempoRatio && !V7_TEMPO_RATIOS.includes(p.tempoRatio)
  );
}

/** Whether any section plays at a ratio the Studio does not offer — a record's own — which needs wire v9. */
export function hasRecordRatios(sections: MaybeSections): boolean {
  return patternsOf(sections).some((p) => !!p.tempoRatio && !isOfferedRatio(p.tempoRatio));
}

/** How a ratio reads as a fraction: `½`, `2/3`, `3/2`. */
const RATIO_FACES: Record<string, string> = {
  [String(0.5)]: '½',
  [String(TWO_THIRDS)]: '⅔',
  [String(0.75)]: '¾',
  [String(FOUR_THIRDS)]: '4/3',
  [String(1.5)]: '3/2',
};

/** A ratio as the smallest fraction it is, up to a denominator of 32, else to two places. */
function fractionOf(r: number): string {
  for (let q = 1; q <= 32; q++) {
    const p = Math.round(r * q);
    if (Math.abs(p / q - r) < 1e-9) return q === 1 ? String(p) : `${p}/${q}`;
  }
  return String(Math.round(r * 100) / 100);
}

/** How a ratio reads beside a section's letter: `×2`, `×½`, `×3/2`, `×16/15`. */
export function ratioLabel(r: number): string {
  return `×${RATIO_FACES[String(r)] ?? fractionOf(r)}`;
}
