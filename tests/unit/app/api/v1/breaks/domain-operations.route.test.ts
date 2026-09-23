/**
 * The domain endpoints: generate, doctor, critique, engrave, MIDI.
 *
 * **What every test here asserts is the same thing: the endpoint's output is
 * byte-identical to calling the function directly.** That is the phase's
 * done-when, and it is the only claim worth making about these routes. They
 * exist because the web app is the first client and not the only one (D14) — a
 * native app has nothing but `/api/v1` — so the failure they have to be proof
 * against is the server quietly computing something slightly different from
 * what the browser computes. A test that merely asserted "200 and a document
 * came back" would pass on that day.
 *
 * Determinism is what makes the comparison possible: the generator is seeded,
 * the critic and the engraver are pure, and `doctor` takes an `entropy` value
 * precisely so a move can be replayed. Where a route deliberately is NOT
 * deterministic — `generate` without a seed draws sixteen candidates — the test
 * pins the shape and the seed round-trip instead, and says so.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { critique, playability } from '@/lib/app/breaks/critic';
import { doctor } from '@/lib/app/breaks/doctor';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { engrave } from '@/lib/app/breaks/engrave';
import { reducePattern } from '@/lib/app/breaks/layers';
import { buildMidi } from '@/lib/app/breaks/midi';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import { encodeBreak, packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { styleIn } from '@/lib/app/breaks/styles';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
/* The catalogue is mocked at the data layer, not at Prisma: these routes are
   about the domain functions, and what they need from the catalogue is a
   resolved style. `testStyle` builds the real one from the seed data, so the
   style the route generates from is the style the direct call generates from —
   which is what makes the byte comparison mean anything. */
vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  getStyle: vi.fn(),
  listStyles: vi.fn(),
  styleLookup: vi.fn(() => () => undefined),
}));

import { auth } from '@/lib/auth/config';
import { getStyle, listStyles } from '@/lib/app/breaks/catalogue/data';

import { POST as GENERATE } from '@/app/api/v1/breaks/generate/route';
import { POST as DOCTOR } from '@/app/api/v1/breaks/doctor/route';
import { POST as CRITIQUE } from '@/app/api/v1/breaks/critique/route';
import { POST as ENGRAVE } from '@/app/api/v1/breaks/engrave/route';
import { POST as MIDI } from '@/app/api/v1/breaks/midi/route';

const FUNK = testStyle('funk');

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/breaks/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json(res: Response): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return (await res.json()) as { success: boolean; data: Record<string, unknown> };
}

/** Just enough of a `playability` body to read the check labels off it. */
const playabilitySchema = z.object({ checks: z.array(z.object({ label: z.string() })) });

/** The pattern the direct call produces, for the fixtures below. */
function directPattern(seed: number, meter = '4/4') {
  const roster = resolveLanes(styleIn(FUNK.params, meter), null);
  return generatePattern({
    style: FUNK,
    meter,
    bars: 2,
    density: 55,
    ghosts: 60,
    seed,
    lanes: roster.lanes,
    perc: roster.perc,
  });
}

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(getStyle).mockReset();
  vi.mocked(getStyle).mockResolvedValue(FUNK);
  vi.mocked(listStyles).mockResolvedValue([FUNK]);
});

describe('POST /api/v1/breaks/generate', () => {
  it('produces the same break as calling generatePattern with the same seed', async () => {
    const res = await GENERATE(post('generate', { styleKey: 'funk', seed: 424242 }));
    expect(res.status).toBe(200);
    const { data } = await json(res);

    const expected = directPattern(424242);
    expect(data.A).toEqual(packPattern(expected));
    expect(data.B).toEqual(packPattern(deriveB(expected, FUNK.params)));
    expect(data.critique).toEqual(critique(expected, 94));
    expect(data.playability).toEqual(playability(expected, 94));
    expect(data.seed).toBe(424242);
    expect(data.styleVersionId).toBe(FUNK.versionId);
  });

  it('carries the style snapshot into the document, which is what makes it portable', () => {
    /* The point of wire v4. Asserted here rather than only in share.test.ts
       because this is the endpoint a native client calls, and a route that
       packed the pattern before the snapshot was attached would ship a
       document that plays differently everywhere else. */
    const expected = directPattern(1);
    const packed = packPattern(expected);
    expect(packed.sa).toEqual(FUNK.params.feel ? expect.objectContaining({}) : {});
    expect(packed.sv).toBe(FUNK.versionId);
  });

  it('asks the catalogue for the version the caller named', async () => {
    await GENERATE(post('generate', { styleKey: 'funk', styleVersion: 3, seed: 1 }));
    expect(getStyle).toHaveBeenCalledWith('funk', 3);
  });

  it('draws several candidates when no seed is given, and reports the seed it kept', async () => {
    /* Deliberately NOT deterministic: `generateGood` runs the rejection sampler,
       which is what a "new break" button wants. What must hold is that the seed
       it reports is the seed of the pattern it returned — otherwise nobody can
       reproduce what they were shown. */
    const { data } = await json(await GENERATE(post('generate', { styleKey: 'funk' })));
    expect(data.tries).toBeGreaterThan(1);
    expect((data.A as { sd: number }).sd).toBe(data.seed);

    const again = await json(
      await GENERATE(post('generate', { styleKey: 'funk', seed: data.seed }))
    );
    expect(again.data.A).toEqual(data.A);
  });

  it('is a 404 for a style the catalogue does not have', async () => {
    vi.mocked(getStyle).mockResolvedValue(null);
    const res = await GENERATE(post('generate', { styleKey: 'polka' }));
    expect(res.status).toBe(404);
  });

  it('refuses a meter that does not exist rather than falling back to 4/4', async () => {
    const res = await GENERATE(post('generate', { styleKey: 'funk', meter: '13/13' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/breaks/doctor', () => {
  it('produces the same pattern as calling doctor with the same entropy', async () => {
    const pattern = directPattern(99);
    const doc = packPattern(pattern);

    const res = await DOCTOR(
      post('doctor', { styleKey: 'funk', doc, move: 'ghosts+', entropy: 7 })
    );
    expect(res.status).toBe(200);
    const { data } = await json(res);

    const expected = doctor(patternFromPacked(doc), FUNK.params, 'ghosts+', 7);
    expect(data.doc).toEqual(packPattern(expected));
    expect(data.critique).toEqual(critique(expected));
  });

  it('judges the result at the tempo it was given, not a fixed one', async () => {
    /* The route used to hardcode 94 for `playability`, with no `bpm` in the
       schema at all. Several checks are tempo-dependent — `fastDoubles` cannot
       fire below 132 — so a caller doctoring a 170 BPM break was told its kick
       doubles were fine at a tempo it never asked about, and the check's own
       label said "94 BPM". The label is the assertion: it is the only part of
       the response that names the number the server actually used. */
    const doc = packPattern(directPattern(11));
    const body = { styleKey: 'funk', doc, move: 'ghosts+', entropy: 7 };

    const { data: fast } = await json(await DOCTOR(post('doctor', { ...body, bpm: 170 })));
    const { data: slow } = await json(await DOCTOR(post('doctor', { ...body, bpm: 70 })));

    /* Narrowed rather than cast: `playability.checks` is where the tempo the
       server used is actually visible, so a wrong shape here has to fail
       loudly instead of quietly producing an empty string that `toContain`
       would then fail on for the wrong reason. */
    const labels = (d: Record<string, unknown>): string => {
      const checks = playabilitySchema.parse(d.playability).checks;
      return checks.map((c) => c.label).join(' | ');
    };
    expect(labels(fast)).toContain('170');
    expect(labels(slow)).toContain('70');

    // And the default still stands for a caller that sends no tempo at all.
    const { data: bare } = await json(await DOCTOR(post('doctor', body)));
    expect(labels(bare)).toContain('94');
  });

  it.each([
    ['ghosts+'],
    ['kick+'],
    ['space'],
    ['push'],
    ['opens'],
    ['swap'],
    ['fill'],
    ['crash'],
    ['mirror'],
    ['reverse'],
    ['flatten'],
  ])('matches the direct call for the %s move', async (move) => {
    const doc = packPattern(directPattern(5));
    const { data } = await json(
      await DOCTOR(post('doctor', { styleKey: 'funk', doc, move, entropy: 3 }))
    );
    const expected = doctor(patternFromPacked(doc), FUNK.params, move as 'ghosts+', 3);
    expect(data.doc).toEqual(packPattern(expected));
  });

  it('refuses a move that is not one of the twelve', async () => {
    const doc = packPattern(directPattern(5));
    const res = await DOCTOR(post('doctor', { styleKey: 'funk', doc, move: 'shred' }));
    expect(res.status).toBe(400);
  });

  it('needs the style, because a move writes notes', async () => {
    vi.mocked(getStyle).mockResolvedValue(null);
    const doc = packPattern(directPattern(5));
    const res = await DOCTOR(post('doctor', { styleKey: 'gone', doc, move: 'ghosts+' }));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/breaks/critique', () => {
  it('produces the same score as calling critique directly', async () => {
    const doc = packPattern(directPattern(17));
    const { data } = await json(await CRITIQUE(post('critique', { doc, bpm: 112 })));

    const pattern = patternFromPacked(doc);
    expect(data.critique).toEqual(critique(pattern, 112));
    expect(data.playability).toEqual(playability(pattern, 112));
  });

  it('scores without a style, because the pattern carries what the critic reads', async () => {
    /* The whole point of the snapshot. A break shared by somebody whose style
       you cannot see must still score, and score the same for both of you. */
    const doc = packPattern(directPattern(17));
    await CRITIQUE(post('critique', { doc }));
    expect(getStyle).not.toHaveBeenCalled();
  });

  it('reads the snapshot rather than a style table — a doctored feel changes the score', async () => {
    const doc = packPattern(directPattern(17));
    const feathered = { ...doc, sa: { ...doc.sa, kickFeather: 0.3, targetDensity: 2 } };

    const plain = await json(await CRITIQUE(post('critique', { doc })));
    const changed = await json(await CRITIQUE(post('critique', { doc: feathered })));

    expect((changed.data.critique as { score: number }).score).not.toBe(
      (plain.data.critique as { score: number }).score
    );
  });
});

describe('POST /api/v1/breaks/engrave', () => {
  it('produces the same node tree as calling engrave directly', async () => {
    const doc = packPattern(directPattern(31));
    const { data } = await json(await ENGRAVE(post('engrave', { doc, layer: 5 })));

    const expected = engrave(patternFromPacked(doc), null, {
      scale: 1,
      perSystem: 2,
      guides: false,
      sticking: false,
    });
    expect(data).toEqual(expected);
  });

  it('reduces to the requested layer and draws the full break behind it', async () => {
    const doc = packPattern(directPattern(31));
    const { data } = await json(await ENGRAVE(post('engrave', { doc, layer: 2 })));

    const full = patternFromPacked(doc);
    const expected = engrave(reducePattern(full, 2), full, {
      scale: 1,
      perSystem: 2,
      guides: false,
      sticking: false,
    });
    expect(data).toEqual(expected);
    /* L2 is fewer notes than L5, so this also says the reduction happened —
       an endpoint that ignored `layer` would pass the equality above only if
       the fixture had nothing to reduce. */
    expect((data as unknown as { nodes: unknown[] }).nodes.length).toBeLessThan(
      engrave(full, null, { scale: 1, perSystem: 2, guides: false, sticking: false }).nodes.length
    );
  });

  it('carries the playhead map, which is what a client animates along', async () => {
    const doc = packPattern(directPattern(31));
    const { data } = await json(await ENGRAVE(post('engrave', { doc })));
    const engraving = data as unknown as { map: unknown[]; steps: number };
    expect(engraving.map).toHaveLength(2 * engraving.steps);
  });
});

describe('POST /api/v1/breaks/midi', () => {
  const payload = () => {
    const a = directPattern(53);
    const code = encodeBreak({
      bpm: 96,
      swing: 20,
      level: 5,
      arrangement: ['A', 'B'],
      A: a,
      B: deriveB(a, FUNK.params),
    });
    return JSON.parse(atob(code)) as Record<string, unknown>;
  };

  /**
   * Byte-identity is asserted at `hats: 0`, and that is not dodging the
   * question — it is the only tempo at which the question has an answer.
   *
   * `hatShape` ends in a deliberate wobble (`Math.random()`), because nobody is
   * a sequencer. It scales with the hi-hat dynamics slider, so at 0 it is gone
   * along with the accents and the shape: that is the documented machine-even
   * path, and it is deterministic. Asserting equality at 100 would be asserting
   * that two dice rolls match.
   *
   * The case below this one covers the other half — that the wobble is real.
   */
  it('produces the same bytes as calling buildMidi directly (machine-even)', async () => {
    const doc = payload();
    const res = await MIDI(post('midi', { doc, bars: 4, hats: 0 }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/midi');

    const bytes = new Uint8Array(await res.arrayBuffer());

    /* The same sequence the route builds: the arrangement, repeated until the
       requested bar count is filled. */
    const a = directPattern(53);
    const b = deriveB(a, FUNK.params);
    const expected = buildMidi(
      [
        { pattern: a, barIdx: 0 },
        { pattern: a, barIdx: 1 },
        { pattern: b, barIdx: 0 },
        { pattern: b, barIdx: 1 },
      ],
      { bpm: 96, swing: 20, feel: 100, hats: 0 }
    );
    expect([...bytes]).toEqual(expected.bytes);
    expect(bytes.length).toBe(expected.bytes.length);
  });

  it('keeps the hi-hat wobble when the dynamics are on, so two exports differ', async () => {
    /* The inverse of the case above, and the reason it had to say
       "machine-even". If this ever starts passing as equal, the wobble has
       been optimised away and every exported hi-hat is identical — which is
       the thing `hatShape` exists to avoid. */
    const doc = payload();
    const first = new Uint8Array(
      await (await MIDI(post('midi', { doc, hats: 100 }))).arrayBuffer()
    );
    const second = new Uint8Array(
      await (await MIDI(post('midi', { doc, hats: 100 }))).arrayBuffer()
    );
    expect(first.length).toBe(second.length);
    expect([...first]).not.toEqual([...second]);
  });

  it('answers with a file rather than an envelope, and says not to cache it', async () => {
    const res = await MIDI(post('midi', { doc: payload() }));
    expect(res.headers.get('Content-Disposition')).toContain('.mid');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    // MThd — a Standard MIDI File, not JSON
    expect(new Uint8Array(await res.arrayBuffer()).slice(0, 4)).toEqual(
      new Uint8Array([0x4d, 0x54, 0x68, 0x64])
    );
  });

  it('still uses the envelope for a refusal', async () => {
    const res = await MIDI(post('midi', { doc: { ver: 99 } }));
    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });
});

describe('every domain endpoint', () => {
  it.each([
    ['generate', GENERATE, { styleKey: 'funk' }],
    ['doctor', DOCTOR, { styleKey: 'funk', doc: packPattern(directPattern(1)), move: 'ghosts+' }],
    ['critique', CRITIQUE, { doc: packPattern(directPattern(1)) }],
    ['engrave', ENGRAVE, { doc: packPattern(directPattern(1)) }],
    [
      'midi',
      MIDI,
      { doc: { ver: 4, A: packPattern(directPattern(1)), B: packPattern(directPattern(1)) } },
    ],
  ])('refuses %s to a caller with no session', async (path, handler, body) => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await handler(post(path, body));
    expect(res.status).toBe(401);
  });
});
