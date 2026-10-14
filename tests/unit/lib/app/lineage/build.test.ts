/**
 * Corpus → graph. Each test is one of the builder's decisions, and most are
 * the ones the model's own Python builder got wrong:
 *
 * - arrows run ancestor → descendant whichever side declared the claim;
 * - a claim both sides made is one edge, keeping the surer confidence;
 * - peers, family and shared records have no direction, so A–B is B–A;
 * - a drummer met only on a record is still a node;
 * - a person named without an id is one node however they were called;
 * - edge ids depend on what the edge says, not on the order files were read.
 */

import { describe, expect, it } from 'vitest';

import { buildLineage, nodeSlug, slugOf } from '@/lib/app/lineage/build';
import { corpusOf, drummer, recording } from '@/tests/helpers/lineage';

function rel(type: string, target: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { type, target: { kind: 'drummer', ...target }, ...extra };
}

describe('buildLineage', () => {
  it('points an influence from the one who came first, whoever declared it', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('student', {
            relationships: [rel('cites_as_influence', { name: 'Elder', id: 'drummer:elder' })],
          }),
          drummer('teacher', {
            relationships: [rel('taught', { name: 'Pupil', id: 'drummer:pupil' })],
          }),
        ],
      })
    );
    const pairs = g.edges.map((e) => [e.from, e.to, e.kind, e.directed]);
    expect(pairs).toContainEqual(['drummer:elder', 'drummer:student', 'influence', true]);
    expect(pairs).toContainEqual(['drummer:teacher', 'drummer:pupil', 'teacher', true]);
  });

  it('makes one edge of a claim both sides made, keeping the surer confidence and the larger strength', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            relationships: [
              rel(
                'influenced',
                { name: 'B', id: 'drummer:b' },
                { strength: 0.4, evidence: { confidence: 'likely' } }
              ),
            ],
          }),
          drummer('b', {
            relationships: [
              rel(
                'influenced_by',
                { name: 'A', id: 'drummer:a' },
                { strength: 0.8, evidence: { confidence: 'verified' } }
              ),
            ],
          }),
        ],
      })
    );
    const influence = g.edges.filter((e) => e.kind === 'influence');
    expect(influence).toHaveLength(1);
    expect(influence[0]).toMatchObject({
      from: 'drummer:a',
      to: 'drummer:b',
      confidence: 'verified',
      strength: 0.8,
    });
  });

  it('stores an undirected edge once, ends in id order, whichever side declared it', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('zed', { relationships: [rel('bandmate', { name: 'Amy', id: 'drummer:amy' })] }),
          drummer('amy', { relationships: [rel('bandmate', { name: 'Zed', id: 'drummer:zed' })] }),
        ],
      })
    );
    const peers = g.edges.filter((e) => e.kind === 'peer');
    expect(peers).toHaveLength(1);
    expect(peers[0]).toMatchObject({ from: 'drummer:amy', to: 'drummer:zed', directed: false });
  });

  it('treats admiration as regard between peers, not lineage', () => {
    /* Ringo "admired" Jim Keltner, who is younger: an arrow either way would be a claim the record does not make. */
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('ringo-starr', {
            relationships: [rel('admired', { name: 'Jim Keltner', id: 'drummer:jim-keltner' })],
          }),
        ],
      })
    );
    expect(g.edges[0]).toMatchObject({ kind: 'peer', directed: false });
  });

  it('adds a node for a drummer met only on a shared record, named from the record', () => {
    const rec = recording('live', ['ginger-baker', 'tony-allen']);
    (rec.drum_performances as Record<string, unknown>[])[1].name = 'Tony Allen';
    const g = buildLineage(corpusOf({ drummers: [drummer('ginger-baker')], recordings: [rec] }));

    const allen = g.nodes.find((n) => n.id === 'drummer:tony-allen');
    expect(allen).toMatchObject({
      label: 'Tony Allen',
      kind: 'drummer',
      modelled: false,
      slug: 'tony-allen',
    });
    expect(g.edges).toContainEqual(
      expect.objectContaining({
        kind: 'recording',
        directed: false,
        recordingId: 'rec:live',
        from: 'drummer:ginger-baker',
        to: 'drummer:tony-allen',
      })
    );
  });

  it('makes one node of a drummer named without an id in two records', () => {
    /* Cozy Cole was a `person:` in one record and a `drummer:` in another. */
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', { relationships: [rel('cites_as_influence', { name: 'Cozy Cole' })] }),
          drummer('b', {
            relationships: [
              rel('cites_as_influence', { name: 'Cozy Cole', id: 'drummer:cozy-cole' }),
            ],
          }),
        ],
      })
    );
    expect(g.nodes.filter((n) => n.label === 'Cozy Cole').map((n) => n.id)).toEqual([
      'drummer:cozy-cole',
    ]);
  });

  it('files a musician named without an id as a person, whatever role they had', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            relationships: [
              rel('played_alongside', { name: 'King Curtis', kind: 'musician' }),
              rel('studied_with', { name: 'King Curtis', kind: 'teacher' }),
            ],
          }),
        ],
      })
    );
    expect(g.nodes.filter((n) => n.label === 'King Curtis').map((n) => n.id)).toEqual([
      'person:king-curtis',
    ]);
  });

  it('makes one node of a person named without an id as a drummer in one record and a teacher in another', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', { relationships: [rel('cites_as_influence', { name: 'Cozy Cole' })] }),
          drummer('b', {
            relationships: [rel('studied_with', { name: 'Cozy Cole', kind: 'teacher' })],
          }),
        ],
      })
    );
    expect(g.nodes.filter((n) => n.label === 'Cozy Cole').map((n) => n.id)).toEqual([
      'drummer:cozy-cole',
    ]);
  });

  it('keeps two people whose names have no Latin letters apart', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            relationships: [
              rel('played_alongside', { name: '坂本龍一', kind: 'musician' }),
              rel('played_alongside', { name: 'Ẹ̀gbẹ́', kind: 'musician' }),
              rel('played_alongside', { name: 'Τζίμης', kind: 'musician' }),
            ],
          }),
        ],
      })
    );
    const people = g.nodes.filter((n) => n.kind === 'musician');
    expect(people).toHaveLength(3);
    expect(new Set(people.map((n) => n.id)).size).toBe(3);
    expect(people.every((n) => n.slug.length > 'person-'.length)).toBe(true);
  });

  it('carries the best-evidenced claim of a kind whole, not one claim’s relation with another’s evidence', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            relationships: [
              rel('taught', { name: 'B', id: 'drummer:b' }),
              rel(
                'mentored',
                { name: 'B', id: 'drummer:b' },
                { strength: 0.9, evidence: { confidence: 'verified' }, scope: 'band' }
              ),
            ],
          }),
        ],
      })
    );
    expect(g.edges).toEqual([
      expect.objectContaining({
        kind: 'teacher',
        relation: 'mentored',
        confidence: 'verified',
        strength: 0.9,
        scope: 'band',
      }),
    ]);
  });

  it('keeps an edge’s id when a better-evidenced claim of its kind replaces the relation', () => {
    const one = rel('taught', { name: 'B', id: 'drummer:b' });
    const two = rel(
      'mentored',
      { name: 'B', id: 'drummer:b' },
      { evidence: { confidence: 'verified' } }
    );
    const before = buildLineage(corpusOf({ drummers: [drummer('a', { relationships: [one] })] }));
    const after = buildLineage(
      corpusOf({ drummers: [drummer('a', { relationships: [one, two] })] })
    );
    expect(after.edges.map((e) => e.id)).toEqual(before.edges.map((e) => e.id));
  });

  it('draws a style from its parent', () => {
    const g = buildLineage(
      corpusOf({
        styles: [
          { id: 'style:funk', name: 'Funk', era: { from: 1965 } },
          {
            id: 'style:songo',
            name: 'Songo',
            parents: [{ style_id: 'style:funk', relation: 'influenced_by' }],
          },
        ],
      })
    );
    expect(g.edges).toEqual([
      expect.objectContaining({
        from: 'style:funk',
        to: 'style:songo',
        kind: 'style',
        directed: true,
      }),
    ]);
    expect(g.nodes.find((n) => n.id === 'style:funk')).toMatchObject({
      modelled: true,
      activeFrom: 1965,
    });
  });

  it('gives an edge the same id however the files were ordered', () => {
    const one = drummer('a', { relationships: [rel('bandmate', { name: 'B', id: 'drummer:b' })] });
    const two = drummer('b', { relationships: [rel('bandmate', { name: 'A', id: 'drummer:a' })] });
    const forward = buildLineage(corpusOf({ drummers: [one, two] }));
    const backward = buildLineage(corpusOf({ drummers: [two, one] }));
    expect(backward.edges.map((e) => e.id)).toEqual(forward.edges.map((e) => e.id));
  });

  it('lists a drummer’s genres heaviest first and carries the style key', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            style_profile: {
              genres: [
                { style_id: 'style:jazz', weight: 0.4 },
                { style_id: 'style:funk', weight: 0.9 },
              ],
            },
            beatbreaker: { style_key: 'aaa', tags: ['x'] },
          }),
        ],
        styles: [
          { id: 'style:funk', name: 'Funk' },
          { id: 'style:jazz', name: 'Jazz' },
        ],
      })
    );
    expect(g.nodes.find((n) => n.id === 'drummer:a')).toMatchObject({
      genres: ['style:funk', 'style:jazz'],
      styleKey: 'aaa',
      tags: ['x'],
    });
  });

  it('carries a drummer’s devices with their sources looked up, and gives a stub none', () => {
    const g = buildLineage(
      corpusOf({
        drummers: [
          drummer('a', {
            technique_profile: {
              coordination: {
                devices: [
                  {
                    kind: 'cross-rhythm',
                    ratio: '3:2',
                    where: ['fills'],
                    description: 'Threes over the bar line.',
                    examples: ['So What'],
                    evidence: { confidence: 'likely', source_ids: ['src:t', 'src:u'] },
                  },
                ],
              },
            },
            relationships: [rel('influenced_by', { name: 'Stub Person', id: 'drummer:stub' })],
          }),
        ],
        sources: [
          {
            id: 'src:t',
            type: 'transcription',
            title: 'A transcription',
            url: 'https://t.example',
          },
          { id: 'src:u', type: 'interview', title: 'An interview' },
        ],
      })
    );
    expect(g.nodes.find((n) => n.id === 'drummer:a')?.devices).toEqual([
      {
        kind: 'cross-rhythm',
        ratio: '3:2',
        where: ['fills'],
        description: 'Threes over the bar line.',
        examples: ['So What'],
        confidence: 'likely',
        sources: [
          { title: 'A transcription', url: 'https://t.example' },
          { title: 'An interview', url: null },
        ],
      },
    ]);
    expect(g.nodes.find((n) => n.id === 'drummer:stub')?.devices).toEqual([]);
  });
});

describe('slugs', () => {
  it('folds accents and punctuation', () => {
    expect(slugOf('Horacio Hernández')).toBe('horacio-hernandez');
    expect(slugOf('Deen Castronovo (Journey)')).toBe('deen-castronovo-journey');
  });

  it('keeps a drummer’s bare and prefixes the rest', () => {
    expect(nodeSlug('drummer:elvin-jones')).toBe('elvin-jones');
    expect(nodeSlug('style:songo')).toBe('style-songo');
    expect(nodeSlug('person:king-curtis')).toBe('person-king-curtis');
  });
});
