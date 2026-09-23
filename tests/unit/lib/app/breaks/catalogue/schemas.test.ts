import { describe, expect, it } from 'vitest';

import {
  kitParamsSchema,
  kitSamplesSchema,
  libraryEntrySchema,
  styleParamsSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { generatePattern } from '@/lib/app/breaks/generate';
import { critique, playability } from '@/lib/app/breaks/critic';
import { VOICE_KEYS } from '@/lib/app/breaks/kit';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { makeRng } from '@/lib/app/breaks/rng';
import type { Style } from '@/lib/app/breaks/types';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

/**
 * The catalogue schemas, and the thing they exist to make safe.
 *
 * While styles and kits were TypeScript constants the compiler was the
 * validation. They are rows now — written by an admin through a form, and by
 * users from D16 — and a row arrives as `Json`, which is `unknown` wearing a
 * hat. These schemas are what stands between that and the generator.
 *
 * Three jobs here:
 *
 * 1. **Parity.** A schema that has drifted from the type strips the field it
 *    does not know, silently, and the generator stops reading it.
 * 2. **The shipped data survives the round trip.** If the bounds were wrong,
 *    the 37 styles would be the first casualty and the symptom would be a
 *    picker one style short.
 * 3. **The property the phase promised**: random *valid* parameters never hang
 *    the generator, never produce NaN, and always terminate. That is what makes
 *    it safe to let somebody who is not us write a style.
 */

describe('styleParamsSchema', () => {
  it('accepts every shipped style, unchanged', () => {
    for (const [key, style] of Object.entries(STYLES)) {
      const parsed = styleParamsSchema.safeParse(style);
      expect(
        parsed.success,
        `${key}: ${parsed.success ? '' : parsed.error.issues[0]?.message}`
      ).toBe(true);
      /* Deep-equal on sorted keys, not `toEqual` on the raw objects: Zod
         returns fields in schema order, so a key-order difference would read
         as a change and hide a real one. What must hold is that nothing was
         dropped and nothing was coerced. */
      expect(sorted(parsed.success ? parsed.data : null)).toEqual(sorted(style));
    }
  });

  /**
   * The parity check, done the only way a runtime test can: every field any
   * shipped style actually uses must survive the parse.
   *
   * A type-level assertion would be stronger and is not available to a test —
   * but this catches the case that matters, which is a field added to `Style`
   * and to the table and forgotten here. Such a field is stripped on the way
   * out of the database, so the generator reads the old behaviour while the
   * admin form shows the new value.
   */
  it('knows every field the shipped styles use', () => {
    const used = new Set<string>();
    for (const style of Object.values(STYLES)) for (const k of Object.keys(style)) used.add(k);

    const parsed = styleParamsSchema.parse(STYLES.funk);
    const known = new Set(Object.keys(styleParamsSchema.shape));

    expect([...used].filter((field) => !known.has(field))).toEqual([]);
    expect(parsed).toBeDefined();
  });

  it.each([
    ['a negative weight', { kick1: [['1000', -1]] }],
    ['a non-finite weight', { kick1: [['1000', Number.POSITIVE_INFINITY]] }],
    ['a kick cell that is not four bits', { kick1: [['10', 1]] }],
    ['a step index off the end of any bar', { backbeats: [64] }],
    ['a tempo range the wrong way round', { bpm: [160, 90] }],
    ['a hat subdivision that is neither 8 nor 16', { hats: 12 }],
    ['an ostinato that never advances', { perc: [{ every: 0 }] }],
    ['a meter that does not exist', { meter: '13/13' }],
    ['a lane that does not exist', { backbeatLane: 'zz' }],
  ])('refuses %s', (_label, override) => {
    expect(styleParamsSchema.safeParse({ ...STYLES.funk, ...override }).success).toBe(false);
  });

  it('refuses a NaN weight, which is the one that hangs the picker rather than failing it', () => {
    /* `wpick` walks a running total against a random point in it. NaN makes
       every comparison false, so the walk falls off the end and returns
       undefined — and the caller indexes into it. This is the bound that is
       load-bearing rather than tidy. */
    expect(styleParamsSchema.safeParse({ ...STYLES.funk, ghostBias: NaN }).success).toBe(false);
    expect(styleParamsSchema.safeParse({ ...STYLES.funk, kick1: [['1000', NaN]] }).success).toBe(
      false
    );
  });
});

describe('kitParamsSchema', () => {
  it('accepts every shipped kit, unchanged', () => {
    for (const [key, kit] of Object.entries(KITS)) {
      const { label, hint, engine: _engine, credit, ...params } = kit;
      const parsed = kitParamsSchema.safeParse(params);
      expect(
        parsed.success,
        `${key}: ${parsed.success ? '' : parsed.error.issues[0]?.message}`
      ).toBe(true);
      expect(sorted(parsed.success ? parsed.data : null)).toEqual(sorted(params));
      expect(label && hint).toBeTruthy();
      expect(credit === undefined || typeof credit === 'string').toBe(true);
    }
  });

  /**
   * The seven voices are written out one by one in the schema rather than
   * spread from `VOICE_KEYS`, because a spread infers an index signature and a
   * parsed kit then stops being assignable to `Kit`. This is the check that
   * keeps the two lists together — adding a voice to `VOICE_KEYS` without
   * adding it here means a kit whose new voice is silently stripped.
   */
  it('names exactly the voices VOICE_KEYS does', () => {
    const inSchema = Object.keys(kitParamsSchema.shape).filter((k) => VOICE_KEYS.includes(k));
    expect(inSchema.sort()).toEqual([...VOICE_KEYS].sort());
  });

  it('refuses a sample file name that could climb out of its folder', () => {
    /* The URL is built as `/kits/<pack>/<file>`. A `..` or a leading slash here
       would reach outside the pack, and kit rows are admin-writable. */
    for (const file of ['../../etc/passwd', '/etc/passwd', 'a/b.mp3', 'k-0.mp3;rm']) {
      expect(kitSamplesSchema.safeParse({ slots: { k: { v: null, files: [file] } } }).success).toBe(
        false
      );
    }
    expect(
      kitSamplesSchema.safeParse({ slots: { k: { v: null, files: ['k-0.mp3'] } } }).success
    ).toBe(true);
  });
});

describe('libraryEntrySchema', () => {
  it('holds an entry to a meter that exists', () => {
    const base = {
      group: 'Funk and the breaks',
      title: 'Funky Drummer',
      artist: 'James Brown · Clyde Stubblefield, 1970',
      bpm: 94,
      styleKey: 'funk',
      meter: '4/4',
    };
    expect(libraryEntrySchema.safeParse(base).success).toBe(true);
    expect(libraryEntrySchema.safeParse({ ...base, meter: '13/13' }).success).toBe(false);
    expect(libraryEntrySchema.safeParse({ ...base, bpm: 9000 }).success).toBe(false);
  });
});

/**
 * The property test the phase promised.
 *
 * Random valid parameters, through the whole pipeline, with only one claim
 * being made: **the generator survives anything the schema lets through.** Not
 * that the result is good — a random style is not a style — but that it
 * terminates, throws nothing, and produces a pattern the rest of the app can
 * read.
 *
 * Until this holds, "users can author styles" (D16) is a denial of service
 * waiting for its first user. The bounds in the schema are the fix; this is the
 * check that the bounds are the *right* ones.
 */
describe('a random valid style never breaks the generator', () => {
  const RUNS = 200;

  it(`survives ${RUNS} random valid styles`, () => {
    for (let run = 0; run < RUNS; run++) {
      const rng = makeRng(run + 1);
      const params = randomStyle(rng);

      /* Through the schema first: the claim is about what the schema ADMITS,
         so a generated style the schema would refuse proves nothing. */
      const parsed = styleParamsSchema.safeParse(params);
      expect(parsed.success, `run ${run}: the generator ought to be fed valid input`).toBe(true);
      if (!parsed.success) continue;

      const meter = METER_KEYS[Math.floor(rng() * METER_KEYS.length)];
      const style = { key: `r${run}`, versionId: null, version: 1, params: parsed.data };

      const pattern = generatePattern({
        style,
        meter,
        seed: Math.floor(rng() * 0xffffffff),
        bars: 1 + Math.floor(rng() * 4),
        density: rng() * 100,
        ghosts: rng() * 100,
      });

      /* Terminated, and produced a bar of the right length with no NaN in it.
         A NaN step is the failure that survives generation and reappears in
         the engraver as a note drawn at `NaN` pixels. */
      expect(pattern.bars.length).toBeGreaterThan(0);
      for (const bar of pattern.bars) {
        for (const row of Object.values(bar)) {
          for (const v of row) expect(Number.isFinite(v)).toBe(true);
        }
      }

      // And the downstream readers survive it too.
      const score = critique(pattern, 100);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(() => playability(pattern, 100)).not.toThrow();
      expect(() =>
        buildMidi([{ pattern, barIdx: 0 }], {
          bpm: 100,
          swing: 50,
          feel: 50,
          hats: 100,
        })
      ).not.toThrow();
    }
  });
});

/**
 * The first thing the property test found, pinned on its own.
 *
 * `noKick: [20]` on a 16-step bar used to run `bar.k[20] = 0`, which does not
 * throw — it extends the lane array to length 21 and leaves holes at 16–19. A
 * bar with a hole reads `undefined` where a step should be, and `undefined`
 * reaches the engraver as a note drawn at NaN pixels and the transport as a
 * velocity of NaN. The fix is a bounds check in `applyKickRules`; this is the
 * case that says so, because the property test would only tell you that
 * *something* was wrong.
 *
 * A step index past the end of a bar is legal in a style: the schema bounds
 * them at 63 because a style is written in one meter and carried into others
 * by `styleIn`, and 15/8 is 30 steps. It is the WRITE that has to be bounded,
 * not the value.
 */
describe('a step index past the end of a bar', () => {
  it('is ignored rather than punching a hole in the lane', () => {
    const params = styleParamsSchema.parse({
      ...STYLES.funk,
      noKick: [20, 31],
      forceKick: [24],
      backbeats: [4, 12, 25],
      clave: true,
    });

    const pattern = generatePattern({
      style: { key: 'edge', versionId: null, version: 1, params },
      meter: '4/4',
      seed: 7,
      bars: 2,
      density: 60,
      ghosts: 60,
    });

    for (const bar of pattern.bars) {
      for (const [lane, row] of Object.entries(bar)) {
        expect(row, `${lane} is a bar's worth of steps`).toHaveLength(16);
        /* `Object.keys` counts only the slots that exist, so this is the check
           that catches a hole — `toHaveLength` alone would pass on a sparse
           array of the right length. */
        expect(Object.keys(row)).toHaveLength(16);
      }
    }
  });
});

/* ---- helpers -------------------------------------------------------- */

/**
 * A style drawn at random from inside the schema's bounds.
 *
 * Deliberately hostile within the rules: weights at zero, empty step lists,
 * every optional present. The point is the corners a hand-written style never
 * visits, not a plausible groove.
 */
function randomStyle(rng: () => number): Style {
  const pick = <T>(list: T[]): T => list[Math.floor(rng() * list.length)];
  const steps = (n: number): number[] => Array.from({ length: n }, () => Math.floor(rng() * 32));
  const cells = (): Array<[string, number]> =>
    Array.from({ length: 1 + Math.floor(rng() * 6) }, () => [
      Array.from({ length: 4 }, () => (rng() < 0.5 ? '0' : '1')).join(''),
      /* Zero is legal and is the interesting one: a table of all-zero weights
         gives `wpick` nothing to pick, and it has to cope rather than hang. */
      rng() < 0.2 ? 0 : rng() * 10,
    ]);

  return {
    label: `Random ${Math.floor(rng() * 1000)}`,
    hint: 'Generated by the property test.',
    hats: pick([8, 16]),
    bpm: [60, 180],
    swing: rng() * 100,
    ghostBias: rng() * 4,
    opens: Math.floor(rng() * 32),
    kick1: cells(),
    kick: cells(),
    backbeats: steps(Math.floor(rng() * 5)),
    snareGhosts: steps(Math.floor(rng() * 8)),
    openSlots: steps(Math.floor(rng() * 4)),
    noKick: steps(Math.floor(rng() * 4)),
    forceKick: steps(Math.floor(rng() * 4)),
    foot: steps(Math.floor(rng() * 4)),
    ghostWeights: Object.fromEntries(steps(4).map((s) => [s, rng() * 5])),
    ghostHit: rng(),
    targetDensity: rng() * 64,
    hatDepth: rng() * 3,
    kickFeather: rng(),
    displace: rng(),
    toms: rng() < 0.5,
    linear: rng() < 0.5,
    clave: rng() < 0.3,
    crossStick: rng() < 0.3,
    fill: rng() < 0.3 ? 'comp' : undefined,
    fillComps: Math.floor(rng() * 16),
    perc: [{ every: 1 + Math.floor(rng() * 8), accentPulse: rng() < 0.5, drop: rng() }],
  };
}

function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, sorted(x)])
    );
  }
  return v;
}
