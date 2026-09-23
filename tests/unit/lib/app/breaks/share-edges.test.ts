import { describe, expect, it } from 'vitest';

import { LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload, packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/**
 * The wire format's tolerance, tested at its edges.
 *
 * `share.test.ts` covers the round trip — every style, every version, the golden
 * bytes. This file covers the other half of the schema's stated contract:
 * **tolerant of what is missing, strict about what is present.** Those are the
 * fallbacks that run only for a document somebody else's client wrote, or an
 * older one of ours, which is exactly the traffic nothing in development
 * produces and nobody notices breaking.
 *
 * Every case here is a branch that is otherwise unreached, and the note on each
 * says what it costs if it goes wrong.
 */

/** A minimal, hand-built pattern — the shape a foreign client might hand us. */
function bare(over: Partial<Pattern> = {}): Pattern {
  return {
    name: 'Bare',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '',
    seed: 1,
    voice: 'hat',
    lanes: [],
    perc: {},
    backbeats: [],
    bbLane: '' as Pattern['bbLane'],
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: [emptyBar(16)],
    ...over,
  };
}

describe('packing a pattern that is missing what it may be missing', () => {
  it('leaves the style version off rather than writing null into the wire', () => {
    /* `sv` is optional on the wire and absent means "not from a catalogue".
       Writing an explicit null would make every hand-built pattern claim a
       version that is not there, and `patternFromPacked` would then skip the
       lookup that rebuilds a v3 snapshot. */
    expect(packPattern(bare()).sv).toBeUndefined();
    expect(packPattern(bare({ styleVersionId: 'sv-1' })).sv).toBe('sv-1');
  });

  it('writes an empty snapshot rather than omitting it', () => {
    /* The inverse of the case above, and deliberately the other way round:
       an absent `sa` means "this is older than v4, go and look one up", while
       an empty one means "there was nothing to snapshot". Collapsing the two
       would make a pattern with no feel indistinguishable from a v3 code. */
    expect(packPattern(bare()).sa).toEqual({});
  });

  it('falls back to 4/4 and the snare when the pattern names neither', () => {
    const packed = packPattern(bare());
    expect(packed.mt).toBe('4/4');
    expect(packed.bl).toBe('s');
  });

  it('keeps an empty lane roster as written, and fills in a missing one', () => {
    /* The difference is `??` against `||`, and it is the right way round. An
       empty roster is a pattern that says "no lanes" — a foreign client's
       document, or one mid-edit — and packing it as the five base lanes would
       put notes back that the author had taken out. A roster that is ABSENT is
       a different claim, and there the base five are the only sensible answer. */
    expect(packPattern(bare()).ln).toEqual([]);
    expect(packPattern(bare({ lanes: undefined as unknown as Pattern['lanes'] })).ln).toEqual([
      'k',
      's',
      'h',
      'r',
      'c',
    ]);
  });

  it('drops a pin row of all zeroes, and a bar whose pins are all empty', () => {
    /* Pins are per note and most bars have none. Writing them out anyway would
       put a row of sixteen zeroes per lane per bar into every share code — the
       thing that makes a code too long to paste into a message. */
    const withPins = bare({
      pins: [
        { s: [0, 0, 0, 0] }, // a row with nothing in it
        undefined, // a bar with no pins at all
        { s: [0, 2, 0, 0] }, // one real pin
      ],
    });
    expect(packPattern(withPins).pn).toEqual([0, 0, { s: '0200' }]);
  });

  it('writes 0 for a pattern with no pins at all', () => {
    expect(packPattern(bare()).pn).toBe(0);
  });
});

describe('unpacking a document that is missing what it may be missing', () => {
  const minimal = { b: ['1000100010001000'] };

  it('gives back the base lanes when the roster is empty', () => {
    /* A v2 code carries no roster, and a v3 one can carry a roster of lanes
       this build does not have. Either way the pattern has to come back with
       lanes, or the chart draws nothing and the mixer has no faders. */
    const pattern = patternFromPacked({ ...packPattern(bare()), ln: [] });
    expect(pattern.lanes).toEqual(['k', 's', 'h', 'r', 'c']);
  });

  it('ignores a pin against a lane that does not exist', () => {
    /* Pins arrive as an open map keyed by lane. A key from a build with a lane
       we do not have would otherwise land in the pattern and be read by the
       reducer as a lane roster it cannot index. */
    const packed = { ...packPattern(bare()), pn: [{ s: '0200', zz: '1111' }] };
    const pattern = patternFromPacked(packed);
    expect(pattern.pins?.[0]).toEqual({ s: [0, 2, 0, 0] });
    expect(Object.keys(pattern.pins?.[0] ?? {})).not.toContain('zz');
  });

  it('gives an empty pin map for a bar marked as having none', () => {
    const packed = { ...packPattern(bare()), pn: [0 as const] };
    expect(patternFromPacked(packed).pins?.[0]).toEqual({});
  });

  it('remaps a version-1 layer number, and passes through one it has no mapping for', () => {
    /* Layer numbers moved when the L2→L3 step was split in two. A v1 code says
       3 and means what is now 4; a v1 code saying something outside the table
       is nonsense, and passing it through unchanged is better than mapping it
       to a layer the author did not ask for. */
    const v1 = (lv: number) => ({ ver: 1, lv, A: minimal, B: minimal });
    expect(breakDocFromPayload(sharePayloadSchema.parse(v1(3))).level).toBe(4);
    expect(breakDocFromPayload(sharePayloadSchema.parse(v1(5))).level).toBe(5);
  });

  it('defaults to the whole break when no layer is given at all', () => {
    const doc = breakDocFromPayload(sharePayloadSchema.parse({ ver: 3, A: minimal, B: minimal }));
    expect(doc.level).toBe(5);
  });
});

describe('a library entry built without its style', () => {
  /* The case that arises on a fresh checkout before the catalogue is seeded,
     and permanently for an entry whose style has been deleted. The seed always
     has the style, so this path only ever runs where nobody is looking. */
  const item = {
    group: 'Feel studies',
    title: 'Bare study',
    artist: 'Written, not transcribed',
    bpm: 90,
    style: 'nosuchstyle',
    bars: [{ k: 'X...X...X...X...', s: '....S.......S...' }],
  };

  it('records no style version, since there is no version to record', () => {
    expect(patternFromLibrary(item, 0).styleVersionId).toBeNull();
    expect(patternFromLibrary(item, 0, testStyle('funk')).styleVersionId).toBe(
      testStyle('funk').versionId
    );
  });

  it('carries an empty snapshot rather than somebody else’s feel', () => {
    expect(patternFromLibrary(item, 0).attrs).toEqual({});
  });

  it('has no backbeats, because there is no style to take them from', () => {
    /* `backbeats` drives the critic's pulse check. An entry with none scores
       as having no backbeat — which is the honest answer for a pattern whose
       style is gone, and is why the four famous breaks that fail playability
       must be tested WITH their style. */
    expect(patternFromLibrary(item, 0).backbeats).toEqual([]);
    expect(patternFromLibrary(item, 0, testStyle('funk')).backbeats).toEqual([4, 12]);
  });

  it('plays with the hats when the entry names no cymbal voice', () => {
    expect(patternFromLibrary(item, 0).voice).toBe('hat');
    expect(patternFromLibrary({ ...item, voice: 'ride' }, 0).voice).toBe('ride');
  });

  it('still produces a full bar for every lane', () => {
    /* Whatever else is missing, the bar shape is not negotiable: every lane
       present and full length, or turning a lane on later reshapes the bar. */
    const pattern = patternFromLibrary(item, 0);
    for (const lane of LANES) expect(pattern.bars[0][lane]).toHaveLength(16);
  });
});
