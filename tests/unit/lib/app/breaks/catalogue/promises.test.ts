import { describe, expect, it } from 'vitest';

import { critique, playability } from '@/lib/app/breaks/critic';
import { doctor } from '@/lib/app/breaks/doctor';
import { engrave } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { buildMidi } from '@/lib/app/breaks/midi';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import { decodeBreak, encodeBreak, packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { styleIn } from '@/lib/app/breaks/styles';
import type { ResolvedStyle } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/**
 * The two promises this phase makes that no single module can keep on its own.
 *
 * Both are done-when clauses, and both are the kind that a suite full of
 * passing unit tests will not notice being broken — they are properties of how
 * the pieces fit, not of any one piece.
 *
 * 1. **A pattern stands on its own.** Deleting, retuning or hiding a style must
 *    not change a break somebody already saved. The mechanism is the wire-v4
 *    snapshot; this is the test that the mechanism actually covers playing,
 *    scoring and exporting rather than only one of them.
 * 2. **Editing a style does not rewrite history.** Versions are immutable, so
 *    the same seed at version 1 must give the same notes after version 2 exists.
 *    Nothing in the write path can be tested for this — the proof is that
 *    generating from the old version still works and still matches.
 */

const FUNK = testStyle('funk');

function generate(style: ResolvedStyle, seed: number, meter = '4/4') {
  const roster = resolveLanes(styleIn(style.params, meter), null);
  return generatePattern({
    style,
    meter,
    bars: 2,
    density: 55,
    ghosts: 60,
    seed,
    lanes: roster.lanes,
    perc: roster.perc,
  });
}

describe('a pattern whose style is gone', () => {
  /** The break, as it would arrive: a share code and nothing else. */
  const saved = encodeBreak({
    bpm: 94,
    swing: 12,
    level: 5,
    arrangement: ['A', 'B'],
    A: generate(FUNK, 9001),
    B: deriveB(generate(FUNK, 9001), FUNK.params),
  });

  /* No lookup, which is what "the style is gone" means at decode time: the
     catalogue was asked and had nothing, or the caller had no catalogue at all
     because it is a signed-out player on somebody else's installation. */
  const reopened = decodeBreak(saved);

  it('opens', () => {
    expect(reopened.A.bars).toHaveLength(2);
    expect(reopened.A.style).toBe('funk');
    /* The key is kept as written rather than relabelled. v3 substituted the
       default for a style it did not know, which quietly claimed somebody
       else's pattern was one of ours. */
    expect(reopened.A.bars[0].k).toEqual(generate(FUNK, 9001).bars[0].k);
  });

  it('carries the style attributes it was saved with', () => {
    /* This is the whole mechanism. Without it the three cases below would all
       still pass — they would just be testing a break with no feel. */
    expect(reopened.A.attrs).toEqual(generate(FUNK, 9001).attrs);
    expect(reopened.A.styleVersionId).toBe(FUNK.versionId);
  });

  it('scores the same as it did with its style present', () => {
    const original = generate(FUNK, 9001);
    expect(critique(reopened.A, 94)).toEqual(critique(original, 94));
    expect(playability(reopened.A, 94)).toEqual(playability(original, 94));
  });

  it('exports the same MIDI as it did with its style present', () => {
    const original = generate(FUNK, 9001);
    const opts = { bpm: 94, swing: 12, feel: 100, hats: 0 };
    expect(buildMidi([{ pattern: reopened.A, barIdx: 0 }], opts).bytes).toEqual(
      buildMidi([{ pattern: original, barIdx: 0 }], opts).bytes
    );
  });

  it('engraves', () => {
    const engraving = engrave(reopened.A, null, { scale: 1, perSystem: 2 });
    expect(engraving.nodes.length).toBeGreaterThan(0);
    expect(engraving.map).toHaveLength(2 * engraving.steps);
  });

  it('cannot be doctored, because a move needs the style that is gone', () => {
    /* Named rather than worked around. Playing, scoring and exporting are the
       promise; changing the notes is not, and a caller with no style is the one
       who can say so to the person in front of them. */
    // @ts-expect-error — the point is that there is no style to pass
    expect(() => doctor(reopened.A, undefined, 'ghosts+', 1)).toThrow();
  });
});

describe('a style edit does not rewrite history', () => {
  /* Version 2 of funk: the same style with a busier kick. What an admin saving
     a parameter change through `/admin/catalogue` produces. */
  const v2: ResolvedStyle = {
    ...FUNK,
    versionId: 'sv-funk-2',
    version: 2,
    params: {
      ...FUNK.params,
      ghostBias: 0.2,
      kick: [
        ['1010', 5],
        ['1111', 4],
      ],
    },
  };

  it('leaves a pattern generated from version 1 byte-identical', () => {
    /* The reproducibility promise, stated as a test: the same seed and the
       same VERSION give the same notes, whatever the style says today. This is
       why versions are immutable and why there is no update endpoint. */
    const before = packPattern(generate(FUNK, 4242));
    const afterEditFromV1 = packPattern(generate(FUNK, 4242));
    expect(afterEditFromV1).toEqual(before);
  });

  it('gives a different pattern from version 2, or the versions are not doing anything', () => {
    /* The other half. A test that only checked v1 was unchanged would pass on
       the day the generator stopped reading the style at all. */
    const fromV1 = packPattern(generate(FUNK, 4242));
    const fromV2 = packPattern(generate(v2, 4242));
    expect(fromV2.b).not.toEqual(fromV1.b);
  });

  it('records which version made it, so a saved break can find its way back', () => {
    expect(generate(FUNK, 4242).styleVersionId).toBe(FUNK.versionId);
    expect(generate(v2, 4242).styleVersionId).toBe('sv-funk-2');
  });

  it('keeps a v1 pattern sounding like v1 after the edit, not like v2', () => {
    /* The snapshot again, from the other direction: a break saved before the
       edit plays with the feel it was written with, because it carries it. */
    const saved = packPattern(generate(FUNK, 4242));
    const reopened = patternFromPacked(saved, () => v2);
    expect(reopened.attrs).toEqual(generate(FUNK, 4242).attrs);
  });
});
