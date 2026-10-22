/**
 * `checkCorpus` — the model's rules that a JSON Schema cannot state. Each
 * test breaks one rule in an otherwise sound corpus and expects it named.
 */

import { describe, expect, it } from 'vitest';

import { buildLineage } from '@/lib/app/lineage/build';
import { checkCorpus, checkGraph } from '@/lib/app/lineage/check';
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

  it('names a relationship type the builder has no direction for', () => {
    const c = corpusOf({
      drummers: [
        drummer('a', {
          relationships: [{ type: 'apprenticed_to', target: { name: 'X', kind: 'drummer' } }],
        }),
      ],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json: relationship type apprenticed_to has no entry in RELATIONSHIPS',
    ]);
  });

  describe('devices', () => {
    const source = { id: 'src:s', type: 'transcription', title: 'A transcription' };
    const withDevice = (device: Record<string, unknown>) =>
      corpusOf({
        drummers: [drummer('a', { technique_profile: { coordination: { devices: [device] } } })],
        sources: [source],
      });

    it('passes a device that cites a source', () => {
      const c = withDevice({
        kind: 'cross-rhythm',
        ratio: '3:2',
        description: 'Threes over the bar line.',
        evidence: { confidence: 'likely', source_ids: ['src:s'] },
      });
      expect(checkCorpus(c)).toEqual([]);
    });

    it('refuses a device that cites no source, with or without evidence', () => {
      const bare = withDevice({ kind: 'grouping', description: 'Threes of 16ths.' });
      const empty = withDevice({
        kind: 'grouping',
        description: 'Threes of 16ths.',
        evidence: { confidence: 'likely', source_ids: [] },
      });
      expect(checkCorpus(bare)).toEqual(['drummers/0.json devices[0] (grouping): cites no source']);
      expect(checkCorpus(empty)).toEqual([
        'drummers/0.json devices[0] (grouping): cites no source',
      ]);
    });

    it('refuses a source that is not in the registry', () => {
      const c = withDevice({
        kind: 'displacement',
        description: 'The backbeat moved by an eighth.',
        evidence: { confidence: 'likely', source_ids: ['src:nowhere'] },
      });
      expect(checkCorpus(c)).toEqual([
        'drummers/0.json: unresolved reference src:nowhere',
        'drummers/0.json devices[0] (displacement): src:nowhere is not in the source registry',
      ]);
    });

    it('refuses a source id that resolves to something other than a source', () => {
      const c = corpusOf({
        drummers: [
          drummer('a', {
            vocabulary: { patterns: [pattern()] },
            technique_profile: {
              coordination: {
                devices: [
                  {
                    kind: 'grouping',
                    description: 'Threes of 16ths.',
                    evidence: { confidence: 'likely', source_ids: ['src:s', 'pattern:p'] },
                  },
                ],
              },
            },
          }),
        ],
        sources: [source],
      });
      expect(checkCorpus(c)).toEqual([
        'drummers/0.json devices[0] (grouping): pattern:p is not in the source registry',
      ]);
    });

    it('refuses a cross-rhythm or a hemiola without its ratio', () => {
      const c = withDevice({
        kind: 'hemiola',
        description: 'Crashes every dotted quarter in a waltz.',
        evidence: { confidence: 'likely', source_ids: ['src:s'] },
      });
      expect(checkCorpus(c)).toEqual([
        'drummers/0.json devices[0] (hemiola): a hemiola needs its ratio',
      ]);
    });
  });
});

describe('a candidate drummer (D72, D74)', () => {
  const source = { id: 'src:s', type: 'book', title: 'A history of the drums' };
  const candidate = (source_ids: string[]) =>
    drummer('c', {
      meta: { id: 'drummer:c', schema_version: '1.6.0', record_status: 'candidate' },
      legacy: {
        contribution: {
          description: 'Took the shuffle onto the hi-hat.',
          evidence: { confidence: 'likely', source_ids },
        },
      },
    });

  it('passes with a contribution the registry can cite', () => {
    expect(checkCorpus(corpusOf({ drummers: [candidate(['src:s'])], sources: [source] }))).toEqual(
      []
    );
  });

  it('names a contribution source that does not exist once, as unresolved', () => {
    expect(checkCorpus(corpusOf({ drummers: [candidate(['src:nowhere'])] }))).toEqual([
      'drummers/0.json: unresolved reference src:nowhere',
    ]);
  });

  it('refuses a contribution source that is not a source', () => {
    const c = corpusOf({
      drummers: [candidate(['rec:r'])],
      recordings: [recording('r', ['c'])],
      sources: [source],
    });
    expect(checkCorpus(c)).toEqual([
      'drummers/0.json contribution: rec:r is not in the source registry',
    ]);
  });

  it('refuses a candidate whose contribution cites nothing, or who has none', () => {
    const { legacy: _, ...bare } = candidate([]);
    expect(checkCorpus(corpusOf({ drummers: [candidate([])], sources: [source] }))).toEqual([
      'drummers/0.json: a candidate needs a contribution that cites a source',
    ]);
    expect(checkCorpus(corpusOf({ drummers: [bare], sources: [source] }))).toEqual([
      'drummers/0.json: a candidate needs a contribution that cites a source',
    ]);
  });

  it('is a modelled drummer with a record, flagged as a candidate', () => {
    const graph = buildLineage(corpusOf({ drummers: [candidate(['src:s'])], sources: [source] }));
    expect(graph.nodes.find((n) => n.id === 'drummer:c')).toMatchObject({
      label: 'c',
      modelled: true,
      candidate: true,
      activeFrom: 1960,
    });
  });
});

describe('checkGraph', () => {
  it('passes a sound graph', () => {
    expect(checkGraph(buildLineage(corpusOf({ drummers: [drummer('a')] })))).toEqual([]);
  });

  it('names a slug two nodes share', () => {
    const g = buildLineage(corpusOf({ drummers: [drummer('style-funk')] }));
    expect(checkGraph(g)).toEqual(['slug style-funk is both drummer:style-funk and style:funk']);
  });

  it('names an id too long for its column', () => {
    const long = 'x'.repeat(130);
    expect(checkGraph(buildLineage(corpusOf({ drummers: [drummer(long)] })))).toEqual([
      `drummer:${long}: id or slug longer than 120 characters`,
    ]);
  });

  it('names an edge from a node to itself', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            relationships: [
              { type: 'bandmate', target: { name: 'A', id: 'drummer:a', kind: 'drummer' } },
            ],
          }),
        ],
      })
    );
    expect(checkGraph(g)).toEqual(['drummer:a: an edge (bandmate) to itself']);
  });
});

describe('checkCorpus: tracks on a recording', () => {
  const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const SP = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';
  const src = { id: 'src:s', type: 'book', title: 'A history of the drums' };

  function track(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      title: 'Song',
      drummer_ids: ['drummer:a'],
      drums: { description: 'Backbeat.', evidence: { source_ids: ['src:s'] } },
      ...extra,
    };
  }
  function corpusWith(tracks: Record<string, unknown>[], playing = ['a']) {
    return corpusOf({
      drummers: [drummer('a', { beatbreaker: { style_key: 'astyle' } })],
      recordings: [{ ...recording('r', playing), tracks }],
      sources: [src],
    });
  }

  it('passes a sound track, with canonical links and a scored key', () => {
    const c = corpusWith([
      track({ youtube: YT, spotify: SP, style_key: 'astyle', song_key: 'song' }),
    ]);
    expect(checkCorpus(c)).toEqual([]);
  });

  it('names a drummer who has no drum_performance on the recording', () => {
    const c = corpusWith([track({ drummer_ids: ['drummer:a', 'drummer:b'] })]);
    expect(checkCorpus(c)).toEqual([
      'recordings/0.json track "Song": drummer:b has no drum_performance on the recording',
    ]);
  });

  it('names a line on the drums that cites no source', () => {
    const c = corpusWith([track({ drums: { description: 'Backbeat.' } })]);
    expect(checkCorpus(c)).toEqual([
      'recordings/0.json track "Song": the line on the drums cites no source',
    ]);
  });

  it('names a source that is not in the registry', () => {
    const c = corpusWith([
      track({ drums: { description: 'x', evidence: { source_ids: ['src:s', 'src:nope'] } } }),
    ]);
    // the generic unresolved-reference rule names it too; the track rule names the track
    expect(checkCorpus(c)).toEqual([
      'recordings/0.json: unresolved reference src:nope',
      'recordings/0.json track "Song": src:nope is not in the source registry',
    ]);
  });

  it.each([
    ['a youtu.be short link', 'youtube', 'https://youtu.be/dQw4w9WgXcQ'],
    ['a youtube link with a tracking parameter', 'youtube', `${YT}&list=PL1`],
    ['a spotify link in the youtube field', 'youtube', SP],
    ['a spotify link with a query', 'spotify', `${SP}?si=abc`],
    [
      'a spotify link with a locale segment',
      'spotify',
      'https://open.spotify.com/intl-fr/track/4uLU6hMCjMI75M1A2tKUQC',
    ],
    ['a youtube link in the spotify field', 'spotify', YT],
  ])('refuses %s', (_name, provider, url) => {
    const errors = checkCorpus(corpusWith([track({ [provider]: url })]));
    expect(errors).toEqual([
      `recordings/0.json track "Song": ${provider} link ${url} is not one parseReferenceLink rebuilds`,
    ]);
  });

  it('names a song_key without the style_key of a drummer on the track', () => {
    const wrongStyle = corpusWith([track({ style_key: 'other', song_key: 'song' })]);
    const noStyle = corpusWith([track({ song_key: 'song' })]);
    for (const c of [wrongStyle, noStyle]) {
      expect(checkCorpus(c)).toEqual([
        'recordings/0.json track "Song": song_key needs the style_key of a drummer on it',
      ]);
    }
  });

  it('names a style_key (or also_song_keys) without a song_key', () => {
    for (const extra of [{ style_key: 'astyle' }, { also_song_keys: ['x'] }]) {
      expect(checkCorpus(corpusWith([track(extra)]))).toEqual([
        'recordings/0.json track "Song": style_key or also_song_keys without a song_key',
      ]);
    }
  });

  it('names a title listed twice on one recording, ignoring case, but not across recordings', () => {
    expect(checkCorpus(corpusWith([track(), track({ title: 'SONG' })]))).toEqual([
      'recordings/0.json track "SONG": listed twice',
    ]);
    const c = corpusOf({
      drummers: [drummer('a')],
      recordings: [
        { ...recording('r1', ['a']), tracks: [track()] },
        { ...recording('r2', ['a']), tracks: [track()] },
      ],
      sources: [src],
    });
    expect(checkCorpus(c)).toEqual([]);
  });
});
