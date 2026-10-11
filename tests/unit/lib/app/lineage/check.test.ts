/**
 * `checkCorpus` — the model's rules that a JSON Schema cannot state. Each
 * test breaks one rule in an otherwise sound corpus and expects it named.
 */

import { describe, expect, it } from 'vitest';

import { checkCorpus } from '@/lib/app/lineage/check';
import { corpusOf, drummer, recording } from '@/tests/helpers/lineage';

function pattern(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'pattern:p',
    fidelity: 'stylistic_archetype',
    transcription: { status: 'archetype' },
    time_signature: { numerator: 4, denominator: 4 },
    steps_per_beat: 4,
    bars: 1,
    lanes: { kick: 'x.......x.......', snare: '....x.......x...' },
    ...extra,
  };
}

describe('checkCorpus', () => {
  it('passes a sound corpus', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', { vocabulary: { patterns: [pattern()] }, key_recording_ids: ['rec:r'] }),
      ],
      recordings: [recording('r', ['a'])],
    });
    expect(checkCorpus(c)).toEqual([]);
  });

  it('names a duplicated id', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', { vocabulary: { patterns: [pattern()] } }),
        drummer('b', { vocabulary: { patterns: [pattern()] } }),
      ],
    });
    expect(checkCorpus(c)).toEqual([expect.stringContaining('duplicate id pattern:p')]);
  });

  it('names a reference to something that does not exist, but allows an unmodelled drummer', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', {
          style_profile: { genres: [{ style_id: 'style:polka' }] },
          relationships: [
            { type: 'cites_as_influence', target: { name: 'X', id: 'drummer:nobody-yet' } },
          ],
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual(['drummers/0.json: unresolved reference style:polka']);
  });

  it('names a key recording the drummer does not play on', () => {
    const c = corpusOf({
      drummers: [drummer('a', { key_recording_ids: ['rec:r'] })],
      recordings: [recording('r', ['someone-else'])],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json: rec:r has no drum_performance for drummer:a',
    ]);
  });

  it('refuses a stored real identity for a masked performer', () => {
    const c = corpusOf({
      drummers: [
        drummer('masked', {
          identity: {
            name: 'Masked',
            full_name: 'Their Real Name',
            persona: { real_identity_policy: 'private_do_not_research' },
          },
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json: identity.full_name must not be stored for a private persona',
    ]);
  });

  it('names a lane that does not fit its grid, and a missing bar', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', {
          vocabulary: {
            patterns: [pattern({ bars: 2, lanes: { kick: 'x.......x.......|x...' } })],
          },
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual(['drummers/0.json pattern:p kick: bar length 4, expected 16']);
    const short = corpusOf({
      drummers: [drummer('a', { vocabulary: { patterns: [pattern({ bars: 2 })] } })],
    });
    expect(checkCorpus(short)).toEqual([
      'drummers/0.json pattern:p kick: 1 bars, expected 2',
      'drummers/0.json pattern:p snare: 1 bars, expected 2',
    ]);
  });

  it('names a clave carried by a voice the pattern does not have', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', {
          vocabulary: {
            patterns: [pattern({ clave: { type: 'son', carried_by: 'pedal_jam_block' } })],
          },
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json pattern:p: clave carried_by pedal_jam_block has no lane or events',
    ]);
  });

  it('refuses a pattern that claims to be transcribed before it is verified', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', {
          vocabulary: {
            patterns: [
              pattern({ fidelity: 'transcribed_exact', transcription: { status: 'draft' } }),
            ],
          },
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json pattern:p: fidelity says transcribed but status is draft',
    ]);
  });
});
